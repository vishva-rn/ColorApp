import { useEffect, useRef, useState } from 'react';
import { Image as ExpoImage } from 'expo-image';
import { useRouter } from 'expo-router';
import { ActivityIndicator, Alert, Image, ImageBackground, ScrollView, Text, TouchableOpacity, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CommonHeader } from '@/components/common-header';
import {
  DEFAULT_DISCOVER_CATEGORY,
  DISCOVER_ARTWORKS,
  DISCOVER_CATEGORIES,
  type DiscoverCategoryId,
  getArtworkUris,
} from '@/lib/discover-art-data';
import { convertImageToSvg } from '@/lib/image-to-svg';

const CARD_ASPECT_RATIO = 590 / 292;
const CARD_GAP = 12;
const DISCOVER_GRID_GAP = 14;

const PROMO_CARDS = [
  {
    id: 'pet-art',
    title: 'Photo to Drawing',
    price: 'Generate drawings from photos.',
    textAlign: 'center',
    image: require('../../assets/images/canvas/card-2.png'),
  },
  {
    id: 'pro-bird',
    title: 'Upgrade to Pro',
    price: '$466.99 / year',
    textAlign: 'left',
    image: require('../../assets/images/canvas/card-1.png'),
  },
  {
    id: 'kids-pack',
    title: 'Text to Drawing',
    price: 'Describe it and we’ll draw it.',
    textAlign: 'center',
    image: require('../../assets/images/canvas/card-3.png'),
  },
] as const;


export default function CanvasTabScreen() {
  const { width } = useWindowDimensions();
  const router = useRouter();
  const scrollRef = useRef<ScrollView | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<DiscoverCategoryId>(DEFAULT_DISCOVER_CATEGORY);
  const [loadingArtworkId, setLoadingArtworkId] = useState<string | null>(null);
  const cardWidth = Math.min(width - 132, 300);
  const cardHeight = Math.round(cardWidth / CARD_ASPECT_RATIO);
  const sidePeek = (width - cardWidth) / 2;
  const initialOffset = cardWidth + CARD_GAP;
  const artworkCardWidth = (width - 48 - DISCOVER_GRID_GAP) / 2;
  const selectedArtworks = DISCOVER_ARTWORKS[selectedCategory];

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      scrollRef.current?.scrollTo({ x: initialOffset, animated: false });
    });

    return () => cancelAnimationFrame(frame);
  }, [initialOffset]);

  useEffect(() => {
    void ExpoImage.prefetch(getArtworkUris(DEFAULT_DISCOVER_CATEGORY), 'memory-disk');

    const timeoutId = setTimeout(() => {
      const remainingUris = DISCOVER_CATEGORIES
        .filter((category) => category.id !== DEFAULT_DISCOVER_CATEGORY)
        .flatMap((category) => getArtworkUris(category.id));

      void ExpoImage.prefetch(remainingUris, 'disk');
    }, 0);

    return () => clearTimeout(timeoutId);
  }, []);

  const handleArtworkPress = async (artworkId: string, imageUrl: string) => {
    if (loadingArtworkId) {
      console.log('[canvas] artwork:press-ignored', {
        artworkId,
        imageUrl,
        loadingArtworkId,
      });
      return;
    }

    try {
      console.log('[canvas] artwork:press', {
        artworkId,
        imageUrl,
        selectedCategory,
      });

      setLoadingArtworkId(artworkId);
      const { svg_url } = await convertImageToSvg(imageUrl);

      console.log('[canvas] artwork:navigate-to-drawing', {
        artworkId,
        imageUrl,
        svgUrl: svg_url,
      });

      router.push({
        pathname: '/drawing',
        params: {
          svgUrl: svg_url,
        },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to open drawing right now.';
      console.error('[canvas] artwork:press-error', {
        artworkId,
        imageUrl,
        selectedCategory,
        error,
        message,
      });
      Alert.alert('Image conversion failed', message);
    } finally {
      console.log('[canvas] artwork:press-finished', {
        artworkId,
      });
      setLoadingArtworkId(null);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-[#F7F2EF]">
      <CommonHeader eyebrow="Your Creative" title="Canvas" />

      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingTop: 12, paddingBottom: 40 }}
      >
        <View className="mb-8">
          <ScrollView
            ref={scrollRef}
            horizontal
            showsHorizontalScrollIndicator={false}
            decelerationRate="fast"
            snapToInterval={cardWidth + CARD_GAP}
            snapToAlignment="start"
            disableIntervalMomentum
            contentContainerStyle={{
              paddingHorizontal: sidePeek,
              alignItems: 'center',
            }}
          >
            {PROMO_CARDS.map((card, index) => (
              <ImageBackground
                key={card.id}
                source={card.image}
                resizeMode="cover"
                imageStyle={{ borderRadius: 24 }}
                className="overflow-hidden"
                style={{
                  width: cardWidth,
                  height: cardHeight,
                  marginRight: index === PROMO_CARDS.length - 1 ? 0 : CARD_GAP,
                }}
              >
                <View
                  className="flex-1 justify-start px-4 pt-5"
                  style={{
                    alignItems: card.textAlign === 'center' ? 'center' : 'flex-start',
                  }}
                >
                  <View
                    style={{
                      width: '100%',
                      alignItems: card.textAlign === 'center' ? 'center' : 'flex-start',
                    }}
                  >
                    <Text
                      className="text-[13px] leading-[18px] font-poppins-semibold"
                      style={{
                        color: '#3A3A3A',
                        fontFamily: 'Mersin-Bold',
                        fontSize: 16,
                        lineHeight: 16,
                        letterSpacing: 0.2,
                        textAlign: card.textAlign,
                      }}
                    >
                      {card.title}
                    </Text>
                    <Text
                      className="mt-1 text-[#3A3A3A]"
                      style={{
                        fontFamily: 'Poppins-Regular',
                        fontSize: 12,
                        letterSpacing: 0.2,
                        textAlign: card.textAlign,
                      }}
                    >
                      {card.price}
                    </Text>
                  </View>
                </View>
              </ImageBackground>
            ))}
          </ScrollView>
        </View>

        <View className="mb-10">
          <Text
            className="mb-2 px-6"
            style={{
              color: '#3A3A3A',
              fontFamily: 'Mersin-Bold',
              fontSize: 28,

            }}
          >
            Discover Art
          </Text>

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
            {selectedArtworks.map((artwork, index) => (
              <TouchableOpacity
                key={artwork.id}
                onPress={() => handleArtworkPress(artwork.id, artwork.uri)}
                disabled={loadingArtworkId !== null}
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

      {loadingArtworkId ? (
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
              Preparing your drawing...
            </Text>
          </View>
        </View>
      ) : null}
    </SafeAreaView>
  );
}
