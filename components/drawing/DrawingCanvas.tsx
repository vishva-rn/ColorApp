/**
 * DrawingCanvas — Touch-based SVG drawing canvas for coloring apps.
 *
 * Supports:
 * - Freehand drawing with configurable brush size, color, opacity
 * - Undo / Redo / Clear
 * - Tap-to-fill on SVG path segments
 * - Remote SVG URL rendering via SvgXml
 * - Save to gallery via react-native-view-shot
 */

import * as FileSystem from 'expo-file-system';
import { Image } from 'expo-image';
import * as MediaLibrary from 'expo-media-library';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Dimensions, GestureResponderEvent, ImageSourcePropType, PanResponder, View } from 'react-native';
import Svg, { G, Path } from 'react-native-svg';
import { SvgXml } from 'react-native-svg';
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
          let modifiedXml = xml;
          // Remove XML declaration if present
          modifiedXml = modifiedXml.replace(/<\?xml[^?]*\?>\s*/g, '');
          // Remove comments
          modifiedXml = modifiedXml.replace(/<!--[\s\S]*?-->/g, '');
          // Set width/height to canvas size
          modifiedXml = modifiedXml.replace(/width="[^"]*"/, `width="${canvasSize}"`);
          modifiedXml = modifiedXml.replace(/height="[^"]*"/, `height="${canvasSize}"`);
          // Add viewBox if missing
          if (!modifiedXml.includes('viewBox')) {
            modifiedXml = modifiedXml.replace('<svg', '<svg viewBox="0 0 1024 1024"');
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

  const segmentFills = useMemo(() => {
    const fills: Record<number, string> = {};
    paths.forEach(p => {
      if (p.type === 'fill' && p.index !== undefined) fills[p.index] = p.color;
    });
    return fills;
  }, [paths]);

  const backgroundColor = useMemo(() => {
    let lastBgColor = "#FFFFFF";
    paths.forEach(p => { if (p.type === 'bgFill') lastBgColor = p.color; });
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

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (e) => {
        const { x, y } = getPoint(e);
        currentPath.current = `M${x},${y}`;
        setCurrentDrawing({ type: 'stroke', d: currentPath.current, color, strokeWidth, opacity });
      },
      onPanResponderMove: (e) => {
        const { x, y } = getPoint(e);
        currentPath.current += ` L${x},${y}`;
        setCurrentDrawing({ type: 'stroke', d: currentPath.current, color, strokeWidth, opacity });
      },
      onPanResponderRelease: () => {
        if (currentPath.current) {
          const newPath: DrawingPath = { type: 'stroke', d: currentPath.current, color, strokeWidth, opacity };
          setPaths(prev => {
            const newPaths = [...prev, newPath];
            onPathsChange?.(newPaths);
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
      onPathsChange?.(newPaths);
      return newPaths;
    });
  }, [onPathsChange]);

  const redo = useCallback(() => {
    setRedoStack(prev => {
      if (prev.length === 0) return prev;
      const newRedo = [...prev];
      const restored = newRedo.pop()!;
      setPaths(p => {
        const newPaths = [...p, restored];
        onPathsChange?.(newPaths);
        return newPaths;
      });
      return newRedo;
    });
  }, [onPathsChange]);

  const clear = useCallback(() => {
    setPaths(prev => {
      setRedoStack(r => [...r, ...prev]);
      onPathsChange?.([]);
      return [];
    });
  }, [onPathsChange]);

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
      <View style={{ width: canvasSize, height: canvasSize, position: 'relative' }}>

        {/* Layer 1: Background image (for uploaded images) */}
        {backgroundImage && (
          <Image
            source={backgroundImage}
            style={{ width: canvasSize, height: canvasSize, position: 'absolute', top: 0, left: 0 }}
            contentFit="contain"
          />
        )}

        {/* Layer 2: Remote SVG rendered from URL */}
        {svgUrl && svgXml && (
          <View
            style={{ position: 'absolute', top: 0, left: 0, width: canvasSize, height: canvasSize }}
            pointerEvents="none"
          >
            <SvgXml xml={svgXml} width={canvasSize} height={canvasSize} />
          </View>
        )}

        {/* Layer 2b: Outline paths (when not using svgUrl) */}
        {!svgUrl && outlinePaths && outlinePaths.length > 0 && outlineTransform && (
          <Svg
            width={canvasSize}
            height={canvasSize}
            viewBox={`0 0 ${canvasSize} ${canvasSize}`}
            style={{ position: 'absolute', top: 0, left: 0 }}
            pointerEvents={tool === 'bucket' ? 'auto' : 'none'}
          >
            <Path
              d={`M 0 0 H ${canvasSize} V ${canvasSize} H 0 Z`}
              fill={backgroundColor}
              onPress={handleBgFill}
            />
            <G transform={outlineTransform}>
              {outlinePaths.map((path, index) => (
                <Path
                  key={`outline-${index}`}
                  d={path.d}
                  transform={path.transform}
                  fill={segmentFills[index] || "#000000"}
                  stroke="none"
                  onPress={() => handleFill(index)}
                />
              ))}
            </G>
          </Svg>
        )}

        {/* Layer 2c: Legacy BackgroundSvg / single outline */}
        {!svgUrl && !outlinePaths && (outlinePathData || BackgroundSvg) && (
          <Svg
            width={canvasSize}
            height={canvasSize}
            viewBox={`0 0 ${canvasSize} ${canvasSize}`}
            style={{ position: 'absolute', top: 0, left: 0 }}
            pointerEvents="none"
          >
            {outlinePathData && outlineTransform && (
              <G transform={outlineTransform}>
                <Path d={outlinePathData} fill="#3A3A3A" stroke="none" />
              </G>
            )}
            {!outlinePathData && BackgroundSvg && (
              <G><BackgroundSvg width={canvasSize} height={canvasSize} /></G>
            )}
          </Svg>
        )}

        {/* Loading indicator for remote SVG */}
        {svgUrl && svgLoading && (
          <View style={{ position: 'absolute', top: 0, left: 0, width: canvasSize, height: canvasSize, justifyContent: 'center', alignItems: 'center' }}>
            <ActivityIndicator size="large" color="#3A3A3A" />
          </View>
        )}

        {/* Layer 3: Drawing strokes overlay + touch capture */}
        <View
          {...(tool === 'brush' ? panResponder.panHandlers : {})}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: canvasSize,
            height: canvasSize,
          }}
        >
          <Svg
            width={canvasSize}
            height={canvasSize}
            viewBox={`0 0 ${canvasSize} ${canvasSize}`}
            style={{ position: 'absolute', top: 0, left: 0 }}
            pointerEvents="none"
          >
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
          </Svg>
        </View>
      </View>
    </ViewShot>
  );
};

export default DrawingCanvas;
