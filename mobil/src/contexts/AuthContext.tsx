import React, { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import api, { setLogoutHandler } from '../services/api';
import {
  getAccessToken,
  getRefreshToken,
  setTokens,
  clearTokens,
  saveUser,
  getUserJson,
} from '../services/storage';
import { startTracking, stopTracking } from '../services/location';
import { registerForPushNotifications } from '../services/push';
import type { UserBrief, LoginResponse, ApiResponse } from '../types';

// Bo'sh maydonlarni "-" bilan almashtirmaymiz — "-" ham "rost" qiymat
// hisoblanib, `user.lavozim || user.rol || "Xodim"` kabi fallback
// zanjirlarini buzadi (keyingi variantga o'tilmay qoladi). Bo'sh
// qiymat uchun "-" ko'rsatish faqat UI qatlamida (SettingsScreen)
// bajarilishi kerak.
function normalizeUser(u: UserBrief): UserBrief {
  const familiya = u.familiya?.trim() || '';
  const ism = u.ism?.trim() || '';
  const fullName = u.full_name?.trim() || `${familiya} ${ism}`.trim() || 'Xodim';
  return {
    ...u,
    familiya,
    ism,
    full_name: fullName,
    guvohnoma_raqami: u.guvohnoma_raqami?.trim() || '',
    lavozim: u.lavozim?.trim() || '',
    telefon: u.telefon?.trim() || '',
  };
}

interface AuthState {
  user: UserBrief | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (gr: string, parol: string) => Promise<string | null>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthState>({
  user: null,
  isLoading: true,
  isAuthenticated: false,
  login: async () => 'Kontekst mavjud emas',
  logout: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserBrief | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Restore session
  useEffect(() => {
    (async () => {
      try {
        const token = await getAccessToken();
        const refresh = await getRefreshToken();
        if (!token || !refresh) {
          setIsLoading(false);
          return;
        }

        const savedUser = await getUserJson();
        let parsedUser: UserBrief | null = null;
        if (savedUser) {
          try {
            parsedUser = JSON.parse(savedUser) as UserBrief;
            parsedUser = normalizeUser(parsedUser);
            setUser(parsedUser);
          } catch {
            parsedUser = null;
          }
        }

        // Verify token
        const { data } = await api.get<ApiResponse<UserBrief>>('/auth/men');
        if (data.ok && data.data) {
          const normalized = normalizeUser(data.data);
          setUser(normalized);
          await saveUser(JSON.stringify(normalized));
          if (normalized.rol === 'xodim') {
            startTracking().catch(() => {});
          }
          registerForPushNotifications().catch(() => {});
        }
      } catch {
        // Token tekshiruvi muvaffaqiyatsiz bo'lsa ham saqlangan foydalanuvchi
        // profili ko'rsatiladi, lekin tokenlar tozalanadi keyingi so'rovlar uchun.
        const savedUser = await getUserJson().catch(() => null);
        if (savedUser) {
          try {
            const parsedUser = normalizeUser(JSON.parse(savedUser) as UserBrief);
            setUser(parsedUser);
          } catch {
            setUser(null);
          }
        } else {
          setUser(null);
        }
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    setLogoutHandler(async () => {
      setUser(null);
      await clearTokens();
      stopTracking().catch(() => {});
    });
  }, []);

  const login = async (gr: string, parol: string): Promise<string | null> => {
    try {
      const { data } = await api.post<ApiResponse<LoginResponse>>('/auth/kirish', {
        guvohnoma_raqami: gr.toUpperCase(),
        parol,
      });

      if (!data.ok) return data.xato || 'Kirishda xatolik';

      const { access_token, refresh_token, user: loginUser } = data.data;
      const normalized = normalizeUser(loginUser);
      await setTokens(access_token, refresh_token);
      await saveUser(JSON.stringify(normalized));
      setUser(normalized);
      // Kirgandan keyin xodim uchun GPS tracking va push ro'yxatdan o'tadi
      if (loginUser.rol === 'xodim') {
        startTracking().catch(() => {});
      }
      registerForPushNotifications().catch(() => {});
      return null;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Tarmoq xatoligi';
      return msg;
    }
  };

  const logout = async () => {
    await clearTokens();
    setUser(null);
    stopTracking().catch(() => {});
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, isAuthenticated: !!user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthState {
  return useContext(AuthContext);
}
