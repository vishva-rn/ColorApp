import { useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import MandalaSvg from '@/assets/images/svgicons/mandala.svg';
import { ART_CATEGORIES } from '@/lib/art-categories';

import { ArtSelectionOption } from './ArtSelectionOption';
import { OnboardingHeader } from './OnboardingHeader';
import { OnboardingNextButton } from './OnboardingNextButton';

interface Props {
  onNext: () => void;
  onSkip: () => void;
  onSelectCategory: (value: string) => void;
}

const ORIGINAL_CATEGORIES = [
  { id: 'people', label: 'People', image: require('../../assets/images/svgicons/people.png') },
  { id: 'animal', label: 'Animal', image: require('../../assets/images/svgicons/animal.png') },
  { id: 'nature', label: 'Nature', image: require('../../assets/images/svgicons/nature.png') },
  { id: 'places', label: 'Places', image: require('../../assets/images/svgicons/places.png') },
  { id: 'flowers', label: 'Flowers', image: require('../../assets/images/svgicons/flowers.png') },
  { id: 'food', label: 'Food', image: require('../../assets/images/svgicons/food.png') },
  { id: 'cute', label: 'Cute', image: require('../../assets/images/svgicons/cute.png') },
  { id: 'simple', label: 'Simple', image: require('../../assets/images/svgicons/simple.png') },
  { id: 'mandalas', label: 'Mandalas', image: MandalaSvg },
  { id: 'comics', label: 'Comics', image: require('../../assets/images/svgicons/comics.png') },
];

const originalCategoryIds = new Set(ORIGINAL_CATEGORIES.map(({ id }) => id === 'animal' ? 'animals' : id));
const categories = [
  ...ORIGINAL_CATEGORIES.map((category) => ({ ...category, stackedArtwork: false })),
  ...ART_CATEGORIES
    .filter(({ id }) => !originalCategoryIds.has(id))
    .map((category) => ({ ...category, stackedArtwork: true })),
];

export default function CategorySlide({ onNext, onSkip, onSelectCategory }: Props) {
  const [selected, setSelected] = useState('people');

  function handleNext() {
    onSelectCategory(selected);
    onNext();
  }

  return (
    <SafeAreaView className="flex-1 bg-screen">
      <OnboardingHeader progress={2 / 3} onSkip={onSkip} />

      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 120 }}
      >
        <View className="px-7 mt-8">
          <Text className="text-[33px] font-mersin-mediumitalic text-[#3A3A3A] leading-[42px]">
            What do you like to color?
          </Text>
        </View>

        <View className="flex-row flex-wrap px-4 mt-8" style={{ columnGap: '1.75%' }}>
          {categories.map(({ id, label, image, stackedArtwork }) => (
            <ArtSelectionOption
              key={id}
              label={label}
              isSelected={selected === id}
              onPress={() => setSelected(id)}
              SvgImage={image}
              stackedArtwork={stackedArtwork}
              compact
            />
          ))}
        </View>
      </ScrollView>

      <OnboardingNextButton onPress={handleNext} />
    </SafeAreaView>
  );
}
