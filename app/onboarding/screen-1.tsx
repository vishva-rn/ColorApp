/**
 * Onboarding Screen 1
 * Welcome screen with illustration
 */

import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import {
  Dimensions,
  Image,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const { height } = Dimensions.get('window');

interface Props {
  onNext: () => void;
}

export default function Onboarding1({ onNext }: Props) {
  return (
    <SafeAreaView className="flex-1 bg-screen">
      {/* Header - Welcome message */}
      <View className="items-center pt-10">
        <Text className="text-[14px] text-gray-400 font-poppins">
          Welcome to "App Name"
        </Text>
      </View>

      {/* Main Title - Mersin Bold Italic style */}
      <View className="px-4 pt-6">
        <Text
          className="text-[25px] text-gray-800 text-center font-mersin-bolditalic"
        >
          Complete the Selection to make recommendation more accurately
        </Text>
      </View>

      {/* Illustration */}
      <View className="flex-1 items-center justify-center">
        <View className="w-full h-[100%] items-center justify-center">
          <Image
            source={require('../../assets/images/onboard/onboard1.png')}
            style={{ width: '85%', height: '85%' }}
            resizeMode="contain"
          />
        </View>
      </View>

      {/* Next Button — bottom right */}
      <View className="px-6 pb-5 items-end">
        <TouchableOpacity
          onPress={onNext}
          className="w-16 h-16 rounded-full bg-[#3A3A3A] items-center justify-center shadow-md"
          activeOpacity={0.8}
        >
          <Ionicons name="arrow-forward" size={28} color="#fff" />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
