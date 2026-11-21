import { useRef, useState } from 'react';
import {
  ActivityIndicator, Linking, Platform, Pressable, ScrollView, Share, StyleSheet, Text, View,
  useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import { Image } from 'expo-image';
import * as MediaLibrary from 'expo-media-library';
import Animated, { FadeIn, FadeInUp, useReducedMotion } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { captureRef, releaseCapture } from 'react-native-view-shot';

import type { NumberArt } from '@/lib/number-art';
import Artwork from './Artwork';

const actions = [
  { label: 'Save', icon: 'download-outline' },
  { label: 'Share', icon: 'share-social-outline' },
  { label: 'Invite', icon: 'person-add-outline' },
] as const;
type Action = (typeof actions)[number]['label'];
const STREAK_MILESTONE = 7;

function inviteMessage() {
  const config = Constants.expoConfig;
  const links = [
    config?.ios?.appStoreUrl && `iPhone · ${config.ios.appStoreUrl}`,
    config?.android?.playStoreUrl && `Android · ${config.android.playStoreUrl}`,
  ].filter(Boolean);
  return ['Ready to relax? Come color with me in PixelColor! 🎨', ...links].join('\n');
}

export default function DrawingComplete({ art, filled, earnedStreak, onBack, onRetryProgress }: {
  art: NumberArt;
  filled: string[];
  earnedStreak?: number;
  onBack: () => void;
  onRetryProgress?: () => void;
}) {
  const { width, height } = useWindowDimensions();
  const imageSize = Math.min(width - 44, height * (earnedStreak ? 0.45 : 0.53), 540);
  const reduceMotion = useReducedMotion();
  const artwork = useRef<View>(null);
  const actionInFlight = useRef(false);
  const [busy, setBusy] = useState<Action>();
  const [status, setStatus] = useState('');
  const [laidOut, setLaidOut] = useState(false);
  const [settledOutline, setSettledOutline] = useState<string>();
  const ready = laidOut && (!art.outline || settledOutline === art.outline.uri);
  const filename = `pixelcolor-${art.id.replace(/[^a-zA-Z0-9_-]/g, '-')}.png`;

  async function perform(action: Action) {
    if (actionInFlight.current || (action !== 'Invite' && !ready)) return;
    actionInFlight.current = true;
    setBusy(action);
    setStatus('');
    let imageUri: string | undefined;

    try {
      if (action === 'Invite') {
        const message = inviteMessage();
        if (Platform.OS === 'web') {
          if (navigator.share) await navigator.share({ text: message });
          else {
            await navigator.clipboard.writeText(message);
            setStatus('Invitation copied.');
          }
        } else {
          await Share.share({ message });
        }
        return;
      }
      if (!artwork.current) return;
      const modernAndroid = Platform.OS === 'android' && Number(Platform.Version) >= 30;
      if (action === 'Save' && Platform.OS !== 'web' && !modernAndroid) {
        const permission = await MediaLibrary.requestPermissionsAsync(true);
        if (!permission.granted) {
          setStatus(permission.canAskAgain ? 'Allow photo access to save your artwork.' : 'Enable photo access in Settings to save your artwork.');
          return;
        }
      }

      imageUri = await captureRef(artwork.current, { format: 'png', result: Platform.OS === 'web' ? 'data-uri' : 'tmpfile' });
      if (Platform.OS === 'web') {
        if (action === 'Share' && navigator.canShare) {
          const blob = await (await fetch(imageUri)).blob();
          const file = new File([blob], filename, { type: 'image/png' });
          if (navigator.canShare({ files: [file] })) {
            await navigator.share({ files: [file] });
            return;
          }
        }
        const download = document.createElement('a');
        download.href = imageUri;
        download.download = filename;
        download.click();
        setStatus(action === 'Share' ? 'Artwork downloaded so you can share it.' : 'Artwork downloaded.');
      } else if (action === 'Save') {
        if (modernAndroid) {
          const { Asset } = await import('expo-media-library/next');
          await Asset.create(imageUri);
        } else {
          await MediaLibrary.saveToLibraryAsync(imageUri);
        }
        setStatus('Saved to your photos.');
      } else {
        const sharing = await import('expo-sharing');
        if (await sharing.isAvailableAsync()) {
          await sharing.shareAsync(imageUri, { mimeType: 'image/png', UTI: 'public.png', dialogTitle: 'Share your artwork' });
        } else {
          setStatus('Sharing is unavailable on this device. You can save the image to your photos.');
        }
      }
    } catch (error) {
      if (!(error instanceof Error && error.name === 'AbortError')) {
        setStatus(action === 'Invite' ? 'Couldn’t share your invitation. Try again.' : `Couldn’t ${action.toLowerCase()} your artwork. Try again.`);
      }
    } finally {
      // The share recipient can access the file after the chooser closes.
      if (action === 'Save' && imageUri && Platform.OS !== 'web') releaseCapture(imageUri);
      actionInFlight.current = false;
      setBusy(undefined);
    }
  }

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.header}>
        <Pressable accessibilityRole="button" accessibilityLabel="Back to gallery" onPress={onBack} style={styles.back}>
          <Ionicons name="chevron-back" size={24} color="#292725" />
        </Pressable>
      </View>
      <ScrollView style={styles.body} contentContainerStyle={styles.center} showsVerticalScrollIndicator={false}>
        <Animated.View entering={reduceMotion ? undefined : FadeIn.duration(320)}>
          <Text accessibilityRole="header" style={styles.title}>{earnedStreak ? 'Daily Challenge complete!' : 'Beautifully done!'}</Text>
        </Animated.View>
        <Animated.View entering={reduceMotion ? undefined : FadeInUp.duration(440)} style={styles.frame}>
          <View
            ref={artwork}
            collapsable={false}
            accessibilityRole="image"
            accessibilityLabel={`Finished artwork: ${art.title}`}
            onLayout={({ nativeEvent: { layout } }) => setLaidOut(layout.width > 0 && layout.height > 0)}
            style={[styles.artwork, { width: imageSize, height: imageSize }]}
          >
            <Artwork art={art} filled={filled} hideNumbers onOutlineSettled={() => setSettledOutline(art.outline?.uri)} />
          </View>
        </Animated.View>
        {earnedStreak !== undefined && <StreakCelebration streak={earnedStreak} reduceMotion={reduceMotion} />}
      </ScrollView>
      <View style={styles.footer}>
        {onRetryProgress && (
          <Pressable accessibilityRole="button" onPress={onRetryProgress}>
            <Text style={styles.status}>Progress could not be saved in History. Tap to retry.</Text>
          </Pressable>
        )}
        {status ? <Text accessibilityLiveRegion="polite" style={styles.status}>{status}</Text> : null}
        {status.startsWith('Enable photo access') && (
          <Pressable accessibilityRole="button" onPress={() => { void Linking.openSettings().catch(() => {}); }}>
            <Text style={styles.settings}>Open Settings</Text>
          </Pressable>
        )}
        <View style={styles.actions}>
          {actions.map(({ label, icon }) => {
            const disabled = !!busy || (label !== 'Invite' && !ready);
            return (
              <Pressable
                key={label}
                accessibilityRole="button"
                accessibilityState={{ disabled, busy: busy === label }}
                disabled={disabled}
                onPress={() => { void perform(label); }}
                style={[styles.action, label === 'Save' && styles.save, disabled && busy !== label && styles.disabled]}
              >
                {busy === label ? <ActivityIndicator size={20} color="#312828" /> : <Ionicons name={icon} size={20} color="#312828" />}
                <Text style={styles.label}>{label}</Text>
              </Pressable>
            );
          })}
        </View>
      </View>
    </SafeAreaView>
  );
}

function StreakCelebration({ streak, reduceMotion }: { streak: number; reduceMotion: boolean }) {
  const completedDays = ((streak - 1) % STREAK_MILESTONE) + 1;
  const daysToMilestone = STREAK_MILESTONE - completedDays;
  const milestone = streak + daysToMilestone;
  const message = daysToMilestone
    ? `${daysToMilestone} ${daysToMilestone === 1 ? 'day' : 'days'} to your ${milestone}-day milestone`
    : `${milestone}-day milestone reached!`;

  return (
    <Animated.View entering={reduceMotion ? undefined : FadeInUp.delay(140).duration(360)} style={styles.streak}>
      <View style={styles.streakHeading}>
        <Image
          source={require('@/assets/images/canvas/daily-streak-flame.png')}
          style={styles.flame}
          contentFit="contain"
          accessible={false}
        />
        <Text style={styles.streakTitle}>{streak}-day streak</Text>
      </View>
      <View
        style={styles.streakDays}
        accessible
        accessibilityRole="progressbar"
        accessibilityLabel="Streak milestone progress"
        accessibilityValue={{ min: milestone - STREAK_MILESTONE, max: milestone, now: streak }}
      >
        {Array.from({ length: STREAK_MILESTONE }, (_, index) => (
          <View key={index} style={[styles.streakDay, index < completedDays && styles.streakDayComplete]}>
            {index < completedDays && <Ionicons name="checkmark" size={15} color="#52300C" />}
          </View>
        ))}
      </View>
      <Text style={styles.streakMessage}>{message}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F7F2EF' },
  header: { paddingHorizontal: 16, paddingTop: 12 },
  back: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFFFF' },
  body: { flex: 1 },
  center: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', gap: 20, paddingVertical: 20 },
  title: { fontFamily: 'Fraunces-Regular', fontSize: 30, color: '#312828', textAlign: 'center' },
  frame: { padding: 8, borderWidth: 1, borderColor: '#EBE1DB', borderRadius: 24, backgroundColor: '#FFFFFF' },
  artwork: { backgroundColor: '#FFFFFF', borderRadius: 16, overflow: 'hidden' },
  streak: {
    alignSelf: 'center', width: '88%', maxWidth: 400, padding: 14, gap: 8, alignItems: 'center',
    borderRadius: 20, borderWidth: 1, borderColor: '#F4D3A9', backgroundColor: '#FFF2DE',
  },
  streakHeading: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  flame: { width: 24, height: 24 },
  streakTitle: { fontFamily: 'Poppins-SemiBold', fontSize: 17, color: '#65380F' },
  streakDays: { flexDirection: 'row', gap: 7 },
  streakDay: {
    width: 22, height: 22, borderRadius: 11, borderWidth: 1, borderColor: '#E5BF91',
    alignItems: 'center', justifyContent: 'center',
  },
  streakDayComplete: { borderColor: '#F2BC6D', backgroundColor: '#F2BC6D' },
  streakMessage: { color: '#744E2C', fontFamily: 'Poppins-Regular', fontSize: 11, textAlign: 'center' },
  footer: { paddingHorizontal: 18, paddingVertical: 16, gap: 12 },
  status: { fontFamily: 'Poppins-Regular', fontSize: 12, color: '#645353', textAlign: 'center' },
  settings: { fontFamily: 'Poppins-SemiBold', fontSize: 12, color: '#574049', textAlign: 'center' },
  actions: { flexDirection: 'row', gap: 10 },
  action: { flex: 1, minHeight: 56, gap: 4, alignItems: 'center', justifyContent: 'center', borderRadius: 16, backgroundColor: '#FFFFFF' },
  save: { backgroundColor: '#F4D9DD' },
  disabled: { opacity: 0.5 },
  label: { fontFamily: 'Poppins-SemiBold', fontSize: 12, color: '#312828' },
});
