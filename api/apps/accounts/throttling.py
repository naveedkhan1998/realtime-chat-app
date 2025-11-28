"""
Custom throttle classes for rate limiting API endpoints.
"""

from rest_framework.throttling import AnonRateThrottle


class LoginRateThrottle(AnonRateThrottle):
    """Rate limit for login attempts."""
    scope = "login"


class RegisterRateThrottle(AnonRateThrottle):
    """Rate limit for registration attempts."""
    scope = "register"
