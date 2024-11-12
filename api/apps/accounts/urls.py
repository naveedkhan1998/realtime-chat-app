from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import (
    TokenVerifyView,
    TokenObtainPairView,
    TokenRefreshView,
)

from apps.accounts.views import (
    UserCreate,
    UserDetailView,
    google_login_callback,
    validate_google_token,
)

router = DefaultRouter()


urlpatterns = [
    path("", include(router.urls)),
    path("user/register/", UserCreate.as_view(), name="user_create"),
    path("user/detail/", UserDetailView.as_view(), name="user_detail"),
    path(
        "token/",
        TokenObtainPairView.as_view(),
        name="token-obtain-pair",
    ),
    path("token/verify/", TokenVerifyView.as_view(), name="token-verify"),
    path("token/refresh/", TokenRefreshView.as_view(), name="token-refresh"),
    path("google/callback/", google_login_callback, name="google-login-callback"),
    path("google/validate-token/", validate_google_token, name="google-validate-token"),
]
