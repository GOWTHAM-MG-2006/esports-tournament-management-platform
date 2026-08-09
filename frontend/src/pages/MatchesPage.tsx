import { useEffect, useState, useCallback } from 'react';
import { listMatches, submitResult } from '../api/matches';
import type { Match } from '../api/matches';

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
  return 'Something went wrong submitting the result';
}

function statusBadge(status: Match['status']): string {
  switch (status) {
    case 'scheduled':
      return 'primary';
    case 'completed':
      return 'success';
    case 'bye':
      return 'secondary';
    default:
      return 'secondary';
  }
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

interface ResultFormProps {
  match: Match;
  onSuccess: () => void;
}

function ResultForm({ match, onSuccess }: ResultFormProps) {
  const [winner, setWinner] = useState<number>(match.team1 ?? 0);
  const [team1Score, setTeam1Score] = useState('');
  const [team2Score, setTeam2Score] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await submitResult(match.id, winner, team1Score, team2Score);
      alert('Result submitted successfully!');
      onSuccess();
    } catch (err: unknown) {
      const msg = handleAxiosError(err);
      alert(msg);
    } finally {
      setSubmitting(false);
    }
  };

  if (!match.team1 || !match.team2) return null;

  return (
    <form className="d-flex flex-wrap align-items-end gap-2 mt-2" onSubmit={handleSubmit}>
      <div>
        <label className="form-label form-label-sm mb-0">Winner</label>
        <select
          className="form-select form-select-sm"
          value={winner}
          onChange={(e) => setWinner(Number(e.target.value))}
          required
        >
          <option value={match.team1}>{match.team1_name}</option>
          <option value={match.team2}>{match.team2_name}</option>
        </select>
      </div>
      <div>
        <label className="form-label form-label-sm mb-0">{match.team1_name} score</label>
        <input
          type="text"
          className="form-control form-control-sm"
          value={team1Score}
          onChange={(e) => setTeam1Score(e.target.value)}
          placeholder="Score"
          style={{ width: 80 }}
        />
      </div>
      <div>
        <label className="form-label form-label-sm mb-0">{match.team2_name} score</label>
        <input
          type="text"
          className="form-control form-control-sm"
          value={team2Score}
          onChange={(e) => setTeam2Score(e.target.value)}
          placeholder="Score"
          style={{ width: 80 }}
        />
      </div>
      <button
        type="submit"
        className="btn btn-sm btn-primary"
        disabled={submitting}
      >
        {submitting ? 'Submitting…' : 'Submit'}
      </button>
    </form>
  );
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

export default function MatchesPage() {
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMatches = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await listMatches();
      setMatches(data);
    } catch (err: unknown) {
      setError(handleAxiosError(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMatches();
  }, [fetchMatches]);

  if (loading) {
    return (
      <div className="text-center py-5">
        <div className="spinner-border" role="status">
          <span className="visually-hidden">Loading…</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <h2 className="mb-3">Matches</h2>
        <div className="alert alert-danger">{error}</div>
      </div>
    );
  }

  return (
    <div>
      <h2 className="mb-3">Matches</h2>

      {matches.length === 0 ? (
        <div className="alert alert-info">No matches found.</div>
      ) : (
        <div className="table-responsive">
          <table className="table table-striped table-hover">
            <thead className="table-dark">
              <tr>
                <th>Tournament</th>
                <th>Round</th>
                <th>Position</th>
                <th>Team 1</th>
                <th>Team 2</th>
                <th>Scores</th>
                <th>Winner</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {matches.map((m) => (
                <tr key={m.id}>
                  <td>{m.tournament}</td>
                  <td>{m.bracket_round_label}</td>
                  <td>{m.position}</td>
                  <td>{m.team1_name}{m.is_bye && m.team1 === null ? ' (bye)' : ''}</td>
                  <td>{m.team2_name}{m.is_bye && m.team2 === null ? ' (bye)' : ''}</td>
                  <td>
                    {m.team1_score || m.team2_score
                      ? `${m.team1_score || '0'} - ${m.team2_score || '0'}`
                      : '—'}
                  </td>
                  <td>{m.winner_name || '—'}</td>
                  <td>
                    <span className={`badge bg-${statusBadge(m.status)}`}>
                      {m.status}
                    </span>
                  </td>
                  <td>
                    {m.status === 'scheduled' && !m.is_bye && (
                      <ResultForm match={m} onSuccess={fetchMatches} />
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
