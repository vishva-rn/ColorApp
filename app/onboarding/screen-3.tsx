/**
 * Onboarding Screen 3
 * Age selection screen using reusable components
 */

import React, { useState } from 'react';
import {
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// Reusable Components
import { OnboardingHeader } from '../../components/onboarding/OnboardingHeader';
import { OnboardingNextButton } from '../../components/onboarding/OnboardingNextButton';
import { SelectionOption } from '../../components/onboarding/SelectionOption';

interface Props {
  onNext: () => void;
}

type AgeOption = 'Under 12' | '13-17' | '18-24' | '25-34' | '35-44' | '45+';

export default function Onboarding3({ onNext }: Props) {
  const [selected, setSelected] = useState<AgeOption>('Under 12');

  const options: AgeOption[] = [
    'Under 12',
    '13-17',
    '18-24',
    '25-34',
    '35-44',
    '45+',
  ];

  return (
    <SafeAreaView className="flex-1 bg-screen">
      {/* Header with Progress (e.g., 0.75) and Quote Icon */}
      <OnboardingHeader 
        progress={0.75} 
        onSkip={() => {/* Handle skip */}} 
      />

      {/* Main Content */}
      <View className="px-7 mt-8">
        <Text className="text-[#A0A0A0] font-poppins text-[14px] mb-2">
          Choose what best describe you
        </Text>
        <Text
          className="text-[33px] font-mersin-mediumitalic text-[#3A3A3A] leading-[42px]"
        >
          How young at heart are{'\n'}you? 🌱
        </Text>
      </View>

      {/* Grid Selection */}
      <View className="flex-row flex-wrap px-4 mt-8 justify-between">
        {options.map((option) => (
          <SelectionOption
            key={option}
            label={option}
            isSelected={selected === option}
            onPress={() => setSelected(option)}
          />
        ))}
      </View>

      <View className="flex-1" />

      {/* Footer Next Button */}
      <OnboardingNextButton onPress={onNext} />
    </SafeAreaView>
  );
}
