import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api/client';
import type { ApiEnvelope } from '../api/types';

interface PagedCount {
  count: number;
}

export default function DashboardPage() {
  const { user } = useAuth();

  const [tournamentCount, setTournamentCount] = useState<number | null>(null);
  const [matchCount, setMatchCount] = useState<number | null>(null);
  const [statsError, setStatsError] = useState('');

  useEffect(() => {
    const controller = new AbortController();

    async function fetchStats() {
      try {
        const [tRes, mRes] = await Promise.all([
          api.get<ApiEnvelope<PagedCount>>('/tournaments/', { signal: controller.signal }),
          api.get<ApiEnvelope<PagedCount>>('/matches/', { signal: controller.signal }),
        ]);
        setTournamentCount(tRes.data.data.count);
        setMatchCount(mRes.data.data.count);
      } catch (err: unknown) {
        if (controller.signal.aborted) return;
        const axiosErr = err as { response?: { data?: { message?: string } }; message?: string };
        setStatsError(axiosErr.response?.data?.message ?? axiosErr.message ?? 'Failed to load stats');
      }
    }

    fetchStats();
    return () => controller.abort();
  }, []);

  return (
    <div>
      <h2 className="mb-4">
        Welcome{user ? `, ${user.email}` : ''}
      </h2>

      {statsError && (
        <div className="alert alert-warning" role="alert">
          {statsError}
        </div>
      )}

      <div className="row g-3 mb-4">
        <div className="col-md-6">
          <div className="card text-center">
            <div className="card-body">
              <h5 className="card-title text-muted">Tournaments</h5>
              <p className="display-6">
                {tournamentCount === null ? '—' : tournamentCount}
              </p>
            </div>
          </div>
        </div>
        <div className="col-md-6">
          <div className="card text-center">
            <div className="card-body">
              <h5 className="card-title text-muted">Matches</h5>
              <p className="display-6">
                {matchCount === null ? '—' : matchCount}
              </p>
            </div>
          </div>
        </div>
      </div>

      <h4 className="mb-3">Quick Links</h4>
      <div className="row g-3">
        {[
          { to: '/teams', label: 'Teams' },
          { to: '/tournaments', label: 'Tournaments' },
          { to: '/matches', label: 'Matches' },
          { to: '/brackets', label: 'Brackets' },
        ].map((link) => (
          <div className="col-sm-6 col-lg-3" key={link.to}>
            <Link to={link.to} className="text-decoration-none">
              <div className="card h-100">
                <div className="card-body d-flex align-items-center justify-content-center">
                  <h5 className="card-title mb-0">{link.label}</h5>
                </div>
              </div>
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
}
