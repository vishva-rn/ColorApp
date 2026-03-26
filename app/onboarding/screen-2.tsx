/**
 * Onboarding Screen 2
 * Gender selection screen with options and next arrow button
 */

import React, { useState } from 'react';
import {
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

interface Props {
  onNext: () => void;
}

type GenderOption = 'Male' | 'Female' | 'Other' | "Don't want to say";

const genderOptions: GenderOption[] = ['Male', 'Female', 'Other', "Don't want to say"];

export default function Onboarding2({ onNext }: Props) {
  const [selected, setSelected] = useState<GenderOption | null>(null);

  return (
    <SafeAreaView className="flex-1 bg-screen">
      {/* Header */}
      <View className="px-6 pt-4 pb-2">
        <Text className="text-base font-semibold text-gray-900">Onboarding2</Text>
      </View>

      {/* Quote decoration */}
      <View className="px-6 pt-2">
        <Text className="text-5xl text-gray-200 font-bold leading-none">"</Text>
      </View>

      {/* Title */}
      <View className="px-6 mt-2">
        <Text className="text-2xl font-bold text-gray-900 leading-8">
          What's gender do you{'\n'}identify as? 🔥
        </Text>
      </View>

      {/* Gender Options — 2x2 grid */}
      <View className="px-6 mt-8">
        <View className="flex-row gap-3 mb-3">
          {/* Male */}
          <TouchableOpacity
            onPress={() => setSelected('Male')}
            className={`flex-1 py-4 rounded-2xl items-center justify-center border ${
              selected === 'Male'
                ? 'bg-black border-black'
                : 'bg-screen border-gray-200'
            }`}
            activeOpacity={0.8}
          >
            <Text className={`text-base font-semibold ${selected === 'Male' ? 'text-white' : 'text-gray-800'}`}>
              Male
            </Text>
          </TouchableOpacity>

          {/* Female */}
          <TouchableOpacity
            onPress={() => setSelected('Female')}
            className={`flex-1 py-4 rounded-2xl items-center justify-center border ${
              selected === 'Female'
                ? 'bg-black border-black'
                : 'bg-screen border-gray-200'
            }`}
            activeOpacity={0.8}
          >
            <Text className={`text-base font-semibold ${selected === 'Female' ? 'text-white' : 'text-gray-800'}`}>
              Female
            </Text>
          </TouchableOpacity>
        </View>

        <View className="flex-row gap-3">
          {/* Other */}
          <TouchableOpacity
            onPress={() => setSelected('Other')}
            className={`flex-1 py-4 rounded-2xl items-center justify-center border ${
              selected === 'Other'
                ? 'bg-black border-black'
                : 'bg-screen border-gray-200'
            }`}
            activeOpacity={0.8}
          >
            <Text className={`text-base font-semibold ${selected === 'Other' ? 'text-white' : 'text-gray-800'}`}>
              Other
            </Text>
          </TouchableOpacity>

          {/* Don't want to say */}
          <TouchableOpacity
            onPress={() => setSelected("Don't want to say")}
            className={`flex-1 py-4 rounded-2xl items-center justify-center border ${
              selected === "Don't want to say"
                ? 'bg-black border-black'
                : 'bg-screen border-gray-200'
            }`}
            activeOpacity={0.8}
          >
            <Text
              className={`text-sm font-semibold text-center ${
                selected === "Don't want to say" ? 'text-white' : 'text-gray-800'
              }`}
            >
              Don't want{'\n'}to say
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Next Button — bottom right */}
      <View className="flex-1" />
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
