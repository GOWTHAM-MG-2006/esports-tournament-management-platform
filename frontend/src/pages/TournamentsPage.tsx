import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  listTournaments,
  createTournament,
  handleAxiosError,
} from '../api/tournaments';
import type {
  Tournament,
  TournamentStatus,
  TournamentCreatePayload,
} from '../api/tournaments';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const STATUS_LABELS: Record<TournamentStatus, string> = {
  draft: 'Draft',
  registration_open: 'Registration Open',
  in_progress: 'In Progress',
  completed: 'Completed',
};

const STATUS_BADGES: Record<TournamentStatus, string> = {
  draft: 'bg-secondary',
  registration_open: 'bg-primary',
  in_progress: 'bg-warning text-dark',
  completed: 'bg-success',
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function TournamentsPage() {
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Create form state
  const [showForm, setShowForm] = useState(false);
  const [formName, setFormName] = useState('');
  const [formGame, setFormGame] = useState('');
  const [formMaxTeams, setFormMaxTeams] = useState<number>(16);
  const [formStartDate, setFormStartDate] = useState('');
  const [formEndDate, setFormEndDate] = useState('');
  const [formPrizePool, setFormPrizePool] = useState('');
  const [formRules, setFormRules] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // -----------------------------------------------------------------------
  // Data loading
  // -----------------------------------------------------------------------

  const loadTournaments = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await listTournaments();
      setTournaments(data);
    } catch (err) {
      setError(handleAxiosError(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTournaments();
  }, [loadTournaments]);

  // -----------------------------------------------------------------------
  // Form handlers
  // -----------------------------------------------------------------------

  const resetForm = () => {
    setFormName('');
    setFormGame('');
    setFormMaxTeams(16);
    setFormStartDate('');
    setFormEndDate('');
    setFormPrizePool('');
    setFormRules('');
    setFormError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!formName.trim() || !formGame.trim()) {
      setFormError('Name and game are required.');
      return;
    }

    const payload: TournamentCreatePayload = {
      name: formName.trim(),
      game: formGame.trim(),
      max_teams: formMaxTeams,
    };
    if (formStartDate) payload.start_date = formStartDate;
    if (formEndDate) payload.end_date = formEndDate;
    if (formPrizePool.trim()) payload.prize_pool = formPrizePool.trim();
    if (formRules.trim()) payload.rules = formRules.trim();

    try {
      setSubmitting(true);
      await createTournament(payload);
      resetForm();
      setShowForm(false);
      await loadTournaments();
    } catch (err) {
      setFormError(handleAxiosError(err));
    } finally {
      setSubmitting(false);
    }
  };

  // -----------------------------------------------------------------------
  // Render
  // -----------------------------------------------------------------------

  return (
    <div>
      {/* Header */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2 className="mb-0">Tournaments</h2>
        <button
          className="btn btn-outline-primary"
          onClick={() => setShowForm((v) => !v)}
        >
          {showForm ? 'Cancel' : '+ New Tournament'}
        </button>
      </div>

      {/* Create Form (collapsible) */}
      {showForm && (
        <div className="card mb-4">
          <div className="card-body">
            <h5 className="card-title mb-3">Create Tournament</h5>

            {formError && (
              <div className="alert alert-danger py-2">{formError}</div>
            )}

            <form onSubmit={handleSubmit}>
              <div className="row g-3">
                {/* Name */}
                <div className="col-md-6">
                  <label className="form-label" htmlFor="t-name">
                    Name *
                  </label>
                  <input
                    id="t-name"
                    type="text"
                    className="form-control"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    required
                  />
                </div>

                {/* Game */}
                <div className="col-md-6">
                  <label className="form-label" htmlFor="t-game">
                    Game *
                  </label>
                  <input
                    id="t-game"
                    type="text"
                    className="form-control"
                    value={formGame}
                    onChange={(e) => setFormGame(e.target.value)}
                    required
                  />
                </div>

                {/* Max Teams */}
                <div className="col-md-4">
                  <label className="form-label" htmlFor="t-max">
                    Max Teams *
                  </label>
                  <input
                    id="t-max"
                    type="number"
                    className="form-control"
                    min={2}
                    value={formMaxTeams}
                    onChange={(e) => setFormMaxTeams(Number(e.target.value))}
                    required
                  />
                </div>

                {/* Start Date */}
                <div className="col-md-4">
                  <label className="form-label" htmlFor="t-start">
                    Start Date
                  </label>
                  <input
                    id="t-start"
                    type="date"
                    className="form-control"
                    value={formStartDate}
                    onChange={(e) => setFormStartDate(e.target.value)}
                  />
                </div>

                {/* End Date */}
                <div className="col-md-4">
                  <label className="form-label" htmlFor="t-end">
                    End Date
                  </label>
                  <input
                    id="t-end"
                    type="date"
                    className="form-control"
                    value={formEndDate}
                    onChange={(e) => setFormEndDate(e.target.value)}
                  />
                </div>

                {/* Prize Pool */}
                <div className="col-md-4">
                  <label className="form-label" htmlFor="t-prize">
                    Prize Pool
                  </label>
                  <input
                    id="t-prize"
                    type="text"
                    className="form-control"
                    placeholder="$1,000"
                    value={formPrizePool}
                    onChange={(e) => setFormPrizePool(e.target.value)}
                  />
                </div>

                {/* Rules */}
                <div className="col-md-8">
                  <label className="form-label" htmlFor="t-rules">
                    Rules
                  </label>
                  <textarea
                    id="t-rules"
                    className="form-control"
                    rows={3}
                    value={formRules}
                    onChange={(e) => setFormRules(e.target.value)}
                  />
                </div>
              </div>

              <div className="mt-3">
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={submitting}
                >
                  {submitting ? 'Creating...' : 'Create Tournament'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="text-center py-5">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
        </div>
      )}

      {/* Error */}
      {!loading && error && (
        <div className="alert alert-danger">{error}</div>
      )}

      {/* Empty */}
      {!loading && !error && tournaments.length === 0 && (
        <div className="alert alert-info">
          No tournaments found. Create one to get started.
        </div>
      )}

      {/* Tournament cards */}
      {!loading && !error && tournaments.length > 0 && (
        <div className="row g-3">
          {tournaments.map((t) => (
            <div key={t.id} className="col-md-6 col-lg-4">
              <Link
                to={`/tournaments/${t.id}`}
                className="text-decoration-none"
              >
                <div className="card h-100 shadow-sm tournament-card">
                  <div className="card-body d-flex flex-column">
                    <div className="d-flex justify-content-between align-items-start mb-2">
                      <h5 className="card-title mb-0">{t.name}</h5>
                      <span
                        className={`badge ${STATUS_BADGES[t.status]} text-nowrap`}
                      >
                        {STATUS_LABELS[t.status]}
                      </span>
                    </div>

                    <p className="text-muted mb-2">{t.game}</p>

                    <ul className="list-unstyled small mb-3 flex-grow-1">
                      <li>
                        <strong>Teams:</strong> {t.registration_count} /{' '}
                        {t.max_teams}
                      </li>
                      {t.start_date && (
                        <li>
                          <strong>Start:</strong> {t.start_date}
                        </li>
                      )}
                      {t.end_date && (
                        <li>
                          <strong>End:</strong> {t.end_date}
                        </li>
                      )}
                      {t.prize_pool && (
                        <li>
                          <strong>Prize:</strong> {t.prize_pool}
                        </li>
                      )}
                      <li className="text-muted">
                        <strong>Created by:</strong> {t.created_by.email}
                      </li>
                    </ul>
                  </div>
                </div>
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
