# models.py

from django.db import models
from django.contrib.auth.models import BaseUserManager, AbstractBaseUser

AUTH_PROVIDERS = {
    "email": "email",
    "google": "google",
    "facebook": "facebook",
    "twitter": "twitter",
}


class UserManager(BaseUserManager):
    def create_user(self, email, name, password=None, **extra_fields):
        """
        Creates and saves a User with the given email and name.
        """
        if not email:
            raise ValueError("The Email field is required.")
        if not name:
            raise ValueError("The Name field is required.")

        email = self.normalize_email(email)
        user = self.model(email=email, name=name, **extra_fields)

        if password:
            user.set_password(password)
        else:
            user.set_unusable_password()  # For OAuth users without passwords

        user.save(using=self._db)
        return user

    def create_superuser(self, email, name, password=None, **extra_fields):
        """
        Creates and saves a superuser with the given email and name.
        """
        extra_fields.setdefault("is_admin", True)
        extra_fields.setdefault("is_superuser", True)
        extra_fields.setdefault("is_staff", True)
        extra_fields.setdefault("is_email_verify", True)
        extra_fields.setdefault("auth_provider", AUTH_PROVIDERS.get("email"))

        if password is None:
            raise ValueError("Superusers must have a password.")

        return self.create_user(email, name, password, **extra_fields)


class User(AbstractBaseUser):
    email = models.EmailField(
        verbose_name="Email Address",
        max_length=255,
        unique=True,
    )
    name = models.CharField(max_length=200)
    avatar = models.ImageField(
        verbose_name="Avatar",
        default="profile_icon.png",
        null=True,
        blank=True,
    )
    tc = models.BooleanField(default=False)  # Terms and conditions
    is_active = models.BooleanField(default=True)
    is_email_verify = models.BooleanField(default=False)
    is_admin = models.BooleanField(default=False)
    is_superuser = models.BooleanField(default=False)
    is_staff = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    is_online = models.BooleanField(default=False)
    auth_provider = models.CharField(
        max_length=50,
        choices=[(key, key.capitalize()) for key in AUTH_PROVIDERS.keys()],
        default=AUTH_PROVIDERS.get("email"),
    )

    objects = UserManager()

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = ["name"]

    def __str__(self):
        return f"{self.email} ({self.name})"

    def has_perm(self, perm, obj=None):
        """Does the user have a specific permission?"""
        return self.is_admin or self.is_superuser

    def has_module_perms(self, app_label):
        """Does the user have permissions to view the app `app_label`?"""
        return True
