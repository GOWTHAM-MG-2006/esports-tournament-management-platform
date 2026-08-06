from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from teams.models import Team, TeamMember
from tournaments.models import Tournament, Registration

User = get_user_model()


class Command(BaseCommand):
    help = 'Seed demo data: 4 users, 4 teams, 1 tournament, 4 registrations'

    def handle(self, *args, **options):
        # 4 player users
        users = []
        for i in range(1, 5):
            user, created = User.objects.get_or_create(
                email=f'player{i}@demo.com',
                defaults={'username': f'player{i}', 'role': 'player'},
            )
            if created:
                user.set_password('demo1234')
                user.save()
            users.append(user)

        # 4 teams, each owned by one player
        team_data = [('Fnatic', 'FNC'), ('G2', 'G2'), ('T1', 'T1'), ('Cloud9', 'C9')]
        teams = []
        for (name, tag), owner in zip(team_data, users):
            team, _ = Team.objects.get_or_create(name=name, defaults={'tag': tag, 'owner': owner})
            TeamMember.objects.get_or_create(team=team, user=owner, defaults={'role': 'captain'})
            teams.append(team)

        # organizer (idempotent)
        org, org_created = User.objects.get_or_create(
            email='org@demo.com',
            defaults={'username': 'organizer', 'role': 'organizer'},
        )
        if org_created:
            org.set_password('demo1234')
            org.save()

        # demo tournament
        tournament, _ = Tournament.objects.get_or_create(
            name='Demo Tournament',
            game='League of Legends',
            defaults={'max_teams': 8, 'created_by': org, 'status': 'draft'},
        )

        # 4 registrations
        for team in teams:
            Registration.objects.get_or_create(
                tournament=tournament, team=team, defaults={'status': 'approved'}
            )

        self.stdout.write(self.style.SUCCESS('Demo data seeded successfully'))
