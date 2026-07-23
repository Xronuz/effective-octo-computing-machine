// XAVFSIZ XONADON — API client with JWT interceptors

import type { ApiResponse } from '@/types';

const API_BASE = '/api';

let accessToken: string | null = localStorage.getItem('access_token');
let refreshToken: string | null = localStorage.getItem('refresh_token');
let onLogout: (() => void) | null = null;

export function setTokens(access: string, refresh: string) {
  accessToken = access;
  refreshToken = refresh;
  localStorage.setItem('access_token', access);
  localStorage.setItem('refresh_token', refresh);
}

export function clearTokens() {
  accessToken = null;
  refreshToken = null;
  localStorage.removeItem('access_token');
  localStorage.removeItem('refresh_token');
}

export function getAccessToken(): string | null {
  return accessToken;
}

export function setLogoutHandler(fn: () => void) {
  onLogout = fn;
}

async function refreshAccessToken(): Promise<string | null> {
  if (!refreshToken) return null;
  try {
    const res = await fetch(`${API_BASE}/auth/yangilash`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: refreshToken }),
    });
    const json: ApiResponse<{ access_token: string }> = await res.json();
    if (json.ok && json.data.access_token) {
      accessToken = json.data.access_token;
      localStorage.setItem('access_token', json.data.access_token);
      return json.data.access_token;
    }
  } catch {
    // ignore
  }
  clearTokens();
  onLogout?.();
  return null;
}

export async function api<T = unknown>(
  path: string,
  options: RequestInit = {},
  retry = true,
): Promise<ApiResponse<T>> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`;
  }

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });

  // 401 — try refresh
  if (res.status === 401 && retry && refreshToken) {
    const newToken = await refreshAccessToken();
    if (newToken) {
      headers['Authorization'] = `Bearer ${newToken}`;
      const retryRes = await fetch(`${API_BASE}${path}`, { ...options, headers });
      return retryRes.json();
    }
  }

  return res.json();
}

// Convenience methods
export const apiGet = <T>(path: string) => api<T>(path);
export const apiPost = <T>(path: string, body?: unknown) =>
  api<T>(path, { method: 'POST', body: body ? JSON.stringify(body) : undefined });
export const apiPatch = <T>(path: string, body?: unknown) =>
  api<T>(path, { method: 'PATCH', body: body ? JSON.stringify(body) : undefined });
export const apiDelete = <T>(path: string) => api<T>(path, { method: 'DELETE' });
