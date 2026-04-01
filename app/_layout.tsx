import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';
import '../global.css';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { useNetworkConnectivity } from '@/hooks/use-network-connectivity';
import NoInternetScreen from '@/components/no-internet-screen';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import * as Clarity from '@microsoft/react-native-clarity';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

const CLARITY_PROJECT_ID = 'YOUR_CLARITY_PROJECT_ID'; // Replace with your Clarity project ID

export const unstable_settings = {
  anchor: '(tabs)',
};

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const isConnected = useNetworkConnectivity();

  const [loaded, error] = useFonts({
    'Poppins-Regular': require('../assets/fonts/Poppins-Regular.ttf'),
    'Poppins-Medium': require('../assets/fonts/Poppins-Medium.ttf'),
    'Poppins-SemiBold': require('../assets/fonts/Poppins-SemiBold.ttf'),
    'Poppins-Bold': require('../assets/fonts/Poppins-Bold.ttf'),
    'Poppins-Light': require('../assets/fonts/Poppins-Light.ttf'),
    'Mersin-Regular': require('../assets/fonts/Fontspring-DEMO-mersin-regular.otf'),
    'Mersin-Medium': require('../assets/fonts/Fontspring-DEMO-mersin-medium.otf'),
    'Mersin-Bold': require('../assets/fonts/Fontspring-DEMO-mersin-bold.otf'),
    'Mersin-BoldItalic': require('../assets/fonts/Fontspring-DEMO-mersin-bolditalic.otf'),
    'Mersin-SemiBold': require('../assets/fonts/Fontspring-DEMO-mersin-semibold.otf'),
    'Mersin-Light': require('../assets/fonts/Fontspring-DEMO-mersin-light.otf'),
    'Mersin-ThinItalic': require('../assets/fonts/Fontspring-DEMO-mersin-thinitalic.otf'),
    'Mersin-MediumItalic': require('../assets/fonts/Fontspring-DEMO-mersin-mediumitalic.otf'),
    'Fraunces-Regular': require('../assets/fonts/Fraunces_72pt-Regular.ttf'),
  });

  useEffect(() => {
    if (loaded || error) {
      SplashScreen.hideAsync();
    }
  }, [loaded, error]);

  // Initialize Microsoft Clarity for session recording and analytics
  useEffect(() => {
    Clarity.initialize(CLARITY_PROJECT_ID, {
      logLevel: Clarity.LogLevel.None,
    });
  }, []);

  if (!loaded && !error) {
    return null;
  }

  // Show no internet screen when offline
  if (isConnected === false) {
    return (
      <>
        <NoInternetScreen />
        <StatusBar style="light" />
      </>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <Stack initialRouteName="index">
          <Stack.Screen name="index" options={{ headerShown: false }} />
          <Stack.Screen name="onboarding" options={{ headerShown: false }} />
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen
            name="drawing/index"
            options={{
              headerShown: false,
              gestureEnabled: false,
            }}
          />
          <Stack.Screen name="drawing/selection" options={{ headerShown: false }} />
          <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
        </Stack>
        <StatusBar style="auto" />
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}
