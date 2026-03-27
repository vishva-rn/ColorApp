import { Stack, useRouter } from 'expo-router';
import React, { useRef, useState } from 'react';
import { Dimensions, FlatList, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import Onboarding1 from './screen-1';
import Onboarding2 from './screen-2';
import Onboarding3 from './screen-3';
import Onboarding4 from './screen-4';
import Onboarding5 from './screen-5';
import Onboarding6 from './screen-6';
import Onboarding7 from './screen-7';

const { width } = Dimensions.get('window');

export default function OnboardingIndex() {
  const router = useRouter();
  const flatListRef = useRef<FlatList>(null);
  const [currentIndex, setCurrentIndex] = useState(0);

  const goNext = () => {
    if (currentIndex < 6) {
      flatListRef.current?.scrollToIndex({ index: currentIndex + 1, animated: true });
      setCurrentIndex(currentIndex + 1);
    } else {
      // Onboarding complete — go to main app
      router.replace('/(tabs)');
    }
  };

  const screens = [
    <Onboarding1 key="1" onNext={goNext} />,
    <Onboarding2 key="2" onNext={goNext} />,
    <Onboarding3 key="3" onNext={goNext} />,
    <Onboarding4 key="4" onNext={goNext} />,
    <Onboarding5 key="5" onNext={goNext} />,
    <Onboarding6 key="6" onNext={goNext} />,
    <Onboarding7 key="7" onNext={goNext} />,
  ];

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
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
