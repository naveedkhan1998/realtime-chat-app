from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    FriendRequestViewSet,
    FriendshipViewSet,
    ChatRoomViewSet,
    MessageViewSet,
    MessageReadReceiptViewSet,
    TypingStatusViewSet,
)

router = DefaultRouter()
router.register(r"friend-requests", FriendRequestViewSet, basename="friendrequest")
router.register(r"friendships", FriendshipViewSet, basename="friendship")
router.register(r"chat-rooms", ChatRoomViewSet, basename="chatroom")
router.register(r"messages", MessageViewSet, basename="message")
router.register(
    r"message-read-receipts", MessageReadReceiptViewSet, basename="messagereadreceipt"
)
router.register(r"typing-status", TypingStatusViewSet, basename="typingstatus")

urlpatterns = [
    path("", include(router.urls)),
]
