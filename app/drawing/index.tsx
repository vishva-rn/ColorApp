import DrawingCanvas, { type DrawingPaint, DrawingCanvasHandle } from '@/components/drawing/DrawingCanvas';
import { IconSymbol, type IconSymbolName } from '@/components/ui/icon-symbol';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
  Alert,
  Dimensions,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, {
  Defs,
  LinearGradient as SvgLinearGradient,
  RadialGradient as SvgRadialGradient,
  Rect,
  Stop,
} from 'react-native-svg';

// SVG Icons
import BallPenSvg from '../../assets/images/svgicons/BallPen.svg';
import BrushSvg from '../../assets/images/svgicons/Brush.svg';
import FabricSvg from '../../assets/images/svgicons/Fabric.svg';
import GradientSvg from '../../assets/images/svgicons/Gradient.svg';
import MagicalSvg from '../../assets/images/svgicons/Magical.svg';
import MakeUpSvg from '../../assets/images/svgicons/MakeUp.svg';
import PaintSvg from '../../assets/images/svgicons/paint.svg';
import PastelSvg from '../../assets/images/svgicons/Pastel.svg';
import PencileSvg from '../../assets/images/svgicons/Pencile.svg';
import RainbowSvg from '../../assets/images/svgicons/Rainbow.svg';
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
const REMOTE_SVG_URL = 'https://blogimages.smartshot.ai/ColourApp/1e1f03d8-1041-4723-823a-341212482e3c/result_svg_42aca2f0-7eed-4647-8a6d-5fe842d2b6be.svg'
type BrushOption =
  | { id: string; kind: 'svg'; icon: React.FC<any>; strokeWidth: number }
  | { id: string; kind: 'symbol'; symbolName: IconSymbolName; strokeWidth: number };

type PaletteOption = {
  id: string;
  label: string;
  icon: React.FC<any>;
  paints: DrawingPaint[];
};

const createSolidPaint = (id: string, color: string): DrawingPaint => ({
  id,
  kind: 'solid',
  color,
});

const BRUSHES = [
  { id: 'pencil', kind: 'svg', icon: PencileSvg, strokeWidth: 2 },
  { id: 'brush', kind: 'svg', icon: BrushSvg, strokeWidth: 8 },
  { id: 'marker', kind: 'svg', icon: SketchPenSvg, strokeWidth: 12 },
  { id: 'pen', kind: 'svg', icon: BallPenSvg, strokeWidth: 4 },
  { id: 'roller', kind: 'svg', icon: PaintSvg, strokeWidth: 20 },
  { id: 'eraser', kind: 'symbol', symbolName: 'eraser.fill', strokeWidth: 18 },
  { id: 'bucket', kind: 'svg', icon: PaintSvg, strokeWidth: 0 },
] satisfies BrushOption[];

const PALETTES: PaletteOption[] = [
  {
    id: 'pastel',
    label: 'Pastel',
    icon: PastelSvg,
    paints: [
      createSolidPaint('pastel-1', '#FF9FA5'),
      createSolidPaint('pastel-2', '#FFC17A'),
      createSolidPaint('pastel-3', '#FFF08A'),
      createSolidPaint('pastel-4', '#C8F4A9'),
      createSolidPaint('pastel-5', '#8CE7F2'),
      createSolidPaint('pastel-6', '#9BB7F6'),
      createSolidPaint('pastel-7', '#B5A3F4'),
    ],
  },
  {
    id: 'gradient',
    label: 'Gradient',
    icon: GradientSvg,
    paints: [
      {
        id: 'gradient-sunset',
        kind: 'radial-gradient',
        colors: ['#FF512F', '#DD2476'],
        center: { x: 0.5, y: 0.5 },
        radius: 0.5,
      },
      {
        id: 'gradient-ocean',
        kind: 'linear-gradient',
        colors: ['#2193B0', '#6DD5ED'],
        start: { x: 0.5, y: 0 },
        end: { x: 0.5, y: 1 },
      },
      {
        id: 'gradient-violet',
        kind: 'linear-gradient',
        colors: ['#7F00FF', '#E100FF'],
        start: { x: 0.5, y: 0 },
        end: { x: 0.5, y: 1 },
      },
      {
        id: 'gradient-gold',
        kind: 'linear-gradient',
        colors: ['#F7971E', '#FFD200'],
        start: { x: 0.5, y: 0 },
        end: { x: 0.5, y: 1 },
      },
      {
        id: 'gradient-green',
        kind: 'linear-gradient',
        colors: ['#11998E', '#38EF7D'],
        start: { x: 0.5, y: 0 },
        end: { x: 0.5, y: 1 },
      },
      {
        id: 'gradient-fusion',
        kind: 'layered-gradient',
        baseColor: '#FFFFFF',
        overlays: [
          {
            colors: ['rgba(136, 203, 53, 0.63)', 'rgba(132, 0, 255, 0.63)'],
            start: { x: 0.82, y: 0 },
            end: { x: 0.18, y: 1 },
          },
        ],
      },
      {
        id: 'gradient-graphite',
        kind: 'linear-gradient',
        colors: ['#232526', '#414345'],
        start: { x: 0.5, y: 0 },
        end: { x: 0.5, y: 1 },
      },
    ],
  },
  {
    id: 'magic',
    label: 'Magic',
    icon: MagicalSvg,
    paints: [
      createSolidPaint('magic-1', '#2E7DE9'),
      createSolidPaint('magic-2', '#5227C6'),
      createSolidPaint('magic-3', '#6C2BD9'),
      createSolidPaint('magic-4', '#25357A'),
      createSolidPaint('magic-5', '#0F6B93'),
      createSolidPaint('magic-6', '#E47A26'),
      createSolidPaint('magic-7', '#4B1D6B'),
    ],
  },
  {
    id: 'rainbow',
    label: 'Rainbow',
    icon: RainbowSvg,
    paints: [
      createSolidPaint('rainbow-1', '#FF4A43'),
      createSolidPaint('rainbow-2', '#FF9845'),
      createSolidPaint('rainbow-3', '#FFD34D'),
      createSolidPaint('rainbow-4', '#61C552'),
      createSolidPaint('rainbow-5', '#72D8F5'),
      createSolidPaint('rainbow-6', '#5D27ED'),
      createSolidPaint('rainbow-7', '#9D33E9'),
    ],
  },
  {
    id: 'fabric',
    label: 'Fabric',
    icon: FabricSvg,
    paints: [
      createSolidPaint('fabric-1', '#9B1C15'),
      createSolidPaint('fabric-2', '#DFA362'),
      createSolidPaint('fabric-3', '#CDB39A'),
      createSolidPaint('fabric-4', '#7B6A43'),
      createSolidPaint('fabric-5', '#2E4A18'),
      createSolidPaint('fabric-6', '#EFD2A4'),
      createSolidPaint('fabric-7', '#6B4F2A'),
    ],
  },
  {
    id: 'makeup',
    label: 'Makeup',
    icon: MakeUpSvg,
    paints: [
      createSolidPaint('makeup-1', '#EFB9C7'),
      createSolidPaint('makeup-2', '#E9A6B5'),
      createSolidPaint('makeup-3', '#D77FB6'),
      createSolidPaint('makeup-4', '#BF6D82'),
      createSolidPaint('makeup-5', '#7E6B97'),
      createSolidPaint('makeup-6', '#F7C4A6'),
      createSolidPaint('makeup-7', '#3F5C80'),
    ],
  },
];

function PaintSwatch({ paint }: { paint: DrawingPaint }) {
  if (paint.kind === 'solid') {
    return <View className="w-full h-full rounded-full" style={{ backgroundColor: paint.color }} />;
  }

  if (paint.kind === 'radial-gradient') {
    return (
      <Svg width="100%" height="100%" viewBox="0 0 100 100">
        <Defs>
          <SvgRadialGradient id={paint.id} cx="50%" cy="50%" r={`${paint.radius * 100}%`}>
            <Stop offset="0%" stopColor={paint.colors[0]} />
            <Stop offset="100%" stopColor={paint.colors[1]} />
          </SvgRadialGradient>
        </Defs>
        <Rect x="0" y="0" width="100" height="100" rx="50" fill={`url(#${paint.id})`} />
      </Svg>
    );
  }

  if (paint.kind === 'linear-gradient') {
    return (
      <Svg width="100%" height="100%" viewBox="0 0 100 100">
        <Defs>
          <SvgLinearGradient
            id={paint.id}
            x1={`${paint.start.x * 100}%`}
            y1={`${paint.start.y * 100}%`}
            x2={`${paint.end.x * 100}%`}
            y2={`${paint.end.y * 100}%`}
          >
            <Stop offset="0%" stopColor={paint.colors[0]} />
            <Stop offset="100%" stopColor={paint.colors[1]} />
          </SvgLinearGradient>
        </Defs>
        <Rect x="0" y="0" width="100" height="100" rx="50" fill={`url(#${paint.id})`} />
      </Svg>
    );
  }

  const overlay = paint.overlays[0];

  return (
    <Svg width="100%" height="100%" viewBox="0 0 100 100">
      <Defs>
        <SvgLinearGradient
          id={paint.id}
          x1={`${overlay.start.x * 100}%`}
          y1={`${overlay.start.y * 100}%`}
          x2={`${overlay.end.x * 100}%`}
          y2={`${overlay.end.y * 100}%`}
        >
          <Stop offset="0%" stopColor={overlay.colors[0]} />
          <Stop offset="100%" stopColor={overlay.colors[1]} />
        </SvgLinearGradient>
      </Defs>
      <Rect x="0" y="0" width="100" height="100" rx="50" fill={paint.baseColor} />
      <Rect x="0" y="0" width="100" height="100" rx="50" fill={`url(#${paint.id})`} />
    </Svg>
  );
}

export default function DrawingScreen() {
  const router = useRouter();
  const { svgUrl } = useLocalSearchParams<{ svgUrl?: string | string[] }>();

  const [selectedBrush, setSelectedBrush] = useState('pencil');
  const [selectedPalette, setSelectedPalette] = useState<string>('pastel');
  const [selectedPaintId, setSelectedPaintId] = useState(PALETTES[0].paints[0].id);
  const [brushSize, setBrushSize] = useState(2);
  const [tool, setTool] = useState<'brush' | 'bucket' | 'eraser'>('brush');
  const [pathCount, setPathCount] = useState(0);

  const canvasRef = useRef<DrawingCanvasHandle | null>(null);
  const activePalette = PALETTES.find((palette) => palette.id === selectedPalette) ?? PALETTES[0];
  const activePaint = activePalette.paints.find((paint) => paint.id === selectedPaintId) ?? activePalette.paints[0];
  const remoteSvgUrl = Array.isArray(svgUrl) ? svgUrl[0] : svgUrl;
  const drawingSvgUrl = remoteSvgUrl?.trim() ? remoteSvgUrl : REMOTE_SVG_URL;

  useEffect(() => {
    if (!activePalette.paints.some((paint) => paint.id === selectedPaintId)) {
      setSelectedPaintId(activePalette.paints[0].id);
    }
  }, [activePalette, selectedPaintId]);

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

      <View className="px-6 mt-2">
        <View className="bg-white rounded-[32px] p-3 shadow-sm border border-gray-100">
          <DrawingCanvas
            canvasSize={CANVAS_SIZE}
            paint={activePaint}
            strokeWidth={brushSize}
            opacity={1}
            tool={tool}
            svgUrl={drawingSvgUrl}
            canvasRef={canvasRef}
            onPathsChange={(p) => setPathCount(p.length)}
          />
        </View>
      </View>

      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingTop: 24, paddingBottom: 40 }}
      >
        {/* Brush Selection */}
        <View className="px-6">
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

        {/* Palette Selection */}
        <View className="mt-6 px-6">
          <View className="flex-row justify-between items-center mb-3">
            <Text className="text-[#3A3A3A] font-semibold text-[16px]">Color Palette</Text>
          </View>

          <View className="flex-row flex-wrap justify-between">
            {PALETTES.map((palette) => (
              <TouchableOpacity
                key={palette.id}
                onPress={() => {
                  setSelectedPalette(palette.id);
                  setSelectedPaintId(palette.paints[0].id);
                }}
                activeOpacity={0.9}
                className={`w-[48.5%] rounded-[20px] px-4 py-4 mb-3 border ${selectedPalette === palette.id
                    ? 'bg-[#3A3A3A] border-[#3A3A3A]'
                    : 'bg-white border-[#F1EAE5]'
                  }`}
              >
                <View
                  className={`w-5 h-5 rounded-full items-center justify-center mb-3 ${selectedPalette === palette.id ? 'bg-[#F0626E]' : 'bg-transparent'
                    }`}
                >
                  {selectedPalette === palette.id && (
                    <SelectedIconSvg width={10} height={10} fill="white" />
                  )}
                </View>

                <View className="items-center">
                  <palette.icon width={92} height={50} />
                  <Text
                    className={`mt-2 text-[14px] font-poppins-medium ${selectedPalette === palette.id ? 'text-white' : 'text-[#3A3A3A]'
                      }`}
                  >
                    {palette.label}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Fill Color Selection */}
        <View className="mt-2 px-6">
          <View className="flex-row justify-between items-center mb-3">
            <Text className="text-[#3A3A3A] font-semibold text-[16px]">Fill Colors</Text>
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {activePalette.paints.map((paint) => (
              <TouchableOpacity
                key={`${activePalette.id}-${paint.id}`}
                onPress={() => setSelectedPaintId(paint.id)}
                className={`w-12 h-12 rounded-full mr-3 items-center justify-center ${selectedPaintId === paint.id ? 'border-2 border-[#F87171] p-1' : ''
                  }`}
              >
                <PaintSwatch paint={paint} />
                {selectedPaintId === paint.id && (
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
