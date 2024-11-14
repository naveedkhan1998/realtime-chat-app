from django.contrib import admin
from .models import (
    ChatRoom,
    Message,
    TypingStatus,
    MessageReadReceipt,
    ChatRoomParticipant,
    FriendRequest,
    Friendship,
)

# Register your models here.


admin.site.register(ChatRoom)
admin.site.register(Message)
admin.site.register(TypingStatus)
admin.site.register(MessageReadReceipt)
admin.site.register(ChatRoomParticipant)
admin.site.register(FriendRequest)
admin.site.register(Friendship)
