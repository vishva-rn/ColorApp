import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import * as MediaLibrary from 'expo-media-library';
import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, Image, Modal, Pressable, ScrollView, Share, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CommonHeader } from '@/components/common-header';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { getDrawingHistory, removeDrawingHistoryItem, type DrawingHistoryItem } from '@/lib/drawing-history';
import DeleteIcon from '../../assets/images/history/delete.svg';
import DownloadIcon from '../../assets/images/history/download.svg';
import RedrawIcon from '../../assets/images/history/redraw.svg';
import ShareIcon from '../../assets/images/history/share.svg';

export default function HistoryTabScreen() {
  const router = useRouter();
  const fallbackPreviewImage = require('../../images/image copy.png');
  const [history, setHistory] = useState<DrawingHistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isPreviewVisible, setIsPreviewVisible] = useState(false);
  const [isDeleteConfirmVisible, setIsDeleteConfirmVisible] = useState(false);
  const [isRestartConfirmVisible, setIsRestartConfirmVisible] = useState(false);
  const [selectedItem, setSelectedItem] = useState<DrawingHistoryItem | null>(null);

  const loadHistory = useCallback(async () => {
    try {
      const items = await getDrawingHistory();
      setHistory(items);
    } catch (error) {
      console.error('[history] load:error', error);
      setHistory([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadHistory();
    }, [loadHistory]),
  );

  const hasHistory = history.length > 0;
  const openPreview = (item: DrawingHistoryItem) => {
    setSelectedItem(item);
    setIsDeleteConfirmVisible(false);
    setIsRestartConfirmVisible(false);
    setIsPreviewVisible(true);
  };
  const previewSource = selectedItem?.imageUri ? { uri: selectedItem.imageUri } : fallbackPreviewImage;

  const handleShare = async () => {
    if (!selectedItem?.imageUri) return;
    try {
      await Share.share({ url: selectedItem.imageUri, message: selectedItem.imageUri });
    } catch (error) {
      console.error('[history] share:error', error);
    }
  };

  const handleDelete = async () => {
    if (!selectedItem) return;
    try {
      await removeDrawingHistoryItem(selectedItem.id);
      setHistory((previous) => previous.filter((item) => item.id !== selectedItem.id));
      setIsDeleteConfirmVisible(false);
      setIsPreviewVisible(false);
      setSelectedItem(null);
    } catch (error) {
      console.error('[history] delete:error', error);
      Alert.alert('Error', 'Could not delete this history item.');
    }
  };

  const handleDownload = async () => {
    if (!selectedItem?.imageUri) return;

    try {
      const permission = await MediaLibrary.requestPermissionsAsync();
      if (permission.status !== 'granted') {
        Alert.alert('Permission required', 'Please allow photo access to save to gallery.');
        return;
      }

      await MediaLibrary.saveToLibraryAsync(selectedItem.imageUri);
      Alert.alert('Saved', 'Image saved to gallery.');
    } catch (error) {
      console.error('[history] download:error', error);
      Alert.alert('Error', 'Could not save image to gallery.');
    }
  };

  const openDeleteConfirmModal = () => {
    setIsRestartConfirmVisible(false);
    setIsDeleteConfirmVisible(true);
  };

  const openRestartConfirmModal = () => {
    setIsDeleteConfirmVisible(false);
    setIsRestartConfirmVisible(true);
  };

  const handleRestart = () => {
    if (!selectedItem?.svgUrl) {
      Alert.alert('Unavailable', 'Original artwork data is missing for this history item.');
      return;
    }

    setIsRestartConfirmVisible(false);
    setIsPreviewVisible(false);
    router.push({
      pathname: '/drawing',
      params: {
        svgUrl: selectedItem.svgUrl,
        png_url: selectedItem.pngUrl ?? selectedItem.imageUri,
      },
    });
  };

  const handleContinueToDrawing = () => {
    if (!selectedItem) return;

    setIsDeleteConfirmVisible(false);
    setIsRestartConfirmVisible(false);
    setIsPreviewVisible(false);
    router.push({
      pathname: '/drawing',
      params: {
        historyItemId: selectedItem.id,
        svgUrl: selectedItem.svgUrl ?? '',
        png_url: selectedItem.pngUrl ?? selectedItem.imageUri,
      },
    });
  };

  return (
    <SafeAreaView className="flex-1 bg-[#F7F2EF]">
      <CommonHeader eyebrow="Your Art" title="History" />

      {isLoading ? (
        <View className="flex-1 px-6 items-center justify-center">
          <ActivityIndicator size="small" color="#7A5B45" />
        </View>
      ) : hasHistory ? (
        <ScrollView
          className="flex-1"
          contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 8, paddingBottom: 120 }}
          showsVerticalScrollIndicator={false}
        >
          <View className="flex-row flex-wrap justify-between">
            {history.map((item) => (
              <Pressable
                key={item.id}
                onPress={() => openPreview(item)}
                className="mb-4 rounded-2xl overflow-hidden border border-[#E8DED7] bg-white"
                style={{ width: '48%', height: 190 }}
              >
                <View className="flex-1 p-2">
                  <Image
                    source={{ uri: item.imageUri }}
                    style={{ width: '100%', height: '100%' }}
                    resizeMode="contain"
                  />
                </View>
              </Pressable>
            ))}
          </View>
        </ScrollView>
      ) : (
        <View className="flex-1 px-6 items-center justify-center">
          <Text className="text-[#8D857A] text-center font-poppins leading-6">
            Your recent coloring sessions will appear here.
          </Text>
        </View>
      )}

      <Modal visible={isPreviewVisible} transparent animationType="fade" onRequestClose={() => setIsPreviewVisible(false)}>
        <View className="flex-1 justify-end">
          <Pressable
            className="absolute top-0 left-0 right-0 bottom-0 bg-black/55"
            onPress={() => {
              setIsDeleteConfirmVisible(false);
              setIsRestartConfirmVisible(false);
              setIsPreviewVisible(false);
            }}
          />
          <Pressable
            className="w-full rounded-t-3xl bg-[#ECEAEA] px-4 pt-4 pb-3"
            onPress={(event) => event.stopPropagation()}
          >
            <View className="flex-row items-center justify-between px-1 mb-3">
              <Pressable className="w-8 h-8 items-center justify-center" onPress={() => setIsPreviewVisible(false)}>
                <IconSymbol name="xmark" size={20} color="#444444" />
              </Pressable>

              <View className="flex-row items-center gap-3">
                <Pressable className="w-8 h-8 items-center justify-center" onPress={handleShare}>
                  <ShareIcon width={19} height={19} />
                </Pressable>
                <Pressable className="w-8 h-8 items-center justify-center" onPress={openRestartConfirmModal}>
                  <RedrawIcon width={19} height={19} />
                </Pressable>
                <Pressable className="w-8 h-8 items-center justify-center" onPress={handleDownload}>
                  <DownloadIcon width={19} height={19} />
                </Pressable>
                <Pressable className="w-8 h-8 items-center justify-center" onPress={openDeleteConfirmModal}>
                  <DeleteIcon width={19} height={19} />
                </Pressable>
              </View>
            </View>

            <View className="w-full rounded-2xl  bg-white mb-4" style={{ height: 355 }}>
              <Image source={previewSource} className="w-full h-full rounded-xl" resizeMode="contain" />
            </View>

            <Pressable
              onPress={handleContinueToDrawing}
              className="mt-3 mb-3 h-12 rounded-full bg-[#3A3A3A] items-center justify-center"
            >
              <Text
                style={{
                  color: '#FFFFFF',
                  fontFamily: 'Poppins-Regular',
                  fontSize: 15,
                  fontWeight: '400',
                  lineHeight: 15,
                  letterSpacing: 0.2,
                  textAlign: 'center',
                }}
              >
                Continue
              </Text>
            </Pressable>
          </Pressable>
          {isDeleteConfirmVisible && (
            <Pressable
              className="absolute top-0 left-0 right-0 bottom-0 bg-black/45 justify-end"
              onPress={() => setIsDeleteConfirmVisible(false)}
            >
              <Pressable
                className="mx-4 mb-4 rounded-[22px] bg-[#F6EBEA] px-4 pt-4 pb-3"
                onPress={(event) => event.stopPropagation()}
              >
                <View className="flex-row items-center justify-end">
                  <Pressable className="w-7 h-7 items-center justify-center" onPress={() => setIsDeleteConfirmVisible(false)}>
                    <IconSymbol name="xmark" size={17} color="#6A5E58" />
                  </Pressable>
                </View>

                <Text
                  className="text-center"
                  style={{ color: '#2D2927', fontFamily: 'Poppins-SemiBold', fontSize: 30 }}
                >
                  Delete this artwork?
                </Text>

                <Text
                  className="text-center mt-3 mb-4"
                  style={{ color: '#8D817C', fontFamily: 'Poppins-Regular', fontSize: 14, lineHeight: 20 }}
                >
                  This will permanently remove your coloring progress.
                </Text>

                <Pressable
                  className="h-[43px] rounded-[50px] items-center justify-center"
                  style={{ backgroundColor: '#FC6F6F' }}
                  onPress={handleDelete}
                >
                  <Text
                    style={{
                      color: '#FFFFFF',
                      fontFamily: 'Poppins-Regular',
                      fontSize: 15,
                      fontWeight: '400',
                      lineHeight: 15,
                      letterSpacing: 0.2,
                      textAlign: 'center',
                    }}
                  >
                    Delete
                  </Text>
                </Pressable>
              </Pressable>
            </Pressable>
          )}
          {isRestartConfirmVisible && (
            <Pressable
              className="absolute top-0 left-0 right-0 bottom-0 bg-black/45 justify-end"
              onPress={() => setIsRestartConfirmVisible(false)}
            >
              <Pressable
                className="mx-4 mb-4 rounded-[22px] bg-[#F3EFEE] px-4 pt-4 pb-3"
                onPress={(event) => event.stopPropagation()}
              >
                <View className="flex-row items-center justify-end">
                  <Pressable className="w-7 h-7 items-center justify-center" onPress={() => setIsRestartConfirmVisible(false)}>
                    <IconSymbol name="xmark" size={17} color="#6A5E58" />
                  </Pressable>
                </View>

                <Text
                  className="text-center"
                  style={{ color: '#2D2927', fontFamily: 'Poppins-SemiBold', fontSize: 30 }}
                >
                  Start over?
                </Text>

                <Text
                  className="text-center mt-3 mb-4"
                  style={{ color: '#8D817C', fontFamily: 'Poppins-Regular', fontSize: 14, lineHeight: 20 }}
                >
                  All colors will be removed and you&apos;ll begin from scratch.
                </Text>

                <Pressable
                  className="h-[43px] rounded-[50px] items-center justify-center"
                  style={{ backgroundColor: '#3A3A3A' }}
                  onPress={handleRestart}
                >
                  <Text
                    style={{
                      color: '#FFFFFF',
                      fontFamily: 'Poppins-Regular',
                      fontSize: 15,
                      fontWeight: '400',
                      lineHeight: 15,
                      letterSpacing: 0.2,
                      textAlign: 'center',
                    }}
                  >
                    Restart
                  </Text>
                </Pressable>
              </Pressable>
            </Pressable>
          )}
        </View>
      </Modal>
    </SafeAreaView>
  );
}
