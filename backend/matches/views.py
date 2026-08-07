from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from matches.models import Match
from matches.serializers import MatchSerializer, SubmitResultSerializer
from matches.services import BracketService
from tournaments.models import Tournament


class MatchViewSet(viewsets.ReadOnlyModelViewSet):
    """Match endpoints including bracket generation and result submission."""

    serializer_class = MatchSerializer
    permission_classes = [IsAuthenticated]
    queryset = Match.objects.all()

    @action(detail=False, methods=['post'], url_path='generate-bracket/(?P<tournament_id>[^/.]+)')
    def generate_bracket(self, request, tournament_id=None):
        try:
            tournament = Tournament.objects.get(id=tournament_id)
        except Tournament.DoesNotExist:
            return Response({'message': 'Tournament not found'}, status=status.HTTP_404_NOT_FOUND)

        try:
            matches = BracketService.generate_bracket(tournament)
        except ValueError as e:
            return Response({'message': str(e)}, status=status.HTTP_400_BAD_REQUEST)

        return Response({
            'tournament_id': tournament.id,
            'matches': MatchSerializer(matches, many=True).data,
        }, status=status.HTTP_200_OK)

    @action(detail=True, methods=['post'], url_path='submit-result')
    def submit_result(self, request, pk=None):
        match = self.get_object()
        serializer = SubmitResultSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            updated = BracketService.submit_result(
                tournament=match.tournament,
                match_id=match.id,
                winner_id=serializer.validated_data['winner_id'],
                team1_score=serializer.validated_data.get('team1_score', ''),
                team2_score=serializer.validated_data.get('team2_score', ''),
            )
        except ValueError as e:
            return Response({'message': str(e)}, status=status.HTTP_400_BAD_REQUEST)

        return Response(MatchSerializer(updated).data, status=status.HTTP_200_OK)
