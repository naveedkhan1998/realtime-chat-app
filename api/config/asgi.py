"""
ASGI config for config project.

It exposes the ASGI callable as a module-level variable named ``application``.

For more information on this file, see
https://docs.djangoproject.com/en/5.1/howto/deployment/asgi/
"""

import os
from django.core.asgi import get_asgi_application

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")

# Initialize Django ASGI application early to ensure the AppRegistry is populated
# before importing code that may import models.
django_asgi_app = get_asgi_application()

from channels.routing import ProtocolTypeRouter, URLRouter
from apps.chat.routing import websocket_urlpatterns
from apps.chat.middleware import TokenAuthMiddleware

application = ProtocolTypeRouter(
    {
        "http": django_asgi_app,
        "https": django_asgi_app,
        "websocket": TokenAuthMiddleware(URLRouter(websocket_urlpatterns)),
    }
)
