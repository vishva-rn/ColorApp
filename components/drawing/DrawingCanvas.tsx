/**
 * DrawingCanvas — Touch-based SVG drawing canvas for coloring apps.
 *
 * Supports:
 * - Freehand drawing with configurable brush size, color, opacity
 * - Undo / Redo / Clear
 * - Tap-to-fill individual SVG path segments (bucket tool)
 * - SVG outlines always visible on top of color fills
 * - Save to gallery via react-native-view-shot
 */

import * as FileSystem from 'expo-file-system';
import { Image } from 'expo-image';
import * as MediaLibrary from 'expo-media-library';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Dimensions, GestureResponderEvent, ImageSourcePropType, PanResponder, View } from 'react-native';
import Svg, { G, Path } from 'react-native-svg';
import ViewShot from 'react-native-view-shot';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export interface DrawingPath {
  type: 'stroke' | 'fill' | 'bgFill';
  d?: string;
  index?: number;
  color: string;
  strokeWidth?: number;
  opacity: number;
}

export interface OutlinePath {
  d: string;
  transform?: string;
}

interface DrawingCanvasProps {
  canvasSize?: number;
  color?: string;
  strokeWidth?: number;
  opacity?: number;
  tool?: 'brush' | 'bucket';
  BackgroundSvg?: React.FC<{ width: number; height: number }>;
  backgroundImage?: ImageSourcePropType;
  outlinePathData?: string;
  outlinePaths?: OutlinePath[];
  outlineViewBox?: { width: number; height: number };
  onPathsChange?: (paths: DrawingPath[]) => void;
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

  // Refs for latest values (used inside PanResponder to avoid stale closures)
  const colorRef = useRef(color);
  const strokeWidthRef = useRef(strokeWidth);
  const opacityRef = useRef(opacity);
  const toolRef = useRef(tool);
  const onPathsChangeRef = useRef(onPathsChange);

  useEffect(() => { colorRef.current = color; }, [color]);
  useEffect(() => { strokeWidthRef.current = strokeWidth; }, [strokeWidth]);
  useEffect(() => { opacityRef.current = opacity; }, [opacity]);
  useEffect(() => { toolRef.current = tool; }, [tool]);
  useEffect(() => { onPathsChangeRef.current = onPathsChange; }, [onPathsChange]);

  // Compute fills per segment index
  const segmentFills = useMemo(() => {
    const fills: Record<number, string> = {};
    paths.forEach(p => {
      if (p.type === 'fill' && p.index !== undefined) fills[p.index] = p.color;
    });
    return fills;
  }, [paths]);

  // Background color from bgFill actions
  const backgroundColor = useMemo(() => {
    let bg = "#FFFFFF";
    paths.forEach(p => { if (p.type === 'bgFill') bg = p.color; });
    return bg;
  }, [paths]);

  // Transform to fit outline SVG into the square canvas
  const outlineTransform = useMemo(() => {
    if ((!outlinePathData && !outlinePaths) || !outlineViewBox) return null;
    const { width: svgW, height: svgH } = outlineViewBox;
    const scale = Math.min(canvasSize / svgW, canvasSize / svgH);
    const offsetX = (canvasSize - svgW * scale) / 2;
    const offsetY = (canvasSize - svgH * scale) / 2;
    return `translate(${offsetX}, ${offsetY}) scale(${scale})`;
  }, [outlinePathData, outlinePaths, outlineViewBox, canvasSize]);

  // Scale factor for outline stroke width
  const outlineScale = useMemo(() => {
    if (!outlineViewBox) return 1;
    return Math.min(canvasSize / outlineViewBox.width, canvasSize / outlineViewBox.height);
  }, [outlineViewBox, canvasSize]);

  const handleFill = useCallback((index: number) => {
    if (toolRef.current !== 'bucket') return;
    const newPath: DrawingPath = { type: 'fill', index, color: colorRef.current, opacity: opacityRef.current };
    setPaths(prev => {
      const newPaths = [...prev, newPath];
      onPathsChangeRef.current?.(newPaths);
      return newPaths;
    });
    setRedoStack([]);
  }, []);

  const handleBgFill = useCallback(() => {
    if (toolRef.current !== 'bucket') return;
    const newPath: DrawingPath = { type: 'bgFill', color: colorRef.current, opacity: opacityRef.current };
    setPaths(prev => {
      const newPaths = [...prev, newPath];
      onPathsChangeRef.current?.(newPaths);
      return newPaths;
    });
    setRedoStack([]);
  }, []);

  // PanResponder reads from refs for latest values
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => toolRef.current === 'brush',
      onMoveShouldSetPanResponder: () => toolRef.current === 'brush',
      onPanResponderGrant: (e) => {
        if (toolRef.current !== 'brush') return;
        const { locationX: x, locationY: y } = e.nativeEvent;
        currentPath.current = `M${Math.round(x * 100) / 100},${Math.round(y * 100) / 100}`;
        setCurrentDrawing({
          type: 'stroke', d: currentPath.current,
          color: colorRef.current, strokeWidth: strokeWidthRef.current, opacity: opacityRef.current,
        });
      },
      onPanResponderMove: (e) => {
        if (toolRef.current !== 'brush') return;
        const { locationX: x, locationY: y } = e.nativeEvent;
        currentPath.current += ` L${Math.round(x * 100) / 100},${Math.round(y * 100) / 100}`;
        setCurrentDrawing({
          type: 'stroke', d: currentPath.current,
          color: colorRef.current, strokeWidth: strokeWidthRef.current, opacity: opacityRef.current,
        });
      },
      onPanResponderRelease: () => {
        if (toolRef.current !== 'brush') return;
        if (currentPath.current) {
          const newPath: DrawingPath = {
            type: 'stroke', d: currentPath.current,
            color: colorRef.current, strokeWidth: strokeWidthRef.current, opacity: opacityRef.current,
          };
          setPaths(prev => {
            const newPaths = [...prev, newPath];
            onPathsChangeRef.current?.(newPaths);
            return newPaths;
          });
          setRedoStack([]);
        }
        currentPath.current = '';
        setCurrentDrawing(null);
      },
    })
  ).current;

  const undo = useCallback(() => {
    setPaths(prev => {
      if (prev.length === 0) return prev;
      const newPaths = [...prev];
      const removed = newPaths.pop()!;
      setRedoStack(r => [...r, removed]);
      onPathsChangeRef.current?.(newPaths);
      return newPaths;
    });
  }, []);

  const redo = useCallback(() => {
    setRedoStack(prev => {
      if (prev.length === 0) return prev;
      const newRedo = [...prev];
      const restored = newRedo.pop()!;
      setPaths(p => {
        const newPaths = [...p, restored];
        onPathsChangeRef.current?.(newPaths);
        return newPaths;
      });
      return newRedo;
    });
  }, []);

  const clear = useCallback(() => {
    setPaths(prev => {
      setRedoStack(r => [...r, ...prev]);
      onPathsChangeRef.current?.([]);
      return [];
    });
  }, []);

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

  if (canvasRef) {
    canvasRef.current = { undo, redo, clear, save, getPathCount: () => paths.length };
  }

  const isBrush = tool === 'brush';
  const isBucket = tool === 'bucket';
  const hasOutlinePaths = outlinePaths && outlinePaths.length > 0 && outlineTransform;

  return (
    <ViewShot
      ref={viewShotRef}
      options={{ format: 'png', quality: 1 }}
      style={{
        width: canvasSize,
        height: canvasSize,
        backgroundColor: backgroundColor,
        borderRadius: 24,
        overflow: 'hidden',
      }}
    >
      <View style={{ width: canvasSize, height: canvasSize, position: 'relative' }}>

        {/* Background image */}
        {backgroundImage && (
          <Image
            source={backgroundImage}
            style={{ width: canvasSize, height: canvasSize, position: 'absolute', top: 0, left: 0 }}
            contentFit="contain"
          />
        )}

        {/*
          SINGLE SVG with layered rendering order:
          1. Color fills (behind)
          2. User brush strokes (middle)
          3. Black outlines (on top, always visible)

          In bucket mode: SVG captures touches for tap-to-fill
          In brush mode: SVG is non-interactive, View on top captures touch
        */}
        <Svg
          width={canvasSize}
          height={canvasSize}
          viewBox={`0 0 ${canvasSize} ${canvasSize}`}
          style={{ position: 'absolute', top: 0, left: 0 }}
          pointerEvents={isBucket ? 'auto' : 'none'}
        >
          {/* Background tap target for bucket */}
          {isBucket && (
            <Path
              d={`M 0 0 H ${canvasSize} V ${canvasSize} H 0 Z`}
              fill="transparent"
              onPress={handleBgFill}
            />
          )}

          {/* LAYER 1: Color fills — rendered first (behind outlines) */}
          {hasOutlinePaths && (
            <G transform={outlineTransform}>
              {outlinePaths!.map((path, index) => {
                const userFill = segmentFills[index];
                if (!userFill) return null;
                return (
                  <Path
                    key={`fill-${index}`}
                    d={path.d}
                    transform={path.transform}
                    fill={userFill}
                    stroke="none"
                  />
                );
              })}
            </G>
          )}

          {/* LAYER 2: User brush strokes */}
          <G>
            {paths.map((p, i) => (
              p.type === 'stroke' && p.d ? (
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
              ) : null
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

          {/* LAYER 3: Black outlines — always on top, never hidden behind colors */}
          {hasOutlinePaths && (
            <G transform={outlineTransform}>
              {outlinePaths!.map((path, index) => (
                <Path
                  key={`outline-${index}`}
                  d={path.d}
                  transform={path.transform}
                  fill="none"
                  stroke="#000000"
                  strokeWidth={1.5 / outlineScale}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  onPress={isBucket ? () => handleFill(index) : undefined}
                />
              ))}
            </G>
          )}

          {/* Invisible tap targets for bucket mode — larger hit area */}
          {hasOutlinePaths && isBucket && (
            <G transform={outlineTransform}>
              {outlinePaths!.map((path, index) => (
                <Path
                  key={`tap-${index}`}
                  d={path.d}
                  transform={path.transform}
                  fill={segmentFills[index] || "transparent"}
                  fillOpacity={segmentFills[index] ? 0 : 0}
                  stroke="transparent"
                  strokeWidth={10 / outlineScale}
                  onPress={() => handleFill(index)}
                />
              ))}
            </G>
          )}

          {/* Legacy single outline path */}
          {!outlinePaths && outlinePathData && outlineTransform && (
            <G transform={outlineTransform}>
              <Path d={outlinePathData} fill="#3A3A3A" stroke="none" />
            </G>
          )}

          {/* Legacy BackgroundSvg */}
          {!outlinePathData && !outlinePaths && BackgroundSvg && (
            <G><BackgroundSvg width={canvasSize} height={canvasSize} /></G>
          )}
        </Svg>

        {/* Touch capture layer for brush drawing — only in brush mode */}
        {isBrush && (
          <View
            {...panResponder.panHandlers}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: canvasSize,
              height: canvasSize,
              backgroundColor: 'transparent',
            }}
          />
        )}
      </View>
    </ViewShot>
  );
};

export default DrawingCanvas;
