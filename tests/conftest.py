import pytest
from django.core.cache import cache
from teams.models import Team
from users.models import User


@pytest.fixture
def db_user(db):
    return User.objects.create_user(email='player@test.com', username='player1', password='pass123')


@pytest.fixture
def db_organizer(db):
    return User.objects.create_user(email='org@test.com', username='organizer1', password='pass123', role='organizer')


@pytest.fixture
def db_team(db, db_user):
    return Team.objects.create(name='Fnatic', tag='FNC', owner=db_user)


@pytest.fixture(autouse=True)
def _throttle_isolation():
    """Isolate DRF throttle state between tests.

    Production throttling (anon 20/min, user 100/min) is global and keyed
    by IP + a process-wide cache, so without isolation one test's requests
    burn the budget of every later test. Clearing the cache before each
    test gives every test a fresh budget; production settings are never
    touched (override_settings on REST_FRAMEWORK cannot disable throttles
    anyway — DRF binds throttle classes/rates at import time — and only
    risks disturbing later tests). Tests marked ``throttle`` document the
    ones that intentionally exercise production throttling.
    """
    cache.clear()
    yield
