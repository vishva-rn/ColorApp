/**
 * Onboarding Screen 7
 * Quote screen with illustrations
 */

import React from 'react';
import {
  Image,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// Reusable Components
import { OnboardingNextButton } from '../../components/onboarding/OnboardingNextButton';

interface Props {
  onNext: () => void;
}

export default function Onboarding7({ onNext }: Props) {
  return (
    <SafeAreaView className="flex-1 bg-screen">
      <View className="flex-1 items-center justify-center -mt-10">
        {/* Main Image Illustration */}
        <View className="w-full aspect-[0.7] px-4">
          <Image
            source={require('../../assets/images/onboard/onboard7.png')}
            style={{ width: '100%', height: '100%' }}
            resizeMode="contain"
          />
        </View>

        {/* Note: The quote and author are likely part of the PNG, 
            but if they aren't, I could layer them here.
            Looking at the reference, it looks like a curated stylized image. */}
      </View>

      {/* Footer Next Button */}
      <OnboardingNextButton onPress={onNext} />
    </SafeAreaView>
  );
}
