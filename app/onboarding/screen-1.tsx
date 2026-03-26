/**
 * Onboarding Screen 1
 * Welcome screen with illustration and next arrow button
 */

import React from 'react';
import {
  Dimensions,
  Image,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

const { height } = Dimensions.get('window');

interface Props {
  onNext: () => void;
}

export default function Onboarding1({ onNext }: Props) {
  return (
    <SafeAreaView className="flex-1 bg-white">
      {/* Header */}
      <View className="px-6 pt-4 pb-2">
        <Text className="text-base font-semibold text-gray-900">Onboarding1</Text>
      </View>

      {/* Title */}
      <View className="px-6 pt-2">
        <Text className="text-2xl font-bold text-gray-900 leading-8">
          Welcome to App Name
        </Text>
        <Text className="text-sm text-gray-500 mt-2 leading-5">
          Complete the Selection to make recommendation more accuracy.
        </Text>
      </View>

      {/* Illustration */}
      <View className="flex-1 items-center justify-center px-6">
        <Image
          source={require('../../assets/images/onboard/onboard1.png')}
          style={{ width: '85%', height: height * 0.38 }}
          resizeMode="contain"
        />
      </View>

      {/* Next Button — bottom right */}
      <View className="px-6 pb-10 items-end">
        <TouchableOpacity
          onPress={onNext}
          className="w-14 h-14 rounded-full bg-black items-center justify-center shadow-lg"
          activeOpacity={0.8}
        >
          <Ionicons name="arrow-forward" size={24} color="#fff" />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
