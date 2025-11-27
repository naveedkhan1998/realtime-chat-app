from rest_framework import viewsets, status
from rest_framework.response import Response
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.exceptions import ValidationError, PermissionDenied
from rest_framework.permissions import IsAuthenticated
from django.contrib.auth import get_user_model
from django.db import models
from django.db.models import Count
from django.utils import timezone
from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
from django_redis import get_redis_connection
import os
from twilio.rest import Client
from django.conf import settings

from .models import (
    ChatRoom,
    ChatRoomParticipant,
    Message,
    MessageReadReceipt,
    TypingStatus,
    FriendRequest,
    FriendshipNew,
    Notification,
)
from .serializers import (
    ChatRoomSerializer,
    SimpleChatRoomSerializer,
    MessageSerializer,
    MessageReadReceiptSerializer,
    TypingStatusSerializer,
    FriendRequestSerializer,
    FriendshipSerializer,
    NotificationSerializer,
)
from .renderers import ChatRenderer
from .pagination import MessageCursorPagination

User = get_user_model()


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def get_ice_servers(request):
    """
    Returns a list of ICE servers (STUN/TURN) for WebRTC.
    """
    # Default public STUN servers
    ice_servers = [
        {
            "urls": [
                "stun:stun.l.google.com:19302",
                "stun:stun1.l.google.com:19302",
            ]
        }
    ]

    # Check for Twilio configuration
    twilio_account_sid = os.environ.get("TWILIO_ACCOUNT_SID")
    twilio_auth_token = os.environ.get("TWILIO_AUTH_TOKEN")

    if twilio_account_sid and twilio_auth_token:
        try:
            client = Client(twilio_account_sid, twilio_auth_token)
            token = client.tokens.create()
            # Append Twilio servers to the default list
            ice_servers.extend(token.ice_servers)
        except Exception as e:
            print(f"Error fetching Twilio ICE servers: {e}")
            # Fallback to manual configuration if Twilio fails

    # # Check for TURN server configuration in environment variables
    # turn_url = os.environ.get("TURN_SERVER_URL")
    # turn_username = os.environ.get("TURN_SERVER_USERNAME")
    # turn_credential = os.environ.get("TURN_SERVER_CREDENTIAL")

    # if turn_url and turn_username and turn_credential:
    #     ice_servers.append(
    #         {
    #             "urls": [turn_url],
    #             "username": turn_username,
    #             "credential": turn_credential,
    #         }
    #     )

    return Response(ice_servers)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def get_upload_url(request):
    """
    Generates a signed URL for uploading files directly to GCS.
    If not using GCS, returns a 400 Bad Request indicating direct upload is not supported.
    """
    if not settings.DEBUG and settings.GS_BUCKET_NAME:
        try:
            from google.cloud import storage
            import datetime

            bucket_name = settings.GS_BUCKET_NAME
            filename = request.query_params.get("filename")
            content_type = request.query_params.get("content_type")

            if not filename or not content_type:
                return Response(
                    {"detail": "filename and content_type are required."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            # Generate a unique filename
            import uuid
            ext = filename.split(".")[-1]
            uuid_name = uuid.uuid4()
            blob_name = f"media/attachments/{uuid_name}.{ext}"
            django_key = f"attachments/{uuid_name}.{ext}"

            storage_client = storage.Client(credentials=settings.GS_CREDENTIALS)
            bucket = storage_client.bucket(bucket_name)
            blob = bucket.blob(blob_name)

            url = blob.generate_signed_url(
                version="v4",
                expiration=datetime.timedelta(minutes=15),
                method="PUT",
                content_type=content_type,
            )

            return Response({"url": url, "key": django_key})
        except ImportError:
             return Response(
                {"detail": "Google Cloud Storage libraries not installed."},
                status=status.HTTP_501_NOT_IMPLEMENTED,
            )
        except Exception as e:
            return Response(
                {"detail": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    return Response(
        {"detail": "Direct upload not supported in this environment."},
        status=status.HTTP_400_BAD_REQUEST,
    )


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
    permission_classes = [IsAuthenticated]
    renderer_classes = [ChatRenderer]

    def get_serializer_class(self):
        if self.action == "list":
            return SimpleChatRoomSerializer
        return ChatRoomSerializer

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
            raise ValidationError(
                {"participant_ids": "One or more participants were not found."}
            )

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
        ChatRoomParticipant.objects.get_or_create(
            chat_room=chat_room, user=request.user
        )
        other_participants = User.objects.filter(id__in=participant_ids).exclude(
            id=request.user.id
        )
        for participant in other_participants:
            ChatRoomParticipant.objects.get_or_create(
                chat_room=chat_room, user=participant
            )

        chat_room.refresh_from_db()
        output = self.get_serializer(chat_room)
        
        # Broadcast chat_room_created event to all participants
        channel_layer = get_channel_layer()
        if channel_layer:
            for participant in users:
                async_to_sync(channel_layer.group_send)(
                    f"user_{participant.id}",
                    {
                        "type": "chat_room_created",
                        "room": output.data
                    }
                )

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
            return Response(
                {"status": "participant already present"}, status=status.HTTP_200_OK
            )
        ChatRoomParticipant.objects.get_or_create(chat_room=chat_room, user=user)
        return Response({"status": "participant added"})

    def destroy(self, request, *args, **kwargs):
        """Delete/leave a chat room."""
        chat_room = self.get_object()
        user = request.user
        
        if chat_room.is_group_chat:
            # For group chats, just leave (remove participant)
            ChatRoomParticipant.objects.filter(chat_room=chat_room, user=user).delete()
            return Response({"status": "left group"}, status=status.HTTP_200_OK)
        else:
            # For 1:1 chats, delete the entire chat room
            chat_room.delete()
            return Response(status=status.HTTP_204_NO_CONTENT)


### Message Views ###


class MessageViewSet(viewsets.ModelViewSet):
    serializer_class = MessageSerializer
    permission_classes = [IsAuthenticated]
    renderer_classes = [ChatRenderer]
    pagination_class = MessageCursorPagination
    http_method_names = ["get", "post", "patch", "delete", "head", "options", "trace"]

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
        
        # Capture client_id from the initial data (it was popped in serializer.create)
        client_id = serializer.initial_data.get("client_id")
        
        message = serializer.save(sender=self.request.user)
        
        # Prepare payload
        data = MessageSerializer(
            message, context=self.get_serializer_context()
        ).data
        
        # Inject client_id back into the response payload for optimistic reconciliation
        if client_id:
            data["client_id"] = client_id

        self._broadcast_message_event(
            message.chat_room_id,
            "broadcast_chat_message",
            {
                "payload": data
            },
        )
        
        # Send notifications to participants not in the room
        self._notify_participants(chat_room, message)

    def perform_update(self, serializer):
        instance = self.get_object()
        if instance.sender != self.request.user:
            raise PermissionDenied("You can only edit your own messages.")
        content = serializer.validated_data.get("content")
        if content is not None and not content.strip():
            raise ValidationError({"content": "Message content cannot be blank."})
        updated_message = serializer.save()
        self._broadcast_message_event(
            updated_message.chat_room_id,
            "broadcast_message_updated",
            {
                "message": MessageSerializer(
                    updated_message, context=self.get_serializer_context()
                ).data
            },
        )

    def perform_destroy(self, instance):
        if instance.sender != self.request.user:
            raise PermissionDenied("You can only delete your own messages.")
        chat_room_id = instance.chat_room_id
        message_id = instance.id
        super().perform_destroy(instance)
        self._broadcast_message_event(
            chat_room_id,
            "broadcast_message_deleted",
            {"message_id": message_id},
        )

    def _broadcast_message_event(
        self, chat_room_id: int, event_type: str, payload: dict
    ):
        channel_layer = get_channel_layer()
        if not channel_layer:
            return
        async_to_sync(channel_layer.group_send)(
            f"chat_{chat_room_id}",
            {"type": event_type, "room_id": chat_room_id, **payload},
        )

    def _notify_participants(self, chat_room: ChatRoom, message: Message):
        """Send notifications to participants who are not currently in the chat room."""
        channel_layer = get_channel_layer()
        if not channel_layer:
            return

        sender = self.request.user
        redis_conn = get_redis_connection("default")
        presence_key = f"chat:presence:{chat_room.id}"

        # Get all participants except the sender
        participant_ids = list(
            chat_room.participants.exclude(id=sender.id).values_list("id", flat=True)
        )

        for participant_id in participant_ids:
            # Check if user is in the room (has presence)
            is_in_room = redis_conn.hexists(presence_key, participant_id)
            if is_in_room:
                continue

            # Check if user is online globally
            is_online = redis_conn.sismember("global:online_users", participant_id)

            if is_online:
                # Send ephemeral notification via WebSocket with message preview
                async_to_sync(channel_layer.group_send)(
                    f"user_{participant_id}",
                    {
                        "type": "new_message_notification",
                        "chat_room_id": chat_room.id,
                        "sender_id": sender.id,
                        "sender_name": sender.name,
                        "message_content": message.content[:100] if message.content else None,
                        "has_attachment": bool(message.attachment),
                    }
                )
            else:
                # Create persistent notification for offline user
                Notification.objects.update_or_create(
                    user_id=participant_id,
                    chat_room_id=chat_room.id,
                    is_read=False,
                    defaults={
                        "content": f"New message from {sender.name}",
                        "created_at": timezone.now(),
                    },
                )


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


### Notification Views ###


class NotificationViewSet(viewsets.ModelViewSet):
    serializer_class = NotificationSerializer
    permission_classes = [IsAuthenticated]
    renderer_classes = [ChatRenderer]
    http_method_names = ["get", "post", "patch", "delete", "head", "options"]

    def get_queryset(self):
        return Notification.objects.filter(user=self.request.user).order_by(
            "-created_at"
        )

    @action(detail=False, methods=["post"])
    def mark_all_read(self, request):
        self.get_queryset().update(is_read=True)
        return Response({"status": "all notifications marked as read"})

    @action(detail=True, methods=["post"])
    def mark_read(self, request, pk=None):
        notification = self.get_object()
        notification.is_read = True
        notification.save()
        return Response({"status": "notification marked as read"})
