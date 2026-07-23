import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';

// DIQQAT: SecureStore kalit nomlarida faqat [A-Za-z0-9._-] belgilar ruxsat.
// Quyidagi kalit nomlari shu talabga mos (faqat harf, raqam va pastki chiziq).
const KEYS = {
  ACCESS_TOKEN: 'access_token',
  REFRESH_TOKEN: 'refresh_token',
  USER: 'user_data',
  LAST_SYNC: 'last_sync_time',
};

// Tokenlar maxfiy ma'lumot — SecureStore'da (iOS Keychain / Android Keystore).
// Foydalanuvchi profili va sync vaqti maxfiy emas va SecureStore'ning
// 2048 baytlik qiymat limitiga sig'masligi mumkin — ular AsyncStorage'da qoladi.

export async function getAccessToken(): Promise<string | null> {
  return SecureStore.getItemAsync(KEYS.ACCESS_TOKEN);
}

export async function getRefreshToken(): Promise<string | null> {
  return SecureStore.getItemAsync(KEYS.REFRESH_TOKEN);
}

export async function setTokens(access: string, refresh: string): Promise<void> {
  await Promise.all([
    SecureStore.setItemAsync(KEYS.ACCESS_TOKEN, access),
    SecureStore.setItemAsync(KEYS.REFRESH_TOKEN, refresh),
  ]);
}

export async function clearTokens(): Promise<void> {
  await Promise.all([
    SecureStore.deleteItemAsync(KEYS.ACCESS_TOKEN),
    SecureStore.deleteItemAsync(KEYS.REFRESH_TOKEN),
    AsyncStorage.removeItem(KEYS.USER),
  ]);
}

export async function saveUser(userJson: string): Promise<void> {
  await AsyncStorage.setItem(KEYS.USER, userJson);
}

export async function getUserJson(): Promise<string | null> {
  return AsyncStorage.getItem(KEYS.USER);
}

export async function getLastSync(): Promise<string | null> {
  return AsyncStorage.getItem(KEYS.LAST_SYNC);
}

export async function setLastSync(time: string): Promise<void> {
  await AsyncStorage.setItem(KEYS.LAST_SYNC, time);
}
