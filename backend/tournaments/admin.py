from django.contrib import admin

from .models import Tournament, Registration


@admin.register(Tournament)
class TournamentAdmin(admin.ModelAdmin):
    list_display = ('name', 'game', 'format', 'status', 'max_teams', 'created_by', 'created_at')
    list_filter = ('status', 'format')
    search_fields = ('name', 'game')


@admin.register(Registration)
class RegistrationAdmin(admin.ModelAdmin):
    list_display = ('tournament', 'team', 'status', 'registered_at')
    list_filter = ('status',)
    search_fields = ('tournament__name', 'team__name')
