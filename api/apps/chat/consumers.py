import json
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from django.core.cache import cache
from .models import ChatRoom, Message
from django.contrib.auth.models import AnonymousUser


class ChatConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.chat_room_id = self.scope["url_route"]["kwargs"]["chat_room_id"]
        self.chat_room_group_name = f"chat_{self.chat_room_id}"

        # Add to WebSocket group
        await self.channel_layer.group_add(self.chat_room_group_name, self.channel_name)

        # Accept WebSocket connection
        await self.accept()

    async def disconnect(self, close_code):
        # Leave WebSocket group
        await self.channel_layer.group_discard(
            self.chat_room_group_name, self.channel_name
        )

    async def receive(self, text_data):
        """Handle messages received from WebSocket."""
        data = json.loads(text_data)
        event_type = data.get("type")

        if event_type == "send_message":
            content = data.get("content")
            await self.handle_send_message(content)

    async def handle_send_message(self, content):
        """Handle sending a message."""
        # Get chat room and user from cache or database
        chat_room = await self.get_chat_room_cached(self.chat_room_id)
        user = self.scope["user"]

        if not user or isinstance(user, AnonymousUser):
            # Handle unauthorized user
            await self.send(
                text_data=json.dumps(
                    {"error": "Unauthorized user cannot send messages"}
                )
            )
            return

        # Create message asynchronously
        message = await self.create_message_async(chat_room, user, content)

        # Prepare lightweight message data
        message_data = {
            "type": "chat_message",
            "message": {
                "id": message.id,
                "chat_room": chat_room.id,
                "sender": {"id": user.id, "name": user.name},
                "content": content,
                "timestamp": message.timestamp.isoformat(),
            },
        }

        # Send message to WebSocket group
        await self.channel_layer.group_send(self.chat_room_group_name, message_data)

    async def chat_message(self, event):
        """Send a chat message to WebSocket."""
        await self.send(text_data=json.dumps(event))

    @database_sync_to_async
    def create_message_async(self, chat_room, user, content):
        """Create and store a new message in the database."""
        return Message.objects.create(chat_room=chat_room, sender=user, content=content)

    @database_sync_to_async
    def get_chat_room_cached(self, chat_room_id):
        """Fetch the chat room from Redis cache or database."""
        cache_key = f"chat_room_{chat_room_id}"
        chat_room = cache.get(cache_key)

        if not chat_room:
            # If not in cache, fetch from database and cache it
            chat_room = ChatRoom.objects.get(id=chat_room_id)
            cache.set(cache_key, chat_room, timeout=3600)  # Cache for 1 hour

        return chat_room
