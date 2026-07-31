import axios, { AxiosInstance, InternalAxiosRequestConfig } from 'axios';
import { ENV } from '../config/env';
import { getAccessToken, getRefreshToken, setTokens, clearTokens } from './storage';
import type { ApiResponse, LoginResponse } from '../types';

let onForceLogout: (() => void) | null = null;

export function setLogoutHandler(fn: () => void): void {
  onForceLogout = fn;
}

const API_URL: string = ENV.API_URL;

const api: AxiosInstance = axios.create({
  baseURL: API_URL,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use(async (config: InternalAxiosRequestConfig) => {
  const token = await getAccessToken();
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

let isRefreshing = false;
let failedQueue: { resolve: (token: string) => void; reject: (err: unknown) => void }[] = [];

function processQueue(error: unknown, token: string | null) {
  failedQueue.forEach((prom) => {
    if (error || !token) prom.reject(error);
    else prom.resolve(token);
  });
  failedQueue = [];
}

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (error.response?.status !== 401 || originalRequest._retry) {
      return Promise.reject(error);
    }

    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        failedQueue.push({
          resolve: (token: string) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            resolve(api(originalRequest));
          },
          reject,
        });
      });
    }

    originalRequest._retry = true;
    isRefreshing = true;

    try {
      const refreshToken = await getRefreshToken();
      if (!refreshToken) throw new Error("Refresh token yo'q");

      const { data } = await axios.post<ApiResponse<LoginResponse>>(
        `${api.defaults.baseURL}/auth/yangilash`,
        { refresh_token: refreshToken },
      );

      if (!data.ok || !data.data?.access_token) throw new Error('Refresh muvaffaqiyatsiz');

      const newAccess = data.data.access_token;
      const newRefresh = data.data.refresh_token || refreshToken;
      await setTokens(newAccess, newRefresh);

      processQueue(null, newAccess);
      originalRequest.headers.Authorization = `Bearer ${newAccess}`;
      return api(originalRequest);
    } catch (refreshError) {
      processQueue(refreshError, null);
      await clearTokens();
      onForceLogout?.();
      return Promise.reject(refreshError);
    } finally {
      isRefreshing = false;
    }
  },
);

export default api;
