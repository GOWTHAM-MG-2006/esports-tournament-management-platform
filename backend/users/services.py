from rest_framework_simplejwt.tokens import RefreshToken
from users.models import User


class AuthService:
    @staticmethod
    def register(email, username, password):
        user = User.objects.create_user(email=email, username=username, password=password)
        refresh = RefreshToken.for_user(user)
        return {
            'user': {'id': user.id, 'email': user.email, 'username': user.username, 'role': user.role},
            'tokens': {
                'access': str(refresh.access_token),
                'refresh': str(refresh),
            }
        }

    @staticmethod
    def login(email, password):
        from django.contrib.auth import authenticate
        user = authenticate(email=email, password=password)
        if not user:
            return None
        refresh = RefreshToken.for_user(user)
        return {
            'user': {'id': user.id, 'email': user.email, 'username': user.username, 'role': user.role},
            'tokens': {
                'access': str(refresh.access_token),
                'refresh': str(refresh),
            }
        }

    @staticmethod
    def get_user_data(user):
        return {'id': user.id, 'email': user.email, 'username': user.username, 'role': user.role}
