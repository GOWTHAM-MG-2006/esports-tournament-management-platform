from rest_framework import serializers
from rest_framework.exceptions import ValidationError

from .models import Match


class MatchSerializer(serializers.ModelSerializer):
    team1_name = serializers.CharField(source='team1.name', read_only=True, default=None)
    team2_name = serializers.CharField(source='team2.name', read_only=True, default=None)
    winner_name = serializers.CharField(source='winner.name', read_only=True, default=None)

    class Meta:
        model = Match
        fields = [
            'id', 'tournament', 'round', 'position',
            'team1', 'team1_name', 'team2', 'team2_name',
            'winner', 'winner_name', 'is_bye', 'status',
            'bracket_round_label', 'team1_score', 'team2_score',
            'scheduled_at',
        ]
        read_only_fields = ['id']


class SubmitResultSerializer(serializers.Serializer):
    winner = serializers.IntegerField()
    team1_score = serializers.CharField(max_length=20, required=False, default='')
    team2_score = serializers.CharField(max_length=20, required=False, default='')

    def validate(self, data):
        match = self.instance
        winner_id = data['winner']
        valid_ids = {match.team1_id, match.team2_id}
        if match.team1 is None or match.team2 is None:
            raise ValidationError('Match does not have two teams')
        if winner_id not in valid_ids:
            raise ValidationError({'winner': 'Winner must be one of the match teams'})
        return data
