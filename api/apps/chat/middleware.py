from channels.middleware import BaseMiddleware
from channels.db import database_sync_to_async
from django.contrib.auth.models import AnonymousUser
from django.contrib.auth import get_user_model
from django.contrib.sessions.models import Session
import jwt
from django.conf import settings
from urllib.parse import parse_qs
from django.core.cache import cache
import logging

logger = logging.getLogger(__name__)

User = get_user_model()
SECRET_KEY = settings.SECRET_KEY  # Avoid fetching the secret key repeatedly


def parse_cookies(cookie_header):
    """Parse cookie header string into a dict, handles complex values."""
    cookies = {}
    if not cookie_header:
        return cookies

    # Split by '; ' to get individual cookies
    parts = cookie_header.split("; ")
    for part in parts:
        # Split only on first '=' to handle values with '=' in them
        if "=" in part:
            key, value = part.split("=", 1)
            cookies[key.strip()] = value.strip()
    return cookies


@database_sync_to_async
def get_user_from_db(user_id):
    """Fetch user from database by ID."""
    try:
        return User.objects.get(id=user_id)
    except User.DoesNotExist:
        return AnonymousUser()


@database_sync_to_async
def get_user_from_session(session_key):
    """Fetch user from session."""
    try:
        session = Session.objects.get(session_key=session_key)
        session_data = session.get_decoded()
        user_id = session_data.get("_auth_user_id")
        if user_id:
            user = User.objects.get(id=user_id)
            logger.info(f"Session auth successful for user {user_id}")
            return user
        logger.warning("Session found but no user_id in session data")
    except Session.DoesNotExist:
        logger.warning(f"Session not found: {session_key[:20]}...")
    except User.DoesNotExist:
        logger.warning(f"User not found for session user_id: {user_id}")
    return AnonymousUser()


async def get_user(token):
    """Fetch user from cache or database after validating the token."""
    cache_key = f"user_token_{token}"
    user = cache.get(cache_key)

    if user is None:
        try:
            payload = jwt.decode(token, SECRET_KEY, algorithms=["HS256"])
            user_id = payload["user_id"]
            user = await get_user_from_db(user_id)

            # Cache user for future lookups
            cache.set(cache_key, user, timeout=3600)  # Cache for 1 hour
        except jwt.ExpiredSignatureError:
            return AnonymousUser()  # Token expired
        except jwt.InvalidTokenError:
            return AnonymousUser()  # Invalid token

    return user


class TokenAuthMiddleware(BaseMiddleware):
    async def __call__(self, scope, receive, send):
        headers = dict(scope.get("headers", []))
        cookie_header = headers.get(b"cookie", b"").decode()

        query_string = scope["query_string"].decode()
        query_params = parse_qs(query_string)
        token = query_params.get("token", [None])[0]

        if token:
            # JWT token auth (query string) - for React frontend
            scope["user"] = await get_user(token)
        else:
            # Try to get user from session cookie (for HTMX frontend)
            if cookie_header:
                cookies = parse_cookies(cookie_header)
                session_id = cookies.get("sessionid")

                if session_id:
                    scope["user"] = await get_user_from_session(session_id)
                else:
                    scope["user"] = AnonymousUser()
            else:
                scope["user"] = AnonymousUser()

        return await super().__call__(scope, receive, send)
