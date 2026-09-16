import api from './client';
import type { ApiEnvelope, User } from './types';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Admin user row (extends the public user with the activation flag). */
export interface AdminUser extends User {
  is_active: boolean;
}

export interface UserUpdatePayload {
  role?: string;
  is_active?: boolean;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function unwrap<T>(res: { data: ApiEnvelope<T> | T }): T {
  const raw = res.data as ApiEnvelope<T>;
  if (raw && typeof raw === 'object' && 'data' in raw) {
    return raw.data;
  }
  return res.data as T;
}

// ---------------------------------------------------------------------------
// API functions (admin only)
// ---------------------------------------------------------------------------

/** GET /auth/users/ — list all users, optionally filtered by ?search=. */
export async function listUsers(search?: string): Promise<AdminUser[]> {
  const res = await api.get<ApiEnvelope<AdminUser[]>>('/auth/users/', {
    params: search ? { search } : {},
  });
  return unwrap(res);
}

/** PATCH /auth/users/:id/ — change role and/or active flag. */
export async function updateUser(
  id: number,
  payload: UserUpdatePayload,
): Promise<AdminUser> {
  const res = await api.patch<ApiEnvelope<AdminUser>>(
    `/auth/users/${id}/`,
    payload,
  );
  return unwrap(res);
}

/** DELETE /auth/users/:id/ — delete a user and all their data (cascades). */
export async function deleteUser(id: number): Promise<void> {
  await api.delete(`/auth/users/${id}/`);
}
