from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from tournaments.models import Tournament, Registration
from tournaments.serializers import TournamentSerializer, RegistrationSerializer
from users.permissions import IsOrganizer


class TournamentViewSet(viewsets.ModelViewSet):
    serializer_class = TournamentSerializer
    permission_classes = [IsAuthenticated]
    queryset = Tournament.objects.all().order_by('id')

    def get_permissions(self):
        if self.action in ('open_registration', 'close_registration', 'seed'):
            return [IsOrganizer()]
        return [IsAuthenticated()]

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)

    @action(detail=True, methods=['post'], url_path='open-registration')
    def open_registration(self, request, pk=None):
        tournament = self.get_object()
        if tournament.status != 'draft':
            return Response({'message': 'Can only open registration from draft status'}, status=status.HTTP_400_BAD_REQUEST)
        tournament.status = 'registration_open'
        tournament.save()
        return Response(TournamentSerializer(tournament).data)

    @action(detail=True, methods=['post'], url_path='close-registration')
    def close_registration(self, request, pk=None):
        tournament = self.get_object()
        if tournament.status != 'registration_open':
            return Response({'message': 'Registration is not open'}, status=status.HTTP_400_BAD_REQUEST)
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
        return Response(RegistrationSerializer(reg).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['post'], url_path='seed')
    def seed(self, request, pk=None):
        tournament = self.get_object()
        if tournament.status != 'registration_open':
            return Response({'message': 'Can only seed while registration is open'}, status=status.HTTP_400_BAD_REQUEST)
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
