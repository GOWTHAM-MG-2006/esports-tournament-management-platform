import pytest
from rest_framework.test import APIClient


@pytest.mark.django_db
class TestHealth:
    def test_health_ok(self):
        response = APIClient().get('/api/health/')
        assert response.status_code == 200
        assert response.data['data']['status'] == 'ok'
