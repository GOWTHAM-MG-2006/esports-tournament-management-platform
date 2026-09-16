from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from django.db.models import Q
from users.permissions import IsAdmin
from users.serializers import (
    UserAdminSerializer,
    UserLoginSerializer,
    UserRegisterSerializer,
)
from users.services import AuthService


class RegisterView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = UserRegisterSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        # Bug A fix: pop password_confirm before passing to AuthService
        data = serializer.validated_data.copy()
        data.pop('password_confirm', None)
        result = AuthService.register(**data)
        return Response(result, status=status.HTTP_201_CREATED)


class LoginView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = UserLoginSerializer(data=request.data)
        serializer.is_valid()
        result = AuthService.login(
            email=serializer.validated_data.get('email', request.data.get('email')),
            password=serializer.validated_data.get('password', request.data.get('password'))
        )
        if not result:
            return Response({'message': 'Invalid credentials'}, status=status.HTTP_401_UNAUTHORIZED)
        if result.get('unverified'):
            return Response(
                {
                    'message': 'Please verify your email with the code we sent before logging in.',
                    'code': 'email_unverified',
                    'email': result['email'],
                },
                status=status.HTTP_403_FORBIDDEN,
            )
        return Response(result)


class VerifyOTPView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        email = (request.data.get('email') or '').strip()
        code = (request.data.get('code') or '').strip()
        if not email or not code:
            return Response(
                {'message': 'Email and code are required'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        try:
            result = AuthService.verify_otp(email, code)
        except ValueError as exc:
            return Response({'message': str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        return Response(result, status=status.HTTP_200_OK)


class ResendOTPView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        email = (request.data.get('email') or '').strip()
        if not email:
            return Response(
                {'message': 'Email is required'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        try:
            result = AuthService.resend_otp(email)
        except ValueError as exc:
            return Response({'message': str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        return Response(result, status=status.HTTP_200_OK)


class RefreshView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        refresh_token = request.data.get('refresh')
        if not refresh_token:
            return Response({'message': 'Refresh token required'}, status=status.HTTP_400_BAD_REQUEST)
        from rest_framework_simplejwt.tokens import RefreshToken
        try:
            token = RefreshToken(refresh_token)
            return Response({
                'access': str(token.access_token),
                'refresh': str(token),
            })
        except Exception:
            return Response({'message': 'Invalid refresh token'}, status=status.HTTP_401_UNAUTHORIZED)


class MeView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response(AuthService.get_user_data(request.user))


class UserListView(APIView):
    """Admin: list all users, optionally filtered by ?search= (email/username)."""

    permission_classes = [IsAdmin]

    def get(self, request):
        from users.models import User
        search = (request.query_params.get('search') or '').strip()
        users = User.objects.all().order_by('-date_joined')
        if search:
            users = users.filter(
                Q(email__icontains=search) | Q(username__icontains=search)
            )
        return Response(UserAdminSerializer(users, many=True).data)


class UserManageView(APIView):
    """Admin: change a user's role or active flag (PATCH), or delete (DELETE)."""

    permission_classes = [IsAdmin]

    def patch(self, request, pk):
        from users.models import User
        try:
            target = User.objects.get(pk=pk)
        except User.DoesNotExist:
            return Response(
                {'message': 'User not found'},
                status=status.HTTP_404_NOT_FOUND,
            )
        if target.id == request.user.id:
            return Response(
                {'message': 'You cannot change your own role or status.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        serializer = UserAdminSerializer(target, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)

    def delete(self, request, pk):
        from users.models import User
        try:
            target = User.objects.get(pk=pk)
        except User.DoesNotExist:
            return Response(
                {'message': 'User not found'},
                status=status.HTTP_404_NOT_FOUND,
            )
        if target.id == request.user.id:
            return Response(
                {'message': 'You cannot delete your own account.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        email = target.email
        target.delete()
        # 200 (not 204): the envelope renderer attaches a JSON body, and
        # browsers reject body-bearing 204 responses as a "Network Error".
        return Response({'message': f'User {email} deleted.'})


class LogoutView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        refresh_token = request.data.get('refresh')
        if not refresh_token:
            return Response({'message': 'Refresh token required'}, status=status.HTTP_400_BAD_REQUEST)
        from rest_framework_simplejwt.tokens import RefreshToken
        try:
            RefreshToken(refresh_token).blacklist()
        except Exception:
            return Response({'message': 'Invalid refresh token'}, status=status.HTTP_401_UNAUTHORIZED)
        return Response({'message': 'Logged out'}, status=status.HTTP_200_OK)
