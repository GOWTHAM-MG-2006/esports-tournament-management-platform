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

export interface TeamJoinRequest {
  id: number;
  team: number;
  team_name: string;
  user: User;
  role: 'captain' | 'member';
  status: 'pending' | 'accepted' | 'declined';
  created_at: string;
}

export interface Team {
  id: number;
  name: string;
  tag: string;
  owner: User;
  members: TeamMember[];
  pending_requests: TeamJoinRequest[];
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

/** List all teams the current user owns or is a member of. */
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

/**
 * Invite a player to a team by email address.
 * Creates a pending join request — the player must accept it.
 */
export async function addMember(
  teamId: number,
  email: string,
  role: 'captain' | 'member' = 'member',
): Promise<TeamJoinRequest> {
  const res = await api.post<ApiEnvelope<TeamJoinRequest>>(
    `/teams/${teamId}/add-member/`,
    { email, role },
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

/** Leave a team. Members only — owners get a 400. */
export async function leaveTeam(teamId: number): Promise<void> {
  await api.post(`/teams/${teamId}/leave/`);
}

/** List the current user's pending team invites. */
export async function getMyRequests(): Promise<TeamJoinRequest[]> {
  const res = await api.get<ApiEnvelope<TeamJoinRequest[]>>('/teams/requests/');
  return unwrapList<TeamJoinRequest>(res);
}

/** Accept a team invite. Returns the new TeamMember. */
export async function acceptRequest(requestId: number): Promise<TeamMember> {
  const res = await api.post<ApiEnvelope<TeamMember>>(
    `/teams/requests/${requestId}/accept/`,
  );
  return unwrap(res);
}

/** Decline a team invite. */
export async function declineRequest(requestId: number): Promise<void> {
  await api.post(`/teams/requests/${requestId}/decline/`);
}

/** Cancel (revoke) a pending invite. Team owner only. */
export async function cancelRequest(requestId: number): Promise<void> {
  await api.delete(`/teams/requests/${requestId}/`);
}
