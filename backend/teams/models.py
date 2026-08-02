from django.db import models


class Team(models.Model):
    name = models.CharField(max_length=100, unique=True)
    tag = models.CharField(max_length=10, unique=True)
    owner = models.ForeignKey('users.User', on_delete=models.CASCADE, related_name='owned_teams')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'teams'

    def __str__(self):
        return self.name


class TeamMember(models.Model):
    class Role(models.TextChoices):
        CAPTAIN = 'captain', 'Captain'
        MEMBER = 'member', 'Member'

    team = models.ForeignKey(Team, on_delete=models.CASCADE, related_name='members')
    user = models.ForeignKey('users.User', on_delete=models.CASCADE, related_name='team_memberships')
    role = models.CharField(max_length=20, choices=Role.choices, default=Role.MEMBER)

    class Meta:
        db_table = 'team_members'
        unique_together = ('team', 'user')

    def __str__(self):
        return f"{self.user.username} -> {self.team.name}"
