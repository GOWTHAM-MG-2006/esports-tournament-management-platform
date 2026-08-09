/** Generic API envelope returned by the Django backend. */
export interface ApiEnvelope<T> {
  success: boolean;
  data: T;
  message: string | null;
}

/** Standard DRF pagination shape. */
export interface PagedData<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

/** Minimal user model returned by the auth/me endpoint. */
export interface User {
  id: number;
  email: string;
  username: string;
  role: string;
  date_joined: string;
}

/** JWT token pair. */
export interface AuthTokens {
  access: string;
  refresh: string;
}
