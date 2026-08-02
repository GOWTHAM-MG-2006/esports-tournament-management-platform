from django.contrib import admin

from .models import Team, TeamMember


@admin.register(Team)
class TeamAdmin(admin.ModelAdmin):
    list_display = ('name', 'tag', 'owner', 'created_at')
    search_fields = ('name', 'tag')
    list_filter = ('created_at',)


@admin.register(TeamMember)
class TeamMemberAdmin(admin.ModelAdmin):
    list_display = ('user', 'team', 'role')
    list_filter = ('role',)
    search_fields = ('user__username', 'team__name')
