/**
 * Onboarding Screen 2
 * Gender selection screen refactored with reusable components
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

type GenderOption = 'Male' | 'Female' | 'Other' | "Don’t want to say";

export default function Onboarding2({ onNext }: Props) {
  const [selected, setSelected] = useState<GenderOption>('Male');

  const options: GenderOption[] = ['Male', 'Female', 'Other', "Don’t want to say"];

  return (
    <SafeAreaView className="flex-1 bg-screen">
      {/* Header with Progress and Quote Icon */}
      <OnboardingHeader 
        progress={0.5} 
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
          What’s gender do you identify as?🧍
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
