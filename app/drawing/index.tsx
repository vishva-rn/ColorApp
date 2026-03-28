import DrawingCanvas, { DrawingCanvasHandle } from '@/components/drawing/DrawingCanvas';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useRouter } from 'expo-router';
import React, { useRef, useState } from 'react';
import {
  Alert,
  Dimensions,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// SVG Icons
import BallPenSvg from '../../assets/images/svgicons/BallPen.svg';
import BrushSvg from '../../assets/images/svgicons/Brush.svg';
import PaintSvg from '../../assets/images/svgicons/paint.svg';
import PencileSvg from '../../assets/images/svgicons/Pencile.svg';
import SelectedIconSvg from '../../assets/images/svgicons/selected.svg';
import SketchPenSvg from '../../assets/images/svgicons/SketchPen.svg';

const { width } = Dimensions.get('window');
const CANVAS_SIZE = width - 48;
// const REMOTE_SVG_URL = 'https://blogimages.smartshot.ai/ColourApp/1e1f03d8-1041-4723-823a-341212482e3c/result_e9f6a295-f0db-4cc3-8cce-01aa887fcdf4.svg';
// const REMOTE_SVG_URL = 'https://blogimages.smartshot.ai/ColourApp/1e1f03d8-1041-4723-823a-341212482e3c/result_svg_85cc0396-faf8-41cb-a408-04bb8e57c1d9.svg';
// const REMOTE_SVG_URL = 'https://blogimages.smartshot.ai/ColourApp/1e1f03d8-1041-4723-823a-341212482e3c/result_svg_0de25cf7-aa0a-4de5-91d2-5d041d544b45.svg'
// const REMOTE_SVG_URL = 'https://blogimages.smartshot.ai/ColourApp/1e1f03d8-1041-4723-823a-341212482e3c/result_svg_652abe04-9041-4395-92f5-577a41380442.svg'
// const REMOTE_SVG_URL = 'https://blogimages.smartshot.ai/ColourApp/1e1f03d8-1041-4723-823a-341212482e3c/result_svg_875624f3-5384-4560-975e-b7b39752e8d1.svg'
//const REMOTE_SVG_URL = 'https://blogimages.smartshot.ai/ColourApp/1e1f03d8-1041-4723-823a-341212482e3c/result_svg_c72772e2-7fce-4b9d-8a3f-57abc53460c0.svg'
const REMOTE_SVG_URL = 'https://blogimages.smartshot.ai/ColourApp/1e1f03d8-1041-4723-823a-341212482e3c/result_svg_4df8e4f1-f6b5-48c0-9b54-94a6a8902fda.svg'
type BrushOption =
  | { id: string; kind: 'svg'; icon: React.FC<any>; strokeWidth: number }
  | { id: string; kind: 'symbol'; symbolName: string; strokeWidth: number };

const BRUSHES = [
  { id: 'pencil', kind: 'svg', icon: PencileSvg, strokeWidth: 2 },
  { id: 'brush', kind: 'svg', icon: BrushSvg, strokeWidth: 8 },
  { id: 'marker', kind: 'svg', icon: SketchPenSvg, strokeWidth: 12 },
  { id: 'pen', kind: 'svg', icon: BallPenSvg, strokeWidth: 4 },
  { id: 'roller', kind: 'svg', icon: PaintSvg, strokeWidth: 20 },
  { id: 'eraser', kind: 'symbol', symbolName: 'eraser.fill', strokeWidth: 18 },
  { id: 'bucket', kind: 'svg', icon: PaintSvg, strokeWidth: 0 },
] satisfies BrushOption[];

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

  const [selectedBrush, setSelectedBrush] = useState('pencil');
  const [selectedColor, setSelectedColor] = useState('#1A1A1A');
  const [brushSize, setBrushSize] = useState(2);
  const [tool, setTool] = useState<'brush' | 'bucket' | 'eraser'>('brush');
  const [pathCount, setPathCount] = useState(0);

  const canvasRef = useRef<DrawingCanvasHandle | null>(null);

  const handleBrushSelect = (brushId: string) => {
    setSelectedBrush(brushId);
    if (brushId === 'bucket') {
      setTool('bucket');
    } else if (brushId === 'eraser') {
      setTool('eraser');
      const brush = BRUSHES.find(b => b.id === brushId);
      if (brush) setBrushSize(brush.strokeWidth);
    } else {
      setTool('brush');
      const brush = BRUSHES.find(b => b.id === brushId);
      if (brush) setBrushSize(brush.strokeWidth);
    }
  };

  const handleSave = async () => {
    const uri = await canvasRef.current?.save();
    if (uri) {
      Alert.alert('Saved!', 'Your drawing has been saved to your gallery 🎨');
    } else {
      Alert.alert('Error', 'Could not save drawing. Please grant photo library permissions.');
    }
  };

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
              opacity={1}
              tool={tool}
              svgUrl={REMOTE_SVG_URL}
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
                className={`w-16 h-16 rounded-full items-center justify-center mr-3 border-2 ${selectedBrush === brush.id ? 'border-[#F87171]' : 'border-white bg-white'
                  }`}
              >
                {brush.kind === 'svg' ? (
                  <brush.icon width={40} height={40} />
                ) : (
                  <View className="w-10 h-10 rounded-full bg-[#F3F4F6] items-center justify-center">
                    <IconSymbol name={brush.symbolName} size={24} color="#3A3A3A" />
                  </View>
                )}
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
                className={`w-12 h-12 rounded-full mr-3 items-center justify-center ${selectedColor === c.color ? 'border-2 border-[#F87171] p-1' : ''
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
