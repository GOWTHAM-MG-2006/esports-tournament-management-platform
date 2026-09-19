import { useEffect, useCallback, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  addMember,
  deleteTeam,
  getTeam,
  removeMember,
  leaveTeam,
  cancelRequest,
  type Team,
} from '../api/teams';
import { handleAxiosError } from '../api/tournaments';
import { useAuth } from '../context/AuthContext';
import LoadingSpinner from '../components/LoadingSpinner';

// ---------------------------------------------------------------------------
// TeamDetailPage (Day 16 spec) — single team with members management.
// ---------------------------------------------------------------------------

export default function TeamDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const teamId = Number(id);
  const { user } = useAuth();

  const [team, setTeam] = useState<Team | null>(null);
  const [loading, setLoading] = useState(true);
  const [alert, setAlert] = useState<{ type: 'success' | 'danger'; text: string } | null>(null);

  const [memberEmail, setMemberEmail] = useState('');
  const [busy, setBusy] = useState(false);

  // Only the team owner manages the roster; members get a read-only view.
  const isOwner = !!team && !!user && team.owner.id === user.id;

  const fetchTeam = useCallback(async () => {
    if (!teamId) return;
    try {
      setLoading(true);
      setTeam(await getTeam(teamId));
    } catch (err: unknown) {
      setAlert({ type: 'danger', text: handleAxiosError(err) });
    } finally {
      setLoading(false);
    }
  }, [teamId]);

  useEffect(() => {
    void fetchTeam();
  }, [fetchTeam]);

  async function handleAddMember(e: React.FormEvent) {
    e.preventDefault();
    const email = memberEmail.trim();
    if (!email || !email.includes('@')) {
      setAlert({ type: 'danger', text: 'Please enter the player\u2019s email address.' });
      return;
    }
    setBusy(true);
    try {
      await addMember(teamId, email, 'member');
      setMemberEmail('');
      // Best-effort refresh: a refresh failure must not overwrite the
      // confirmed success (the invite was already created server-side).
      try {
        await fetchTeam();
      } catch {
        /* list refreshes on next visit */
      }
      setAlert({ type: 'success', text: 'Invite sent successfully. The player must accept it.' });
    } catch (err: unknown) {
      setAlert({ type: 'danger', text: handleAxiosError(err) });
    } finally {
      setBusy(false);
    }
  }

  async function handleRemoveMember(userId: number, username: string) {
    if (!window.confirm(`Remove ${username} from this team?`)) return;
    try {
      await removeMember(teamId, userId);
      setAlert({ type: 'success', text: 'Member removed.' });
      await fetchTeam();
    } catch (err: unknown) {
      setAlert({ type: 'danger', text: handleAxiosError(err) });
    }
  }

  async function handleRevokeInvite(requestId: number, email: string) {
    if (!window.confirm(`Cancel the pending invite for ${email}?`)) return;
    try {
      await cancelRequest(requestId);
      setAlert({ type: 'success', text: 'Invite cancelled.' });
      await fetchTeam();
    } catch (err: unknown) {
      setAlert({ type: 'danger', text: handleAxiosError(err) });
    }
  }

  async function handleDelete() {
    if (!team || !window.confirm(`Delete team "${team.name}"? This cannot be undone.`)) return;
    try {
      await deleteTeam(team.id);
      void navigate('/teams');
    } catch (err: unknown) {
      setAlert({ type: 'danger', text: handleAxiosError(err) });
    }
  }

  async function handleLeave() {
    if (!team || !window.confirm(`Leave team "${team.name}"?`)) return;
    try {
      await leaveTeam(team.id);
      void navigate('/teams');
    } catch (err: unknown) {
      setAlert({ type: 'danger', text: handleAxiosError(err) });
    }
  }

  if (loading) return <LoadingSpinner text="Loading team…" />;

  if (!team) {
    return (
      <div>
        <Link to="/teams" className="btn btn-sm btn-outline-secondary mb-3">
          ← Back to Teams
        </Link>
        {alert && <div className="alert alert-danger">{alert.text}</div>}
        {!alert && <div className="alert alert-secondary">Team not found.</div>}
      </div>
    );
  }

  return (
    <div>
      <Link to="/teams" className="btn btn-sm btn-outline-secondary mb-3">
        ← Back to Teams
      </Link>

      {alert && (
        <div className={`alert alert-${alert.type} alert-dismissible fade show`} role="alert">
          {alert.text}
          <button type="button" className="btn-close" aria-label="Close" onClick={() => setAlert(null)} />
        </div>
      )}

      <div className="d-flex justify-content-between align-items-center mb-3">
        <h2 className="mb-0">
          {team.name} <span className="badge bg-secondary">{team.tag}</span>
        </h2>
        {isOwner && (
          <button className="btn btn-sm btn-outline-danger" onClick={() => void handleDelete()}>
            Delete
          </button>
        )}
        {!isOwner && (
          <button className="btn btn-sm btn-outline-warning" onClick={() => void handleLeave()}>
            Leave
          </button>
        )}
      </div>

      <div className="row text-muted small mb-3">
        <div className="col-sm-4">
          Owner: <span className="text-body">{team.owner.username || team.owner.email}</span>
        </div>
        <div className="col-sm-4">Members: {team.members.length}</div>
        <div className="col-sm-4">
          Created: {new Date(team.created_at).toLocaleDateString()}
        </div>
      </div>

      <h5>Members</h5>
      {team.members.length === 0 ? (
        <div className="alert alert-secondary">No members yet.</div>
      ) : (
        <table className="table table-sm align-middle">
          <thead>
              <tr>
                <th>User</th>
                <th>Email</th>
                <th>Role</th>
                {isOwner && <th aria-label="Actions" />}
              </tr>
          </thead>
          <tbody>
            {team.members.map((m) => (
              <tr key={m.id}>
                <td>{m.user.username}</td>
                <td>{m.user.email}</td>
                <td>
                  <span className={`badge ${m.role === 'captain' ? 'bg-primary' : 'bg-info'}`}>
                    {m.role}
                  </span>
                </td>
                <td className="text-end">
                  {isOwner && (
                    <button
                      className="btn btn-sm btn-outline-danger"
                      onClick={() => void handleRemoveMember(m.user.id, m.user.username)}
                    >
                      Remove
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {isOwner && (
      <div className="card mt-4">
        <div className="card-header">
          <strong>Invite Member</strong>
        </div>
        <div className="card-body">
          <form onSubmit={(e) => void handleAddMember(e)} noValidate>
            <div className="row g-2 align-items-end">
              <div className="col-auto">
                <label className="form-label small" htmlFor="detail-member-email">
                  Player Email
                </label>
                <input
                  id="detail-member-email"
                  type="email"
                  className="form-control form-control-sm"
                  value={memberEmail}
                  onChange={(e) => setMemberEmail(e.target.value)}
                  placeholder="player@example.com"
                  style={{ width: 220 }}
                />
              </div>
              <div className="col-auto">
                <button type="submit" className="btn btn-sm btn-success" disabled={busy}>
                  {busy ? <span className="spinner-border spinner-border-sm" /> : 'Invite'}
                </button>
              </div>
            </div>
            <div className="form-text mt-2">
              The player receives a join request and must accept it.
            </div>
          </form>
        </div>
      </div>
      )}

      {isOwner && team.pending_requests.length > 0 && (
        <div className="card mt-4 border-warning">
          <div className="card-header">
            <strong>Pending Invites</strong>
          </div>
          <ul className="list-group list-group-flush">
            {team.pending_requests.map((r) => (
              <li
                key={r.id}
                className="list-group-item d-flex justify-content-between align-items-center"
              >
                <div>
                  {r.user.username || r.user.email}
                  <span className="badge bg-info ms-2">{r.role}</span>
                </div>
                <button
                  className="btn btn-sm btn-outline-danger"
                  onClick={() => void handleRevokeInvite(r.id, r.user.email)}
                >
                  Revoke
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
