import { useEffect, useId, useRef } from 'react';
import { Pressable, processColor, StyleSheet, View } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle, Defs, G } from 'react-native-svg';
import { scheduleOnRN } from 'react-native-worklets';

import type { ArtGradient } from '@/lib/number-art';
import PaletteGradient from './PaletteGradient';

export const SWATCH_SIZE = 52;
export const SWATCH_GAP = 10;
const DISC_SIZE = 44;
const DISC_CENTER = DISC_SIZE / 2;
const CENTER = SWATCH_SIZE / 2;
const RADIUS = CENTER - 1.5;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
const PROGRESS_DURATION = 260;
const COMPLETED_RING_HOLD = 90;
const EXIT_DURATION = 220;
const AnimatedCircle = Animated.createAnimatedComponent(Circle);

function swatchTextColor(color: string) {
  const argb = processColor(color);
  if (typeof argb !== 'number') return '#000000';

  const linear = (shift: number) => {
    const channel = ((argb >>> shift) & 255) / 255;
    return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
  };
  const luminance = 0.2126 * linear(16) + 0.7152 * linear(8) + 0.0722 * linear(0);
  return luminance >= 0.179 ? '#000000' : '#FFFFFF';
}

export default function ColorSwatch({
  color, number, total, remaining, gradient, selected, finishing, reduceMotion, onSelect, onFinished,
}: {
  color: string;
  number: number;
  total: number;
  remaining: number;
  gradient?: ArtGradient;
  selected: boolean;
  finishing: boolean;
  reduceMotion: boolean;
  onSelect: () => void;
  onFinished: (number: number) => void;
}) {
  const gradientId = `swatch-${useId().replace(/[^\w-]/g, '')}`;
  const progress = (total - remaining) / total;
  const previousProgress = useRef(progress);
  const ringProgress = useSharedValue(progress);
  const numberScale = useSharedValue(1);
  const exitProgress = useSharedValue(0);

  useEffect(() => {
    const previous = previousProgress.current;
    previousProgress.current = progress;

    if (reduceMotion) {
      ringProgress.value = progress;
      numberScale.value = 1;
      cancelAnimation(exitProgress);
      if (finishing) onFinished(number);
      return;
    }

    if (progress !== previous || finishing) {
      ringProgress.value = withTiming(progress, { duration: PROGRESS_DURATION, easing: Easing.out(Easing.cubic) });
    }

    if (finishing) {
      exitProgress.value = withDelay(
        PROGRESS_DURATION + COMPLETED_RING_HOLD,
        withTiming(1, { duration: EXIT_DURATION, easing: Easing.inOut(Easing.cubic) }, (finished) => {
          if (finished) scheduleOnRN(onFinished, number);
        }),
      );
    }

    if (progress > previous) {
      numberScale.value = withSequence(
        withTiming(1.28, { duration: 100 }),
        withTiming(1, { duration: 190, easing: Easing.out(Easing.cubic) }),
      );
    }
  }, [exitProgress, finishing, number, numberScale, onFinished, progress, reduceMotion, ringProgress]);

  useEffect(() => () => {
    cancelAnimation(exitProgress);
    cancelAnimation(ringProgress);
    cancelAnimation(numberScale);
  }, [exitProgress, numberScale, ringProgress]);

  const ringProps = useAnimatedProps(() => ({
    strokeDashoffset: CIRCUMFERENCE * (1 - ringProgress.value),
    opacity: ringProgress.value > 0 ? 1 : 0,
  }));
  const numberStyle = useAnimatedStyle(() => ({
    transform: [{ scale: numberScale.value }],
  }));
  // Collapsing the slot moves each following circle as the finished circle fades.
  const slotStyle = useAnimatedStyle(() => ({
    width: (SWATCH_SIZE + SWATCH_GAP) * (1 - exitProgress.value),
  }));
  const circleStyle = useAnimatedStyle(() => ({
    opacity: 1 - exitProgress.value,
    transform: [{ scale: 1 - 0.45 * exitProgress.value }],
  }));

  return (
    <Animated.View style={[styles.slot, slotStyle]}>
      <Animated.View style={circleStyle}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Color ${number}, ${remaining} ${remaining === 1 ? 'area' : 'areas'} remaining`}
          accessibilityState={{ selected, disabled: finishing }}
          disabled={finishing}
          onPress={onSelect}
          style={styles.button}
        >
          {(selected || finishing) && (
            <Svg pointerEvents="none" width={SWATCH_SIZE} height={SWATCH_SIZE} style={StyleSheet.absoluteFill}>
              <G transform={`rotate(-90 ${CENTER} ${CENTER})`}>
                <Circle cx={CENTER} cy={CENTER} r={RADIUS} fill="none" stroke="#BBB8B4" strokeWidth={1.5} />
                <AnimatedCircle
                  cx={CENTER}
                  cy={CENTER}
                  r={RADIUS}
                  fill="none"
                  stroke="#000000"
                  strokeWidth={2.5}
                  strokeLinecap="round"
                  strokeDasharray={[CIRCUMFERENCE, CIRCUMFERENCE]}
                  animatedProps={ringProps}
                />
              </G>
            </Svg>
          )}
          <View style={[styles.disc, { backgroundColor: color }]}>
            {gradient && (
              <Svg pointerEvents="none" width={DISC_SIZE} height={DISC_SIZE} style={StyleSheet.absoluteFill}>
                <Defs><PaletteGradient id={gradientId} color={color} gradient={gradient} /></Defs>
                <Circle cx={DISC_CENTER} cy={DISC_CENTER} r={DISC_CENTER} fill={`url(#${gradientId})`} />
              </Svg>
            )}
            <Animated.Text style={[styles.number, { color: swatchTextColor(color) }, numberStyle]}>{number}</Animated.Text>
          </View>
        </Pressable>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  slot: { height: SWATCH_SIZE, flexShrink: 0, alignItems: 'flex-start', overflow: 'hidden' },
  button: { width: SWATCH_SIZE, height: SWATCH_SIZE, alignItems: 'center', justifyContent: 'center' },
  disc: { width: DISC_SIZE, height: DISC_SIZE, borderRadius: DISC_CENTER, alignItems: 'center', justifyContent: 'center' },
  number: { fontSize: 17, fontWeight: '600', textAlign: 'center' },
});
