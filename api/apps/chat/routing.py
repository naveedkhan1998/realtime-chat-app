from django.urls import path
from . import consumers

websocket_urlpatterns = [
    path("ws/chat/<int:chat_room_id>/", consumers.ChatConsumer.as_asgi()),
    path("ws/huddle/<int:chat_room_id>/", consumers.HuddleConsumer.as_asgi()),
    path("ws/global/", consumers.GlobalConsumer.as_asgi()),
]
