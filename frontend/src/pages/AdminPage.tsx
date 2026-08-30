import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { API_BASE } from '../api/client';
import { listMatches } from '../api/matches';
import { handleAxiosError, listTournaments } from '../api/tournaments';
import { listTeams } from '../api/teams';
import LoadingSpinner from '../components/LoadingSpinner';

// ---------------------------------------------------------------------------
// AdminPage (Day 19 spec) — organizer/admin overview.
// Gated client-side by role; server-side RBAC still enforced per endpoint.
// ---------------------------------------------------------------------------

/** Backend root derived from the API base (strips trailing `/api`). */
function backendRoot(): string {
  return API_BASE.replace(/\/api\/?$/, '') || window.location.origin;
}

export default function AdminPage() {
  const { user } = useAuth();
  const [counts, setCounts] = useState({ tournaments: 0, teams: 0, matches: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const isAdmin = user?.role === 'admin' || user?.role === 'organizer';

  useEffect(() => {
    if (!isAdmin) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const [tournaments, teams, matches] = await Promise.all([
          listTournaments(),
          listTeams(),
          listMatches(),
        ]);
        if (!cancelled) {
          setCounts({
            tournaments: tournaments.length,
            teams: teams.length,
            matches: matches.length,
          });
        }
      } catch (err: unknown) {
        if (!cancelled) setError(handleAxiosError(err));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [isAdmin]);

  if (!isAdmin) {
    return (
      <div className="alert alert-danger">
        Access denied — this page requires the <strong>organizer</strong> or{' '}
        <strong>admin</strong> role. Your role: <strong>{user?.role ?? 'unknown'}</strong>.
      </div>
    );
  }

  if (loading) return <LoadingSpinner text="Loading admin overview…" />;

  return (
    <div>
      <h2 className="mb-3">Admin</h2>
      {error && <div className="alert alert-danger">{error}</div>}

      <div className="row g-3 mb-4">
        {[
          { label: 'Tournaments', value: counts.tournaments, to: '/tournaments' },
          { label: 'Teams', value: counts.teams, to: '/teams' },
          { label: 'Matches', value: counts.matches, to: '/matches' },
        ].map((card) => (
          <div className="col-md-4" key={card.label}>
            <div className="card text-center">
              <div className="card-body">
                <h3 className="card-title mb-1">{card.value}</h3>
                <p className="text-muted mb-2">{card.label}</p>
                <Link to={card.to} className="btn btn-sm btn-outline-primary">
                  Manage →
                </Link>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="card">
        <div className="card-header">
          <strong>Backend Admin</strong>
        </div>
        <div className="card-body">
          <p className="text-muted small">
            User management, raw data edits, and permission changes live in the Django
            admin (requires a staff account).
          </p>
          <a
            className="btn btn-sm btn-secondary"
            href={`${backendRoot()}/admin/`}
            target="_blank"
            rel="noreferrer"
          >
            Open Django Admin →
          </a>
        </div>
      </div>
    </div>
  );
}
