import { Redirect } from 'expo-router';
import { useEffect, useState } from 'react';

import { getOnboardingPrefs } from '@/lib/onboarding-prefs';

export default function Index() {
  const [targetRoute, setTargetRoute] = useState<'/onboarding' | '/(tabs)' | null>(null);

  useEffect(() => {
    let cancelled = false;

    getOnboardingPrefs()
      .then((prefs) => {
        if (cancelled) return;
        setTargetRoute(prefs.completed ? '/(tabs)' : '/onboarding');
      })
      .catch(() => {
        if (!cancelled) setTargetRoute('/onboarding');
      });

    return () => {
      cancelled = true;
    };
  }, []);

  if (!targetRoute) return null;
  return <Redirect href={targetRoute} />;
}
