import { Image as ExpoImage } from 'expo-image';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { IconSymbol } from '@/components/ui/icon-symbol';
import { convertImageToSvg } from '@/lib/image-to-svg';
import { generateStyledColoringImage } from '@/lib/select-style';
import PromptGuideSvg from '../../assets/images/svgicons/prompt-guide.svg';

const heroImage = require('../../assets/images/create/text-to-draw.png');

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
        shadowColor: selected ? '#FB6F92' : '#D7C2B4',
        shadowOpacity: selected ? 0.18 : 0.08,
        shadowRadius: selected ? 10 : 6,
        shadowOffset: { width: 0, height: 4 },
        elevation: selected ? 4 : 1,
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

export default function TextToDrawScreen() {
  const router = useRouter();
  const [prompt, setPrompt] = useState(
    'A magical garden filled with flowers, butterflies, and small details.'
  );
  const [selectedStyle, setSelectedStyle] = useState<(typeof STYLE_OPTIONS)[number]['id']>('normal');
  const [selectedAspectRatio, setSelectedAspectRatio] =
    useState<(typeof ASPECT_RATIOS)[number]>('2:3');
  const [isGenerating, setIsGenerating] = useState(false);

  const selectedStyleOption = useMemo(
    () => STYLE_OPTIONS.find((style) => style.id === selectedStyle) ?? STYLE_OPTIONS[0],
    [selectedStyle]
  );

  const handleGenerate = async () => {
    const trimmedPrompt = prompt.trim();

    if (isGenerating) {
      console.log('[text-to-draw] generate:press-ignored', {
        reason: 'already-generating',
      });
      return;
    }

    if (!trimmedPrompt) {
      Alert.alert('Prompt required', 'Enter a prompt before generating.');
      return;
    }

    try {
      console.log('[text-to-draw] generate:request', {
        prompt: trimmedPrompt,
        style: selectedStyleOption.apiValue,
        aspectRatio: selectedAspectRatio,
      });

      setIsGenerating(true);
      const generated = await generateStyledColoringImage({
        prompt: trimmedPrompt,
        style: selectedStyleOption.apiValue,
        aspect_ratio: selectedAspectRatio,
      });

      let svgUrl = generated.svg_url?.trim() || '';
      let pngUrl = generated.png_url?.trim() || generated.image_url?.trim() || '';

      if (!svgUrl) {
        const imageUrl = generated.image_url?.trim();

        if (!imageUrl) {
          throw new Error('Select style response did not include an image URL to convert.');
        }

        console.log('[text-to-draw] generate:converting-image-to-svg', {
          imageUrl,
        });

        const converted = await convertImageToSvg(imageUrl);
        svgUrl = converted.svg_url;
        pngUrl = converted.png_url?.trim() || imageUrl;
      }

      console.log('[text-to-draw] generate:navigate-to-drawing', {
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
      console.error('[text-to-draw] generate:error', {
        prompt: trimmedPrompt,
        style: selectedStyleOption.apiValue,
        aspectRatio: selectedAspectRatio,
        error,
        message,
      });
      Alert.alert('Generation failed', message);
    } finally {
      console.log('[text-to-draw] generate:finished');
      setIsGenerating(false);
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
          <View
            className="rounded-[30px] px-6 py-4"

          >
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
          Text to Draw
        </Text>

        <View className="relative mb-5 rounded-[22px] bg-white px-4 py-4">
          <Text
            className="mb-2"
            style={{
              color: '#3A302B',
              fontFamily: 'Poppins-SemiBold',
              fontSize: 12,
            }}
          >
            Prompt *
          </Text>
          <TextInput
            value={prompt}
            onChangeText={setPrompt}
            multiline
            placeholder="Describe your drawing idea"
            placeholderTextColor="#B3A59C"
            textAlignVertical="top"
            style={{
              minHeight: 120,
              color: '#6C5E55',
              fontFamily: 'Poppins-Regular',
              fontSize: 12,
              lineHeight: 18,
              padding: 0,
              paddingRight: 44,
              paddingBottom: 16,
            }}
          />
          <View className="absolute bottom-4 right-4">
            <PromptGuideSvg width={20} height={20} />
          </View>
        </View>

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
          disabled={isGenerating}
          activeOpacity={0.9}
          onPress={handleGenerate}
          className="items-center justify-center rounded-full self-center"
          style={{
            width: '100%', height: 43,
            borderRadius: 50,
            paddingTop: 10,
            paddingRight: 16,
            paddingBottom: 10,
            paddingLeft: 16,
            backgroundColor: isGenerating ? '#756F6A' : '#3A3A3A',
          }}
        >
          {isGenerating ? (
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
                Generating...
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
