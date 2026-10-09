import pytest
from rest_framework.test import APIClient
from users.models import AuditLog, User


@pytest.mark.django_db
class TestAuditLog:
    def test_role_change_is_logged(self):
        admin = User.objects.create_user(email='a@t.com', username='a', password='Str0ng!Pass', role='admin')
        target = User.objects.create_user(email='t@t.com', username='t', password='Str0ng!Pass')
        c = APIClient()
        c.force_authenticate(user=admin)
        assert c.patch(f'/api/auth/users/{target.id}/', {'role': 'organizer'}, format='json').status_code == 200
        assert AuditLog.objects.filter(actor=admin, action='user.role_change', object_id=str(target.id)).exists()
