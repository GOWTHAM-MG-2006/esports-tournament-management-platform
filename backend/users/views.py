from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.permissions import AllowAny, IsAuthenticated
from users.services import AuthService
from users.serializers import UserRegisterSerializer, UserLoginSerializer


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
        return Response(result)


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
