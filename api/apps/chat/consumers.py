"""
Unified WebSocket Consumer - Handles all real-time communication through a single connection.

This replaces the previous 3-connection architecture (ChatConsumer, GlobalConsumer, HuddleConsumer)
with a single multiplexed WebSocket that uses message namespacing for routing.

Benefits:
- Single connection per client (reduced server load, mobile battery savings)
- Unified authentication flow (first-message auth, no token in URL)
- Server-side heartbeat handling
- Presence refresh mechanism to prevent TTL expiration
- Clean namespace separation (global.*, chat.*, huddle.*)
"""

import json
import time
import asyncio
from typing import Any, Dict, List, Optional, Set

from channels.db import database_sync_to_async
from channels.generic.websocket import AsyncWebsocketConsumer
from django.contrib.auth import get_user_model
from django.contrib.auth.models import AnonymousUser
from django.utils import timezone
from django_redis import get_redis_connection
from django.core.cache import cache
import jwt
from django.conf import settings

from .models import ChatRoom, Message, Notification
from .serializers import MessageSerializer

User = get_user_model()

# Optimized TTLs
PRESENCE_TTL = 300  # 5 minutes
TYPING_TTL = 5  # 5 seconds
NOTE_TTL = 60 * 60 * 2  # 2 hours
CURSOR_TTL = 10  # 10 seconds
HUDDLE_TTL = 300  # 5 minutes
GLOBAL_PRESENCE_TTL = 600  # 10 minutes

# Heartbeat configuration
HEARTBEAT_INTERVAL = 30  # seconds
PRESENCE_REFRESH_INTERVAL = 120  # 2 minutes - refresh presence before TTL expires


class UnifiedConsumer(AsyncWebsocketConsumer):
    """
    Single multiplexed WebSocket consumer handling:
    - Global presence and notifications (global.*)
    - Chat room messages, typing, presence, collaboration (chat.*)
    - Voice huddle signaling (huddle.*)

    Message format:
    {
        "type": "namespace.event",
        "room_id": <optional, for chat/huddle events>,
        ...payload
    }
    """

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.user = None
        self.is_authenticated = False
        self.user_data: Dict[str, Any] = {}
        self.user_group: str = ""
        self.global_group = "global_presence"

        # Track subscribed chat rooms
        self.subscribed_rooms: Set[int] = set()

        # Track active huddle room (can only be in one huddle at a time)
        self.active_huddle_room: Optional[int] = None

        # Heartbeat task
        self._heartbeat_task: Optional[asyncio.Task] = None
        self._presence_refresh_task: Optional[asyncio.Task] = None

        # Last activity timestamp for idle detection
        self._last_activity = time.time()

    async def connect(self):
        """Accept connection but require authentication via first message."""
        await self.accept()
        # Send auth required message
        await self.send(
            json.dumps(
                {
                    "type": "auth.required",
                    "message": "Send auth message with token to authenticate",
                }
            )
        )

    async def disconnect(self, close_code):
        """Clean up all subscriptions and presence on disconnect."""
        # Cancel background tasks
        if self._heartbeat_task:
            self._heartbeat_task.cancel()
            try:
                await self._heartbeat_task
            except asyncio.CancelledError:
                pass

        if self._presence_refresh_task:
            self._presence_refresh_task.cancel()
            try:
                await self._presence_refresh_task
            except asyncio.CancelledError:
                pass

        if not self.is_authenticated:
            return

        # Leave all chat rooms
        for room_id in list(self.subscribed_rooms):
            await self._leave_chat_room(room_id)

        # Leave huddle if active
        if self.active_huddle_room:
            await self._leave_huddle(self.active_huddle_room)

        # Remove global presence
        await self._set_global_presence(False)

        # Leave groups
        if self.user_group:
            await self.channel_layer.group_discard(self.user_group, self.channel_name)
        await self.channel_layer.group_discard(self.global_group, self.channel_name)

        # Broadcast offline status
        await self.channel_layer.group_send(
            self.global_group,
            {"type": "broadcast_user_offline", "user_id": self.user.id},
        )

    async def receive(self, text_data: str):
        """Route incoming messages by namespace prefix."""
        try:
            data = json.loads(text_data)
        except json.JSONDecodeError:
            await self.send(json.dumps({"type": "error", "message": "Invalid JSON"}))
            return

        event_type = data.get("type", "")
        self._last_activity = time.time()

        # Handle authentication (must be first for unauthenticated connections)
        if event_type == "auth":
            await self._handle_auth(data)
            return

        # All other events require authentication
        if not self.is_authenticated:
            await self.send(
                json.dumps(
                    {
                        "type": "error",
                        "code": "AUTH_REQUIRED",
                        "message": "Authentication required",
                    }
                )
            )
            return

        # Handle heartbeat
        if event_type == "ping":
            await self.send(json.dumps({"type": "pong", "timestamp": time.time()}))
            return

        if event_type == "presence.heartbeat":
            await self._handle_presence_heartbeat()
            return

        # Route by namespace
        namespace = event_type.split(".")[0] if "." in event_type else event_type

        if namespace == "global":
            await self._handle_global_event(event_type, data)
        elif namespace == "chat":
            await self._handle_chat_event(event_type, data)
        elif namespace == "huddle":
            await self._handle_huddle_event(event_type, data)
        else:
            # Legacy event types for backward compatibility
            await self._handle_legacy_event(event_type, data)

    # ==================== AUTHENTICATION ====================

    async def _handle_auth(self, data: Dict[str, Any]):
        """Authenticate user via token in message payload."""
        token = data.get("token")
        if not token:
            try:
                await self.send(
                    json.dumps({"type": "auth.error", "message": "Token required"})
                )
            except Exception:
                pass
            return

        user = await self._get_user_from_token(token)
        if not user or isinstance(user, AnonymousUser) or not user.is_authenticated:
            try:
                await self.send(
                    json.dumps(
                        {"type": "auth.error", "message": "Invalid or expired token"}
                    )
                )
            except Exception:
                pass
            await self.close(code=4001)
            return

        # Set authenticated state
        self.user = user
        self.is_authenticated = True
        self.user_data = await self._serialize_user(user)
        self.user_group = f"user_{user.id}"

        # Join user-specific and global groups
        await self.channel_layer.group_add(self.user_group, self.channel_name)
        await self.channel_layer.group_add(self.global_group, self.channel_name)

        # Set global presence
        online_users = await self._set_global_presence(True)

        # Start heartbeat and presence refresh tasks
        self._heartbeat_task = asyncio.create_task(self._heartbeat_loop())
        self._presence_refresh_task = asyncio.create_task(self._presence_refresh_loop())

        # Send auth success with initial global state
        await self.send(
            json.dumps(
                {
                    "type": "auth.success",
                    "user": self.user_data,
                    "online_users": online_users,
                }
            )
        )

        # Broadcast online status to others
        await self.channel_layer.group_send(
            self.global_group,
            {"type": "broadcast_user_online", "user_id": self.user.id},
        )

    @database_sync_to_async
    def _get_user_from_token(self, token: str):
        """Validate JWT or session and return user."""
        # Support session-based auth (for HTMX frontend)
        if token == "session":
            # Get user from scope (set by Django Channels middleware)
            scope_user = self.scope.get("user")
            if scope_user and scope_user.is_authenticated:
                return scope_user
            return AnonymousUser()

        # JWT token auth (for React frontend)
        cache_key = f"user_token_{token}"
        user = cache.get(cache_key)

        if user is None:
            try:
                payload = jwt.decode(token, settings.SECRET_KEY, algorithms=["HS256"])
                user_id = payload.get("user_id")
                user = User.objects.get(id=user_id)
                cache.set(cache_key, user, timeout=3600)
            except (
                jwt.ExpiredSignatureError,
                jwt.InvalidTokenError,
                User.DoesNotExist,
            ):
                return AnonymousUser()

        return user

    # ==================== BACKGROUND TASKS ====================

    async def _heartbeat_loop(self):
        """Send periodic heartbeats to detect stale connections."""
        try:
            while True:
                await asyncio.sleep(HEARTBEAT_INTERVAL)
                # Check if connection is still alive
                idle_time = time.time() - self._last_activity
                if idle_time > HEARTBEAT_INTERVAL * 3:
                    # Connection might be stale, close it
                    await self.close(code=4002)
                    break
        except asyncio.CancelledError:
            pass

    async def _presence_refresh_loop(self):
        """Refresh presence in Redis before TTL expires."""
        try:
            while True:
                await asyncio.sleep(PRESENCE_REFRESH_INTERVAL)
                # Refresh global presence
                await self._refresh_global_presence()
                # Refresh presence in all subscribed rooms
                for room_id in self.subscribed_rooms:
                    await self._refresh_room_presence(room_id)
        except asyncio.CancelledError:
            pass

    async def _handle_presence_heartbeat(self):
        """Handle explicit presence heartbeat from client."""
        await self._refresh_global_presence()
        for room_id in self.subscribed_rooms:
            await self._refresh_room_presence(room_id)
        await self.send(json.dumps({"type": "presence.ack"}))

    # ==================== GLOBAL EVENTS ====================

    async def _handle_global_event(self, event_type: str, data: Dict[str, Any]):
        """Handle global namespace events."""
        # Currently global events are mostly server->client
        # Client can request refresh of online users
        if event_type == "global.refresh":
            online_users = await self._get_global_online_users()
            await self.send(
                json.dumps(
                    {"type": "global.online_users", "online_users": online_users}
                )
            )

    # ==================== CHAT EVENTS ====================

    async def _handle_chat_event(self, event_type: str, data: Dict[str, Any]):
        """Handle chat namespace events."""
        room_id = data.get("room_id")

        if event_type == "chat.subscribe":
            if room_id:
                await self._subscribe_to_room(room_id)
        elif event_type == "chat.unsubscribe":
            if room_id:
                await self._unsubscribe_from_room(room_id)
        elif event_type == "chat.send_message":
            if room_id and room_id in self.subscribed_rooms:
                await self._handle_send_message(room_id, data.get("content"))
        elif event_type == "chat.edit_message":
            if room_id and room_id in self.subscribed_rooms:
                await self._handle_edit_message(
                    room_id, data.get("message_id"), data.get("content")
                )
        elif event_type == "chat.delete_message":
            if room_id and room_id in self.subscribed_rooms:
                await self._handle_delete_message(room_id, data.get("message_id"))
        elif event_type == "chat.typing":
            if room_id and room_id in self.subscribed_rooms:
                await self._handle_typing(room_id, bool(data.get("is_typing")))
        elif event_type == "chat.collab_update":
            if room_id and room_id in self.subscribed_rooms:
                await self._handle_collab_update(room_id, data.get("content"))
        elif event_type == "chat.cursor_update":
            if room_id and room_id in self.subscribed_rooms:
                await self._handle_cursor_update(room_id, data.get("cursor"))

    async def _subscribe_to_room(self, room_id: int):
        """Subscribe to a chat room."""
        if room_id in self.subscribed_rooms:
            return

        # Verify participant
        if not await self._is_room_participant(room_id):
            await self.send(
                json.dumps(
                    {
                        "type": "error",
                        "code": "NOT_PARTICIPANT",
                        "message": "Not a participant of this room",
                    }
                )
            )
            return

        chat_room = await self._get_chat_room(room_id)
        if not chat_room:
            await self.send(
                json.dumps(
                    {
                        "type": "error",
                        "code": "ROOM_NOT_FOUND",
                        "message": "Chat room not found",
                    }
                )
            )
            return

        # Join room group
        room_group = f"chat_{room_id}"
        await self.channel_layer.group_add(room_group, self.channel_name)
        self.subscribed_rooms.add(room_id)

        # Register presence
        presence_payload = await self._mark_room_presence(room_id)

        # Send initial state
        await self.send(
            json.dumps(
                {
                    "type": "chat.subscribed",
                    "room_id": room_id,
                    "presence": presence_payload,
                }
            )
        )

        # Get collaborative note state
        note_state = await self._get_note_state(room_id)
        if note_state is not None:
            await self.send(
                json.dumps(
                    {
                        "type": "chat.collab_state",
                        "room_id": room_id,
                        "content": note_state,
                    }
                )
            )

        # Get cursor state
        cursor_state = await self._get_cursor_state(room_id)
        if cursor_state:
            await self.send(
                json.dumps(
                    {
                        "type": "chat.cursor_state",
                        "room_id": room_id,
                        "cursors": cursor_state,
                    }
                )
            )

        # Get huddle participants
        huddle_participants = await self._get_huddle_participants(room_id)
        if huddle_participants:
            await self.send(
                json.dumps(
                    {
                        "type": "chat.huddle_participants",
                        "room_id": room_id,
                        "participants": huddle_participants,
                    }
                )
            )

        # Broadcast join to room
        await self.channel_layer.group_send(
            room_group,
            {
                "type": "broadcast_presence_update",
                "room_id": room_id,
                "action": "join",
                "user": self.user_data,
            },
        )

    async def _unsubscribe_from_room(self, room_id: int):
        """Unsubscribe from a chat room."""
        if room_id not in self.subscribed_rooms:
            return

        await self._leave_chat_room(room_id)

        await self.send(json.dumps({"type": "chat.unsubscribed", "room_id": room_id}))

    async def _leave_chat_room(self, room_id: int):
        """Internal method to leave a chat room."""
        room_group = f"chat_{room_id}"

        # Remove presence
        removed_user = await self._remove_room_presence(room_id)

        # Clear typing state
        await self._clear_typing_state(room_id)

        # Leave room group
        await self.channel_layer.group_discard(room_group, self.channel_name)
        self.subscribed_rooms.discard(room_id)

        # Broadcast leave to room
        if removed_user:
            await self.channel_layer.group_send(
                room_group,
                {
                    "type": "broadcast_presence_update",
                    "room_id": room_id,
                    "action": "leave",
                    "user": removed_user,
                },
            )

    # ==================== HUDDLE EVENTS ====================

    async def _handle_huddle_event(self, event_type: str, data: Dict[str, Any]):
        """Handle huddle namespace events."""
        room_id = data.get("room_id")

        if event_type == "huddle.join":
            if room_id:
                await self._join_huddle(room_id)
        elif event_type == "huddle.leave":
            if self.active_huddle_room:
                await self._leave_huddle(self.active_huddle_room)
        elif event_type == "huddle.signal":
            if self.active_huddle_room:
                await self._handle_huddle_signal(data)

    async def _join_huddle(self, room_id: int):
        """Join a voice huddle."""
        # Can only be in one huddle at a time
        if self.active_huddle_room and self.active_huddle_room != room_id:
            await self._leave_huddle(self.active_huddle_room)

        # Verify participant
        if not await self._is_room_participant(room_id):
            await self.send(
                json.dumps(
                    {
                        "type": "error",
                        "code": "NOT_PARTICIPANT",
                        "message": "Not a participant of this room",
                    }
                )
            )
            return

        self.active_huddle_room = room_id
        participants = await self._add_huddle_participant(room_id)

        # Broadcast to all in room (including chat subscribers)
        room_group = f"chat_{room_id}"
        await self.channel_layer.group_send(
            room_group,
            {
                "type": "broadcast_huddle_participants",
                "room_id": room_id,
                "participants": participants,
            },
        )

    async def _leave_huddle(self, room_id: int):
        """Leave a voice huddle."""
        participants = await self._remove_huddle_participant(room_id)
        self.active_huddle_room = None

        # Broadcast to room
        room_group = f"chat_{room_id}"
        await self.channel_layer.group_send(
            room_group,
            {
                "type": "broadcast_huddle_participants",
                "room_id": room_id,
                "participants": participants or [],
            },
        )

    async def _handle_huddle_signal(self, data: Dict[str, Any]):
        """Handle WebRTC signaling."""
        target_id = data.get("target_id")
        payload = data.get("payload")

        if not isinstance(target_id, int) or payload is None:
            return

        await self.channel_layer.group_send(
            f"user_{target_id}",
            {
                "type": "broadcast_huddle_signal",
                "from": self.user_data,
                "payload": payload,
                "room_id": self.active_huddle_room,
            },
        )

    # ==================== LEGACY EVENT HANDLERS ====================

    async def _handle_legacy_event(self, event_type: str, data: Dict[str, Any]):
        """Handle legacy event types for backward compatibility."""
        room_id = data.get("room_id")

        # Map legacy events to new namespaced events
        legacy_map = {
            "send_message": ("chat.send_message", room_id),
            "edit_message": ("chat.edit_message", room_id),
            "delete_message": ("chat.delete_message", room_id),
            "typing": ("chat.typing", room_id),
            "collab_update": ("chat.collab_update", room_id),
            "cursor_update": ("chat.cursor_update", room_id),
            "huddle_join": ("huddle.join", room_id),
            "huddle_leave": ("huddle.leave", room_id),
            "huddle_signal": ("huddle.signal", room_id),
        }

        if event_type in legacy_map:
            new_type, _ = legacy_map[event_type]
            data["type"] = new_type
            namespace = new_type.split(".")[0]

            if namespace == "chat":
                await self._handle_chat_event(new_type, data)
            elif namespace == "huddle":
                await self._handle_huddle_event(new_type, data)

    # ==================== CHAT MESSAGE HANDLERS ====================

    async def _handle_send_message(self, room_id: int, content: Optional[str]):
        """Handle sending a new message."""
        if not content or not content.strip():
            return

        chat_room = await self._get_chat_room(room_id)
        if not chat_room:
            return

        message_data = await self._create_message(chat_room, content.strip())

        room_group = f"chat_{room_id}"
        await self.channel_layer.group_send(
            room_group,
            {
                "type": "broadcast_chat_message",
                "room_id": room_id,
                "payload": message_data,
            },
        )

        # Notify participants
        await self._notify_participants(room_id, chat_room, message_data)

    async def _handle_edit_message(
        self, room_id: int, message_id: Optional[int], content: Optional[str]
    ):
        """Handle editing a message."""
        if not isinstance(message_id, int) or not content or not content.strip():
            return

        updated = await self._update_message(room_id, message_id, content.strip())
        if updated:
            room_group = f"chat_{room_id}"
            await self.channel_layer.group_send(
                room_group,
                {
                    "type": "broadcast_message_updated",
                    "room_id": room_id,
                    "message": updated,
                },
            )

    async def _handle_delete_message(self, room_id: int, message_id: Optional[int]):
        """Handle deleting a message."""
        if not isinstance(message_id, int):
            return

        deleted_id = await self._delete_message(room_id, message_id)
        if deleted_id:
            room_group = f"chat_{room_id}"
            await self.channel_layer.group_send(
                room_group,
                {
                    "type": "broadcast_message_deleted",
                    "room_id": room_id,
                    "message_id": deleted_id,
                },
            )

    async def _handle_typing(self, room_id: int, is_typing: bool):
        """Handle typing status update."""
        await self._set_typing_state(room_id, is_typing)

        room_group = f"chat_{room_id}"
        await self.channel_layer.group_send(
            room_group,
            {
                "type": "broadcast_typing_status",
                "room_id": room_id,
                "user_id": self.user.id,
                "is_typing": is_typing,
            },
        )

    async def _handle_collab_update(self, room_id: int, content: Optional[str]):
        """Handle collaborative note update."""
        if content is None:
            return

        # Skip if content unchanged
        current = await self._get_note_state(room_id)
        if current == content:
            return

        await self._set_note_state(room_id, content)

        room_group = f"chat_{room_id}"
        await self.channel_layer.group_send(
            room_group,
            {
                "type": "broadcast_collab_update",
                "room_id": room_id,
                "content": content,
                "user": self.user_data,
            },
        )

    async def _handle_cursor_update(
        self, room_id: int, cursor: Optional[Dict[str, Any]]
    ):
        """Handle cursor position update."""
        if cursor is None:
            return

        await self._set_cursor_state(room_id, cursor)

        room_group = f"chat_{room_id}"
        await self.channel_layer.group_send(
            room_group,
            {
                "type": "broadcast_cursor_update",
                "room_id": room_id,
                "cursor": cursor,
                "user": self.user_data,
            },
        )

    # ==================== BROADCAST HANDLERS ====================

    async def broadcast_user_online(self, event):
        """Broadcast user online event."""
        if event["user_id"] == self.user.id:
            return
        await self.send(
            json.dumps({"type": "global.user_online", "user_id": event["user_id"]})
        )

    async def broadcast_user_offline(self, event):
        """Broadcast user offline event."""
        if event["user_id"] == self.user.id:
            return
        await self.send(
            json.dumps({"type": "global.user_offline", "user_id": event["user_id"]})
        )

    async def broadcast_chat_message(self, event):
        """Broadcast new chat message."""
        await self.send(
            json.dumps(
                {
                    "type": "chat.message",
                    "room_id": event["room_id"],
                    "message": event["payload"],
                }
            )
        )

    async def broadcast_message_updated(self, event):
        """Broadcast message update."""
        await self.send(
            json.dumps(
                {
                    "type": "chat.message_updated",
                    "room_id": event["room_id"],
                    "message": event["message"],
                }
            )
        )

    async def broadcast_message_deleted(self, event):
        """Broadcast message deletion."""
        await self.send(
            json.dumps(
                {
                    "type": "chat.message_deleted",
                    "room_id": event["room_id"],
                    "message_id": event["message_id"],
                }
            )
        )

    async def broadcast_typing_status(self, event):
        """Broadcast typing status."""
        await self.send(
            json.dumps(
                {
                    "type": "chat.typing_status",
                    "room_id": event["room_id"],
                    "user_id": event["user_id"],
                    "is_typing": event["is_typing"],
                }
            )
        )

    async def broadcast_presence_update(self, event):
        """Broadcast presence update."""
        await self.send(
            json.dumps(
                {
                    "type": "chat.presence_update",
                    "room_id": event["room_id"],
                    "action": event["action"],
                    "user": event["user"],
                }
            )
        )

    async def broadcast_collab_update(self, event):
        """Broadcast collaborative note update."""
        await self.send(
            json.dumps(
                {
                    "type": "chat.collab_update",
                    "room_id": event["room_id"],
                    "content": event["content"],
                    "user": event["user"],
                }
            )
        )

    async def broadcast_cursor_update(self, event):
        """Broadcast cursor update."""
        await self.send(
            json.dumps(
                {
                    "type": "chat.cursor_update",
                    "room_id": event["room_id"],
                    "cursor": event["cursor"],
                    "user": event["user"],
                }
            )
        )

    async def broadcast_huddle_participants(self, event):
        """Broadcast huddle participants list."""
        await self.send(
            json.dumps(
                {
                    "type": "chat.huddle_participants",
                    "room_id": event["room_id"],
                    "participants": event["participants"],
                }
            )
        )

    async def broadcast_huddle_signal(self, event):
        """Broadcast huddle WebRTC signal."""
        await self.send(
            json.dumps(
                {
                    "type": "huddle.signal",
                    "room_id": event["room_id"],
                    "from": event["from"],
                    "payload": event["payload"],
                }
            )
        )

    async def chat_room_created(self, event):
        """Handle chat room creation notification."""
        await self.send(
            json.dumps({"type": "global.chat_room_created", "room": event["room"]})
        )

    async def new_message_notification(self, event):
        """Handle new message notification for offline room."""
        await self.send(
            json.dumps(
                {
                    "type": "global.new_message_notification",
                    "chat_room_id": event["chat_room_id"],
                    "sender_id": event["sender_id"],
                    "sender_name": event.get("sender_name"),
                    "message_content": event.get("message_content"),
                    "has_attachment": event.get("has_attachment", False),
                }
            )
        )

    # ==================== DATABASE OPERATIONS ====================

    @database_sync_to_async
    def _serialize_user(self, user) -> Dict[str, Any]:
        avatar = getattr(user, "avatar", None)
        return {
            "id": user.id,
            "name": user.name,
            "avatar": avatar.url if avatar else None,
        }

    @database_sync_to_async
    def _get_chat_room(self, room_id: int) -> Optional[ChatRoom]:
        try:
            return ChatRoom.objects.get(id=room_id)
        except ChatRoom.DoesNotExist:
            return None

    @database_sync_to_async
    def _is_room_participant(self, room_id: int) -> bool:
        return ChatRoom.objects.filter(
            id=room_id, participants__id=self.user.id
        ).exists()

    @database_sync_to_async
    def _create_message(self, chat_room: ChatRoom, content: str) -> Dict[str, Any]:
        message = Message.objects.create(
            chat_room=chat_room, sender=self.user, content=content
        )
        return MessageSerializer(message).data

    @database_sync_to_async
    def _update_message(
        self, room_id: int, message_id: int, content: str
    ) -> Optional[Dict[str, Any]]:
        try:
            message = Message.objects.get(
                id=message_id, chat_room_id=room_id, sender_id=self.user.id
            )
        except Message.DoesNotExist:
            return None
        message.content = content
        message.save(update_fields=["content", "updated_at"])
        return MessageSerializer(message).data

    @database_sync_to_async
    def _delete_message(self, room_id: int, message_id: int) -> Optional[int]:
        try:
            message = Message.objects.get(
                id=message_id, chat_room_id=room_id, sender_id=self.user.id
            )
        except Message.DoesNotExist:
            return None
        message.delete()
        return message_id

    @database_sync_to_async
    def _get_participant_ids(self, chat_room: ChatRoom) -> List[int]:
        return list(
            chat_room.participants.exclude(id=self.user.id).values_list("id", flat=True)
        )

    @database_sync_to_async
    def _create_notification(self, user_id: int, chat_room_id: int, content: str):
        try:
            user = User.objects.get(id=user_id)
            Notification.objects.update_or_create(
                user=user,
                chat_room_id=chat_room_id,
                is_read=False,
                defaults={
                    "content": content,
                    "created_at": timezone.now(),
                },
            )
        except User.DoesNotExist:
            pass

    async def _notify_participants(
        self, room_id: int, chat_room: ChatRoom, message_data: Dict[str, Any]
    ):
        """Notify participants about new message."""
        participant_ids = await self._get_participant_ids(chat_room)

        # Extract message content and attachment info from message_data
        msg_content = message_data.get("content", "")
        msg_attachment = message_data.get("attachment")

        for participant_id in participant_ids:
            is_in_room = await self._is_user_in_room(room_id, participant_id)
            if is_in_room:
                continue

            is_online = await self._is_user_online(participant_id)

            if is_online:
                # Send ephemeral notification with message preview
                await self.channel_layer.group_send(
                    f"user_{participant_id}",
                    {
                        "type": "new_message_notification",
                        "chat_room_id": room_id,
                        "sender_id": self.user.id,
                        "sender_name": self.user.name,
                        "message_content": (
                            msg_content[:100] if msg_content else None
                        ),  # Truncate for preview
                        "has_attachment": bool(msg_attachment),
                    },
                )
            else:
                # Create persistent notification
                await self._create_notification(
                    user_id=participant_id,
                    chat_room_id=room_id,
                    content=f"New message from {self.user.name}",
                )

    # ==================== REDIS OPERATIONS ====================

    @database_sync_to_async
    def _set_global_presence(self, is_online: bool) -> List[int]:
        conn = get_redis_connection("default")
        key = "global:online_users"
        if is_online:
            conn.sadd(key, self.user.id)
        else:
            conn.srem(key, self.user.id)
        return [int(uid) for uid in conn.smembers(key)]

    @database_sync_to_async
    def _get_global_online_users(self) -> List[int]:
        conn = get_redis_connection("default")
        return [int(uid) for uid in conn.smembers("global:online_users")]

    @database_sync_to_async
    def _refresh_global_presence(self):
        conn = get_redis_connection("default")
        conn.sadd("global:online_users", self.user.id)

    @database_sync_to_async
    def _mark_room_presence(self, room_id: int) -> Dict[str, Any]:
        conn = get_redis_connection("default")
        key = f"chat:presence:{room_id}"
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

        all_users = conn.hvals(key)
        total_count = len(all_users)

        if total_count > 50:
            users = [json.loads(value) for value in all_users[:50]]
            return {"count": total_count, "users": users, "truncated": True}

        return {
            "count": total_count,
            "users": [json.loads(value) for value in all_users],
            "truncated": False,
        }

    @database_sync_to_async
    def _remove_room_presence(self, room_id: int) -> Optional[Dict[str, Any]]:
        conn = get_redis_connection("default")
        key = f"chat:presence:{room_id}"
        removed = conn.hget(key, self.user.id)
        if removed is not None:
            conn.hdel(key, self.user.id)
        return json.loads(removed) if removed else None

    @database_sync_to_async
    def _refresh_room_presence(self, room_id: int):
        conn = get_redis_connection("default")
        key = f"chat:presence:{room_id}"
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

    @database_sync_to_async
    def _is_user_in_room(self, room_id: int, user_id: int) -> bool:
        conn = get_redis_connection("default")
        return conn.hexists(f"chat:presence:{room_id}", user_id)

    @database_sync_to_async
    def _is_user_online(self, user_id: int) -> bool:
        conn = get_redis_connection("default")
        return conn.sismember("global:online_users", user_id)

    @database_sync_to_async
    def _set_typing_state(self, room_id: int, is_typing: bool):
        conn = get_redis_connection("default")
        key = f"chat:typing:{room_id}"
        if is_typing:
            pipeline = conn.pipeline(True)
            pipeline.hset(key, self.user.id, int(time.time()))
            pipeline.expire(key, TYPING_TTL)
            pipeline.execute()
        else:
            conn.hdel(key, self.user.id)

    @database_sync_to_async
    def _clear_typing_state(self, room_id: int):
        conn = get_redis_connection("default")
        conn.hdel(f"chat:typing:{room_id}", self.user.id)

    @database_sync_to_async
    def _get_note_state(self, room_id: int) -> Optional[str]:
        conn = get_redis_connection("default")
        value = conn.get(f"chat:note:{room_id}")
        return value.decode() if value else None

    @database_sync_to_async
    def _set_note_state(self, room_id: int, content: str):
        conn = get_redis_connection("default")
        conn.set(f"chat:note:{room_id}", content, ex=NOTE_TTL)

    @database_sync_to_async
    def _get_cursor_state(self, room_id: int) -> Dict[int, Dict[str, int]]:
        conn = get_redis_connection("default")
        values = conn.hgetall(f"chat:cursors:{room_id}")
        if not values:
            return {}
        return {
            int(uid.decode()): json.loads(val.decode()) for uid, val in values.items()
        }

    @database_sync_to_async
    def _set_cursor_state(self, room_id: int, cursor: Dict[str, Any]):
        conn = get_redis_connection("default")
        key = f"chat:cursors:{room_id}"
        pipeline = conn.pipeline(True)
        pipeline.hset(key, self.user.id, json.dumps(cursor))
        pipeline.expire(key, CURSOR_TTL)
        pipeline.execute()

    @database_sync_to_async
    def _get_huddle_participants(self, room_id: int) -> List[Dict[str, Any]]:
        conn = get_redis_connection("default")
        values = conn.hgetall(f"chat:huddle:{room_id}")
        return [json.loads(payload.decode()) for payload in values.values()]

    @database_sync_to_async
    def _add_huddle_participant(self, room_id: int) -> List[Dict[str, Any]]:
        conn = get_redis_connection("default")
        key = f"chat:huddle:{room_id}"
        avatar = getattr(self.user, "avatar", None)
        payload = json.dumps(
            {
                "id": self.user.id,
                "name": self.user.name,
                "avatar": avatar.url if avatar else None,
            }
        )
        pipeline = conn.pipeline(True)
        pipeline.hset(key, self.user.id, payload)
        pipeline.expire(key, HUDDLE_TTL)
        pipeline.execute()
        return [json.loads(v.decode()) for v in conn.hvals(key)]

    @database_sync_to_async
    def _remove_huddle_participant(
        self, room_id: int
    ) -> Optional[List[Dict[str, Any]]]:
        conn = get_redis_connection("default")
        key = f"chat:huddle:{room_id}"
        if not conn.hexists(key, self.user.id):
            return None
        pipeline = conn.pipeline(True)
        pipeline.hdel(key, self.user.id)
        pipeline.expire(key, HUDDLE_TTL)
        pipeline.execute()
        return [json.loads(v.decode()) for v in conn.hvals(key)]
