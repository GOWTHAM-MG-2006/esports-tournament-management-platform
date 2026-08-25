import { useEffect, useState } from 'react';
import api, { API_BASE } from '../api/client';
import type { ApiEnvelope } from '../api/types';
import LoadingSpinner from '../components/LoadingSpinner';

// ---------------------------------------------------------------------------
// HealthPage (Day 19 spec) — GET /api/health/ service status.
// ---------------------------------------------------------------------------

interface HealthData {
  status: string;
  db?: string;
}

function unwrapHealth(raw: ApiEnvelope<HealthData> | HealthData): HealthData {
  if (raw && typeof raw === 'object' && 'data' in raw && 'success' in raw) {
    return (raw as ApiEnvelope<HealthData>).data;
  }
  return raw as HealthData;
}

export default function HealthPage() {
  const [health, setHealth] = useState<HealthData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const res = await api.get<ApiEnvelope<HealthData> | HealthData>('/health/');
        if (!cancelled) setHealth(unwrapHealth(res.data));
      } catch (err: unknown) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Health check failed');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  if (loading) return <LoadingSpinner text="Checking service health…" />;

  return (
    <div>
      <h2 className="mb-3">Service Health</h2>
      {error && <div className="alert alert-danger">{error}</div>}
      {health && (
        <div className="card" style={{ maxWidth: 480 }}>
          <div className="card-body">
            <div className="d-flex justify-content-between align-items-center mb-2">
              <span>API status</span>
              <span className={`badge bg-${health.status === 'ok' ? 'success' : 'danger'}`}>
                {health.status}
              </span>
            </div>
            {health.db && (
              <div className="d-flex justify-content-between align-items-center mb-2">
                <span>Database</span>
                <span className={`badge bg-${health.db === 'ok' ? 'success' : 'danger'}`}>
                  {health.db}
                </span>
              </div>
            )}
            <div className="d-flex justify-content-between align-items-center">
              <span>API base</span>
              <code className="small">{API_BASE}</code>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
