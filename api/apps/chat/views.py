from rest_framework import viewsets, permissions, generics, status
from rest_framework.response import Response
from .renderers import ChatRenderer
from rest_framework.decorators import action
from .models import (
    ChatRoom,
    ChatRoomParticipant,
    Message,
    MessageReadReceipt,
    TypingStatus,
    FriendRequest,
    FriendshipNew,
)
from .serializers import (
    ChatRoomSerializer,
    ChatRoomParticipantSerializer,
    MessageSerializer,
    MessageReadReceiptSerializer,
    TypingStatusSerializer,
    FriendRequestSerializer,
    FriendshipSerializer,
)
from django.contrib.auth import get_user_model
from rest_framework.permissions import IsAuthenticated
from django.db import models

User = get_user_model()

### Friend Request Views ###


class FriendRequestViewSet(viewsets.ModelViewSet):
    serializer_class = FriendRequestSerializer
    permission_classes = [IsAuthenticated]
    renderer_classes = [ChatRenderer]

    def get_queryset(self):
        return FriendRequest.objects.filter(to_user=self.request.user)

    @action(detail=True, methods=["post"])
    def accept(self, request, pk=None):
        friend_request = self.get_object()
        if friend_request.to_user != request.user:
            return Response(
                {"detail": "Not authorized."}, status=status.HTTP_403_FORBIDDEN
            )

        friend_request.status = "accepted"
        friend_request.save()

        # Create a pairwise friendship
        FriendshipNew.objects.get_or_create(
            user1=min(
                friend_request.from_user, friend_request.to_user, key=lambda x: x.id
            ),
            user2=max(
                friend_request.from_user, friend_request.to_user, key=lambda x: x.id
            ),
        )
        return Response({"status": "friend request accepted"})

    @action(detail=True, methods=["post"])
    def decline(self, request, pk=None):
        friend_request = self.get_object()
        if friend_request.to_user != request.user:
            return Response(
                {"detail": "Not authorized."}, status=status.HTTP_403_FORBIDDEN
            )
        friend_request.status = "declined"
        friend_request.save()
        return Response({"status": "friend request declined"})


### Friendship Views ###


class FriendshipViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = FriendshipSerializer
    permission_classes = [IsAuthenticated]
    renderer_classes = [ChatRenderer]

    def get_queryset(self):
        return FriendshipNew.objects.filter(
            models.Q(user1=self.request.user) | models.Q(user2=self.request.user)
        )


### Chat Room Views ###


class ChatRoomViewSet(viewsets.ModelViewSet):
    serializer_class = ChatRoomSerializer
    permission_classes = [IsAuthenticated]
    renderer_classes = [ChatRenderer]

    def get_queryset(self):
        return ChatRoom.objects.filter(participants=self.request.user)

    def perform_create(self, serializer):
        chat_room = serializer.save()
        # Add the creator as a participant
        ChatRoomParticipant.objects.create(chat_room=chat_room, user=self.request.user)
        # Add other participants if provided
        participants_ids = self.request.data.get("participants", [])
        for user_id in participants_ids:
            if user_id != self.request.user.id:
                user = User.objects.get(id=user_id)
                ChatRoomParticipant.objects.create(chat_room=chat_room, user=user)

    @action(detail=True, methods=["post"])
    def add_participant(self, request, pk=None):
        chat_room = self.get_object()
        user_id = request.data.get("user_id")
        user = User.objects.get(id=user_id)
        ChatRoomParticipant.objects.get_or_create(chat_room=chat_room, user=user)
        return Response({"status": "participant added"})


### Message Views ###


class MessageViewSet(viewsets.ModelViewSet):
    serializer_class = MessageSerializer
    permission_classes = [IsAuthenticated]
    renderer_classes = [ChatRenderer]

    def get_queryset(self):
        chat_room_id = self.request.query_params.get("chat_room")
        return Message.objects.filter(
            chat_room__id=chat_room_id, chat_room__participants=self.request.user
        )

    def perform_create(self, serializer):
        serializer.save(sender=self.request.user)


### Message Read Receipt Views ###


class MessageReadReceiptViewSet(viewsets.ModelViewSet):
    serializer_class = MessageReadReceiptSerializer
    permission_classes = [IsAuthenticated]
    renderer_classes = [ChatRenderer]

    def get_queryset(self):
        return MessageReadReceipt.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


### Typing Status Views ###


class TypingStatusViewSet(viewsets.ModelViewSet):
    serializer_class = TypingStatusSerializer
    permission_classes = [IsAuthenticated]
    renderer_classes = [ChatRenderer]

    def get_queryset(self):
        return TypingStatus.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)
