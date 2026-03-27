import { Image } from 'expo-image';
import { View, Text, TouchableOpacity, Platform, StyleSheet } from 'react-native';

import { HelloWave } from '@/components/hello-wave';
import ParallaxScrollView from '@/components/parallax-scroll-view';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Link } from 'expo-router';

export default function HomeScreen() {
  return (
    <ParallaxScrollView
      headerBackgroundColor={{ light: '#F7F2EF', dark: '#1D3D47' }}
      headerImage={
        <View className="flex-1 items-center justify-center bg-[#F7F2EF]">
           <ThemedText type="title" className="font-mersin-bolditalic text-[#3A3A3A]">ColorApp</ThemedText>
        </View>
      }>
      <ThemedView className="items-center py-10">
        <ThemedText type="subtitle" className="mb-6 font-poppins text-[#A0A0A0]">
          Unleash your creativity
        </ThemedText>
        
        <View className="flex-row gap-4 mb-6">
          <Link href="/drawing" asChild>
            <TouchableOpacity className="bg-[#3A3A3A] px-10 py-5 rounded-[32px] shadow-lg active:opacity-80">
              <Text className="text-white font-poppins-bold text-[16px]">Start Drawing</Text>
            </TouchableOpacity>
          </Link>

          <Link href="/drawing/selection" asChild>
            <TouchableOpacity className="bg-[#FBBF24] px-10 py-5 rounded-[32px] shadow-lg active:opacity-80">
              <Text className="text-[#3A3A3A] font-poppins-bold text-[16px]">Kids Mode 🎨</Text>
            </TouchableOpacity>
          </Link>
        </View>
      </ThemedView>

      <ThemedView className="px-6 gap-4">
        <ThemedText className="font-poppins text-[#3A3A3A] text-center">
          Experience the joy of coloring with our premium tools and beautiful designs.
        </ThemedText>
      </ThemedView>
    </ParallaxScrollView>
  );
}

const styles = StyleSheet.create({
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  stepContainer: {
    gap: 8,
    marginBottom: 8,
  },
  reactLogo: {
    height: 178,
    width: 290,
    bottom: 0,
    left: 0,
    position: 'absolute',
  },
});
