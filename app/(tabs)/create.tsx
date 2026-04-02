import { Link } from 'expo-router';
import { Image, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CommonHeader } from '@/components/common-header';

const textToDrawImage = require('../../assets/images/create/text-to-draw.png');
const photoToDrawImage = require('../../assets/images/create/photo-to-draw.png');

export default function CreateTabScreen() {
  return (
    <SafeAreaView className="flex-1 bg-[#F7F2EF]">
      <CommonHeader eyebrow="Art Playground" title="Create" />

      <View className="flex-1 px-6 pt-1">
        <Link href="/create/text-to-draw" asChild>
          <TouchableOpacity
            activeOpacity={0.9}
            className="bg-white rounded-[18px] px-5 pt-5 pb-0 mb-4 overflow-hidden"
          >
            <View className="min-h-[158px]">
              <Text className="text-[#3A3A3A] text-[22px] leading-[24px] font-poppins-medium mb-2">
                Text to Draw
              </Text>
              <Text className="text-[#9B9389] text-[12px] leading-[17px] font-poppins max-w-[80%]">
                Describe it and we&apos;ll draw it. Your words become a coloring page.
              </Text>

              <View className="absolute right-[-22px] bottom-0">
                <Image
                  source={textToDrawImage}
                  style={{ width: 184, height: 112 }}
                  resizeMode="contain"
                />
              </View>
            </View>
          </TouchableOpacity>
        </Link>

        <Link href="/create/photo-to-draw" asChild>
          <TouchableOpacity
            activeOpacity={0.9}
            className="bg-white rounded-[18px] px-5 pt-5 pb-0 overflow-hidden"
          >
            <View className="min-h-[158px]">
              <Text className="text-[#3A3A3A] text-[22px] leading-[24px] font-poppins-medium mb-2">
                Photo to Draw
              </Text>
              <Text className="text-[#9B9389] text-[12px] leading-[17px] font-poppins max-w-[80%]">
                Turn any photo into a custom coloring page in second
              </Text>

              <View className="absolute right-[-22px] bottom-0">
                <Image
                  source={photoToDrawImage}
                  style={{ width: 184, height: 112 }}
                  resizeMode="contain"
                />
              </View>
            </View>
          </TouchableOpacity>
        </Link>
      </View>
    </SafeAreaView>
  );
}
