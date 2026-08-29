import { createContext } from 'react';
import type { PublicUser } from '../api/types';

export interface AuthContextValue {
  user: PublicUser | null;
  isAdmin: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

export const AuthContext = createContext<AuthContextValue | null>(null);
