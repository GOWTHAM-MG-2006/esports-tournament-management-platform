import { useEffect, useCallback, useState } from 'react';
import {
  listTeams,
  createTeam,
  deleteTeam,
  addMember,
  type Team,
} from '../api/teams';

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
  // Data
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);

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
  const [memberUserId, setMemberUserId] = useState('');
  const [memberRole, setMemberRole] = useState<'captain' | 'member'>('member');
  const [addMemberBusy, setAddMemberBusy] = useState(false);

  // -----------------------------------------------------------------------
  // Data fetching
  // -----------------------------------------------------------------------

  const fetchTeams = useCallback(async () => {
    try {
      setLoading(true);
      const data = await listTeams();
      setTeams(data);
    } catch (err: unknown) {
      setAlert({ type: 'danger', text: extractError(err) });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchTeams();
  }, [fetchTeams]);

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
  // Add member
  // -----------------------------------------------------------------------

  function toggleAddMemberForm(teamId: number) {
    setAddMemberTeamId((prev) => (prev === teamId ? null : teamId));
    setMemberUserId('');
    setMemberRole('member');
  }

  async function handleAddMember(teamId: number) {
    const uid = parseInt(memberUserId, 10);
    if (isNaN(uid) || uid <= 0) {
      setAlert({ type: 'danger', text: 'Please enter a valid positive user ID.' });
      return;
    }
    setAddMemberBusy(true);
    try {
      await addMember(teamId, uid, memberRole);
      setAlert({ type: 'success', text: 'Member added.' });
      setAddMemberTeamId(null);
      setMemberUserId('');
      setMemberRole('member');
      await fetchTeams();
    } catch (err: unknown) {
      // Backend 500 for nonexistent user → catch and show generic message
      setAlert({ type: 'danger', text: extractError(err) });
    } finally {
      setAddMemberBusy(false);
    }
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
          You don't own any teams yet. Create one to get started.
        </div>
      )}

      {/* ── Teams list ──────────────────────────────────────── */}
      {!loading &&
        teams.map((team) => (
          <div key={team.id} className="card mb-3">
            <div className="card-header d-flex justify-content-between align-items-center">
              <div>
                <strong className="me-2">{team.name}</strong>
                <span className="badge bg-secondary">{team.tag}</span>
              </div>
              <button
                className="btn btn-sm btn-outline-danger"
                onClick={() => void handleDelete(team)}
              >
                Delete
              </button>
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

              {/* Add member toggle */}
              {addMemberTeamId !== team.id ? (
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
                      <label className="form-label small" htmlFor={`member-uid-${team.id}`}>
                        User ID
                      </label>
                      <input
                        id={`member-uid-${team.id}`}
                        type="number"
                        className="form-control form-control-sm"
                        value={memberUserId}
                        onChange={(e) => setMemberUserId(e.target.value)}
                        placeholder="1"
                        min={1}
                        style={{ width: 100 }}
                      />
                    </div>
                    <div className="col-auto">
                      <label className="form-label small" htmlFor={`member-role-${team.id}`}>
                        Role
                      </label>
                      <select
                        id={`member-role-${team.id}`}
                        className="form-select form-select-sm"
                        value={memberRole}
                        onChange={(e) =>
                          setMemberRole(
                            e.target.value === 'captain' ? 'captain' : 'member',
                          )
                        }
                      >
                        <option value="member">Member</option>
                        <option value="captain">Captain</option>
                      </select>
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
                          'Add'
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
                </div>
              )}
            </div>
          </div>
        ))}
    </div>
  );
}
