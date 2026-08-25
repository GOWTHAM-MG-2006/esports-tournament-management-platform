import api from './client';
import type { ApiEnvelope } from './types';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface Match {
  id: number;
  tournament: number;
  round: number;
  position: number;
  team1: number | null;
  team1_name: string;
  team2: number | null;
  team2_name: string;
  winner: number | null;
  winner_name: string;
  is_bye: boolean;
  status: 'scheduled' | 'completed' | 'bye';
  bracket_round_label: string;
  team1_score: string;
  team2_score: string;
  scheduled_at: string | null;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Extract the inner `data` from the API envelope, tolerating double-wrap. */
function unwrap<T>(res: { data: ApiEnvelope<T> | T }): T {
  const envelope = res.data as ApiEnvelope<T>;
  if (envelope && typeof envelope === 'object' && 'data' in envelope) {
    return envelope.data;
  }
  return res.data as T;
}

/** Unwrap a list endpoint, tolerating DRF pagination ({results: [...]}) . */
function unwrapList<T>(res: { data: unknown }): T[] {
  const data = unwrap<T[] | { results: T[] }>(
    res as { data: ApiEnvelope<T[] | { results: T[] }> },
  );
  if (data && typeof data === 'object' && 'results' in data) {
    return (data as { results: T[] }).results;
  }
  return data as T[];
}

// ---------------------------------------------------------------------------
// API functions
// ---------------------------------------------------------------------------

/** List all matches (handles pagination). */
export async function listMatches(): Promise<Match[]> {
  const res = await api.get<ApiEnvelope<Match[]> | Match[]>('/matches/');
  return unwrapList<Match>(res);
}

/** Get a single match by id. */
export async function getMatch(id: number): Promise<Match> {
  const res = await api.get<ApiEnvelope<Match> | Match>(`/matches/${id}/`);
  return unwrap<Match>(res);
}

/** Generate a bracket for a tournament. */
export async function generateBracket(
  tournamentId: number,
): Promise<{ tournament_id: number; matches: Match[] }> {
  const res = await api.post<
    ApiEnvelope<{ tournament_id: number; matches: Match[] }> | { tournament_id: number; matches: Match[] }
  >(`/matches/generate-bracket/${tournamentId}/`);
  return unwrap<{ tournament_id: number; matches: Match[] }>(res);
}

/** Submit a match result. */
export async function submitResult(
  matchId: number,
  winner: number,
  team1Score?: string,
  team2Score?: string,
): Promise<Match> {
  const res = await api.post<ApiEnvelope<Match> | Match>(
    `/matches/${matchId}/submit-result/`,
    {
      winner,
      team1_score: team1Score ?? '',
      team2_score: team2Score ?? '',
    },
  );
  return unwrap<Match>(res);
}
