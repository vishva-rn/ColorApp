import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import * as ImagePicker from 'expo-image-picker';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Keyboard,
  Modal,
  Pressable,
  Text,
  TextInput,
  View,
} from 'react-native';

import { sendFeedback } from '@/lib/feedback';
import { uploadMediaForFeedback } from '@/lib/upload-image';

type FeedbackDialogProps = {
  visible: boolean;
  onClose: () => void;
};

function countWords(text: string): number {
  return text
    .trim()
    .split(/\s+/)
    .filter((word) => word.length > 0).length;
}

export default function FeedbackDialog({ visible, onClose }: FeedbackDialogProps) {
  const [feedbackText, setFeedbackText] = useState('');
  const [selectedMediaUri, setSelectedMediaUri] = useState<string | null>(null);
  const [selectedMediaType, setSelectedMediaType] = useState<'image' | 'video' | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);

  useEffect(() => {
    if (!visible) {
      setFeedbackText('');
      setSelectedMediaUri(null);
      setSelectedMediaType(null);
      setIsSubmitting(false);
      setError(null);
    }
  }, [visible]);

  useEffect(() => {
    const showSub = Keyboard.addListener('keyboardDidShow', () => setIsKeyboardVisible(true));
    const hideSub = Keyboard.addListener('keyboardDidHide', () => setIsKeyboardVisible(false));
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  const handleBackdropPress = () => {
    if (isKeyboardVisible) {
      Keyboard.dismiss();
      return;
    }
    onClose();
  };

  const pickMedia = async () => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Permission needed', 'Allow photo library access to attach image or video.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images', 'videos'],
        allowsMultipleSelection: false,
        selectionLimit: 1,
        allowsEditing: false,
        quality: 0.9,
      });

      if (result.canceled || !result.assets?.[0]) return;
      const asset = result.assets[0];

      setSelectedMediaUri(asset.uri);
      setSelectedMediaType(asset.type === 'video' ? 'video' : 'image');
      setError(null);
    } catch (pickError) {
      console.error('[feedback] media-pick:error', pickError);
      setError('Failed to pick media. Please try again.');
    }
  };

  const removeMedia = () => {
    setSelectedMediaUri(null);
    setSelectedMediaType(null);
  };

  const handleSubmit = async () => {
    const trimmed = feedbackText.trim();
    if (countWords(trimmed) < 2 && !selectedMediaUri) {
      setError('Please enter at least 2 words or attach media.');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);
      const mediaUrl = selectedMediaUri
        ? await uploadMediaForFeedback(selectedMediaUri)
        : undefined;

      await sendFeedback(trimmed || 'Attachment only', 'anonymous@user.com', undefined, mediaUrl);
      Alert.alert('Thank you', 'Feedback sent successfully.');
      onClose();
    } catch (submitError) {
      const message = submitError instanceof Error ? submitError.message : 'Failed to send feedback.';
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <Pressable className="flex-1 bg-black/35 items-center justify-center px-6" onPress={handleBackdropPress}>
        <Pressable
          className="w-full max-w-[360px] rounded-[24px] bg-white px-5 pt-6 pb-4"
          onPress={(event) => event.stopPropagation()}
        >
          <Text className="text-center text-[#2E2A27] text-[24px] leading-[28px] font-poppins-semibold">
            Help us improve
          </Text>
          <Text className="text-center text-[#8B837B] text-[13px] leading-[18px] font-poppins mt-2 mb-4">
            Share your feedback to make PixelColor better.
          </Text>

          <TextInput
            value={feedbackText}
            onChangeText={(text) => {
              setFeedbackText(text);
              if (error && (countWords(text) >= 2 || selectedMediaUri)) setError(null);
            }}
            multiline
            placeholder="Write your feedback"
            placeholderTextColor="#B8AEA5"
            editable={!isSubmitting}
            style={{
              minHeight: 110,
              borderRadius: 16,
              borderWidth: 1,
              borderColor: '#EEE4DD',
              backgroundColor: '#FAF7F4',
              paddingHorizontal: 14,
              paddingVertical: 12,
              fontFamily: 'Poppins-Regular',
              fontSize: 14,
              color: '#3A332E',
              textAlignVertical: 'top',
            }}
          />

          <View className="mt-3">
            {selectedMediaUri ? (
              <View className="rounded-[14px] border border-[#EEE4DD] bg-[#FAF7F4] p-2">
                {selectedMediaType === 'image' ? (
                  <Image
                    source={{ uri: selectedMediaUri }}
                    style={{ width: '100%', height: 150, borderRadius: 10 }}
                    resizeMode="cover"
                  />
                ) : (
                  <View className="h-[88px] rounded-[10px] bg-[#EFE8E3] items-center justify-center px-3">
                    <MaterialIcons name="videocam" size={24} color="#5E544D" />
                    <Text className="text-[#5E544D] text-[12px] font-poppins mt-1">Video selected</Text>
                  </View>
                )}

                <Pressable
                  className="mt-2 self-end px-3 py-1.5 rounded-full bg-[#F0E6DF]"
                  onPress={removeMedia}
                  disabled={isSubmitting}
                >
                  <Text className="text-[#5E544D] text-[12px] font-poppins">Remove</Text>
                </Pressable>
              </View>
            ) : (
              <Pressable
                className="h-[43px] rounded-[50px] border border-[#EADFD8] items-center justify-center flex-row"
                onPress={pickMedia}
                disabled={isSubmitting}
              >
                <MaterialIcons name="photo-library" size={18} color="#5E544D" />
                <Text className="text-[#5E544D] text-[14px] font-poppins ml-2">Add Image or Video</Text>
              </Pressable>
            )}
          </View>

          {error ? (
            <Text className="text-[#E35656] text-[12px] mt-2 font-poppins">
              {error}
            </Text>
          ) : null}

          <View className="flex-row items-center mt-5 gap-3">
            <Pressable
              className="flex-1 h-[43px] rounded-[50px] border border-[#EADFD8] items-center justify-center"
              onPress={onClose}
              disabled={isSubmitting}
            >
              <Text className="text-[#5E544D] text-[15px] font-poppins">Cancel</Text>
            </Pressable>

            <Pressable
              className="flex-1 h-[43px] rounded-[50px] bg-[#3A3A3A] items-center justify-center"
              onPress={handleSubmit}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text className="text-white text-[15px] font-poppins">Send</Text>
              )}
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
