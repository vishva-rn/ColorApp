import { useRouter } from 'expo-router';
import React, { useRef, useState } from 'react';
import { Dimensions, FlatList, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import Onboarding1 from './screen-1';
import Onboarding2 from './screen-2';

const { width } = Dimensions.get('window');

export default function OnboardingIndex() {
  const router = useRouter();
  const flatListRef = useRef<FlatList>(null);
  const [currentIndex, setCurrentIndex] = useState(0);

  const goNext = () => {
    if (currentIndex < 1) {
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
  ];

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
