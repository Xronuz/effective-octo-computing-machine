// XAVFSIZ XONADON — Auth context (React)

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { apiGet, apiPost, setTokens, clearTokens, setLogoutHandler, getAccessToken } from '@/api';
import type { UserBrief, LoginResponse, ApiResponse } from '@/types';

interface AuthState {
  user: UserBrief | null;
  loading: boolean;
  login: (guvohnoma_raqami: string, parol: string) => Promise<string | null>;
  logout: () => void;
  isAuthenticated: boolean;
  isRahbar: boolean;
  isSuperadmin: boolean;
  isXodim: boolean;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserBrief | null>(null);
  const [loading, setLoading] = useState(true);

  const logout = useCallback(() => {
    clearTokens();
    setUser(null);
  }, []);

  // Register logout handler for API client
  useEffect(() => {
    setLogoutHandler(logout);
  }, [logout]);

  // Try restoring session from token
  useEffect(() => {
    const token = getAccessToken();
    if (!token) {
      setLoading(false);
      return;
    }
    apiGet<{ user: UserBrief }>('/auth/men')
      .then((res) => {
        if (res.ok && res.data.user) {
          setUser(res.data.user);
        } else {
          clearTokens();
        }
      })
      .catch(() => clearTokens())
      .finally(() => setLoading(false));
  }, []);

  const login = useCallback(async (guvohnoma_raqami: string, parol: string): Promise<string | null> => {
    const res = await apiPost('/auth/kirish', { guvohnoma_raqami, parol });
    if (!res.ok) {
      return res.xato || 'Kirishda xatolik';
    }
    const data = (res as ApiResponse<LoginResponse>).data;
    setTokens(data.access_token, data.refresh_token);
    setUser(data.user);
    return null;
  }, []);

  const value: AuthState = {
    user,
    loading,
    login,
    logout,
    isAuthenticated: !!user,
    isRahbar: user?.rol === 'rahbar' || user?.rol === 'superadmin',
    isSuperadmin: user?.rol === 'superadmin',
    isXodim: user?.rol === 'xodim',
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be inside AuthProvider');
  return ctx;
}
