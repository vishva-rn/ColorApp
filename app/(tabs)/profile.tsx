import * as StoreReview from 'expo-store-review';
import React, { useState } from 'react';
import { Alert, Linking, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import FeedbackDialog from '@/components/dialog/feedback-dialog';
import { CommonHeader } from '@/components/common-header';
import { IconSymbol } from '@/components/ui/icon-symbol';

export default function ProfileTabScreen() {
  const [showFeedbackDialog, setShowFeedbackDialog] = useState(false);
  const eulaUrl = 'https://www.apple.com/legal/internet-services/itunes/dev/stdeula/';
  const privacyPolicyUrl = 'https://sites.google.com/view/pixelcolor-paint-game/home';

  const handleOpenEula = async () => {
    try {
      await Linking.openURL(eulaUrl);
    } catch (error) {
      console.error('[profile] eula-open:error', error);
      Alert.alert('Error', 'Could not open Terms of Service right now.');
    }
  };

  const handleRateAppPress = async () => {
    try {
      const hasAction = await StoreReview.hasAction();
      if (hasAction) {
        await StoreReview.requestReview();
      } else {
        Alert.alert('Unavailable', 'Rate app is not available on this device.');
      }
    } catch (error) {
      console.error('[profile] rate-app:error', error);
      Alert.alert('Error', 'Failed to open rate app.');
    }
  };

  const handleOpenPrivacyPolicy = async () => {
    try {
      await Linking.openURL(privacyPolicyUrl);
    } catch (error) {
      console.error('[profile] privacy-policy-open:error', error);
      Alert.alert('Error', 'Could not open Privacy Policy right now.');
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-[#F7F2EF]">
      <CommonHeader eyebrow="" title="Settings" />

      <View className="flex-1 px-6 pt-3">
        <View className="rounded-[18px] bg-white border border-[#EEE5DE] overflow-hidden">
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => setShowFeedbackDialog(true)}
            className="h-14 px-4 flex-row items-center justify-between"
          >
            <View className="flex-row items-center">
              <View className="w-9 h-9 rounded-full bg-[#F6EFEA] items-center justify-center mr-3">
                <IconSymbol name="message.fill" size={16} color="#5E4E42" />
              </View>
              <Text className="text-[#3A332E] text-[15px] font-poppins">Feedback</Text>
            </View>
            <IconSymbol name="chevron.right" size={16} color="#A0948A" />
          </TouchableOpacity>

          <View className="h-px bg-[#EFE7E1] ml-16" />

          <TouchableOpacity
            activeOpacity={0.85}
            onPress={handleRateAppPress}
            className="h-14 px-4 flex-row items-center justify-between"
          >
            <View className="flex-row items-center">
              <View className="w-9 h-9 rounded-full bg-[#F6EFEA] items-center justify-center mr-3">
                <IconSymbol name="star.fill" size={16} color="#5E4E42" />
              </View>
              <Text className="text-[#3A332E] text-[15px] font-poppins">Rate App</Text>
            </View>
            <IconSymbol name="chevron.right" size={16} color="#A0948A" />
          </TouchableOpacity>

          <View className="h-px bg-[#EFE7E1] ml-16" />

          <TouchableOpacity
            activeOpacity={0.85}
            onPress={handleOpenPrivacyPolicy}
            className="h-14 px-4 flex-row items-center justify-between"
          >
            <View className="flex-row items-center">
              <View className="w-9 h-9 rounded-full bg-[#F6EFEA] items-center justify-center mr-3">
                <IconSymbol name="shield.fill" size={16} color="#5E4E42" />
              </View>
              <Text className="text-[#3A332E] text-[15px] font-poppins">Privacy Policy</Text>
            </View>
            <IconSymbol name="chevron.right" size={16} color="#A0948A" />
          </TouchableOpacity>

          <View className="h-px bg-[#EFE7E1] ml-16" />

          <TouchableOpacity
            activeOpacity={0.85}
            onPress={handleOpenEula}
            className="h-14 px-4 flex-row items-center justify-between"
          >
            <View className="flex-row items-center">
              <View className="w-9 h-9 rounded-full bg-[#F6EFEA] items-center justify-center mr-3">
                <IconSymbol name="doc.text" size={16} color="#5E4E42" />
              </View>
              <Text className="text-[#3A332E] text-[15px] font-poppins">Terms of Service (EULA)</Text>
            </View>
            <IconSymbol name="chevron.right" size={16} color="#A0948A" />
          </TouchableOpacity>
        </View>
      </View>

      <FeedbackDialog
        visible={showFeedbackDialog}
        onClose={() => setShowFeedbackDialog(false)}
      />
    </SafeAreaView>
  );
}
