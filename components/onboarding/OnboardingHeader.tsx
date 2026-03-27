import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import Svg, { Circle, G } from 'react-native-svg';
import QuoteIcon from '../../assets/images/svgicons/onboard_left.svg';

interface Props {
  progress: number;
  onSkip?: () => void;
}

const ProgressCircle = ({ progress = 0.5 }) => {
  const size = 36;
  const strokeWidth = 2.5;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference * (1 - progress);

  return (
    <View className="items-center justify-center">
      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="#EFEEEE"
          strokeWidth={strokeWidth}
          fill="none"
        />
        <G rotation="-90" origin={`${size / 2}, ${size / 2}`}>
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="#EA5A5A"
            strokeWidth={strokeWidth}
            fill="none"
            strokeDasharray={`${circumference} ${circumference}`}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
          />
        </G>
      </Svg>
    </View>
  );
};

export const OnboardingHeader = ({ progress, onSkip }: Props) => {
  return (
    <View>
      {/* Skip Button - Top Right */}
      <View className="px-6 flex-row justify-end mt-2">
        <TouchableOpacity activeOpacity={0.7} onPress={onSkip}>
          <Text className="text-[#A0A0A0] font-poppins text-[15px]">Skip</Text>
        </TouchableOpacity>
      </View>

      {/* Quote and Progress Row */}
      <View className="px-6 flex-row justify-between items-center mt-4">
        {/* Quote Icon - Left */}
        <View className="opacity-40">
          <QuoteIcon width={42} height={42} />
        </View>

        {/* Progress Circle - Right */}
        <ProgressCircle progress={progress} />
      </View>
    </View>
  );
};
