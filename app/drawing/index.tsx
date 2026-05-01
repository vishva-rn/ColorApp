import DrawingCanvas, { DrawingCanvasHandle, type DrawingPaint, type DrawingPath } from '@/components/drawing/DrawingCanvas';
import { IconSymbol, type IconSymbolName } from '@/components/ui/icon-symbol';
import { useInAppUpdates } from '@/hooks/use-in-app-updates';
import { getDrawingHistoryItemById, upsertDrawingHistoryItem } from '@/lib/drawing-history';
import { generateFourLayerSketch } from '@/lib/four-layer-sketch';
import { getOnboardingPrefs } from '@/lib/onboarding-prefs';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Image,
  Modal,
  PanResponder,
  Pressable,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, {
  Defs,
  Rect,
  Stop,
  LinearGradient as SvgLinearGradient,
  RadialGradient as SvgRadialGradient,
} from 'react-native-svg';

// SVG Icons
import BallPenSvg from '../../assets/images/svgicons/BallPen.svg';
import BrushSvg from '../../assets/images/svgicons/Brush.svg';
import BucketSvg from '../../assets/images/svgicons/bucket.svg';
import CrayonSvg from '../../assets/images/svgicons/crayon.svg';
import DrawStepsSvg from '../../assets/images/svgicons/draw-steps.svg';
import FabricSvg from '../../assets/images/svgicons/Fabric.png';
import GlowPenSvg from '../../assets/images/svgicons/glowpen.svg';
import GradientSvg from '../../assets/images/svgicons/Gradient.svg';
import MagicalSvg from '../../assets/images/svgicons/Magical.png';
import MakeUpSvg from '../../assets/images/svgicons/MakeUp.svg';
import PaintSvg from '../../assets/images/svgicons/paint.svg';
import PastelSvg from '../../assets/images/svgicons/Pastel.svg';
import PencileSvg from '../../assets/images/svgicons/Pencile.svg';
import RainbowSvg from '../../assets/images/svgicons/Rainbow.svg';
import SelectedIconSvg from '../../assets/images/svgicons/selected.svg';
import SketchPenSvg from '../../assets/images/svgicons/SketchPen.svg';

const { width } = Dimensions.get('window');
const CANVAS_SIZE = width - 48;
const MIN_CANVAS_ZOOM = 1;
const MAX_CANVAS_ZOOM = 3;
// const REMOTE_SVG_URL = 'https://blogimages.smartshot.ai/ColourApp/1e1f03d8-1041-4723-823a-341212482e3c/result_e9f6a295-f0db-4cc3-8cce-01aa887fcdf4.svg';
// const REMOTE_SVG_URL = 'https://blogimages.smartshot.ai/ColourApp/1e1f03d8-1041-4723-823a-341212482e3c/result_svg_85cc0396-faf8-41cb-a408-04bb8e57c1d9.svg';
// const REMOTE_SVG_URL = 'https://blogimages.smartshot.ai/ColourApp/1e1f03d8-1041-4723-823a-341212482e3c/result_svg_0de25cf7-aa0a-4de5-91d2-5d041d544b45.svg'
// const REMOTE_SVG_URL = 'https://blogimages.smartshot.ai/ColourApp/1e1f03d8-1041-4723-823a-341212482e3c/result_svg_652abe04-9041-4395-92f5-577a41380442.svg'
// const REMOTE_SVG_URL = 'https://blogimages.smartshot.ai/ColourApp/1e1f03d8-1041-4723-823a-341212482e3c/result_svg_875624f3-5384-4560-975e-b7b39752e8d1.svg'
//const REMOTE_SVG_URL = 'https://blogimages.smartshot.ai/ColourApp/1e1f03d8-1041-4723-823a-341212482e3c/result_svg_c72772e2-7fce-4b9d-8a3f-57abc53460c0.svg'
const REMOTE_SVG_URL = 'https://blogimages.smartshot.ai/ColourApp/1e1f03d8-1041-4723-823a-341212482e3c/result_svg_42aca2f0-7eed-4647-8a6d-5fe842d2b6be.svg'
type BrushOption =
  | { id: string; label: string; kind: 'svg'; icon: React.FC<any>; strokeWidth: number }
  | { id: string; label: string; kind: 'symbol'; symbolName: IconSymbolName; strokeWidth: number };

type PaletteOption = {
  id: string;
  label: string;
  icon: React.FC<any>;
  paints: DrawingPaint[];
};

type SliderKind = 'size' | 'opacity';

function parseColor(color: string): { r: number; g: number; b: number; a: number } {
  const normalized = color.trim().toLowerCase();

  if (normalized.startsWith('rgba(')) {
    const [r, g, b, a = '1'] = normalized.slice(5, -1).split(',').map((part) => part.trim());
    return {
      r: Number.parseFloat(r) || 0,
      g: Number.parseFloat(g) || 0,
      b: Number.parseFloat(b) || 0,
      a: Number.parseFloat(a) || 1,
    };
  }

  if (normalized.startsWith('rgb(')) {
    const [r, g, b] = normalized.slice(4, -1).split(',').map((part) => part.trim());
    return {
      r: Number.parseFloat(r) || 0,
      g: Number.parseFloat(g) || 0,
      b: Number.parseFloat(b) || 0,
      a: 1,
    };
  }

  const hex = normalized.replace('#', '');
  const expanded = hex.length === 3
    ? hex.split('').map((value) => value + value).join('')
    : hex;

  return {
    r: Number.parseInt(expanded.slice(0, 2), 16) || 0,
    g: Number.parseInt(expanded.slice(2, 4), 16) || 0,
    b: Number.parseInt(expanded.slice(4, 6), 16) || 0,
    a: 1,
  };
}

function toRgbaString(color: { r: number; g: number; b: number; a: number }) {
  return `rgba(${Math.round(color.r)}, ${Math.round(color.g)}, ${Math.round(color.b)}, ${Number(color.a.toFixed(3))})`;
}

function applyShadeToColor(color: string, shade: number) {
  const parsed = parseColor(color);
  const mix = Math.min(Math.max(shade, 0), 1);

  return toRgbaString({
    r: 255 - ((255 - parsed.r) * mix),
    g: 255 - ((255 - parsed.g) * mix),
    b: 255 - ((255 - parsed.b) * mix),
    a: parsed.a,
  });
}

function applyShadeToPaint(paint: DrawingPaint, shade: number): DrawingPaint {
  if (paint.kind === 'solid') {
    return { ...paint, color: applyShadeToColor(paint.color, shade) };
  }

  if (paint.kind === 'linear-gradient' || paint.kind === 'radial-gradient') {
    return {
      ...paint,
      colors: [
        applyShadeToColor(paint.colors[0], shade),
        applyShadeToColor(paint.colors[1], shade),
      ],
    };
  }

  return {
    ...paint,
    baseColor: applyShadeToColor(paint.baseColor, shade),
    overlays: paint.overlays.map((overlay) => ({
      ...overlay,
      colors: [
        applyShadeToColor(overlay.colors[0], shade),
        applyShadeToColor(overlay.colors[1], shade),
      ],
    })),
  };
}

function getPaintPreviewStops(paint: DrawingPaint): [string, string] {
  if (paint.kind === 'solid') {
    return [paint.color, paint.color];
  }

  if (paint.kind === 'linear-gradient' || paint.kind === 'radial-gradient') {
    return paint.colors;
  }

  const firstOverlay = paint.overlays[0];
  return [paint.baseColor, firstOverlay?.colors[1] ?? paint.baseColor];
}

const createSolidPaint = (id: string, color: string): DrawingPaint => ({
  id,
  kind: 'solid',
  color,
});

const BRUSHES = [
  { id: 'pencil', label: 'Pencil', kind: 'svg', icon: PencileSvg, strokeWidth: 2 },
  { id: 'bucket', label: 'Bucket', kind: 'svg', icon: BucketSvg, strokeWidth: 0 },
  { id: 'crayon', label: 'Crayon', kind: 'svg', icon: CrayonSvg, strokeWidth: 10 },
  { id: 'brush', label: 'Brush', kind: 'svg', icon: BrushSvg, strokeWidth: 8 },
  { id: 'glowpen', label: 'Glow Pen', kind: 'svg', icon: GlowPenSvg, strokeWidth: 10 },
  { id: 'marker', label: 'Marker', kind: 'svg', icon: SketchPenSvg, strokeWidth: 12 },
  { id: 'sketchpen', label: 'Sketch', kind: 'svg', icon: SketchPenSvg, strokeWidth: 7 },
  { id: 'pen', label: 'Ball Pen', kind: 'svg', icon: BallPenSvg, strokeWidth: 4 },
  { id: 'paint', label: 'Paint', kind: 'svg', icon: PaintSvg, strokeWidth: 16 },
  { id: 'eraser', label: 'Eraser', kind: 'symbol', symbolName: 'eraser.fill', strokeWidth: 18 },
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

function ControlSlider({
  kind,
  value,
  min,
  max,
  paint,
  onChange,
}: {
  kind: SliderKind;
  value: number;
  min: number;
  max: number;
  paint: DrawingPaint;
  onChange: (next: number) => void;
}) {
  const trackWidthRef = useRef(0);
  const [trackWidth, setTrackWidth] = useState(0);
  const [startColor, endColor] = getPaintPreviewStops(paint);

  const updateValue = (locationX: number) => {
    if (trackWidthRef.current <= 0) return;
    const clampedX = Math.min(Math.max(locationX, 0), trackWidthRef.current);
    const ratio = clampedX / trackWidthRef.current;
    onChange(min + ((max - min) * ratio));
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (event) => updateValue(event.nativeEvent.locationX),
      onPanResponderMove: (event) => updateValue(event.nativeEvent.locationX),
    }),
  ).current;

  const ratio = (value - min) / (max - min || 1);
  const thumbLeft = trackWidth > 0 ? ratio * trackWidth : 0;
  const fillWidth = trackWidth > 0 ? Math.max(thumbLeft, 10) : 10;

  return (
    <View className="flex-1">
      <View
        className="h-12 rounded-full justify-center px-3 overflow-hidden border border-[#ECE3DD]"
        style={{ backgroundColor: kind === 'size' ? '#FFF6F3' : '#F8F4F1' }}
        onLayout={(event) => {
          const nextWidth = Math.max(event.nativeEvent.layout.width - 24, 1);
          trackWidthRef.current = nextWidth;
          setTrackWidth(nextWidth);
        }}
        {...panResponder.panHandlers}
      >
        {kind === 'size' ? (
          <>
            <View className="absolute left-3 right-3 top-1/2 -mt-[3px] h-[6px] rounded-full bg-[#F1E4DD]" />
            <View
              className="absolute left-3 top-1/2 -mt-[3px] h-[6px] rounded-full overflow-hidden"
              style={{ width: fillWidth }}
            >
              <Svg width="100%" height="100%" viewBox="0 0 100 6" preserveAspectRatio="none">
                <Defs>
                  <SvgLinearGradient id={`size-slider-${paint.id}`} x1="0%" y1="0%" x2="100%" y2="0%">
                    <Stop offset="0%" stopColor={startColor} stopOpacity="0.55" />
                    <Stop offset="100%" stopColor={endColor} stopOpacity="0.95" />
                  </SvgLinearGradient>
                </Defs>
                <Rect x="0" y="0" width="100" height="6" rx="3" fill={`url(#size-slider-${paint.id})`} />
              </Svg>
            </View>
          </>
        ) : (
          <View className="h-4 rounded-full overflow-hidden bg-[#EEE4DF]">
            <Svg width="100%" height="100%" viewBox="0 0 100 16" preserveAspectRatio="none">
              <Defs>
                <SvgLinearGradient id={`opacity-slider-${paint.id}`} x1="0%" y1="0%" x2="100%" y2="0%">
                  <Stop offset="0%" stopColor="#FFFFFF" />
                  <Stop offset="100%" stopColor={endColor} stopOpacity="1" />
                </SvgLinearGradient>
              </Defs>
              <Rect x="0" y="0" width="100" height="16" fill={`url(#opacity-slider-${paint.id})`} />
            </Svg>
          </View>
        )}

        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            left: 12 + thumbLeft - 10,
            top: 8,
            width: 24,
            height: 24,
            borderRadius: 12,
            borderWidth: 3,
            borderColor: '#FFFFFF',
            backgroundColor: endColor,
            shadowColor: '#000000',
            shadowOpacity: 0.12,
            shadowRadius: 8,
            shadowOffset: { width: 0, height: 3 },
            elevation: 3,
          }}
        />
      </View>
    </View>
  );
}

function clampOffset(value: number, scale: number) {
  'worklet';

  const maxOffset = Math.max(((CANVAS_SIZE * scale) - CANVAS_SIZE) / 2, 0);
  return Math.min(Math.max(value, -maxOffset), maxOffset);
}

export default function DrawingScreen() {
  const router = useRouter();
  const { checkAndPromptUpdate } = useInAppUpdates({ enableLifecycleChecks: false });
  const { svgUrl, pngUrl, png_url, historyItemId } = useLocalSearchParams<{
    svgUrl?: string | string[];
    pngUrl?: string | string[];
    png_url?: string | string[];
    historyItemId?: string | string[];
  }>();

  const [selectedBrush, setSelectedBrush] = useState('pencil');
  const [selectedPalette, setSelectedPalette] = useState<string>('pastel');
  const [selectedPaintId, setSelectedPaintId] = useState(PALETTES[0].paints[0].id);
  const [brushSize, setBrushSize] = useState(2);
  const [shadeStrength, setShadeStrength] = useState(1);
  const [tool, setTool] = useState<'brush' | 'bucket' | 'eraser'>('brush');
  const [isCanvasGestureActive, setIsCanvasGestureActive] = useState(false);
  const [isPaletteSheetVisible, setIsPaletteSheetVisible] = useState(false);
  const [isGeneratingDrawingSteps, setIsGeneratingDrawingSteps] = useState(false);
  const [isDrawingStepsVisible, setIsDrawingStepsVisible] = useState(false);
  const [drawingStepImages, setDrawingStepImages] = useState<string[]>([]);
  const [currentDrawingPaths, setCurrentDrawingPaths] = useState<DrawingPath[]>([]);
  const [initialDrawingPaths, setInitialDrawingPaths] = useState<DrawingPath[]>([]);
  const [historySvgUrl, setHistorySvgUrl] = useState<string | undefined>(undefined);
  const [historyPngUrl, setHistoryPngUrl] = useState<string | undefined>(undefined);

  const canvasRef = useRef<DrawingCanvasHandle | null>(null);
  const activeCanvasGestureCountRef = useRef(0);
  const canvasScale = useSharedValue(1);
  const canvasTranslateX = useSharedValue(0);
  const canvasTranslateY = useSharedValue(0);
  const pinchStartScale = useSharedValue(1);
  const panStartX = useSharedValue(0);
  const panStartY = useSharedValue(0);
  const isPencilSelected = selectedBrush === 'pencil';
  const isCrayonSelected = selectedBrush === 'crayon';
  const isGlowPenSelected = selectedBrush === 'glowpen';
  const isMarkerSelected = selectedBrush === 'marker';
  const isSketchPenSelected = selectedBrush === 'sketchpen';
  const activeBrushStyle = isPencilSelected
    ? 'pencil'
    : isCrayonSelected
      ? 'crayon'
      : isGlowPenSelected
        ? 'glow-pen'
        : isMarkerSelected
          ? 'marker'
          : isSketchPenSelected
            ? 'sketch-pen'
            : selectedBrush === 'pen'
              ? 'ball-pen'
              : selectedBrush === 'paint'
                ? 'paint'
                : selectedBrush === 'brush'
                  ? 'paint-brush'
                  : 'default';
  const activePalette = PALETTES.find((palette) => palette.id === selectedPalette) ?? PALETTES[0];
  const activePaint = activePalette.paints.find((paint) => paint.id === selectedPaintId) ?? activePalette.paints[0];
  const shadedPaint = useMemo(() => applyShadeToPaint(activePaint, shadeStrength), [activePaint, shadeStrength]);
  const remoteSvgUrl = Array.isArray(svgUrl) ? svgUrl[0] : svgUrl;
  const remotePngUrlPrimary = Array.isArray(png_url) ? png_url[0] : png_url;
  const remotePngUrlAlt = Array.isArray(pngUrl) ? pngUrl[0] : pngUrl;
  const remotePngUrl = remotePngUrlPrimary ?? remotePngUrlAlt;
  const remoteHistoryItemId = Array.isArray(historyItemId) ? historyItemId[0] : historyItemId;
  const drawingSvgUrl = remoteSvgUrl?.trim()
    ? remoteSvgUrl
    : historySvgUrl?.trim()
      ? historySvgUrl
      : REMOTE_SVG_URL;
  const drawingPngUrl = remotePngUrl?.trim()
    ? remotePngUrl
    : historyPngUrl?.trim()
      ? historyPngUrl
      : undefined;

  useFocusEffect(
    useCallback(() => {
      void checkAndPromptUpdate({ bypassThrottle: true });
      return undefined;
    }, [checkAndPromptUpdate]),
  );

  useEffect(() => {
    let cancelled = false;

    if (!remoteHistoryItemId?.trim()) {
      setInitialDrawingPaths([]);
      setHistorySvgUrl(undefined);
      setHistoryPngUrl(undefined);
      return () => {
        cancelled = true;
      };
    }

    getDrawingHistoryItemById(remoteHistoryItemId)
      .then((item) => {
        if (cancelled || !item) return;

        const restoredPaths = Array.isArray(item.drawingPaths)
          ? item.drawingPaths as DrawingPath[]
          : [];
        setInitialDrawingPaths(restoredPaths);
        if (!remoteSvgUrl?.trim() && item.svgUrl?.trim()) {
          setHistorySvgUrl(item.svgUrl);
        }
        if (!remotePngUrl?.trim() && item.pngUrl?.trim()) {
          setHistoryPngUrl(item.pngUrl);
        }
      })
      .catch((error) => {
        if (!cancelled) {
          console.error('[drawing] history-load:error', error);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [remoteHistoryItemId, remotePngUrl, remoteSvgUrl]);

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

  useEffect(() => {
    let cancelled = false;

    const normalizePalette = (value?: string): string | null => {
      if (!value) return null;
      const mapping: Record<string, string> = {
        pastel: 'pastel',
        gradient: 'gradient',
        magical: 'magic',
        magic: 'magic',
        rainbow: 'rainbow',
        fabric: 'fabric',
        makeup: 'makeup',
      };
      return mapping[value.toLowerCase()] ?? null;
    };

    const normalizeBrush = (value?: string): string | null => {
      if (!value) return null;
      const mapping: Record<string, string> = {
        pencil: 'pencil',
        brush: 'brush',
        marker: 'marker',
        glow_pen: 'glowpen',
        glowpen: 'glowpen',
        crayon: 'crayon',
        paint: 'paint',
        ball_pen: 'pen',
        pen: 'pen',
        sketch_pen: 'sketchpen',
        sketchpen: 'sketchpen',
      };
      return mapping[value.toLowerCase()] ?? null;
    };

    getOnboardingPrefs()
      .then((prefs) => {
        if (cancelled) return;

        const mappedPalette = normalizePalette(prefs.palette);
        if (mappedPalette && PALETTES.some((palette) => palette.id === mappedPalette)) {
          setSelectedPalette(mappedPalette);
        }

        const mappedBrush = normalizeBrush(prefs.brush);
        if (mappedBrush && BRUSHES.some((brush) => brush.id === mappedBrush)) {
          handleBrushSelect(mappedBrush);
        }
      })
      .catch((error) => {
        if (!cancelled) {
          console.error('[drawing] onboarding-prefs:error', error);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const handleSave = async () => {
    const uri = await canvasRef.current?.save();
    if (uri) {
      try {
        await upsertDrawingHistoryItem({
          id: remoteHistoryItemId,
          imageUri: uri,
          drawingPath: uri,
          svgUrl: drawingSvgUrl,
          pngUrl: drawingPngUrl ?? uri,
          drawingPaths: currentDrawingPaths,
        });
        Alert.alert(
          'Saved!',
          'Your drawing has been saved in app history 🎨',
          [
            {
              text: 'OK',
              onPress: () => {
                router.replace('/(tabs)/history');
              },
            },
          ],
          { cancelable: false },
        );
      } catch (error) {
        console.error('[drawing] save-history:error', error);
        Alert.alert('Error', 'Drawing was saved in app storage, but history could not be updated.');
      }
    } else {
      Alert.alert('Error', 'Could not save drawing in app storage.');
    }
  };

  const handleDrawingStepsPress = async () => {
    if (isGeneratingDrawingSteps) {
      console.log('[drawing] drawing-steps:press-ignored', {
        reason: 'already-generating',
      });
      return;
    }

    const sourceImageUrl = drawingPngUrl?.trim() ? drawingPngUrl : drawingSvgUrl;

    if (!sourceImageUrl?.trim()) {
      console.warn('[drawing] drawing-steps:missing-source-url');
      Alert.alert('Drawing Steps unavailable', 'This drawing does not have an image URL to generate steps from.');
      return;
    }

    try {
      console.log('[drawing] drawing-steps:request', {
        imageUrl: sourceImageUrl,
      });
      setIsGeneratingDrawingSteps(true);
      const response = await generateFourLayerSketch(sourceImageUrl);
      console.log('[drawing] drawing-steps:success', {
        id: response.id,
        generatedImagesCount: response.generated_images.length,
      });
      setDrawingStepImages(response.generated_images);
      setIsDrawingStepsVisible(true);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to generate drawing steps right now.';
      console.error('[drawing] drawing-steps:error', {
        imageUrl: sourceImageUrl,
        error,
        message,
      });
      Alert.alert('Drawing Steps failed', message);
    } finally {
      console.log('[drawing] drawing-steps:finished');
      setIsGeneratingDrawingSteps(false);
    }
  };

  const beginCanvasGesture = () => {
    activeCanvasGestureCountRef.current += 1;
    if (activeCanvasGestureCountRef.current === 1) {
      setIsCanvasGestureActive(true);
    }
  };

  const endCanvasGesture = () => {
    activeCanvasGestureCountRef.current = Math.max(activeCanvasGestureCountRef.current - 1, 0);
    if (activeCanvasGestureCountRef.current === 0) {
      setIsCanvasGestureActive(false);
    }
  };

  const pinchGesture = Gesture.Pinch()
    .onStart(() => {
      runOnJS(beginCanvasGesture)();
      pinchStartScale.value = canvasScale.value;
    })
    .onUpdate((event) => {
      const nextScale = Math.min(
        Math.max(pinchStartScale.value * event.scale, MIN_CANVAS_ZOOM),
        MAX_CANVAS_ZOOM,
      );
      canvasScale.value = nextScale;
      canvasTranslateX.value = clampOffset(canvasTranslateX.value, nextScale);
      canvasTranslateY.value = clampOffset(canvasTranslateY.value, nextScale);
    })
    .onFinalize(() => {
      runOnJS(endCanvasGesture)();
    });

  const panGesture = Gesture.Pan()
    .minPointers(2)
    .onStart(() => {
      runOnJS(beginCanvasGesture)();
      panStartX.value = canvasTranslateX.value;
      panStartY.value = canvasTranslateY.value;
    })
    .onUpdate((event) => {
      if (canvasScale.value <= 1.01) {
        canvasTranslateX.value = 0;
        canvasTranslateY.value = 0;
        return;
      }

      canvasTranslateX.value = clampOffset(
        panStartX.value + event.translationX,
        canvasScale.value,
      );
      canvasTranslateY.value = clampOffset(
        panStartY.value + event.translationY,
        canvasScale.value,
      );
    })
    .onFinalize(() => {
      runOnJS(endCanvasGesture)();
    });

  const zoomGesture = Gesture.Simultaneous(pinchGesture, panGesture);

  const zoomedCanvasStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: canvasTranslateX.value },
      { translateY: canvasTranslateY.value },
      { scale: canvasScale.value },
    ],
  }));

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

        <TouchableOpacity
          onPress={handleDrawingStepsPress}
          disabled={isGeneratingDrawingSteps}
          className="flex-row items-center bg-[#FFF8F5] border border-[#F3D0CC] px-4 py-2.5 rounded-full"
        >
          <DrawStepsSvg width={22} height={22} />
          <Text className="text-[#3A3A3A] font-poppins-medium text-[14px] ml-2">
            {isGeneratingDrawingSteps ? 'Generating...' : 'Drawing Steps'}
          </Text>
          {isGeneratingDrawingSteps && (
            <ActivityIndicator size="small" color="#3A3A3A" style={{ marginLeft: 8 }} />
          )}
        </TouchableOpacity>
      </View>

      <View className="px-6 mt-2 items-center">
        <GestureDetector gesture={zoomGesture}>
          <View
            style={{
              width: CANVAS_SIZE,
              height: CANVAS_SIZE,
              overflow: 'hidden',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Animated.View style={zoomedCanvasStyle}>
              <DrawingCanvas
                canvasSize={CANVAS_SIZE}
                paint={shadedPaint}
                strokeWidth={brushSize}
                opacity={1}
                brushStyle={activeBrushStyle}
                tool={tool}
                drawingEnabled={!isCanvasGestureActive}
                svgUrl={drawingSvgUrl}
                initialPaths={initialDrawingPaths}
                canvasRef={canvasRef}
                onPathsChange={setCurrentDrawingPaths}
              />
            </Animated.View>
          </View>
        </GestureDetector>
      </View>

      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingTop: 24, paddingBottom: 24 }}
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
                className={`w-[76px] h-[92px] rounded-[20px] items-center justify-center mr-3 border-2 px-2 py-2 ${selectedBrush === brush.id ? 'border-[#F87171] bg-white' : 'border-white bg-white'
                  }`}
              >
                <View className="flex-1 items-center justify-center">
                  {brush.kind === 'svg' ? (
                    <brush.icon width={40} height={40} />
                  ) : (
                    <View className="w-10 h-10 rounded-full bg-[#F3F4F6] items-center justify-center">
                      <IconSymbol name={brush.symbolName} size={24} color="#3A3A3A" />
                    </View>
                  )}
                </View>
                <Text
                  className={`text-[11px] text-center font-poppins-medium ${selectedBrush === brush.id ? 'text-[#F87171]' : 'text-[#3A3A3A]'
                    }`}
                  numberOfLines={2}
                >
                  {brush.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        <View className="mt-6 px-6">
          <View className="flex-row justify-between items-center mb-3">
            <Text className="text-[#3A3A3A] font-semibold text-[16px]">Color Palette</Text>
          </View>

          <TouchableOpacity
            onPress={() => setIsPaletteSheetVisible(true)}
            activeOpacity={0.9}
            className="rounded-[24px] border border-[#F1EAE5] bg-white px-4 py-4 flex-row items-center justify-between"
          >
            <View className="flex-row items-center flex-1">
              <View className="w-14 h-14 rounded-[16px] bg-[#F7F2EF] items-center justify-center mr-4">
                <activePalette.icon width={52} height={28} />
              </View>
              <View className="flex-1">
                <Text className="text-[12px] uppercase tracking-[1px] text-[#A0A0A0] font-poppins-medium">
                  Selected Palette
                </Text>
                <Text className="text-[16px] text-[#3A3A3A] font-poppins-semibold mt-1">
                  {activePalette.label}
                </Text>
              </View>
            </View>
            <IconSymbol name="chevron.up.chevron.down" size={18} color="#3A3A3A" />
          </TouchableOpacity>
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

        <View className="mt-6 px-6">
          <View className="flex-row justify-between items-center mb-3">
            <Text className="text-[#3A3A3A] font-semibold text-[16px]">Color Shade</Text>
          </View>

          <View className="rounded-[24px] border border-[#F1EAE5] bg-white px-4 py-4">
            <View className="flex-row items-center">
              <View className="w-14 mr-3">
                <Text className="text-[12px] text-[#8D8681] font-poppins-medium mb-2">Size</Text>
              </View>
              <ControlSlider
                kind="size"
                value={brushSize}
                min={1}
                max={24}
                paint={shadedPaint}
                onChange={(next) => setBrushSize(Math.round(next))}
              />
            </View>

            <View className="flex-row items-center mt-4">
              <View className="w-14 mr-3">
                <Text className="text-[12px] text-[#8D8681] font-poppins-medium mb-2">Shade</Text>
              </View>
              <ControlSlider
                kind="opacity"
                value={shadeStrength}
                min={0.15}
                max={1}
                paint={activePaint}
                onChange={(next) => setShadeStrength(Number(next.toFixed(2)))}
              />
            </View>
          </View>
        </View>

      </ScrollView>

      <View
        className="bg-[#F7F2EF] px-3 pb-0 pt-3"
        style={{
          borderTopWidth: 1,
          borderTopColor: '#EADCD2',
        }}
      >
        <TouchableOpacity
          onPress={handleSave}
          className="bg-[#3A3A3A] h-16 rounded-[32px] items-center justify-center shadow-lg"
        >
          <Text className="text-white font-bold text-[18px]">Save Drawing</Text>
        </TouchableOpacity>
      </View>

      <Modal
        visible={isPaletteSheetVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setIsPaletteSheetVisible(false)}
      >
        <Pressable
          className="flex-1 bg-black/35 justify-end"
          onPress={() => setIsPaletteSheetVisible(false)}
        >
          <Pressable
            className="bg-[#F7F2EF] rounded-t-[32px] px-6 pt-4 pb-8"
            onPress={(event) => event.stopPropagation()}
          >
            <View className="items-center mb-4">
              <View className="w-12 h-1.5 rounded-full bg-[#D9D2CD]" />
            </View>

            <View className="flex-row items-center justify-between mb-4">
              <Text className="text-[#3A3A3A] font-semibold text-[18px]">Choose Palette</Text>
              <TouchableOpacity
                onPress={() => setIsPaletteSheetVisible(false)}
                className="w-9 h-9 rounded-full bg-white items-center justify-center"
              >
                <IconSymbol name="xmark" size={16} color="#3A3A3A" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 12 }}>
              <View className="flex-row flex-wrap justify-between">
                {PALETTES.map((palette) => (
                  <TouchableOpacity
                    key={palette.id}
                    onPress={() => {
                      setSelectedPalette(palette.id);
                      setSelectedPaintId(palette.paints[0].id);
                      setIsPaletteSheetVisible(false);
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
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal
        visible={isDrawingStepsVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setIsDrawingStepsVisible(false)}
      >
        <Pressable
          className="flex-1 bg-black/45 justify-end items-center"
          onPress={() => setIsDrawingStepsVisible(false)}
        >
          <Pressable
            className="w-full rounded-t-[22px] bg-[#FFF8F5] px-4 pt-4 pb-5"
            onPress={(event) => event.stopPropagation()}
          >
            <View className="flex-row items-center justify-between mb-3">
              <Text className="text-[#3A3A3A] text-[16px] font-poppins-semibold">Step-by-step Guide</Text>
              <TouchableOpacity
                onPress={() => setIsDrawingStepsVisible(false)}
                className="w-7 h-7 rounded-full items-center justify-center"
              >
                <IconSymbol name="xmark" size={14} color="#3A3A3A" />
              </TouchableOpacity>
            </View>

            <View className="flex-row flex-wrap justify-between">
              {drawingStepImages.map((stepImage, index) => (
                <View
                  key={`${stepImage}-${index}`}
                  className="w-[48%] bg-white rounded-[16px] p-2 mb-3 border border-[#F3ECE8]"
                >
                  <View className="rounded-[12px] overflow-hidden bg-[#F7F2EF]">
                    <Image
                      source={{ uri: stepImage }}
                      style={{ width: '100%', aspectRatio: 0.82 }}
                      resizeMode="cover"
                    />
                  </View>
                  <Text className="text-center text-[#6E665F] text-[11px] font-poppins-medium mt-2">
                    Step {index + 1}
                  </Text>
                </View>
              ))}
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}
