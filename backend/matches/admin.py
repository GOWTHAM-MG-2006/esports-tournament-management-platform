from django.contrib import admin

from .models import Match


@admin.register(Match)
class MatchAdmin(admin.ModelAdmin):
    list_display = ('tournament', 'round', 'position', 'team1', 'team2', 'winner', 'status', 'is_bye')
    list_filter = ('status', 'is_bye')
    search_fields = ('tournament__name',)
