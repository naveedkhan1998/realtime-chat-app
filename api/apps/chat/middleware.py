from channels.middleware import BaseMiddleware
from channels.db import database_sync_to_async
from django.contrib.auth.models import AnonymousUser
from django.contrib.auth import get_user_model
import jwt
from django.conf import settings
from urllib.parse import parse_qs
from django.core.cache import cache

User = get_user_model()
SECRET_KEY = settings.SECRET_KEY  # Avoid fetching the secret key repeatedly


@database_sync_to_async
def get_user_from_db(user_id):
    """Fetch user from database by ID."""
    try:
        return User.objects.get(id=user_id)
    except User.DoesNotExist:
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
        query_string = scope["query_string"].decode()
        query_params = parse_qs(query_string)
        token = query_params.get("token", [None])[0]

        if token:
            scope["user"] = await get_user(token)
        else:
            scope["user"] = AnonymousUser()

        return await super().__call__(scope, receive, send)
