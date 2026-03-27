import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import SelectedIcon from '../../assets/images/svgicons/selected.svg';

interface Props {
  label: string;
  isSelected: boolean;
  onPress: () => void;
}

export const SelectionOption = ({ label, isSelected, onPress }: Props) => {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.9}
      className={`w-[47%] aspect-[1.15] rounded-[24px] mb-5 p-5 justify-center items-center relative ${
        isSelected ? 'bg-[#3A3A3A]' : 'bg-white'
      }`}
      style={{
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
        elevation: 2,
      }}
    >
      {isSelected && (
        <View className="absolute top-4 left-4">
          <SelectedIcon width={24} height={24} />
        </View>
      )}
      <Text
        className={`text-[17px] text-center font-fraunces ${
          isSelected ? 'text-white' : 'text-[#3A3A3A]'
        }`}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
};
