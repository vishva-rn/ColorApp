import { useEffect, useId } from 'react';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedProps,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { Circle, ClipPath, Defs, G, Path } from 'react-native-svg';
import { scheduleOnRN } from 'react-native-worklets';

import type { ArtRegion } from '@/lib/number-art';

type Point = { x: number; y: number };

export type FillReveal = {
  measureTap: (size: number, callback: (point: Point) => void) => void;
};

export type FillReveals = Record<string, FillReveal | undefined>;
export type FillRevealEnd = (regionId: string, reveal: FillReveal) => void;

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

export default function RegionFill({ region, color, gradientId, size, reveal, onEnd }: {
  region: ArtRegion;
  color: string;
  gradientId?: string;
  size: number;
  reveal: FillReveal;
  onEnd: FillRevealEnd | undefined;
}) {
  const clipId = `fill-${useId().replace(/[^\w-]/g, '')}`;
  const center = useSharedValue({ x: region.x, y: region.y });
  const radius = useSharedValue(0);

  const animatedProps = useAnimatedProps(() => ({
    cx: center.value.x,
    cy: center.value.y,
    r: radius.value,
  }));

  useEffect(() => {
    let active = true;
    let started = false;
    const finish = () => {
      if (active) onEnd?.(region.id, reveal);
    };

    function start(point: Point) {
      if (!active || started) return;
      started = true;
      center.value = point;
      // Reaching the farthest corner covers the whole region, including long or disconnected paths.
      const reach = Math.hypot(Math.max(point.x, size - point.x), Math.max(point.y, size - point.y));
      radius.value = withTiming(reach, { duration: 400, easing: Easing.in(Easing.quad) }, (finished) => {
        if (finished) scheduleOnRN(finish);
      });
    }

    const fallback = setTimeout(() => start({ x: region.x, y: region.y }), 80);
    reveal.measureTap(size, (point) => {
      clearTimeout(fallback);
      start(point);
    });

    return () => {
      active = false;
      clearTimeout(fallback);
      cancelAnimation(radius);
    };
  }, [center, onEnd, radius, region, reveal, size]);

  if (gradientId) {
    return (
      <G pointerEvents="none">
        <Defs>
          <ClipPath id={clipId}>
            <AnimatedCircle animatedProps={animatedProps} />
          </ClipPath>
        </Defs>
        <Path d={region.path} fill={`url(#${gradientId})`} fillRule="evenodd" clipPath={`url(#${clipId})`} />
      </G>
    );
  }

  return (
    <G pointerEvents="none">
      <Defs>
        <ClipPath id={clipId}>
          <Path d={region.path} />
        </ClipPath>
      </Defs>
      <AnimatedCircle animatedProps={animatedProps} fill={color} clipPath={`url(#${clipId})`} clipRule="evenodd" />
    </G>
  );
}
