import { Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CommonHeader } from '@/components/common-header';

export default function ProfileTabScreen() {
  return (
    <SafeAreaView className="flex-1 bg-[#F7F2EF]">
      <CommonHeader eyebrow="Manage your" title="Profile" />

      <View className="flex-1 px-6 items-center justify-center">
        <Text className="text-[#8D857A] text-center font-poppins leading-6">
          Manage your account, saved palettes, and preferences here.
        </Text>
      </View>
    </SafeAreaView>
  );
}
