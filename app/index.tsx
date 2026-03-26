import { Redirect } from 'expo-router';

// Entry point — redirect to onboarding
export default function Index() {
  return <Redirect href="/onboarding" />;
}
