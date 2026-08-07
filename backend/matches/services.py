import math

from django.db import transaction
from django.db.models import Q

from matches.models import Match
from tournaments.models import Registration, Tournament


ROUND_LABELS = {
    0: 'PLAY_IN',
    1: 'QUARTERFINAL',
    2: 'SEMIFINAL',
    3: 'FINAL',
}


def _next_power_of_2(n):
    """Return the next power of 2 greater than or equal to n."""
    if n <= 0:
        return 1
    return 1 << math.ceil(math.log2(n))


def _generate_seed_order(n):
    """Return a standard single-elimination seed order for n slots.

    Example for 8 slots: [0, 7, 3, 4, 1, 6, 2, 5].
    """
    if n == 1:
        return [0]
    half = _generate_seed_order(n // 2)
    result = []
    for seed in half:
        result.append(seed)
        result.append(n - 1 - seed)
    return result


class BracketService:
    """Business logic for single-elimination bracket generation and match progression."""

    @staticmethod
    @transaction.atomic
    def generate_bracket(tournament):
        """Generate a single-elimination bracket for a tournament.

        - Requires tournament status 'registration_open' and >= 2 approved registrations.
        - Raises ValueError with a clear message otherwise.
        - Fills a power-of-2 bracket using recursive seeding; missing slots become
          bye matches (is_bye=True, status='bye') whose single team auto-advances.
        - Sets tournament.status = 'in_progress' when done.
        - Returns the created matches ordered by round then position.
        """
        if tournament.status != 'registration_open':
            raise ValueError('Bracket can only be generated from registration_open status')
        approved = (
            Registration.objects
            .filter(tournament=tournament, status='approved')
            .select_related('team')
            .order_by('id')
        )
        approved_teams = [reg.team for reg in approved]
        team_count = len(approved_teams)
        if team_count < 2:
            raise ValueError('At least 2 teams required to generate a bracket')
        if Match.objects.filter(tournament=tournament).exists():
            raise ValueError('Bracket already exists for this tournament')

        bracket_size = _next_power_of_2(team_count)
        num_rounds = int(math.log2(bracket_size))
        num_byes = bracket_size - team_count
        seed_order = _generate_seed_order(bracket_size)

        # Place teams into seed slots (first approved registration = top seed).
        teams = [None] * bracket_size
        for i, team in enumerate(approved_teams):
            teams[seed_order.index(i)] = team

        matches = {}

        # Create all matches bottom-up (round 1 = first round played).
        for rnd in range(1, num_rounds + 1):
            matches_in_round = bracket_size // (2 ** rnd)
            round_num = rnd
            label = ROUND_LABELS.get(3 - num_rounds + rnd, f'ROUND_{rnd}')  # BUG FIX 1
            for pos in range(matches_in_round):
                m = Match.objects.create(
                    tournament=tournament,
                    round=round_num,
                    position=pos,
                    bracket_round_label=label,
                )
                matches[(round_num, pos)] = m

        # Assign first-round teams and auto-advance byes.
        first_round_matches = bracket_size // 2
        for pos in range(first_round_matches):
            team1 = teams[2 * pos]
            team2 = teams[2 * pos + 1]
            if team1 is None and team2 is None:
                continue
            m = matches[(1, pos)]
            if team1 is None:
                m.team2 = team2
                m.is_bye = True
                m.status = 'bye'
                m.winner = team2
                m.save()
                BracketService._advance_winner(tournament, team2, 1, pos, matches)
            elif team2 is None:
                m.team1 = team1
                m.is_bye = True
                m.status = 'bye'
                m.winner = team1
                m.save()
                BracketService._advance_winner(tournament, team1, 1, pos, matches)
            else:
                m.team1 = team1
                m.team2 = team2
                m.save()

        tournament.status = 'in_progress'
        tournament.save()

        return Match.objects.filter(tournament=tournament).order_by('round', 'position')

    @staticmethod
    def _advance_winner(tournament, winner, from_round, from_pos, matches):
        """Place a winning team into the appropriate slot of the next round's match."""
        next_round = from_round + 1
        next_pos = from_pos // 2
        next_match = matches.get((next_round, next_pos))
        if next_match is None:
            return  # reached the final round
        if from_pos % 2 == 0:
            next_match.team1 = winner
        else:
            next_match.team2 = winner
        next_match.save()

    @staticmethod
    @transaction.atomic
    def submit_result(tournament, match_id, winner_id, team1_score='', team2_score=''):
        """Validate and record a match result, then auto-advance the winner.

        - Raises ValueError if the match is already completed, is a bye match, or
          the winner is not a participant.
        - Marks the match completed and propagates the winner to the next round.
        - Completes the tournament when the final match is submitted.
        """
        match = Match.objects.select_for_update().get(id=match_id, tournament=tournament)
        if match.status == 'completed':
            raise ValueError('Match already completed')
        if match.is_bye:
            raise ValueError('Cannot submit result for a bye match')

        # lazy import to avoid circular imports
        from teams.models import Team

        winner = Team.objects.get(id=winner_id)
        if winner not in [match.team1, match.team2]:
            raise ValueError('Winner must be one of the match participants')

        match.winner = winner
        match.team1_score = team1_score
        match.team2_score = team2_score
        match.status = 'completed'
        match.save()

        # Auto-advance to next round.
        next_round = match.round + 1
        next_pos = match.position // 2
        try:
            next_match = Match.objects.get(
                tournament=tournament, round=next_round, position=next_pos
            )
            if next_match.position % 2 == 0:
                next_match.team1 = winner
            else:
                next_match.team2 = winner
            next_match.save()
        except Match.DoesNotExist:
            tournament.status = 'completed'
            tournament.save()

        return match
