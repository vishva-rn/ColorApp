import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { IconSymbol } from '@/components/ui/icon-symbol';
import * as ImagePicker from 'expo-image-picker';
import { Image } from 'expo-image';

// SVG Icons
import FlowersSvg from '../../assets/images/svgicons/flowers.svg';
import AnimalSvg from '../../assets/images/svgicons/animal.svg';
import CuteSvg from '../../assets/images/svgicons/cute.svg';
import SimpleSvg from '../../assets/images/svgicons/simple.svg';

import PencileSvg from '../../assets/images/svgicons/Pencile.svg';
import BrushSvg from '../../assets/images/svgicons/Brush.svg';
import SketchPenSvg from '../../assets/images/svgicons/SketchPen.svg';
import BallPenSvg from '../../assets/images/svgicons/BallPen.svg';
import PaintSvg from '../../assets/images/svgicons/paint.svg';
import SelectedIconSvg from '../../assets/images/svgicons/selected.svg';

const { width } = Dimensions.get('window');

const DRAWINGS: Record<string, React.FC<any>> = {
  flowers: FlowersSvg,
  animal: AnimalSvg,
  cute: CuteSvg,
  simple: SimpleSvg,
};

const BRUSHES = [
  { id: 'pencil', icon: PencileSvg, color: '#FCD34D' },
  { id: 'brush', icon: BrushSvg, color: '#F472B6' },
  { id: 'marker', icon: SketchPenSvg, color: '#FBBF24' },
  { id: 'pen', icon: BallPenSvg, color: '#3B82F6' },
  { id: 'roller', icon: PaintSvg, color: '#EF4444' },
];

const COLORS = [
  { id: 'wheel', color: 'rainbow' },
  { id: 'black', color: '#1A1A1A' },
  { id: 'brown', color: '#451A03' },
  { id: 'burnt-orange', color: '#C2410C' },
  { id: 'orange', color: '#F97316' },
  { id: 'yellow', color: '#FACC15' },
];

export default function DrawingScreen() {
  const router = useRouter();
  const { slug, mode } = useLocalSearchParams<{ slug?: string; mode?: string }>();
  
  const [selectedBrush, setSelectedBrush] = useState('pencil');
  const [selectedColor, setSelectedColor] = useState('black');
  const [pickedImage, setPickedImage] = useState<string | null>(null);

  useEffect(() => {
    if (mode === 'upload') {
      pickImage();
    }
  }, [mode]);

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled) {
      setPickedImage(result.assets[0].uri);
    }
  };

  const SelectedSvg = (slug && DRAWINGS[slug]) || FlowersSvg;

  return (
    <SafeAreaView className="flex-1 bg-[#F7F2EF]">
      {/* Header */}
      <View className="flex-row items-center justify-between px-6 py-4">
        <TouchableOpacity 
          onPress={() => router.back()}
          className="w-10 h-10 items-center justify-center rounded-full bg-[#3A3A3A]"
        >
          <IconSymbol name="chevron.left" size={24} color="#FFFFFF" />
        </TouchableOpacity>

        <View className="flex-row items-center bg-[#3A3A3A] px-3 py-1.5 rounded-full">
           <View className="w-6 h-6 rounded-full items-center justify-center mr-2">
              <IconSymbol name="paintbrush.fill" size={16} color="#FFFFFF" />
           </View>
           <Text className="text-white font-poppins-medium text-[14px]">12</Text>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
        {/* Drawing Canvas Area */}
        <View className="px-6 mt-4">
          <View className="bg-white rounded-[32px] p-6 shadow-sm border border-gray-100 relative">
            {/* Canvas Controls */}
            <View className="absolute top-4 right-4 flex-row gap-2 z-10">
              <TouchableOpacity className="w-8 h-8 rounded-full border border-[#F87171] items-center justify-center">
                <IconSymbol name="chevron.left" size={16} color="#F87171" />
              </TouchableOpacity>
              <TouchableOpacity className="w-8 h-8 rounded-full border border-[#F87171] items-center justify-center transform rotate-180">
                <IconSymbol name="chevron.left" size={16} color="#F87171" />
              </TouchableOpacity>
            </View>

            {/* Drawing Content */}
            <View className="aspect-square items-center justify-center overflow-hidden rounded-[24px]">
              {pickedImage ? (
                <View className="w-full h-full items-center justify-center">
                   <Image 
                    source={{ uri: pickedImage }} 
                    style={{ width: '100%', height: '100%', opacity: 0.6 }}
                    contentFit="contain"
                    // Simple sketch filter simulation using styling
                  />
                  {/* Overlay a subtle edge-like effect if possible, otherwise just grayscale */}
                </View>
              ) : (
                <SelectedSvg width={width * 0.7} height={width * 0.7} />
              )}
            </View>

            {/* Drawing Steps */}
            <View className="absolute bottom-4 left-4 bg-[#FFF1F1] border border-[#F87171] px-3 py-1.5 rounded-full flex-row items-center">
              <IconSymbol name="paperplane.fill" size={14} color="#FB923C" />
              <Text className="ml-2 text-[#3A3A3A] font-poppins text-[12px]">Drawing Steps</Text>
            </View>
          </View>
        </View>

        {/* Brush Selection */}
        <View className="mt-8 px-6">
          <View className="flex-row justify-between items-center mb-4">
            <Text className="text-[#3A3A3A] font-poppins-semibold text-[16px]">Brush</Text>
            <TouchableOpacity>
              <Text className="text-[#F87171] font-poppins text-[14px]">See All {'>'}</Text>
            </TouchableOpacity>
          </View>
          
          <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row">
            {BRUSHES.map((brush) => (
              <TouchableOpacity
                key={brush.id}
                onPress={() => setSelectedBrush(brush.id)}
                className={`w-16 h-16 rounded-full items-center justify-center mr-3 border-2 ${
                  selectedBrush === brush.id ? 'border-[#F87171]' : 'border-white bg-[#FFFFFF]'
                }`}
              >
                <brush.icon width={40} height={40} />
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Sliders Placeholder */}
        <View className="mt-6 px-6">
          {/* Size Slider */}
          <View className="flex-row items-center mb-6">
             <View className="flex-1 h-3 bg-[#FFF1F1] rounded-full relative justify-center">
                <View className="absolute left-0 h-3 w-1/2 bg-[#3A3A3A] rounded-full" />
                <View className="absolute left-1/2 w-5 h-5 bg-[#3A3A3A] rounded-full border-4 border-white shadow-sm" />
             </View>
          </View>
          
          {/* Opacity Slider */}
          <View className="flex-row items-center">
             <View className="flex-1 h-3 bg-[#E5E7EB] rounded-full relative justify-center overflow-hidden">
                <View className="absolute right-0 w-full h-full bg-gradient-to-r from-transparent to-black opacity-30" />
                <View className="absolute right-1/4 w-5 h-5 bg-white rounded-full border-4 border-[#3A3A3A] shadow-sm" />
             </View>
          </View>
        </View>

        {/* Color Selection */}
        <View className="mt-8 px-6">
          <View className="flex-row justify-between items-center mb-4">
            <Text className="text-[#3A3A3A] font-poppins-semibold text-[16px]">Colors</Text>
            <TouchableOpacity>
              <Text className="text-[#F87171] font-poppins text-[14px]">See All {'>'}</Text>
            </TouchableOpacity>
          </View>
          
          <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row">
            {COLORS.map((color) => (
              <TouchableOpacity
                key={color.id}
                onPress={() => setSelectedColor(color.id)}
                className={`w-14 h-14 rounded-full mr-3 items-center justify-center ${
                  selectedColor === color.id ? 'border-2 border-[#F87171] p-1' : ''
                }`}
              >
                {color.id === 'wheel' ? (
                  <View className="w-full h-full rounded-full bg-blue-500 overflow-hidden relative">
                    {/* Simplified color wheel representation */}
                    <View className="absolute inset-0 bg-[#3B82F6]" />
                    <View className="absolute inset-0 bg-red-400 opacity-50" style={{ transform: [{ rotate: '45deg' }] }} />
                    <View className="absolute inset-0 bg-yellow-400 opacity-50" style={{ transform: [{ rotate: '90deg' }] }} />
                  </View>
                ) : (
                  <View 
                    className="w-full h-full rounded-full" 
                    style={{ backgroundColor: color.color }}
                  />
                )}
                {selectedColor === color.id && color.id !== 'wheel' && (
                  <View className="absolute bottom-[-2px] right-[-2px] bg-[#F87171] rounded-full p-0.5 border border-white">
                    <SelectedIconSvg width={12} height={12} fill="white" />
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Save Button */}
        <View className="mt-10 px-6">
          <TouchableOpacity className="bg-[#3A3A3A] h-16 rounded-[32px] items-center justify-center shadow-lg">
            <Text className="text-white font-poppins-bold text-[18px]">Save</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Persistent Bottom Bar Buffer */}
      <View className="h-10" />
    </SafeAreaView>
  );
}
