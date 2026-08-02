import React, { useCallback, useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer, DefaultTheme, type Theme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import {
  useFonts,
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from '@expo-google-fonts/inter';
import {
  Outfit_500Medium,
  Outfit_600SemiBold,
  Outfit_700Bold,
  Outfit_800ExtraBold,
} from '@expo-google-fonts/outfit';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';

import { AuthProvider, useAuth } from './src/contexts/AuthContext';
import { AlifboProvider } from './src/contexts/AlifboContext';
import { ThemeProvider } from './src/contexts/ThemeContext';
import { Colors, Fonts, FontSizes, FontWeights, Shadows, Layout } from './src/theme';
import { initDB } from './src/services/db';
import { setupAutoSync } from './src/services/sync';
import ErrorBoundary from './src/components/ErrorBoundary';
import GpsGate from './src/components/GpsGate';

import LoginScreen from './src/screens/LoginScreen';
import RoyxatScreen from './src/screens/RoyxatScreen';
import MaydonScreen from './src/screens/MaydonScreen';
import XonadonlarScreen from './src/screens/XonadonlarScreen';
import XonadonDetailScreen from './src/screens/XonadonDetailScreen';
import TekshiruvScreen from './src/screens/TekshiruvScreen';
import MuammoYopishScreen from './src/screens/MuammoYopishScreen';
import TopshiriqlarScreen from './src/screens/TopshiriqlarScreen';
import NavbatScreen from './src/screens/NavbatScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import HududScreen from './src/screens/HududScreen';
import { RootStackParamList, MainTabParamList } from './src/navigation/types';

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
const TAB_ICONS: Record<
  string,
  {
    active: React.ComponentProps<typeof MaterialCommunityIcons>['name'];
    inactive: React.ComponentProps<typeof MaterialCommunityIcons>['name'];
  }
> = {
  Home: { active: 'home', inactive: 'home-outline' },
  Xonadonlar: { active: 'clipboard-list', inactive: 'clipboard-list-outline' },
  Hududlar: { active: 'map-marker-radius', inactive: 'map-marker-radius-outline' },
  Topshiriqlar: { active: 'clipboard-check', inactive: 'clipboard-check-outline' },
  Settings: { active: 'account', inactive: 'account-outline' },
};

function TabBarIcon({
  routeName,
  focused,
}: {
  routeName: string;
  focused: boolean;
  color: string;
}) {
  const icons = TAB_ICONS[routeName];
  if (!icons) return null;
  return (
    <View
      style={{
        backgroundColor: focused ? '#FFFFFF' : 'transparent',
        borderRadius: 999,
        minWidth: focused ? 48 : 24,
        height: 32,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <MaterialCommunityIcons
        name={focused ? icons.active : icons.inactive}
        size={22}
        color={focused ? Colors.primary : 'rgba(255,255,255,0.6)'}
      />
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
        tabBarIcon: ({ focused, color }) => (
          <TabBarIcon routeName={route.name} focused={focused} color={color} />
        ),
        tabBarActiveTintColor: '#FFFFFF',
        tabBarInactiveTintColor: 'rgba(255,255,255,0.55)',
        tabBarStyle: {
          position: 'absolute',
          bottom,
          left: Layout.tabBarMargin,
          right: Layout.tabBarMargin,
          height: 64,
          borderRadius: 24,
          backgroundColor: Colors.primary,
          borderTopWidth: 0,
          paddingBottom: 0,
          paddingTop: 0,
          ...Shadows.lg,
        },
        tabBarItemStyle: {
          marginHorizontal: 2,
          marginVertical: 4,
          paddingVertical: 2,
        },
        tabBarLabelStyle: {
          fontSize: 10,
          fontFamily: Fonts.body,
          fontWeight: FontWeights.medium,
          marginTop: 2,
        },
      })}
    >
      <Tab.Screen name="Home" component={MaydonScreen} options={{ tabBarLabel: 'Asosiy' }} />
      <Tab.Screen
        name="Xonadonlar"
        component={XonadonlarScreen}
        options={{ tabBarLabel: 'Xonadon' }}
      />
      <Tab.Screen name="Hududlar" component={HududScreen} options={{ tabBarLabel: 'Hudud' }} />
      <Tab.Screen
        name="Topshiriqlar"
        component={TopshiriqlarScreen}
        options={{ tabBarLabel: 'Topshiriq' }}
      />
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
          <Stack.Screen
            name="XonadonDetail"
            component={XonadonDetailScreen}
            options={{ title: 'Xonadon' }}
          />
          <Stack.Screen
            name="Tekshiruv"
            component={TekshiruvScreen}
            options={{ title: 'Tekshiruv' }}
          />
          <Stack.Screen
            name="MuammoYopish"
            component={MuammoYopishScreen}
            options={{ title: 'Muammoni yopish' }}
          />
          <Stack.Screen
            name="Navbat"
            component={NavbatScreen}
            options={{ title: 'Sinxronlash navbati' }}
          />
        </>
      )}
    </Stack.Navigator>
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
      <ErrorBoundary>
        <View style={styles.root}>
          <NavigationContainer theme={NavTheme}>
            <RootNavigator />
          </NavigationContainer>
          <GpsGate />
        </View>
      </ErrorBoundary>
    );
  }, [fontsLoaded]);

  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <AuthProvider>
          <AlifboProvider>
            <StatusBar style="dark" />
            {renderApp()}
          </AlifboProvider>
        </AuthProvider>
      </ThemeProvider>
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
