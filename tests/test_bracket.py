import pytest

from rest_framework.test import APIClient

from users.models import User
from teams.models import Team
from tournaments.models import Registration, Tournament
from matches.models import Match
from matches.services import BracketService, _generate_seed_order, _next_power_of_2


@pytest.fixture
def setup_tournament(db):
    org = User.objects.create_user(
        email='org@b.com', username='orgb', password='pass1234', role='organizer'
    )
    tournament = Tournament.objects.create(
        name='Bracket Test', game='LoL', max_teams=8,
        created_by=org, status='registration_open',
    )
    teams = []
    for i in range(8):
        user = User.objects.create_user(
            email=f'u{i}@b.com', username=f'ub{i}', password='pass1234', role='team_manager'
        )
        team = Team.objects.create(name=f'Team{i}', tag=f'T{i}', owner=user)
        Registration.objects.create(tournament=tournament, team=team, status='approved')
        teams.append(team)
    return tournament, teams, org


class TestBracketGeneration:
    @pytest.mark.django_db
    def test_8_teams_no_byes(self, setup_tournament):
        tournament, teams, _ = setup_tournament
        matches = BracketService.generate_bracket(tournament)
        assert len(matches) == 7
        assert tournament.status == 'in_progress'
        final = matches.filter(round=3).first()
        assert final is not None
        assert final.bracket_round_label == 'FINAL'

    @pytest.mark.django_db
    def test_4_teams(self, db):
        org = User.objects.create_user(
            email='org@4.com', username='org4', password='pass1234', role='organizer'
        )
        tournament = Tournament.objects.create(
            name='Bracket 4', game='LoL', max_teams=4,
            created_by=org, status='registration_open',
        )
        for i in range(4):
            user = User.objects.create_user(
                email=f'f{i}@4.com', username=f'f4{i}', password='pass1234', role='team_manager'
            )
            team = Team.objects.create(name=f'FTeam{i}', tag=f'FT{i}', owner=user)
            Registration.objects.create(tournament=tournament, team=team, status='approved')
        matches = BracketService.generate_bracket(tournament)
        assert len(matches) == 3

    @pytest.mark.django_db
    def test_5_teams_byes(self, db):
        org = User.objects.create_user(
            email='org@5.com', username='org5', password='pass1234', role='organizer'
        )
        tournament = Tournament.objects.create(
            name='Bracket 5', game='LoL', max_teams=8,
            created_by=org, status='registration_open',
        )
        for i in range(5):
            user = User.objects.create_user(
                email=f'g{i}@5.com', username=f'g5{i}', password='pass1234', role='team_manager'
            )
            team = Team.objects.create(name=f'GTeam{i}', tag=f'GT{i}', owner=user)
            Registration.objects.create(tournament=tournament, team=team, status='approved')
        matches = BracketService.generate_bracket(tournament)
        assert matches.filter(is_bye=True).count() == 3
        for m in matches.filter(round=2, bracket_round_label='SEMIFINAL'):
            assert m.team1 is not None or m.team2 is not None

    @pytest.mark.django_db
    def test_submit_result(self, setup_tournament):
        tournament, teams, _ = setup_tournament
        BracketService.generate_bracket(tournament)
        match = Match.objects.filter(
            tournament=tournament, round=1, status='scheduled'
        ).exclude(team1__isnull=True).exclude(team2__isnull=True).first()
        result = BracketService.submit_result(
            tournament, match.id, match.team1.id, '2', '1'
        )
        assert result.status == 'completed'
        assert result.winner == match.team1

    @pytest.mark.django_db
    def test_submit_result_winner_not_participant(self, setup_tournament):
        tournament, teams, _ = setup_tournament
        BracketService.generate_bracket(tournament)
        match = Match.objects.filter(tournament=tournament, round=1, status='scheduled').first()
        other_team = Team.objects.create(name='Other', tag='OTH', owner=teams[0].owner)
        with pytest.raises(ValueError, match='Winner must be one of the match participants'):
            BracketService.submit_result(tournament, match.id, other_team.id)

    @pytest.mark.django_db
    def test_submit_result_already_completed(self, setup_tournament):
        tournament, teams, _ = setup_tournament
        BracketService.generate_bracket(tournament)
        match = Match.objects.filter(
            tournament=tournament, round=1, status='scheduled'
        ).exclude(team1__isnull=True).exclude(team2__isnull=True).first()
        BracketService.submit_result(tournament, match.id, match.team1.id)
        with pytest.raises(ValueError, match='Match already completed'):
            BracketService.submit_result(tournament, match.id, match.team1.id)

    @pytest.mark.django_db
    def test_generate_bracket_wrong_status(self, db):
        org = User.objects.create_user(
            email='org@d.com', username='orgd', password='pass1234', role='organizer'
        )
        tournament = Tournament.objects.create(
            name='Draft', game='LoL', max_teams=4, created_by=org, status='draft'
        )
        with pytest.raises(ValueError, match='Bracket can only be generated'):
            BracketService.generate_bracket(tournament)
