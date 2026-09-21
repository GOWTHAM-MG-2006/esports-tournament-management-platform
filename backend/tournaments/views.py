from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from users.permissions import IsOrganizer

from tournaments.models import Registration, Tournament
from tournaments.serializers import RegistrationSerializer, TournamentSerializer


class TournamentViewSet(viewsets.ModelViewSet):
    serializer_class = TournamentSerializer
    permission_classes = [IsAuthenticated]
    queryset = Tournament.objects.all().order_by('id')

    def get_permissions(self):
        if self.action in ('open_registration', 'close_registration',
                            'start_tournament', 'seed', 'update',
                            'partial_update', 'destroy'):
            return [IsOrganizer()]
        return [IsAuthenticated()]

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)

    def update(self, request, *args, **kwargs):
        if 'status' in request.data:
            return Response(
                {'message': 'Status cannot be edited directly. Use the lifecycle actions (open/close/start).'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if self.get_object().status in ('in_progress', 'completed'):
            return Response(
                {'message': 'Tournament details cannot be edited once started.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        return super().update(request, *args, **kwargs)

    def partial_update(self, request, *args, **kwargs):
        if 'status' in request.data:
            return Response(
                {'message': 'Status cannot be edited directly. Use the lifecycle actions (open/close/start).'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if self.get_object().status in ('in_progress', 'completed'):
            return Response(
                {'message': 'Tournament details cannot be edited once started.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        return super().partial_update(request, *args, **kwargs)

    def perform_destroy(self, instance):
        if instance.status == 'in_progress':
            raise ValidationError('Cannot delete a tournament in progress')
        instance.delete()

    @action(detail=True, methods=['post'], url_path='open-registration')
    def open_registration(self, request, pk=None):
        tournament = self.get_object()
        if tournament.status not in ('draft', 'registration_closed'):
            return Response({'message': 'Registration can only be opened from draft or closed status'}, status=status.HTTP_400_BAD_REQUEST)
        tournament.status = 'registration_open'
        tournament.save()
        return Response(TournamentSerializer(tournament).data)

    @action(detail=True, methods=['post'], url_path='close-registration')
    def close_registration(self, request, pk=None):
        tournament = self.get_object()
        if tournament.status not in ('draft', 'registration_open'):
            return Response({'message': 'Registration can only be closed from draft or open status'}, status=status.HTTP_400_BAD_REQUEST)
        tournament.status = 'registration_closed'
        tournament.save()
        return Response(TournamentSerializer(tournament).data)

    @action(detail=True, methods=['post'], url_path='start-tournament')
    def start_tournament(self, request, pk=None):
        tournament = self.get_object()
        if tournament.status != 'registration_closed':
            return Response({'message': 'Can only start a tournament whose registration is closed'}, status=status.HTTP_400_BAD_REQUEST)
        tournament.status = 'in_progress'
        tournament.save()
        return Response(TournamentSerializer(tournament).data)

    @action(detail=True, methods=['post'], url_path='register-team')
    def register_team(self, request, pk=None):
        tournament = self.get_object()
        if tournament.status != 'registration_open':
            return Response({'message': 'Registration is not open'}, status=status.HTTP_400_BAD_REQUEST)
        team_id = request.data.get('team_id')
        from teams.models import Team
        try:
            team = Team.objects.get(id=team_id, owner=request.user)
        except Team.DoesNotExist:
            return Response({'message': 'Team not found or not owned by you'}, status=status.HTTP_404_NOT_FOUND)
        if Registration.objects.filter(tournament=tournament, team=team).exists():
            return Response({'message': 'Already registered'}, status=status.HTTP_400_BAD_REQUEST)
        if tournament.registrations.count() >= tournament.max_teams:
            return Response({'message': 'Tournament is full'}, status=status.HTTP_400_BAD_REQUEST)
        reg = Registration.objects.create(tournament=tournament, team=team, status='approved')
        try:
            from app.core.email import notify_registration_confirmed
            notify_registration_confirmed(team.owner.email, tournament.name, team.name)
        except Exception:
            import logging
            logging.getLogger(__name__).exception(
                'Failed to send registration email for team %s', team.id
            )
        return Response(RegistrationSerializer(reg).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['post'], url_path='seed')
    def seed(self, request, pk=None):
        tournament = self.get_object()
        if tournament.status not in ('registration_open', 'registration_closed'):
            return Response({'message': 'Can only seed while registration is open or closed'}, status=status.HTTP_400_BAD_REQUEST)
        seeds = request.data.get('seeds', {})
        updated = []
        for reg_id, seed in seeds.items():
            try:
                reg = Registration.objects.get(id=int(reg_id), tournament=tournament)
            except (Registration.DoesNotExist, ValueError, TypeError):
                continue
            reg.seed = seed
            reg.save()
            updated.append(reg)
        return Response(RegistrationSerializer(updated, many=True).data)

    @action(detail=True, methods=['get'], url_path='registrations')
    def registrations(self, request, pk=None):
        tournament = self.get_object()
        regs = tournament.registrations.all().order_by('id')
        return Response(RegistrationSerializer(regs, many=True).data)

    @action(detail=True, methods=['get'], url_path='matches')
    def matches(self, request, pk=None):
        tournament = self.get_object()
        from matches.serializers import MatchSerializer
        matches = tournament.matches.all().order_by('round', 'position')
        return Response(MatchSerializer(matches, many=True).data)

    @action(detail=True, methods=['get'], url_path='bracket')
    def bracket(self, request, pk=None):
        tournament = self.get_object()
        from matches.serializers import MatchSerializer
        matches = tournament.matches.all().order_by('round', 'position')
        return Response({
            'tournament': TournamentSerializer(tournament).data,
            'matches': MatchSerializer(matches, many=True).data,
        })
