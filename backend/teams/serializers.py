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
    user_id = serializers.IntegerField()
    role = serializers.ChoiceField(
        choices=TeamMember.Role.choices,
        default=TeamMember.Role.MEMBER,
    )


class TeamSerializer(serializers.ModelSerializer):
    owner = UserPublicSerializer(read_only=True)
    members = TeamMemberSerializer(many=True, read_only=True)

    class Meta:
        model = Team
        fields = ['id', 'name', 'tag', 'owner', 'members', 'created_at']
        read_only_fields = ['id', 'created_at']
