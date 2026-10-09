from matches.models import Match
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from predictions.services import predict_match


class PredictMatchView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, match_id):
        try:
            match = Match.objects.get(id=match_id)
        except Match.DoesNotExist:
            return Response(
                {'message': 'Match not found'}, status=status.HTTP_404_NOT_FOUND
            )
        if match.team1_id is None or match.team2_id is None:
            return Response(
                {'message': 'Match teams are not decided yet'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        result = predict_match(match.team1_id, match.team2_id)
        return Response(result)
