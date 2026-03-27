/**
 * DrawingCanvas — Touch-based SVG drawing canvas for coloring apps.
 *
 * Supports:
 * - Freehand drawing with configurable brush size, color, opacity
 * - Undo / Redo
 * - Clear canvas
 * - Optional background image (SVG outline for coloring)
 * - Optional clipPath to restrict drawing to a specific shape
 * - Save to gallery via react-native-view-shot
 */

import React, { useRef, useState, useCallback } from 'react';
import { View, PanResponder, Dimensions, GestureResponderEvent, ImageSourcePropType } from 'react-native';
import { Image } from 'expo-image';
import Svg, { Path, G, Defs, ClipPath as ClipPathDef } from 'react-native-svg';
import ViewShot from 'react-native-view-shot';
import * as MediaLibrary from 'expo-media-library';
import * as FileSystem from 'expo-file-system';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export interface DrawingPath {
  d: string;
  color: string;
  strokeWidth: number;
  opacity: number;
}

interface DrawingCanvasProps {
  /** Canvas width (default: screen width - 48) */
  canvasSize?: number;
  /** Current brush color */
  color?: string;
  /** Current brush stroke width */
  strokeWidth?: number;
  /** Current brush opacity (0-1) */
  opacity?: number;
  /** Background SVG component to color over */
  BackgroundSvg?: React.FC<{ width: number; height: number }>;
  /** Background image source (PNG/JPG outline for coloring) */
  backgroundImage?: ImageSourcePropType;
  /** SVG path data string (d attribute) to restrict drawing area. Only paths inside this shape will be visible. */
  clipPath?: string;
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
  BackgroundSvg,
  backgroundImage,
  clipPath,
  onPathsChange,
  canvasRef,
}) => {
  const [paths, setPaths] = useState<DrawingPath[]>([]);
  const [redoStack, setRedoStack] = useState<DrawingPath[]>([]);
  const currentPath = useRef<string>('');
  const [currentDrawing, setCurrentDrawing] = useState<DrawingPath | null>(null);
  const viewShotRef = useRef<ViewShot>(null);

  const getPoint = (e: GestureResponderEvent) => {
    const { locationX, locationY } = e.nativeEvent;
    return { x: Math.round(locationX * 100) / 100, y: Math.round(locationY * 100) / 100 };
  };

  const panResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderGrant: (e) => {
      const { x, y } = getPoint(e);
      currentPath.current = `M${x},${y}`;
      setCurrentDrawing({
        d: currentPath.current,
        color,
        strokeWidth,
        opacity,
      });
    },
    onPanResponderMove: (e) => {
      const { x, y } = getPoint(e);
      currentPath.current += ` L${x},${y}`;
      setCurrentDrawing({
        d: currentPath.current,
        color,
        strokeWidth,
        opacity,
      });
    },
    onPanResponderRelease: () => {
      if (currentPath.current) {
        const newPath: DrawingPath = {
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
      
      // Copy to a permanent location before saving to media library
      const fileName = `coloring_${Date.now()}.png`;
      const destUri = `${FileSystem.cacheDirectory}${fileName}`;
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
        {...panResponder.panHandlers}
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
          />
        )}

        <Svg
          width={canvasSize}
          height={canvasSize}
          viewBox={`0 0 ${canvasSize} ${canvasSize}`}
          style={{ position: 'absolute', top: 0, left: 0 }}
        >
          <Defs>
            {/* Clip path definition - if provided, drawing will be restricted to this shape */}
            {clipPath && (
              <ClipPathDef id="drawingClip">
                <Path d={clipPath} />
              </ClipPathDef>
            )}
          </Defs>

          {/* Background SVG outline */}
          {BackgroundSvg && (
            <G opacity={0.3}>
              <BackgroundSvg width={canvasSize} height={canvasSize} />
            </G>
          )}

          {/* Completed paths - clipped if clipPath is provided */}
          <G clipPath={clipPath ? 'url(#drawingClip)' : undefined}>
            {paths.map((p, i) => (
              <Path
                key={i}
                d={p.d}
                stroke={p.color}
                strokeWidth={p.strokeWidth}
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
                opacity={p.opacity}
              />
            ))}

            {/* Current drawing path */}
            {currentDrawing && (
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
        </Svg>
      </View>
    </ViewShot>
  );
};

export default DrawingCanvas;
