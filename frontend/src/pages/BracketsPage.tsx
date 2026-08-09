import { useEffect, useState, useCallback } from 'react';
import api from '../api/client';
import { generateBracket } from '../api/matches';
import type { Match } from '../api/matches';
import type { ApiEnvelope } from '../api/types';

// ---------------------------------------------------------------------------
// Local types (tournaments fetched inline — no api/tournaments.ts)
// ---------------------------------------------------------------------------

interface Tournament {
  id: number;
  name: string;
  status: string;
}

interface BracketData {
  tournament: Tournament;
  matches: Match[];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function handleAxiosError(err: unknown): string {
  if (
    err &&
    typeof err === 'object' &&
    'response' in err &&
    err.response &&
    typeof err.response === 'object' &&
    'data' in err.response &&
    err.response.data &&
    typeof err.response.data === 'object' &&
    'message' in err.response.data &&
    typeof (err.response.data as Record<string, unknown>).message === 'string'
  ) {
    return (err.response.data as { message: string }).message;
  }
  if (err instanceof Error) return err.message;
  return 'An unexpected error occurred';
}

/** Unwrap API envelope, tolerating double-wrap or bare data. */
function unwrap<T>(raw: ApiEnvelope<T> | T): T {
  if (raw && typeof raw === 'object' && 'data' in raw && 'success' in raw) {
    return (raw as ApiEnvelope<T>).data;
  }
  return raw as T;
}

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

// ---------------------------------------------------------------------------
// Round order for bracket display
// ---------------------------------------------------------------------------

const ROUND_ORDER: Record<string, number> = {
  PLAY_IN: 0,
  QUARTERFINAL: 1,
  SEMIFINAL: 2,
  FINAL: 3,
};

function sortedRoundKeys(groups: Map<string, Match[]>): string[] {
  return [...groups.keys()].sort((a, b) => {
    const orderA = ROUND_ORDER[a] ?? 99;
    const orderB = ROUND_ORDER[b] ?? 99;
    return orderA - orderB;
  });
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

export default function BracketsPage() {
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [bracket, setBracket] = useState<BracketData | null>(null);
  const [loadingTournaments, setLoadingTournaments] = useState(true);
  const [loadingBracket, setLoadingBracket] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch tournaments list
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoadingTournaments(true);
        const res = await api.get<ApiEnvelope<Tournament[]> | Tournament[]>('/tournaments/');
        if (!cancelled) {
          setTournaments(unwrap<Tournament[]>(res.data));
        }
      } catch (err: unknown) {
        if (!cancelled) setError(handleAxiosError(err));
      } finally {
        if (!cancelled) setLoadingTournaments(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // Fetch bracket when a tournament is selected
  const fetchBracket = useCallback(async (tournamentId: number) => {
    try {
      setLoadingBracket(true);
      setError(null);
      const res = await api.get<ApiEnvelope<BracketData> | BracketData>(
        `/tournaments/${tournamentId}/bracket/`,
      );
      setBracket(unwrap<BracketData>(res.data));
    } catch (err: unknown) {
      setError(handleAxiosError(err));
      setBracket(null);
    } finally {
      setLoadingBracket(false);
    }
  }, []);

  useEffect(() => {
    if (selectedId !== null) {
      fetchBracket(selectedId);
    }
  }, [selectedId, fetchBracket]);

  // Handle generate bracket
  const handleGenerate = async () => {
    if (selectedId === null) return;
    setGenerating(true);
    try {
      await generateBracket(selectedId);
      alert('Bracket generated successfully!');
      await fetchBracket(selectedId);
      // Re-fetch tournaments to pick up status change
      const res = await api.get<ApiEnvelope<Tournament[]> | Tournament[]>('/tournaments/');
      setTournaments(unwrap<Tournament[]>(res.data));
    } catch (err: unknown) {
      alert(handleAxiosError(err));
    } finally {
      setGenerating(false);
    }
  };

  // Derive current tournament status
  const selectedTournament = tournaments.find((t) => t.id === selectedId);
  const canGenerate = selectedTournament?.status === 'registration_open';

  return (
    <div>
      <h2 className="mb-3">Brackets</h2>

      {/* Tournament selector */}
      <div className="mb-4">
        <label htmlFor="tournament-select" className="form-label fw-semibold">
          Select Tournament
        </label>
        {loadingTournaments ? (
          <div className="spinner-border spinner-border-sm" role="status">
            <span className="visually-hidden">Loading…</span>
          </div>
        ) : tournaments.length === 0 ? (
          <div className="text-muted">No tournaments available.</div>
        ) : (
          <div className="d-flex align-items-center gap-3">
            <select
              id="tournament-select"
              className="form-select"
              style={{ maxWidth: 400 }}
              value={selectedId ?? ''}
              onChange={(e) => {
                const val = e.target.value;
                setSelectedId(val ? Number(val) : null);
              }}
            >
              <option value="">— Choose a tournament —</option>
              {tournaments.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} ({t.status})
                </option>
              ))}
            </select>
            {canGenerate && (
              <button
                className="btn btn-success"
                onClick={handleGenerate}
                disabled={generating}
              >
                {generating ? (
                  <>
                    <span className="spinner-border spinner-border-sm me-1" role="status" />
                    Generating…
                  </>
                ) : (
                  'Generate Bracket'
                )}
              </button>
            )}
          </div>
        )}
      </div>

      {/* Error */}
      {error && <div className="alert alert-danger">{error}</div>}

      {/* Bracket display */}
      {loadingBracket && (
        <div className="text-center py-4">
          <div className="spinner-border" role="status">
            <span className="visually-hidden">Loading bracket…</span>
          </div>
        </div>
      )}

      {!loadingBracket && bracket && bracket.matches.length === 0 && (
        <div className="alert alert-info">
          No matches in this bracket yet.
          {canGenerate && ' Click "Generate Bracket" to create matches.'}
        </div>
      )}

      {!loadingBracket && bracket && bracket.matches.length > 0 && (
        <BracketView matches={bracket.matches} />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Bracket visualisation
// ---------------------------------------------------------------------------

function BracketView({ matches }: { matches: Match[] }) {
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

function MatchCard({ match }: { match: Match }) {
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
