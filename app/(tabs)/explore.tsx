import { Image as ExpoImage } from 'expo-image';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CommonHeader } from '@/components/common-header';
import {
  DEFAULT_DISCOVER_CATEGORY,
  DISCOVER_ARTWORKS,
  DISCOVER_CATEGORIES,
  type DiscoverCategoryId,
} from '@/lib/discover-art-data';
import { convertImageToSvg } from '@/lib/image-to-svg';

const DISCOVER_GRID_GAP = 14;

export default function ArtsTabScreen() {
  const { width } = useWindowDimensions();
  const router = useRouter();
  const [selectedCategory, setSelectedCategory] = useState<DiscoverCategoryId>(DEFAULT_DISCOVER_CATEGORY);
  const [loadingArtworkUri, setLoadingArtworkUri] = useState<string | null>(null);

  const artworkCardWidth = (width - 48 - DISCOVER_GRID_GAP) / 2;
  const activeArtworks = DISCOVER_ARTWORKS[selectedCategory];

  const handleArtworkPress = async (artworkUri: string) => {
    if (loadingArtworkUri) {
      return;
    }

    try {
      setLoadingArtworkUri(artworkUri);
      const { svg_url,png_url } = await convertImageToSvg(artworkUri);

      router.push({
        pathname: '/drawing',
        params: {
          svgUrl: svg_url,
          png_url:png_url
        },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to open drawing right now.';
      Alert.alert('Image conversion failed', message);
    } finally {
      setLoadingArtworkUri(null);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-[#F7F2EF]">
      <CommonHeader eyebrow="Choose something to" title="Artwork" />

      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingTop: 12, paddingBottom: 40 }}
      >
        <View className="mb-10">
          <View className="mb-5">
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: 24 }}
            >
              {DISCOVER_CATEGORIES.map((category) => {
                const isSelected = selectedCategory === category.id;

                return (
                  <TouchableOpacity
                    key={category.id}
                    onPress={() => setSelectedCategory(category.id)}
                    activeOpacity={0.85}
                    className="mr-2 overflow-hidden"
                    style={{
                      minWidth: 74,
                      minHeight: 38,
                      justifyContent: 'center',
                      alignItems: 'center',
                    }}
                  >
                    {isSelected ? (
                      <View
                        style={{
                          minWidth: 74,
                          minHeight: 38,
                          paddingHorizontal: 12,
                          paddingVertical: 8,
                          justifyContent: 'center',
                          alignItems: 'center',
                          overflow: 'hidden',
                        }}
                      >
                        <Image
                          source={require('../../assets/images/canvas/category-select-bg.png')}
                          resizeMode="stretch"
                          style={{
                            position: 'absolute',
                            top: 0,
                            bottom: 0,
                            left: -8,
                            right: -8,
                            width: undefined,
                            height: undefined,
                          }}
                        />
                        <Text
                          style={{
                            color: '#6D685F',
                            fontFamily: 'Poppins-Medium',
                            fontSize: 14,
                            textAlign: 'center',
                          }}
                        >
                          {category.label}
                        </Text>
                      </View>
                    ) : (
                      <View
                        style={{
                          minWidth: 74,
                          minHeight: 38,
                          paddingHorizontal: 12,
                          paddingVertical: 8,
                          justifyContent: 'center',
                          alignItems: 'center',
                        }}
                      >
                        <Text
                          style={{
                            color: '#6D685F',
                            fontFamily: 'Poppins-Regular',
                            fontSize: 14,
                            textAlign: 'center',
                          }}
                        >
                          {category.label}
                        </Text>
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>

          <View className="px-6 flex-row flex-wrap justify-between">
            {activeArtworks.map((artwork, index) => (
              <TouchableOpacity
                key={artwork.id}
                onPress={() => handleArtworkPress(artwork.uri)}
                disabled={loadingArtworkUri !== null}
                activeOpacity={0.85}
                className="mb-4 rounded-[28px] overflow-hidden bg-white"
                style={{
                  width: artworkCardWidth,
                  height: artworkCardWidth * 1.02,
                  shadowColor: '#000000',
                  shadowOpacity: 0.06,
                  shadowOffset: { width: 0, height: 8 },
                  shadowRadius: 18,
                  elevation: 3,
                  marginRight: index % 2 === 0 ? DISCOVER_GRID_GAP : 0,
                }}
              >
                <ExpoImage
                  source={{ uri: artwork.uri }}
                  cachePolicy="memory-disk"
                  contentFit="cover"
                  transition={120}
                  style={{ width: '100%', height: '100%' }}
                />
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </ScrollView>

      {loadingArtworkUri ? (
        <View
          className="absolute inset-0 items-center justify-center"
          style={{ backgroundColor: 'rgba(58, 58, 58, 0.24)' }}
        >
          <View className="items-center rounded-[24px] bg-white px-6 py-5">
            <ActivityIndicator size="large" color="#F0626E" />
            <Text
              className="mt-3 text-center text-[#3A3A3A]"
              style={{
                fontFamily: 'Poppins-Medium',
                fontSize: 14,
              }}
            >
              Preparing your art...
            </Text>
          </View>
        </View>
      ) : null}
    </SafeAreaView>
  );
}
