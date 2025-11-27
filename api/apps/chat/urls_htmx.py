"""
HTMX URL patterns for the Chat Application
"""

from django.urls import path
from . import views_htmx as views

app_name = "htmx"

urlpatterns = [
    # Public Pages
    path("", views.home, name="home"),
    # Authentication
    path("app/auth/", views.login_page, name="auth"),  # Unified auth page with tabs
    path("app/login/", views.login_page, name="login"),
    path("app/register/", views.register_page, name="register"),
    path("app/logout/", views.logout_view, name="logout"),
    path("app/forgot-password/", views.forgot_password, name="forgot_password"),
    path("app/auth/google/", views.google_login, name="google_login"),
    # Chat
    path("app/", views.chat_list, name="chat_list"),
    path("app/chat/<int:room_id>/", views.chat_room, name="chat_room"),
    path("app/new/", views.new_chat, name="new_chat"),
    path("app/create-chat/", views.create_chat, name="create_chat"),
    path("app/delete-chat/<int:room_id>/", views.delete_chat, name="delete_chat"),
    # HTMX Partials - Chat
    path("app/partials/chat-list/", views.chat_list_partial, name="chat_list_partial"),
    path(
        "app/partials/messages/<int:room_id>/",
        views.messages_partial,
        name="messages_partial",
    ),
    path(
        "app/message/<int:message_id>/", views.message_partial, name="message_partial"
    ),
    path(
        "app/message/<int:message_id>/delete/",
        views.delete_message,
        name="delete_message",
    ),
    path(
        "app/message/<int:message_id>/read/",
        views.mark_message_read,
        name="mark_message_read",
    ),
    path(
        "app/chat/<int:room_id>/send-message/",
        views.send_message_with_attachment,
        name="send_message_with_attachment",
    ),
    path(
        "app/partials/shared-media/<int:room_id>/",
        views.shared_media,
        name="shared_media",
    ),
    path("app/search-users/", views.search_users, name="search_users"),
    # Friends
    path("app/friends/", views.friends_page, name="friends"),
    path("app/partials/friends/", views.friends_partial, name="friends_partial"),
    path("app/partials/friends-full/", views.friends_full, name="friends_full"),
    path(
        "app/partials/friend-requests/", views.friend_requests, name="friend_requests"
    ),
    path(
        "app/search-users-friend/",
        views.search_users_for_friend,
        name="search_users_for_friend",
    ),
    path(
        "app/friend-request/send/",
        views.send_friend_request,
        name="send_friend_request",
    ),
    path(
        "app/friend-request/<int:request_id>/accept/",
        views.accept_friend_request,
        name="accept_friend_request",
    ),
    path(
        "app/friend-request/<int:request_id>/decline/",
        views.decline_friend_request,
        name="decline_friend_request",
    ),
    # Notifications
    path("app/notifications/", views.notifications_page, name="notifications"),
    path(
        "app/notifications/<int:notification_id>/read/",
        views.mark_notification_read,
        name="mark_notification_read",
    ),
    path(
        "app/notifications/read-all/",
        views.mark_all_notifications_read,
        name="mark_all_notifications_read",
    ),
    # Profile & Settings
    path("app/profile/", views.profile_page, name="profile"),
    path("app/settings/", views.settings_page, name="settings"),
    path("app/change-password/", views.change_password, name="change_password"),
]
