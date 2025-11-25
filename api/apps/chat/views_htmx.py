"""
HTMX Views for the Chat Application
These views return HTML responses for the Django-based frontend
"""

from django.shortcuts import render, redirect, get_object_or_404
from django.contrib.auth import authenticate, login, logout
from django.contrib.auth.decorators import login_required
from django.views.decorators.http import require_http_methods, require_POST, require_GET
from django.http import HttpResponse, JsonResponse
from django.template.loader import render_to_string
from django.core.paginator import Paginator
from django.db.models import Q, Max, Count, Prefetch
from django.contrib import messages
from django.core.cache import cache
from google.oauth2 import id_token
from google.auth.transport import requests

from apps.accounts.models import User
from apps.chat.models import (
    ChatRoom,
    ChatRoomParticipant,
    Message,
    MessageReadReceipt,
    FriendRequest,
    FriendshipNew,
    Notification,
)
from config.settings import GOOGLE_OAUTH_CLIENT_ID
import json


# =============================================================================
# Public Pages
# =============================================================================

def home(request):
    """Landing page"""
    return render(request, "pages/home.html")


# =============================================================================
# Authentication Views
# =============================================================================

def login_page(request):
    """Login/Register page"""
    if request.user.is_authenticated:
        return redirect("htmx:chat_list")
    
    if request.method == "POST":
        email = request.POST.get("email", "").strip().lower()
        password = request.POST.get("password", "")
        
        if not email or not password:
            return HttpResponse(
                render_to_string("partials/form_errors.html", {
                    "errors": ["Please provide both email and password."]
                }),
                status=400
            )
        
        user = authenticate(request, email=email, password=password)
        
        if user is not None:
            login(request, user)
            response = HttpResponse()
            response["HX-Redirect"] = "/app/"
            return response
        else:
            # Check if user exists with different auth provider
            try:
                existing_user = User.objects.get(email=email)
                if existing_user.auth_provider != "email":
                    error_msg = f"Please sign in with {existing_user.auth_provider.capitalize()}"
                else:
                    error_msg = "Invalid email or password."
            except User.DoesNotExist:
                error_msg = "Invalid email or password."
            
            return HttpResponse(
                render_to_string("partials/form_errors.html", {
                    "errors": [error_msg]
                }),
                status=400
            )
    
    return render(request, "pages/auth.html", {
        "google_client_id": GOOGLE_OAUTH_CLIENT_ID
    })


def register_page(request):
    """Registration - same page as login with different tab"""
    if request.user.is_authenticated:
        return redirect("htmx:chat_list")
    
    if request.method == "POST":
        name = request.POST.get("name", "").strip()
        email = request.POST.get("email", "").strip().lower()
        password = request.POST.get("password", "")
        password2 = request.POST.get("password2", "")
        terms_accepted = request.POST.get("terms_accepted")
        
        errors = []
        
        if not name:
            errors.append("Name is required.")
        if not email:
            errors.append("Email is required.")
        if not password:
            errors.append("Password is required.")
        if len(password) < 8:
            errors.append("Password must be at least 8 characters.")
        if password != password2:
            errors.append("Passwords do not match.")
        if not terms_accepted:
            errors.append("You must accept the terms and conditions.")
        if User.objects.filter(email=email).exists():
            errors.append("An account with this email already exists.")
        
        if errors:
            return HttpResponse(
                render_to_string("partials/form_errors.html", {"errors": errors}),
                status=400
            )
        
        # Create user
        user = User.objects.create_user(
            email=email,
            password=password,
            name=name,
            tc=True
        )
        
        # Log them in
        login(request, user)
        cache.delete("all_users")
        
        response = HttpResponse()
        response["HX-Redirect"] = "/app/"
        return response
    
    return render(request, "pages/auth.html", {
        "google_client_id": GOOGLE_OAUTH_CLIENT_ID
    })


@require_POST
def google_login(request):
    """Handle Google OAuth login"""
    try:
        data = json.loads(request.body)
        credential = data.get("credential")
        
        if not credential:
            return JsonResponse({"success": False, "error": "No credential provided"}, status=400)
        
        idinfo = id_token.verify_oauth2_token(
            credential, requests.Request(), GOOGLE_OAUTH_CLIENT_ID
        )
        
        email = idinfo["email"]
        name = idinfo.get("name", "")
        picture = idinfo.get("picture", "")
        
        user, created = User.objects.get_or_create(
            email=email,
            defaults={
                "name": name,
                "is_email_verify": True,
                "auth_provider": "google",
                "tc": True,
            }
        )
        
        # Download avatar if new user or no avatar
        if created or not user.avatar:
            import requests as http_requests
            from django.core.files.base import ContentFile
            
            response = http_requests.get(picture)
            if response.status_code == 200:
                image_content = ContentFile(response.content)
                user.avatar.save("avatar.jpg", image_content)
        
        login(request, user)
        cache.delete("all_users")
        
        return JsonResponse({"success": True})
        
    except ValueError as e:
        return JsonResponse({"success": False, "error": "Invalid token"}, status=400)
    except Exception as e:
        return JsonResponse({"success": False, "error": str(e)}, status=500)


@require_POST
def logout_view(request):
    """Logout user"""
    logout(request)
    return redirect("htmx:login")


def forgot_password(request):
    """Forgot password page"""
    if request.method == "POST":
        email = request.POST.get("email", "").strip().lower()
        # TODO: Implement password reset email
        return HttpResponse(
            render_to_string("partials/form_success.html", {
                "message": "If an account exists with this email, you will receive a password reset link."
            })
        )
    return render(request, "pages/forgot_password.html")


# =============================================================================
# Chat Views
# =============================================================================

@login_required
def chat_list(request):
    """Main chat list page (empty state for desktop, list for mobile)"""
    return render(request, "pages/chat_list.html")


@login_required
def chat_list_partial(request):
    """HTMX partial: Chat room list"""
    from django.db.models import Subquery, OuterRef, Exists
    
    # Get messages the user has read
    read_messages = MessageReadReceipt.objects.filter(
        user=request.user,
        message=OuterRef('pk')
    )
    
    rooms = ChatRoom.objects.filter(
        chatroomparticipant__user=request.user
    ).annotate(
        last_message_time=Max("messages__timestamp"),
    ).prefetch_related(
        Prefetch(
            "chatroomparticipant_set",
            queryset=ChatRoomParticipant.objects.select_related("user")
        ),
        "messages"
    ).order_by("-last_message_time")
    
    # Get last message and calculate unread count for each room
    for room in rooms:
        room.last_message = room.messages.order_by("-timestamp").first()
        # Count unread messages (not sent by user, and not in read receipts)
        room.unread_count = Message.objects.filter(
            chat_room=room
        ).exclude(
            sender=request.user
        ).exclude(
            read_receipts__user=request.user
        ).count()
        
        if not room.is_group_chat:
            room.other_participant = room.chatroomparticipant_set.exclude(user=request.user).first()
            if room.other_participant:
                room.other_participant = room.other_participant.user
    
    # Get online users from cache/Redis
    online_users = cache.get("online_users", set())
    
    return render(request, "partials/chat_list.html", {
        "rooms": rooms,
        "online_users": online_users,
        "active_room_id": request.GET.get("active")
    })


@login_required
def chat_room(request, room_id):
    """Individual chat room page"""
    room = get_object_or_404(
        ChatRoom.objects.prefetch_related(
            Prefetch(
                "chatroomparticipant_set",
                queryset=ChatRoomParticipant.objects.select_related("user")
            )
        ),
        id=room_id,
        chatroomparticipant__user=request.user
    )
    
    # Mark all messages in this room as read by the current user
    unread_messages = Message.objects.filter(
        chat_room=room
    ).exclude(
        sender=request.user
    ).exclude(
        read_receipts__user=request.user
    )
    
    # Create read receipts for unread messages
    read_receipts = [
        MessageReadReceipt(message=msg, user=request.user)
        for msg in unread_messages
    ]
    if read_receipts:
        MessageReadReceipt.objects.bulk_create(read_receipts, ignore_conflicts=True)
    
    # Get room name
    if room.is_group_chat:
        room_name = room.name or "Group Chat"
    else:
        other_membership = room.chatroomparticipant_set.exclude(user=request.user).first()
        room.other_participant = other_membership.user if other_membership else None
        room_name = room.other_participant.name if room.other_participant else "Chat"
    
    # Get online users
    online_users = cache.get("online_users", set())
    
    # Get collaborative note from Redis
    collaborative_note = cache.get(f"room_note:{room_id}", "")
    
    context = {
        "room": room,
        "room_name": room_name,
        "online_users": online_users,
        "collaborative_note": collaborative_note,
    }
    
    # If HTMX request, return just the chat content partial (not the full page with sidebar)
    if request.htmx:
        return render(request, "partials/chat_room_content.html", context)
    
    return render(request, "pages/chat_room.html", context)


@login_required
def messages_partial(request, room_id):
    """HTMX partial: Messages list with pagination"""
    room = get_object_or_404(ChatRoom, id=room_id, chatroomparticipant__user=request.user)
    
    cursor = request.GET.get("cursor")
    limit = 50
    
    messages_qs = Message.objects.filter(chat_room=room).select_related("sender").order_by("-timestamp")
    
    if cursor:
        messages_qs = messages_qs.filter(id__lt=cursor)
    
    messages_list = list(messages_qs[:limit + 1])
    has_more = len(messages_list) > limit
    messages_list = messages_list[:limit]
    
    # Reverse to show oldest first
    messages_list.reverse()
    
    next_cursor = messages_list[0].id if has_more and messages_list else None
    
    return render(request, "partials/messages_list.html", {
        "room": room,
        "messages": messages_list,
        "has_more": has_more,
        "next_cursor": next_cursor,
        "user": request.user
    })


@login_required
def message_partial(request, message_id):
    """HTMX partial: Single message (for real-time updates)"""
    message = get_object_or_404(Message.objects.select_related("sender"), id=message_id)
    
    # Verify user has access to this message's room
    if not ChatRoomParticipant.objects.filter(chat_room=message.chat_room, user=request.user).exists():
        return HttpResponse(status=403)
    
    return render(request, "components/message_bubble.html", {
        "message": message,
        "is_own_message": message.sender == request.user,
        "is_group": message.chat_room.is_group_chat
    })


@login_required
@require_POST
def mark_message_read(request, message_id):
    """Mark a single message as read"""
    message = get_object_or_404(Message, id=message_id)
    
    # Verify user has access to this message's room
    if not ChatRoomParticipant.objects.filter(chat_room=message.chat_room, user=request.user).exists():
        return HttpResponse(status=403)
    
    # Create read receipt if not already exists
    MessageReadReceipt.objects.get_or_create(message=message, user=request.user)
    
    return HttpResponse("")


@login_required
@require_POST
def send_message_with_attachment(request, room_id):
    """Send a message with file attachment"""
    from channels.layers import get_channel_layer
    from asgiref.sync import async_to_sync
    from apps.chat.serializers import MessageSerializer
    
    room = get_object_or_404(ChatRoom, id=room_id)
    
    # Verify user is participant
    if not ChatRoomParticipant.objects.filter(chat_room=room, user=request.user).exists():
        return HttpResponse(status=403)
    
    content = request.POST.get("content", "").strip()
    attachment = request.FILES.get("attachment")
    
    if not content and not attachment:
        return HttpResponse("Message or attachment required", status=400)
    
    # Determine attachment type
    attachment_type = None
    if attachment:
        content_type = attachment.content_type
        if content_type.startswith("image/"):
            attachment_type = "image"
        elif content_type.startswith("video/"):
            attachment_type = "video"
        elif content_type.startswith("audio/"):
            attachment_type = "audio"
        else:
            attachment_type = "file"
    
    # Create message
    message = Message.objects.create(
        chat_room=room,
        sender=request.user,
        content=content,
        attachment=attachment,
        attachment_type=attachment_type
    )
    
    # Broadcast via WebSocket
    channel_layer = get_channel_layer()
    message_data = MessageSerializer(message).data
    
    async_to_sync(channel_layer.group_send)(
        f"chat_{room_id}",
        {
            "type": "broadcast_chat_message",
            "room_id": room_id,
            "payload": message_data,
        }
    )
    
    # Notify other participants not in the room
    participants = ChatRoomParticipant.objects.filter(chat_room=room).exclude(user=request.user)
    for participant in participants:
        async_to_sync(channel_layer.group_send)(
            f"user_{participant.user_id}",
            {
                "type": "new_message_notification",
                "chat_room_id": room_id,
                "sender_id": request.user.id,
                "sender_name": request.user.name,
            }
        )
    
    return JsonResponse({"success": True, "message_id": message.id})


@login_required
@require_http_methods(["DELETE"])
def delete_message(request, message_id):
    """Delete a message"""
    from channels.layers import get_channel_layer
    from asgiref.sync import async_to_sync
    
    message = get_object_or_404(Message, id=message_id, sender=request.user)
    room_id = message.chat_room_id
    
    # Delete the message
    message.delete()
    
    # Broadcast deletion via WebSocket
    channel_layer = get_channel_layer()
    async_to_sync(channel_layer.group_send)(
        f"chat_{room_id}",
        {
            "type": "broadcast_message_deleted",
            "room_id": room_id,
            "message_id": message_id,
        }
    )
    
    return HttpResponse("")


@login_required
def new_chat(request):
    """New chat page"""
    return render(request, "pages/new_chat.html")


@login_required
@require_POST
def create_chat(request):
    """Create a new chat room with a user"""
    user_id = request.POST.get("user_id")
    
    if not user_id:
        return HttpResponse("User ID required", status=400)
    
    other_user = get_object_or_404(User, id=user_id)
    
    if other_user == request.user:
        return HttpResponse("Cannot chat with yourself", status=400)
    
    # Check if chat already exists
    existing_room = ChatRoom.objects.filter(
        is_group_chat=False,
        chatroomparticipant__user=request.user
    ).filter(
        chatroomparticipant__user=other_user
    ).first()
    
    if existing_room:
        response = HttpResponse()
        response["HX-Redirect"] = f"/app/chat/{existing_room.id}/"
        return response
    
    # Create new room
    room = ChatRoom.objects.create(is_group_chat=False)
    ChatRoomParticipant.objects.create(chat_room=room, user=request.user)
    ChatRoomParticipant.objects.create(chat_room=room, user=other_user)
    
    response = HttpResponse()
    response["HX-Redirect"] = f"/app/chat/{room.id}/"
    return response


@login_required
@require_http_methods(["DELETE"])
def delete_chat(request, room_id):
    """Delete/leave a chat room"""
    membership = get_object_or_404(ChatRoomParticipant, chat_room_id=room_id, user=request.user)
    
    if membership.chat_room.is_group_chat:
        # Leave group
        membership.delete()
    else:
        # Delete 1:1 chat
        membership.chat_room.delete()
    
    response = HttpResponse()
    response["HX-Redirect"] = "/app/"
    return response


@login_required
def search_users(request):
    """HTMX partial: Search users for new chat"""
    query = request.GET.get("search", "").strip()
    
    if len(query) < 2:
        return HttpResponse("")
    
    users = User.objects.filter(
        Q(name__icontains=query) | Q(email__icontains=query)
    ).exclude(id=request.user.id)[:20]
    
    return render(request, "partials/user_search_results.html", {
        "users": users
    })


@login_required
def shared_media(request, room_id):
    """HTMX partial: Shared media in a chat room"""
    room = get_object_or_404(ChatRoom, id=room_id, chatroomparticipant__user=request.user)
    
    # Filter for messages that have attachments (not null and not empty string)
    media_messages = Message.objects.filter(
        chat_room=room,
    ).exclude(
        attachment=""
    ).exclude(
        attachment__isnull=True
    ).order_by("-timestamp")[:9]
    
    return render(request, "partials/shared_media.html", {
        "messages": media_messages
    })


# =============================================================================
# Friends Views
# =============================================================================

@login_required
def friends_page(request):
    """Friends management page"""
    pending_requests_count = FriendRequest.objects.filter(
        to_user=request.user,
        status="pending"
    ).count()
    
    return render(request, "pages/friends.html", {
        "pending_requests_count": pending_requests_count
    })


@login_required
def friends_partial(request):
    """HTMX partial: Friends list (compact)"""
    friendships = FriendshipNew.objects.filter(
        Q(user1=request.user) | Q(user2=request.user)
    ).select_related("user1", "user2")
    
    # Add friend property to each friendship
    for f in friendships:
        f.friend = f.user2 if f.user1 == request.user else f.user1
    
    online_users = cache.get("online_users", set())
    
    return render(request, "partials/friends_list.html", {
        "friendships": friendships,
        "online_users": online_users
    })


@login_required
def friends_full(request):
    """HTMX partial: Full friends list with actions"""
    friendships = FriendshipNew.objects.filter(
        Q(user1=request.user) | Q(user2=request.user)
    ).select_related("user1", "user2")
    
    for f in friendships:
        f.friend = f.user2 if f.user1 == request.user else f.user1
    
    online_users = cache.get("online_users", set())
    
    return render(request, "partials/friends_full.html", {
        "friendships": friendships,
        "online_users": online_users
    })


@login_required
def friend_requests(request):
    """HTMX partial: Friend requests list"""
    received_requests = FriendRequest.objects.filter(
        to_user=request.user,
        status="pending"
    ).select_related("from_user")
    
    sent_requests = FriendRequest.objects.filter(
        from_user=request.user,
        status="pending"
    ).select_related("to_user")
    
    return render(request, "partials/friend_requests.html", {
        "received_requests": received_requests,
        "sent_requests": sent_requests
    })


@login_required
def search_users_for_friend(request):
    """HTMX partial: Search users for friend request"""
    query = request.GET.get("search", "").strip()
    
    if len(query) < 2:
        return HttpResponse("")
    
    # Get existing friends
    friend_ids = set()
    friendships = FriendshipNew.objects.filter(
        Q(user1=request.user) | Q(user2=request.user)
    )
    for f in friendships:
        friend_ids.add(f.user1_id if f.user1_id != request.user.id else f.user2_id)
    
    # Get pending requests
    pending_sent = set(FriendRequest.objects.filter(
        from_user=request.user, status="pending"
    ).values_list("to_user_id", flat=True))
    
    pending_received = set(FriendRequest.objects.filter(
        to_user=request.user, status="pending"
    ).values_list("from_user_id", flat=True))
    
    users = User.objects.filter(
        Q(name__icontains=query) | Q(email__icontains=query)
    ).exclude(id=request.user.id)[:20]
    
    # Add relationship status to each user
    for user in users:
        if user.id in friend_ids:
            user.relationship = "friend"
        elif user.id in pending_sent:
            user.relationship = "pending_sent"
        elif user.id in pending_received:
            user.relationship = "pending_received"
        else:
            user.relationship = None
    
    return render(request, "partials/add_friend_results.html", {
        "users": users
    })


@login_required
@require_POST
def send_friend_request(request):
    """Send a friend request"""
    user_id = request.POST.get("user_id")
    
    if not user_id:
        return HttpResponse("User ID required", status=400)
    
    receiver = get_object_or_404(User, id=user_id)
    
    if receiver == request.user:
        return HttpResponse("Cannot send request to yourself", status=400)
    
    # Check if already friends
    if FriendshipNew.objects.filter(
        Q(user1=request.user, user2=receiver) | Q(user1=receiver, user2=request.user)
    ).exists():
        return HttpResponse("Already friends", status=400)
    
    # Check if request already exists
    existing = FriendRequest.objects.filter(
        from_user=request.user,
        to_user=receiver,
        status="pending"
    ).exists()
    
    if existing:
        return HttpResponse("Request already sent", status=400)
    
    FriendRequest.objects.create(from_user=request.user, to_user=receiver)
    
    return HttpResponse(
        '<span class="text-green-600">Request sent!</span>'
    )


@login_required
@require_POST
def accept_friend_request(request, request_id):
    """Accept a friend request"""
    friend_request = get_object_or_404(
        FriendRequest,
        id=request_id,
        to_user=request.user,
        status="pending"
    )
    
    friend_request.status = "accepted"
    friend_request.save()
    
    # Create friendship
    user1, user2 = sorted([request.user, friend_request.from_user], key=lambda u: u.id)
    FriendshipNew.objects.get_or_create(user1=user1, user2=user2)
    
    # Refresh the requests list
    response = HttpResponse()
    response["HX-Trigger"] = "friendRequestsUpdated"
    return response


@login_required
@require_POST
def decline_friend_request(request, request_id):
    """Decline a friend request"""
    friend_request = get_object_or_404(
        FriendRequest,
        id=request_id,
        to_user=request.user,
        status="pending"
    )
    
    friend_request.status = "declined"
    friend_request.save()
    
    response = HttpResponse()
    response["HX-Trigger"] = "friendRequestsUpdated"
    return response


# =============================================================================
# Notifications Views
# =============================================================================

@login_required
def notifications_page(request):
    """Notifications page"""
    # Get unread count BEFORE slicing (can't filter after slice)
    unread_count = Notification.objects.filter(user=request.user, is_read=False).count()
    notifications = Notification.objects.filter(user=request.user).order_by("-created_at")[:50]
    
    return render(request, "pages/notifications.html", {
        "notifications": notifications,
        "unread_count": unread_count
    })


@login_required
@require_POST
def mark_notification_read(request, notification_id):
    """Mark a notification as read"""
    notification = get_object_or_404(Notification, id=notification_id, user=request.user)
    notification.is_read = True
    notification.save()
    return HttpResponse("")


@login_required
@require_POST
def mark_all_notifications_read(request):
    """Mark all notifications as read"""
    Notification.objects.filter(user=request.user, is_read=False).update(is_read=True)
    response = HttpResponse()
    response["HX-Trigger"] = "notificationsUpdated"
    return response


# =============================================================================
# Profile/Settings Views
# =============================================================================

@login_required
def profile_page(request):
    """User profile page"""
    if request.method == "POST":
        name = request.POST.get("name", "").strip()
        avatar = request.FILES.get("avatar")
        
        if name:
            request.user.name = name
        if avatar:
            request.user.avatar = avatar
        
        request.user.save()
        cache.delete("all_users")
        
        messages.success(request, "Profile updated successfully!")
        return redirect("htmx:profile")
    
    return render(request, "pages/profile.html")


@login_required
def settings_page(request):
    """Settings page"""
    return render(request, "pages/settings.html")


@login_required
@require_POST
def change_password(request):
    """Change user password"""
    current_password = request.POST.get("current_password", "")
    new_password = request.POST.get("new_password", "")
    confirm_password = request.POST.get("confirm_password", "")
    
    errors = []
    
    if not request.user.check_password(current_password):
        errors.append("Current password is incorrect.")
    if len(new_password) < 8:
        errors.append("New password must be at least 8 characters.")
    if new_password != confirm_password:
        errors.append("New passwords do not match.")
    
    if errors:
        return HttpResponse(
            render_to_string("partials/form_errors.html", {"errors": errors}),
            status=400
        )
    
    request.user.set_password(new_password)
    request.user.save()
    
    # Re-login with new password
    login(request, request.user)
    
    return HttpResponse(
        render_to_string("partials/form_success.html", {
            "message": "Password changed successfully!"
        })
    )
