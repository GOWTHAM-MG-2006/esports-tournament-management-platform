from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated

from teams.models import Team, TeamMember
from teams.serializers import TeamSerializer, TeamMemberSerializer, AddMemberSerializer
from users.models import User


class TeamViewSet(viewsets.ModelViewSet):
    serializer_class = TeamSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Team.objects.filter(owner=self.request.user)

    def perform_create(self, serializer):
        team = serializer.save(owner=self.request.user)
        TeamMember.objects.create(team=team, user=self.request.user, role='captain')

    @action(detail=True, methods=['post'], url_path='add-member')
    def add_member(self, request, pk=None):
        team = self.get_object()
        serializer = AddMemberSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = User.objects.get(pk=serializer.validated_data['user_id'])
        if TeamMember.objects.filter(team=team, user=user).exists():
            return Response({'message': 'User already a member'}, status=status.HTTP_400_BAD_REQUEST)
        member = TeamMember.objects.create(
            team=team, user=user, role=serializer.validated_data.get('role', 'member')
        )
        return Response(TeamMemberSerializer(member).data, status=status.HTTP_201_CREATED)
