import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SvgProps } from 'react-native-svg';
import { Image } from 'expo-image';
import SelectedIcon from '../../assets/images/svgicons/selected.svg';

interface Props {
  label: string;
  isSelected: boolean;
  onPress: () => void;
  SvgImage: React.FC<SvgProps> | any;
  unselectedBg?: string;
  mb?: string;
  imageAspectRatio?: string;
  imagePadding?: string;
  stackedArtwork?: boolean;
  compact?: boolean;
}

export const ArtSelectionOption = ({
  label,
  isSelected,
  onPress,
  SvgImage,
  unselectedBg = 'bg-transparent',
  mb = 'mb-1',
  imageAspectRatio = 'aspect-square',
  imagePadding = 'p-0',
  stackedArtwork = false,
  compact = false,
}: Props) => {
  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityState={{ selected: isSelected }}
      onPress={onPress}
      activeOpacity={0.9}
      className={`items-center relative ${mb} ${compact ? 'w-[32%] rounded-[18px] p-1' : 'w-[47%] rounded-[24px] p-2'} ${isSelected ? 'bg-[#3A3A3A]' : unselectedBg}`}
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
        <View className={`absolute z-10 ${compact ? 'top-2 left-2' : 'top-3 left-3'}`}>
          <SelectedIcon width={compact ? 16 : 20} height={compact ? 16 : 20} />
        </View>
      )}

      {/* Image Container */}
      <View className={`w-full ${imageAspectRatio} ${imagePadding} rounded-[18px] overflow-hidden bg-transparent items-center justify-center`}>
        {stackedArtwork ? (
          <View style={styles.artworkStack}>
            <View style={[styles.artworkCard, styles.paperBacking]} />
            <View style={[styles.artworkCard, styles.artworkFace]}>
              <Image cachePolicy="memory" source={SvgImage} style={StyleSheet.absoluteFill} contentFit="cover" />
            </View>
          </View>
        ) : typeof SvgImage === 'function' ? (
          <SvgImage width="100%" height="100%" />
        ) : (
          <Image cachePolicy="memory" source={SvgImage} style={{ width: '100%', height: '100%' }} contentFit="contain" />
        )}
      </View>

      {/* Label */}
      <View className={compact ? 'mt-[-4px] mb-[4px]' : 'mt-[-10px] mb-[4px]'}>
        <Text
          className={`text-center font-fraunces ${compact ? 'text-[13px]' : 'text-[15px]'} ${isSelected ? 'text-white' : 'text-[#3A3A3A]'
            }`}
        >
          {label}
        </Text>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  artworkStack: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  artworkCard: {
    width: '60%',
    height: '75%',
    borderRadius: 14,
  },
  paperBacking: {
    position: 'absolute',
    backgroundColor: '#FFFFFF',
    transform: [{ rotate: '13deg' }],
    boxShadow: '2px 5px 8px rgba(58, 58, 58, 0.13)',
  },
  artworkFace: {
    overflow: 'hidden',
    backgroundColor: '#F4EFE9',
    zIndex: 1,
  },
});
