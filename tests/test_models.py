import pytest
from users.models import User
from teams.models import Team, TeamMember
from tournaments.models import Tournament, Registration
from matches.models import Match


@pytest.mark.django_db
class TestUserModel:
    def test_create_user(self):
        user = User.objects.create_user(email='test@test.com', username='testuser', password='pass123')
        assert user.email == 'test@test.com'
        assert user.check_password('pass123')
        assert user.role == 'player'

    def test_create_user_no_email_raises(self):
        with pytest.raises(ValueError):
            User.objects.create_user(email='', username='test')

    def test_create_superuser(self):
        admin = User.objects.create_superuser(email='admin@test.com', username='admin', password='admin123')
        assert admin.is_staff
        assert admin.is_superuser
        assert admin.role == 'admin'


@pytest.mark.django_db
class TestTeamModel:
    def test_create_team(self, db_user):
        team = Team.objects.create(name='Fnatic', tag='FNC', owner=db_user)
        assert team.name == 'Fnatic'
        assert team.owner == db_user

    def test_unique_team_name(self, db_user):
        Team.objects.create(name='Fnatic', tag='FNC', owner=db_user)
        with pytest.raises(Exception):
            Team.objects.create(name='Fnatic', tag='FN2', owner=db_user)


@pytest.mark.django_db
class TestTournamentModel:
    def test_create_tournament(self, db_user):
        t = Tournament.objects.create(name='Test Cup', game='LoL', max_teams=8, created_by=db_user)
        assert t.status == 'draft'
        assert t.format == 'single_elimination'
