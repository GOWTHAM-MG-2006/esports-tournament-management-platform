import pytest
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from tournaments.models import Tournament, Registration
from teams.models import Team, TeamMember

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

    def test_create_tournament_player_forbidden(self):
        player = User.objects.create_user(
            email='player@t.com', username='player', password='pass1234', role='player'
        )
        self.client.force_authenticate(user=player)
        response = self.client.post(self.url, {'name': 'Sneaky Cup', 'game': 'LoL', 'max_teams': 8})
        assert response.status_code == 403

    def test_open_registration(self):
        t = Tournament.objects.create(name='T1', game='LoL', max_teams=8, created_by=self.org)
        response = self.client.post(f'{self.url}{t.id}/open-registration/')
        assert response.status_code == 200
        t.refresh_from_db()
        assert t.status == 'registration_open'

    def test_register_team(self):
        t = Tournament.objects.create(name='T1', game='LoL', max_teams=8, created_by=self.org, status='registration_open')
        team = Team.objects.create(name='Fnatic', tag='FNC', owner=self.org)
        TeamMember.objects.create(team=team, user=self.org, role='captain')
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
        TeamMember.objects.create(team=team1, user=self.org, role='captain')
        TeamMember.objects.create(team=team2, user=self.org, role='captain')
        first = self.client.post(f'{self.url}{t.id}/register-team/', {'team_id': team1.id})
        assert first.status_code == 201
        response = self.client.post(f'{self.url}{t.id}/register-team/', {'team_id': team2.id})
        assert response.status_code == 400

    def test_set_seeds(self):
        t = Tournament.objects.create(name='T1', game='LoL', max_teams=8, created_by=self.org, status='registration_open')
        team = Team.objects.create(name='Fnatic', tag='FNC', owner=self.org)
        TeamMember.objects.create(team=team, user=self.org, role='captain')
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

    def test_close_registration(self):
        t = Tournament.objects.create(name='T1', game='LoL', max_teams=8, created_by=self.org, status='registration_open')
        response = self.client.post(f'{self.url}{t.id}/close-registration/')
        assert response.status_code == 200
        t.refresh_from_db()
        assert t.status == 'registration_closed'

    def test_close_registration_from_draft(self):
        t = Tournament.objects.create(name='T1', game='LoL', max_teams=8, created_by=self.org)
        response = self.client.post(f'{self.url}{t.id}/close-registration/')
        assert response.status_code == 200
        t.refresh_from_db()
        assert t.status == 'registration_closed'

    def test_reopen_registration_from_closed(self):
        t = Tournament.objects.create(name='T1', game='LoL', max_teams=8, created_by=self.org, status='registration_closed')
        response = self.client.post(f'{self.url}{t.id}/open-registration/')
        assert response.status_code == 200
        t.refresh_from_db()
        assert t.status == 'registration_open'

    def test_cannot_open_registration_from_in_progress(self):
        t = Tournament.objects.create(name='T1', game='LoL', max_teams=8, created_by=self.org, status='in_progress')
        response = self.client.post(f'{self.url}{t.id}/open-registration/')
        assert response.status_code == 400

    def test_cannot_open_registration_from_completed(self):
        t = Tournament.objects.create(name='T1', game='LoL', max_teams=8, created_by=self.org, status='completed')
        response = self.client.post(f'{self.url}{t.id}/open-registration/')
        assert response.status_code == 400

    def test_cannot_close_registration_from_closed(self):
        t = Tournament.objects.create(name='T1', game='LoL', max_teams=8, created_by=self.org, status='registration_closed')
        response = self.client.post(f'{self.url}{t.id}/close-registration/')
        assert response.status_code == 400

    def test_cannot_close_registration_from_in_progress(self):
        t = Tournament.objects.create(name='T1', game='LoL', max_teams=8, created_by=self.org, status='in_progress')
        response = self.client.post(f'{self.url}{t.id}/close-registration/')
        assert response.status_code == 400

    def test_start_tournament(self):
        t = Tournament.objects.create(name='T1', game='LoL', max_teams=8, created_by=self.org, status='registration_closed')
        response = self.client.post(f'{self.url}{t.id}/start-tournament/')
        assert response.status_code == 200
        t.refresh_from_db()
        assert t.status == 'in_progress'

    def test_start_tournament_from_draft(self):
        t = Tournament.objects.create(name='T1', game='LoL', max_teams=8, created_by=self.org)
        response = self.client.post(f'{self.url}{t.id}/start-tournament/')
        assert response.status_code == 400

    def test_start_tournament_from_open(self):
        t = Tournament.objects.create(name='T1', game='LoL', max_teams=8, created_by=self.org, status='registration_open')
        response = self.client.post(f'{self.url}{t.id}/start-tournament/')
        assert response.status_code == 400

    def test_delete_tournament_organizer(self):
        t = Tournament.objects.create(name='T1', game='LoL', max_teams=8, created_by=self.org)
        response = self.client.delete(f'{self.url}{t.id}/')
        assert response.status_code == 204

    def test_player_cannot_delete_tournament(self):
        player = User.objects.create_user(
            email='p2@t.com', username='tplayer2', password='pass1234'
        )
        t = Tournament.objects.create(name='T1', game='LoL', max_teams=8, created_by=self.org)
        self.client.force_authenticate(user=player)
        response = self.client.delete(f'{self.url}{t.id}/')
        assert response.status_code == 403

    def test_cannot_delete_in_progress(self):
        t = Tournament.objects.create(name='T1', game='LoL', max_teams=8, created_by=self.org, status='in_progress')
        response = self.client.delete(f'{self.url}{t.id}/')
        assert response.status_code == 400

    def test_cannot_patch_status_directly(self):
        t = Tournament.objects.create(name='T1', game='LoL', max_teams=8, created_by=self.org)
        response = self.client.patch(f'{self.url}{t.id}/', {'status': 'completed'}, format='json')
        assert response.status_code == 400

    def test_organizer_can_patch_name(self):
        t = Tournament.objects.create(name='T1', game='LoL', max_teams=8, created_by=self.org)
        response = self.client.patch(f'{self.url}{t.id}/', {'name': 'Renamed'}, format='json')
        assert response.status_code == 200

    def test_cannot_patch_name_in_progress(self):
        t = Tournament.objects.create(name='T1', game='LoL', max_teams=8, created_by=self.org, status='in_progress')
        response = self.client.patch(f'{self.url}{t.id}/', {'name': 'Renamed'}, format='json')
        assert response.status_code == 400

    def test_cannot_patch_name_completed(self):
        t = Tournament.objects.create(name='T1', game='LoL', max_teams=8, created_by=self.org, status='completed')
        response = self.client.patch(f'{self.url}{t.id}/', {'name': 'Renamed'}, format='json')
        assert response.status_code == 400

    def test_register_team_too_small(self):
        t = Tournament.objects.create(
            name='T1', game='LoL', max_teams=8, created_by=self.org,
            status='registration_open', min_team_members=5,
        )
        team = Team.objects.create(name='Fnatic', tag='FNC', owner=self.org)
        TeamMember.objects.create(team=team, user=self.org, role='captain')
        response = self.client.post(f'{self.url}{t.id}/register-team/', {'team_id': team.id})
        assert response.status_code == 400

    def test_register_team_too_large(self):
        t = Tournament.objects.create(
            name='T1', game='LoL', max_teams=8, created_by=self.org,
            status='registration_open', max_team_members=1,
        )
        team = Team.objects.create(name='Fnatic', tag='FNC', owner=self.org)
        TeamMember.objects.create(team=team, user=self.org, role='captain')
        extra = User.objects.create_user(
            email='extra@t.com', username='extra', password='pass1234'
        )
        TeamMember.objects.create(team=team, user=extra, role='member')
        response = self.client.post(f'{self.url}{t.id}/register-team/', {'team_id': team.id})
        assert response.status_code == 400

    def test_register_team_within_size_bounds(self):
        t = Tournament.objects.create(
            name='T1', game='LoL', max_teams=8, created_by=self.org,
            status='registration_open', min_team_members=1, max_team_members=5,
        )
        team = Team.objects.create(name='Fnatic', tag='FNC', owner=self.org)
        TeamMember.objects.create(team=team, user=self.org, role='captain')
        extra = User.objects.create_user(
            email='extra@t.com', username='extra', password='pass1234'
        )
        TeamMember.objects.create(team=team, user=extra, role='member')
        response = self.client.post(f'{self.url}{t.id}/register-team/', {'team_id': team.id})
        assert response.status_code == 201

    def test_create_tournament_end_before_start(self):
        response = self.client.post(
            self.url,
            {'name': 'Bad Dates Cup', 'game': 'LoL', 'max_teams': 8,
             'start_date': '2026-09-23', 'end_date': '2026-09-21'},
            format='json',
        )
        assert response.status_code == 400

    def test_patch_end_before_start(self):
        t = Tournament.objects.create(
            name='T1', game='LoL', max_teams=8, created_by=self.org,
            status='draft', start_date='2026-09-23',
        )
        response = self.client.patch(
            f'{self.url}{t.id}/', {'end_date': '2026-09-21'}, format='json'
        )
        assert response.status_code == 400

    def test_create_tournament_min_exceeds_max(self):
        response = self.client.post(
            self.url,
            {'name': 'Bad Cup', 'game': 'LoL', 'max_teams': 8,
             'min_team_members': 6, 'max_team_members': 5},
            format='json',
        )
        assert response.status_code == 400

    def _create_all_statuses(self):
        statuses = [
            ('Draft Cup', 'draft'),
            ('Open Cup', 'registration_open'),
            ('Closed Cup', 'registration_closed'),
            ('Live Cup', 'in_progress'),
            ('Done Cup', 'completed'),
        ]
        for name, status in statuses:
            Tournament.objects.create(
                name=name, game='LoL', max_teams=8,
                created_by=self.org, status=status,
            )

    def _browse_names(self):
        response = self.client.get(f'{self.url}browse/')
        assert response.status_code == 200
        # Test client sees the rendered envelope: {data: [...] or {results: [...]}}.
        payload = response.data['data']
        if isinstance(payload, dict):
            payload = payload['results']
        return [t['name'] for t in payload]

    def test_browse_excludes_drafts(self):
        self._create_all_statuses()
        names = self._browse_names()
        assert 'Draft Cup' not in names
        assert names == ['Done Cup', 'Live Cup', 'Closed Cup', 'Open Cup']

    def test_browse_visible_to_player(self):
        self._create_all_statuses()
        player = User.objects.create_user(
            email='player@t.com', username='bplayer', password='pass1234', role='player'
        )
        self.client.force_authenticate(user=player)
        names = self._browse_names()
        assert 'Draft Cup' not in names
        assert len(names) == 4
