from django.db import migrations
from django.db.models import F


def demote_extra_captains(apps, schema_editor):
    # Single-leader rule: only the team owner may hold the captain role.
    TeamMember = apps.get_model('teams', 'TeamMember')
    TeamMember.objects.filter(role='captain').exclude(
        user_id=F('team__owner')
    ).update(role='member')


class Migration(migrations.Migration):
    dependencies = [
        ('teams', '0003_teamjoinrequest'),
    ]

    operations = [
        migrations.RunPython(demote_extra_captains, migrations.RunPython.noop),
    ]
