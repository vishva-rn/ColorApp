import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';
import '../global.css';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { useNetworkConnectivity } from '@/hooks/use-network-connectivity';
import NoInternetScreen from '@/components/no-internet-screen';
import * as Clarity from '@microsoft/react-native-clarity';
import { useEffect } from 'react';

const CLARITY_PROJECT_ID = 'YOUR_CLARITY_PROJECT_ID'; // Replace with your Clarity project ID

export const unstable_settings = {
  anchor: '(tabs)',
};

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const isConnected = useNetworkConnectivity();

  // Initialize Microsoft Clarity for session recording and analytics
  useEffect(() => {
    Clarity.initialize(CLARITY_PROJECT_ID, {
      logLevel: Clarity.LogLevel.None,
    });
  }, []);

  // Show no internet screen when offline (null = still checking, so we wait)
  if (isConnected === false) {
    return (
      <>
        <NoInternetScreen />
        <StatusBar style="light" />
      </>
    );
  }

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
      </Stack>
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}
