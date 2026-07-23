import React, { useCallback, useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer, DefaultTheme, type Theme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { useFonts, Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold } from '@expo-google-fonts/inter';
import { Outfit_500Medium, Outfit_600SemiBold, Outfit_700Bold, Outfit_800ExtraBold } from '@expo-google-fonts/outfit';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import NetInfo from '@react-native-community/netinfo';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';

import { AuthProvider, useAuth } from './src/contexts/AuthContext';
import { AlifboProvider } from './src/contexts/AlifboContext';
import { Colors, Fonts, FontSizes, FontWeights, Spacing, Radius, Shadows, Layout } from './src/theme';
import { initDB, getKutilmaganSoni } from './src/services/db';
import { setupAutoSync } from './src/services/sync';
import OfflineBanner from './src/components/OfflineBanner';

import LoginScreen from './src/screens/LoginScreen';
import RoyxatScreen from './src/screens/RoyxatScreen';
import HomeScreen from './src/screens/HomeScreen';
import XonadonlarScreen from './src/screens/XonadonlarScreen';
import XonadonDetailScreen from './src/screens/XonadonDetailScreen';
import MuammoYaratishScreen from './src/screens/MuammoYaratishScreen';
import TopshiriqlarScreen from './src/screens/TopshiriqlarScreen';
import NavbatScreen from './src/screens/NavbatScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import HududScreen from './src/screens/HududScreen';

import type { UserBrief } from './src/types';

// ── Types ──────────────────────────────────────────
export type RootStackParamList = {
  Login: undefined;
  Royxat: undefined;
  MainTabs: undefined;
  XonadonDetail: { id: number };
  MuammoYaratish: { xonadonId?: number };
  Navbat: undefined;
};

export type MainTabParamList = {
  Home: undefined;
  Xonadonlar: undefined;
  Hududlar: undefined;
  Topshiriqlar: undefined;
  Settings: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<MainTabParamList>();

// ── Navigation Theme ───────────────────────────────
const NavTheme: Theme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: Colors.primary,
    background: Colors.background,
    card: Colors.surface,
    text: Colors.textPrimary,
    border: Colors.borderLight,
    notification: Colors.danger,
  },
  fonts: {
    ...DefaultTheme.fonts,
    regular: { fontFamily: Fonts.body, fontWeight: FontWeights.regular },
    medium: { fontFamily: Fonts.body, fontWeight: FontWeights.medium },
    bold: { fontFamily: Fonts.heading, fontWeight: FontWeights.bold },
    heavy: { fontFamily: Fonts.heading, fontWeight: FontWeights.extrabold },
  },
};

// ── Tab Icon Map ───────────────────────────────────
const TAB_ICONS: Record<string, { active: React.ComponentProps<typeof MaterialCommunityIcons>['name']; inactive: React.ComponentProps<typeof MaterialCommunityIcons>['name'] }> = {
  Home: { active: 'home', inactive: 'home-outline' },
  Xonadonlar: { active: 'clipboard-list', inactive: 'clipboard-list-outline' },
  Hududlar: { active: 'map-marker-radius', inactive: 'map-marker-radius-outline' },
  Topshiriqlar: { active: 'clipboard-check', inactive: 'clipboard-check-outline' },
  Settings: { active: 'account', inactive: 'account-outline' },
};

function TabBarIcon({ routeName, focused, color }: { routeName: string; focused: boolean; color: string }) {
  const icons = TAB_ICONS[routeName];
  if (!icons) return null;
  return (
    <View
      style={{
        // Aktiv: oltin soft chip (web pill uslubida) — to'rtburchak blob emas
        backgroundColor: focused ? 'rgba(201,162,39,0.16)' : 'transparent',
        borderRadius: 999,
        paddingHorizontal: focused ? 14 : 0,
        paddingVertical: 3,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <MaterialCommunityIcons name={focused ? icons.active : icons.inactive} size={22} color={color} />
    </View>
  );
}

// ── Main Tabs (floating navy pill) ───────────────────
function MainTabs() {
  const insets = useSafeAreaInsets();
  // Sistema navigation tugmalari ustiga chiqmasligi uchun:
  // insets.bottom=0 bo'lgan qurilmalarda ham kamida 12px bo'sh joy
  const bottom = Math.max(insets.bottom + Layout.tabBarGap, 12);

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarHideOnKeyboard: true,
        tabBarIcon: ({ focused, color }) => <TabBarIcon routeName={route.name} focused={focused} color={color} />,
        tabBarActiveTintColor: Colors.accent,
        tabBarInactiveTintColor: 'rgba(255,255,255,0.6)',
        tabBarStyle: {
          position: 'absolute',
          bottom,
          left: Layout.tabBarMargin,
          right: Layout.tabBarMargin,
          height: Layout.tabBarHeight,
          borderRadius: 28,
          backgroundColor: Colors.primary,
          borderTopWidth: 0,
          paddingBottom: 0,
          paddingTop: 0,
          ...Shadows.lg,
        },
        tabBarItemStyle: {
          marginHorizontal: 2,
          marginVertical: 6,
          paddingVertical: 2,
        },
        tabBarLabelStyle: {
          fontSize: 10,
          fontFamily: Fonts.body,
          fontWeight: FontWeights.medium,
          marginTop: 1,
        },
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} options={{ tabBarLabel: 'Asosiy' }} />
      <Tab.Screen name="Xonadonlar" component={XonadonlarScreen} options={{ tabBarLabel: 'Xonadon' }} />
      <Tab.Screen name="Hududlar" component={HududScreen} options={{ tabBarLabel: 'Hudud' }} />
      <Tab.Screen name="Topshiriqlar" component={TopshiriqlarScreen} options={{ tabBarLabel: 'Topshiriq' }} />
      <Tab.Screen name="Settings" component={SettingsScreen} options={{ tabBarLabel: 'Profil' }} />
    </Tab.Navigator>
  );
}

// ── Loading Screen ─────────────────────────────────
function LoadingScreen() {
  return (
    <View style={styles.loading}>
      <MaterialCommunityIcons name="shield-home" size={48} color={Colors.primaryLight} />
      <Text style={styles.loadingTitle}>Xavfsiz Xonadon</Text>
      <ActivityIndicator size="small" color={Colors.primary} style={{ marginTop: 16 }} />
    </View>
  );
}

// ── Root Navigator ─────────────────────────────────
function RootNavigator() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) return <LoadingScreen />;

  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: Colors.surface,
        },
        headerShadowVisible: false,
        headerTintColor: Colors.textPrimary,
        headerTitleStyle: {
          fontFamily: Fonts.heading,
          fontWeight: FontWeights.bold,
          fontSize: FontSizes.lg,
        },
        headerBackButtonDisplayMode: 'minimal',
      }}
    >
      {!isAuthenticated ? (
        <>
          <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
          <Stack.Screen name="Royxat" component={RoyxatScreen} options={{ headerShown: false }} />
        </>
      ) : (
        <>
          <Stack.Screen name="MainTabs" component={MainTabs} options={{ headerShown: false }} />
          <Stack.Screen name="XonadonDetail" component={XonadonDetailScreen} options={{ title: 'Xonadon' }} />
          <Stack.Screen name="MuammoYaratish" component={MuammoYaratishScreen} options={{ title: 'Yangi muammo' }} />
          <Stack.Screen name="Navbat" component={NavbatScreen} options={{ title: 'Sinxronlash navbati' }} />
        </>
      )}
    </Stack.Navigator>
  );
}

// ── Global Offline Banner ──────────────────────────
function GlobalOfflineBanner() {
  const insets = useSafeAreaInsets();
  const [isOffline, setIsOffline] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      const offline = !(state.isConnected === true && state.isInternetReachable !== false);
      setIsOffline(offline);
    });

    const refreshCount = async () => {
      try {
        setPendingCount(await getKutilmaganSoni());
      } catch {
        // DB hali ishga tushmagan
      }
    };
    refreshCount();
    const interval = setInterval(refreshCount, 5000);

    return () => {
      unsubscribe();
      clearInterval(interval);
    };
  }, []);

  return (
    <View style={{ paddingTop: insets.top, backgroundColor: Colors.background }}>
      <OfflineBanner isOffline={isOffline} pendingCount={pendingCount} />
    </View>
  );
}

// ── App Entry ──────────────────────────────────────
export default function App() {
  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    Outfit_500Medium,
    Outfit_600SemiBold,
    Outfit_700Bold,
    Outfit_800ExtraBold,
  });

  // Offline DB va avto-sinxronlash — bir marta ishga tushiriladi
  useEffect(() => {
    initDB().catch(() => {
      // DB ishga tushirish xatosi — ilova online rejimda davom etadi
    });
    const cleanup: unknown = setupAutoSync();
    return () => {
      if (typeof cleanup === 'function') (cleanup as () => void)();
    };
  }, []);

  const renderApp = useCallback(() => {
    if (!fontsLoaded) return <LoadingScreen />;
    return (
      <View style={styles.root}>
        <GlobalOfflineBanner />
        <NavigationContainer theme={NavTheme}>
          <RootNavigator />
        </NavigationContainer>
      </View>    );
  }, [fontsLoaded]);

  return (
    <SafeAreaProvider>
      <AuthProvider>
        <AlifboProvider>
          <StatusBar style="dark" />
          {renderApp()}
        </AlifboProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}

// ── Local Styles ───────────────────────────────────
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.background,
  },
  loadingTitle: {
    marginTop: 12,
    fontSize: FontSizes.lg,
    fontFamily: Fonts.heading,
    fontWeight: FontWeights.semibold,
    color: Colors.textPrimary,
  },
});
