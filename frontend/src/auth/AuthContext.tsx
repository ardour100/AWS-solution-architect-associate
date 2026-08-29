import { useCallback, useMemo, useState, type ReactNode } from 'react';
import { api, setToken } from '../api/client';
import type { AuthResult, PublicUser } from '../api/types';
import { AuthContext } from './context';

const USER_KEY = 'auth.user';

function readStoredUser(): PublicUser | null {
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as PublicUser;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<PublicUser | null>(readStoredUser);

  const applyAuth = useCallback((result: AuthResult) => {
    setToken(result.token);
    localStorage.setItem(USER_KEY, JSON.stringify(result.user));
    setUser(result.user);
  }, []);

  const login = useCallback(
    async (email: string, password: string) => {
      applyAuth(await api<AuthResult>('/auth/login', { method: 'POST', body: { email, password } }));
    },
    [applyAuth],
  );

  const register = useCallback(
    async (email: string, password: string) => {
      applyAuth(await api<AuthResult>('/auth/register', { method: 'POST', body: { email, password } }));
    },
    [applyAuth],
  );

  const logout = useCallback(() => {
    setToken(null);
    localStorage.removeItem(USER_KEY);
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({ user, isAdmin: user?.role === 'admin', login, register, logout }),
    [user, login, register, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
