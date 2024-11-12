import json
from rest_framework import generics
from django.http import JsonResponse
from django.shortcuts import redirect
from .serializers import UserSerializer
from django.contrib.auth.models import User
from django.contrib.auth import get_user_model
from django.views.decorators.csrf import csrf_exempt
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth.decorators import login_required
from rest_framework.permissions import IsAuthenticated, AllowAny
from allauth.socialaccount.models import SocialAccount, SocialToken

User = get_user_model()


class UserCreate(generics.CreateAPIView):
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = (AllowAny,)


class UserDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = (IsAuthenticated,)

    def get_object(self):
        return self.request.user


@login_required
def google_login_callback(request):
    user = request.user

    social_accounts = SocialAccount.objects.filter(user=user)
    print("Social Account for user: ", social_accounts)

    if not social_accounts.exists():
        return redirect(
            "http://localhost:5173/login/callback/?error=No%20social%20account%20found"
        )

    social_account = social_accounts.first()

    token = SocialToken.objects.filter(
        account=social_account, account__providers="google"
    ).first()

    if token:
        refresh = RefreshToken.for_user(user)
        access_token = str(refresh.access_token)
        return redirect(
            f"http://localhost:5173/login/callback/?access_token={access_token}"
        )
    else:
        return redirect(
            "http://localhost:5173/login/callback/?error=No%20token%20found"
        )


@csrf_exempt
def validate_google_token(request):
    if request.method == "POST":
        try:
            data = json.loads(request.body)
            google_access_token = data.get("access_token")
            print(google_access_token)

            if not google_access_token:
                return JsonResponse({"error": "No access token provided"}, status=400)
            return JsonResponse({"message": "Token is valid"}, status=200)
        except json.JSONDecodeError:
            return JsonResponse({"error": "Invalid JSON"}, status=400)
    return JsonResponse({"error": "Invalid request method"}, status=400)
            
