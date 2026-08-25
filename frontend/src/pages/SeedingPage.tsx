import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  getRegistrations,
  getTournament,
  handleAxiosError,
  listTournaments,
  setSeeds,
  type Registration,
  type Tournament,
} from '../api/tournaments';
import LoadingSpinner from '../components/LoadingSpinner';

// ---------------------------------------------------------------------------
// SeedingPage (Day 17 spec) — order registrations before bracket generation.
// Lower seed number = stronger seed (seed 1 faces the weakest team).
// ---------------------------------------------------------------------------

export default function SeedingPage() {
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [regs, setRegs] = useState<Registration[]>([]);
  const [seedInputs, setSeedInputs] = useState<Record<number, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [alert, setAlert] = useState<{ type: 'success' | 'danger' | 'info'; text: string } | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const data = await listTournaments();
        if (!cancelled) setTournaments(data);
      } catch (err: unknown) {
        if (!cancelled) setAlert({ type: 'danger', text: handleAxiosError(err) });
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const fetchRegs = useCallback(async (tournamentId: number) => {
    try {
      setLoading(true);
      setAlert(null);
      const [t, r] = await Promise.all([
        getTournament(tournamentId),
        getRegistrations(tournamentId),
      ]);
      setTournament(t);
      setRegs(r);
      const inputs: Record<number, string> = {};
      for (const reg of r) inputs[reg.id] = reg.seed?.toString() ?? '';
      setSeedInputs(inputs);
    } catch (err: unknown) {
      setAlert({ type: 'danger', text: handleAxiosError(err) });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (selectedId !== null) void fetchRegs(selectedId);
  }, [selectedId, fetchRegs]);

  async function handleSave() {
    if (selectedId === null) return;
    const seeds: Record<number, number | null> = {};
    for (const reg of regs) {
      const raw = (seedInputs[reg.id] ?? '').trim();
      seeds[reg.id] = raw === '' ? null : Number(raw);
    }
    setSaving(true);
    try {
      const updated = await setSeeds(selectedId, seeds);
      setRegs(updated);
      setAlert({ type: 'success', text: 'Seeds saved.' });
    } catch (err: unknown) {
      setAlert({ type: 'danger', text: handleAxiosError(err) });
    } finally {
      setSaving(false);
    }
  }

  const canSeed = tournament?.status === 'registration_open';

  if (loading && tournaments.length === 0) return <LoadingSpinner text="Loading tournaments…" />;

  return (
    <div>
      <h2 className="mb-3">Seeding</h2>

      {alert && <div className={`alert alert-${alert.type}`}>{alert.text}</div>}

      <div className="mb-4">
        <label htmlFor="seeding-tournament-select" className="form-label fw-semibold">
          Select Tournament
        </label>
        <select
          id="seeding-tournament-select"
          className="form-select"
          style={{ maxWidth: 400 }}
          value={selectedId ?? ''}
          onChange={(e) => {
            const val = e.target.value;
            setSelectedId(val ? Number(val) : null);
          }}
        >
          <option value="">— Choose a tournament —</option>
          {tournaments.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name} ({t.status})
            </option>
          ))}
        </select>
      </div>

      {loading && <LoadingSpinner text="Loading registrations…" />}

      {!loading && selectedId !== null && tournament && (
        <>
          {!canSeed && (
            <div className="alert alert-info">
              Seeding can only be edited while registration is open (current status:{' '}
              <strong>{tournament.status}</strong>).
            </div>
          )}
          {regs.length === 0 ? (
            <div className="alert alert-secondary">No registered teams yet.</div>
          ) : (
            <>
              <table className="table table-sm align-middle">
                <thead>
                  <tr>
                    <th>Team</th>
                    <th>Status</th>
                    <th style={{ width: 140 }}>Seed</th>
                  </tr>
                </thead>
                <tbody>
                  {regs.map((reg) => (
                    <tr key={reg.id}>
                      <td>{reg.team_name}</td>
                      <td>
                        <span className="badge bg-success">{reg.status}</span>
                      </td>
                      <td>
                        <input
                          type="number"
                          min={1}
                          className="form-control form-control-sm"
                          value={seedInputs[reg.id] ?? ''}
                          disabled={!canSeed}
                          onChange={(e) =>
                            setSeedInputs((prev) => ({ ...prev, [reg.id]: e.target.value }))
                          }
                          placeholder="—"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {canSeed && (
                <button className="btn btn-primary" onClick={() => void handleSave()} disabled={saving}>
                  {saving ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-1" /> Saving…
                    </>
                  ) : (
                    'Save Seeds'
                  )}
                </button>
              )}
              <div className="mt-3">
                <Link to="/brackets" className="btn btn-sm btn-outline-secondary">
                  Go to Brackets →
                </Link>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
