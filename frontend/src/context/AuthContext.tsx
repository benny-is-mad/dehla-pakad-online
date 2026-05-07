'use client';

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from 'react';
import { api } from '@/lib/api';

interface User {
  _id: string;
  username: string;
  email: string;
  avatar: string | null;
  elo: number;
  stats: {
    gamesPlayed: number;
    gamesWon: number;
    gamesLost: number;
    kotsWon: number;
  };
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (username: string, email: string, password: string) => Promise<void>;
  logout: () => void;
  setTokenAndUser: (token: string, user: User) => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem('dp_token');
    if (stored) {
      setToken(stored);
      api
        .get<{ user: User }>('/api/auth/me')
        .then(({ user }) => setUser(user))
        .catch(() => {
          localStorage.removeItem('dp_token');
          setToken(null);
        })
        .finally(() => setIsLoading(false));
    } else {
      setIsLoading(false);
    }
  }, []);

  const setTokenAndUser = useCallback((t: string, u: User) => {
    localStorage.setItem('dp_token', t);
    setToken(t);
    setUser(u);
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const { token: t, user: u } = await api.post<{ token: string; user: User }>(
      '/api/auth/login',
      { email, password }
    );
    setTokenAndUser(t, u);
  }, [setTokenAndUser]);

  const register = useCallback(
    async (username: string, email: string, password: string) => {
      const { token: t, user: u } = await api.post<{ token: string; user: User }>(
        '/api/auth/register',
        { username, email, password }
      );
      setTokenAndUser(t, u);
    },
    [setTokenAndUser]
  );

  const logout = useCallback(() => {
    localStorage.removeItem('dp_token');
    setToken(null);
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{ user, token, isLoading, login, register, logout, setTokenAndUser }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
