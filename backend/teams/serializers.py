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


class TeamJoinRequestSerializer(serializers.ModelSerializer):
    user = UserPublicSerializer(read_only=True)
    team_name = serializers.CharField(source='team.name', read_only=True)

    class Meta:
        from .models import TeamJoinRequest

        model = TeamJoinRequest
        fields = ['id', 'team', 'team_name', 'user', 'role', 'status', 'created_at']
        read_only_fields = fields


class TeamSerializer(serializers.ModelSerializer):
    owner = UserPublicSerializer(read_only=True)
    members = TeamMemberSerializer(many=True, read_only=True)
    pending_requests = serializers.SerializerMethodField()

    class Meta:
        model = Team
        fields = ['id', 'name', 'tag', 'owner', 'members', 'pending_requests', 'created_at']
        read_only_fields = ['id', 'created_at']

    def get_pending_requests(self, obj):
        request = self.context.get('request')
        if (
            not request
            or not getattr(request.user, 'is_authenticated', False)
            or obj.owner_id != request.user.id
        ):
            return []
        qs = obj.join_requests.filter(status='pending').select_related('user').order_by('id')
        return TeamJoinRequestSerializer(qs, many=True).data
