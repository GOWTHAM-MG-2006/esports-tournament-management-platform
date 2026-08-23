import api from './client';
import type { ApiEnvelope, User } from './types';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface TeamMember {
  id: number;
  user: User;
  role: 'captain' | 'member';
}

export interface Team {
  id: number;
  name: string;
  tag: string;
  owner: User;
  members: TeamMember[];
  created_at: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Extract the inner `data` from the API envelope, tolerating bare data. */
function unwrap<T>(res: { data: ApiEnvelope<T> | T }): T {
  const raw = res.data as ApiEnvelope<T>;
  if (raw && typeof raw === 'object' && 'data' in raw) {
    return raw.data;
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

/** List all teams owned by the current user. */
export async function listTeams(): Promise<Team[]> {
  const res = await api.get<ApiEnvelope<Team[]>>('/teams/');
  return unwrapList<Team>(res);
}

/** Create a new team. Creator is auto-added as captain. */
export async function createTeam(
  name: string,
  tag: string,
): Promise<Team> {
  const res = await api.post<ApiEnvelope<Team>>('/teams/', { name, tag });
  return unwrap(res);
}

/** Get a single team by id. */
export async function getTeam(id: number): Promise<Team> {
  const res = await api.get<ApiEnvelope<Team>>(`/teams/${id}/`);
  return unwrap(res);
}

/** Delete a team by id (204 no content). */
export async function deleteTeam(id: number): Promise<void> {
  await api.delete<ApiEnvelope<null>>(`/teams/${id}/`);
}

/** Add a member to a team. Returns the new TeamMember. */
export async function addMember(
  teamId: number,
  userId: number,
  role: 'captain' | 'member' = 'member',
): Promise<TeamMember> {
  const res = await api.post<ApiEnvelope<TeamMember>>(
    `/teams/${teamId}/add-member/`,
    { user_id: userId, role },
  );
  return unwrap(res);
}

/** Remove a member from a team. */
export async function removeMember(
  teamId: number,
  userId: number,
): Promise<void> {
  await api.post(`/teams/${teamId}/remove-member/`, { user_id: userId });
}
