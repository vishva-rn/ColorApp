import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { TouchableOpacity, View } from 'react-native';

interface Props {
  onPress: () => void;
}

export const OnboardingNextButton = ({ onPress }: Props) => {
  return (
    <View className="absolute bottom-10 right-6">
      <TouchableOpacity
        onPress={onPress}
        activeOpacity={0.8}
        className="w-[70px] h-[70px] rounded-full bg-[#3A3A3A] items-center justify-center"
        style={{
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.2,
          shadowRadius: 12,
          elevation: 5,
        }}
      >
        <Ionicons name="arrow-forward" size={30} color="#fff" />
      </TouchableOpacity>
    </View>
  );
};
