import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Image as ExpoImage } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { IconSymbol } from '@/components/ui/icon-symbol';
import { generateImageToDraw } from '@/lib/image-to-draw';
import { convertImageToSvg } from '@/lib/image-to-svg';
import { uploadImageForDrawing } from '@/lib/upload-image';

const heroImage = require('../../assets/images/create/photo-to-draw.png');

const STYLE_OPTIONS = [
  {
    id: 'normal',
    label: 'Normal',
    apiValue: 'normal',
    imageUrl: 'https://apps-assets.infinitycorp.tech/public/colorapp/Style/Normal-be3b16da.webp',
  },
  {
    id: 'manga',
    label: 'Manga',
    apiValue: 'manga',
    imageUrl: 'https://apps-assets.infinitycorp.tech/public/colorapp/Style/Manga-619a18a6.webp',
  },
  {
    id: 'mandala',
    label: 'Mandala',
    apiValue: 'mandala',
    imageUrl: 'https://apps-assets.infinitycorp.tech/public/colorapp/Style/Mandala-e3d32475.webp',
  },
  {
    id: 'comics',
    label: 'Comics',
    apiValue: 'comics',
    imageUrl: 'https://apps-assets.infinitycorp.tech/public/colorapp/Style/Comics-0a15cd51.webp',
  },
  {
    id: 'pop-art',
    label: 'Pop Art',
    apiValue: 'pop art',
    imageUrl: 'https://apps-assets.infinitycorp.tech/public/colorapp/Style/Pop-Art-955e751e.webp',
  },
  {
    id: '3d-movie',
    label: '3D Movie',
    apiValue: '3d movie',
    imageUrl: 'https://apps-assets.infinitycorp.tech/public/colorapp/Style/3D-Movie-1e475a18.webp',
  },
  {
    id: 'belgium-bd',
    label: 'Belgium BD',
    apiValue: 'belgium bd',
    imageUrl: 'https://apps-assets.infinitycorp.tech/public/colorapp/Style/Belgium-BD-3a74af97.webp',
  },
] as const;

const ASPECT_RATIOS = ['1:1', '2:3', '9:16', '16:9'] as const;

function StyleCard({
  imageUrl,
  label,
  selected,
  onPress,
}: {
  imageUrl: string;
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      activeOpacity={0.88}
      onPress={onPress}
      className="mr-3 overflow-hidden rounded-[16px] border bg-white"
      style={{
        width: 74,
        borderColor: selected ? '#FB6F92' : '#F1E5DC',
        borderWidth: selected ? 1.5 : 1,
      }}
    >
      <View className="p-1.5 pb-1">
        <View className="overflow-hidden rounded-[12px] bg-[#F6EFEA]">
          <ExpoImage
            source={{ uri: imageUrl }}
            style={{ width: '100%', height: 56 }}
            contentFit="cover"
          />
        </View>
      </View>

      <Text
        className="px-1 pb-2 text-center text-[10px] leading-[12px]"
        style={{
          color: selected ? '#FB6F92' : '#5B4C42',
          fontFamily: selected ? 'Poppins-SemiBold' : 'Poppins-Medium',
        }}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}

export default function PhotoToDrawScreen() {
  const router = useRouter();
  const [selectedStyle, setSelectedStyle] = useState<(typeof STYLE_OPTIONS)[number]['id']>('normal');
  const [selectedAspectRatio, setSelectedAspectRatio] =
    useState<(typeof ASPECT_RATIOS)[number]>('2:3');
  const [selectedImageUri, setSelectedImageUri] = useState<string | null>(null);
  const [uploadedImageUrl, setUploadedImageUrl] = useState<string | null>(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  const selectedStyleOption = useMemo(
    () => STYLE_OPTIONS.find((style) => style.id === selectedStyle) ?? STYLE_OPTIONS[0],
    [selectedStyle]
  );

  const handlePickImage = async () => {
    if (isUploadingImage || isGenerating) return;

    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) {
      Alert.alert('Permission needed', 'Allow photo access to upload an image.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: false,
      selectionLimit: 1,
      allowsEditing: false,
      quality: 1,
    });

    if (result.canceled || !result.assets?.[0]?.uri) return;

    const uri = result.assets[0].uri;
    setSelectedImageUri(uri);
    setUploadedImageUrl(null);

    console.log('[photo-to-draw] image:selected', {
      localUri: uri,
    });
  };

  const ensureUploadedImageUrl = async () => {
    if (uploadedImageUrl?.trim()) return uploadedImageUrl;

    if (!selectedImageUri?.trim()) {
      throw new Error('Please select an image first.');
    }

    setIsUploadingImage(true);

    try {
      console.log('[photo-to-draw] upload:request', {
        localUri: selectedImageUri,
      });

      const url = await uploadImageForDrawing(selectedImageUri);
      setUploadedImageUrl(url);

      console.log('[photo-to-draw] upload:success', {
        uploadedUrl: url,
      });

      return url;
    } finally {
      setIsUploadingImage(false);
    }
  };

  const handleGenerate = async () => {
    if (isGenerating) return;

    if (!selectedImageUri?.trim()) {
      Alert.alert('Image required', 'Upload an image before generating.');
      return;
    }

    try {
      setIsGenerating(true);
      const imageUrl = await ensureUploadedImageUrl();

      console.log('[photo-to-draw] generate:request', {
        imageUrl,
        style: selectedStyleOption.apiValue,
        aspectRatio: selectedAspectRatio,
      });

      const generated = await generateImageToDraw({
        image_url: imageUrl,
        style: selectedStyleOption.apiValue,
        aspect_ratio: selectedAspectRatio,
      });

      let svgUrl = generated.svg_url?.trim() || '';
      let pngUrl = generated.png_url?.trim() || generated.image_url?.trim() || '';

      if (!svgUrl) {
        const generatedImageUrl = generated.image_url?.trim();

        if (!generatedImageUrl) {
          throw new Error('Image to draw response did not include an image URL to convert.');
        }

        console.log('[photo-to-draw] generate:converting-image-to-svg', {
          imageUrl: generatedImageUrl,
        });

        const converted = await convertImageToSvg(generatedImageUrl);
        svgUrl = converted.svg_url;
        pngUrl = converted.png_url?.trim() || generatedImageUrl;
      }

      console.log('[photo-to-draw] generate:navigate-to-drawing', {
        svgUrl,
      });

      router.push({
        pathname: '/drawing',
        params: {
          svgUrl,
          png_url: pngUrl,
        },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to generate drawing right now.';
      console.error('[photo-to-draw] generate:error', {
        error,
        message,
      });
      Alert.alert('Generation failed', message);
    } finally {
      setIsGenerating(false);
      console.log('[photo-to-draw] generate:finished');
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-[#F7F2EF]" edges={['top']}>
      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 10, paddingBottom: 24 }}
      >
        <View className="mb-6 flex-row items-center justify-between">
          <TouchableOpacity
            onPress={() => router.back()}
            activeOpacity={0.85}
            className="h-10 w-10 items-center justify-center rounded-full bg-[#2F2D2B]"
          >
            <IconSymbol name="chevron.left" size={18} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        <View className="mb-[-10] items-center">
          <View className="rounded-[30px] px-6 py-4">
            <ExpoImage source={heroImage} style={{ width: 230, height: 180 }} contentFit="contain" />
          </View>
        </View>

        <Text
          className="mb-7 text-center"
          style={{
            color: '#1F1C1A',
            fontFamily: 'Mersin-Bold',
            fontSize: 24,
            lineHeight: 28,
          }}
        >
          Photo to Draw
        </Text>

        <View className="mb-2">
          <Text
            style={{
              color: '#3A302B',
              fontFamily: 'Poppins-SemiBold',
              fontSize: 12,
            }}
          >
            Upload Image
          </Text>
        </View>

        <TouchableOpacity
          activeOpacity={0.9}
          onPress={handlePickImage}
          className="mb-5 items-center justify-center overflow-hidden rounded-[16px] bg-white"
          style={{
            minHeight: 172,
            borderWidth: 1,
            borderColor: '#F0DED4',
          }}
        >
          {selectedImageUri ? (
            <View className="w-full items-center" style={{ height: 172 }}>
              <View
                className="w-full overflow-hidden rounded-[12px]"
                style={{ height: 172, backgroundColor: '#EDE2DA' }}
              >
                <ExpoImage
                  source={{ uri: selectedImageUri }}
                  style={{ width: '100%', height: '100%' }}
                  contentFit="cover"
                  blurRadius={14}
                />
                <View
                  className="absolute left-0 right-0 top-0 bottom-0"
                  style={{ backgroundColor: 'rgba(46, 39, 34, 0.12)' }}
                />
                <View className="absolute left-0 right-0 top-0 bottom-0 items-center justify-center px-2 py-2">
                  <ExpoImage
                    source={{ uri: selectedImageUri }}
                    style={{ width: '100%', height: '100%' }}
                    contentFit="contain"
                  />
                </View>
              </View>
            </View>
          ) : (
            <View className="items-center">
              <MaterialIcons name="file-upload" size={18} color="#6D5E56" />
              <Text
                className="mt-1"
                style={{
                  color: '#6D5E56',
                  fontFamily: 'Poppins-Medium',
                  fontSize: 11,
                }}
              >
                Upload
              </Text>
            </View>
          )}
        </TouchableOpacity>

        <View className="mb-3 flex-row items-center justify-between">
          <Text
            style={{
              color: '#3A302B',
              fontFamily: 'Poppins-SemiBold',
              fontSize: 12,
            }}
          >
            Select Style
          </Text>
          <Text
            style={{
              color: '#A89184',
              fontFamily: 'Poppins-Medium',
              fontSize: 11,
            }}
          >
            7 styles
          </Text>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingRight: 8 }}
          className="mb-5"
        >
          {STYLE_OPTIONS.map((style) => (
            <StyleCard
              key={style.id}
              imageUrl={style.imageUrl}
              label={style.label}
              selected={style.id === selectedStyle}
              onPress={() => setSelectedStyle(style.id)}
            />
          ))}
        </ScrollView>

        <Text
          className="mb-3"
          style={{
            color: '#3A302B',
            fontFamily: 'Poppins-SemiBold',
            fontSize: 12,
          }}
        >
          Aspect Ratio
        </Text>

        <View className="mb-7 flex-row flex-wrap gap-2">
          {ASPECT_RATIOS.map((ratio) => {
            const isSelected = ratio === selectedAspectRatio;

            return (
              <TouchableOpacity
                key={ratio}
                activeOpacity={0.85}
                onPress={() => setSelectedAspectRatio(ratio)}
                className="min-w-[62px] border px-4 py-2"
                style={{
                  borderRadius: 7,
                  backgroundColor: isSelected ? '#FFF0F4' : '#FFFFFF',
                  borderColor: isSelected ? '#FB6F92' : '#F0DED4',
                }}
              >
                <Text
                  className="text-center"
                  style={{
                    color: isSelected ? '#FB6F92' : '#8B7B72',
                    fontFamily: isSelected ? 'Poppins-SemiBold' : 'Poppins-Medium',
                    fontSize: 11,
                  }}
                >
                  {ratio}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>

      <SafeAreaView
        edges={['bottom']}
        className="bg-[#F7F2EF] px-5 pb-4 pt-3"
        style={{
          borderTopWidth: 1,
          borderTopColor: '#EADCD2',
        }}
      >
        <TouchableOpacity
          disabled={isGenerating || isUploadingImage}
          activeOpacity={0.9}
          onPress={handleGenerate}
          className="items-center justify-center rounded-full self-center"
          style={{
            width: 335,
            height: 43,
            borderRadius: 50,
            paddingTop: 10,
            paddingRight: 16,
            paddingBottom: 10,
            paddingLeft: 16,
            backgroundColor: isGenerating || isUploadingImage ? '#756F6A' : '#3A3A3A',
          }}
        >
          {isGenerating || isUploadingImage ? (
            <View className="flex-row items-center" style={{ gap: 7 }}>
              <ActivityIndicator size="small" color="#FFFFFF" />
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
                {isUploadingImage ? 'Uploading...' : 'Generating...'}
              </Text>
            </View>
          ) : (
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
          )}
        </TouchableOpacity>
      </SafeAreaView>
    </SafeAreaView>
  );
}
