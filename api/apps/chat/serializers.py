from rest_framework import serializers
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
from django.contrib.auth import get_user_model
from django.db import models

User = get_user_model()


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ["id", "name", "avatar"]


class FriendRequestSerializer(serializers.ModelSerializer):
    from_user = UserSerializer(read_only=True)
    to_user = UserSerializer(read_only=True)
    to_user_id = serializers.IntegerField(write_only=True)

    class Meta:
        model = FriendRequest
        fields = ["id", "from_user", "to_user", "to_user_id", "status", "created_at"]

    def validate(self, data):
        from_user = self.context["request"].user
        to_user_id = data["to_user_id"]

        if from_user.id == to_user_id:
            raise serializers.ValidationError(
                "You cannot send a friend request to yourself."
            )

        if FriendRequest.objects.filter(
            from_user=from_user, to_user_id=to_user_id, status="pending"
        ).exists():
            raise serializers.ValidationError("Friend request already sent.")

        if FriendshipNew.objects.filter(
            models.Q(user1=from_user, user2__id=to_user_id)
            | models.Q(user1__id=to_user_id, user2=from_user)
        ).exists():
            raise serializers.ValidationError("You are already friends with this user.")

        return data

    def create(self, validated_data):
        to_user_id = validated_data.pop("to_user_id")
        to_user = User.objects.get(id=to_user_id)
        friend_request = FriendRequest.objects.create(
            from_user=self.context["request"].user, to_user=to_user, **validated_data
        )
        return friend_request


class FriendshipSerializer(serializers.ModelSerializer):
    user1 = UserSerializer(read_only=True)
    user2 = UserSerializer(read_only=True)

    class Meta:
        model = FriendshipNew
        fields = ["id", "user1", "user2", "created_at"]


class ChatRoomParticipantSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)
    last_read_message = serializers.PrimaryKeyRelatedField(read_only=True)

    class Meta:
        model = ChatRoomParticipant
        fields = ["user", "joined_at", "last_read_message"]


class LastMessageSerializer(serializers.ModelSerializer):
    """Lightweight serializer for last message in chat room list."""
    sender = UserSerializer(read_only=True)

    class Meta:
        model = Message
        fields = ["id", "sender", "content", "attachment", "attachment_type", "timestamp"]


class SimpleChatRoomSerializer(serializers.ModelSerializer):
    """
    Lightweight serializer for list views to prevent N+1 queries.
    """
    participants = serializers.SerializerMethodField()
    is_group_chat = serializers.BooleanField(default=False)
    name = serializers.CharField(required=False, allow_blank=True)
    last_message = serializers.SerializerMethodField()
    unread_count = serializers.SerializerMethodField()

    class Meta:
        model = ChatRoom
        fields = [
            "id",
            "name",
            "is_group_chat",
            "participants",
            "last_message",
            "unread_count",
            "created_at",
        ]

    def get_participants(self, obj):
        # Return only a subset of participants (e.g., top 3) or just the count
        # For the sidebar, we usually need the other user's avatar/name (for 1-on-1)
        # or a few avatars (for groups).
        request = self.context.get("request")
        if not request:
            return []
        
        # Optimize: Prefetch related is handled in view, but we limit serialization here
        participants = obj.participants.all()
        # If it's a direct chat, we need the other user.
        # If it's a group chat, maybe just the first 3.
        return UserSerializer(participants[:4], many=True).data

    def get_last_message(self, obj):
        """Get the most recent message in this chat room."""
        last_message = obj.messages.order_by("-timestamp").first()
        if last_message:
            return LastMessageSerializer(last_message).data
        return None

    def get_unread_count(self, obj):
        """Count unread messages (not sent by user, and not in read receipts)."""
        request = self.context.get("request")
        if not request or not request.user.is_authenticated:
            return 0
        
        return Message.objects.filter(
            chat_room=obj
        ).exclude(
            sender=request.user
        ).exclude(
            read_receipts__user=request.user
        ).count()


class ChatRoomSerializer(serializers.ModelSerializer):
    participants = UserSerializer(many=True, read_only=True)
    participant_ids = serializers.ListField(
        child=serializers.IntegerField(min_value=1),
        write_only=True,
        required=False,
        allow_empty=True,
    )
    is_group_chat = serializers.BooleanField(default=False)
    name = serializers.CharField(required=False, allow_blank=True)

    class Meta:
        model = ChatRoom
        fields = [
            "id",
            "name",
            "is_group_chat",
            "participants",
            "participant_ids",
            "created_at",
        ]

    def validate(self, attrs):
        request = self.context["request"]
        participant_ids = attrs.get("participant_ids")
        is_group_chat = attrs.get("is_group_chat", False)
        name = attrs.get("name", "")

        if participant_ids is None:
            if self.instance is None:
                raise serializers.ValidationError(
                    {"participant_ids": "Provide at least one participant."}
                )
            return attrs

        # Ensure participant ids are unique and do not contain the requester
        unique_participants = []
        for participant_id in participant_ids:
            if participant_id == request.user.id:
                continue
            if participant_id not in unique_participants:
                unique_participants.append(participant_id)

        if not unique_participants:
            raise serializers.ValidationError(
                {"participant_ids": "Select at least one other participant."}
            )

        if is_group_chat:
            if not name or not name.strip():
                raise serializers.ValidationError(
                    {"name": "Group chats require a name."}
                )
            if len(unique_participants) < 1:
                raise serializers.ValidationError(
                    {
                        "participant_ids": "Select at least one participant to start a group chat."
                    }
                )
        else:
            if len(unique_participants) != 1:
                raise serializers.ValidationError(
                    {
                        "participant_ids": "Direct chats require exactly one other participant."
                    }
                )

        attrs["participant_ids"] = unique_participants
        return attrs


class MessageSerializer(serializers.ModelSerializer):
    sender = UserSerializer(read_only=True)
    chat_room = serializers.PrimaryKeyRelatedField(
        queryset=ChatRoom.objects.all(), required=False
    )
    attachment_key = serializers.CharField(write_only=True, required=False)
    attachment_key = serializers.CharField(write_only=True, required=False)
    attachment_type = serializers.CharField(read_only=True)
    client_id = serializers.CharField(write_only=True, required=False)

    class Meta:
        model = Message
        fields = ["id", "chat_room", "sender", "content", "attachment", "attachment_type", "timestamp", "updated_at", "attachment_key", "client_id"]
        read_only_fields = ("sender", "timestamp", "updated_at", "attachment_type")

    def create(self, validated_data):
        attachment_key = validated_data.pop("attachment_key", None)
        # We pop client_id so it doesn't cause an error when creating the model, 
        # but we don't need to store it in the DB.
        validated_data.pop("client_id", None)
        
        import mimetypes
        mime_type = None
        
        # Determine mime_type before creation
        if attachment_key:
            mime_type, _ = mimetypes.guess_type(attachment_key)
        elif validated_data.get('attachment'):
            mime_type, _ = mimetypes.guess_type(validated_data['attachment'].name)
            
        if mime_type:
            if mime_type.startswith('image'):
                validated_data['attachment_type'] = 'image'
            elif mime_type.startswith('video'):
                validated_data['attachment_type'] = 'video'
            elif mime_type.startswith('audio'):
                validated_data['attachment_type'] = 'audio'
            else:
                validated_data['attachment_type'] = 'file'
        
        message = super().create(validated_data)
        
        # If using GCS signed URL flow, we need to manually associate the key
        if attachment_key:
            message.attachment.name = attachment_key
            message.save(update_fields=['attachment'])
            
        return message

    def update(self, instance, validated_data):
        validated_data.pop("chat_room", None)
        return super().update(instance, validated_data)


class MessageReadReceiptSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)
    message = serializers.PrimaryKeyRelatedField(queryset=Message.objects.all())

    class Meta:
        model = MessageReadReceipt
        fields = ["id", "message", "user", "read_at"]


class TypingStatusSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)
    chat_room = serializers.PrimaryKeyRelatedField(queryset=ChatRoom.objects.all())

    class Meta:
        model = TypingStatus
        fields = ["id", "chat_room", "user", "is_typing", "updated_at"]


class NotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Notification
        fields = ["id", "chat_room", "content", "created_at", "is_read"]
