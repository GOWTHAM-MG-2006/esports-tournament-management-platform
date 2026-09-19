import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  getTournament,
  getTournamentMatches,
  openRegistration,
  closeRegistration,
  startTournament,
  deleteTournament,
  updateTournament,
  registerTeam,
  listMyTeams,
  handleAxiosError,
} from '../api/tournaments';
import type {
  Tournament,
  Match,
  TournamentStatus,
  TeamOption,
  TournamentUpdatePayload,
} from '../api/tournaments';
import { useAuth } from '../context/AuthContext';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const STATUS_LABELS: Record<TournamentStatus, string> = {
  draft: 'Draft',
  registration_open: 'Registration Open',
  registration_closed: 'Registration Closed',
  in_progress: 'In Progress',
  completed: 'Ended',
};

const STATUS_BADGES: Record<TournamentStatus, string> = {
  draft: 'bg-secondary',
  registration_open: 'bg-primary',
  registration_closed: 'bg-secondary',
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
  const navigate = useNavigate();
  const { user } = useAuth();
  const canManage = user?.role === 'organizer' || user?.role === 'admin';

  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const canEdit =
    canManage &&
    (tournament?.status === 'draft' ||
      tournament?.status === 'registration_open' ||
      tournament?.status === 'registration_closed');

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

  // Edit form states (organizer/admin only)
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState<TournamentUpdatePayload>({});
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

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

  const handleStartTournament = async () => {
    setActionLoading(true);
    setActionError(null);
    try {
      await startTournament(tournamentId);
      await loadData();
    } catch (err) {
      setActionError(handleAxiosError(err));
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteTournament = async () => {
    if (!window.confirm(`Delete tournament "${tournament?.name}"? This cannot be undone.`)) {
      return;
    }
    setActionLoading(true);
    setActionError(null);
    try {
      await deleteTournament(tournamentId);
      navigate('/tournaments');
    } catch (err) {
      setActionError(handleAxiosError(err));
      setActionLoading(false);
    }
  };

  // -----------------------------------------------------------------------
  // Edit details (organizer/admin only; status excluded by design)
  // -----------------------------------------------------------------------

  const handleStartEdit = () => {
    if (!tournament) return;
    setEditForm({
      name: tournament.name,
      game: tournament.game,
      max_teams: tournament.max_teams,
      min_team_members: tournament.min_team_members,
      max_team_members: tournament.max_team_members,
      start_date: tournament.start_date,
      end_date: tournament.end_date,
      prize_pool: tournament.prize_pool,
      rules: tournament.rules ?? '',
    });
    setEditError(null);
    setEditing(true);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setEditLoading(true);
    setEditError(null);
    try {
      await updateTournament(tournamentId, editForm);
      setEditing(false);
      await loadData();
    } catch (err) {
      setEditError(handleAxiosError(err));
    } finally {
      setEditLoading(false);
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
            <div className="col-sm-6 col-lg-3 mb-2">
              <strong>Team size:</strong> {tournament.min_team_members} –{' '}
              {tournament.max_team_members ?? 'No limit'} members
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

      {/* Status action buttons (organizer/admin only) */}
      {canManage && (
        <div className="d-flex gap-2 mb-4 flex-wrap align-items-center">
          {(tournament.status === 'draft' ||
            tournament.status === 'registration_closed') && (
            <button
              className="btn btn-primary"
              disabled={actionLoading}
              onClick={handleOpenRegistration}
            >
              {actionLoading ? (
                <span className="spinner-border spinner-border-sm me-1" />
              ) : null}
              {tournament.status === 'draft'
                ? 'Open Registration'
                : 'Reopen Registration'}
            </button>
          )}

          {(tournament.status === 'registration_open' ||
            tournament.status === 'draft') && (
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

          {tournament.status === 'registration_closed' && (
            <button
              className="btn btn-success"
              disabled={actionLoading}
              onClick={handleStartTournament}
            >
              {actionLoading ? (
                <span className="spinner-border spinner-border-sm me-1" />
              ) : null}
              Start Tournament
            </button>
          )}

          {tournament.status !== 'in_progress' ? (
            <button
              className="btn btn-outline-danger"
              disabled={actionLoading}
              onClick={handleDeleteTournament}
            >
              Delete Tournament
            </button>
          ) : (
            <span className="text-muted small">
              Tournaments in progress cannot be deleted.
            </span>
          )}

          {canEdit && (
            <button
              className="btn btn-outline-secondary"
              disabled={actionLoading}
              onClick={handleStartEdit}
            >
              Edit Details
            </button>
          )}
        </div>
      )}

      {/* Edit form (organizer/admin only, pre-start only; status excluded by design) */}
      {canEdit && editing && (
        <div className="card mb-4">
          <div className="card-body">
            <h5 className="card-title">Edit Tournament Details</h5>

            {editError && (
              <div className="alert alert-danger py-2">{editError}</div>
            )}

            <form onSubmit={handleEditSubmit}>
              <div className="row g-3">
                <div className="col-md-6">
                  <label className="form-label" htmlFor="edit-name">
                    Name
                  </label>
                  <input
                    id="edit-name"
                    className="form-control"
                    value={editForm.name ?? ''}
                    onChange={(e) =>
                      setEditForm({ ...editForm, name: e.target.value })
                    }
                    required
                  />
                </div>
                <div className="col-md-6">
                  <label className="form-label" htmlFor="edit-game">
                    Game
                  </label>
                  <input
                    id="edit-game"
                    className="form-control"
                    value={editForm.game ?? ''}
                    onChange={(e) =>
                      setEditForm({ ...editForm, game: e.target.value })
                    }
                    required
                  />
                </div>
                <div className="col-md-4">
                  <label className="form-label" htmlFor="edit-max-teams">
                    Max Teams
                  </label>
                  <input
                    id="edit-max-teams"
                    type="number"
                    min={2}
                    className="form-control"
                    value={editForm.max_teams ?? ''}
                    onChange={(e) =>
                      setEditForm({
                        ...editForm,
                        max_teams: Number(e.target.value),
                      })
                    }
                    required
                  />
                </div>
                <div className="col-md-4">
                  <label className="form-label" htmlFor="edit-min-members">
                    Min Team Members
                  </label>
                  <input
                    id="edit-min-members"
                    type="number"
                    min={1}
                    className="form-control"
                    value={editForm.min_team_members ?? ''}
                    onChange={(e) =>
                      setEditForm({
                        ...editForm,
                        min_team_members: Number(e.target.value),
                      })
                    }
                    required
                  />
                </div>
                <div className="col-md-4">
                  <label className="form-label" htmlFor="edit-max-members">
                    Max Team Members
                  </label>
                  <input
                    id="edit-max-members"
                    type="number"
                    min={1}
                    placeholder="No limit"
                    className="form-control"
                    value={editForm.max_team_members ?? ''}
                    onChange={(e) =>
                      setEditForm({
                        ...editForm,
                        max_team_members:
                          e.target.value === ''
                            ? null
                            : Number(e.target.value),
                      })
                    }
                  />
                </div>
                <div className="col-md-4">
                  <label className="form-label" htmlFor="edit-start">
                    Start Date
                  </label>
                  <input
                    id="edit-start"
                    type="date"
                    className="form-control"
                    value={editForm.start_date ?? ''}
                    onChange={(e) =>
                      setEditForm({
                        ...editForm,
                        start_date: e.target.value || null,
                      })
                    }
                  />
                </div>
                <div className="col-md-4">
                  <label className="form-label" htmlFor="edit-end">
                    End Date
                  </label>
                  <input
                    id="edit-end"
                    type="date"
                    className="form-control"
                    value={editForm.end_date ?? ''}
                    onChange={(e) =>
                      setEditForm({
                        ...editForm,
                        end_date: e.target.value || null,
                      })
                    }
                  />
                </div>
                <div className="col-md-6">
                  <label className="form-label" htmlFor="edit-prize">
                    Prize Pool
                  </label>
                  <input
                    id="edit-prize"
                    className="form-control"
                    value={editForm.prize_pool ?? ''}
                    onChange={(e) =>
                      setEditForm({
                        ...editForm,
                        prize_pool: e.target.value || null,
                      })
                    }
                  />
                </div>
                <div className="col-12">
                  <label className="form-label" htmlFor="edit-rules">
                    Rules
                  </label>
                  <textarea
                    id="edit-rules"
                    className="form-control"
                    rows={3}
                    value={editForm.rules ?? ''}
                    onChange={(e) =>
                      setEditForm({ ...editForm, rules: e.target.value })
                    }
                  />
                </div>
              </div>

              <div className="d-flex gap-2 mt-3">
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={editLoading}
                >
                  {editLoading ? (
                    <span className="spinner-border spinner-border-sm me-1" />
                  ) : null}
                  Save Changes
                </button>
                <button
                  type="button"
                  className="btn btn-secondary"
                  disabled={editLoading}
                  onClick={() => setEditing(false)}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

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
                  <td>
                    {m.status === 'completed' && !m.winner ? (
                      <span className="badge bg-warning text-dark">Draw</span>
                    ) : (
                      m.winner_name ?? '—'
                    )}
                  </td>
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
