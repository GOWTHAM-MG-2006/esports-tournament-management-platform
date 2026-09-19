from rest_framework import serializers
from users.serializers import UserPublicSerializer

from .models import Registration, Tournament


class RegistrationSerializer(serializers.ModelSerializer):
    team_name = serializers.CharField(source='team.name', read_only=True)

    class Meta:
        model = Registration
        fields = ['id', 'tournament', 'team', 'team_name', 'status', 'seed', 'registered_at']
        read_only_fields = ['id', 'status', 'registered_at']


class TournamentSerializer(serializers.ModelSerializer):
    created_by = UserPublicSerializer(read_only=True)
    registration_count = serializers.SerializerMethodField()

    class Meta:
        model = Tournament
        fields = [
            'id', 'name', 'game', 'format', 'status',
            'max_teams', 'min_team_members', 'max_team_members',
            'start_date', 'end_date',
            'prize_pool', 'rules', 'created_by',
            'registration_count', 'created_at',
        ]
        read_only_fields = ['id', 'created_at']

    def validate(self, data):
        min_m = data.get(
            'min_team_members',
            self.instance.min_team_members if self.instance else 1,
        )
        max_m = data.get(
            'max_team_members',
            self.instance.max_team_members if self.instance else None,
        )
        if max_m is not None and min_m is not None and min_m > max_m:
            raise serializers.ValidationError(
                'min_team_members cannot exceed max_team_members.'
            )
        return data

    def get_registration_count(self, obj):
        return obj.registrations.count()
