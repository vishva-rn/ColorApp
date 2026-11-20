import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useRef, useState } from 'react';
import { Alert, View } from 'react-native';

import CategorySlide from '@/components/onboarding/CategorySlide';
import ReadySlide from '@/components/onboarding/ReadySlide';
import WelcomeSlide from '@/components/onboarding/WelcomeSlide';
import { markOnboardingCompleted } from '@/lib/onboarding-prefs';

export default function Onboarding() {
  const router = useRouter();
  const [step, setStep] = useState<'welcome' | 'category' | 'quote'>('welcome');
  const selectedCategory = useRef<string | undefined>(undefined);
  const finishing = useRef(false);
  const openHome = useCallback(() => router.replace('/(tabs)'), [router]);

  async function finish() {
    if (finishing.current) return;
    finishing.current = true;

    try {
      const artCategory = selectedCategory.current;
      await markOnboardingCompleted(artCategory ? { artCategory } : undefined);
    } catch (error) {
      console.error('[onboarding] Could not save completion', error);
      finishing.current = false;
      Alert.alert('Could not save onboarding', 'Please try again.');
      return;
    }

    setStep('quote');
  }

  if (step === 'quote') return <ReadySlide onFinished={openHome} />;

  return (
    <View className="flex-1 bg-screen">
      <StatusBar style="dark" />
      {step === 'welcome' ? (
        <WelcomeSlide onNext={() => setStep('category')} onSkip={finish} />
      ) : (
        <CategorySlide
          onNext={finish}
          onSkip={finish}
          onSelectCategory={(artCategory) => { selectedCategory.current = artCategory; }}
        />
      )}
    </View>
  );
}
