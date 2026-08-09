import api from './client';
import type { ApiEnvelope, User } from './types';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type TournamentStatus =
  | 'draft'
  | 'registration_open'
  | 'in_progress'
  | 'completed';

export interface Tournament {
  id: number;
  name: string;
  game: string;
  format: string;
  status: TournamentStatus;
  max_teams: number;
  start_date: string | null;
  end_date: string | null;
  prize_pool: string | null;
  rules: string | null;
  created_by: User;
  registration_count: number;
  created_at: string;
}

export interface TournamentCreatePayload {
  name: string;
  game: string;
  format?: string;
  status?: string;
  max_teams: number;
  start_date?: string | null;
  end_date?: string | null;
  prize_pool?: string;
  rules?: string;
}

export interface Registration {
  id: number;
  tournament: number;
  team: number;
  team_name: string;
  status: string;
  registered_at: string;
}

export interface Match {
  id: number;
  tournament: number;
  round: number;
  position: number;
  team1: number | null;
  team1_name: string | null;
  team2: number | null;
  team2_name: string | null;
  winner: number | null;
  winner_name: string | null;
  is_bye: boolean;
  status: string;
  bracket_round_label: string;
  team1_score: number | null;
  team2_score: number | null;
  scheduled_at: string | null;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function unwrap<T>(res: { data: ApiEnvelope<T> }): T {
  return res.data.data;
}

// ---------------------------------------------------------------------------
// API functions
// ---------------------------------------------------------------------------

/** List all tournaments (no pagination). */
export async function listTournaments(): Promise<Tournament[]> {
  const res = await api.get<ApiEnvelope<Tournament[]>>('/tournaments/');
  return unwrap(res);
}

/** Create a new tournament. */
export async function createTournament(
  payload: TournamentCreatePayload,
): Promise<Tournament> {
  const res = await api.post<ApiEnvelope<Tournament>>('/tournaments/', payload);
  return unwrap(res);
}

/** Get a single tournament by ID. */
export async function getTournament(id: number): Promise<Tournament> {
  const res = await api.get<ApiEnvelope<Tournament>>(`/tournaments/${id}/`);
  return unwrap(res);
}

/** Open registration for a tournament (draft → registration_open). */
export async function openRegistration(id: number): Promise<Tournament> {
  const res = await api.post<ApiEnvelope<Tournament>>(
    `/tournaments/${id}/open-registration/`,
  );
  return unwrap(res);
}

/** Close registration for a tournament (registration_open → in_progress). */
export async function closeRegistration(id: number): Promise<Tournament> {
  const res = await api.post<ApiEnvelope<Tournament>>(
    `/tournaments/${id}/close-registration/`,
  );
  return unwrap(res);
}

/** Register a team for a tournament. Returns a Registration. */
export async function registerTeam(
  tournamentId: number,
  teamId: number,
): Promise<Registration> {
  const res = await api.post<ApiEnvelope<Registration>>(
    `/tournaments/${tournamentId}/register-team/`,
    { team_id: teamId },
  );
  return unwrap(res);
}

/** Get all matches for a tournament. */
export async function getTournamentMatches(id: number): Promise<Match[]> {
  const res = await api.get<ApiEnvelope<Match[]>>(`/tournaments/${id}/matches/`);
  return unwrap(res);
}

// ---------------------------------------------------------------------------
// Inline team fetching (for register-team dropdown)
// ---------------------------------------------------------------------------

/** Lightweight team shape for the register dropdown. */
export interface TeamOption {
  id: number;
  name: string;
}

/** Fetch the current user's teams (inline, no api/teams.ts dependency). */
export async function listMyTeams(): Promise<TeamOption[]> {
  const res = await api.get<ApiEnvelope<TeamOption[]>>('/teams/');
  return unwrap(res);
}

// ---------------------------------------------------------------------------
// Error helper
// ---------------------------------------------------------------------------

/** Extract a human-readable message from an Axios error. */
export function handleAxiosError(err: unknown): string {
  if (
    typeof err === 'object' &&
    err !== null &&
    'response' in err
  ) {
    const axiosErr = err as {
      response?: { data?: { message?: string } };
      message?: string;
    };
    return axiosErr.response?.data?.message ?? axiosErr.message ?? 'Unknown error';
  }
  if (err instanceof Error) return err.message;
  return 'Unknown error';
}
