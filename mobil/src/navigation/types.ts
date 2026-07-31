import type { NavigatorScreenParams } from '@react-navigation/native';

export type MainTabParamList = {
  Home: undefined;
  Xonadonlar: undefined;
  Hududlar: undefined;
  Topshiriqlar: undefined;
  Settings: undefined;
};

export type RootStackParamList = {
  Login: undefined;
  Royxat: undefined;
  MainTabs: NavigatorScreenParams<MainTabParamList>;
  XonadonDetail: { id: number };
  Tekshiruv: { xonadonId: number };
  Navbat: undefined;
};

declare global {
  namespace ReactNavigation {
    // eslint-disable-next-line @typescript-eslint/no-empty-object-type
    interface RootParamList extends RootStackParamList {}
  }
}
