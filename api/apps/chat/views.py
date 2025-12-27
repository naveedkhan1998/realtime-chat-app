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
import requests
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
    Uses Cloudflare TURN service for TURN servers.
    """
    # Default public STUN servers
    ice_servers = [
        {
            "urls": [
                "stun:stun.cloudflare.com:3478",
                "stun:stun.l.google.com:19302",
            ]
        }
    ]

    # Check for Cloudflare TURN configuration
    cloudflare_turn_key_id = os.environ.get("CLOUDFLARE_TURN_KEY_ID")
    cloudflare_turn_api_token = os.environ.get("CLOUDFLARE_TURN_API_TOKEN")

    if cloudflare_turn_key_id and cloudflare_turn_api_token:
        try:
            # Cloudflare TURN API endpoint
            url = f"https://rtc.live.cloudflare.com/v1/turn/keys/{cloudflare_turn_key_id}/credentials/generate"
            headers = {
                "Authorization": f"Bearer {cloudflare_turn_api_token}",
                "Content-Type": "application/json",
            }
            # Request credentials with 1 hour TTL (3600 seconds)
            payload = {"ttl": 3600}
            
            response = requests.post(url, json=payload, headers=headers, timeout=10)
            response.raise_for_status()
            
            data = response.json()
            ice_credentials = data.get("iceServers", {})
            
            # Cloudflare returns: {"iceServers": {"urls": [...], "username": "...", "credential": "..."}}
            if ice_credentials:
                ice_servers.append({
                    "urls": ice_credentials.get("urls", []),
                    "username": ice_credentials.get("username", ""),
                    "credential": ice_credentials.get("credential", ""),
                })
        except requests.exceptions.RequestException as e:
            print(f"Error fetching Cloudflare TURN credentials: {e}")
        except Exception as e:
            print(f"Unexpected error fetching Cloudflare TURN credentials: {e}")

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
        
        # Creator is admin for group chats, member for direct chats
        creator_role = "admin" if is_group_chat else "member"
        ChatRoomParticipant.objects.get_or_create(
            chat_room=chat_room, user=request.user,
            defaults={"role": creator_role}
        )
        
        # Other participants are members
        other_participants = User.objects.filter(id__in=participant_ids).exclude(
            id=request.user.id
        )
        for participant in other_participants:
            ChatRoomParticipant.objects.get_or_create(
                chat_room=chat_room, user=participant,
                defaults={"role": "member"}
            )

        chat_room.refresh_from_db()
        output = self.get_serializer(chat_room)

        # Broadcast chat_room_created event to all participants
        channel_layer = get_channel_layer()
        if channel_layer:
            for participant in users:
                async_to_sync(channel_layer.group_send)(
                    f"user_{participant.id}",
                    {"type": "chat_room_created", "room": output.data},
                )

        headers = self.get_success_headers(output.data)
        return Response(output.data, status=status.HTTP_201_CREATED, headers=headers)

    @action(detail=True, methods=["post"])
    def add_participant(self, request, pk=None):
        """Add a participant to a group chat. Only admins can add participants."""
        chat_room = self.get_object()
        
        if not chat_room.is_group_chat:
            raise ValidationError({"detail": "Cannot add participants to direct chats."})
        
        # Check if requester is admin
        requester_participant = ChatRoomParticipant.objects.filter(
            chat_room=chat_room, user=request.user
        ).first()
        if not requester_participant or requester_participant.role != "admin":
            raise PermissionDenied("Only admins can add participants.")
        
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
        ChatRoomParticipant.objects.create(
            chat_room=chat_room, user=user, role="member"
        )
        
        # Broadcast participant added event
        channel_layer = get_channel_layer()
        if channel_layer:
            room_data = self.get_serializer(chat_room).data
            async_to_sync(channel_layer.group_send)(
                f"chat_{chat_room.id}",
                {"type": "broadcast_room_updated", "room": room_data},
            )
        
        return Response({"status": "participant added"})

    @action(detail=True, methods=["post"])
    def remove_participant(self, request, pk=None):
        """Remove a participant from a group chat. Only admins can remove participants."""
        chat_room = self.get_object()
        
        if not chat_room.is_group_chat:
            raise ValidationError({"detail": "Cannot remove participants from direct chats."})
        
        # Check if requester is admin
        requester_participant = ChatRoomParticipant.objects.filter(
            chat_room=chat_room, user=request.user
        ).first()
        if not requester_participant or requester_participant.role != "admin":
            raise PermissionDenied("Only admins can remove participants.")
        
        user_id = request.data.get("user_id")
        if not user_id:
            raise ValidationError({"user_id": "user_id is required."})
        
        if int(user_id) == request.user.id:
            raise ValidationError({"user_id": "Use the leave endpoint to leave the group."})
        
        participant = ChatRoomParticipant.objects.filter(
            chat_room=chat_room, user_id=user_id
        ).first()
        if not participant:
            raise ValidationError({"user_id": "User is not a participant."})
        
        participant.delete()
        
        # Broadcast participant removed event
        channel_layer = get_channel_layer()
        if channel_layer:
            room_data = self.get_serializer(chat_room).data
            async_to_sync(channel_layer.group_send)(
                f"chat_{chat_room.id}",
                {"type": "broadcast_room_updated", "room": room_data},
            )
            # Notify the removed user
            async_to_sync(channel_layer.group_send)(
                f"user_{user_id}",
                {"type": "removed_from_room", "room_id": chat_room.id},
            )
        
        return Response({"status": "participant removed"})

    @action(detail=True, methods=["post"])
    def promote_to_admin(self, request, pk=None):
        """Promote a member to admin. Only admins can promote."""
        chat_room = self.get_object()
        
        if not chat_room.is_group_chat:
            raise ValidationError({"detail": "Admin roles only apply to group chats."})
        
        # Check if requester is admin
        requester_participant = ChatRoomParticipant.objects.filter(
            chat_room=chat_room, user=request.user
        ).first()
        if not requester_participant or requester_participant.role != "admin":
            raise PermissionDenied("Only admins can promote members.")
        
        user_id = request.data.get("user_id")
        if not user_id:
            raise ValidationError({"user_id": "user_id is required."})
        
        participant = ChatRoomParticipant.objects.filter(
            chat_room=chat_room, user_id=user_id
        ).first()
        if not participant:
            raise ValidationError({"user_id": "User is not a participant."})
        
        if participant.role == "admin":
            return Response({"status": "user is already an admin"}, status=status.HTTP_200_OK)
        
        participant.role = "admin"
        participant.save()
        
        # Broadcast role change
        channel_layer = get_channel_layer()
        if channel_layer:
            room_data = self.get_serializer(chat_room).data
            async_to_sync(channel_layer.group_send)(
                f"chat_{chat_room.id}",
                {"type": "broadcast_room_updated", "room": room_data},
            )
        
        return Response({"status": "user promoted to admin"})

    @action(detail=True, methods=["post"])
    def demote_to_member(self, request, pk=None):
        """Demote an admin to member. Only admins can demote, and there must be at least one admin."""
        chat_room = self.get_object()
        
        if not chat_room.is_group_chat:
            raise ValidationError({"detail": "Admin roles only apply to group chats."})
        
        # Check if requester is admin
        requester_participant = ChatRoomParticipant.objects.filter(
            chat_room=chat_room, user=request.user
        ).first()
        if not requester_participant or requester_participant.role != "admin":
            raise PermissionDenied("Only admins can demote members.")
        
        user_id = request.data.get("user_id")
        if not user_id:
            raise ValidationError({"user_id": "user_id is required."})
        
        participant = ChatRoomParticipant.objects.filter(
            chat_room=chat_room, user_id=user_id
        ).first()
        if not participant:
            raise ValidationError({"user_id": "User is not a participant."})
        
        if participant.role != "admin":
            return Response({"status": "user is already a member"}, status=status.HTTP_200_OK)
        
        # Check that there will still be at least one admin
        admin_count = ChatRoomParticipant.objects.filter(
            chat_room=chat_room, role="admin"
        ).count()
        if admin_count <= 1:
            raise ValidationError({"detail": "Cannot demote the last admin. Promote someone else first."})
        
        participant.role = "member"
        participant.save()
        
        # Broadcast role change
        channel_layer = get_channel_layer()
        if channel_layer:
            room_data = self.get_serializer(chat_room).data
            async_to_sync(channel_layer.group_send)(
                f"chat_{chat_room.id}",
                {"type": "broadcast_room_updated", "room": room_data},
            )
        
        return Response({"status": "user demoted to member"})

    @action(detail=True, methods=["post"])
    def rename_group(self, request, pk=None):
        """Rename a group chat. Only admins can rename."""
        chat_room = self.get_object()
        
        if not chat_room.is_group_chat:
            raise ValidationError({"detail": "Only group chats can be renamed."})
        
        # Check if requester is admin
        requester_participant = ChatRoomParticipant.objects.filter(
            chat_room=chat_room, user=request.user
        ).first()
        if not requester_participant or requester_participant.role != "admin":
            raise PermissionDenied("Only admins can rename the group.")
        
        new_name = request.data.get("name")
        if not new_name or not new_name.strip():
            raise ValidationError({"name": "Group name is required."})
        
        chat_room.name = new_name.strip()
        chat_room.save()
        
        # Broadcast room update
        channel_layer = get_channel_layer()
        if channel_layer:
            room_data = self.get_serializer(chat_room).data
            async_to_sync(channel_layer.group_send)(
                f"chat_{chat_room.id}",
                {"type": "broadcast_room_updated", "room": room_data},
            )
        
        return Response({"status": "group renamed", "name": chat_room.name})

    def destroy(self, request, *args, **kwargs):
        """Delete/leave a chat room. For group chats, handles admin transfer."""
        chat_room = self.get_object()
        user = request.user

        if chat_room.is_group_chat:
            # Get the leaving user's participant record
            leaving_participant = ChatRoomParticipant.objects.filter(
                chat_room=chat_room, user=user
            ).first()
            
            if not leaving_participant:
                raise ValidationError({"detail": "You are not a participant in this chat."})
            
            is_admin = leaving_participant.role == "admin"
            
            # Check if this is the last participant
            remaining_count = ChatRoomParticipant.objects.filter(chat_room=chat_room).count()
            
            if remaining_count <= 1:
                # Last participant leaving, delete the entire room
                chat_room.delete()
                return Response(status=status.HTTP_204_NO_CONTENT)
            
            # If leaving user is an admin, check if there are other admins
            if is_admin:
                other_admins = ChatRoomParticipant.objects.filter(
                    chat_room=chat_room, role="admin"
                ).exclude(user=user).exists()
                
                if not other_admins:
                    # No other admins, promote the oldest member
                    oldest_member = ChatRoomParticipant.objects.filter(
                        chat_room=chat_room
                    ).exclude(user=user).order_by("joined_at").first()
                    
                    if oldest_member:
                        oldest_member.role = "admin"
                        oldest_member.save()
                        
                        # Notify the new admin
                        channel_layer = get_channel_layer()
                        if channel_layer:
                            async_to_sync(channel_layer.group_send)(
                                f"user_{oldest_member.user_id}",
                                {
                                    "type": "promoted_to_admin",
                                    "room_id": chat_room.id,
                                    "room_name": chat_room.name,
                                },
                            )
            
            # Remove the leaving participant
            leaving_participant.delete()
            
            # Broadcast room update to remaining participants
            channel_layer = get_channel_layer()
            if channel_layer:
                chat_room.refresh_from_db()
                room_data = self.get_serializer(chat_room).data
                async_to_sync(channel_layer.group_send)(
                    f"chat_{chat_room.id}",
                    {"type": "broadcast_room_updated", "room": room_data},
                )
            
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
        data = MessageSerializer(message, context=self.get_serializer_context()).data

        # Inject client_id back into the response payload for optimistic reconciliation
        if client_id:
            data["client_id"] = client_id

        self._broadcast_message_event(
            message.chat_room_id,
            "broadcast_chat_message",
            {"payload": data},
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
                        "message_content": (
                            message.content[:100] if message.content else None
                        ),
                        "has_attachment": bool(message.attachment),
                    },
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

    @action(detail=False, methods=["post"])
    def mark_room_read(self, request):
        """Mark all notifications for a specific chat room as read and create read receipts for messages."""
        chat_room_id = request.data.get("chat_room_id")
        if not chat_room_id:
            return Response(
                {"error": "chat_room_id is required"},
                status=status.HTTP_400_BAD_REQUEST,
            )
        
        # Mark notifications as read
        updated = self.get_queryset().filter(
            chat_room_id=chat_room_id, is_read=False
        ).update(is_read=True)
        
        # Also create read receipts for all unread messages in this room
        unread_messages = Message.objects.filter(
            chat_room_id=chat_room_id
        ).exclude(
            sender=request.user
        ).exclude(
            read_receipts__user=request.user
        )
        
        read_receipts = [
            MessageReadReceipt(message=msg, user=request.user)
            for msg in unread_messages
        ]
        if read_receipts:
            MessageReadReceipt.objects.bulk_create(read_receipts, ignore_conflicts=True)
        
        return Response({
            "status": "notifications marked as read",
            "count": updated,
            "messages_marked": len(read_receipts)
        })
