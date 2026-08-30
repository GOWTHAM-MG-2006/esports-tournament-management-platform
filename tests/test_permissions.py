import pytest
from rest_framework.test import APIClient

from tournaments.models import Tournament
from users.models import User


@pytest.mark.django_db
class TestRBAC:
    def setup_method(self):
        self.client = APIClient()
        self.player = User.objects.create_user(
            email='p@p.com', username='player', password='pass1234'
        )
        self.org = User.objects.create_user(
            email='o@o.com', username='org2', password='pass1234', role='organizer'
        )

    def test_player_cannot_open_registration(self):
        t = Tournament.objects.create(name='T', game='LoL', max_teams=8, created_by=self.org)
        self.client.force_authenticate(user=self.player)
        response = self.client.post(f'/api/tournaments/{t.id}/open-registration/')
        assert response.status_code == 403

    def test_player_cannot_close_registration(self):
        t = Tournament.objects.create(
            name='T', game='LoL', max_teams=8, created_by=self.org, status='registration_open'
        )
        self.client.force_authenticate(user=self.player)
        response = self.client.post(f'/api/tournaments/{t.id}/close-registration/')
        assert response.status_code == 403

    def test_player_cannot_generate_bracket(self):
        self.client.force_authenticate(user=self.player)
        response = self.client.post('/api/matches/generate-bracket/999/')
        assert response.status_code == 403

    def test_player_cannot_seed(self):
        t = Tournament.objects.create(
            name='T', game='LoL', max_teams=8, created_by=self.org, status='registration_open'
        )
        self.client.force_authenticate(user=self.player)
        response = self.client.post(f'/api/tournaments/{t.id}/seed/', {'seeds': {}}, format='json')
        assert response.status_code == 403

    def test_organizer_can_open_registration(self):
        t = Tournament.objects.create(name='T', game='LoL', max_teams=8, created_by=self.org)
        self.client.force_authenticate(user=self.org)
        response = self.client.post(f'/api/tournaments/{t.id}/open-registration/')
        assert response.status_code == 200

    def test_unauthenticated_teams_denied(self):
        response = self.client.get('/api/teams/')
        assert response.status_code == 401
