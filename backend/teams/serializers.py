from rest_framework import serializers
from users.serializers import UserPublicSerializer

from .models import Team, TeamMember


class TeamMemberSerializer(serializers.ModelSerializer):
    user = UserPublicSerializer(read_only=True)

    class Meta:
        model = TeamMember
        fields = ['id', 'user', 'role']
        read_only_fields = fields


class AddMemberSerializer(serializers.Serializer):
    user_id = serializers.IntegerField(required=False)
    email = serializers.EmailField(required=False)
    role = serializers.ChoiceField(
        choices=TeamMember.Role.choices,
        default=TeamMember.Role.MEMBER,
    )

    def validate(self, attrs):
        if not attrs.get('user_id') and not attrs.get('email'):
            raise serializers.ValidationError('Provide user_id or email.')
        return attrs


class TeamSerializer(serializers.ModelSerializer):
    owner = UserPublicSerializer(read_only=True)
    members = TeamMemberSerializer(many=True, read_only=True)

    class Meta:
        model = Team
        fields = ['id', 'name', 'tag', 'owner', 'members', 'created_at']
        read_only_fields = ['id', 'created_at']
