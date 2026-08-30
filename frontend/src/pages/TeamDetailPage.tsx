import { useEffect, useCallback, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  addMember,
  deleteTeam,
  getTeam,
  removeMember,
  type Team,
} from '../api/teams';
import { handleAxiosError } from '../api/tournaments';
import LoadingSpinner from '../components/LoadingSpinner';

// ---------------------------------------------------------------------------
// TeamDetailPage (Day 16 spec) — single team with members management.
// ---------------------------------------------------------------------------

export default function TeamDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const teamId = Number(id);

  const [team, setTeam] = useState<Team | null>(null);
  const [loading, setLoading] = useState(true);
  const [alert, setAlert] = useState<{ type: 'success' | 'danger'; text: string } | null>(null);

  const [memberUserId, setMemberUserId] = useState('');
  const [memberRole, setMemberRole] = useState<'captain' | 'member'>('member');
  const [busy, setBusy] = useState(false);

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
    const uid = parseInt(memberUserId, 10);
    if (isNaN(uid) || uid <= 0) {
      setAlert({ type: 'danger', text: 'Please enter a valid positive user ID.' });
      return;
    }
    setBusy(true);
    try {
      await addMember(teamId, uid, memberRole);
      setAlert({ type: 'success', text: 'Member added.' });
      setMemberUserId('');
      await fetchTeam();
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

  async function handleDelete() {
    if (!team || !window.confirm(`Delete team "${team.name}"? This cannot be undone.`)) return;
    try {
      await deleteTeam(team.id);
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
        <button className="btn btn-sm btn-outline-danger" onClick={() => void handleDelete()}>
          Delete
        </button>
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
              <th aria-label="Actions" />
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
                  <button
                    className="btn btn-sm btn-outline-danger"
                    onClick={() => void handleRemoveMember(m.user.id, m.user.username)}
                  >
                    Remove
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <div className="card mt-4">
        <div className="card-header">
          <strong>Add Member</strong>
        </div>
        <div className="card-body">
          <form onSubmit={(e) => void handleAddMember(e)} noValidate>
            <div className="row g-2 align-items-end">
              <div className="col-auto">
                <label className="form-label small" htmlFor="detail-member-uid">
                  User ID
                </label>
                <input
                  id="detail-member-uid"
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
                <label className="form-label small" htmlFor="detail-member-role">
                  Role
                </label>
                <select
                  id="detail-member-role"
                  className="form-select form-select-sm"
                  value={memberRole}
                  onChange={(e) =>
                    setMemberRole(e.target.value === 'captain' ? 'captain' : 'member')
                  }
                >
                  <option value="member">Member</option>
                  <option value="captain">Captain</option>
                </select>
              </div>
              <div className="col-auto">
                <button type="submit" className="btn btn-sm btn-success" disabled={busy}>
                  {busy ? <span className="spinner-border spinner-border-sm" /> : 'Add'}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
