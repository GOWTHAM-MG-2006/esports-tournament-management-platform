import pytest
from django.core.management import call_command
from django.contrib.auth import get_user_model
from teams.models import Team, TeamMember
from tournaments.models import Tournament, Registration

User = get_user_model()


@pytest.mark.django_db
class TestSeedDemo:
    def test_seed_demo(self):
        call_command('seed_demo')
        assert User.objects.filter(email__endswith='@demo.com').count() == 5
        assert Team.objects.count() == 4
        assert TeamMember.objects.count() == 4
        assert Tournament.objects.filter(name='Demo Tournament').exists()
        assert Registration.objects.count() == 4
        assert User.objects.get(email='player1@demo.com').check_password('demo1234')

    def test_seed_demo_idempotent(self):
        call_command('seed_demo')
        call_command('seed_demo')
        assert User.objects.filter(email__endswith='@demo.com').count() == 5
        assert Team.objects.count() == 4
        assert Tournament.objects.count() == 1
        assert Registration.objects.count() == 4
