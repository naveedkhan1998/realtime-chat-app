from rest_framework import serializers
from .models import (
    ChatRoom,
    ChatRoomParticipant,
    Message,
    MessageReadReceipt,
    TypingStatus,
    FriendRequest,
    FriendshipNew,
)
from django.contrib.auth import get_user_model
from django.db import models

User = get_user_model()


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ["id", "name", "email", "avatar"]


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


class ChatRoomSerializer(serializers.ModelSerializer):
    participants = UserSerializer(many=True, read_only=True)
    is_group_chat = serializers.BooleanField(default=False)
    name = serializers.CharField(required=False, allow_blank=True)

    class Meta:
        model = ChatRoom
        fields = ["id", "name", "is_group_chat", "participants", "created_at"]


class MessageSerializer(serializers.ModelSerializer):
    sender = UserSerializer(read_only=True)
    chat_room = serializers.PrimaryKeyRelatedField(queryset=ChatRoom.objects.all())

    class Meta:
        model = Message
        fields = ["id", "chat_room", "sender", "content", "timestamp"]


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
