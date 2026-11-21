import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { refreshColorCatalog, useColorCatalog } from '@/lib/color-catalog';

import { ArtSelectionOption } from './ArtSelectionOption';
import { OnboardingHeader } from './OnboardingHeader';
import { OnboardingNextButton } from './OnboardingNextButton';

interface Props {
  onNext: () => void;
  onSkip: () => void;
  onSelectCategory: (value: string) => void;
}

export default function CategorySlide({ onNext, onSkip, onSelectCategory }: Props) {
  const { status, categories } = useColorCatalog();
  const [selectedId, setSelectedId] = useState<string>();
  const selected = categories.find((category) => category.id === selectedId)
    ?? categories.find((category) => category.id === 'people')
    ?? categories[0];

  function handleNext() {
    if (selected) onSelectCategory(selected.id);
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

        {status === 'loading' && <ActivityIndicator accessibilityLabel="Loading categories" className="mt-8" />}
        {status === 'unavailable' && (
          <View className="items-center gap-3 mt-8">
            <Text>Couldn’t load categories</Text>
            <Pressable accessibilityRole="button" onPress={() => void refreshColorCatalog(true)}>
              <Text className="font-poppins-semibold">Try again</Text>
            </Pressable>
          </View>
        )}
        <View className="flex-row flex-wrap px-4 mt-8" style={{ columnGap: '1.75%' }}>
          {categories.map(({ id, label, image }) => (
            <ArtSelectionOption
              key={id}
              label={label}
              isSelected={selected?.id === id}
              onPress={() => setSelectedId(id)}
              SvgImage={image}
              stackedArtwork
              compact
            />
          ))}
        </View>
      </ScrollView>

      <OnboardingNextButton onPress={handleNext} />
    </SafeAreaView>
  );
}
