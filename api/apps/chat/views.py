from rest_framework import viewsets, status
from rest_framework.response import Response
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError, PermissionDenied
from rest_framework.permissions import IsAuthenticated
from django.contrib.auth import get_user_model
from django.db import models
from django.db.models import Count

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
    MessageSerializer,
    MessageReadReceiptSerializer,
    TypingStatusSerializer,
    FriendRequestSerializer,
    FriendshipSerializer,
)
from .renderers import ChatRenderer
from .pagination import MessageCursorPagination

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
        return (
            ChatRoom.objects.filter(participants=self.request.user)
            .prefetch_related("participants")
            .order_by("-created_at")
        )

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        participant_ids = serializer.validated_data.pop("participant_ids", [])
        is_group_chat = serializer.validated_data.get("is_group_chat", False)

        # Fetch participants and validate existence
        users = list(
            User.objects.filter(id__in=[request.user.id, *participant_ids]).distinct()
        )
        if len(users) != len(set([request.user.id, *participant_ids])):
            raise ValidationError({"participant_ids": "One or more participants were not found."})

        if not is_group_chat:
            other_user_id = participant_ids[0]
            existing_room = (
                ChatRoom.objects.filter(is_group_chat=False)
                .annotate(participant_count=Count("participants", distinct=True))
                .filter(participant_count=2, participants=request.user)
                .filter(participants__id=other_user_id)
                .first()
            )
            if existing_room:
                existing_data = self.get_serializer(existing_room).data
                return Response(existing_data, status=status.HTTP_200_OK)

        chat_room = ChatRoom.objects.create(**serializer.validated_data)
        ChatRoomParticipant.objects.get_or_create(chat_room=chat_room, user=request.user)
        other_participants = User.objects.filter(id__in=participant_ids).exclude(id=request.user.id)
        for participant in other_participants:
            ChatRoomParticipant.objects.get_or_create(chat_room=chat_room, user=participant)

        chat_room.refresh_from_db()
        output = self.get_serializer(chat_room)
        headers = self.get_success_headers(output.data)
        return Response(output.data, status=status.HTTP_201_CREATED, headers=headers)

    @action(detail=True, methods=["post"])
    def add_participant(self, request, pk=None):
        chat_room = self.get_object()
        user_id = request.data.get("user_id")
        if not user_id:
            raise ValidationError({"user_id": "user_id is required."})
        try:
            user = User.objects.get(id=user_id)
        except User.DoesNotExist:
            raise ValidationError({"user_id": "User not found."})
        if chat_room.participants.filter(id=user.id).exists():
            return Response({"status": "participant already present"}, status=status.HTTP_200_OK)
        ChatRoomParticipant.objects.get_or_create(chat_room=chat_room, user=user)
        return Response({"status": "participant added"})


### Message Views ###


class MessageViewSet(viewsets.ModelViewSet):
    serializer_class = MessageSerializer
    permission_classes = [IsAuthenticated]
    renderer_classes = [ChatRenderer]
    pagination_class = MessageCursorPagination

    def get_queryset(self):
        chat_room_id = self.request.query_params.get("chat_room")
        if not chat_room_id:
            raise ValidationError(
                {"chat_room": "chat_room query parameter is required."}
            )

        return (
            Message.objects.filter(
                chat_room__id=chat_room_id, chat_room__participants=self.request.user
            )
            .select_related("sender", "chat_room")
            .order_by("-timestamp")
        )

    def perform_create(self, serializer):
        chat_room = serializer.validated_data["chat_room"]
        if not chat_room.participants.filter(id=self.request.user.id).exists():
            raise PermissionDenied("You are not a participant in this chat room.")
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
