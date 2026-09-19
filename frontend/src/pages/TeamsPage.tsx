import { useEffect, useCallback, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  listTeams,
  createTeam,
  deleteTeam,
  addMember,
  leaveTeam,
  getMyRequests,
  acceptRequest,
  declineRequest,
  type Team,
  type TeamJoinRequest,
} from '../api/teams';
import { useAuth } from '../context/AuthContext';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Extract a user-facing message from an unknown error. */
function extractError(err: unknown): string {
  if (
    typeof err === 'object' &&
    err !== null &&
    'response' in err &&
    typeof (err as Record<string, unknown>).response === 'object'
  ) {
    const resp = (err as { response: { data?: unknown } }).response;
    const data = resp.data;
    // Tolerate envelope or flat message
    if (data && typeof data === 'object' && 'message' in data) {
      return String((data as { message: unknown }).message ?? 'Operation failed');
    }
    // Double-wrapped: data.data.message
    if (
      data &&
      typeof data === 'object' &&
      'data' in data &&
      typeof (data as Record<string, unknown>).data === 'object'
    ) {
      const inner = (data as { data: { message?: unknown } }).data;
      if (inner?.message) return String(inner.message);
    }
    // DRF default errors use `detail` (permission denied, not found, ...).
    if (data && typeof data === 'object' && 'detail' in data) {
      const detail = (data as { detail: unknown }).detail;
      if (typeof detail === 'string' && detail) return detail;
      if (Array.isArray(detail)) return detail.map(String).join(' ');
    }
  }
  return 'An unexpected error occurred.';
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function TeamsPage() {
  const { user } = useAuth();

  // Data
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);

  // Pending team invites for the current user
  const [requests, setRequests] = useState<TeamJoinRequest[]>([]);
  const [requestsBusyId, setRequestsBusyId] = useState<number | null>(null);

  // Alerts
  const [alert, setAlert] = useState<{ type: 'success' | 'danger'; text: string } | null>(null);

  // Create form state
  const [showCreate, setShowCreate] = useState(false);
  const [createName, setCreateName] = useState('');
  const [createTag, setCreateTag] = useState('');
  const [createBusy, setCreateBusy] = useState(false);
  const [createErrors, setCreateErrors] = useState<{ name?: string; tag?: string }>({});

  // Per-team add-member state: key = team id
  const [addMemberTeamId, setAddMemberTeamId] = useState<number | null>(null);
  const [memberEmail, setMemberEmail] = useState('');
  const [addMemberBusy, setAddMemberBusy] = useState(false);

  // -----------------------------------------------------------------------
  // Data fetching
  // -----------------------------------------------------------------------

  const fetchTeams = useCallback(async () => {
    try {
      setLoading(true);
      const [teamData, requestData] = await Promise.all([
        listTeams(),
        getMyRequests(),
      ]);
      setTeams(teamData);
      setRequests(requestData);
    } catch (err: unknown) {
      setAlert({ type: 'danger', text: extractError(err) });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchTeams();
  }, [fetchTeams]);

  // Teams the current user owns vs teams they are only a member of.
  const ownedTeams = teams.filter((t) => user && t.owner.id === user.id);
  const memberTeams = teams.filter((t) => !user || t.owner.id !== user.id);

  async function handleAccept(requestId: number) {
    setRequestsBusyId(requestId);
    try {
      await acceptRequest(requestId);
      setAlert({ type: 'success', text: 'Invite accepted. Welcome to the team!' });
      await fetchTeams();
    } catch (err: unknown) {
      setAlert({ type: 'danger', text: extractError(err) });
    } finally {
      setRequestsBusyId(null);
    }
  }

  async function handleDecline(requestId: number) {
    setRequestsBusyId(requestId);
    try {
      await declineRequest(requestId);
      setAlert({ type: 'success', text: 'Invite declined.' });
      await fetchTeams();
    } catch (err: unknown) {
      setAlert({ type: 'danger', text: extractError(err) });
    } finally {
      setRequestsBusyId(null);
    }
  }

  // -----------------------------------------------------------------------
  // Create team
  // -----------------------------------------------------------------------

  function validateCreate(): boolean {
    const errs: { name?: string; tag?: string } = {};
    if (!createName.trim()) errs.name = 'Team name is required.';
    else if (createName.trim().length > 100) errs.name = 'Max 100 characters.';
    if (!createTag.trim()) errs.tag = 'Tag is required.';
    else if (createTag.trim().length > 10) errs.tag = 'Max 10 characters.';
    setCreateErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!validateCreate()) return;
    setCreateBusy(true);
    try {
      await createTeam(createName.trim(), createTag.trim());
      setAlert({ type: 'success', text: 'Team created successfully.' });
      setCreateName('');
      setCreateTag('');
      setShowCreate(false);
      await fetchTeams();
    } catch (err: unknown) {
      setAlert({ type: 'danger', text: extractError(err) });
    } finally {
      setCreateBusy(false);
    }
  }

  // -----------------------------------------------------------------------
  // Delete team
  // -----------------------------------------------------------------------

  async function handleDelete(team: Team) {
    const confirmed = window.confirm(
      `Delete team "${team.name}" (${team.tag})? This cannot be undone.`,
    );
    if (!confirmed) return;
    try {
      await deleteTeam(team.id);
      setAlert({ type: 'success', text: `Team "${team.name}" deleted.` });
      await fetchTeams();
    } catch (err: unknown) {
      setAlert({ type: 'danger', text: extractError(err) });
    }
  }

  // -----------------------------------------------------------------------
  // Leave team (members only)
  // -----------------------------------------------------------------------

  async function handleLeave(team: Team) {
    const confirmed = window.confirm(
      `Leave team "${team.name}" (${team.tag})?`,
    );
    if (!confirmed) return;
    try {
      await leaveTeam(team.id);
      setAlert({ type: 'success', text: `You have left "${team.name}".` });
      await fetchTeams();
    } catch (err: unknown) {
      setAlert({ type: 'danger', text: extractError(err) });
    }
  }

  // -----------------------------------------------------------------------
  // Add member
  // -----------------------------------------------------------------------

  function toggleAddMemberForm(teamId: number) {
    setAddMemberTeamId((prev) => (prev === teamId ? null : teamId));
    setMemberEmail('');
  }

  async function handleAddMember(teamId: number) {
    const email = memberEmail.trim();
    if (!email || !email.includes('@')) {
      setAlert({ type: 'danger', text: 'Please enter the player\u2019s email address.' });
      return;
    }
    setAddMemberBusy(true);
    try {
      await addMember(teamId, email, 'member');
      setAddMemberTeamId(null);
      setMemberEmail('');
      // Best-effort refresh: a refresh failure must not overwrite the
      // confirmed success (the invite was already created server-side).
      try {
        await fetchTeams();
      } catch {
        /* list refreshes on next visit */
      }
      setAlert({ type: 'success', text: 'Invite sent successfully. The player must accept it.' });
    } catch (err: unknown) {
      // Backend 500 for nonexistent user → catch and show generic message
      setAlert({ type: 'danger', text: extractError(err) });
    } finally {
      setAddMemberBusy(false);
    }
  }

  // -----------------------------------------------------------------------
  // Render helpers
  // -----------------------------------------------------------------------

  /** One team card. Owners get Delete + Add Member; members get View only. */
  function renderTeamCard(team: Team, isOwner: boolean) {
    return (
      <div key={team.id} className="card mb-3">
        <div className="card-header d-flex justify-content-between align-items-center">
          <div>
            <strong className="me-2">{team.name}</strong>
            <span className="badge bg-secondary">{team.tag}</span>
          </div>
          <div className="d-flex gap-1">
            <Link
              className="btn btn-sm btn-outline-primary"
              to={`/teams/${team.id}`}
            >
              View
            </Link>
            {isOwner && (
              <button
                className="btn btn-sm btn-outline-danger"
                onClick={() => void handleDelete(team)}
              >
                Delete
              </button>
            )}
            {!isOwner && (
              <button
                className="btn btn-sm btn-outline-warning"
                onClick={() => void handleLeave(team)}
              >
                Leave
              </button>
            )}
          </div>
        </div>

        <div className="card-body">
          {/* Meta */}
          <div className="row text-muted small mb-3">
            <div className="col-sm-4">
              Owner:{' '}
              <span className="text-body">
                {team.owner.username || team.owner.email}
              </span>
            </div>
            <div className="col-sm-4">Members: {team.members.length}</div>
            <div className="col-sm-4">Created: {formatDate(team.created_at)}</div>
          </div>

          {/* Members table */}
          {team.members.length > 0 && (
            <table className="table table-sm align-middle mb-3">
              <thead>
                <tr>
                  <th>User</th>
                  <th>Email</th>
                  <th>Role</th>
                </tr>
              </thead>
              <tbody>
                {team.members.map((m) => (
                  <tr key={m.id}>
                    <td>{m.user.username}</td>
                    <td>{m.user.email}</td>
                    <td>
                      <span
                        className={`badge ${
                          m.role === 'captain' ? 'bg-primary' : 'bg-info'
                        }`}
                      >
                        {m.role}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {/* Add member toggle (owner only — sends a join request) */}
          {isOwner &&
            (addMemberTeamId !== team.id ? (
              <button
                className="btn btn-sm btn-outline-primary"
                onClick={() => toggleAddMemberForm(team.id)}
              >
                + Add Member
              </button>
            ) : (
              <div className="border rounded p-3 bg-light">
                <div className="row g-2 align-items-end">
                  <div className="col-auto">
                    <label className="form-label small" htmlFor={`member-email-${team.id}`}>
                      Player Email
                    </label>
                    <input
                      id={`member-email-${team.id}`}
                      type="email"
                      className="form-control form-control-sm"
                      value={memberEmail}
                      onChange={(e) => setMemberEmail(e.target.value)}
                      placeholder="player@example.com"
                      style={{ width: 220 }}
                    />
                  </div>
                  <div className="col-auto d-flex gap-1">
                    <button
                      className="btn btn-sm btn-success"
                      disabled={addMemberBusy}
                      onClick={() => void handleAddMember(team.id)}
                    >
                      {addMemberBusy ? (
                        <span className="spinner-border spinner-border-sm" />
                      ) : (
                        'Invite'
                      )}
                    </button>
                    <button
                      className="btn btn-sm btn-secondary"
                      onClick={() => toggleAddMemberForm(team.id)}
                      disabled={addMemberBusy}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
                <div className="form-text mt-2">
                  The player receives a join request and must accept it.
                </div>
              </div>
            ))}
        </div>
      </div>
    );
  }

  // -----------------------------------------------------------------------
  // Render
  // -----------------------------------------------------------------------

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h2 className="mb-0">Teams</h2>
        {!showCreate && (
          <button
            className="btn btn-primary"
            onClick={() => setShowCreate(true)}
          >
            + Create Team
          </button>
        )}
      </div>

      {/* ── Alert ───────────────────────────────────────────── */}
      {alert && (
        <div className={`alert alert-${alert.type} alert-dismissible fade show`} role="alert">
          {alert.text}
          <button
            type="button"
            className="btn-close"
            aria-label="Close"
            onClick={() => setAlert(null)}
          />
        </div>
      )}

      {/* ── Create form ─────────────────────────────────────── */}
      {showCreate && (
        <div className="card mb-4">
          <div className="card-header d-flex justify-content-between align-items-center">
            <strong>Create New Team</strong>
            <button
              className="btn btn-sm btn-outline-secondary"
              onClick={() => {
                setShowCreate(false);
                setCreateName('');
                setCreateTag('');
                setCreateErrors({});
              }}
            >
              Cancel
            </button>
          </div>
          <div className="card-body">
            <form onSubmit={(e) => void handleCreate(e)} noValidate>
              <div className="row g-3">
                <div className="col-md-8">
                  <label htmlFor="team-name" className="form-label">
                    Team Name
                  </label>
                  <input
                    id="team-name"
                    type="text"
                    className={`form-control ${createErrors.name ? 'is-invalid' : ''}`}
                    value={createName}
                    onChange={(e) => setCreateName(e.target.value)}
                    maxLength={100}
                    placeholder="e.g. Cloud9"
                  />
                  {createErrors.name && (
                    <div className="invalid-feedback">{createErrors.name}</div>
                  )}
                </div>
                <div className="col-md-4">
                  <label htmlFor="team-tag" className="form-label">
                    Tag
                  </label>
                  <input
                    id="team-tag"
                    type="text"
                    className={`form-control ${createErrors.tag ? 'is-invalid' : ''}`}
                    value={createTag}
                    onChange={(e) => setCreateTag(e.target.value)}
                    maxLength={10}
                    placeholder="e.g. C9"
                  />
                  {createErrors.tag && (
                    <div className="invalid-feedback">{createErrors.tag}</div>
                  )}
                  <div className="form-text">Max 10 characters.</div>
                </div>
              </div>
              <div className="mt-3">
                <button
                  type="submit"
                  className="btn btn-success"
                  disabled={createBusy}
                >
                  {createBusy ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-1" />
                      Creating…
                    </>
                  ) : (
                    'Create Team'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Loading / Empty ─────────────────────────────────── */}
      {loading && (
        <div className="text-center py-5">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading…</span>
          </div>
          <p className="text-muted mt-2 mb-0">Loading teams…</p>
        </div>
      )}

      {!loading && teams.length === 0 && (
        <div className="alert alert-secondary text-center">
          You aren’t in any teams yet. Create one to get started.
        </div>
      )}

      {/* ── Pending team invites ──────────────────────────── */}
      {!loading && requests.length > 0 && (
        <div className="card mb-4 border-warning">
          <div className="card-header d-flex justify-content-between align-items-center">
            <strong>Team Invites</strong>
            <span className="badge bg-warning text-dark">{requests.length}</span>
          </div>
          <ul className="list-group list-group-flush">
            {requests.map((r) => (
              <li
                key={r.id}
                className="list-group-item d-flex justify-content-between align-items-center"
              >
                <div>
                  <strong>{r.team_name}</strong>
                  <span className="badge bg-info ms-2">{r.role}</span>
                  <div className="small text-muted">
                    Invited as {r.user.username || r.user.email}
                  </div>
                </div>
                <div className="d-flex gap-1">
                  <button
                    className="btn btn-sm btn-success"
                    disabled={requestsBusyId === r.id}
                    onClick={() => void handleAccept(r.id)}
                  >
                    Accept
                  </button>
                  <button
                    className="btn btn-sm btn-outline-secondary"
                    disabled={requestsBusyId === r.id}
                    onClick={() => void handleDecline(r.id)}
                  >
                    Decline
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* ── Owned teams (full controls) ───────────────────── */}
      {!loading && ownedTeams.length > 0 && <h4 className="mt-2">My Teams</h4>}
      {!loading && ownedTeams.map((team) => renderTeamCard(team, true))}

      {/* ── Teams I'm a member of (view only) ─────────────── */}
      {!loading && memberTeams.length > 0 && (
        <h4 className="mt-4">Teams I’m In</h4>
      )}
      {!loading && memberTeams.map((team) => renderTeamCard(team, false))}
    </div>
  );
}
