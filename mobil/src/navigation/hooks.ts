import {
  useNavigation,
  useRoute,
  type NavigationProp,
  type RouteProp,
  type CompositeNavigationProp,
} from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList, MainTabParamList } from './types';

export type AppNavigationProp = NavigationProp<RootStackParamList>;
export type TabScreenNavigationProp = CompositeNavigationProp<
  BottomTabNavigationProp<MainTabParamList>,
  NativeStackNavigationProp<RootStackParamList>
>;

export function useAppNavigation(): AppNavigationProp {
  return useNavigation<AppNavigationProp>();
}

export function useTabScreenNavigation(): TabScreenNavigationProp {
  return useNavigation<TabScreenNavigationProp>();
}

export function useAppRoute<T extends keyof RootStackParamList>(): RouteProp<
  RootStackParamList,
  T
> {
  return useRoute<RouteProp<RootStackParamList, T>>();
}
