from django.db.models import Q
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from users.models import User
from users.permissions import IsTeamOwner

from teams.models import Team, TeamJoinRequest, TeamMember
from teams.serializers import (
    AddMemberSerializer,
    TeamJoinRequestSerializer,
    TeamMemberSerializer,
    TeamSerializer,
)


class TeamViewSet(viewsets.ModelViewSet):
    serializer_class = TeamSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        return (
            Team.objects.filter(Q(owner=user) | Q(members__user=user))
            .distinct()
            .order_by('id')
        )

    def get_permissions(self):
        if self.action in (
            'update',
            'partial_update',
            'destroy',
            'add_member',
            'remove_member',
        ):
            return [IsAuthenticated(), IsTeamOwner()]
        return [IsAuthenticated()]

    def perform_create(self, serializer):
        team = serializer.save(owner=self.request.user)
        TeamMember.objects.create(team=team, user=self.request.user, role='captain')

    @action(detail=True, methods=['post'], url_path='add-member')
    def add_member(self, request, pk=None):
        team = self.get_object()
        serializer = AddMemberSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        if data.get('role') == TeamMember.Role.CAPTAIN:
            return Response(
                {'message': 'A team can have only one leader (captain)'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        try:
            if data.get('email'):
                user = User.objects.get(email__iexact=data['email'])
            else:
                user = User.objects.get(pk=data['user_id'])
        except User.DoesNotExist:
            return Response({'message': 'User not found'}, status=status.HTTP_404_NOT_FOUND)
        if TeamMember.objects.filter(team=team, user=user).exists():
            return Response({'message': 'User already a member'}, status=status.HTTP_400_BAD_REQUEST)
        if TeamJoinRequest.objects.filter(
            team=team, user=user, status=TeamJoinRequest.Status.PENDING
        ).exists():
            return Response(
                {'message': 'Invite already pending for this player'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        invite = TeamJoinRequest.objects.create(
            team=team,
            user=user,
            requested_by=request.user,
            role=data.get('role', TeamMember.Role.MEMBER),
        )
        return Response(TeamJoinRequestSerializer(invite).data, status=status.HTTP_201_CREATED)

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

    @action(detail=True, methods=['post'], url_path='leave')
    def leave_team(self, request, pk=None):
        team = self.get_object()
        if team.owner_id == request.user.id:
            return Response(
                {'message': 'Owners cannot leave; delete the team instead'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        try:
            member = TeamMember.objects.get(team=team, user=request.user)
        except TeamMember.DoesNotExist:
            return Response({'message': 'Membership not found'}, status=status.HTTP_404_NOT_FOUND)
        member.delete()
        return Response({'message': 'You have left the team'}, status=status.HTTP_200_OK)

    @action(detail=False, methods=['get'], url_path='requests')
    def my_requests(self, request):
        invites = (
            TeamJoinRequest.objects.filter(
                user=request.user, status=TeamJoinRequest.Status.PENDING
            )
            .select_related('team', 'user')
            .order_by('id')
        )
        return Response(TeamJoinRequestSerializer(invites, many=True).data)

    def _get_own_request(self, request, req_id):
        try:
            return TeamJoinRequest.objects.select_related('team').get(
                pk=req_id,
                user=request.user,
                status=TeamJoinRequest.Status.PENDING,
            )
        except (TeamJoinRequest.DoesNotExist, ValueError):
            return None

    @action(detail=False, methods=['post'], url_path=r'requests/(?P<req_id>[^/.]+)/accept')
    def accept_request(self, request, req_id=None):
        invite = self._get_own_request(request, req_id)
        if invite is None:
            return Response(
                {'message': 'Invite not found'}, status=status.HTTP_404_NOT_FOUND
            )
        member, _ = TeamMember.objects.get_or_create(
            team=invite.team,
            user=invite.user,
            defaults={'role': TeamMember.Role.MEMBER},
        )
        invite.status = TeamJoinRequest.Status.ACCEPTED
        invite.save(update_fields=['status'])
        return Response(TeamMemberSerializer(member).data, status=status.HTTP_200_OK)

    @action(detail=False, methods=['post'], url_path=r'requests/(?P<req_id>[^/.]+)/decline')
    def decline_request(self, request, req_id=None):
        invite = self._get_own_request(request, req_id)
        if invite is None:
            return Response(
                {'message': 'Invite not found'}, status=status.HTTP_404_NOT_FOUND
            )
        invite.status = TeamJoinRequest.Status.DECLINED
        invite.save(update_fields=['status'])
        return Response({'message': 'Invite declined'}, status=status.HTTP_200_OK)

    @action(detail=False, methods=['delete'], url_path=r'requests/(?P<req_id>[^/.]+)')
    def cancel_request(self, request, req_id=None):
        try:
            invite = TeamJoinRequest.objects.select_related('team').get(
                pk=req_id, status=TeamJoinRequest.Status.PENDING
            )
        except (TeamJoinRequest.DoesNotExist, ValueError):
            return Response(
                {'message': 'Invite not found'}, status=status.HTTP_404_NOT_FOUND
            )
        if invite.team.owner_id != request.user.id:
            return Response(
                {'message': 'Only the team owner can cancel this invite'},
                status=status.HTTP_403_FORBIDDEN,
            )
        invite.delete()
        return Response({'message': 'Invite cancelled'}, status=status.HTTP_200_OK)
