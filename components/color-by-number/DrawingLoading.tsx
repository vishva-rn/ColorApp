import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, StyleSheet, View, useWindowDimensions } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useReducedMotion } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { NumberArt } from '@/lib/number-art';
import Artwork from './Artwork';

const MIN_PREVIEW_MS = 550;
const MAX_OUTLINE_WAIT_MS = 1800;
const FULL_BAR_HOLD_MS = 100;

export default function DrawingLoading({
  art, filled, canOpen, onContinue,
}: {
  art?: NumberArt;
  filled: string[];
  canOpen: boolean;
  onContinue: () => void;
}) {
  const { width, height } = useWindowDimensions();
  const cardWidth = Math.min(width * 0.89, height * 0.51, 400);
  const trackWidth = cardWidth * 0.69;
  const reduceMotion = useReducedMotion();
  const progress = useRef(new Animated.Value(reduceMotion ? 0.5 : 0)).current;
  const [previewShown, setPreviewShown] = useState(false);
  const [settledOutline, setSettledOutline] = useState<string>();
  const [outlineWaitExpired, setOutlineWaitExpired] = useState(false);
  const outlineUri = art?.outline?.uri;
  const outlineReady = !outlineUri || settledOutline === outlineUri;
  const ready = canOpen && previewShown && (outlineReady || outlineWaitExpired);
  const painted = new Set(filled);
  const hasProgress = art?.regions.some(({ id }) => painted.has(id));

  useEffect(() => {
    const timer = setTimeout(() => setPreviewShown(true), MIN_PREVIEW_MS);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!canOpen || outlineReady) return;
    // Continue with the canvas's own image loading and fallback on slow connections.
    const timer = setTimeout(() => setOutlineWaitExpired(true), MAX_OUTLINE_WAIT_MS);
    return () => clearTimeout(timer);
  }, [canOpen, outlineReady]);

  useEffect(() => {
    if (ready || reduceMotion) return;
    // Leave room for the last part of the bar until the editor is ready.
    const animation = Animated.timing(progress, {
      toValue: 0.85,
      duration: 1500,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
      isInteraction: false,
    });
    animation.start();
    return () => animation.stop();
  }, [ready, reduceMotion, progress]);

  useEffect(() => {
    if (!ready) return;
    if (reduceMotion) {
      progress.setValue(1);
      const timer = setTimeout(onContinue, FULL_BAR_HOLD_MS);
      return () => clearTimeout(timer);
    }
    let timer: ReturnType<typeof setTimeout> | undefined;
    const animation = Animated.timing(progress, {
      toValue: 1,
      duration: 220,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
      isInteraction: false,
    });
    animation.start(({ finished }) => {
      if (finished) timer = setTimeout(onContinue, FULL_BAR_HOLD_MS);
    });
    return () => {
      animation.stop();
      clearTimeout(timer);
    };
  }, [ready, reduceMotion, progress, onContinue]);

  const translateX = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [-trackWidth, 0],
  });

  return (
    <SafeAreaView style={styles.screen}>
      <StatusBar style="dark" />
      <View style={{ width: cardWidth }}>
        <View style={styles.card} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
          {art && (
            <View style={styles.art}>
              <Artwork
                art={art}
                filled={filled}
                outlineOnly={!hasProgress}
                hideNumbers
                onOutlineSettled={() => setSettledOutline(outlineUri)}
              />
            </View>
          )}
        </View>
        <View
          style={[styles.track, { width: trackWidth }]}
          accessible
          accessibilityRole="progressbar"
          accessibilityLabel={art ? `Loading ${art.title}` : 'Loading picture'}
          accessibilityState={{ busy: true }}
        >
          <Animated.View style={[styles.fill, { transform: [{ translateX }] }]} />
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F7F2EF', alignItems: 'center', justifyContent: 'center' },
  card: {
    aspectRatio: 0.9,
    padding: 12,
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#EAE5E2',
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
  },
  art: { width: '100%', aspectRatio: 1 },
  track: {
    position: 'absolute',
    top: '100%',
    alignSelf: 'center',
    marginTop: 24,
    height: 5,
    borderRadius: 3,
    backgroundColor: '#F6E5E1',
    overflow: 'hidden',
  },
  fill: { width: '100%', height: '100%', borderRadius: 3, backgroundColor: '#F25368' },
});
