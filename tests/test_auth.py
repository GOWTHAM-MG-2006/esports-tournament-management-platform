import re

import pytest
from django.core import mail
from django.test import TestCase, override_settings
from django.utils import timezone
from rest_framework.test import APIClient
from users.models import EmailOTP, User


LOCMEM_EMAIL = {'EMAIL_BACKEND': 'django.core.mail.backends.locmem.EmailBackend'}


def _last_otp_code():
    """Extract the 6-digit code from the most recently sent email."""
    match = re.search(r'\b\d{6}\b', mail.outbox[-1].body)
    assert match, 'no OTP code found in sent email'
    return match.group(0)


@pytest.mark.django_db
class TestAuthEndpoints:
    def setup_method(self):
        self.client = APIClient()
        self.register_url = '/api/auth/register/'
        self.verify_url = '/api/auth/verify-otp/'
        self.resend_url = '/api/auth/resend-otp/'
        self.login_url = '/api/auth/login/'
        self.refresh_url = '/api/auth/refresh/'
        self.me_url = '/api/auth/me/'

    def _register(self, email='new@test.com', username='newuser'):
        data = {'email': email, 'username': username, 'password': 'Str0ng!Pass', 'password_confirm': 'Str0ng!Pass'}
        with override_settings(**LOCMEM_EMAIL):
            return self.client.post(self.register_url, data)

    def _resend(self, email):
        with override_settings(**LOCMEM_EMAIL):
            return self.client.post(self.resend_url, {'email': email})

    def test_register_success(self):
        response = self._register()
        assert response.status_code == 201
        assert response.data['success'] is True
        assert response.data['data']['email'] == 'new@test.com'
        # No tokens yet — account must be verified first.
        assert 'tokens' not in response.data['data']
        user = User.objects.get(email='new@test.com')
        assert user.is_active is False
        assert EmailOTP.objects.filter(user=user, used=False).exists()
        # OTP email was sent.
        assert len(mail.outbox) == 1
        assert mail.outbox[0].to == ['new@test.com']
        _last_otp_code()

    def test_register_duplicate_email(self):
        User.objects.create_user(email='dup@test.com', username='dup', password='Str0ng!Pass')
        data = {'email': 'dup@test.com', 'username': 'dup2', 'password': 'Str0ng!Pass', 'password_confirm': 'Str0ng!Pass'}
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

    def test_refresh_success(self):
        self._register(email='ref@test.com', username='refuser')
        verify = self.client.post(
            self.verify_url, {'email': 'ref@test.com', 'code': _last_otp_code()}
        )
        refresh = verify.data['data']['tokens']['refresh']
        response = self.client.post(self.refresh_url, {'refresh': refresh})
        assert response.status_code == 200
        assert 'access' in response.data['data']

    def test_verify_success_activates_and_returns_tokens(self):
        self._register()
        response = self.client.post(
            self.verify_url, {'email': 'new@test.com', 'code': _last_otp_code()}
        )
        assert response.status_code == 200
        assert 'tokens' in response.data['data']
        user = User.objects.get(email='new@test.com')
        assert user.is_active is True

    def test_login_blocked_until_verified(self):
        self._register()
        response = self.client.post(
            self.login_url, {'email': 'new@test.com', 'password': 'Str0ng!Pass'}
        )
        assert response.status_code == 403
        assert response.data['data']['code'] == 'email_unverified'

    def test_login_success_after_verification(self):
        self._register()
        self.client.post(
            self.verify_url, {'email': 'new@test.com', 'code': _last_otp_code()}
        )
        response = self.client.post(
            self.login_url, {'email': 'new@test.com', 'password': 'Str0ng!Pass'}
        )
        assert response.status_code == 200
        assert 'tokens' in response.data['data']

    def test_verify_wrong_code(self):
        self._register()
        response = self.client.post(
            self.verify_url, {'email': 'new@test.com', 'code': '000000'}
        )
        assert response.status_code == 400
        assert User.objects.get(email='new@test.com').is_active is False

    def test_verify_expired_code(self):
        self._register()
        user = User.objects.get(email='new@test.com')
        otp = user.email_otps.get(used=False)
        otp.expires_at = timezone.now() - timezone.timedelta(minutes=1)
        otp.save(update_fields=['expires_at'])
        response = self.client.post(
            self.verify_url, {'email': 'new@test.com', 'code': _last_otp_code()}
        )
        assert response.status_code == 400

    def test_verify_unknown_email(self):
        response = self.client.post(
            self.verify_url, {'email': 'ghost@test.com', 'code': '123456'}
        )
        assert response.status_code == 400

    def test_resend_otp_invalidates_old_code(self):
        self._register()
        old_code = _last_otp_code()
        response = self._resend('new@test.com')
        assert response.status_code == 200
        # Envelope must carry a non-null data payload (not message-only).
        assert response.data['data']['email'] == 'new@test.com'
        assert len(mail.outbox) == 2
        # Old code is dead...
        stale = self.client.post(
            self.verify_url, {'email': 'new@test.com', 'code': old_code}
        )
        assert stale.status_code == 400
        # ...new code works.
        fresh = self.client.post(
            self.verify_url, {'email': 'new@test.com', 'code': _last_otp_code()}
        )
        assert fresh.status_code == 200

    def test_resend_otp_for_verified_user(self):
        self._register()
        self.client.post(
            self.verify_url, {'email': 'new@test.com', 'code': _last_otp_code()}
        )
        response = self._resend('new@test.com')
        assert response.status_code == 400

    # --- Admin user management ---

    def _make_admin(self):
        admin = User.objects.create_user(
            email='admin@test.com', username='adminuser', password='Str0ng!Pass',
            role='admin',
        )
        self.client.force_authenticate(user=admin)
        return admin

    def test_admin_lists_users(self):
        User.objects.create_user(email='a@test.com', username='auser', password='Str0ng!Pass')
        User.objects.create_user(email='b@test.com', username='buser', password='Str0ng!Pass')
        self._make_admin()
        response = self.client.get('/api/auth/users/')
        assert response.status_code == 200
        emails = [u['email'] for u in response.data['data']]
        assert 'a@test.com' in emails and 'b@test.com' in emails

    def test_admin_search_users(self):
        User.objects.create_user(email='a@test.com', username='auser', password='Str0ng!Pass')
        User.objects.create_user(email='b@test.com', username='buser', password='Str0ng!Pass')
        self._make_admin()
        response = self.client.get('/api/auth/users/', {'search': 'a@test'})
        assert response.status_code == 200
        emails = [u['email'] for u in response.data['data']]
        assert emails == ['a@test.com']

    def test_non_admin_cannot_list_users(self):
        player = User.objects.create_user(
            email='p@test.com', username='puser', password='Str0ng!Pass', role='player'
        )
        self.client.force_authenticate(user=player)
        assert self.client.get('/api/auth/users/').status_code == 403

    def test_unauthenticated_cannot_list_users(self):
        self.client.force_authenticate(user=None)
        assert self.client.get('/api/auth/users/').status_code == 401

    def test_admin_changes_role(self):
        target = User.objects.create_user(
            email='t@test.com', username='tuser', password='Str0ng!Pass'
        )
        self._make_admin()
        response = self.client.patch(
            f'/api/auth/users/{target.id}/', {'role': 'organizer'}, format='json'
        )
        assert response.status_code == 200
        target.refresh_from_db()
        assert target.role == 'organizer'

    def test_admin_deactivates_user(self):
        target = User.objects.create_user(
            email='t@test.com', username='tuser', password='Str0ng!Pass'
        )
        self._make_admin()
        response = self.client.patch(
            f'/api/auth/users/{target.id}/', {'is_active': False}, format='json'
        )
        assert response.status_code == 200
        target.refresh_from_db()
        assert target.is_active is False

    def test_admin_rejects_invalid_role(self):
        target = User.objects.create_user(
            email='t@test.com', username='tuser', password='Str0ng!Pass'
        )
        self._make_admin()
        response = self.client.patch(
            f'/api/auth/users/{target.id}/', {'role': 'superlord'}, format='json'
        )
        assert response.status_code == 400

    def test_admin_cannot_change_self(self):
        admin = self._make_admin()
        response = self.client.patch(
            f'/api/auth/users/{admin.id}/', {'role': 'player'}, format='json'
        )
        assert response.status_code == 400
        admin.refresh_from_db()
        assert admin.role == 'admin'

    def test_admin_manage_unknown_user_404(self):
        self._make_admin()
        assert self.client.patch(
            '/api/auth/users/99999/', {'role': 'player'}, format='json'
        ).status_code == 404

    def test_admin_can_delete_user(self):
        target = User.objects.create_user(
            email='t@test.com', username='tuser', password='Str0ng!Pass'
        )
        self._make_admin()
        response = self.client.delete(f'/api/auth/users/{target.id}/')
        # 200 (not 204): the envelope renderer attaches a JSON body, which
        # browsers reject on 204 responses as a "Network Error".
        assert response.status_code == 200
        assert not User.objects.filter(id=target.id).exists()

    def test_admin_cannot_delete_self(self):
        admin = self._make_admin()
        response = self.client.delete(f'/api/auth/users/{admin.id}/')
        assert response.status_code == 400
        assert User.objects.filter(id=admin.id).exists()

    def test_non_admin_cannot_delete_user(self):
        target = User.objects.create_user(
            email='t@test.com', username='tuser', password='Str0ng!Pass'
        )
        player = User.objects.create_user(
            email='p@test.com', username='puser', password='Str0ng!Pass', role='player'
        )
        self.client.force_authenticate(user=player)
        response = self.client.delete(f'/api/auth/users/{target.id}/')
        assert response.status_code == 403
        assert User.objects.filter(id=target.id).exists()

    def test_refresh_invalid(self):
        response = self.client.post(self.refresh_url, {'refresh': 'invalid-token'})
        assert response.status_code == 401

    def test_logout_blacklists_refresh(self):
        user = User.objects.create_user(email='out@test.com', username='outuser', password='mypassword')
        login = self.client.post(self.login_url, {'email': 'out@test.com', 'password': 'mypassword'})
        refresh = login.data['data']['tokens']['refresh']
        self.client.force_authenticate(user=user)
        response = self.client.post('/api/auth/logout/', {'refresh': refresh})
        assert response.status_code == 200
        self.client.force_authenticate(user=None)
        reuse = self.client.post(self.refresh_url, {'refresh': refresh})
        assert reuse.status_code == 401

    def test_logout_requires_refresh(self):
        user = User.objects.create_user(email='out2@test.com', username='outuser2', password='mypassword')
        self.client.force_authenticate(user=user)
        response = self.client.post('/api/auth/logout/', {})
        assert response.status_code == 400

    def test_register_rejects_weak_passwords(self):
        weak_passwords = [
            'short1!',  # too short
            'alllowercase1!',  # no uppercase
            'ALLUPPERCASE1!',  # no lowercase
            'NoDigitsHere!',  # no digit
            'NoSpecial123',  # no special char
            'password',  # common password
        ]
        for i, pwd in enumerate(weak_passwords):
            data = {
                'email': f'weak{i}@test.com',
                'username': f'weakuser{i}',
                'password': pwd,
                'password_confirm': pwd,
            }
            response = self.client.post(self.register_url, data)
            assert response.status_code == 400, f'weak password accepted: {pwd}'

    def test_register_rejects_password_too_short(self):
        data = {
            'email': 'short@test.com',
            'username': 'shortuser',
            'password': 'Aa1!',
            'password_confirm': 'Aa1!',
        }
        response = self.client.post(self.register_url, data)
        assert response.status_code == 400
