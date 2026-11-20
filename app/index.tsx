import { Redirect, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';

import ReadySlide from '@/components/onboarding/ReadySlide';
import { getOnboardingPrefs } from '@/lib/onboarding-prefs';

export default function Index() {
  const router = useRouter();
  const [completed, setCompleted] = useState<boolean | null>(null);
  const openHome = useCallback(() => router.replace('/(tabs)'), [router]);

  useEffect(() => {
    let active = true;

    void getOnboardingPrefs().then((prefs) => {
      if (active) setCompleted(prefs.completed);
    });

    return () => {
      active = false;
    };
  }, []);

  if (completed === null) return null;

  return completed ? <ReadySlide onFinished={openHome} /> : <Redirect href="/onboarding" />;
}
