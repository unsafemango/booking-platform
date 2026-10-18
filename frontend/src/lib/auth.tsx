import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { api, tokenStore } from './api.ts';
import { tokenExpiresAt } from './jwt.ts';
import type { AuthResponse, User } from '../types.ts';

const USER_KEY = 'booking.user';

// setTimeout overflows above this delay and would fire immediately.
const MAX_TIMEOUT_MS = 2_147_483_647;

export interface AuthContextValue {
  user: User | null;
  /** When the current session token expires, in epoch milliseconds, if it says. */
  expiresAt: number | null;
  login: (email: string, password: string) => Promise<User>;
  register: (name: string, email: string, password: string) => Promise<User>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function loadUser(): User | null {
  try {
    const token = tokenStore.get();
    const stored = localStorage.getItem(USER_KEY);
    if (!token || !stored) return null;
    const expiresAt = tokenExpiresAt(token);
    if (expiresAt !== null && expiresAt <= Date.now()) {
      tokenStore.clear();
      localStorage.removeItem(USER_KEY);
      return null;
    }
    return JSON.parse(stored) as User;
  } catch {
    return null;
  }
}

function currentExpiry(): number | null {
  const token = tokenStore.get();
  return token ? tokenExpiresAt(token) : null;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(loadUser);
  const [expiresAt, setExpiresAt] = useState<number | null>(currentExpiry);

  const accept = useCallback(({ token, user }: AuthResponse): User => {
    tokenStore.set(token);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
    setUser(user);
    setExpiresAt(tokenExpiresAt(token));
    return user;
  }, []);

  const logout = useCallback(() => {
    tokenStore.clear();
    localStorage.removeItem(USER_KEY);
    setUser(null);
    setExpiresAt(null);
  }, []);

  useEffect(() => {
    window.addEventListener('auth:expired', logout);
    return () => window.removeEventListener('auth:expired', logout);
  }, [logout]);

  // Log out as soon as the token's exp passes, instead of waiting for a 401.
  useEffect(() => {
    if (!user || expiresAt === null) return;
    const delay = expiresAt - Date.now();
    if (delay > MAX_TIMEOUT_MS) return;
    const timer = window.setTimeout(logout, Math.max(0, delay));
    return () => window.clearTimeout(timer);
  }, [user, expiresAt, logout]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      expiresAt: user ? expiresAt : null,
      login: (email, password) =>
        api<AuthResponse>('/api/auth/login', { method: 'POST', body: { email, password } }).then(
          accept,
        ),
      register: (name, email, password) =>
        api<AuthResponse>('/api/auth/register', {
          method: 'POST',
          body: { name, email, password },
        }).then(accept),
      logout,
    }),
    [user, expiresAt, accept, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
