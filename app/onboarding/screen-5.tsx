/**
 * Onboarding Screen 5
 * Color palette selection screen using reusable components
 */

import React, { useState } from 'react';
import {
  ScrollView,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// Reusable Components
import { ArtSelectionOption } from '../../components/onboarding/ArtSelectionOption';
import { OnboardingHeader } from '../../components/onboarding/OnboardingHeader';
import { OnboardingNextButton } from '../../components/onboarding/OnboardingNextButton';

// SVG Icons (Palette specific)
import FabricSvg from '../../assets/images/svgicons/Fabric.svg';
import GradientSvg from '../../assets/images/svgicons/Gradient.svg';
import MagicalSvg from '../../assets/images/svgicons/Magical.svg';
import MakeUpSvg from '../../assets/images/svgicons/MakeUp.svg';
import PastelSvg from '../../assets/images/svgicons/Pastel.svg';
import RainbowSvg from '../../assets/images/svgicons/Rainbow.svg';

interface Props {
  onNext: () => void;
}

const PALETTE_OPTIONS = [
  { id: 'pastel', label: 'Pastel', icon: PastelSvg },
  { id: 'gradient', label: 'Gradient', icon: GradientSvg },
  { id: 'magical', label: 'Magical', icon: MagicalSvg },
  { id: 'rainbow', label: 'Rainbow', icon: RainbowSvg },
  { id: 'fabric', label: 'Fabric', icon: FabricSvg },
  { id: 'makeup', label: 'Make Up', icon: MakeUpSvg },
];

export default function Onboarding5({ onNext }: Props) {
  const [selected, setSelected] = useState<string>('pastel');

  return (
    <SafeAreaView className="flex-1 bg-screen">
      {/* Header with Progress (e.g. 1.0 or split if more screens) */}
      {/* Assuming 5 screens total for now, Screen 5 = 1.0 or 0.9 */}
      <OnboardingHeader
        progress={0.7}
        onSkip={() => {/* Handle skip */ }}
      />

      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 120 }}
      >
        {/* Main Content */}
        <View className="px-7 mt-8">
          <Text className="text-[#A0A0A0] font-poppins text-[14px] mb-2">
            Choose what best describe you
          </Text>
          <Text
            className="text-[33px] font-mersin-mediumitalic text-[#3A3A3A] leading-[42px]"
          >
            What color palettes do you enjoy most?🎨
          </Text>
        </View>

        {/* Grid Selection */}
        <View className="flex-row flex-wrap px-4 mt-8 justify-between">
          {PALETTE_OPTIONS.map((option) => (
            <ArtSelectionOption
              key={option.id}
              label={option.label}
              isSelected={selected === option.id}
              onPress={() => setSelected(option.id)}
              SvgImage={option.icon}
              unselectedBg="bg-white"
              mb="mb-5"
              imageAspectRatio="aspect-[1.3]"
            />
          ))}
        </View>
      </ScrollView>

      {/* Footer Next Button - Positioned Absolute in component */}
      <OnboardingNextButton onPress={onNext} />
    </SafeAreaView>
  );
}
