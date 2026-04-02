/**
 * Onboarding Screen 4
 * Art category selection screen using reusable components
 */

import React, { useState } from 'react';
import {
  ScrollView,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// Reusable Components
import { OnboardingHeader } from '../../components/onboarding/OnboardingHeader';
import { OnboardingNextButton } from '../../components/onboarding/OnboardingNextButton';
import { ArtSelectionOption } from '../../components/onboarding/ArtSelectionOption';

// SVG Icons
import PeopleSvg from '../../assets/images/svgicons/people.svg';
import AnimalSvg from '../../assets/images/svgicons/animal.svg';
import NatureSvg from '../../assets/images/svgicons/nature.svg';
import PlacesSvg from '../../assets/images/svgicons/places.svg';
import FlowersSvg from '../../assets/images/svgicons/flowers.svg';
import FoodSvg from '../../assets/images/svgicons/food.svg';
import CuteSvg from '../../assets/images/svgicons/cute.svg';
import SimpleSvg from '../../assets/images/svgicons/simple.svg';
import MandalaSvg from '../../assets/images/svgicons/mandala.svg';
import ComicsSvg from '../../assets/images/svgicons/comics.svg';

interface Props {
  onNext: () => void;
  onSelectCategory?: (value: string) => void;
}

const ART_CATEGORIES = [
  { id: 'people', label: 'People', icon: PeopleSvg },
  { id: 'animal', label: 'Animal', icon: AnimalSvg },
  { id: 'nature', label: 'Nature', icon: NatureSvg },
  { id: 'places', label: 'Places', icon: PlacesSvg },
  { id: 'flowers', label: 'Flowers', icon: FlowersSvg },
  { id: 'food', label: 'Food', icon: FoodSvg },
  { id: 'cute', label: 'Cute', icon: CuteSvg },
  { id: 'simple', label: 'Simple', icon: SimpleSvg },
  { id: 'mandalas', label: 'Mandalas', icon: MandalaSvg },
  { id: 'comics', label: 'Comics', icon: ComicsSvg },
];

export default function Onboarding4({ onNext, onSelectCategory }: Props) {
  const [selected, setSelected] = useState<string>('people');

  const handleNext = () => {
    onSelectCategory?.(selected);
    onNext();
  };

  return (
    <SafeAreaView className="flex-1 bg-screen">
      {/* Header with Progress (1.0 for last screen) and Quote Icon */}
      <OnboardingHeader 
        progress={0.8} 
        onSkip={() => {/* Handle skip */}} 
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
            Which kind of art makes you want coloring?🖍️
          </Text>
        </View>

        {/* Grid Selection */}
        <View className="flex-row flex-wrap px-4 mt-8 justify-between">
          {ART_CATEGORIES.map((category) => (
            <ArtSelectionOption
              key={category.id}
              label={category.label}
              isSelected={selected === category.id}
              onPress={() => setSelected(category.id)}
              SvgImage={category.icon}
            />
          ))}
        </View>
      </ScrollView>

      {/* Footer Next Button - Positioned Absolute in component */}
      <OnboardingNextButton onPress={handleNext} />
    </SafeAreaView>
  );
}
