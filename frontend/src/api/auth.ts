import api from './client';
import type { ApiEnvelope, AuthTokens, User } from './types';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Shape of the /auth/login/ and /auth/register/ response data. */
export interface AuthResponse {
  user: User;
  tokens: AuthTokens;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Unwrap the API envelope, tolerating bare data. */
function unwrap<T>(res: { data: ApiEnvelope<T> | T }): T {
  const raw = res.data as ApiEnvelope<T>;
  if (raw && typeof raw === 'object' && 'data' in raw) {
    return raw.data;
  }
  return res.data as T;
}

// ---------------------------------------------------------------------------
// API functions (Day 13 spec: dedicated auth module)
// ---------------------------------------------------------------------------

/** POST /auth/login/ — returns user + tokens. */
export async function loginRequest(
  email: string,
  password: string,
): Promise<AuthResponse> {
  const res = await api.post<ApiEnvelope<AuthResponse>>('/auth/login/', {
    email,
    password,
  });
  return unwrap(res);
}

/** POST /auth/register/ — creates the user (caller logs in after). */
export async function registerRequest(
  email: string,
  username: string,
  password: string,
  passwordConfirm: string,
): Promise<void> {
  await api.post('/auth/register/', {
    email,
    username,
    password,
    password_confirm: passwordConfirm,
  });
}

/** GET /auth/me/ — current user for the stored token. */
export async function fetchMe(): Promise<User> {
  const res = await api.get<ApiEnvelope<User>>('/auth/me/');
  return unwrap(res);
}

/** POST /auth/logout/ — blacklist the refresh token (best-effort). */
export async function logoutRequest(): Promise<void> {
  const refresh = localStorage.getItem('refresh_token');
  if (!refresh) return;
  try {
    await api.post('/auth/logout/', { refresh });
  } catch {
    // Logout is best-effort — token expiry covers failures.
  }
}
