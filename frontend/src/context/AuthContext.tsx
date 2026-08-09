import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import type { ReactNode } from 'react';
import api from '../api/client';
import type { User, ApiEnvelope, AuthTokens } from '../api/types';

/** Shape of the /auth/login/ and /auth/register/ response data. */
interface AuthResponse {
  user: User;
  tokens: AuthTokens;
}

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (
    email: string,
    username: string,
    password: string,
    passwordConfirm: string,
  ) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  /** Fetch the current user from /auth/me/ using the stored token. */
  const fetchUser = useCallback(async () => {
    try {
      const res = await api.get<ApiEnvelope<User>>('/auth/me/');
      setUser(res.data.data);
    } catch {
      // Token invalid or expired — clear state silently.
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      setUser(null);
    }
  }, []);

  // On mount, if a token exists, try to hydrate the user.
  useEffect(() => {
    const token = localStorage.getItem('access_token');
    if (!token) {
      setLoading(false);
      return;
    }
    fetchUser().finally(() => setLoading(false));
  }, [fetchUser]);

  const login = async (email: string, password: string) => {
    const res = await api.post<ApiEnvelope<AuthResponse>>(
      '/auth/login/',
      { email, password },
    );
    const { user: userData, tokens } = res.data.data;
    localStorage.setItem('access_token', tokens.access);
    localStorage.setItem('refresh_token', tokens.refresh);
    setUser(userData);
  };

  const register = async (
    email: string,
    username: string,
    password: string,
    passwordConfirm: string,
  ) => {
    await api.post<ApiEnvelope<AuthResponse>>('/auth/register/', {
      email,
      username,
      password,
      password_confirm: passwordConfirm,
    });
    // Auto-login after successful registration.
    await login(email, password);
  };

  const logout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

/** Hook to consume the auth context. Must be used inside <AuthProvider>. */
export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an <AuthProvider>');
  }
  return ctx;
}
