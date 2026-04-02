/**
 * DrawingCanvas — touch-based coloring canvas backed by a raster paint layer.
 *
 * The remote SVG remains the visible line art on top. Bucket fill is now
 * pixel flood-fill against a rasterized boundary mask generated from that SVG.
 */

import { DOMParser, XMLSerializer } from '@xmldom/xmldom';
import {
  AlphaType,
  BlendMode,
  BlurStyle,
  Canvas,
  ColorType,
  ImageFormat,
  Image as SkiaImage,
  PaintStyle,
  Skia,
  StrokeCap,
  StrokeJoin,
  TileMode,
  type SkImage,
  type SkPath,
} from '@shopify/react-native-skia';
import { File, Paths } from 'expo-file-system';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Dimensions, PanResponder, View } from 'react-native';
import Svg, {
  Path,
  SvgXml,
} from 'react-native-svg';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

type StrokeAction = {
  type: 'stroke' | 'erase';
  d: string;
  paint: DrawingPaint;
  brushStyle: 'default' | 'pencil' | 'paint-brush' | 'marker' | 'glow-pen' | 'crayon' | 'paint' | 'ball-pen' | 'sketch-pen';
  strokeWidth: number;
  opacity: number;
};

type ToolBrushStyle = StrokeAction['brushStyle'];

type ToolRenderConfig = {
  opacity: number;
  blur: number;
  spacing: number;
  sizeJitter: number;
  jitter?: number;
  blendMode?: BlendMode;
  cap: StrokeCap;
  join: StrokeJoin;
  haloOpacity?: number;
  haloBlur?: number;
  haloBlendMode?: BlendMode;
};

type FillAction = {
  type: 'fill';
  regionLabel: number;
  paint: DrawingPaint;
  opacity: number;
};

export type DrawingPath = StrokeAction | FillAction;

export type SolidDrawingPaint = {
  id: string;
  kind: 'solid';
  color: string;
};

export type LinearGradientDrawingPaint = {
  id: string;
  kind: 'linear-gradient';
  colors: [string, string];
  start: { x: number; y: number };
  end: { x: number; y: number };
};

export type RadialGradientDrawingPaint = {
  id: string;
  kind: 'radial-gradient';
  colors: [string, string];
  center: { x: number; y: number };
  radius: number;
};

export type LayeredGradientDrawingPaint = {
  id: string;
  kind: 'layered-gradient';
  baseColor: string;
  overlays: {
    colors: [string, string];
    start: { x: number; y: number };
    end: { x: number; y: number };
    opacity?: number;
  }[];
};

export type DrawingPaint =
  | SolidDrawingPaint
  | LinearGradientDrawingPaint
  | RadialGradientDrawingPaint
  | LayeredGradientDrawingPaint;

interface DrawingCanvasProps {
  canvasSize?: number;
  color?: string;
  paint?: DrawingPaint;
  strokeWidth?: number;
  opacity?: number;
  brushStyle?: 'default' | 'pencil' | 'paint-brush' | 'marker' | 'glow-pen' | 'crayon' | 'paint' | 'ball-pen' | 'sketch-pen';
  tool?: 'brush' | 'bucket' | 'eraser';
  drawingEnabled?: boolean;
  svgUrl?: string;
  initialPaths?: DrawingPath[];
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

function getActiveTouchCount(nativeEvent: {
  numberActiveTouches?: number;
  touches?: { length: number };
  changedTouches?: { length: number };
}): number {
  if (typeof nativeEvent.numberActiveTouches === 'number' && nativeEvent.numberActiveTouches > 0) {
    return nativeEvent.numberActiveTouches;
  }

  if (nativeEvent.touches?.length) {
    return nativeEvent.touches.length;
  }

  if (nativeEvent.changedTouches?.length) {
    return nativeEvent.changedTouches.length;
  }

  return 0;
}

function makeSolidPaint(color: string, id = `solid-${color.replace('#', '').toLowerCase()}`): SolidDrawingPaint {
  return { id, kind: 'solid', color };
}

function parseNumericValue(value: string | undefined, fallback = 0): number {
  if (!value) return fallback;
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function stripSvgNoise(svgXml: string): string {
  return svgXml
    .replace(/<\?xml[^?]*\?>\s*/g, '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .trim();
}

function isWhiteLikeFill(fillValue: string | null): boolean {
  if (!fillValue) return false;
  const normalized = fillValue.trim().toLowerCase();
  return normalized === '#fff' || normalized === '#ffffff' || normalized === 'white' || normalized === 'rgb(255,255,255)';
}

function isFullCanvasRect(
  element: Element,
  viewBox: { width: number; height: number },
): boolean {
  if (element.tagName.toLowerCase() !== 'rect') return false;

  const x = element.getAttribute('x') ?? '0';
  const y = element.getAttribute('y') ?? '0';
  const width = element.getAttribute('width') ?? '';
  const height = element.getAttribute('height') ?? '';
  const normalizedX = x.trim();
  const normalizedY = y.trim();
  const normalizedWidth = width.trim().toLowerCase();
  const normalizedHeight = height.trim().toLowerCase();

  const widthMatches = normalizedWidth === '100%' || parseNumericValue(width, -1) === viewBox.width;
  const heightMatches = normalizedHeight === '100%' || parseNumericValue(height, -1) === viewBox.height;

  return (normalizedX === '0' || normalizedX === '0%')
    && (normalizedY === '0' || normalizedY === '0%')
    && widthMatches
    && heightMatches;
}

function removeBackgroundShapes(svgXml: string, viewBox: { width: number; height: number }): string {
  const document = new DOMParser({
    errorHandler: { warning: () => undefined, error: () => undefined, fatalError: () => undefined },
  }).parseFromString(svgXml, 'image/svg+xml');
  const root = document.documentElement;

  const nodesToRemove: Element[] = [];

  for (let index = 0; index < root.childNodes.length; index += 1) {
    const childNode = root.childNodes.item(index);
    if (childNode?.nodeType !== 1) continue;

    const element = childNode as Element;
    const fill = element.getAttribute('fill');
    if (!isWhiteLikeFill(fill)) continue;
    if (!isFullCanvasRect(element, viewBox)) continue;

    nodesToRemove.push(element);
  }

  nodesToRemove.forEach((node) => {
    node.parentNode?.removeChild(node);
  });

  return new XMLSerializer().serializeToString(root);
}

function getSvgViewBox(svgXml: string): { width: number; height: number } {
  const document = new DOMParser({
    errorHandler: { warning: () => undefined, error: () => undefined, fatalError: () => undefined },
  }).parseFromString(svgXml, 'image/svg+xml');
  const svgElement = document.documentElement;
  const viewBoxValue = svgElement.getAttribute('viewBox');

  if (viewBoxValue) {
    const values = viewBoxValue.trim().split(/\s+/).map(Number);
    if (values.length === 4 && values.every((value) => Number.isFinite(value))) {
      return { width: values[2], height: values[3] };
    }
  }

  return {
    width: parseNumericValue(svgElement.getAttribute('width') ?? undefined, 1024),
    height: parseNumericValue(svgElement.getAttribute('height') ?? undefined, 1024),
  };
}

function buildRenderableSvgXml(
  svgXml: string,
  viewBox: { width: number; height: number },
  width: number,
  height: number,
): string {
  let fixed = removeBackgroundShapes(stripSvgNoise(svgXml), viewBox);

  if (!/viewBox="/.test(fixed)) {
    fixed = fixed.replace('<svg', `<svg viewBox="0 0 ${viewBox.width} ${viewBox.height}"`);
  }

  if (/width="/.test(fixed)) {
    fixed = fixed.replace(/width="[^"]*"/, `width="${width}"`);
  } else {
    fixed = fixed.replace('<svg', `<svg width="${width}"`);
  }

  if (/height="/.test(fixed)) {
    fixed = fixed.replace(/height="[^"]*"/, `height="${height}"`);
  } else {
    fixed = fixed.replace('<svg', `<svg height="${height}"`);
  }

  if (!/preserveAspectRatio="/.test(fixed)) {
    fixed = fixed.replace('<svg', '<svg preserveAspectRatio="xMidYMid meet"');
  }

  return fixed;
}

function parseColorToRgba(color: string): [number, number, number, number] {
  const normalized = color.trim().toLowerCase();

  if (normalized.startsWith('rgba(')) {
    const values = normalized.slice(5, -1).split(',').map((value) => value.trim());
    const [red, green, blue, alpha = '1'] = values;
    return [
      Number.parseFloat(red) || 0,
      Number.parseFloat(green) || 0,
      Number.parseFloat(blue) || 0,
      Math.round((Number.parseFloat(alpha) || 0) * 255),
    ];
  }

  if (normalized.startsWith('rgb(')) {
    const values = normalized.slice(4, -1).split(',').map((value) => value.trim());
    const [red, green, blue] = values;
    return [
      Number.parseFloat(red) || 0,
      Number.parseFloat(green) || 0,
      Number.parseFloat(blue) || 0,
      255,
    ];
  }

  if (normalized === 'white') return [255, 255, 255, 255];
  if (normalized === 'black') return [0, 0, 0, 255];

  const hex = normalized.replace('#', '');
  const expanded = hex.length === 3
    ? hex.split('').map((value) => value + value).join('')
    : hex;

  return [
    Number.parseInt(expanded.slice(0, 2), 16) || 0,
    Number.parseInt(expanded.slice(2, 4), 16) || 0,
    Number.parseInt(expanded.slice(4, 6), 16) || 0,
    255,
  ];
}

function applyOpacityToRgba(
  rgba: [number, number, number, number],
  opacity: number,
): [number, number, number, number] {
  return [rgba[0], rgba[1], rgba[2], Math.round(rgba[3] * Math.min(Math.max(opacity, 0), 1))];
}

function interpolateRgba(
  start: [number, number, number, number],
  end: [number, number, number, number],
  t: number,
): [number, number, number, number] {
  const clamped = Math.min(Math.max(t, 0), 1);
  return [
    Math.round(start[0] + (end[0] - start[0]) * clamped),
    Math.round(start[1] + (end[1] - start[1]) * clamped),
    Math.round(start[2] + (end[2] - start[2]) * clamped),
    Math.round(start[3] + (end[3] - start[3]) * clamped),
  ];
}

function compositeRgba(
  base: [number, number, number, number],
  overlay: [number, number, number, number],
): [number, number, number, number] {
  const overlayAlpha = overlay[3] / 255;
  const baseAlpha = base[3] / 255;
  const outAlpha = overlayAlpha + baseAlpha * (1 - overlayAlpha);

  if (outAlpha <= 0) return [0, 0, 0, 0];

  return [
    Math.round((overlay[0] * overlayAlpha + base[0] * baseAlpha * (1 - overlayAlpha)) / outAlpha),
    Math.round((overlay[1] * overlayAlpha + base[1] * baseAlpha * (1 - overlayAlpha)) / outAlpha),
    Math.round((overlay[2] * overlayAlpha + base[2] * baseAlpha * (1 - overlayAlpha)) / outAlpha),
    Math.round(outAlpha * 255),
  ];
}

function sampleLinearGradientColor(
  colors: [string, string],
  start: { x: number; y: number },
  end: { x: number; y: number },
  x: number,
  y: number,
  canvasSize: number,
): [number, number, number, number] {
  const startX = start.x * canvasSize;
  const startY = start.y * canvasSize;
  const endX = end.x * canvasSize;
  const endY = end.y * canvasSize;
  const deltaX = endX - startX;
  const deltaY = endY - startY;
  const lengthSquared = deltaX * deltaX + deltaY * deltaY || 1;
  const projection = ((x - startX) * deltaX + (y - startY) * deltaY) / lengthSquared;

  return interpolateRgba(
    parseColorToRgba(colors[0]),
    parseColorToRgba(colors[1]),
    projection,
  );
}

function samplePaintColorAtPoint(
  paint: DrawingPaint,
  x: number,
  y: number,
  canvasSize: number,
): [number, number, number, number] {
  if (paint.kind === 'solid') {
    return parseColorToRgba(paint.color);
  }

  if (paint.kind === 'linear-gradient') {
    return sampleLinearGradientColor(paint.colors, paint.start, paint.end, x, y, canvasSize);
  }

  if (paint.kind === 'radial-gradient') {
    const centerX = paint.center.x * canvasSize;
    const centerY = paint.center.y * canvasSize;
    const radius = Math.max(paint.radius * canvasSize, 1);
    const distance = Math.sqrt((x - centerX) ** 2 + (y - centerY) ** 2);

    return interpolateRgba(
      parseColorToRgba(paint.colors[0]),
      parseColorToRgba(paint.colors[1]),
      distance / radius,
    );
  }

  let layeredColor = parseColorToRgba(paint.baseColor);

  for (const overlay of paint.overlays) {
    const overlayColor = sampleLinearGradientColor(
      overlay.colors,
      overlay.start,
      overlay.end,
      x,
      y,
      canvasSize,
    );
    layeredColor = compositeRgba(
      layeredColor,
      applyOpacityToRgba(overlayColor, overlay.opacity ?? 1),
    );
  }

  return layeredColor;
}

function getPaintCacheKey(paint: DrawingPaint): string {
  return JSON.stringify(paint);
}

function makeSkiaShaderFromPaint(paint: DrawingPaint, canvasSize: number) {
  if (paint.kind === 'solid' || paint.kind === 'layered-gradient') {
    return null;
  }

  if (paint.kind === 'linear-gradient') {
    return Skia.Shader.MakeLinearGradient(
      {
        x: paint.start.x * canvasSize,
        y: paint.start.y * canvasSize,
      },
      {
        x: paint.end.x * canvasSize,
        y: paint.end.y * canvasSize,
      },
      paint.colors.map((color) => Skia.Color(color)),
      null,
      TileMode.Clamp,
    );
  }

  return Skia.Shader.MakeRadialGradient(
    {
      x: paint.center.x * canvasSize,
      y: paint.center.y * canvasSize,
    },
    Math.max(paint.radius * canvasSize, 1),
    paint.colors.map((color) => Skia.Color(color)),
    null,
    TileMode.Clamp,
  );
}

const TOOL_RENDER_CONFIGS: Record<ToolBrushStyle, ToolRenderConfig> = {
  default: {
    opacity: 1,
    blur: 0,
    spacing: 0.08,
    sizeJitter: 0.04,
    cap: StrokeCap.Round,
    join: StrokeJoin.Round,
  },
  pencil: {
    opacity: 0.95,
    blur: 0,
    spacing: 0.06,
    sizeJitter: 0.08,
    cap: StrokeCap.Round,
    join: StrokeJoin.Round,
  },
  'paint-brush': {
    opacity: 1,
    blur: 0,
    spacing: 0.08,
    sizeJitter: 0.1,
    cap: StrokeCap.Round,
    join: StrokeJoin.Round,
  },
  marker: {
    opacity: 0.65,
    blur: 1,
    spacing: 0.04,
    sizeJitter: 0.02,
    blendMode: BlendMode.Multiply,
    cap: StrokeCap.Square,
    join: StrokeJoin.Round,
  },
  'glow-pen': {
    opacity: 0.9,
    blur: 0,
    spacing: 0.05,
    sizeJitter: 0.03,
    cap: StrokeCap.Round,
    join: StrokeJoin.Round,
    haloOpacity: 0.22,
    haloBlur: 6,
  },
  crayon: {
    opacity: 0.4,
    blur: 0,
    spacing: 0.12,
    sizeJitter: 0.12,
    jitter: 0.2,
    cap: StrokeCap.Round,
    join: StrokeJoin.Round,
  },
  paint: {
    opacity: 0.9,
    blur: 1.5,
    spacing: 0.05,
    sizeJitter: 0.05,
    cap: StrokeCap.Round,
    join: StrokeJoin.Round,
  },
  'ball-pen': {
    opacity: 1,
    blur: 0,
    spacing: 0.02,
    sizeJitter: 0,
    cap: StrokeCap.Round,
    join: StrokeJoin.Round,
  },
  'sketch-pen': {
    opacity: 0.85,
    blur: 0.5,
    spacing: 0.06,
    sizeJitter: 0.15,
    jitter: 0.1,
    cap: StrokeCap.Round,
    join: StrokeJoin.Round,
  },
};

function getToolRenderConfig(brushStyle: ToolBrushStyle): ToolRenderConfig {
  return TOOL_RENDER_CONFIGS[brushStyle] ?? TOOL_RENDER_CONFIGS.default;
}

function getPointSpacingDistance(brushStyle: ToolBrushStyle, strokeWidth: number): number {
  const spacing = getToolRenderConfig(brushStyle).spacing;
  return Math.max(strokeWidth * spacing * 2.5, 1);
}

function createStrokePaint(
  pathPaint: DrawingPaint,
  strokeWidth: number,
  opacity: number,
  canvasSize: number,
  options?: {
    blendMode?: BlendMode;
    blur?: number;
    cap?: StrokeCap;
    join?: StrokeJoin;
  },
) {
  const strokePaint = Skia.Paint();
  strokePaint.setAntiAlias(true);
  strokePaint.setStyle(PaintStyle.Stroke);
  strokePaint.setStrokeCap(options?.cap ?? StrokeCap.Round);
  strokePaint.setStrokeJoin(options?.join ?? StrokeJoin.Round);
  strokePaint.setStrokeWidth(strokeWidth);
  strokePaint.setAlphaf(opacity);
  if (typeof options?.blendMode === 'number') {
    strokePaint.setBlendMode(options.blendMode);
  }
  if (options?.blur && options.blur > 0) {
    strokePaint.setMaskFilter(Skia.MaskFilter.MakeBlur(BlurStyle.Normal, options.blur, true));
  }

  if (pathPaint.kind === 'solid') {
    strokePaint.setColor(Skia.Color(pathPaint.color));
    return strokePaint;
  }

  if (pathPaint.kind === 'layered-gradient') {
    strokePaint.setColor(Skia.Color(pathPaint.baseColor));
    return strokePaint;
  }

  strokePaint.setShader(makeSkiaShaderFromPaint(pathPaint, canvasSize));
  return strokePaint;
}

function drawPencilStroke(
  canvas: any,
  skPath: SkPath,
  pathPaint: DrawingPaint,
  strokeWidth: number,
  opacity: number,
) {
  if (pathPaint.kind !== 'solid') {
    return;
  }

  const config = TOOL_RENDER_CONFIGS.pencil;
  const graphiteColor = Skia.Color(pathPaint.color);
  const layeredPasses = [
    { widthMultiplier: 1.45, alpha: 0.14, offsetX: 0, offsetY: 0 },
    { widthMultiplier: 1.1, alpha: 0.12, offsetX: 0.35, offsetY: 0.25 },
    { widthMultiplier: 0.95, alpha: 0.3, offsetX: -0.2, offsetY: 0.15 },
    { widthMultiplier: 0.6, alpha: 0.18, offsetX: 0, offsetY: 0 },
  ];

  layeredPasses.forEach((pass) => {
    const pencilPaint = Skia.Paint();
    pencilPaint.setAntiAlias(true);
    pencilPaint.setStyle(PaintStyle.Stroke);
    pencilPaint.setStrokeCap(StrokeCap.Round);
    pencilPaint.setStrokeJoin(StrokeJoin.Round);
    pencilPaint.setStrokeWidth(Math.max(strokeWidth * pass.widthMultiplier, 0.75));
    pencilPaint.setAlphaf(Math.min(Math.max(opacity * config.opacity * pass.alpha, 0), 1));
    pencilPaint.setColor(graphiteColor);

    canvas.save();
    canvas.translate(pass.offsetX, pass.offsetY);
    canvas.drawPath(skPath, pencilPaint);
    canvas.restore();
  });
}

function drawPaintBrushStroke(
  canvas: any,
  skPath: SkPath,
  pathPaint: DrawingPaint,
  strokeWidth: number,
  opacity: number,
  canvasSize: number,
) {
  const config = TOOL_RENDER_CONFIGS['paint-brush'];
  const layeredPasses = [
    { widthMultiplier: 1 + (config.sizeJitter * 1.4), alpha: 0.22, offsetX: 0, offsetY: 0 },
    { widthMultiplier: 1 + (config.sizeJitter * 0.5), alpha: 0.32, offsetX: 0.28, offsetY: 0.16 },
    { widthMultiplier: 1 - (config.sizeJitter * 0.3), alpha: 0.46, offsetX: -0.18, offsetY: 0.12 },
    { widthMultiplier: 1 - (config.sizeJitter * 1.8), alpha: 0.24, offsetX: 0.12, offsetY: -0.12 },
  ];

  layeredPasses.forEach((pass) => {
    const brushPaint = createStrokePaint(
      pathPaint,
      Math.max(strokeWidth * pass.widthMultiplier, 1),
      Math.min(Math.max(opacity * config.opacity * pass.alpha, 0), 1),
      canvasSize,
      {
        blendMode: config.blendMode,
        blur: config.blur,
        cap: config.cap,
        join: config.join,
      },
    );

    canvas.save();
    canvas.translate(pass.offsetX, pass.offsetY);
    canvas.drawPath(skPath, brushPaint);
    canvas.restore();
  });

  if (pathPaint.kind === 'layered-gradient') {
    for (const overlay of pathPaint.overlays) {
      const overlayPaint = Skia.Paint();
      overlayPaint.setAntiAlias(true);
      overlayPaint.setStyle(PaintStyle.Stroke);
      overlayPaint.setStrokeCap(config.cap);
      overlayPaint.setStrokeJoin(config.join);
      overlayPaint.setStrokeWidth(Math.max(strokeWidth * 0.95, 1));
      overlayPaint.setAlphaf(Math.min(Math.max(opacity * (overlay.opacity ?? 1) * 0.4, 0), 1));
      overlayPaint.setShader(
        Skia.Shader.MakeLinearGradient(
          {
            x: overlay.start.x * canvasSize,
            y: overlay.start.y * canvasSize,
          },
          {
            x: overlay.end.x * canvasSize,
            y: overlay.end.y * canvasSize,
          },
          overlay.colors.map((color) => Skia.Color(color)),
          null,
          TileMode.Clamp,
        ),
      );
      canvas.drawPath(skPath, overlayPaint);
    }
  }
}

function drawMarkerStroke(
  canvas: any,
  skPath: SkPath,
  pathPaint: DrawingPaint,
  strokeWidth: number,
  opacity: number,
  canvasSize: number,
) {
  const config = TOOL_RENDER_CONFIGS.marker;
  const basePaint = createStrokePaint(
    pathPaint,
    Math.max(strokeWidth * (1 + config.sizeJitter), 1),
    Math.min(Math.max(opacity * config.opacity, 0), 1),
    canvasSize,
    {
      blendMode: config.blendMode,
      blur: config.blur,
      cap: config.cap,
      join: config.join,
    },
  );
  canvas.drawPath(skPath, basePaint);

  const corePaint = createStrokePaint(
    pathPaint,
    Math.max(strokeWidth * (0.88 - config.sizeJitter), 1),
    Math.min(Math.max(opacity * config.opacity * 0.48, 0), 1),
    canvasSize,
    {
      blendMode: config.blendMode,
      blur: 0,
      cap: config.cap,
      join: config.join,
    },
  );
  canvas.drawPath(skPath, corePaint);
}

function drawGlowPenStroke(
  canvas: any,
  skPath: SkPath,
  pathPaint: DrawingPaint,
  strokeWidth: number,
  opacity: number,
  canvasSize: number,
) {
  const config = TOOL_RENDER_CONFIGS['glow-pen'];
  const haloPaint = createStrokePaint(
    pathPaint,
    Math.max(strokeWidth * 1.4, 1),
    Math.min(Math.max(opacity * (config.haloOpacity ?? 0.35), 0), 1),
    canvasSize,
    {
      blendMode: config.haloBlendMode,
      blur: Math.max((config.haloBlur ?? 8) * (strokeWidth / 10), 1),
      cap: config.cap,
      join: config.join,
    },
  );
  canvas.drawPath(skPath, haloPaint);

  const corePaint = createStrokePaint(
    pathPaint,
    Math.max(strokeWidth * 0.92, 1),
    Math.min(Math.max(opacity * config.opacity, 0), 1),
    canvasSize,
    {
      blendMode: config.blendMode,
      blur: config.blur,
      cap: config.cap,
      join: config.join,
    },
  );
  canvas.drawPath(skPath, corePaint);
}

function drawCrayonStroke(
  canvas: any,
  skPath: SkPath,
  pathPaint: DrawingPaint,
  strokeWidth: number,
  opacity: number,
  canvasSize: number,
) {
  const config = TOOL_RENDER_CONFIGS.crayon;
  const jitter = Math.max(strokeWidth * (config.jitter ?? 0.2) * 0.08, 0.18);
  const grainPasses = [
    { widthMultiplier: 1.05, alpha: 0.55, offsetX: 0, offsetY: 0 },
    { widthMultiplier: 0.92, alpha: 0.42, offsetX: jitter, offsetY: -jitter * 0.35 },
    { widthMultiplier: 0.86, alpha: 0.32, offsetX: -jitter * 0.8, offsetY: jitter * 0.45 },
    { widthMultiplier: 0.76, alpha: 0.24, offsetX: jitter * 0.5, offsetY: jitter * 0.7 },
  ];

  grainPasses.forEach((pass) => {
    const crayonPaint = createStrokePaint(
      pathPaint,
      Math.max(strokeWidth * pass.widthMultiplier, 0.8),
      Math.min(Math.max(opacity * config.opacity * pass.alpha, 0), 1),
      canvasSize,
      {
        blendMode: config.blendMode,
        blur: config.blur,
        cap: config.cap,
        join: config.join,
      },
    );

    canvas.save();
    canvas.translate(pass.offsetX, pass.offsetY);
    canvas.drawPath(skPath, crayonPaint);
    canvas.restore();
  });
}

function drawPaintStroke(
  canvas: any,
  skPath: SkPath,
  pathPaint: DrawingPaint,
  strokeWidth: number,
  opacity: number,
  canvasSize: number,
) {
  const config = TOOL_RENDER_CONFIGS.paint;
  const passes = [
    { widthMultiplier: 1 + config.sizeJitter, alpha: 0.38, blur: config.blur + 0.6 },
    { widthMultiplier: 1, alpha: 0.72, blur: config.blur },
    { widthMultiplier: 1 - config.sizeJitter, alpha: 0.28, blur: config.blur * 0.6 },
  ];

  passes.forEach((pass) => {
    const paintStroke = createStrokePaint(
      pathPaint,
      Math.max(strokeWidth * pass.widthMultiplier, 1),
      Math.min(Math.max(opacity * config.opacity * pass.alpha, 0), 1),
      canvasSize,
      {
        blendMode: config.blendMode,
        blur: pass.blur,
        cap: config.cap,
        join: config.join,
      },
    );
    canvas.drawPath(skPath, paintStroke);
  });
}

function drawBallPenStroke(
  canvas: any,
  skPath: SkPath,
  pathPaint: DrawingPaint,
  strokeWidth: number,
  opacity: number,
  canvasSize: number,
) {
  const config = TOOL_RENDER_CONFIGS['ball-pen'];
  const basePaint = createStrokePaint(
    pathPaint,
    Math.max(strokeWidth, 0.8),
    Math.min(Math.max(opacity * config.opacity, 0), 1),
    canvasSize,
    {
      blendMode: config.blendMode,
      blur: config.blur,
      cap: config.cap,
      join: config.join,
    },
  );
  canvas.drawPath(skPath, basePaint);

  const pooledCorePaint = createStrokePaint(
    pathPaint,
    Math.max(strokeWidth * 0.55, 0.6),
    Math.min(Math.max(opacity * config.opacity * 0.18, 0), 1),
    canvasSize,
    {
      blendMode: config.blendMode,
      blur: 0,
      cap: config.cap,
      join: config.join,
    },
  );
  canvas.drawPath(skPath, pooledCorePaint);
}

function drawSketchPenStroke(
  canvas: any,
  skPath: SkPath,
  pathPaint: DrawingPaint,
  strokeWidth: number,
  opacity: number,
  canvasSize: number,
) {
  const config = TOOL_RENDER_CONFIGS['sketch-pen'];
  const jitter = Math.max(strokeWidth * (config.jitter ?? 0.1) * 0.08, 0.16);
  const sketchPasses = [
    { widthMultiplier: 1 + config.sizeJitter, alpha: 0.52, offsetX: 0, offsetY: 0, blur: config.blur },
    { widthMultiplier: 1 - (config.sizeJitter * 0.45), alpha: 0.28, offsetX: jitter, offsetY: -jitter * 0.4, blur: config.blur * 0.6 },
    { widthMultiplier: 1 - (config.sizeJitter * 0.85), alpha: 0.22, offsetX: -jitter * 0.75, offsetY: jitter * 0.5, blur: config.blur * 0.4 },
  ];

  sketchPasses.forEach((pass) => {
    const sketchPaint = createStrokePaint(
      pathPaint,
      Math.max(strokeWidth * pass.widthMultiplier, 0.8),
      Math.min(Math.max(opacity * config.opacity * pass.alpha, 0), 1),
      canvasSize,
      {
        blendMode: config.blendMode,
        blur: pass.blur,
        cap: config.cap,
        join: config.join,
      },
    );

    canvas.save();
    canvas.translate(pass.offsetX, pass.offsetY);
    canvas.drawPath(skPath, sketchPaint);
    canvas.restore();
  });
}

function drawGradientStroke(
  canvas: any,
  skPath: SkPath,
  pathPaint: DrawingPaint,
  brushStyle: 'default' | 'pencil' | 'paint-brush' | 'marker' | 'glow-pen' | 'crayon' | 'paint' | 'ball-pen' | 'sketch-pen',
  strokeWidth: number,
  opacity: number,
  canvasSize: number,
) {
  const defaultConfig = getToolRenderConfig(brushStyle);
  if (brushStyle === 'pencil' && pathPaint.kind === 'solid') {
    drawPencilStroke(canvas, skPath, pathPaint, strokeWidth, opacity);
    return;
  }

  if (brushStyle === 'paint-brush') {
    drawPaintBrushStroke(canvas, skPath, pathPaint, strokeWidth, opacity, canvasSize);
    return;
  }

  if (brushStyle === 'marker') {
    drawMarkerStroke(canvas, skPath, pathPaint, strokeWidth, opacity, canvasSize);
    return;
  }

  if (brushStyle === 'glow-pen') {
    drawGlowPenStroke(canvas, skPath, pathPaint, strokeWidth, opacity, canvasSize);
    return;
  }

  if (brushStyle === 'crayon') {
    drawCrayonStroke(canvas, skPath, pathPaint, strokeWidth, opacity, canvasSize);
    return;
  }

  if (brushStyle === 'paint') {
    drawPaintStroke(canvas, skPath, pathPaint, strokeWidth, opacity, canvasSize);
    return;
  }

  if (brushStyle === 'ball-pen') {
    drawBallPenStroke(canvas, skPath, pathPaint, strokeWidth, opacity, canvasSize);
    return;
  }

  if (brushStyle === 'sketch-pen') {
    drawSketchPenStroke(canvas, skPath, pathPaint, strokeWidth, opacity, canvasSize);
    return;
  }

  if (pathPaint.kind === 'solid') {
    const strokePaint = createStrokePaint(pathPaint, strokeWidth, opacity * defaultConfig.opacity, canvasSize, {
      blendMode: defaultConfig.blendMode,
      blur: defaultConfig.blur,
      cap: defaultConfig.cap,
      join: defaultConfig.join,
    });
    canvas.drawPath(skPath, strokePaint);
    return;
  }

  if (pathPaint.kind === 'layered-gradient') {
    const basePaint = Skia.Paint();
    basePaint.setAntiAlias(true);
    basePaint.setStyle(PaintStyle.Stroke);
    basePaint.setStrokeCap(defaultConfig.cap);
    basePaint.setStrokeJoin(defaultConfig.join);
    basePaint.setStrokeWidth(strokeWidth);
    basePaint.setAlphaf(opacity * defaultConfig.opacity);
    if (typeof defaultConfig.blendMode === 'number') {
      basePaint.setBlendMode(defaultConfig.blendMode);
    }
    basePaint.setColor(Skia.Color(pathPaint.baseColor));
    canvas.drawPath(skPath, basePaint);

    for (const overlay of pathPaint.overlays) {
      const overlayPaint = Skia.Paint();
      overlayPaint.setAntiAlias(true);
      overlayPaint.setStyle(PaintStyle.Stroke);
      overlayPaint.setStrokeCap(defaultConfig.cap);
      overlayPaint.setStrokeJoin(defaultConfig.join);
      overlayPaint.setStrokeWidth(strokeWidth);
      overlayPaint.setAlphaf(opacity * defaultConfig.opacity * (overlay.opacity ?? 1));
      if (typeof defaultConfig.blendMode === 'number') {
        overlayPaint.setBlendMode(defaultConfig.blendMode);
      }
      overlayPaint.setShader(
        Skia.Shader.MakeLinearGradient(
          {
            x: overlay.start.x * canvasSize,
            y: overlay.start.y * canvasSize,
          },
          {
            x: overlay.end.x * canvasSize,
            y: overlay.end.y * canvasSize,
          },
          overlay.colors.map((color) => Skia.Color(color)),
          null,
          TileMode.Clamp,
        ),
      );
      canvas.drawPath(skPath, overlayPaint);
    }
    return;
  }

  const gradientPaint = Skia.Paint();
  gradientPaint.setAntiAlias(true);
  gradientPaint.setStyle(PaintStyle.Stroke);
  gradientPaint.setStrokeCap(defaultConfig.cap);
  gradientPaint.setStrokeJoin(defaultConfig.join);
  gradientPaint.setStrokeWidth(strokeWidth);
  gradientPaint.setAlphaf(opacity * defaultConfig.opacity);
  if (typeof defaultConfig.blendMode === 'number') {
    gradientPaint.setBlendMode(defaultConfig.blendMode);
  }
  if (defaultConfig.blur > 0) {
    gradientPaint.setMaskFilter(Skia.MaskFilter.MakeBlur(BlurStyle.Normal, defaultConfig.blur, true));
  }
  gradientPaint.setShader(makeSkiaShaderFromPaint(pathPaint, canvasSize));
  canvas.drawPath(skPath, gradientPaint);
}

function createBoundaryMasks(
  pixels: Uint8Array,
  canvasSize: number,
): { lineMask: Uint8Array; floodMask: Uint8Array } {
  const lineMask = new Uint8Array(canvasSize * canvasSize);
  const floodSeedMask = new Uint8Array(canvasSize * canvasSize);

  for (let index = 0; index < lineMask.length; index += 1) {
    const pixelOffset = index * 4;
    const red = pixels[pixelOffset];
    const green = pixels[pixelOffset + 1];
    const blue = pixels[pixelOffset + 2];
    const alpha = pixels[pixelOffset + 3];
    const luminance = 0.2126 * red + 0.7152 * green + 0.0722 * blue;

    if (alpha > 96 && luminance < 170) {
      lineMask[index] = 1;
    }

    if (alpha > 32 && luminance < 235) {
      floodSeedMask[index] = 1;
    }
  }

  const floodMask = new Uint8Array(floodSeedMask);

  for (let y = 0; y < canvasSize; y += 1) {
    for (let x = 0; x < canvasSize; x += 1) {
      const index = y * canvasSize + x;
      if (!floodSeedMask[index]) continue;

      for (let offsetY = -1; offsetY <= 1; offsetY += 1) {
        for (let offsetX = -1; offsetX <= 1; offsetX += 1) {
          const nextX = x + offsetX;
          const nextY = y + offsetY;

          if (nextX < 0 || nextY < 0 || nextX >= canvasSize || nextY >= canvasSize) continue;
          floodMask[nextY * canvasSize + nextX] = 1;
        }
      }
    }
  }

  return { lineMask, floodMask };
}

function buildSvgMasks(
  renderableSvgXml: string,
  canvasSize: number,
): { lineMask: Uint8Array; floodMask: Uint8Array } | null {
  const svgDom = Skia.SVG.MakeFromString(renderableSvgXml);
  if (!svgDom) return null;

  const surface = Skia.Surface.Make(canvasSize, canvasSize);
  if (!surface) return null;

  const canvas = surface.getCanvas();
  canvas.clear(Skia.Color('transparent'));
  canvas.drawSvg(svgDom, canvasSize, canvasSize);
  surface.flush();

  const snapshot = surface.makeImageSnapshot();
  const rasterImage = snapshot.makeNonTextureImage() ?? snapshot;
  const pixels = rasterImage.readPixels(0, 0, {
    width: canvasSize,
    height: canvasSize,
    colorType: ColorType.RGBA_8888,
    alphaType: AlphaType.Unpremul,
  });

  if (!(pixels instanceof Uint8Array)) return null;
  return createBoundaryMasks(pixels, canvasSize);
}

function buildRegionLabels(
  boundaryMask: Uint8Array,
  canvasSize: number,
): { labels: Int32Array; regionSizes: Map<number, number> } {
  const labels = new Int32Array(canvasSize * canvasSize);
  const queue = new Int32Array(canvasSize * canvasSize);
  const regionSizes = new Map<number, number>();
  let nextLabel = 1;

  for (let index = 0; index < labels.length; index += 1) {
    if (boundaryMask[index] || labels[index] !== 0) continue;

    let head = 0;
    let tail = 0;
    let regionSize = 0;
    queue[tail] = index;
    tail += 1;
    labels[index] = nextLabel;

    while (head < tail) {
      const currentIndex = queue[head];
      head += 1;
      regionSize += 1;

      const x = currentIndex % canvasSize;
      const y = Math.floor(currentIndex / canvasSize);

      const tryVisit = (nextX: number, nextY: number) => {
        if (nextX < 0 || nextY < 0 || nextX >= canvasSize || nextY >= canvasSize) return;

        const nextIndex = nextY * canvasSize + nextX;
        if (boundaryMask[nextIndex] || labels[nextIndex] !== 0) return;

        labels[nextIndex] = nextLabel;
        queue[tail] = nextIndex;
        tail += 1;
      };

      tryVisit(x + 1, y);
      tryVisit(x - 1, y);
      tryVisit(x, y + 1);
      tryVisit(x, y - 1);
    }

    regionSizes.set(nextLabel, regionSize);
    nextLabel += 1;
  }

  return { labels, regionSizes };
}

function findNearestRegionLabel(
  x: number,
  y: number,
  labels: Int32Array,
  regionSizes: Map<number, number>,
  canvasSize: number,
): number | null {
  const clampedX = Math.min(Math.max(Math.round(x), 0), canvasSize - 1);
  const clampedY = Math.min(Math.max(Math.round(y), 0), canvasSize - 1);
  const directIndex = clampedY * canvasSize + clampedX;
  const directLabel = labels[directIndex];

  if (directLabel > 0) return directLabel;

  for (let radius = 1; radius <= 24; radius += 1) {
    let bestLabel: number | null = null;
    let bestDistance = Number.POSITIVE_INFINITY;
    let bestRegionSize = Number.POSITIVE_INFINITY;

    for (let offsetY = -radius; offsetY <= radius; offsetY += 1) {
      for (let offsetX = -radius; offsetX <= radius; offsetX += 1) {
        const nextX = clampedX + offsetX;
        const nextY = clampedY + offsetY;

        if (nextX < 0 || nextY < 0 || nextX >= canvasSize || nextY >= canvasSize) continue;

        const nextIndex = nextY * canvasSize + nextX;
        const candidateLabel = labels[nextIndex];
        if (candidateLabel <= 0) continue;

        const distance = offsetX * offsetX + offsetY * offsetY;
        const regionSize = regionSizes.get(candidateLabel) ?? Number.POSITIVE_INFINITY;

        if (
          distance < bestDistance
          || (distance === bestDistance && regionSize < bestRegionSize)
        ) {
          bestLabel = candidateLabel;
          bestDistance = distance;
          bestRegionSize = regionSize;
        }
      }
    }

    if (bestLabel !== null) return bestLabel;
  }

  return null;
}

function buildRegionMask(regionLabel: number, labels: Int32Array, canvasSize: number): Uint8Array {
  const regionMask = new Uint8Array(canvasSize * canvasSize);

  for (let index = 0; index < labels.length; index += 1) {
    if (labels[index] === regionLabel) {
      regionMask[index] = 1;
    }
  }

  return regionMask;
}

function expandRegionMask(regionMask: Uint8Array, lineMask: Uint8Array, canvasSize: number, radius: number): Uint8Array {
  const expandedMask = new Uint8Array(regionMask);

  for (let y = 0; y < canvasSize; y += 1) {
    for (let x = 0; x < canvasSize; x += 1) {
      const index = y * canvasSize + x;
      if (!regionMask[index]) continue;

      for (let offsetY = -radius; offsetY <= radius; offsetY += 1) {
        for (let offsetX = -radius; offsetX <= radius; offsetX += 1) {
          const nextX = x + offsetX;
          const nextY = y + offsetY;

          if (nextX < 0 || nextY < 0 || nextX >= canvasSize || nextY >= canvasSize) continue;

          const nextIndex = nextY * canvasSize + nextX;
          if (lineMask[nextIndex]) continue;
          expandedMask[nextIndex] = 1;
        }
      }
    }
  }

  return expandedMask;
}

function buildFillImage(regionMask: Uint8Array, canvasSize: number, paint: DrawingPaint, opacity: number): SkImage | null {
  const bytes = new Uint8Array(canvasSize * canvasSize * 4);

  for (let index = 0; index < regionMask.length; index += 1) {
    if (!regionMask[index]) continue;

    const x = index % canvasSize;
    const y = Math.floor(index / canvasSize);
    const [red, green, blue, alpha] = applyOpacityToRgba(
      samplePaintColorAtPoint(paint, x, y, canvasSize),
      opacity,
    );
    const offset = index * 4;
    bytes[offset] = red;
    bytes[offset + 1] = green;
    bytes[offset + 2] = blue;
    bytes[offset + 3] = alpha;
  }

  return Skia.Image.MakeImage(
    {
      width: canvasSize,
      height: canvasSize,
      colorType: ColorType.RGBA_8888,
      alphaType: AlphaType.Unpremul,
    },
    Skia.Data.fromBytes(bytes),
    canvasSize * 4,
  );
}

const DrawingCanvas: React.FC<DrawingCanvasProps> = ({
  canvasSize = SCREEN_WIDTH - 48,
  color = '#000000',
  paint,
  strokeWidth = 4,
  opacity = 1,
  brushStyle = 'default',
  tool = 'brush',
  drawingEnabled = true,
  svgUrl,
  initialPaths,
  onPathsChange,
  canvasRef,
}) => {
  const rasterSize = Math.max(Math.round(canvasSize), 1);
  const [paths, setPaths] = useState<DrawingPath[]>([]);
  const [redoStack, setRedoStack] = useState<DrawingPath[]>([]);
  const [currentDrawing, setCurrentDrawing] = useState<StrokeAction | null>(null);
  const [svgXml, setSvgXml] = useState<string | null>(null);
  const [svgLoading, setSvgLoading] = useState(false);
  const [paintImage, setPaintImage] = useState<SkImage | null>(null);
  const [maskVersion, setMaskVersion] = useState(0);
  const resolvedPaint = useMemo(() => paint ?? makeSolidPaint(color), [paint, color]);
  const pathsRef = useRef<DrawingPath[]>([]);
  const redoStackRef = useRef<DrawingPath[]>([]);
  const paintImageRef = useRef<SkImage | null>(null);

  const lineMaskRef = useRef<Uint8Array | null>(null);
  const boundaryMaskRef = useRef<Uint8Array | null>(null);
  const regionLabelsRef = useRef<Int32Array | null>(null);
  const regionSizesRef = useRef<Map<number, number>>(new Map());
  const fillRegionCacheRef = useRef<Map<number, Uint8Array | null>>(new Map());
  const fillImageCacheRef = useRef<Map<string, SkImage | null>>(new Map());

  const paintRef = useRef<DrawingPaint>(resolvedPaint);
  const strokeWidthRef = useRef(strokeWidth);
  const opacityRef = useRef(opacity);
  const brushStyleRef = useRef<'default' | 'pencil' | 'paint-brush' | 'marker' | 'glow-pen' | 'crayon' | 'paint' | 'ball-pen' | 'sketch-pen'>(brushStyle);
  const toolRef = useRef(tool);
  const drawingEnabledRef = useRef(drawingEnabled);
  const onPathsChangeRef = useRef(onPathsChange);
  const currentActionTypeRef = useRef<'stroke' | 'erase' | null>(null);
  const currentPathSegmentsRef = useRef<string[]>([]);
  const lastPointRef = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => { paintRef.current = resolvedPaint; }, [resolvedPaint]);
  useEffect(() => { strokeWidthRef.current = strokeWidth; }, [strokeWidth]);
  useEffect(() => { opacityRef.current = opacity; }, [opacity]);
  useEffect(() => { brushStyleRef.current = brushStyle; }, [brushStyle]);
  useEffect(() => { toolRef.current = tool; }, [tool]);
  useEffect(() => { drawingEnabledRef.current = drawingEnabled; }, [drawingEnabled]);
  useEffect(() => { onPathsChangeRef.current = onPathsChange; }, [onPathsChange]);
  useEffect(() => { pathsRef.current = paths; }, [paths]);
  useEffect(() => { redoStackRef.current = redoStack; }, [redoStack]);
  useEffect(() => { paintImageRef.current = paintImage; }, [paintImage]);
  useEffect(() => { onPathsChangeRef.current?.(paths); }, [paths]);
  useEffect(() => {
    if (!initialPaths || initialPaths.length === 0) return;
    if (pathsRef.current.length > 0) return;

    pathsRef.current = initialPaths;
    redoStackRef.current = [];
    setPaths(initialPaths);
    setRedoStack([]);
  }, [initialPaths]);

  useEffect(() => {
    if (!currentActionTypeRef.current || currentPathSegmentsRef.current.length === 0) return;

    const nextPath = currentPathSegmentsRef.current.length > 1
      ? currentPathSegmentsRef.current.join(' ')
      : currentPathSegmentsRef.current[0];

    if (currentActionTypeRef.current === 'erase') {
      setCurrentDrawing({
        type: 'erase',
        d: nextPath,
        paint: makeSolidPaint('#FFFFFF', 'eraser-white'),
        brushStyle: 'default',
        strokeWidth: strokeWidthRef.current,
        opacity: opacityRef.current,
      });
      return;
    }

    setCurrentDrawing({
      type: 'stroke',
      d: nextPath,
      paint: paintRef.current,
      brushStyle: brushStyleRef.current,
      strokeWidth: strokeWidthRef.current,
      opacity: opacityRef.current,
    });
  }, [brushStyle, opacity, resolvedPaint, strokeWidth]);

  useEffect(() => {
    if (!svgUrl) {
      setSvgXml(null);
      lineMaskRef.current = null;
      boundaryMaskRef.current = null;
      regionLabelsRef.current = null;
      regionSizesRef.current = new Map();
      fillRegionCacheRef.current.clear();
      fillImageCacheRef.current.clear();
      paintImageRef.current = null;
      setPaintImage(null);
      setMaskVersion((version) => version + 1);
      return;
    }

    let cancelled = false;
    setSvgLoading(true);

    fetch(svgUrl)
      .then((response) => response.text())
      .then((rawSvgXml) => {
        if (cancelled) return;

        const cleanSvg = stripSvgNoise(rawSvgXml);
        const viewBox = getSvgViewBox(cleanSvg);
        const renderableSvgXml = buildRenderableSvgXml(cleanSvg, viewBox, canvasSize, canvasSize);
        const svgMasks = buildSvgMasks(renderableSvgXml, rasterSize);
        const regionData = svgMasks ? buildRegionLabels(svgMasks.floodMask, rasterSize) : null;

        setSvgXml(renderableSvgXml);
        lineMaskRef.current = svgMasks?.lineMask ?? null;
        boundaryMaskRef.current = svgMasks?.floodMask ?? null;
        regionLabelsRef.current = regionData?.labels ?? null;
        regionSizesRef.current = regionData?.regionSizes ?? new Map();
        fillRegionCacheRef.current.clear();
        fillImageCacheRef.current.clear();
        paintImageRef.current = null;
        setMaskVersion((version) => version + 1);
        setSvgLoading(false);
      })
      .catch((error) => {
        console.error('[DrawingCanvas] SVG fetch error:', error);
        if (cancelled) return;

        setSvgXml(null);
        lineMaskRef.current = null;
        boundaryMaskRef.current = null;
        regionLabelsRef.current = null;
        regionSizesRef.current = new Map();
        fillRegionCacheRef.current.clear();
        fillImageCacheRef.current.clear();
        paintImageRef.current = null;
        setPaintImage(null);
        setMaskVersion((version) => version + 1);
        setSvgLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [svgUrl, canvasSize, rasterSize]);

  const getExpandedRegionMask = useCallback((regionLabel: number) => {
    const cachedRegionMask = fillRegionCacheRef.current.get(regionLabel) ?? null;
    if (cachedRegionMask) return cachedRegionMask;

    const lineMask = lineMaskRef.current;
    const regionLabels = regionLabelsRef.current;
    if (!lineMask || !regionLabels) return null;

    let regionMask = buildRegionMask(regionLabel, regionLabels, rasterSize);
    regionMask = expandRegionMask(regionMask, lineMask, rasterSize, 2);
    fillRegionCacheRef.current.set(regionLabel, regionMask);
    return regionMask;
  }, [rasterSize]);

  const setRenderedPaintImage = useCallback((nextImage: SkImage | null) => {
    paintImageRef.current = nextImage;
    setPaintImage(nextImage);
  }, []);

  const drawActionOnCanvas = useCallback((canvas: any, action: DrawingPath) => {
    if (action.type === 'fill') {
      const regionMask = getExpandedRegionMask(action.regionLabel);
      if (!regionMask) return;

      const fillImageKey = `${action.regionLabel}:${getPaintCacheKey(action.paint)}:${action.opacity}`;
      let fillImage = fillImageCacheRef.current.get(fillImageKey) ?? null;
      if (!fillImage) {
        fillImage = buildFillImage(regionMask, rasterSize, action.paint, action.opacity);
        fillImageCacheRef.current.set(fillImageKey, fillImage);
      }

      if (fillImage) {
        canvas.drawImage(fillImage, 0, 0);
      }
      return;
    }

    const skPath = Skia.Path.MakeFromSVGString(action.d);
    if (!skPath) return;

    if (action.type === 'erase') {
      const erasePaint = Skia.Paint();
      erasePaint.setAntiAlias(true);
      erasePaint.setStyle(PaintStyle.Stroke);
      erasePaint.setStrokeCap(StrokeCap.Round);
      erasePaint.setStrokeJoin(StrokeJoin.Round);
      erasePaint.setStrokeWidth(action.strokeWidth);
      erasePaint.setAlphaf(action.opacity);
      erasePaint.setBlendMode(BlendMode.Clear);
      canvas.drawPath(skPath, erasePaint);
      return;
    }

    drawGradientStroke(
      canvas,
      skPath,
      action.paint,
      action.brushStyle,
      action.strokeWidth,
      action.opacity,
      rasterSize,
    );
  }, [getExpandedRegionMask, rasterSize]);

  const renderActionsToImage = useCallback((actions: DrawingPath[]) => {
    if (actions.length === 0) {
      setRenderedPaintImage(null);
      return;
    }

    const surface = Skia.Surface.Make(rasterSize, rasterSize);
    if (!surface) {
      setRenderedPaintImage(null);
      return;
    }

    const canvas = surface.getCanvas();
    canvas.clear(Skia.Color('transparent'));

    actions.forEach((action) => {
      drawActionOnCanvas(canvas, action);
    });

    surface.flush();
    const snapshot = surface.makeImageSnapshot();
    const rasterImage = snapshot.makeNonTextureImage() ?? snapshot;
    setRenderedPaintImage(rasterImage);
  }, [drawActionOnCanvas, rasterSize, setRenderedPaintImage]);

  const appendActionToImage = useCallback((action: DrawingPath) => {
    const surface = Skia.Surface.Make(rasterSize, rasterSize);
    if (!surface) {
      renderActionsToImage([...pathsRef.current, action]);
      return;
    }

    const canvas = surface.getCanvas();
    canvas.clear(Skia.Color('transparent'));

    if (paintImageRef.current) {
      canvas.drawImage(paintImageRef.current, 0, 0);
    }

    drawActionOnCanvas(canvas, action);

    surface.flush();
    const snapshot = surface.makeImageSnapshot();
    const rasterImage = snapshot.makeNonTextureImage() ?? snapshot;
    setRenderedPaintImage(rasterImage);
  }, [drawActionOnCanvas, rasterSize, renderActionsToImage, setRenderedPaintImage]);

  useEffect(() => {
    renderActionsToImage(pathsRef.current);
  }, [maskVersion, renderActionsToImage]);

  const pushPath = useCallback((nextPath: DrawingPath) => {
    const nextPaths = [...pathsRef.current, nextPath];
    pathsRef.current = nextPaths;
    redoStackRef.current = [];

    appendActionToImage(nextPath);
    setPaths(nextPaths);
    setRedoStack([]);
  }, [appendActionToImage]);

  const resolveRegionLabel = useCallback((x: number, y: number) => {
    if (!regionLabelsRef.current) return null;

    return findNearestRegionLabel(
      x,
      y,
      regionLabelsRef.current,
      regionSizesRef.current,
      rasterSize,
    );
  }, [rasterSize]);

  const startCurrentDrawing = useCallback((type: 'stroke' | 'erase', x: number, y: number) => {
    currentActionTypeRef.current = type;
    currentPathSegmentsRef.current = [`M${x},${y}`];
    lastPointRef.current = { x, y };

    if (type === 'erase') {
      setCurrentDrawing({
        type: 'erase',
        d: currentPathSegmentsRef.current[0],
        paint: makeSolidPaint('#FFFFFF', 'eraser-white'),
        brushStyle: 'default',
        strokeWidth: strokeWidthRef.current,
        opacity: opacityRef.current,
      });
      return;
    }

    setCurrentDrawing({
      type: 'stroke',
      d: currentPathSegmentsRef.current[0],
      paint: paintRef.current,
      brushStyle: brushStyleRef.current,
      strokeWidth: strokeWidthRef.current,
      opacity: opacityRef.current,
    });
  }, []);

  const commitCurrentDrawing = useCallback(() => {
    if (!currentActionTypeRef.current || currentPathSegmentsRef.current.length === 0) return;

    const committedPath = currentPathSegmentsRef.current.length > 1
      ? currentPathSegmentsRef.current.join(' ')
      : `${currentPathSegmentsRef.current[0]} L${currentPathSegmentsRef.current[0].slice(1)}`;

    pushPath({
      type: currentActionTypeRef.current,
      d: committedPath,
      paint: currentActionTypeRef.current === 'erase'
        ? makeSolidPaint('#FFFFFF', 'eraser-white')
        : paintRef.current,
      brushStyle: currentActionTypeRef.current === 'erase'
        ? 'default'
        : brushStyleRef.current,
      strokeWidth: strokeWidthRef.current,
      opacity: opacityRef.current,
    });
  }, [pushPath]);

  const clearCurrentDrawing = useCallback(() => {
    currentActionTypeRef.current = null;
    currentPathSegmentsRef.current = [];
    lastPointRef.current = null;
    setCurrentDrawing(null);
  }, []);

  useEffect(() => {
    if (!drawingEnabled) {
      clearCurrentDrawing();
    }
  }, [clearCurrentDrawing, drawingEnabled]);

  const handleBucketFill = useCallback((x: number, y: number) => {
    if (toolRef.current !== 'bucket') return;
    if (!drawingEnabledRef.current) return;
    const regionLabel = resolveRegionLabel(x, y);
    if (!regionLabel) return;

    pushPath({
      type: 'fill',
      regionLabel,
      paint: paintRef.current,
      opacity: opacityRef.current,
    });
  }, [pushPath, resolveRegionLabel]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: (event) => (
        drawingEnabledRef.current && getActiveTouchCount(event.nativeEvent) <= 1
      ),
      onMoveShouldSetPanResponder: (event) => (
        drawingEnabledRef.current
        && toolRef.current !== 'bucket'
        && getActiveTouchCount(event.nativeEvent) <= 1
      ),
      onPanResponderGrant: (event) => {
        if (!drawingEnabledRef.current) {
          clearCurrentDrawing();
          return;
        }

        if (getActiveTouchCount(event.nativeEvent) > 1) {
          clearCurrentDrawing();
          return;
        }

        const { locationX, locationY } = event.nativeEvent;

        if (toolRef.current === 'bucket') {
          handleBucketFill(locationX, locationY);
          return;
        }

        if (toolRef.current !== 'brush' && toolRef.current !== 'eraser') return;

        const x = Math.round(locationX * 100) / 100;
        const y = Math.round(locationY * 100) / 100;
        startCurrentDrawing(toolRef.current === 'eraser' ? 'erase' : 'stroke', x, y);
      },
      onPanResponderMove: (event) => {
        if (!drawingEnabledRef.current) {
          clearCurrentDrawing();
          return;
        }

        if (getActiveTouchCount(event.nativeEvent) > 1) {
          clearCurrentDrawing();
          return;
        }

        if (!currentActionTypeRef.current) return;

        const x = Math.round(event.nativeEvent.locationX * 100) / 100;
        const y = Math.round(event.nativeEvent.locationY * 100) / 100;
        const lastPoint = lastPointRef.current;

        if (lastPoint) {
          const deltaX = x - lastPoint.x;
          const deltaY = y - lastPoint.y;
          const pointSpacing = currentActionTypeRef.current === 'erase'
            ? Math.max(strokeWidthRef.current * 0.2, 1)
            : getPointSpacingDistance(brushStyleRef.current, strokeWidthRef.current);
          if ((deltaX * deltaX) + (deltaY * deltaY) < (pointSpacing * pointSpacing)) return;
        }

        currentPathSegmentsRef.current.push(`L${x},${y}`);
        lastPointRef.current = { x, y };

        if (currentActionTypeRef.current === 'erase') {
          setCurrentDrawing({
            type: 'erase',
            d: currentPathSegmentsRef.current.join(' '),
            paint: makeSolidPaint('#FFFFFF', 'eraser-white'),
            brushStyle: 'default',
            strokeWidth: strokeWidthRef.current,
            opacity: opacityRef.current,
          });
          return;
        }

        setCurrentDrawing({
          type: 'stroke',
          d: currentPathSegmentsRef.current.join(' '),
          paint: paintRef.current,
          brushStyle: brushStyleRef.current,
          strokeWidth: strokeWidthRef.current,
          opacity: opacityRef.current,
        });
      },
      onPanResponderRelease: () => {
        if (!currentActionTypeRef.current) return;
        commitCurrentDrawing();
        clearCurrentDrawing();
      },
      onPanResponderTerminate: () => {
        clearCurrentDrawing();
      },
    }),
  ).current;

  const undo = useCallback(() => {
    if (pathsRef.current.length === 0) return;

    const nextPaths = [...pathsRef.current];
    const removed = nextPaths.pop();
    const nextRedo = removed
      ? [...redoStackRef.current, removed]
      : redoStackRef.current;

    pathsRef.current = nextPaths;
    redoStackRef.current = nextRedo;
    setPaths(nextPaths);
    setRedoStack(nextRedo);
    renderActionsToImage(nextPaths);
  }, [renderActionsToImage]);

  const redo = useCallback(() => {
    if (redoStackRef.current.length === 0) return;

    const nextRedo = [...redoStackRef.current];
    const restored = nextRedo.pop();
    if (!restored) return;

    const nextPaths = [...pathsRef.current, restored];

    pathsRef.current = nextPaths;
    redoStackRef.current = nextRedo;
    setPaths(nextPaths);
    setRedoStack(nextRedo);
    renderActionsToImage(nextPaths);
  }, [renderActionsToImage]);

  const clear = useCallback(() => {
    const previousPaths = pathsRef.current;
    const nextRedo = previousPaths.length > 0
      ? [...redoStackRef.current, ...previousPaths]
      : redoStackRef.current;

    pathsRef.current = [];
    redoStackRef.current = nextRedo;
    setPaths([]);
    setRedoStack(nextRedo);
    setRenderedPaintImage(null);
    clearCurrentDrawing();
  }, [clearCurrentDrawing, setRenderedPaintImage]);

  const save = useCallback(async (): Promise<string | null> => {
    try {
      const surface = Skia.Surface.MakeOffscreen(rasterSize, rasterSize) ?? Skia.Surface.Make(rasterSize, rasterSize);
      if (!surface) return null;

      const canvas = surface.getCanvas();
      canvas.clear(Skia.Color('#FFFFFF'));

      const exportPaintImage = paintImage?.makeNonTextureImage() ?? paintImage;
      if (exportPaintImage) {
        canvas.drawImage(exportPaintImage, 0, 0);
      }

      if (svgXml) {
        const svgDom = Skia.SVG.MakeFromString(svgXml);
        if (svgDom) {
          canvas.drawSvg(svgDom, rasterSize, rasterSize);
        }
      }

      surface.flush();
      const snapshot = surface.makeImageSnapshot();
      const rasterSnapshot = snapshot.makeNonTextureImage() ?? snapshot;
      const encodedBytes = rasterSnapshot.encodeToBytes(ImageFormat.PNG, 100);
      if (!encodedBytes?.length) return null;

      const file = new File(Paths.document, 'drawings', `coloring_${Date.now()}.png`);
      file.create({ intermediates: true, overwrite: true });
      file.write(encodedBytes);
      return file.uri;
    } catch (error) {
      console.error('[DrawingCanvas] Save error:', error);
      return null;
    }
  }, [paintImage, rasterSize, svgXml]);

  const imperativeHandle = useMemo<DrawingCanvasHandle>(() => ({
    undo,
    redo,
    clear,
    save,
    getPathCount: () => pathsRef.current.length,
  }), [clear, redo, save, undo]);

  useEffect(() => {
    if (!canvasRef) return;

    canvasRef.current = imperativeHandle;

    return () => {
      if (canvasRef.current === imperativeHandle) {
        canvasRef.current = null;
      }
    };
  }, [canvasRef, imperativeHandle]);

  const currentPreview = useMemo(() => {
    if (!currentDrawing?.d) return null;

    if (currentDrawing.type === 'stroke') {
      const surface = Skia.Surface.Make(rasterSize, rasterSize);
      if (!surface) return null;

      const canvas = surface.getCanvas();
      canvas.clear(Skia.Color('transparent'));
      drawActionOnCanvas(canvas, currentDrawing);
      surface.flush();

      const snapshot = surface.makeImageSnapshot();
      const rasterPreview = snapshot.makeNonTextureImage() ?? snapshot;

      return (
        <Canvas
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: canvasSize,
            height: canvasSize,
          }}
          pointerEvents="none"
        >
          <SkiaImage
            image={rasterPreview}
            x={0}
            y={0}
            width={canvasSize}
            height={canvasSize}
          />
        </Canvas>
      );
    }

    return (
      <Svg
        width={canvasSize}
        height={canvasSize}
        viewBox={`0 0 ${canvasSize} ${canvasSize}`}
        style={{ position: 'absolute', top: 0, left: 0 }}
        pointerEvents="none"
      >
        <Path
          d={currentDrawing.d}
          stroke="#FFFFFF"
          strokeWidth={currentDrawing.strokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
          opacity={0.9}
        />
      </Svg>
    );
  }, [canvasSize, currentDrawing, drawActionOnCanvas, rasterSize]);

  return (
    <View
      style={{
        width: canvasSize,
        height: canvasSize,
        backgroundColor: '#FFFFFF',
        borderRadius: 24,
        overflow: 'hidden',
      }}
    >
      <View style={{ width: canvasSize, height: canvasSize, position: 'relative' }}>
        <Canvas
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: canvasSize,
            height: canvasSize,
          }}
        >
          {paintImage && (
            <SkiaImage
              image={paintImage}
              x={0}
              y={0}
              width={canvasSize}
              height={canvasSize}
            />
          )}
        </Canvas>

        {currentPreview}

        {svgUrl && svgXml && (
          <View
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: canvasSize,
              height: canvasSize,
            }}
            pointerEvents="none"
          >
            <SvgXml xml={svgXml} width={canvasSize} height={canvasSize} />
          </View>
        )}

        {svgUrl && svgLoading && (
          <View
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: canvasSize,
              height: canvasSize,
              justifyContent: 'center',
              alignItems: 'center',
            }}
          >
            <ActivityIndicator size="large" color="#3A3A3A" />
          </View>
        )}

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
      </View>
    </View>
  );
};

export default DrawingCanvas;
