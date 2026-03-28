/**
 * DrawingCanvas — Touch-based SVG drawing canvas for coloring apps.
 *
 * Supports:
 * - Freehand drawing with configurable brush size, color, opacity
 * - Undo / Redo
 * - Clear canvas
 * - Tap-to-fill on SVG path segments
 * - Remote SVG URL rendering via SvgXml
 * - Save to gallery via react-native-view-shot
 */

import * as FileSystem from 'expo-file-system';
import { Image } from 'expo-image';
import * as MediaLibrary from 'expo-media-library';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Dimensions, GestureResponderEvent, ImageSourcePropType, PanResponder, View } from 'react-native';
import Svg, { G, Path, SvgXml } from 'react-native-svg';
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
  /** Remote SVG URL — fetched and rendered directly */
  svgUrl?: string;
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
  svgUrl,
  onPathsChange,
  canvasRef,
}) => {
  const [paths, setPaths] = useState<DrawingPath[]>([]);
  const [redoStack, setRedoStack] = useState<DrawingPath[]>([]);
  const currentPath = useRef<string>('');
  const [currentDrawing, setCurrentDrawing] = useState<DrawingPath | null>(null);
  const viewShotRef = useRef<ViewShot>(null);
  const [svgXml, setSvgXml] = useState<string | null>(null);
  const [svgLoading, setSvgLoading] = useState(false);

  // Fetch remote SVG XML
  useEffect(() => {
    if (!svgUrl) return;
    let cancelled = false;
    setSvgLoading(true);
    fetch(svgUrl)
      .then(res => res.text())
      .then(xml => {
        if (!cancelled) {
          // Modify SVG to fit canvas: set width/height and preserve viewBox
          let modifiedXml = xml;
          // Replace width and height in the SVG tag
          modifiedXml = modifiedXml.replace(
            /width="[^"]*"/,
            `width="${canvasSize}"`
          );
          modifiedXml = modifiedXml.replace(
            /height="[^"]*"/,
            `height="${canvasSize}"`
          );
          // Ensure viewBox exists
          if (!modifiedXml.includes('viewBox')) {
            modifiedXml = modifiedXml.replace(
              '<svg',
              '<svg viewBox="0 0 1024 1024"'
            );
          }
          setSvgXml(modifiedXml);
          setSvgLoading(false);
        }
      })
      .catch(err => {
        console.error('[DrawingCanvas] Failed to fetch SVG:', err);
        if (!cancelled) setSvgLoading(false);
      });
    return () => { cancelled = true; };
  }, [svgUrl, canvasSize]);

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

  const backgroundColor = useMemo(() => {
    let lastBgColor = "#FFFFFF";
    paths.forEach(p => {
      if (p.type === 'bgFill') lastBgColor = p.color;
    });
    return lastBgColor;
  }, [paths]);

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
    const newPath: DrawingPath = { type: 'fill', index, color, opacity };
    const newPaths = [...paths, newPath];
    setPaths(newPaths);
    setRedoStack([]);
    onPathsChange?.(newPaths);
  };

  const handleBgFill = () => {
    if (tool !== 'bucket') return;
    const newPath: DrawingPath = { type: 'bgFill', color, opacity };
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
      setCurrentDrawing({ type: 'stroke', d: currentPath.current, color, strokeWidth, opacity });
    },
    onPanResponderMove: (e) => {
      if (tool !== 'brush') return;
      const { x, y } = getPoint(e);
      currentPath.current += ` L${x},${y}`;
      setCurrentDrawing({ type: 'stroke', d: currentPath.current, color, strokeWidth, opacity });
    },
    onPanResponderRelease: () => {
      if (tool !== 'brush') return;
      if (currentPath.current) {
        const newPath: DrawingPath = { type: 'stroke', d: currentPath.current, color, strokeWidth, opacity };
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

  if (canvasRef) {
    canvasRef.current = { undo, redo, clear, save, getPathCount: () => paths.length };
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
            style={{ width: canvasSize, height: canvasSize, position: 'absolute', top: 0, left: 0 }}
            contentFit="contain"
            pointerEvents="none"
          />
        )}

        {/* Remote SVG rendered directly from URL XML */}
        {svgUrl && svgXml && (
          <View style={{ position: 'absolute', top: 0, left: 0, width: canvasSize, height: canvasSize }} pointerEvents="none">
            <SvgXml xml={svgXml} width={canvasSize} height={canvasSize} />
          </View>
        )}

        {/* Loading indicator for remote SVG */}
        {svgUrl && svgLoading && (
          <View style={{ position: 'absolute', top: 0, left: 0, width: canvasSize, height: canvasSize, justifyContent: 'center', alignItems: 'center' }}>
            <ActivityIndicator size="large" color="#3A3A3A" />
          </View>
        )}

        {/* SVG overlay for drawing strokes and outline paths */}
        <Svg
          width={canvasSize}
          height={canvasSize}
          viewBox={`0 0 ${canvasSize} ${canvasSize}`}
          style={{ position: 'absolute', top: 0, left: 0 }}
          pointerEvents="box-none"
        >
          {/* Background Fill Layer (only when no svgUrl) */}
          {!svgUrl && (
            <Path
              d={`M 0 0 H ${canvasSize} V ${canvasSize} H 0 Z`}
              fill={backgroundColor}
              onPress={handleBgFill}
              pointerEvents={tool === 'bucket' ? 'auto' : 'none'}
            />
          )}

          {/* User's drawn strokes */}
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

          {/* Outline paths with tap-to-fill (when using outlinePaths data) */}
          {!svgUrl && outlinePaths && outlinePaths.length > 0 && outlineTransform && (
            <G transform={outlineTransform} pointerEvents={tool === 'bucket' ? 'auto' : 'none'}>
              {outlinePaths.map((path, index) => {
                const userFill = segmentFills[index];
                return (
                  <Path
                    key={`outline-${index}`}
                    d={path.d}
                    transform={path.transform}
                    fill={userFill || "#000000"}
                    stroke="none"
                    onPress={() => handleFill(index)}
                  />
                );
              })}
            </G>
          )}

          {/* Legacy single outline path */}
          {!svgUrl && !outlinePaths && outlinePathData && outlineTransform && (
            <G transform={outlineTransform}>
              <Path d={outlinePathData} fill="#3A3A3A" stroke="none" />
            </G>
          )}

          {/* Legacy BackgroundSvg component */}
          {!svgUrl && !outlinePathData && !outlinePaths && BackgroundSvg && (
            <G><BackgroundSvg width={canvasSize} height={canvasSize} /></G>
          )}
        </Svg>
      </View>
    </ViewShot>
  );
};

export default DrawingCanvas;
