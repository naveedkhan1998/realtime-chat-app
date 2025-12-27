from django.db import models
from django.conf import settings
from django.core.exceptions import ValidationError


class ChatRoom(models.Model):
    """
    Represents a chat room, which can be a private chat between two users or a group chat.
    """

    name = models.CharField(max_length=255, blank=True, null=True)
    is_group_chat = models.BooleanField(default=False)
    participants = models.ManyToManyField(
        settings.AUTH_USER_MODEL,
        through="ChatRoomParticipant",
        related_name="chat_rooms",
    )
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        if self.is_group_chat and self.name:
            return self.name
        else:
            participant_names = ", ".join(
                [user.name for user in self.participants.all()]
            )
            return f"Chat between {participant_names}"


class ChatRoomParticipant(models.Model):
    """
    Through model for participants in a chat room, storing additional information per participant.
    """

    ROLE_CHOICES = [
        ("admin", "Admin"),
        ("member", "Member"),
    ]

    chat_room = models.ForeignKey(ChatRoom, on_delete=models.CASCADE)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    role = models.CharField(max_length=10, choices=ROLE_CHOICES, default="member")
    joined_at = models.DateTimeField(auto_now_add=True)
    last_read_message = models.ForeignKey(
        "Message", null=True, blank=True, on_delete=models.SET_NULL
    )

    class Meta:
        unique_together = ("chat_room", "user")

    def __str__(self):
        return f"{self.user.name} in {self.chat_room}"


class Message(models.Model):
    """
    Represents a message sent within a chat room.
    """

    chat_room = models.ForeignKey(
        ChatRoom, related_name="messages", on_delete=models.CASCADE
    )
    sender = models.ForeignKey(
        settings.AUTH_USER_MODEL, related_name="sent_messages", on_delete=models.CASCADE
    )
    content = models.TextField()
    timestamp = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    attachment = models.FileField(upload_to="attachments/", null=True, blank=True)
    attachment_type = models.CharField(max_length=50, null=True, blank=True)

    class Meta:
        indexes = [
            models.Index(fields=["chat_room", "timestamp"]),
        ]

    @property
    def is_edited(self):
        """Returns True if the message was edited (updated more than 2 seconds after creation)"""
        if self.updated_at and self.timestamp:
            time_diff = (self.updated_at - self.timestamp).total_seconds()
            return time_diff > 2
        return False

    def __str__(self):
        return f"{self.sender.name}: {self.content[:20]}"


class MessageReadReceipt(models.Model):
    """
    Tracks when a user has read a message.
    """

    message = models.ForeignKey(
        Message, related_name="read_receipts", on_delete=models.CASCADE
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        related_name="message_read_receipts",
        on_delete=models.CASCADE,
    )
    read_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ("message", "user")

    def __str__(self):
        return f"{self.user.name} read message {self.message.id} at {self.read_at}"


class TypingStatus(models.Model):
    """
    Tracks whether a user is typing in a chat room.
    """

    chat_room = models.ForeignKey(
        ChatRoom, related_name="typing_statuses", on_delete=models.CASCADE
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        related_name="typing_statuses",
        on_delete=models.CASCADE,
    )
    is_typing = models.BooleanField(default=False)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ("chat_room", "user")

    def __str__(self):
        return f"{self.user.name} typing in {self.chat_room}: {self.is_typing}"


class FriendRequest(models.Model):
    """
    Represents a friend request sent from one user to another.
    """

    from_user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        related_name="sent_friend_requests",
        on_delete=models.CASCADE,
    )
    to_user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        related_name="received_friend_requests",
        on_delete=models.CASCADE,
    )
    created_at = models.DateTimeField(auto_now_add=True)
    STATUS_CHOICES = [
        ("pending", "Pending"),
        ("accepted", "Accepted"),
        ("declined", "Declined"),
    ]
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default="pending")

    class Meta:
        unique_together = ("from_user", "to_user")

    def __str__(self):
        return f"Friend request from {self.from_user.name} to {self.to_user.name}"


class FriendshipNew(models.Model):
    """
    Represents a friendship between two users.
    """

    user1 = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        related_name="friendship_initiated",
        on_delete=models.CASCADE,
    )
    user2 = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        related_name="friendship_received",
        on_delete=models.CASCADE,
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ("user1", "user2")

    def __str__(self):
        return f"Friendship between {self.user1} and {self.user2}"

    def clean(self):
        if self.user1 == self.user2:
            raise ValidationError("A user cannot be friends with themselves.")

    def save(self, *args, **kwargs):
        self.clean()
        # Ensure consistent ordering of user1 and user2 to prevent duplicates
        if self.user1.id > self.user2.id:
            self.user1, self.user2 = self.user2, self.user1
        super().save(*args, **kwargs)


class Notification(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, related_name="notifications", on_delete=models.CASCADE
    )
    chat_room = models.ForeignKey(
        "ChatRoom",
        related_name="notifications",
        on_delete=models.CASCADE,
        null=True,
        blank=True,
    )
    content = models.CharField(max_length=255)
    created_at = models.DateTimeField(auto_now_add=True)
    is_read = models.BooleanField(default=False)
