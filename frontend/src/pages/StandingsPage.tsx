import { useEffect, useState, useCallback } from 'react';
import {
  getTournamentMatches,
  handleAxiosError,
  listTournaments,
  type Match,
  type Tournament,
} from '../api/tournaments';
import LoadingSpinner from '../components/LoadingSpinner';

// ---------------------------------------------------------------------------
// StandingsPage (Day 18 spec) — derived from completed matches.
// Wins/losses per team; sorted by wins desc, then losses asc.
// ---------------------------------------------------------------------------

interface StandingRow {
  teamId: number;
  teamName: string;
  wins: number;
  losses: number;
  played: number;
}

function computeStandings(matches: Match[]): StandingRow[] {
  const table = new Map<number, StandingRow>();
  const ensure = (id: number | null, name: string | null): StandingRow | null => {
    if (id === null) return null;
    let row = table.get(id);
    if (!row) {
      row = { teamId: id, teamName: name ?? `Team ${id}`, wins: 0, losses: 0, played: 0 };
      table.set(id, row);
    }
    return row;
  };
  for (const m of matches) {
    if (m.status !== 'completed' || m.winner === null) continue;
    const t1 = ensure(m.team1, m.team1_name);
    const t2 = ensure(m.team2, m.team2_name);
    if (t1) t1.played += 1;
    if (t2) t2.played += 1;
    const winnerRow = table.get(m.winner);
    if (winnerRow) winnerRow.wins += 1;
    const loserId = m.winner === m.team1 ? m.team2 : m.team1;
    if (loserId !== null) {
      const loserRow = table.get(loserId);
      if (loserRow) loserRow.losses += 1;
    }
  }
  return [...table.values()]
    .filter((r) => r.played > 0)
    .sort((a, b) => b.wins - a.wins || a.losses - b.losses || a.teamName.localeCompare(b.teamName));
}

export default function StandingsPage() {
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [rows, setRows] = useState<StandingRow[]>([]);
  const [loadingTournaments, setLoadingTournaments] = useState(true);
  const [loadingStandings, setLoadingStandings] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoadingTournaments(true);
        const data = await listTournaments();
        if (!cancelled) setTournaments(data);
      } catch (err: unknown) {
        if (!cancelled) setError(handleAxiosError(err));
      } finally {
        if (!cancelled) setLoadingTournaments(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const fetchStandings = useCallback(async (tournamentId: number) => {
    try {
      setLoadingStandings(true);
      setError(null);
      const matches = await getTournamentMatches(tournamentId);
      setRows(computeStandings(matches));
    } catch (err: unknown) {
      setError(handleAxiosError(err));
      setRows([]);
    } finally {
      setLoadingStandings(false);
    }
  }, []);

  useEffect(() => {
    if (selectedId !== null) void fetchStandings(selectedId);
  }, [selectedId, fetchStandings]);

  return (
    <div>
      <h2 className="mb-3">Standings</h2>

      <div className="mb-4">
        <label htmlFor="standings-tournament-select" className="form-label fw-semibold">
          Select Tournament
        </label>
        {loadingTournaments ? (
          <LoadingSpinner text="Loading tournaments…" />
        ) : (
          <select
            id="standings-tournament-select"
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
        )}
      </div>

      {error && <div className="alert alert-danger">{error}</div>}
      {loadingStandings && <LoadingSpinner text="Computing standings…" />}

      {!loadingStandings && selectedId !== null && !error && (
        rows.length === 0 ? (
          <div className="alert alert-info">
            No completed matches yet — standings will appear once results are submitted.
          </div>
        ) : (
          <table className="table table-striped align-middle">
            <thead>
              <tr>
                <th>#</th>
                <th>Team</th>
                <th>Played</th>
                <th>Wins</th>
                <th>Losses</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, idx) => (
                <tr key={row.teamId}>
                  <td>{idx + 1}</td>
                  <td className="fw-semibold">{row.teamName}</td>
                  <td>{row.played}</td>
                  <td>
                    <span className="badge bg-success">{row.wins}</span>
                  </td>
                  <td>
                    <span className="badge bg-secondary">{row.losses}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )
      )}
    </div>
  );
}
