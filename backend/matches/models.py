from django.db import models


class Match(models.Model):
    class Status(models.TextChoices):
        SCHEDULED = 'scheduled', 'Scheduled'
        COMPLETED = 'completed', 'Completed'
        BYE = 'bye', 'Bye'

    tournament = models.ForeignKey('tournaments.Tournament', on_delete=models.CASCADE, related_name='matches')
    round = models.PositiveIntegerField()
    position = models.PositiveIntegerField()
    team1 = models.ForeignKey('teams.Team', on_delete=models.SET_NULL, null=True, blank=True, related_name='matches_as_team1')
    team2 = models.ForeignKey('teams.Team', on_delete=models.SET_NULL, null=True, blank=True, related_name='matches_as_team2')
    winner = models.ForeignKey('teams.Team', on_delete=models.SET_NULL, null=True, blank=True, related_name='matches_won')
    is_bye = models.BooleanField(default=False)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.SCHEDULED)
    bracket_round_label = models.CharField(max_length=30, blank=True, default='')
    team1_score = models.CharField(max_length=20, blank=True, default='')
    team2_score = models.CharField(max_length=20, blank=True, default='')
    scheduled_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = 'matches'
        unique_together = ('tournament', 'round', 'position')

    def __str__(self):
        return f"R{self.round}P{self.position} ({self.tournament.name})"
