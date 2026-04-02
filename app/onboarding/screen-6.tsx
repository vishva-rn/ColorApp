/**
 * Onboarding Screen 6
 * Brush selection screen using reusable components
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

// SVG Icons
import BallPenSvg from '../../assets/images/svgicons/BallPen.svg';
import BrushSvg from '../../assets/images/svgicons/Brush.svg';
import CrayonSvg from '../../assets/images/svgicons/crayon.svg';
import GlowPenSvg from '../../assets/images/svgicons/glowpen.svg';
import PaintSvg from '../../assets/images/svgicons/paint.svg';
import PencileSvg from '../../assets/images/svgicons/Pencile.svg';
import SketchPenSvg from '../../assets/images/svgicons/SketchPen.svg';

interface Props {
  onNext: () => void;
  onSelectBrush?: (value: string) => void;
}

const BRUSH_OPTIONS = [
  { id: 'pencil', label: 'Pencil', icon: PencileSvg },
  { id: 'brush', label: 'Brush', icon: BrushSvg },
  { id: 'marker', label: 'Marker', icon: PencileSvg }, // Fallback
  { id: 'glow_pen', label: 'Glow Pen', icon: GlowPenSvg },
  { id: 'crayon', label: 'Crayon', icon: CrayonSvg },
  { id: 'paint', label: 'Paint', icon: PaintSvg },
  { id: 'ball_pen', label: 'Ball Pen', icon: BallPenSvg },
  { id: 'sketch_pen', label: 'Sketch Pen', icon: SketchPenSvg },
];

export default function Onboarding6({ onNext, onSelectBrush }: Props) {
  const [selected, setSelected] = useState<string>('pencil');

  const handleNext = () => {
    onSelectBrush?.(selected);
    onNext();
  };

  return (
    <SafeAreaView className="flex-1 bg-screen">
      {/* Header with Progress (e.g. 0.85/0.9) */}
      <OnboardingHeader
        progress={0.85}
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
            Which brushes are you most excited to try?🖌️
          </Text>
        </View>

        {/* Grid Selection */}
        <View className="flex-row flex-wrap px-4 mt-8 justify-between">
          {BRUSH_OPTIONS.map((option) => (
            <ArtSelectionOption
              key={option.id}
              label={option.label}
              isSelected={selected === option.id}
              onPress={() => setSelected(option.id)}
              SvgImage={option.icon}
              unselectedBg="bg-white"
              mb="mb-4"
              imagePadding="p-6"
              imageAspectRatio="aspect-[1.8]"
            />
          ))}
        </View>
      </ScrollView>

      {/* Footer Next Button - Positioned Absolute in component */}
      <OnboardingNextButton onPress={handleNext} />
    </SafeAreaView>
  );
}
