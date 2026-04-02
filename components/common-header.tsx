import React from 'react';
import { Text, View } from 'react-native';


type CommonHeaderProps = {
  eyebrow: string;
  title: string;
  actionLabel?: string;
  onActionPress?: () => void;
};

export function CommonHeader({
  eyebrow,
  title,
  actionLabel = 'Go Pro',
  onActionPress,
}: CommonHeaderProps) {
  return (
    <View className="flex-row items-center justify-between px-6 pt-3 pb-4 bg-[#F7F2EF]">
      <View>
        <Text className="text-[11px] leading-[14px] text-[#A49B90] font-poppins">
          {eyebrow}
        </Text>
        <Text
          className="text-[#3A3A3A] mt-[-7px]"
          style={{
            fontFamily: 'Mersin-Bold',
            fontSize: 32,
          }}
        >
          {title}
        </Text>
      </View>

      {/* <TouchableOpacity
        onPress={onActionPress}
        activeOpacity={0.85}
        className="flex-row items-center bg-[#3F3A37] rounded-full px-3.5 py-2 gap-1.5"
      >
        <GoProSvg width={18} height={18} />
        <Text className="text-white text-[11px] font-poppins-medium">{actionLabel}</Text>
      </TouchableOpacity> */}
    </View>
  );
}
