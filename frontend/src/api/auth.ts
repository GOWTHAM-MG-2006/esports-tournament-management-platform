import api from './client';
import type { ApiEnvelope, AuthTokens, User } from './types';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Shape of the /auth/login/ and /auth/verify-otp/ response data. */
export interface AuthResponse {
  user: User;
  tokens: AuthTokens;
}

/** Shape of the /auth/register/ and /auth/resend-otp/ response data. */
export interface RegisterResponse {
  message: string;
  email: string;
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

/**
 * POST /auth/register/ — creates an inactive user and emails a 6-digit OTP.
 * Returns a message + the email; caller must route to /verify (no tokens yet).
 */
export async function registerRequest(
  email: string,
  username: string,
  password: string,
  passwordConfirm: string,
): Promise<RegisterResponse> {
  const res = await api.post<ApiEnvelope<RegisterResponse>>('/auth/register/', {
    email,
    username,
    password,
    password_confirm: passwordConfirm,
  });
  return unwrap(res);
}

/** POST /auth/verify-otp/ — confirms the code, activates the account, returns user + tokens. */
export async function verifyOtpRequest(
  email: string,
  code: string,
): Promise<AuthResponse> {
  const res = await api.post<ApiEnvelope<AuthResponse>>('/auth/verify-otp/', {
    email,
    code,
  });
  return unwrap(res);
}

/**
 * POST /auth/resend-otp/ — invalidates the current code and emails a fresh one.
 * NOTE: the success text lives on the envelope's top-level `message`
 * (unwrap() would drop it), so it is extracted explicitly here.
 */
export async function resendOtpRequest(
  email: string,
): Promise<RegisterResponse> {
  const res = await api.post('/auth/resend-otp/', { email });
  const raw = res.data as Partial<ApiEnvelope<{ email?: string }>>;
  const message =
    typeof raw?.message === 'string' && raw.message
      ? raw.message
      : 'A new code has been sent to your email.';
  return { message, email: raw?.data?.email ?? email };
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
