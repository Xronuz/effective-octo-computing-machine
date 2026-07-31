import Constants from 'expo-constants';

// Production: fvv.xron.uz ; lokal development uchun EXPO_PUBLIC_API_URL muhit o'zgaruvchisini ishlating.
const DEFAULT_API_URL = 'https://fvv.xron.uz/api';

export const ENV = {
  API_URL:
    process.env.EXPO_PUBLIC_API_URL ??
    (Constants.expoConfig?.extra as { apiUrl?: string } | undefined)?.apiUrl ??
    DEFAULT_API_URL,
} as const;
