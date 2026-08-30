import pytest
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from tournaments.models import Tournament, Registration
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

    def test_register_team_duplicate(self):
        t = Tournament.objects.create(name='T1', game='LoL', max_teams=8, created_by=self.org, status='registration_open')
        team = Team.objects.create(name='Fnatic', tag='FNC', owner=self.org)
        self.client.post(f'{self.url}{t.id}/register-team/', {'team_id': team.id})
        response = self.client.post(f'{self.url}{t.id}/register-team/', {'team_id': team.id})
        assert response.status_code == 400

    def test_register_team_capacity(self):
        t = Tournament.objects.create(name='T1', game='LoL', max_teams=1, created_by=self.org, status='registration_open')
        team1 = Team.objects.create(name='Fnatic', tag='FNC', owner=self.org)
        team2 = Team.objects.create(name='G2', tag='G2', owner=self.org)
        first = self.client.post(f'{self.url}{t.id}/register-team/', {'team_id': team1.id})
        assert first.status_code == 201
        response = self.client.post(f'{self.url}{t.id}/register-team/', {'team_id': team2.id})
        assert response.status_code == 400

    def test_set_seeds(self):
        t = Tournament.objects.create(name='T1', game='LoL', max_teams=8, created_by=self.org, status='registration_open')
        team = Team.objects.create(name='Fnatic', tag='FNC', owner=self.org)
        self.client.post(f'{self.url}{t.id}/register-team/', {'team_id': team.id})
        reg = Registration.objects.get(tournament=t, team=team)
        response = self.client.post(f'{self.url}{t.id}/seed/', {'seeds': {str(reg.id): 1}}, format='json')
        assert response.status_code == 200
        reg.refresh_from_db()
        assert reg.seed == 1

    def test_player_cannot_open_registration(self):
        player = User.objects.create_user(
            email='player@t.com', username='tplayer', password='pass1234'
        )
        t = Tournament.objects.create(name='T1', game='LoL', max_teams=8, created_by=self.org)
        self.client.force_authenticate(user=player)
        response = self.client.post(f'{self.url}{t.id}/open-registration/')
        assert response.status_code == 403
