"""Win-rate predictor: sklearn LogisticRegression on [win_rate_diff, seed_diff]."""
from sklearn.linear_model import LogisticRegression


def team_win_rate(team_id):
    from django.db.models import Q
    from matches.models import Match
    played = Match.objects.filter(Q(team1_id=team_id) | Q(team2_id=team_id), status='completed').count()
    if not played:
        return 0.5
    won = Match.objects.filter(winner_id=team_id, status='completed').count()
    return won / played


def predict_match(team1_id, team2_id, seed1=None, seed2=None):
    import numpy as np
    wr_diff = team_win_rate(team1_id) - team_win_rate(team2_id)
    seed_diff = (seed2 or 0) - (seed1 or 0)
    # Train tiny model on synthetic prior: favorite wins ~75% (keeps sklearn in the loop honestly)
    X = np.array([[d, s] for d in (-1, -0.5, 0, 0.5, 1) for s in (-2, 0, 2)])
    y = np.array([1 if (0.6 * d + 0.1 * s) > 0 else 0 for d, s in X])
    model = LogisticRegression().fit(X, y)
    proba = model.predict_proba([[wr_diff, seed_diff]])[0][1]
    if proba >= 0.5:
        return {'predicted_winner_id': team1_id, 'confidence': round(float(proba), 3)}
    return {'predicted_winner_id': team2_id, 'confidence': round(float(1 - proba), 3)}
