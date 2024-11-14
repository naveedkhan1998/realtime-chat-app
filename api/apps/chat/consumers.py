import json
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from .models import (
    ChatRoom,
    Message,
    TypingStatus,
    MessageReadReceipt,
    ChatRoomParticipant,
)
from django.contrib.auth import get_user_model

User = get_user_model()


class ChatConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.chat_room_id = self.scope["url_route"]["kwargs"]["chat_room_id"]
        self.chat_room_group_name = f"chat_{self.chat_room_id}"

        # Join room group
        await self.channel_layer.group_add(self.chat_room_group_name, self.channel_name)

        await self.accept()

        # Add user to typing status
        await self.update_typing_status(is_typing=False)

    async def disconnect(self, close_code):
        # Leave room group
        await self.channel_layer.group_discard(
            self.chat_room_group_name, self.channel_name
        )

        # Remove typing status
        await self.remove_typing_status()

    # Receive message from WebSocket
    async def receive(self, text_data):
        data = json.loads(text_data)
        event_type = data.get("type")

        if event_type == "send_message":
            content = data.get("content")
            await self.handle_send_message(content)
        elif event_type == "typing":
            is_typing = data.get("is_typing", False)
            await self.handle_typing(is_typing)
        elif event_type == "read_receipt":
            message_id = data.get("message_id")
            await self.handle_read_receipt(message_id)

    async def handle_send_message(self, content):
        message = await self.create_message(content)
        message_data = {
            "type": "chat_message",
            "message": {
                "id": message.id,
                "chat_room": message.chat_room.id,
                "sender": {
                    "id": message.sender.id,
                    "name": message.sender.name,
                },
                "content": message.content,
                "timestamp": message.timestamp.isoformat(),
            },
        }
        # Send message to room group
        await self.channel_layer.group_send(self.chat_room_group_name, message_data)

    async def handle_typing(self, is_typing):
        await self.update_typing_status(is_typing)
        typing_data = {
            "type": "typing_status",
            "user_id": self.scope["user"].id,
            "is_typing": is_typing,
        }
        # Send typing status to room group
        await self.channel_layer.group_send(
            self.chat_room_group_name,
            {"type": "chat_typing", "typing_data": typing_data},
        )

    async def handle_read_receipt(self, message_id):
        await self.create_read_receipt(message_id)
        read_receipt_data = {
            "type": "read_receipt",
            "message_id": message_id,
            "user_id": self.scope["user"].id,
        }
        # Send read receipt to room group
        await self.channel_layer.group_send(
            self.chat_room_group_name,
            {"type": "chat_read_receipt", "read_receipt_data": read_receipt_data},
        )

    # Receive message from room group
    async def chat_message(self, event):
        # Send message to WebSocket
        await self.send(text_data=json.dumps(event["message"]))

    async def chat_typing(self, event):
        # Send typing status to WebSocket
        await self.send(text_data=json.dumps(event["typing_data"]))

    async def chat_read_receipt(self, event):
        # Send read receipt to WebSocket
        await self.send(text_data=json.dumps(event["read_receipt_data"]))

    @database_sync_to_async
    def create_message(self, content):
        user = self.scope["user"]
        chat_room = ChatRoom.objects.get(id=self.chat_room_id)
        message = Message.objects.create(
            chat_room=chat_room, sender=user, content=content
        )
        return message

    @database_sync_to_async
    def update_typing_status(self, is_typing):
        user = self.scope["user"]
        chat_room = ChatRoom.objects.get(id=self.chat_room_id)
        TypingStatus.objects.update_or_create(
            user=user, chat_room=chat_room, defaults={"is_typing": is_typing}
        )

    @database_sync_to_async
    def remove_typing_status(self):
        user = self.scope["user"]
        chat_room = ChatRoom.objects.get(id=self.chat_room_id)
        TypingStatus.objects.filter(user=user, chat_room=chat_room).delete()

    @database_sync_to_async
    def create_read_receipt(self, message_id):
        user = self.scope["user"]
        message = Message.objects.get(id=message_id)
        MessageReadReceipt.objects.update_or_create(
            user=user, message=message, defaults={"read_at": message.timestamp}
        )
        # Update last_read_message in ChatRoomParticipant
        participant = ChatRoomParticipant.objects.get(
            chat_room=message.chat_room, user=user
        )
        if (
            participant.last_read_message is None
            or participant.last_read_message.timestamp < message.timestamp
        ):
            participant.last_read_message = message
            participant.save()
