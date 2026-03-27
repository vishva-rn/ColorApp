import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { SvgProps } from 'react-native-svg';
import SelectedIcon from '../../assets/images/svgicons/selected.svg';

interface Props {
  label: string;
  isSelected: boolean;
  onPress: () => void;
  SvgImage: React.FC<SvgProps>;
  unselectedBg?: string;
  mb?: string;
  imageAspectRatio?: string;
  imagePadding?: string;
}

export const ArtSelectionOption = ({ label, isSelected, onPress, SvgImage, unselectedBg = 'bg-transparent', mb = 'mb-1', imageAspectRatio = 'aspect-square', imagePadding = 'p-0' }: Props) => {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.9}
      className={`w-[47%] rounded-[24px] ${mb} p-2 items-center relative ${isSelected ? 'bg-[#3A3A3A]' : unselectedBg
        }`}
      style={isSelected || unselectedBg === 'bg-white' ? {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
        elevation: 2,
      } : {}}
    >
      {/* Top Left Selection Logo */}
      {isSelected && (
        <View className="absolute top-3 left-3 z-10">
          <SelectedIcon width={20} height={20} />
        </View>
      )}

      {/* SVG Image Container */}
      <View className={`w-full ${imageAspectRatio} ${imagePadding} rounded-[18px] overflow-hidden bg-transparent items-center justify-center`}>
        <SvgImage width="100%" height="100%" />
      </View>

      {/* Label */}
      <View className="mt-[-10px] mb-[4px]">
        <Text
          className={`text-[15px] text-center font-fraunces ${isSelected ? 'text-white' : 'text-[#3A3A3A]'
            }`}
        >
          {label}
        </Text>
      </View>
    </TouchableOpacity>
  );
};
