import pytest
from django.contrib.auth import get_user_model

User = get_user_model()


@pytest.mark.django_db
def test_create_user():
    user = User.objects.create_user(
        email="test@example.com",
        name="Test User",
        password="securepassword123",
    )
    assert user.email == "test@example.com"
    assert user.name == "Test User"
    assert user.check_password("securepassword123")
    assert not user.is_staff
    assert not user.is_superuser


@pytest.mark.django_db
def test_create_superuser():
    admin = User.objects.create_superuser(
        email="admin@example.com",
        name="Admin User",
        password="adminpassword123",
    )
    assert admin.email == "admin@example.com"
    assert admin.name == "Admin User"
    assert admin.is_admin
    assert admin.is_superuser
    assert admin.is_staff
