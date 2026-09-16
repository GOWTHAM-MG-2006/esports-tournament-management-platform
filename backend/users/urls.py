from django.urls import path

from users.views import (
    LoginView,
    LogoutView,
    MeView,
    RefreshView,
    RegisterView,
    ResendOTPView,
    UserListView,
    UserManageView,
    VerifyOTPView,
)

app_name = 'users'

urlpatterns = [
    path('register/', RegisterView.as_view(), name='register'),
    path('verify-otp/', VerifyOTPView.as_view(), name='verify-otp'),
    path('resend-otp/', ResendOTPView.as_view(), name='resend-otp'),
    path('users/', UserListView.as_view(), name='user-list'),
    path('users/<int:pk>/', UserManageView.as_view(), name='user-manage'),
    path('login/', LoginView.as_view(), name='login'),
    path('refresh/', RefreshView.as_view(), name='refresh'),
    path('me/', MeView.as_view(), name='me'),
    path('logout/', LogoutView.as_view(), name='logout'),
]
