from django.urls import path
from . import consumers

websocket_urlpatterns = [
    # Unified WebSocket endpoint - handles all chat, huddle, and global functionality
    path("ws/stream/", consumers.UnifiedConsumer.as_asgi()),
]
