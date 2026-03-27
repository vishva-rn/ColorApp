import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { IconSymbol } from '@/components/ui/icon-symbol';
import * as ImagePicker from 'expo-image-picker';
import { Image } from 'expo-image';
import DrawingCanvas, { DrawingCanvasHandle } from '@/components/drawing/DrawingCanvas';

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
const CANVAS_SIZE = width - 48;

const DRAWINGS: Record<string, React.FC<any>> = {
  flowers: FlowersSvg,
  animal: AnimalSvg,
  cute: CuteSvg,
  simple: SimpleSvg,
};

const BRUSHES = [
  { id: 'pencil', icon: PencileSvg, strokeWidth: 2 },
  { id: 'brush', icon: BrushSvg, strokeWidth: 8 },
  { id: 'marker', icon: SketchPenSvg, strokeWidth: 12 },
  { id: 'pen', icon: BallPenSvg, strokeWidth: 4 },
  { id: 'roller', icon: PaintSvg, strokeWidth: 20 },
];

const COLORS = [
  { id: 'black', color: '#1A1A1A' },
  { id: 'brown', color: '#451A03' },
  { id: 'burnt-orange', color: '#C2410C' },
  { id: 'orange', color: '#F97316' },
  { id: 'yellow', color: '#FACC15' },
  { id: 'green', color: '#22C55E' },
  { id: 'blue', color: '#3B82F6' },
  { id: 'purple', color: '#8B5CF6' },
  { id: 'pink', color: '#EC4899' },
  { id: 'red', color: '#EF4444' },
  { id: 'white', color: '#FFFFFF' },
  { id: 'gray', color: '#9CA3AF' },
];

export default function DrawingScreen() {
  const router = useRouter();
  const { slug, mode } = useLocalSearchParams<{ slug?: string; mode?: string }>();
  
  const [selectedBrush, setSelectedBrush] = useState('pencil');
  const [selectedColor, setSelectedColor] = useState('#1A1A1A');
  const [brushSize, setBrushSize] = useState(2);
  const [opacity, setOpacity] = useState(1);
  const [pathCount, setPathCount] = useState(0);
  const [pickedImage, setPickedImage] = useState<string | null>(null);
  
  const canvasRef = useRef<DrawingCanvasHandle | null>(null);

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

  const handleBrushSelect = (brushId: string) => {
    setSelectedBrush(brushId);
    const brush = BRUSHES.find(b => b.id === brushId);
    if (brush) setBrushSize(brush.strokeWidth);
  };

  const handleSave = async () => {
    const uri = await canvasRef.current?.save();
    if (uri) {
      Alert.alert('Saved!', 'Your drawing has been saved to your gallery 🎨');
    } else {
      Alert.alert('Error', 'Could not save drawing. Please grant photo library permissions.');
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

        {/* Undo / Redo */}
        <View className="flex-row items-center gap-2">
          <TouchableOpacity 
            onPress={() => canvasRef.current?.undo()}
            className="w-10 h-10 rounded-full border border-[#F87171] items-center justify-center"
          >
            <IconSymbol name="arrow.uturn.backward" size={18} color="#F87171" />
          </TouchableOpacity>
          <TouchableOpacity 
            onPress={() => canvasRef.current?.redo()}
            className="w-10 h-10 rounded-full border border-[#F87171] items-center justify-center"
          >
            <IconSymbol name="arrow.uturn.forward" size={18} color="#F87171" />
          </TouchableOpacity>
          <TouchableOpacity 
            onPress={() => canvasRef.current?.clear()}
            className="w-10 h-10 rounded-full border border-[#F87171] items-center justify-center"
          >
            <IconSymbol name="trash" size={18} color="#F87171" />
          </TouchableOpacity>
        </View>

        <View className="flex-row items-center bg-[#3A3A3A] px-3 py-1.5 rounded-full">
          <View className="w-6 h-6 rounded-full items-center justify-center mr-2">
            <IconSymbol name="paintbrush.fill" size={16} color="#FFFFFF" />
          </View>
          <Text className="text-white font-medium text-[14px]">{pathCount}</Text>
        </View>
      </View>

      <ScrollView 
        showsVerticalScrollIndicator={false} 
        contentContainerStyle={{ paddingBottom: 40 }}
        scrollEnabled={false}
      >
        {/* Drawing Canvas */}
        <View className="px-6 mt-2">
          <View className="bg-white rounded-[32px] p-3 shadow-sm border border-gray-100">
            <DrawingCanvas
              canvasSize={CANVAS_SIZE}
              color={selectedColor}
              strokeWidth={brushSize}
              opacity={opacity}
              BackgroundSvg={!pickedImage ? SelectedSvg : undefined}
              canvasRef={canvasRef}
              onPathsChange={(p) => setPathCount(p.length)}
            />
          </View>
        </View>

        {/* Brush Selection */}
        <View className="mt-6 px-6">
          <View className="flex-row justify-between items-center mb-3">
            <Text className="text-[#3A3A3A] font-semibold text-[16px]">Brush</Text>
          </View>
          
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {BRUSHES.map((brush) => (
              <TouchableOpacity
                key={brush.id}
                onPress={() => handleBrushSelect(brush.id)}
                className={`w-16 h-16 rounded-full items-center justify-center mr-3 border-2 ${
                  selectedBrush === brush.id ? 'border-[#F87171]' : 'border-white bg-white'
                }`}
              >
                <brush.icon width={40} height={40} />
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Color Selection */}
        <View className="mt-6 px-6">
          <View className="flex-row justify-between items-center mb-3">
            <Text className="text-[#3A3A3A] font-semibold text-[16px]">Colors</Text>
          </View>
          
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {COLORS.map((c) => (
              <TouchableOpacity
                key={c.id}
                onPress={() => setSelectedColor(c.color)}
                className={`w-12 h-12 rounded-full mr-3 items-center justify-center ${
                  selectedColor === c.color ? 'border-2 border-[#F87171] p-1' : ''
                }`}
              >
                <View 
                  className={`w-full h-full rounded-full ${c.id === 'white' ? 'border border-gray-300' : ''}`}
                  style={{ backgroundColor: c.color }}
                />
                {selectedColor === c.color && (
                  <View className="absolute bottom-[-2px] right-[-2px] bg-[#F87171] rounded-full p-0.5 border border-white">
                    <SelectedIconSvg width={10} height={10} fill="white" />
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Save Button */}
        <View className="mt-8 px-6">
          <TouchableOpacity 
            onPress={handleSave}
            className="bg-[#3A3A3A] h-16 rounded-[32px] items-center justify-center shadow-lg"
          >
            <Text className="text-white font-bold text-[18px]">Save Drawing</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
