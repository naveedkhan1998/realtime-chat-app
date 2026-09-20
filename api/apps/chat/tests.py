import pytest
from django.contrib.auth import get_user_model
from apps.chat.models import ChatRoom, ChatRoomParticipant, Message

User = get_user_model()


@pytest.mark.django_db
def test_create_chat_room_and_participants():
    user1 = User.objects.create_user(email="user1@example.com", name="User One")
    user2 = User.objects.create_user(email="user2@example.com", name="User Two")

    room = ChatRoom.objects.create(is_group_chat=False)
    p1 = ChatRoomParticipant.objects.create(chat_room=room, user=user1, role="admin")
    p2 = ChatRoomParticipant.objects.create(chat_room=room, user=user2, role="member")

    assert room.participants.count() == 2
    assert p1.role == "admin"
    assert p2.role == "member"
    assert "User One" in str(room) or "User Two" in str(room)


@pytest.mark.django_db
def test_create_group_chat_and_messages():
    admin = User.objects.create_user(email="lead@example.com", name="Team Lead")
    member = User.objects.create_user(email="dev@example.com", name="Dev")

    group = ChatRoom.objects.create(name="Project Huddle", is_group_chat=True)
    ChatRoomParticipant.objects.create(chat_room=group, user=admin, role="admin")
    ChatRoomParticipant.objects.create(chat_room=group, user=member, role="member")

    assert str(group) == "Project Huddle"

    msg = Message.objects.create(
        chat_room=group,
        sender=admin,
        content="Starting an audio huddle now!",
    )
    assert msg.content == "Starting an audio huddle now!"
    assert msg.chat_room == group
    assert msg.sender == admin
