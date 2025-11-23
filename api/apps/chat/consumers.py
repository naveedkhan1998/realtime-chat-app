import json
import time
from typing import Any, Dict, List, Optional, TYPE_CHECKING

from channels.db import database_sync_to_async
from channels.generic.websocket import AsyncWebsocketConsumer
from django.contrib.auth import get_user_model
from django.utils import timezone
from django_redis import get_redis_connection

from .models import ChatRoom, Message, Notification
from .serializers import MessageSerializer

if TYPE_CHECKING:
    pass

User = get_user_model()

# Optimized TTLs for production (free-tier Redis friendly)
PRESENCE_TTL = 300  # 5 minutes - stable data, refresh less often
TYPING_TTL = 5  # 5 seconds - very short-lived, expires quickly
NOTE_TTL = 60 * 60 * 2  # 2 hours - increased for longer sessions
CURSOR_TTL = 10  # 10 seconds - short-lived, frequent updates
HUDDLE_TTL = 300  # 5 minutes - stable during huddle sessions


class ChatConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.chat_room_id = int(self.scope["url_route"]["kwargs"]["chat_room_id"])
        self.chat_room_group_name = f"chat_{self.chat_room_id}"
        self.user = self.scope["user"]
        self.user_group = f"user_{self.user.id}"

        if not self.user.is_authenticated:
            await self.close(code=4001)
            return

        if not await self.is_participant():
            await self.close(code=4003)
            return

        self.chat_room = await self.get_chat_room()
        if not self.chat_room:
            await self.close(code=4004)
            return

        # Pre-calculate user data for frequent updates
        self.user_data = await self._serialize_user(self.user)

        await self.channel_layer.group_add(self.chat_room_group_name, self.channel_name)
        await self.channel_layer.group_add(self.user_group, self.channel_name)

        await self.accept()

        # Register presence and send initial state
        presence_payload = await self.mark_presence()
        await self.send(
            json.dumps({"type": "presence_state", "users": presence_payload})
        )
        await self.channel_layer.group_send(
            self.chat_room_group_name,
            {
                "type": "presence_update",
                "action": "join",
                "user": self.user_data,
            },
        )

        note_state = await self.get_note_state()
        if note_state is not None:
            await self.send(json.dumps({"type": "collab_state", "content": note_state}))

        cursors_state = await self.get_cursor_state()
        if cursors_state:
            await self.send(
                json.dumps({"type": "cursor_state", "cursors": cursors_state})
            )

        huddle_participants = await self.get_huddle_participants()
        if huddle_participants:
            await self.send(
                json.dumps(
                    {"type": "huddle_participants", "participants": huddle_participants}
                )
            )

    async def disconnect(self, close_code):
        await self.channel_layer.group_discard(
            self.chat_room_group_name, self.channel_name
        )
        await self.channel_layer.group_discard(self.user_group, self.channel_name)

        removed = await self.remove_presence()
        if removed:
            await self.channel_layer.group_send(
                self.chat_room_group_name,
                {"type": "presence_update", "action": "leave", "user": removed},
            )
        await self.clear_typing_state()
        await self.leave_huddle()

    async def receive(self, text_data: str):
        data = json.loads(text_data)
        event_type = data.get("type")

        if event_type == "send_message":
            await self.handle_send_message(data.get("content"))
        elif event_type == "edit_message":
            await self.handle_edit_message(data.get("message_id"), data.get("content"))
        elif event_type == "delete_message":
            await self.handle_delete_message(data.get("message_id"))
        elif event_type == "typing":
            await self.handle_typing(bool(data.get("is_typing")))
        elif event_type == "collab_update":
            await self.handle_collab_update(data.get("content"))
        elif event_type == "cursor_update":
            await self.handle_cursor_update(data.get("cursor"))
        elif event_type == "huddle_join":
            await self.handle_huddle_join()
        elif event_type == "huddle_leave":
            await self.handle_huddle_leave()
        elif event_type == "huddle_signal":
            await self.handle_huddle_signal(data)

    async def handle_send_message(self, content: Optional[str]):
        if not content or not content.strip():
            return
        message_data = await self.create_message(content.strip())
        await self.channel_layer.group_send(
            self.chat_room_group_name, {"type": "chat_message", "payload": message_data}
        )

        # Notify participants
        participant_ids = await self.get_participant_ids()
        for participant_id in participant_ids:
            # Check if user is active in this specific chat room
            is_in_room = await self.is_user_in_room(participant_id)
            if is_in_room:
                continue

            # Check if user is online globally
            is_online = await self.is_user_online(participant_id)

            if is_online:
                # User is online but not in room -> Send ephemeral notification only
                await self.channel_layer.group_send(
                    f"user_{participant_id}",
                    {
                        "type": "new_message_notification",
                        "chat_room_id": self.chat_room_id,
                        "sender_id": self.user.id,
                        "sender_name": self.user.name,
                    },
                )
            else:
                # User is offline -> Create persistent notification
                await self.create_notification(
                    user_id=participant_id,
                    content=f"New message from {self.user.name}"
                )

    async def handle_edit_message(
        self, message_id: Optional[int], content: Optional[str]
    ):
        if not isinstance(message_id, int) or not content or not content.strip():
            return
        updated = await self.update_message(message_id, content.strip())
        if updated:
            await self.channel_layer.group_send(
                self.chat_room_group_name,
                {"type": "message_updated", "message": updated},
            )

    async def handle_delete_message(self, message_id: Optional[int]):
        if not isinstance(message_id, int):
            return
        deleted_id = await self.delete_message(message_id)
        if deleted_id:
            await self.channel_layer.group_send(
                self.chat_room_group_name,
                {"type": "message_deleted", "message_id": deleted_id},
            )

    async def handle_typing(self, is_typing: bool):
        await self.set_typing_state(is_typing)
        await self.channel_layer.group_send(
            self.chat_room_group_name,
            {
                "type": "typing_status",
                "user_id": self.user.id,
                "is_typing": is_typing,
            },
        )

    async def handle_collab_update(self, content: Optional[str]):
        if content is None:
            return
        # Skip empty updates to save Redis operations
        current_state = await self.get_note_state()
        if current_state == content:
            return
        await self.set_note_state(content)
        await self.channel_layer.group_send(
            self.chat_room_group_name,
            {
                "type": "collab_update",
                "content": content,
                "user": self.user_data,
            },
        )

    async def handle_cursor_update(self, cursor: Optional[Dict[str, Any]]):
        if cursor is None:
            return
        await self.set_cursor_state(cursor)
        payload = {
            "type": "cursor_update",
            "cursor": cursor,
            "user": self.user_data,
        }
        await self.channel_layer.group_send(self.chat_room_group_name, payload)

    async def handle_huddle_join(self):
        participants = await self.add_huddle_participant()
        await self.channel_layer.group_send(
            self.chat_room_group_name,
            {"type": "huddle_participants", "participants": participants},
        )

    async def handle_huddle_leave(self):
        participants = await self.remove_huddle_participant()
        # Ensure we always send a list, not None
        await self.channel_layer.group_send(
            self.chat_room_group_name,
            {
                "type": "huddle_participants",
                "participants": participants if participants is not None else [],
            },
        )

    async def leave_huddle(self):
        participants = await self.remove_huddle_participant()
        if participants is not None:
            await self.channel_layer.group_send(
                self.chat_room_group_name,
                {"type": "huddle_participants", "participants": participants},
            )

    async def handle_huddle_signal(self, data: Dict[str, Any]):
        target_id = data.get("target_id")
        payload = data.get("payload")
        if not isinstance(target_id, int) or payload is None:
            return
        await self.channel_layer.group_send(
            f"user_{target_id}",
            {
                "type": "huddle_signal",
                "from": self.user_data,
                "payload": payload,
            },
        )

    async def chat_message(self, event):
        await self.send(
            json.dumps({"type": "chat_message", "message": event["payload"]})
        )

    async def message_updated(self, event):
        await self.send(
            json.dumps({"type": "message_updated", "message": event["message"]})
        )

    async def message_deleted(self, event):
        await self.send(
            json.dumps({"type": "message_deleted", "message_id": event["message_id"]})
        )

    async def typing_status(self, event):
        await self.send(
            json.dumps(
                {
                    "type": "typing_status",
                    "user_id": event["user_id"],
                    "is_typing": event["is_typing"],
                }
            )
        )

    async def presence_update(self, event):
        await self.send(
            json.dumps(
                {
                    "type": "presence_update",
                    "action": event["action"],
                    "user": event["user"],
                }
            )
        )

    async def collab_update(self, event):
        await self.send(
            json.dumps(
                {
                    "type": "collab_update",
                    "content": event["content"],
                    "user": event["user"],
                }
            )
        )

    async def cursor_update(self, event):
        await self.send(
            json.dumps(
                {
                    "type": "cursor_update",
                    "cursor": event["cursor"],
                    "user": event["user"],
                }
            )
        )

    async def huddle_participants(self, event):
        await self.send(
            json.dumps(
                {"type": "huddle_participants", "participants": event["participants"]}
            )
        )

    async def huddle_signal(self, event):
        await self.send(
            json.dumps(
                {
                    "type": "huddle_signal",
                    "from": event["from"],
                    "payload": event["payload"],
                }
            )
        )

    @database_sync_to_async
    def get_chat_room(self):
        try:
            return ChatRoom.objects.get(id=self.chat_room_id)
        except ChatRoom.DoesNotExist:
            return None

    @database_sync_to_async
    def is_participant(self):
        return ChatRoom.objects.filter(
            id=self.chat_room_id, participants__id=self.user.id
        ).exists()

    @database_sync_to_async
    def _serialize_user(self, user) -> Dict[str, Any]:
        avatar = getattr(user, "avatar", None)
        return {
            "id": user.id,
            "name": user.name,
            "avatar": avatar.url if avatar else None,
        }

    @database_sync_to_async
    def mark_presence(self) -> Dict[str, Any]:
        conn = get_redis_connection("default")
        key = f"chat:presence:{self.chat_room_id}"
        avatar = getattr(self.user, "avatar", None)
        payload = {
            "id": self.user.id,
            "name": self.user.name,
            "avatar": avatar.url if avatar else None,
            "last_seen": timezone.now().isoformat(),
        }
        pipeline = conn.pipeline(True)
        pipeline.hset(key, self.user.id, json.dumps(payload))
        pipeline.expire(key, PRESENCE_TTL)
        pipeline.execute()
        
        # Optimization: If too many users, return only count and a sample
        all_users = conn.hvals(key)
        total_count = len(all_users)
        
        if total_count > 50:
             # Return top 50 to avoid huge payloads
             users = [json.loads(value) for value in all_users[:50]]
             return {"count": total_count, "users": users, "truncated": True}
        
        return {"count": total_count, "users": [json.loads(value) for value in all_users], "truncated": False}

    @database_sync_to_async
    def remove_presence(self) -> Optional[Dict[str, Any]]:
        conn = get_redis_connection("default")
        key = f"chat:presence:{self.chat_room_id}"
        removed = conn.hget(key, self.user.id)
        if removed is not None:
            conn.hdel(key, self.user.id)
        return json.loads(removed) if removed else None


    @database_sync_to_async
    def clear_typing_state(self):
        conn = get_redis_connection("default")
        key = f"chat:typing:{self.chat_room_id}"
        conn.hdel(key, self.user.id)

    @database_sync_to_async
    def set_typing_state(self, is_typing: bool):
        conn = get_redis_connection("default")
        key = f"chat:typing:{self.chat_room_id}"
        if is_typing:
            pipeline = conn.pipeline(True)
            pipeline.hset(key, self.user.id, int(time.time()))
            pipeline.expire(key, TYPING_TTL)
            pipeline.execute()
        else:
            conn.hdel(key, self.user.id)

    @database_sync_to_async
    def get_note_state(self) -> Optional[str]:
        conn = get_redis_connection("default")
        key = f"chat:note:{self.chat_room_id}"
        value = conn.get(key)
        return value.decode() if value else None

    @database_sync_to_async
    def set_note_state(self, content: str):
        conn = get_redis_connection("default")
        key = f"chat:note:{self.chat_room_id}"
        conn.set(key, content, ex=NOTE_TTL)

    @database_sync_to_async
    def get_cursor_state(self):
        conn = get_redis_connection("default")
        key = f"chat:cursors:{self.chat_room_id}"
        values = conn.hgetall(key)
        if not values:
            return {}
        return {
            int(uid.decode()): json.loads(val.decode()) for uid, val in values.items()
        }

    @database_sync_to_async
    def set_cursor_state(self, cursor: Dict[str, Any]):
        conn = get_redis_connection("default")
        key = f"chat:cursors:{self.chat_room_id}"
        pipeline = conn.pipeline(True)
        pipeline.hset(key, self.user.id, json.dumps(cursor))
        pipeline.expire(key, CURSOR_TTL)
        pipeline.execute()

    @database_sync_to_async
    def create_message(self, content: str):
        message = Message.objects.create(
            chat_room=self.chat_room, sender=self.user, content=content
        )
        return MessageSerializer(message).data

    @database_sync_to_async
    def update_message(self, message_id: int, content: str):
        try:
            message = Message.objects.get(
                id=message_id,
                chat_room_id=self.chat_room_id,
                sender_id=self.user.id,
            )
        except Message.DoesNotExist:
            return None
        message.content = content
        message.save(update_fields=["content", "updated_at"])
        return MessageSerializer(message).data

    @database_sync_to_async
    def delete_message(self, message_id: int):
        try:
            message = Message.objects.get(
                id=message_id,
                chat_room_id=self.chat_room_id,
                sender_id=self.user.id,
            )
        except Message.DoesNotExist:
            return None
        message.delete()
        return message_id

    @database_sync_to_async
    def get_huddle_participants(self):
        conn = get_redis_connection("default")
        key = f"chat:huddle:{self.chat_room_id}"
        values = conn.hgetall(key)
        participants = []
        for uid, payload in values.items():
            data = json.loads(payload.decode())
            participants.append(data)
        return participants

    @database_sync_to_async
    def add_huddle_participant(self):
        conn = get_redis_connection("default")
        key = f"chat:huddle:{self.chat_room_id}"
        payload = json.dumps({"id": self.user.id, "name": self.user.name})
        pipeline = conn.pipeline(True)
        pipeline.hset(key, self.user.id, payload)
        pipeline.expire(key, HUDDLE_TTL)
        pipeline.execute()
        return [json.loads(value.decode()) for value in conn.hvals(key)]

    @database_sync_to_async
    def remove_huddle_participant(self):
        conn = get_redis_connection("default")
        key = f"chat:huddle:{self.chat_room_id}"
        if not conn.hexists(key, self.user.id):
            return None
        pipeline = conn.pipeline(True)
        pipeline.hdel(key, self.user.id)
        pipeline.expire(key, HUDDLE_TTL)
        pipeline.execute()
        values = conn.hvals(key)
        return [json.loads(value.decode()) for value in values]

    @database_sync_to_async
    def create_notification(self, user_id: int, content: str):
        try:
            user = User.objects.get(id=user_id)
            # Coalescing: Update existing unread notification for this chat or create new one
            # This ensures max 1 unread notification row per chat per user
            Notification.objects.update_or_create(
                user=user,
                chat_room_id=self.chat_room_id,
                is_read=False,
                defaults={
                    "content": content,
                    "created_at": timezone.now(),
                },
            )
        except User.DoesNotExist:
            pass

    @database_sync_to_async
    def get_participant_ids(self):
        return list(
            self.chat_room.participants.exclude(id=self.user.id).values_list(
                "id", flat=True
            )
        )

    @database_sync_to_async
    def is_user_in_room(self, user_id: int) -> bool:
        conn = get_redis_connection("default")
        key = f"chat:presence:{self.chat_room_id}"
        return conn.hexists(key, user_id)

    @database_sync_to_async
    def is_user_online(self, user_id: int) -> bool:
        conn = get_redis_connection("default")
        key = "global:online_users"
        return conn.sismember(key, user_id)


class GlobalConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.user = self.scope["user"]
        if not self.user.is_authenticated:
            await self.close()
            return

        self.user_group = f"user_{self.user.id}"
        self.global_group = "global_presence"
        
        await self.channel_layer.group_add(self.user_group, self.channel_name)
        await self.channel_layer.group_add(self.global_group, self.channel_name)
        
        await self.accept()
        
        # Mark as globally online and get current list
        online_users = await self.set_global_presence(True)
        
        # Send initial list to self
        await self.send(json.dumps({
            "type": "global.online_users",
            "online_users": online_users
        }))
        
        # Broadcast join to others
        await self.channel_layer.group_send(
            self.global_group,
            {
                "type": "global.user_online",
                "user_id": self.user.id
            }
        )

    async def disconnect(self, close_code):
        if not hasattr(self, "user") or not self.user.is_authenticated:
            return

        if hasattr(self, "user_group"):
            await self.channel_layer.group_discard(self.user_group, self.channel_name)
        
        if hasattr(self, "global_group"):
            await self.channel_layer.group_discard(self.global_group, self.channel_name)
        
        await self.set_global_presence(False)
        
        # Broadcast leave
        if hasattr(self, "global_group"):
            await self.channel_layer.group_send(
                self.global_group,
                {
                    "type": "global.user_offline",
                    "user_id": self.user.id
                }
            )

    async def receive(self, text_data):
        pass

    async def huddle_signal(self, event):
        await self.send(json.dumps({
            "type": "huddle_signal",
            "from": event["from"],
            "payload": event["payload"]
        }))
        
    async def global_user_online(self, event):
        if event["user_id"] == self.user.id:
            return
        await self.send(json.dumps({
            "type": "global.user_online",
            "user_id": event["user_id"]
        }))

    async def global_user_offline(self, event):
        if event["user_id"] == self.user.id:
            return
        await self.send(json.dumps({
            "type": "global.user_offline",
            "user_id": event["user_id"]
        }))

    async def chat_room_created(self, event):
        await self.send(json.dumps({
            "type": "chat_room_created",
            "room": event["room"]
        }))

    async def new_message_notification(self, event):
        await self.send(json.dumps({
            "type": "new_message_notification",
            "chat_room_id": event["chat_room_id"],
            "sender_id": event["sender_id"],
            "sender_name": event.get("sender_name")
        }))

    @database_sync_to_async
    def set_global_presence(self, is_online: bool):
        conn = get_redis_connection("default")
        key = "global:online_users"
        if is_online:
            conn.sadd(key, self.user.id)
        else:
            conn.srem(key, self.user.id)
        
        # Return list of online users (IDs)
        # Convert bytes to int
        return [int(uid) for uid in conn.smembers(key)]

