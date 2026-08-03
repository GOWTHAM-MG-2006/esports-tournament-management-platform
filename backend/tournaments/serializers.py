from rest_framework import serializers

from users.serializers import UserPublicSerializer

from .models import Registration, Tournament


class RegistrationSerializer(serializers.ModelSerializer):
    team_name = serializers.CharField(source='team.name', read_only=True)

    class Meta:
        model = Registration
        fields = ['id', 'tournament', 'team', 'team_name', 'status', 'registered_at']
        read_only_fields = ['id', 'status', 'registered_at']


class TournamentSerializer(serializers.ModelSerializer):
    created_by = UserPublicSerializer(read_only=True)
    registration_count = serializers.SerializerMethodField()

    class Meta:
        model = Tournament
        fields = [
            'id', 'name', 'game', 'format', 'status',
            'max_teams', 'start_date', 'end_date',
            'prize_pool', 'rules', 'created_by',
            'registration_count', 'created_at',
        ]
        read_only_fields = ['id', 'created_at']

    def get_registration_count(self, obj):
        return obj.registrations.count()
