import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  getTournament,
  getTournamentMatches,
  openRegistration,
  closeRegistration,
  registerTeam,
  listMyTeams,
  handleAxiosError,
} from '../api/tournaments';
import type {
  Tournament,
  Match,
  TournamentStatus,
  TeamOption,
} from '../api/tournaments';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const STATUS_LABELS: Record<TournamentStatus, string> = {
  draft: 'Draft',
  registration_open: 'Registration Open',
  in_progress: 'In Progress',
  completed: 'Completed',
};

const STATUS_BADGES: Record<TournamentStatus, string> = {
  draft: 'bg-secondary',
  registration_open: 'bg-primary',
  in_progress: 'bg-warning text-dark',
  completed: 'bg-success',
};

const MATCH_STATUS_BADGES: Record<string, string> = {
  scheduled: 'bg-info text-dark',
  completed: 'bg-success',
  bye: 'bg-secondary',
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function TournamentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const tournamentId = Number(id);

  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Action states
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  // Register team states
  const [teams, setTeams] = useState<TeamOption[]>([]);
  const [selectedTeamId, setSelectedTeamId] = useState<number | null>(null);
  const [registerLoading, setRegisterLoading] = useState(false);
  const [registerResult, setRegisterResult] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  // -----------------------------------------------------------------------
  // Data loading
  // -----------------------------------------------------------------------

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [t, m] = await Promise.all([
        getTournament(tournamentId),
        getTournamentMatches(tournamentId),
      ]);
      setTournament(t);
      setMatches(m);
    } catch (err) {
      setError(handleAxiosError(err));
    } finally {
      setLoading(false);
    }
  }, [tournamentId]);

  useEffect(() => {
    if (!isNaN(tournamentId)) {
      loadData();
    }
  }, [tournamentId, loadData]);

  // Load teams when registration is open
  useEffect(() => {
    if (tournament?.status === 'registration_open') {
      listMyTeams()
        .then(setTeams)
        .catch(() => setTeams([]));
    }
  }, [tournament?.status]);

  // -----------------------------------------------------------------------
  // Status actions
  // -----------------------------------------------------------------------

  const handleOpenRegistration = async () => {
    setActionLoading(true);
    setActionError(null);
    try {
      await openRegistration(tournamentId);
      await loadData();
    } catch (err) {
      setActionError(handleAxiosError(err));
    } finally {
      setActionLoading(false);
    }
  };

  const handleCloseRegistration = async () => {
    setActionLoading(true);
    setActionError(null);
    try {
      await closeRegistration(tournamentId);
      await loadData();
    } catch (err) {
      setActionError(handleAxiosError(err));
    } finally {
      setActionLoading(false);
    }
  };

  // -----------------------------------------------------------------------
  // Register team
  // -----------------------------------------------------------------------

  const handleRegisterTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedTeamId === null) return;

    setRegisterLoading(true);
    setRegisterResult(null);
    try {
      await registerTeam(tournamentId, selectedTeamId);
      setRegisterResult({
        type: 'success',
        message: 'Team registered successfully!',
      });
      setSelectedTeamId(null);
      await loadData(); // refresh registration_count
    } catch (err) {
      setRegisterResult({
        type: 'error',
        message: handleAxiosError(err),
      });
    } finally {
      setRegisterLoading(false);
    }
  };

  // -----------------------------------------------------------------------
  // Guard
  // -----------------------------------------------------------------------

  if (isNaN(tournamentId)) {
    return <div className="alert alert-danger">Invalid tournament ID.</div>;
  }

  // -----------------------------------------------------------------------
  // Loading
  // -----------------------------------------------------------------------

  if (loading) {
    return (
      <div className="text-center py-5">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }

  // -----------------------------------------------------------------------
  // Error
  // -----------------------------------------------------------------------

  if (error || !tournament) {
    return <div className="alert alert-danger">{error ?? 'Tournament not found.'}</div>;
  }

  // -----------------------------------------------------------------------
  // Render
  // -----------------------------------------------------------------------

  return (
    <div>
      {/* Back link */}
      <a href="/tournaments" className="text-decoration-none mb-3 d-inline-block">
        &larr; Back to Tournaments
      </a>

      {/* Header card */}
      <div className="card mb-4">
        <div className="card-body">
          <div className="d-flex justify-content-between align-items-start flex-wrap gap-2">
            <div>
              <h2 className="mb-1">{tournament.name}</h2>
              <p className="text-muted mb-0">{tournament.game}</p>
            </div>
            <span
              className={`badge ${STATUS_BADGES[tournament.status]} fs-6`}
            >
              {STATUS_LABELS[tournament.status]}
            </span>
          </div>

          <hr />

          <div className="row small">
            <div className="col-sm-6 col-lg-3 mb-2">
              <strong>Teams:</strong> {tournament.registration_count} /{' '}
              {tournament.max_teams}
            </div>
            {tournament.start_date && (
              <div className="col-sm-6 col-lg-3 mb-2">
                <strong>Start:</strong> {tournament.start_date}
              </div>
            )}
            {tournament.end_date && (
              <div className="col-sm-6 col-lg-3 mb-2">
                <strong>End:</strong> {tournament.end_date}
              </div>
            )}
            {tournament.prize_pool && (
              <div className="col-sm-6 col-lg-3 mb-2">
                <strong>Prize:</strong> {tournament.prize_pool}
              </div>
            )}
            <div className="col-12 mb-2">
              <strong>Created by:</strong> {tournament.created_by.email}
            </div>
            {tournament.rules && (
              <div className="col-12">
                <strong>Rules:</strong>
                <p className="mb-0 mt-1">{tournament.rules}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Action errors */}
      {actionError && (
        <div className="alert alert-danger py-2">{actionError}</div>
      )}

      {/* Status action buttons */}
      <div className="d-flex gap-2 mb-4 flex-wrap">
        {tournament.status === 'draft' && (
          <button
            className="btn btn-primary"
            disabled={actionLoading}
            onClick={handleOpenRegistration}
          >
            {actionLoading ? (
              <span className="spinner-border spinner-border-sm me-1" />
            ) : null}
            Open Registration
          </button>
        )}

        {tournament.status === 'registration_open' && (
          <button
            className="btn btn-warning"
            disabled={actionLoading}
            onClick={handleCloseRegistration}
          >
            {actionLoading ? (
              <span className="spinner-border spinner-border-sm me-1" />
            ) : null}
            Close Registration
          </button>
        )}
      </div>

      {/* Register Team Section */}
      {tournament.status === 'registration_open' && (
        <div className="card mb-4">
          <div className="card-body">
            <h5 className="card-title">Register a Team</h5>

            {registerResult && (
              <div
                className={`alert py-2 ${
                  registerResult.type === 'success'
                    ? 'alert-success'
                    : 'alert-danger'
                }`}
              >
                {registerResult.message}
              </div>
            )}

            {teams.length === 0 ? (
              <p className="text-muted mb-0">
                You don&apos;t have any teams to register.
              </p>
            ) : (
              <form onSubmit={handleRegisterTeam} className="d-flex gap-2 align-items-end flex-wrap">
                <div className="flex-grow-1" style={{ maxWidth: 300 }}>
                  <label className="form-label" htmlFor="team-select">
                    Select Team
                  </label>
                  <select
                    id="team-select"
                    className="form-select"
                    value={selectedTeamId ?? ''}
                    onChange={(e) =>
                      setSelectedTeamId(
                        e.target.value ? Number(e.target.value) : null,
                      )
                    }
                    required
                  >
                    <option value="">-- choose a team --</option>
                    {teams.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                </div>
                <button
                  type="submit"
                  className="btn btn-success"
                  disabled={registerLoading || selectedTeamId === null}
                >
                  {registerLoading ? (
                    <span className="spinner-border spinner-border-sm me-1" />
                  ) : null}
                  Register
                </button>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Matches Table */}
      <h4 className="mb-3">Matches</h4>

      {matches.length === 0 ? (
        <div className="alert alert-info">
          No matches generated yet. Matches will appear after the tournament
          bracket is created.
        </div>
      ) : (
        <div className="table-responsive">
          <table className="table table-striped table-hover">
            <thead className="table-dark">
              <tr>
                <th>Round</th>
                <th>Position</th>
                <th>Team 1</th>
                <th>Team 2</th>
                <th>Score</th>
                <th>Winner</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {matches.map((m) => (
                <tr key={m.id}>
                  <td>{m.bracket_round_label || `Round ${m.round}`}</td>
                  <td>{m.position}</td>
                  <td>{m.team1_name ?? 'TBD'}</td>
                  <td>{m.team2_name ?? 'TBD'}</td>
                  <td>
                    {m.team1_score != null && m.team2_score != null
                      ? `${m.team1_score} - ${m.team2_score}`
                      : '—'}
                  </td>
                  <td>{m.winner_name ?? '—'}</td>
                  <td>
                    <span
                      className={`badge ${
                        MATCH_STATUS_BADGES[m.status] ?? 'bg-secondary'
                      }`}
                    >
                      {m.status}
                    </span>
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
