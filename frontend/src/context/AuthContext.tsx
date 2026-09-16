import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import type { ReactNode } from 'react';
import { fetchMe, loginRequest, logoutRequest, registerRequest, verifyOtpRequest } from '../api/auth';
import type { User } from '../api/types';

const PENDING_EMAIL_KEY = 'pending_verification_email';

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (
    email: string,
    username: string,
    password: string,
    passwordConfirm: string,
  ) => Promise<string>;
  verifyOtp: (email: string, code: string) => Promise<void>;
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
  ): Promise<string> => {
    // No auto-login: the account is inactive until the email OTP is verified.
    const { email: registeredEmail } = await registerRequest(
      email,
      username,
      password,
      passwordConfirm,
    );
    localStorage.setItem(PENDING_EMAIL_KEY, registeredEmail);
    return registeredEmail;
  };

  const verifyOtp = async (email: string, code: string) => {
    const { user: userData, tokens } = await verifyOtpRequest(email, code);
    localStorage.setItem('access_token', tokens.access);
    localStorage.setItem('refresh_token', tokens.refresh);
    localStorage.removeItem(PENDING_EMAIL_KEY);
    setUser(userData);
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
    <AuthContext.Provider
      value={{ user, loading, login, register, verifyOtp, logout }}
    >
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
