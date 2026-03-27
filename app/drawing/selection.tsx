import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, Link } from 'expo-router';
import { IconSymbol } from '@/components/ui/icon-symbol';

// SVG Icons for categories
import AnimalSvg from '../../assets/images/svgicons/animal.svg';
import CuteSvg from '../../assets/images/svgicons/cute.svg';
import SimpleSvg from '../../assets/images/svgicons/simple.svg';
import FlowersSvg from '../../assets/images/svgicons/flowers.svg';

const { width } = Dimensions.get('window');

const CATEGORIES = [
  { id: 'animal', label: 'Animals', icon: AnimalSvg, color: '#FEE2E2', textColor: '#EF4444' },
  { id: 'cute', label: 'Cute', icon: CuteSvg, color: '#FEF3C7', textColor: '#F59E0B' },
  { id: 'simple', label: 'Simple', icon: SimpleSvg, color: '#D1FAE5', textColor: '#10B981' },
  { id: 'flowers', label: 'Flowers', icon: FlowersSvg, color: '#E0F2FE', textColor: '#0EA5E9' },
];

export default function KidsSelectionScreen() {
  const router = useRouter();

  return (
    <SafeAreaView className="flex-1 bg-[#F7F2EF]">
      {/* Header */}
      <View className="flex-row items-center px-6 py-4">
        <TouchableOpacity 
          onPress={() => router.back()}
          className="w-10 h-10 items-center justify-center rounded-full bg-[#3A3A3A]"
        >
          <IconSymbol name="chevron.left" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text className="ml-4 text-[24px] font-mersin-bolditalic text-[#3A3A3A]">Pick a Drawing</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} className="flex-1 px-6 mt-4">
        <Text className="text-[#A0A0A0] font-poppins text-[16px] mb-6 text-center">
          Choose your favorite category to start coloring!
        </Text>

        <View className="flex-row flex-wrap justify-between">
          {CATEGORIES.map((cat) => (
            <Link key={cat.id} href={`/drawing?slug=${cat.id}`} asChild>
              <TouchableOpacity
                className="w-[47%] mb-6 rounded-[32px] overflow-hidden shadow-sm"
                style={{ backgroundColor: cat.color }}
              >
                <View className="aspect-square items-center justify-center p-4">
                   <cat.icon width="100%" height="100%" />
                </View>
                <View className="bg-white/80 py-3 items-center">
                  <Text 
                    className="font-poppins-semibold text-[16px]"
                    style={{ color: cat.textColor }}
                  >
                    {cat.label}
                  </Text>
                </View>
              </TouchableOpacity>
            </Link>
          ))}
        </View>

        {/* Custom Upload Section */}
        <TouchableOpacity 
          className="mt-8 bg-white border-2 border-dashed border-[#A0A0A0] rounded-[32px] p-8 items-center"
          onPress={() => router.push('/drawing?mode=upload')}
        >
          <View className="w-16 h-16 bg-[#F3F4F6] rounded-full items-center justify-center mb-4">
            <IconSymbol name="paperplane.fill" size={32} color="#3A3A3A" />
          </View>
          <Text className="font-poppins-bold text-[18px] text-[#3A3A3A]">Upload Photo</Text>
          <Text className="font-poppins text-[#A0A0A0] text-[14px] mt-1">Convert your photo to drawing</Text>
        </TouchableOpacity>

        <View className="h-20" />
      </ScrollView>
    </SafeAreaView>
  );
}
