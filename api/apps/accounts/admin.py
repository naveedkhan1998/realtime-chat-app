# admin.py

from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from django import forms
from django.utils.html import format_html
from django.contrib.auth.forms import ReadOnlyPasswordHashField
from .models import User, AUTH_PROVIDERS


class UserCreationForm(forms.ModelForm):
    """
    A form for creating new users. Includes all the required
    fields, plus a repeated password.
    """

    password1 = forms.CharField(
        label="Password", widget=forms.PasswordInput, required=False
    )
    password2 = forms.CharField(
        label="Password confirmation", widget=forms.PasswordInput, required=False
    )

    class Meta:
        model = User
        fields = ("email", "name", "auth_provider", "tc")

    def clean_password2(self):
        password1 = self.cleaned_data.get("password1")
        password2 = self.cleaned_data.get("password2")
        auth_provider = self.cleaned_data.get("auth_provider")
        if auth_provider == AUTH_PROVIDERS.get("email"):
            if not password1 or not password2:
                raise forms.ValidationError(
                    "Password is required for email authentication."
                )
            if password1 != password2:
                raise forms.ValidationError("Passwords don't match.")
        else:
            # Set unusable password for OAuth users
            self.instance.set_unusable_password()
        return password2

    def save(self, commit=True):
        user = super().save(commit=False)
        password = self.cleaned_data.get("password1")
        auth_provider = self.cleaned_data.get("auth_provider")
        if auth_provider == AUTH_PROVIDERS.get("email") and password:
            user.set_password(password)
        else:
            user.set_unusable_password()
        if commit:
            user.save()
        return user


class UserChangeForm(forms.ModelForm):
    """
    A form for updating users. Includes all the fields on
    the user but replaces the password field with admin's
    password hash display field.
    """

    password = ReadOnlyPasswordHashField(
        label=("Password"),
        help_text=(
            "Raw passwords are not stored, so there is no way to see this user's password, "
            'but you can change the password using <a href="../password/">this form</a>.'
        ),
    )

    class Meta:
        model = User
        fields = (
            "email",
            "password",
            "name",
            "avatar",
            "auth_provider",
            "is_email_verify",
            "is_active",
            "is_admin",
            "is_staff",
            "is_superuser",
            "tc",
        )

    def clean_password(self):
        return self.initial["password"]


class UserModelAdmin(BaseUserAdmin):
    # The forms to add and change user instances
    form = UserChangeForm
    add_form = UserCreationForm

    # The fields to be used in displaying the User model.
    list_display = (
        "email",
        "name",
        "auth_provider",
        "is_email_verify",
        "is_active",
        "is_admin",
        "avatar_tag",
    )
    list_filter = ("is_admin", "auth_provider", "is_email_verify", "is_active")
    ordering = ("email",)
    search_fields = ("email", "name", "auth_provider")

    fieldsets = (
        (None, {"fields": ("email", "password")}),
        ("Personal info", {"fields": ("name", "avatar", "tc", "auth_provider")}),
        (
            "Permissions",
            {
                "fields": (
                    "is_active",
                    "is_email_verify",
                    "is_admin",
                    "is_staff",
                    "is_superuser",
                )
            },
        ),
        ("Important dates", {"fields": ("last_login", "created_at", "updated_at")}),
    )

    add_fieldsets = (
        (
            None,
            {
                "classes": ("wide",),
                "fields": (
                    "email",
                    "name",
                    "auth_provider",
                    "password1",
                    "password2",
                    "tc",
                    "is_active",
                    "is_email_verify",
                    "is_admin",
                    "is_staff",
                    "is_superuser",
                ),
            },
        ),
    )

    readonly_fields = ("last_login", "created_at", "updated_at")

    filter_horizontal = ()

    def avatar_tag(self, obj):
        if obj.avatar:
            return format_html(
                '<img src="{}" style="width: 45px; height:45px; border-radius:50%;" />',
                obj.avatar.url,
            )
        return "-"

    avatar_tag.short_description = "Avatar"


admin.site.register(User, UserModelAdmin)
