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
        return Team.objects.filter(owner=self.request.user).order_by('id')

    def perform_create(self, serializer):
        team = serializer.save(owner=self.request.user)
        TeamMember.objects.create(team=team, user=self.request.user, role='captain')

    @action(detail=True, methods=['post'], url_path='add-member')
    def add_member(self, request, pk=None):
        team = self.get_object()
        serializer = AddMemberSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            user = User.objects.get(pk=serializer.validated_data['user_id'])
        except User.DoesNotExist:
            return Response({'message': 'User not found'}, status=status.HTTP_404_NOT_FOUND)
        if TeamMember.objects.filter(team=team, user=user).exists():
            return Response({'message': 'User already a member'}, status=status.HTTP_400_BAD_REQUEST)
        member = TeamMember.objects.create(
            team=team, user=user, role=serializer.validated_data.get('role', 'member')
        )
        return Response(TeamMemberSerializer(member).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['post'], url_path='remove-member')
    def remove_member(self, request, pk=None):
        team = self.get_object()
        user_id = request.data.get('user_id')
        try:
            member = TeamMember.objects.get(team=team, user_id=user_id)
        except TeamMember.DoesNotExist:
            return Response({'message': 'Membership not found'}, status=status.HTTP_404_NOT_FOUND)
        if member.user_id == team.owner_id:
            return Response({'message': 'Cannot remove the team owner'}, status=status.HTTP_400_BAD_REQUEST)
        member.delete()
        return Response({'message': 'Member removed'}, status=status.HTTP_200_OK)
