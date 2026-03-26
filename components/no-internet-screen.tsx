/**
 * No Internet Screen
 * Shown when device has no network connection.
 * Mirrors the pattern from ai-chat-RN.
 */

import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

interface NoInternetScreenProps {
  onTryAgain?: () => void;
}

export default function NoInternetScreen({ onTryAgain }: NoInternetScreenProps) {
  return (
    <SafeAreaView className="flex-1 bg-black">
      <View className="flex-1 justify-center items-center px-6">
        {/* Icon */}
        <View className="mb-6">
          <Text style={{ fontSize: 56 }}>📡</Text>
        </View>

        {/* Title */}
        <Text className="text-white text-lg font-semibold text-center mb-3">
          Connection Error
        </Text>

        {/* Message */}
        <Text className="text-white/65 text-sm text-center mb-8 leading-5">
          There's a problem with your internet connection.{'\n'}
          Please check it and try again.
        </Text>

        {/* Try Again Button */}
        {onTryAgain && (
          <TouchableOpacity
            onPress={onTryAgain}
            className="bg-white px-8 py-3 rounded-xl"
            activeOpacity={0.8}
          >
            <Text className="text-black font-semibold text-base">Try Again</Text>
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  );
}
