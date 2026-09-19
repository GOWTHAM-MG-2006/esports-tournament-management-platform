import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  listTournaments,
  listMyTournaments,
  listOpenForRegistration,
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

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

type Tab = 'my' | 'open';

export default function TournamentsPage() {
  const { user } = useAuth();
  const isOrganizerOrAdmin = user?.role === 'organizer' || user?.role === 'admin';

  const [activeTab, setActiveTab] = useState<Tab>(isOrganizerOrAdmin ? 'my' : 'open');
  const [myTournaments, setMyTournaments] = useState<Tournament[]>([]);
  const [openTournaments, setOpenTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Create form state
  const [showForm, setShowForm] = useState(false);
  const [formName, setFormName] = useState('');
  const [formGame, setFormGame] = useState('');
  const [formMaxTeams, setFormMaxTeams] = useState<number>(16);
  const [formMinMembers, setFormMinMembers] = useState<number>(1);
  const [formMaxMembers, setFormMaxMembers] = useState<number | ''>('');
  const [formStartDate, setFormStartDate] = useState('');
  const [formEndDate, setFormEndDate] = useState('');
  const [formPrizePool, setFormPrizePool] = useState('');
  const [formRules, setFormRules] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // -----------------------------------------------------------------------
  // Data loading
  // -----------------------------------------------------------------------

  const loadMyTournaments = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await listMyTournaments();
      setMyTournaments(data);
    } catch (err) {
      setError(handleAxiosError(err));
    } finally {
      setLoading(false);
    }
  }, []);

  const loadOpenTournaments = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await listOpenForRegistration();
      setOpenTournaments(data);
    } catch (err) {
      setError(handleAxiosError(err));
    } finally {
      setLoading(false);
    }
  }, []);

  const loadAllTournaments = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await listTournaments();
      setMyTournaments(data);
    } catch (err) {
      setError(handleAxiosError(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === 'my') {
      loadMyTournaments();
    } else {
      loadOpenTournaments();
    }
    // Also load all for admin users
    if (user?.role === 'admin') {
      loadAllTournaments();
    }
  }, [activeTab, loadMyTournaments, loadOpenTournaments, loadAllTournaments, user?.role]);

  // -----------------------------------------------------------------------
  // Form handlers
  // -----------------------------------------------------------------------

  const resetForm = () => {
    setFormName('');
    setFormGame('');
    setFormMaxTeams(16);
    setFormMinMembers(1);
    setFormMaxMembers('');
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

    if (
      formMaxMembers !== '' &&
      formMinMembers > Number(formMaxMembers)
    ) {
      setFormError('Min team members cannot exceed max team members.');
      return;
    }

    const payload: TournamentCreatePayload = {
      name: formName.trim(),
      game: formGame.trim(),
      max_teams: formMaxTeams,
      min_team_members: formMinMembers,
    };
    if (formMaxMembers !== '') {
      payload.max_team_members = Number(formMaxMembers);
    }
    if (formStartDate) payload.start_date = formStartDate;
    if (formEndDate) payload.end_date = formEndDate;
    if (formPrizePool.trim()) payload.prize_pool = formPrizePool.trim();
    if (formRules.trim()) payload.rules = formRules.trim();

    try {
      setSubmitting(true);
      await createTournament(payload);
      resetForm();
      setShowForm(false);
      if (activeTab === 'my') {
        await loadMyTournaments();
      }
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
      </div>

      {isOrganizerOrAdmin ? (
        // Organizer/Admin view: Two tabs with full tab interface
        <>
          {/* Tab navigation */}
          <ul className="nav nav-tabs mb-4" id="tournaments-tabs" role="tablist">
            <li className="nav-item" role="presentation">
              <button
                className={`nav-link ${activeTab === 'my' ? 'active' : ''}`}
                id="my-tournaments-tab"
                data-bs-toggle="tab"
                data-bs-target="#my-tournaments"
                type="button"
                role="tab"
                aria-controls="my-tournaments"
                aria-selected={activeTab === 'my'}
                onClick={() => setActiveTab('my')}
              >
                My Tournaments
              </button>
            </li>
            <li className="nav-item" role="presentation">
              <button
                className={`nav-link ${activeTab === 'open' ? 'active' : ''}`}
                id="open-tournaments-tab"
                data-bs-toggle="tab"
                data-bs-target="#open-tournaments"
                type="button"
                role="tab"
                aria-controls="open-tournaments"
                aria-selected={activeTab === 'open'}
                onClick={() => setActiveTab('open')}
              >
                Open for Registration
              </button>
            </li>
          </ul>

          <div className="tab-content" id="tournaments-tab-content">
            {/* My Tournaments Tab */}
            <div
              className={`tab-pane fade ${activeTab === 'my' ? 'show active' : ''}`}
              id="my-tournaments"
              role="tabpanel"
              aria-labelledby="my-tournaments-tab"
            >
              <div className="d-flex justify-content-between align-items-center mb-3">
                <h5 className="mb-0">My Tournaments</h5>
                <button
                  className="btn btn-outline-primary"
                  onClick={() => setShowForm((v) => !v)}
                >
                  {showForm ? 'Cancel' : '+ New Tournament'}
                </button>
              </div>

              {/* Create Form (collapsible, organizers/admins only) */}
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

                        {/* Min Team Members */}
                        <div className="col-md-4">
                          <label className="form-label" htmlFor="t-min-members">
                            Min Team Members Per Team *
                          </label>
                          <input
                            id="t-min-members"
                            type="number"
                            className="form-control"
                            min={1}
                            value={formMinMembers}
                            onChange={(e) => setFormMinMembers(Number(e.target.value))}
                            required
                          />
                        </div>

                        {/* Max Team Members */}
                        <div className="col-md-4">
                          <label className="form-label" htmlFor="t-max-members">
                            Max Team Members Per Team
                          </label>
                          <input
                            id="t-max-members"
                            type="number"
                            className="form-control"
                            min={1}
                            placeholder="No limit"
                            value={formMaxMembers}
                            onChange={(e) =>
                              setFormMaxMembers(
                                e.target.value === '' ? '' : Number(e.target.value),
                              )
                            }
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
              {!loading && !error && myTournaments.length === 0 && (
                <div className="alert alert-info">
                  You haven't created any tournaments yet. Create one to get started.
                </div>
              )}

              {/* Tournament cards */}
              {!loading && !error && myTournaments.length > 0 && (
                <div className="row g-3">
                  {myTournaments.map((t) => (
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

            {/* Open for Registration Tab */}
            <div
              className={`tab-pane fade ${activeTab === 'open' ? 'show active' : ''}`}
              id="open-tournaments"
              role="tabpanel"
              aria-labelledby="open-tournaments-tab"
            >
              <h5 className="mb-3">Open for Registration</h5>

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
              {!loading && !error && openTournaments.length === 0 && (
                <div className="alert alert-info">
                  No tournaments currently open for registration.
                </div>
              )}

              {/* Tournament cards */}
              {!loading && !error && openTournaments.length > 0 && (
                <div className="row g-3">
                  {openTournaments.map((t) => (
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
          </div>
        </>
      ) : (
        // Regular user view: Only "Open for Registration" section (no tabs)
        <>
          <h5 className="mb-3">Tournaments Open for Registration</h5>

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
          {!loading && !error && openTournaments.length === 0 && (
            <div className="alert alert-info">
              No tournaments currently open for registration.
            </div>
          )}

          {/* Tournament cards */}
          {!loading && !error && openTournaments.length > 0 && (
            <div className="row g-3">
              {openTournaments.map((t) => (
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
        </>
      )}
    </div>
  );
}