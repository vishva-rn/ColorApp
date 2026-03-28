/**
 * DrawingCanvas — Touch-based SVG drawing canvas for coloring apps.
 *
 * Supports:
 * - Freehand drawing with configurable brush size, color, opacity
 * - Undo / Redo
 * - Clear canvas
 * - Optional background outline (rendered from raw SVG path data)
 * - Optional clipPath to restrict drawing to within the outline shape
 * - Save to gallery via react-native-view-shot
 */

import * as FileSystem from 'expo-file-system';
import { Image } from 'expo-image';
import * as MediaLibrary from 'expo-media-library';
import React, { useCallback, useMemo, useRef, useState } from 'react';
import { Dimensions, GestureResponderEvent, ImageSourcePropType, PanResponder, View } from 'react-native';
import Svg, { G, Path } from 'react-native-svg';
import ViewShot from 'react-native-view-shot';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export interface DrawingPath {
  type: 'stroke' | 'fill' | 'bgFill';
  d?: string; // for stroke
  index?: number; // for fill segment index
  color: string;
  strokeWidth?: number;
  opacity: number;
}

export interface OutlinePath {
  d: string;
  transform?: string;
}

interface DrawingCanvasProps {
  /** Canvas width & height (default: screen width - 48) */
  canvasSize?: number;
  /** Current brush color */
  color?: string;
  /** Current brush stroke width */
  strokeWidth?: number;
  /** Current brush opacity (0-1) */
  opacity?: number;
  /** Current tool: 'brush' for freehand, 'bucket' for tap-to-fill */
  tool?: 'brush' | 'bucket';
  /** Background SVG component (legacy, prefer outlinePathData) */
  BackgroundSvg?: React.FC<{ width: number; height: number }>;
  /** Background image source (PNG/JPG) */
  backgroundImage?: ImageSourcePropType;
  /** Raw SVG path 'd' attribute for the outline shape (legacy) */
  outlinePathData?: string;
  /** Multiple outline paths for complex SVGs */
  outlinePaths?: OutlinePath[];
  /** Original viewBox of the outline SVG, e.g. { width: 141, height: 440 } */
  outlineViewBox?: { width: number; height: number };
  /** Callback when paths change */
  onPathsChange?: (paths: DrawingPath[]) => void;
  /** Ref to expose canvas methods */
  canvasRef?: React.MutableRefObject<DrawingCanvasHandle | null>;
}

export interface DrawingCanvasHandle {
  undo: () => void;
  redo: () => void;
  clear: () => void;
  save: () => Promise<string | null>;
  getPathCount: () => number;
}

const DrawingCanvas: React.FC<DrawingCanvasProps> = ({
  canvasSize = SCREEN_WIDTH - 48,
  color = '#000000',
  strokeWidth = 4,
  opacity = 1,
  tool = 'brush',
  BackgroundSvg,
  backgroundImage,
  outlinePathData,
  outlinePaths,
  outlineViewBox,
  onPathsChange,
  canvasRef,
}) => {
  const [paths, setPaths] = useState<DrawingPath[]>([]);
  const [redoStack, setRedoStack] = useState<DrawingPath[]>([]);
  const currentPath = useRef<string>('');
  const [currentDrawing, setCurrentDrawing] = useState<DrawingPath | null>(null);
  const viewShotRef = useRef<ViewShot>(null);

  // Compute current fills from paths
  const segmentFills = useMemo(() => {
    const fills: Record<number, string> = {};
    paths.forEach(p => {
      if (p.type === 'fill' && p.index !== undefined) {
        fills[p.index] = p.color;
      }
    });
    return fills;
  }, [paths]);

  // Compute current background color from paths
  const backgroundColor = useMemo(() => {
    let lastBgColor = "#FFFFFF";
    paths.forEach(p => {
      if (p.type === 'bgFill') {
        lastBgColor = p.color;
      }
    });
    return lastBgColor;
  }, [paths]);

  // Compute the transform to fit the outline SVG into the square canvas
  // Mimics SVG preserveAspectRatio="xMidYMid meet"
  const outlineTransform = useMemo(() => {
    if ((!outlinePathData && !outlinePaths) || !outlineViewBox) return null;
    const { width: svgW, height: svgH } = outlineViewBox;
    const scale = Math.min(canvasSize / svgW, canvasSize / svgH);
    const offsetX = (canvasSize - svgW * scale) / 2;
    const offsetY = (canvasSize - svgH * scale) / 2;
    return `translate(${offsetX}, ${offsetY}) scale(${scale})`;
  }, [outlinePathData, outlinePaths, outlineViewBox, canvasSize]);

  const getPoint = (e: GestureResponderEvent) => {
    const { locationX, locationY } = e.nativeEvent;
    return { x: Math.round(locationX * 100) / 100, y: Math.round(locationY * 100) / 100 };
  };

  const handleFill = (index: number) => {
    if (tool !== 'bucket') return;

    const newPath: DrawingPath = {
      type: 'fill',
      index,
      color,
      opacity,
    };
    const newPaths = [...paths, newPath];
    setPaths(newPaths);
    setRedoStack([]);
    onPathsChange?.(newPaths);
  };

  const handleBgFill = () => {
    if (tool !== 'bucket') return;

    const newPath: DrawingPath = {
      type: 'bgFill',
      color,
      opacity,
    };
    const newPaths = [...paths, newPath];
    setPaths(newPaths);
    setRedoStack([]);
    onPathsChange?.(newPaths);
  };

  const panResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => tool === 'brush',
    onMoveShouldSetPanResponder: () => tool === 'brush',
    onPanResponderGrant: (e) => {
      if (tool !== 'brush') return;
      const { x, y } = getPoint(e);
      currentPath.current = `M${x},${y}`;
      setCurrentDrawing({
        type: 'stroke',
        d: currentPath.current,
        color,
        strokeWidth,
        opacity,
      });
    },
    onPanResponderMove: (e) => {
      if (tool !== 'brush') return;
      const { x, y } = getPoint(e);
      currentPath.current += ` L${x},${y}`;
      setCurrentDrawing({
        type: 'stroke',
        d: currentPath.current,
        color,
        strokeWidth,
        opacity,
      });
    },
    onPanResponderRelease: () => {
      if (tool !== 'brush') return;
      if (currentPath.current) {
        const newPath: DrawingPath = {
          type: 'stroke',
          d: currentPath.current,
          color,
          strokeWidth,
          opacity,
        };
        const newPaths = [...paths, newPath];
        setPaths(newPaths);
        setRedoStack([]);
        onPathsChange?.(newPaths);
      }
      currentPath.current = '';
      setCurrentDrawing(null);
    },
  });

  const undo = useCallback(() => {
    if (paths.length === 0) return;
    const newPaths = [...paths];
    const removed = newPaths.pop()!;
    setPaths(newPaths);
    setRedoStack((prev) => [...prev, removed]);
    onPathsChange?.(newPaths);
  }, [paths, onPathsChange]);

  const redo = useCallback(() => {
    if (redoStack.length === 0) return;
    const newRedo = [...redoStack];
    const restored = newRedo.pop()!;
    const newPaths = [...paths, restored];
    setPaths(newPaths);
    setRedoStack(newRedo);
    onPathsChange?.(newPaths);
  }, [paths, redoStack, onPathsChange]);

  const clear = useCallback(() => {
    setRedoStack([...redoStack, ...paths]);
    setPaths([]);
    onPathsChange?.([]);
  }, [paths, redoStack, onPathsChange]);

  const save = useCallback(async (): Promise<string | null> => {
    try {
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== 'granted') return null;

      if (!viewShotRef.current?.capture) return null;
      const uri = await viewShotRef.current.capture();

      const fileName = `coloring_${Date.now()}.png`;
      const cacheDir = FileSystem.cacheDirectory || FileSystem.documentDirectory || '';
      const destUri = `${cacheDir}${fileName}`;
      await FileSystem.copyAsync({ from: uri, to: destUri });

      await MediaLibrary.saveToLibraryAsync(destUri);
      return destUri;
    } catch (error) {
      console.error('[DrawingCanvas] Save error:', error);
      return null;
    }
  }, []);

  // Expose methods via ref
  if (canvasRef) {
    canvasRef.current = {
      undo,
      redo,
      clear,
      save,
      getPathCount: () => paths.length,
    };
  }

  return (
    <ViewShot
      ref={viewShotRef}
      options={{ format: 'png', quality: 1 }}
      style={{
        width: canvasSize,
        height: canvasSize,
        backgroundColor: '#FFFFFF',
        borderRadius: 24,
        overflow: 'hidden',
      }}
    >
      <View
        {...(tool === 'brush' ? panResponder.panHandlers : {})}
        pointerEvents="box-none"
        style={{ width: canvasSize, height: canvasSize, position: 'relative' }}
      >
        {/* Background image (for uploaded images) */}
        {backgroundImage && (
          <Image
            source={backgroundImage}
            style={{
              width: canvasSize,
              height: canvasSize,
              position: 'absolute',
              top: 0,
              left: 0,
            }}
            contentFit="contain"
            pointerEvents="none"
          />
        )}

        <Svg
          width={canvasSize}
          height={canvasSize}
          viewBox={`0 0 ${canvasSize} ${canvasSize}`}
          style={{ position: 'absolute', top: 0, left: 0 }}
          pointerEvents="box-none"
        >
          {/* 1. Background Fill Layer */}
          <Path
            d={`M 0 0 H ${canvasSize} V ${canvasSize} H 0 Z`}
            fill={backgroundColor}
            onPress={handleBgFill}
            pointerEvents={tool === 'bucket' ? 'auto' : 'none'}
          />

          {/* 2. User's drawn strokes */}
          <G pointerEvents="none">
            {paths.map((p, i) => (
              p.type === 'stroke' && p.d && (
                <Path
                  key={`stroke-${i}`}
                  d={p.d}
                  stroke={p.color}
                  strokeWidth={p.strokeWidth}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  fill="none"
                  opacity={p.opacity}
                />
              )
            ))}

            {currentDrawing && currentDrawing.type === 'stroke' && currentDrawing.d && (
              <Path
                d={currentDrawing.d}
                stroke={currentDrawing.color}
                strokeWidth={currentDrawing.strokeWidth}
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
                opacity={currentDrawing.opacity}
              />
            )}
          </G>

          {/* 3. Detail outline — rendered ON TOP so lines are always visible */}
          {outlinePaths && outlinePaths.length > 0 && outlineTransform && (
            <G transform={outlineTransform} pointerEvents={tool === 'bucket' ? 'auto' : 'none'}>
              {/* First pass: render user fills BEHIND the outlines */}
              {outlinePaths.map((path, index) => {
                const userFill = segmentFills[index];
                if (!userFill) return null;
                return (
                  <Path
                    key={`fill-${index}`}
                    d={path.d}
                    transform={path.transform}
                    fill={userFill}
                    stroke="none"
                    opacity={1}
                  />
                );
              })}
              {/* Second pass: render black outline strokes on top */}
              {outlinePaths.map((path, index) => (
                <Path
                  key={`outline-${index}`}
                  d={path.d}
                  transform={path.transform}
                  fill="none"
                  stroke="#1A1A1A"
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  onPress={() => handleFill(index)}
                />
              ))}
            </G>
          )}

          {!outlinePaths && outlinePathData && outlineTransform && (
            <G transform={outlineTransform}>
              <Path
                d={outlinePathData}
                fill="#3A3A3A"
                stroke="none"
              />
            </G>
          )}

          {/* Fallback: legacy BackgroundSvg component */}
          {!outlinePathData && BackgroundSvg && (
            <G>
              <BackgroundSvg width={canvasSize} height={canvasSize} />
            </G>
          )}
        </Svg>
      </View>
    </ViewShot>
  );
};

export default DrawingCanvas;
