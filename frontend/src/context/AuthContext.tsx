import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import type { ReactNode } from 'react';
import { fetchMe, loginRequest, logoutRequest, registerRequest } from '../api/auth';
import type { User } from '../api/types';

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
      setUser(await fetchMe());
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
    const { user: userData, tokens } = await loginRequest(email, password);
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
    await registerRequest(email, username, password, passwordConfirm);
    // Auto-login after successful registration.
    await login(email, password);
  };

  const logout = () => {
    // Best-effort server-side blacklist; always clear local state.
    void logoutRequest().finally(() => {
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      setUser(null);
    });
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
