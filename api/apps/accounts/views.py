from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework import generics, status
import requests as NormalRequests
from django.core.files.base import ContentFile
from rest_framework.response import Response
from rest_framework.filters import SearchFilter
from rest_framework.views import APIView
from .serializers import (
    UserRegistrationSerializer,
    UserLoginSerializer,
    UserSerializer,
    UserProfileSerializer,
    UserChangePasswordSerializer,
    SendPasswordResetEmailSerializer,
    UserPasswordResetSerializer,
)
from .models import User, AUTH_PROVIDERS
from django.contrib.auth import authenticate
from .renderers import UserRenderer
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework.permissions import IsAuthenticated, AllowAny
from google.oauth2 import id_token
from google.auth.transport import requests
from config.settings import GOOGLE_OAUTH_CLIENT_ID

# Create your views here.


class GoogleLoginView(APIView):
    renderer_classes = [UserRenderer]
    permission_classes = [AllowAny]

    def post(self, request):
        token = request.data.get("token")
        if not token:
            return Response(
                {"error": "No token provided."}, status=status.HTTP_400_BAD_REQUEST
            )

        try:
            idinfo = id_token.verify_oauth2_token(
                token, requests.Request(), GOOGLE_OAUTH_CLIENT_ID
            )

            email = idinfo["email"]
            name = idinfo.get("name", "")
            first_name = idinfo.get("given_name", "")
            last_name = idinfo.get("family_name", "")
            picture = idinfo.get("picture", "")

            user, created = User.objects.get_or_create(
                email=email,
                defaults={
                    "name": name or f"{first_name} {last_name}",
                    "is_email_verify": True,
                    "auth_provider": AUTH_PROVIDERS.get("google"),
                    "tc": True,  # Assuming terms are accepted via OAuth
                },
            )

            # Update user data if necessary
            if created or not user.avatar:
                # Download the image
                response = NormalRequests.get(picture)
                if response.status_code == 200:
                    image_content = ContentFile(response.content)
                    user.avatar.save(f"{user.id}_avatar.jpg", image_content)

            # Update user data if necessary
            if not user.name:
                user.name = name or f"{first_name} {last_name}"
                user.save()

            # Generate JWT tokens
            token = get_tokens_for_user(user)
            return Response(
                {"token": token, "msg": "Login successful"},
                status=status.HTTP_200_OK,
            )

        except ValueError:
            # Invalid token
            return Response(
                {"error": "Invalid token."}, status=status.HTTP_400_BAD_REQUEST
            )


def get_tokens_for_user(user):
    refresh = RefreshToken.for_user(user)
    return {
        "refresh": str(refresh),
        "access": str(refresh.access_token),
    }


class UserRegistrationView(generics.CreateAPIView):
    queryset = User.objects.all()
    serializer_class = UserRegistrationSerializer
    renderer_classes = [UserRenderer]
    permission_classes = [AllowAny]

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        if serializer.is_valid():
            user = serializer.save()
            token = get_tokens_for_user(user)
            headers = self.get_success_headers(serializer.data)
            return Response(
                {"token": token, "msg": "Registration successful"},
                status=status.HTTP_201_CREATED,
                headers=headers,
            )
        else:
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class UserLoginView(APIView):
    renderer_classes = [UserRenderer]
    permission_classes = [AllowAny]

    def post(self, request, format=None):
        serializer = UserLoginSerializer(data=request.data)
        if serializer.is_valid():
            email = serializer.validated_data.get("email")
            password = serializer.validated_data.get("password")
            user = authenticate(email=email, password=password)
            if user:
                token = get_tokens_for_user(user)
                return Response(
                    {"token": token, "msg": "Login successful"},
                    status=status.HTTP_200_OK,
                )
            else:
                # Check if user exists and suggest using OAuth provider
                if User.objects.filter(email=email).exists():
                    existing_user = User.objects.get(email=email)
                    if existing_user.auth_provider != AUTH_PROVIDERS.get("email"):
                        return Response(
                            {
                                "errors": {
                                    "non_field_errors": [
                                        f"Please continue your login using {existing_user.auth_provider.capitalize()}"
                                    ]
                                }
                            },
                            status=status.HTTP_400_BAD_REQUEST,
                        )
                return Response(
                    {"errors": {"non_field_errors": ["Invalid email or password."]}},
                    status=status.HTTP_400_BAD_REQUEST,
                )
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class UserListView(generics.ListAPIView):
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [SearchFilter]
    search_fields = ["name", "email"]


class UserProfileView(generics.RetrieveAPIView):
    serializer_class = UserProfileSerializer
    renderer_classes = [UserRenderer]
    permission_classes = [IsAuthenticated]

    def get_object(self):
        return self.request.user


class UserChangePasswordView(generics.UpdateAPIView):
    serializer_class = UserChangePasswordSerializer
    renderer_classes = [UserRenderer]
    permission_classes = [IsAuthenticated]

    def get_object(self):
        return self.request.user


class SendPasswordResetEmailView(APIView):
    renderer_classes = [UserRenderer]
    permission_classes = [AllowAny]

    def post(self, request, format=None):
        serializer = SendPasswordResetEmailSerializer(data=request.data)
        if serializer.is_valid():
            return Response(
                {"msg": "Password reset link sent successfully"},
                status=status.HTTP_200_OK,
            )
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class UserPasswordResetView(APIView):
    renderer_classes = [UserRenderer]
    permission_classes = [AllowAny]

    def post(self, request, uid, token, format=None):
        serializer = UserPasswordResetSerializer(
            data=request.data, context={"uid": uid, "token": token}
        )
        if serializer.is_valid():
            serializer.save()
            return Response(
                {"msg": "Password reset successfully"}, status=status.HTTP_200_OK
            )
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
