import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/client';
import { listTournaments } from '../api/tournaments';
import { generateBracket } from '../api/matches';
import BracketView from '../components/BracketView';
import LoadingSpinner from '../components/LoadingSpinner';
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
        const data = await listTournaments();
        if (!cancelled) {
          setTournaments(data);
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
      setTournaments(await listTournaments());
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
              <>
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
                <Link
                  className="btn btn-outline-secondary"
                  to={`/tournaments/${selectedId}/seeding`}
                >
                  Set Seeds
                </Link>
              </>
            )}
          </div>
        )}
      </div>

      {/* Error */}
      {error && <div className="alert alert-danger">{error}</div>}

      {/* Bracket display */}
      {loadingBracket && <LoadingSpinner text="Loading bracket…" />}

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
