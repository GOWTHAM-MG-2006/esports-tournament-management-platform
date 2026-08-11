from django.db import models


class Tournament(models.Model):
    class Format(models.TextChoices):
        SINGLE_ELIMINATION = 'single_elimination', 'Single Elimination'

    class Status(models.TextChoices):
        DRAFT = 'draft', 'Draft'
        REGISTRATION_OPEN = 'registration_open', 'Registration Open'
        IN_PROGRESS = 'in_progress', 'In Progress'
        COMPLETED = 'completed', 'Completed'

    name = models.CharField(max_length=200)
    game = models.CharField(max_length=100)
    format = models.CharField(max_length=30, choices=Format.choices, default=Format.SINGLE_ELIMINATION)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.DRAFT)
    max_teams = models.PositiveIntegerField()
    start_date = models.DateField(null=True, blank=True)
    end_date = models.DateField(null=True, blank=True)
    prize_pool = models.CharField(max_length=200, blank=True, default='')
    rules = models.TextField(blank=True, default='')
    created_by = models.ForeignKey('users.User', on_delete=models.CASCADE, related_name='tournaments')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'tournaments'

    def __str__(self):
        return self.name


class Registration(models.Model):
    class Status(models.TextChoices):
        PENDING = 'pending', 'Pending'
        APPROVED = 'approved', 'Approved'
        REJECTED = 'rejected', 'Rejected'

    tournament = models.ForeignKey(Tournament, on_delete=models.CASCADE, related_name='registrations')
    team = models.ForeignKey('teams.Team', on_delete=models.CASCADE, related_name='registrations')
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING)
    registered_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'registrations'
        unique_together = ('tournament', 'team')

    def __str__(self):
        return f"{self.team.name} -> {self.tournament.name}"
