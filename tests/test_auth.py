import pytest
from django.test import TestCase
from rest_framework.test import APIClient
from users.models import User


@pytest.mark.django_db
class TestAuthEndpoints:
    def setup_method(self):
        self.client = APIClient()
        self.register_url = '/api/auth/register/'
        self.login_url = '/api/auth/login/'
        self.refresh_url = '/api/auth/refresh/'
        self.me_url = '/api/auth/me/'

    def test_register_success(self):
        data = {'email': 'new@test.com', 'username': 'newuser', 'password': 'securepass1', 'password_confirm': 'securepass1'}
        response = self.client.post(self.register_url, data)
        assert response.status_code == 201
        assert response.data['success'] is True
        assert 'tokens' in response.data['data']
        assert User.objects.filter(email='new@test.com').exists()

    def test_register_duplicate_email(self):
        User.objects.create_user(email='dup@test.com', username='dup', password='pass1234')
        data = {'email': 'dup@test.com', 'username': 'dup2', 'password': 'pass1234', 'password_confirm': 'pass1234'}
        response = self.client.post(self.register_url, data)
        assert response.status_code == 400

    def test_login_success(self):
        User.objects.create_user(email='login@test.com', username='loginuser', password='mypassword')
        response = self.client.post(self.login_url, {'email': 'login@test.com', 'password': 'mypassword'})
        assert response.status_code == 200
        assert 'tokens' in response.data['data']

    def test_login_bad_credentials(self):
        response = self.client.post(self.login_url, {'email': 'x@x.com', 'password': 'wrong'})
        assert response.status_code == 401

    def test_me_authenticated(self):
        user = User.objects.create_user(email='me@test.com', username='meuser', password='mypassword')
        self.client.force_authenticate(user=user)
        response = self.client.get(self.me_url)
        assert response.status_code == 200
        assert response.data['data']['email'] == 'me@test.com'

    def test_me_unauthenticated(self):
        response = self.client.get(self.me_url)
        assert response.status_code == 401
