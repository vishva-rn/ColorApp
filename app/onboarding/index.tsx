import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { BackHandler, Dimensions, FlatList, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import Onboarding1 from './screen-1';
import Onboarding4 from './screen-4';
import Onboarding5 from './screen-5';
import Onboarding6 from './screen-6';
import Onboarding7 from './screen-7';
import { getOnboardingPrefs, markOnboardingCompleted, saveOnboardingPrefs } from '@/lib/onboarding-prefs';

const { width } = Dimensions.get('window');

export default function OnboardingIndex() {
  const router = useRouter();
  const flatListRef = useRef<FlatList>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isReady, setIsReady] = useState(false);
  const [artCategory, setArtCategory] = useState('people');
  const [palette, setPalette] = useState('pastel');
  const [brush, setBrush] = useState('pencil');

  const goNext = async () => {
    if (currentIndex < 4) {
      flatListRef.current?.scrollToIndex({ index: currentIndex + 1, animated: true });
      setCurrentIndex(currentIndex + 1);
    } else {
      await markOnboardingCompleted({
        artCategory,
        palette,
        brush,
      });
      router.replace('/(tabs)');
    }
  };

  const handleSelectCategory = useCallback((value: string) => {
    setArtCategory(value);
    void saveOnboardingPrefs({ artCategory: value });
  }, []);

  const handleSelectPalette = useCallback((value: string) => {
    setPalette(value);
    void saveOnboardingPrefs({ palette: value });
  }, []);

  const handleSelectBrush = useCallback((value: string) => {
    setBrush(value);
    void saveOnboardingPrefs({ brush: value });
  }, []);

  useEffect(() => {
    let cancelled = false;

    getOnboardingPrefs()
      .then((prefs) => {
        if (cancelled) return;

        if (prefs.completed) {
          router.replace('/(tabs)');
          return;
        }

        if (prefs.artCategory) setArtCategory(prefs.artCategory);
        if (prefs.palette) setPalette(prefs.palette);
        if (prefs.brush) setBrush(prefs.brush);
        setIsReady(true);
      })
      .catch(() => {
        if (!cancelled) setIsReady(true);
      });

    return () => {
      cancelled = true;
    };
  }, [router]);

  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => true);
    return () => subscription.remove();
  }, []);

  const screens = [
    <Onboarding1 key="1" onNext={goNext} />,
    <Onboarding4 key="4" onNext={goNext} onSelectCategory={handleSelectCategory} />,
    <Onboarding5 key="5" onNext={goNext} onSelectPalette={handleSelectPalette} />,
    <Onboarding6 key="6" onNext={goNext} onSelectBrush={handleSelectBrush} />,
    <Onboarding7 key="7" onNext={goNext} />,
  ];

  if (!isReady) {
    return null;
  }

  return (
    <>
      <StatusBar style="dark" />
      <FlatList
        ref={flatListRef}
        data={screens}
        keyExtractor={(_, i) => String(i)}
        renderItem={({ item }) => (
          <View style={{ width }}>{item}</View>
        )}
        horizontal
        pagingEnabled
        scrollEnabled={false}
        showsHorizontalScrollIndicator={false}
      />
    </>
  );
}
