import type { Match } from '../api/matches';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const ROUND_ORDER: Record<string, number> = {
  PLAY_IN: 0,
  QUARTERFINAL: 1,
  SEMIFINAL: 2,
  FINAL: 3,
};

/** Group matches by round for column-based bracket display. */
function groupByRound(matches: Match[]): Map<string, Match[]> {
  const map = new Map<string, Match[]>();
  for (const m of matches) {
    const label = m.bracket_round_label || `Round ${m.round}`;
    const existing = map.get(label);
    if (existing) {
      existing.push(m);
    } else {
      map.set(label, [m]);
    }
  }
  return map;
}

function sortedRoundKeys(groups: Map<string, Match[]>): string[] {
  return [...groups.keys()].sort((a, b) => {
    const orderA = ROUND_ORDER[a] ?? 99;
    const orderB = ROUND_ORDER[b] ?? 99;
    return orderA - orderB;
  });
}

// ---------------------------------------------------------------------------
// Components (Day 15 spec: standalone bracket visualisation)
// ---------------------------------------------------------------------------

export function MatchCard({ match }: { match: Match }) {
  const isCompleted = match.status === 'completed';
  const isBye = match.is_bye;

  return (
    <div className={`card ${isCompleted ? 'border-success' : ''}`}>
      <div className="card-body py-2 px-3">
        <div className="d-flex justify-content-between align-items-center mb-1">
          <small className="text-muted">Position {match.position}</small>
          {isBye && <span className="badge bg-secondary">Bye</span>}
          {!isBye && (
            <span className={`badge bg-${match.status === 'completed' ? 'success' : 'primary'}`}>
              {match.status}
            </span>
          )}
        </div>

        {/* Team 1 */}
        <div
          className={`d-flex justify-content-between align-items-center py-1 ${
            isCompleted && match.winner === match.team1 ? 'fw-bold text-success' : ''
          }`}
        >
          <span>{match.team1_name}</span>
          {match.team1_score && <span className="badge bg-light text-dark">{match.team1_score}</span>}
        </div>

        {/* Team 2 */}
        <div
          className={`d-flex justify-content-between align-items-center py-1 ${
            isCompleted && match.winner === match.team2 ? 'fw-bold text-success' : ''
          }`}
        >
          <span>{match.team2_name}</span>
          {match.team2_score && <span className="badge bg-light text-dark">{match.team2_score}</span>}
        </div>

        {/* Winner line */}
        {isCompleted && match.winner_name && (
          <div className="mt-1 pt-1 border-top">
            <small className="text-success fw-semibold">
              Winner: {match.winner_name}
            </small>
          </div>
        )}
      </div>
    </div>
  );
}

export default function BracketView({ matches }: { matches: Match[] }) {
  const groups = groupByRound(matches);
  const roundKeys = sortedRoundKeys(groups);

  return (
    <div className="row g-3">
      {roundKeys.map((roundLabel) => (
        <div key={roundLabel} className="col-md">
          <h5 className="text-center mb-3 text-uppercase fw-bold">
            {roundLabel.replace(/_/g, ' ')}
          </h5>
          <div className="d-flex flex-column gap-3">
            {groups.get(roundLabel)!.map((m) => (
              <MatchCard key={m.id} match={m} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
