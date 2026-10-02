import pytest
from django.contrib.auth import get_user_model
from matches.models import Match
from rest_framework.test import APIClient
from teams.models import Team
from tournaments.models import Registration, Tournament

User = get_user_model()


@pytest.mark.django_db
class TestPredictions:
    def setup_method(self):
        self.client = APIClient()
        self.org = User.objects.create_user(
            email='org@p.com', username='orgp', password='pass1234', role='organizer'
        )
        self.client.force_authenticate(user=self.org)
        self._pos = 0

    def _make_team(self, name, tag):
        return Team.objects.create(name=name, tag=tag, owner=self.org)

    def _record_win(self, history, winner, loser):
        """Record one completed match won by `winner` over `loser`."""
        self._pos += 1
        return Match.objects.create(
            tournament=history,
            round=1,
            position=self._pos,
            team1=winner,
            team2=loser,
            winner=winner,
            status='completed',
        )

    def _make_history(self):
        return Tournament.objects.create(
            name='History Cup', game='LoL', max_teams=32,
            created_by=self.org, status='completed',
        )

    def test_predict_returns_winner_and_confidence(self):
        team_a = self._make_team('Alpha', 'ALP')
        team_b = self._make_team('Beta', 'BET')
        history = self._make_history()
        dummy = self._make_team('Dummy', 'DMY')
        for _ in range(3):
            self._record_win(history, team_a, dummy)

        upcoming = Tournament.objects.create(
            name='Upcoming Cup', game='LoL', max_teams=8,
            created_by=self.org, status='in_progress',
        )
        match = Match.objects.create(
            tournament=upcoming, round=1, position=1,
            team1=team_a, team2=team_b, status='scheduled',
        )

        r = self.client.get(f'/api/predictions/match/{match.id}/')

        assert r.status_code == 200
        assert r.data['data']['predicted_winner_id'] == team_a.id
        assert 0.5 < r.data['data']['confidence'] <= 1.0

    def test_smart_seed_orders_by_win_rate(self):
        t = Tournament.objects.create(
            name='Seed Cup', game='LoL', max_teams=8,
            created_by=self.org, status='registration_open',
        )
        history = self._make_history()
        dummy = self._make_team('DummyS', 'DMS')
        teams = [self._make_team(f'SeedTeam{i}', f'ST{i}') for i in range(4)]
        wins = [3, 2, 1, 0]
        for team, n in zip(teams, wins):
            Registration.objects.create(
                tournament=t, team=team, status='approved'
            )
            for _ in range(n):
                self._record_win(history, team, dummy)

        r = self.client.post(f'/api/tournaments/{t.id}/smart-seed/')

        assert r.status_code == 200
        seeds = {row['team']: row['seed'] for row in r.data['data']}
        assert seeds[teams[0].id] == 1
        assert sorted(seeds.values()) == [1, 2, 3, 4]
