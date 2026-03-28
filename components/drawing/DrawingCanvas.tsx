/**
 * DrawingCanvas — Touch-based SVG drawing canvas for coloring apps.
 *
 * Fetches SVG from URL, fixes viewBox to fit actual content bounds,
 * then renders via SvgXml with proper scaling.
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

  // Refs for latest values
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

  // Fetch SVG and fix it to render properly
  useEffect(() => {
    if (!svgUrl) return;
    let cancelled = false;
    setSvgLoading(true);
    fetch(svgUrl)
      .then(res => res.text())
      .then(xml => {
        if (cancelled) return;
        let fixed = xml;
        // Remove XML declaration and comments
        fixed = fixed.replace(/<\?xml[^?]*\?>\s*/g, '');
        fixed = fixed.replace(/<!--[\s\S]*?-->/g, '');
        // Extract existing viewBox or create one
        const vbMatch = fixed.match(/viewBox="([^"]*)"/);
        const wMatch = fixed.match(/width="(\d+)"/);
        const hMatch = fixed.match(/height="(\d+)"/);
        const origW = wMatch ? parseInt(wMatch[1]) : 1024;
        const origH = hMatch ? parseInt(hMatch[1]) : 1024;
        // Wrap all content in a group that's visible
        // The SVG content uses transforms like translate(566, 44) with negative path coords
        // We need to set the viewBox to match the original SVG dimensions
        // and let preserveAspectRatio handle the scaling
        if (!vbMatch) {
          fixed = fixed.replace('<svg', `<svg viewBox="0 0 ${origW} ${origH}"`);
        }
        // Set width/height to canvas size
        fixed = fixed.replace(/width="[^"]*"/, `width="${canvasSize}"`);
        fixed = fixed.replace(/height="[^"]*"/, `height="${canvasSize}"`);
        // Ensure preserveAspectRatio
        if (!fixed.includes('preserveAspectRatio')) {
          fixed = fixed.replace('<svg', '<svg preserveAspectRatio="xMidYMid meet"');
        }
        setSvgXml(fixed);
        setSvgLoading(false);
      })
      .catch(err => {
        console.error('[DrawingCanvas] SVG fetch error:', err);
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
    let bg = "#FFFFFF";
    paths.forEach(p => { if (p.type === 'bgFill') bg = p.color; });
    return bg;
  }, [paths]);

  const outlineTransform = useMemo(() => {
    if ((!outlinePathData && !outlinePaths) || !outlineViewBox) return null;
    const { width: svgW, height: svgH } = outlineViewBox;
    const scale = Math.min(canvasSize / svgW, canvasSize / svgH);
    const offsetX = (canvasSize - svgW * scale) / 2;
    const offsetY = (canvasSize - svgH * scale) / 2;
    return `translate(${offsetX}, ${offsetY}) scale(${scale})`;
  }, [outlinePathData, outlinePaths, outlineViewBox, canvasSize]);

  const handleFill = useCallback((index: number) => {
    if (toolRef.current !== 'bucket') return;
    // Skip path index 0 — it's typically the main body outline (too large to fill as one)
    // Users should use brush tool for large areas
    if (index === 0) return;
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

        {/* Color fills + brush strokes (behind line art) */}
        <Svg
          width={canvasSize}
          height={canvasSize}
          viewBox={`0 0 ${canvasSize} ${canvasSize}`}
          style={{ position: 'absolute', top: 0, left: 0 }}
          pointerEvents="none"
        >
          {hasOutlinePaths && (
            <G transform={outlineTransform}>
              {outlinePaths!.map((path, index) => {
                const userFill = segmentFills[index];
                if (!userFill) return null;
                return (
                  <Path key={`fill-${index}`} d={path.d} transform={path.transform} fill={userFill} stroke="none" />
                );
              })}
            </G>
          )}
          <G>
            {paths.map((p, i) => (
              p.type === 'stroke' && p.d ? (
                <Path key={`stroke-${i}`} d={p.d} stroke={p.color} strokeWidth={p.strokeWidth}
                  strokeLinecap="round" strokeLinejoin="round" fill="none" opacity={p.opacity} />
              ) : null
            ))}
            {currentDrawing && currentDrawing.type === 'stroke' && currentDrawing.d && (
              <Path d={currentDrawing.d} stroke={currentDrawing.color} strokeWidth={currentDrawing.strokeWidth}
                strokeLinecap="round" strokeLinejoin="round" fill="none" opacity={currentDrawing.opacity} />
            )}
          </G>
        </Svg>

        {/* SVG line art ON TOP via SvgXml (fetched from URL) */}
        {svgUrl && svgXml && (
          <View
            style={{ position: 'absolute', top: 0, left: 0, width: canvasSize, height: canvasSize }}
            pointerEvents="none"
          >
            <SvgXml xml={svgXml} width={canvasSize} height={canvasSize} />
          </View>
        )}

        {/* SVG line art from outlinePaths (when no svgUrl) */}
        {!svgUrl && hasOutlinePaths && (
          <Svg
            width={canvasSize} height={canvasSize}
            viewBox={`0 0 ${canvasSize} ${canvasSize}`}
            style={{ position: 'absolute', top: 0, left: 0 }}
            pointerEvents="none"
          >
            <G transform={outlineTransform}>
              {outlinePaths!.map((path, index) => (
                <Path key={`art-${index}`} d={path.d} transform={path.transform} fill="#000000" stroke="none" />
              ))}
            </G>
          </Svg>
        )}

        {/* Legacy */}
        {!svgUrl && !outlinePaths && (outlinePathData || BackgroundSvg) && (
          <Svg width={canvasSize} height={canvasSize} viewBox={`0 0 ${canvasSize} ${canvasSize}`}
            style={{ position: 'absolute', top: 0, left: 0 }} pointerEvents="none">
            {outlinePathData && outlineTransform && (
              <G transform={outlineTransform}><Path d={outlinePathData} fill="#3A3A3A" stroke="none" /></G>
            )}
            {!outlinePathData && BackgroundSvg && (
              <G><BackgroundSvg width={canvasSize} height={canvasSize} /></G>
            )}
          </Svg>
        )}

        {/* Loading */}
        {svgUrl && svgLoading && (
          <View style={{ position: 'absolute', top: 0, left: 0, width: canvasSize, height: canvasSize, justifyContent: 'center', alignItems: 'center' }}>
            <ActivityIndicator size="large" color="#3A3A3A" />
          </View>
        )}

        {/* Tap targets for bucket */}
        {isBucket && hasOutlinePaths && (
          <Svg width={canvasSize} height={canvasSize} viewBox={`0 0 ${canvasSize} ${canvasSize}`}
            style={{ position: 'absolute', top: 0, left: 0 }} pointerEvents="auto">
            <Path d={`M 0 0 H ${canvasSize} V ${canvasSize} H 0 Z`} fill="transparent" onPress={handleBgFill} />
            <G transform={outlineTransform}>
              {outlinePaths!.map((path, index) => (
                <Path key={`tap-${index}`} d={path.d} transform={path.transform}
                  fill="transparent" stroke="transparent" strokeWidth={8} onPress={() => handleFill(index)} />
              ))}
            </G>
          </Svg>
        )}

        {/* Touch for brush */}
        {isBrush && (
          <View {...panResponder.panHandlers}
            style={{ position: 'absolute', top: 0, left: 0, width: canvasSize, height: canvasSize, backgroundColor: 'transparent' }}
          />
        )}
      </View>
    </ViewShot>
  );
};

export default DrawingCanvas;
