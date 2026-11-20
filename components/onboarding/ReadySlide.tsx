import { useFocusEffect } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useState } from 'react';
import { Image, View } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  interpolate,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

const QUOTE_DURATION_MS = 3000;
const ENTER_DURATION_MS = 650;
const EXIT_DURATION_MS = 220;

export default function ReadySlide({ onFinished }: { onFinished: () => void }) {
  const [imageReady, setImageReady] = useState(false);
  const elapsed = useSharedValue(0);
  const reduceMotion = useReducedMotion();

  const artworkStyle = useAnimatedStyle(() => {
    if (reduceMotion) {
      return { opacity: 1, transform: [{ translateY: 0 }, { scale: 1 }] };
    }

    const enterProgress = Math.min(elapsed.value / ENTER_DURATION_MS, 1);
    const entrance = 1 - (1 - enterProgress) ** 3;
    const exitStart = QUOTE_DURATION_MS - EXIT_DURATION_MS;
    const exit = Math.max((elapsed.value - exitStart) / EXIT_DURATION_MS, 0);

    return {
      opacity: entrance * (1 - exit),
      transform: [
        { translateY: interpolate(entrance, [0, 1], [18, 0]) },
        { scale: interpolate(entrance, [0, 1], [0.97, 1]) },
      ],
    };
  });

  useFocusEffect(useCallback(() => {
    if (!imageReady) return;

    if (!reduceMotion) {
      elapsed.value = 0;
      elapsed.value = withTiming(QUOTE_DURATION_MS, {
        duration: QUOTE_DURATION_MS,
        easing: Easing.linear,
      });
    }

    const timer = setTimeout(onFinished, QUOTE_DURATION_MS);
    return () => {
      clearTimeout(timer);
      cancelAnimation(elapsed);
    };
  }, [elapsed, imageReady, onFinished, reduceMotion]));

  return (
    <SafeAreaView className="flex-1 bg-screen">
      <StatusBar style="dark" />
      <View className="flex-1 items-center justify-center -mt-10">
        <View className="w-full aspect-[0.7] px-4">
          <Animated.View style={[{ flex: 1 }, artworkStyle]}>
            <Image
              source={require('../../assets/images/onboard/onboard7.png')}
              style={{ width: '100%', height: '100%' }}
              resizeMode="contain"
              onLoadEnd={() => setImageReady(true)}
              accessibilityLabel="Art washes away from the soul the dust of everyday life. Pablo Picasso."
            />
          </Animated.View>
        </View>
      </View>
    </SafeAreaView>
  );
}
