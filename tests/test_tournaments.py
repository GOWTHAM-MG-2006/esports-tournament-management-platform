import pytest
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from tournaments.models import Tournament
from teams.models import Team

User = get_user_model()


@pytest.mark.django_db
class TestTournamentEndpoints:
    def setup_method(self):
        self.client = APIClient()
        self.org = User.objects.create_user(
            email='org@t.com', username='org', password='pass1234', role='organizer'
        )
        self.client.force_authenticate(user=self.org)
        self.url = '/api/tournaments/'

    def test_create_tournament(self):
        response = self.client.post(self.url, {'name': 'Test Cup', 'game': 'LoL', 'max_teams': 8})
        assert response.status_code == 201

    def test_open_registration(self):
        t = Tournament.objects.create(name='T1', game='LoL', max_teams=8, created_by=self.org)
        response = self.client.post(f'{self.url}{t.id}/open-registration/')
        assert response.status_code == 200
        t.refresh_from_db()
        assert t.status == 'registration_open'

    def test_register_team(self):
        t = Tournament.objects.create(name='T1', game='LoL', max_teams=8, created_by=self.org, status='registration_open')
        team = Team.objects.create(name='Fnatic', tag='FNC', owner=self.org)
        response = self.client.post(f'{self.url}{t.id}/register-team/', {'team_id': team.id})
        assert response.status_code == 201

    def test_cannot_register_from_draft(self):
        t = Tournament.objects.create(name='T1', game='LoL', max_teams=8, created_by=self.org, status='draft')
        team = Team.objects.create(name='Fnatic', tag='FNC', owner=self.org)
        response = self.client.post(f'{self.url}{t.id}/register-team/', {'team_id': team.id})
        assert response.status_code == 400
