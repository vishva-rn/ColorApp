import { Stack } from 'expo-router';

export default function OnboardingLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="screen-1" />
      <Stack.Screen name="screen-2" />
      <Stack.Screen name="screen-3" />
      <Stack.Screen name="screen-4" />
      <Stack.Screen name="screen-5" />
      <Stack.Screen name="screen-6" />
      <Stack.Screen name="screen-7" />
    </Stack>
  );
}
