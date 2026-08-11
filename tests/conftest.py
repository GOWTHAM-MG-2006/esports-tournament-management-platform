import pytest
from users.models import User
from teams.models import Team


@pytest.fixture
def db_user(db):
    return User.objects.create_user(email='player@test.com', username='player1', password='pass123')


@pytest.fixture
def db_organizer(db):
    return User.objects.create_user(email='org@test.com', username='organizer1', password='pass123', role='organizer')


@pytest.fixture
def db_team(db, db_user):
    return Team.objects.create(name='Fnatic', tag='FNC', owner=db_user)
