from django.contrib import admin

from .models import Team, TeamJoinRequest, TeamMember


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


@admin.register(TeamJoinRequest)
class TeamJoinRequestAdmin(admin.ModelAdmin):
    list_display = ('user', 'team', 'role', 'status', 'created_at')
    list_filter = ('status', 'role')
    search_fields = ('user__username', 'team__name')
