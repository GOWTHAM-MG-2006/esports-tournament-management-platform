import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { deleteUser, listUsers, updateUser } from '../api/users';
import type { AdminUser } from '../api/users';
import {
  deleteTournament,
  handleAxiosError,
  listTournaments,
} from '../api/tournaments';
import type { Tournament, TournamentStatus } from '../api/tournaments';
import { deleteTeam, listTeams } from '../api/teams';
import type { Team } from '../api/teams';
import { listMatches } from '../api/matches';
import type { Match } from '../api/matches';
import LoadingSpinner from '../components/LoadingSpinner';

// ---------------------------------------------------------------------------
// AdminPage — admin-only command center.
// Dark sidebar layout, deliberately distinct from the regular Dashboard and
// organizer views. Everything the Django admin offered (users, tournaments,
// teams, matches) is manageable here; no separate backend admin UI needed.
// ---------------------------------------------------------------------------

type Section = 'overview' | 'users' | 'tournaments' | 'teams' | 'matches';

const SECTIONS: { id: Section; label: string }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'users', label: 'Users' },
  { id: 'tournaments', label: 'Tournaments' },
  { id: 'teams', label: 'Teams' },
  { id: 'matches', label: 'Matches' },
];

const ROLES = ['player', 'organizer', 'admin'];

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

export default function AdminPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  const [section, setSection] = useState<Section>('overview');
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [userSearch, setUserSearch] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);

  // -----------------------------------------------------------------------
  // Data loading
  // -----------------------------------------------------------------------

  const loadAll = async () => {
    setLoading(true);
    setError(null);
    try {
      const [u, t, tm, m] = await Promise.all([
        listUsers(),
        listTournaments(),
        listTeams(),
        listMatches(),
      ]);
      setUsers(u);
      setTournaments(t);
      setTeams(tm);
      setMatches(m);
    } catch (err) {
      setError(handleAxiosError(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isAdmin) return;
    void loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin]);

  const flash = (msg: string) => {
    setNotice(msg);
    window.setTimeout(() => setNotice(null), 4000);
  };

  // -----------------------------------------------------------------------
  // Derived stats
  // -----------------------------------------------------------------------

  const usersByRole = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const u of users) counts[u.role] = (counts[u.role] ?? 0) + 1;
    return counts;
  }, [users]);

  const tournamentsByStatus = useMemo(() => {
    const counts: Partial<Record<TournamentStatus, number>> = {};
    for (const t of tournaments) counts[t.status] = (counts[t.status] ?? 0) + 1;
    return counts;
  }, [tournaments]);

  const filteredUsers = useMemo(() => {
    const q = userSearch.trim().toLowerCase();
    if (!q) return users;
    return users.filter(
      (u) =>
        u.email.toLowerCase().includes(q) ||
        u.username.toLowerCase().includes(q),
    );
  }, [users, userSearch]);

  const tournamentNames = useMemo(() => {
    const map = new Map<number, string>();
    for (const t of tournaments) map.set(t.id, t.name);
    return map;
  }, [tournaments]);

  // -----------------------------------------------------------------------
  // Actions
  // -----------------------------------------------------------------------

  const changeRole = async (target: AdminUser, role: string) => {
    if (role === target.role) return;
    setBusyId(`user-${target.id}`);
    setError(null);
    try {
      const updated = await updateUser(target.id, { role });
      setUsers((prev) => prev.map((u) => (u.id === updated.id ? updated : u)));
      flash(`${updated.email} is now ${updated.role}.`);
    } catch (err) {
      setError(handleAxiosError(err));
    } finally {
      setBusyId(null);
    }
  };

  const toggleActive = async (target: AdminUser) => {
    setBusyId(`user-${target.id}`);
    setError(null);
    try {
      const updated = await updateUser(target.id, { is_active: !target.is_active });
      setUsers((prev) => prev.map((u) => (u.id === updated.id ? updated : u)));
      flash(
        updated.is_active
          ? `${updated.email} activated.`
          : `${updated.email} deactivated.`,
      );
    } catch (err) {
      setError(handleAxiosError(err));
    } finally {
      setBusyId(null);
    }
  };

  const removeUser = async (target: AdminUser) => {
    if (!window.confirm(`Delete user "${target.email}"? All their teams, tournaments and data will be deleted too. This cannot be undone.`)) {
      return;
    }
    setBusyId(`user-${target.id}`);
    setError(null);
    try {
      await deleteUser(target.id);
      setUsers((prev) => prev.filter((u) => u.id !== target.id));
      flash(`User "${target.email}" deleted.`);
    } catch (err) {
      setError(handleAxiosError(err));
    } finally {
      setBusyId(null);
    }
  };

  const removeTournament = async (t: Tournament) => {
    if (!window.confirm(`Delete tournament "${t.name}"? This cannot be undone.`)) {
      return;
    }
    setBusyId(`tournament-${t.id}`);
    setError(null);
    try {
      await deleteTournament(t.id);
      setTournaments((prev) => prev.filter((x) => x.id !== t.id));
      flash(`Tournament "${t.name}" deleted.`);
    } catch (err) {
      setError(handleAxiosError(err));
    } finally {
      setBusyId(null);
    }
  };

  const removeTeam = async (team: Team) => {
    if (!window.confirm(`Delete team "${team.name}"? This cannot be undone.`)) {
      return;
    }
    setBusyId(`team-${team.id}`);
    setError(null);
    try {
      await deleteTeam(team.id);
      setTeams((prev) => prev.filter((x) => x.id !== team.id));
      flash(`Team "${team.name}" deleted.`);
    } catch (err) {
      setError(handleAxiosError(err));
    } finally {
      setBusyId(null);
    }
  };

  // -----------------------------------------------------------------------
  // Guards
  // -----------------------------------------------------------------------

  if (!isAdmin) {
    return (
      <div className="alert alert-danger">
        Access denied — this page requires the <strong>admin</strong> role.
        Your role: <strong>{user?.role ?? 'unknown'}</strong>.
      </div>
    );
  }

  // -----------------------------------------------------------------------
  // Render
  // -----------------------------------------------------------------------

  return (
    <div className="row g-0 rounded overflow-hidden border">
      {/* Sidebar */}
      <div className="col-md-3 col-lg-2 bg-dark text-white p-3 d-flex flex-column" style={{ minHeight: '70vh' }}>
        <h5 className="mb-1">Administration</h5>
        <span className="badge bg-danger align-self-start mb-4">ADMIN</span>
        <div className="nav nav-pills flex-column gap-1">
          {SECTIONS.map((s) => (
            <button
              key={s.id}
              type="button"
              className={`nav-link text-start ${section === s.id ? 'active' : 'text-white'}`}
              onClick={() => setSection(s.id)}
            >
              {s.label}
            </button>
          ))}
        </div>
        <button
          type="button"
          className="btn btn-sm btn-outline-light mt-auto"
          onClick={() => void loadAll()}
        >
          Refresh data
        </button>
      </div>

      {/* Content */}
      <div className="col-md-9 col-lg-10 p-4 bg-light">
        {error && <div className="alert alert-danger">{error}</div>}
        {notice && <div className="alert alert-success">{notice}</div>}

        {loading ? (
          <LoadingSpinner text="Loading admin data…" />
        ) : (
          <>
            {section === 'overview' && (
              <>
                <h4 className="mb-3">Overview</h4>
                <div className="row g-3 mb-4">
                  <div className="col-md-3">
                    <div className="card text-center">
                      <div className="card-body">
                        <h3 className="mb-1">{users.length}</h3>
                        <p className="text-muted mb-0">Users</p>
                      </div>
                    </div>
                  </div>
                  <div className="col-md-3">
                    <div className="card text-center">
                      <div className="card-body">
                        <h3 className="mb-1">{tournaments.length}</h3>
                        <p className="text-muted mb-0">Tournaments</p>
                      </div>
                    </div>
                  </div>
                  <div className="col-md-3">
                    <div className="card text-center">
                      <div className="card-body">
                        <h3 className="mb-1">{teams.length}</h3>
                        <p className="text-muted mb-0">Teams</p>
                      </div>
                    </div>
                  </div>
                  <div className="col-md-3">
                    <div className="card text-center">
                      <div className="card-body">
                        <h3 className="mb-1">{matches.length}</h3>
                        <p className="text-muted mb-0">Matches</p>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="row g-3">
                  <div className="col-md-6">
                    <div className="card">
                      <div className="card-header"><strong>Users by role</strong></div>
                      <ul className="list-group list-group-flush">
                        {Object.entries(usersByRole).map(([role, count]) => (
                          <li key={role} className="list-group-item d-flex justify-content-between">
                            <span className="text-capitalize">{role}</span>
                            <span className="badge bg-primary rounded-pill">{count}</span>
                          </li>
                        ))}
                        {Object.keys(usersByRole).length === 0 && (
                          <li className="list-group-item text-muted">No users yet.</li>
                        )}
                      </ul>
                    </div>
                  </div>
                  <div className="col-md-6">
                    <div className="card">
                      <div className="card-header"><strong>Tournaments by status</strong></div>
                      <ul className="list-group list-group-flush">
                        {Object.entries(tournamentsByStatus).map(([st, count]) => (
                          <li key={st} className="list-group-item d-flex justify-content-between">
                            <span>{STATUS_LABELS[st as TournamentStatus]}</span>
                            <span className="badge bg-primary rounded-pill">{count}</span>
                          </li>
                        ))}
                        {Object.keys(tournamentsByStatus).length === 0 && (
                          <li className="list-group-item text-muted">No tournaments yet.</li>
                        )}
                      </ul>
                    </div>
                  </div>
                </div>
              </>
            )}

            {section === 'users' && (
              <>
                <div className="d-flex justify-content-between align-items-center mb-3">
                  <h4 className="mb-0">Users ({filteredUsers.length})</h4>
                  <input
                    type="search"
                    className="form-control w-auto"
                    placeholder="Search email or username…"
                    value={userSearch}
                    onChange={(e) => setUserSearch(e.target.value)}
                  />
                </div>
                <div className="table-responsive">
                  <table className="table table-striped table-hover align-middle bg-white">
                    <thead>
                      <tr>
                        <th>Email</th>
                        <th>Username</th>
                        <th>Role</th>
                        <th>Status</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredUsers.map((u) => {
                        const isSelf = u.id === user?.id;
                        const busy = busyId === `user-${u.id}`;
                        return (
                          <tr key={u.id} className={isSelf ? 'table-info' : undefined}>
                            <td>{u.email}{isSelf && ' (you)'}</td>
                            <td>{u.username}</td>
                            <td>
                              <select
                                className="form-select form-select-sm"
                                value={u.role}
                                disabled={isSelf || busy}
                                onChange={(e) => void changeRole(u, e.target.value)}
                                aria-label={`Role for ${u.email}`}
                              >
                                {ROLES.map((r) => (
                                  <option key={r} value={r}>{r}</option>
                                ))}
                              </select>
                            </td>
                            <td>
                              <span className={`badge ${u.is_active ? 'bg-success' : 'bg-secondary'}`}>
                                {u.is_active ? 'Active' : 'Inactive'}
                              </span>
                            </td>
                            <td>
                              <div className="d-flex gap-1">
                                <button
                                  type="button"
                                  className={`btn btn-sm ${u.is_active ? 'btn-outline-danger' : 'btn-outline-success'}`}
                                  disabled={isSelf || busy}
                                  onClick={() => void toggleActive(u)}
                                  title={isSelf ? 'You cannot change your own status' : undefined}
                                >
                                  {u.is_active ? 'Deactivate' : 'Activate'}
                                </button>
                                <button
                                  type="button"
                                  className="btn btn-sm btn-danger"
                                  disabled={isSelf || busy}
                                  onClick={() => void removeUser(u)}
                                  title={isSelf ? 'You cannot delete your own account' : `Delete ${u.email}`}
                                >
                                  Delete
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                      {filteredUsers.length === 0 && (
                        <tr><td colSpan={5} className="text-muted">No users found.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </>
            )}

            {section === 'tournaments' && (
              <>
                <h4 className="mb-3">Tournaments ({tournaments.length})</h4>
                <div className="table-responsive">
                  <table className="table table-striped table-hover align-middle bg-white">
                    <thead>
                      <tr>
                        <th>Name</th>
                        <th>Game</th>
                        <th>Status</th>
                        <th>Teams</th>
                        <th>Created by</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {tournaments.map((t) => (
                        <tr key={t.id}>
                          <td>
                            <Link to={`/tournaments/${t.id}`}>{t.name}</Link>
                          </td>
                          <td>{t.game}</td>
                          <td>
                            <span className={`badge ${STATUS_BADGES[t.status]}`}>
                              {STATUS_LABELS[t.status]}
                            </span>
                          </td>
                          <td>{t.registration_count} / {t.max_teams}</td>
                          <td className="text-muted small">{t.created_by.email}</td>
                          <td>
                            <button
                              type="button"
                              className="btn btn-sm btn-outline-danger"
                              disabled={busyId === `tournament-${t.id}`}
                              onClick={() => void removeTournament(t)}
                            >
                              Delete
                            </button>
                          </td>
                        </tr>
                      ))}
                      {tournaments.length === 0 && (
                        <tr><td colSpan={6} className="text-muted">No tournaments yet.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </>
            )}

            {section === 'teams' && (
              <>
                <h4 className="mb-3">Teams ({teams.length})</h4>
                <div className="table-responsive">
                  <table className="table table-striped table-hover align-middle bg-white">
                    <thead>
                      <tr>
                        <th>Name</th>
                        <th>Tag</th>
                        <th>Owner</th>
                        <th>Members</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {teams.map((team) => (
                        <tr key={team.id}>
                          <td>
                            <Link to={`/teams/${team.id}`}>{team.name}</Link>
                          </td>
                          <td>{team.tag}</td>
                          <td className="text-muted small">{team.owner.email}</td>
                          <td>{team.members.length}</td>
                          <td>
                            <button
                              type="button"
                              className="btn btn-sm btn-outline-danger"
                              disabled={busyId === `team-${team.id}`}
                              onClick={() => void removeTeam(team)}
                            >
                              Delete
                            </button>
                          </td>
                        </tr>
                      ))}
                      {teams.length === 0 && (
                        <tr><td colSpan={5} className="text-muted">No teams yet.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </>
            )}

            {section === 'matches' && (
              <>
                <h4 className="mb-3">Matches ({matches.length})</h4>
                <div className="table-responsive">
                  <table className="table table-striped table-hover align-middle bg-white">
                    <thead>
                      <tr>
                        <th>Tournament</th>
                        <th>Round</th>
                        <th>Matchup</th>
                        <th>Score</th>
                        <th>Winner</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {matches.map((m) => (
                        <tr key={m.id}>
                          <td>{tournamentNames.get(m.tournament) ?? `#${m.tournament}`}</td>
                          <td>{m.bracket_round_label || `Round ${m.round}`}</td>
                          <td>{m.team1_name} vs {m.team2_name}</td>
                          <td>{m.team1_score} – {m.team2_score}</td>
                          <td>{m.winner_name || '—'}</td>
                          <td>
                            <span className={`badge ${m.status === 'completed' ? 'bg-success' : m.status === 'bye' ? 'bg-secondary' : 'bg-warning text-dark'}`}>
                              {m.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                      {matches.length === 0 && (
                        <tr><td colSpan={6} className="text-muted">No matches yet.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
