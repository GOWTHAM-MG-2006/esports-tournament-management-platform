import pytest
from rest_framework.exceptions import ValidationError

from users.models import User
from users.serializers import UserPublicSerializer, UserRegisterSerializer


@pytest.mark.django_db
class TestEnvelopeShape:
    def test_register_serializer_valid(self):
        data = {
            'email': 'a@b.com',
            'username': 'u1',
            'password': 'pass1234',
            'password_confirm': 'pass1234',
        }
        s = UserRegisterSerializer(data=data)
        assert s.is_valid(), s.errors
        user = s.save()
        assert user.email == 'a@b.com'
        assert user.username == 'u1'
        assert user.check_password('pass1234')

    def test_register_serializer_mismatched_passwords(self):
        data = {
            'email': 'a@b.com',
            'username': 'u1',
            'password': 'pass1234',
            'password_confirm': 'different',
        }
        s = UserRegisterSerializer(data=data)
        assert not s.is_valid()
        assert 'password_confirm' in s.errors
        assert 'Passwords do not match' in str(s.errors['password_confirm'])

    def test_public_serializer_fields(self):
        user = User.objects.create_user(
            email='x@y.com', username='xuser', password='pass1234',
        )
        s = UserPublicSerializer(user)
        assert set(s.data.keys()) == {'id', 'email', 'username', 'role', 'date_joined'}
