import { useId } from 'react';
import { Image } from 'expo-image';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Defs, RadialGradient, Rect, Stop } from 'react-native-svg';

import type { DailyChallenge } from '@/lib/color-catalog';
import Artwork from './Artwork';

type Props = {
  challenge: DailyChallenge;
  dateLabel?: string;
  filled?: string[];
  streak: number;
  width: number;
  onPress: () => void;
};

export default function DailyChallengeCard({ challenge, dateLabel, filled = [], streak, width, onPress }: Props) {
  const id = useId().replace(/[^\w-]/g, '');
  const pinkGradient = `daily-pink-${id}`;
  const yellowGradient = `daily-yellow-${id}`;
  const painted = new Set(filled);
  const complete = challenge.regions.length > 0 && challenge.regions.every(({ id }) => painted.has(id));
  const action = complete ? 'Completed' : 'Start';
  const previewSize = Math.min(168, Math.floor(width * 0.33));

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${action}. Today's daily challenge, ${challenge.title}${dateLabel ? `, ${dateLabel}` : ''}. ${streak} day streak.`}
      accessibilityState={{ disabled: complete }}
      disabled={complete}
      onPress={complete ? undefined : onPress}
      style={[styles.card, { width, minHeight: Math.max(166, Math.min(220, width * 292 / 590)) }]}
    >
      <View pointerEvents="none" style={StyleSheet.absoluteFill}>
        <Svg width="100%" height="100%" viewBox="0 0 590 292" preserveAspectRatio="none">
          <Defs>
            <RadialGradient id={pinkGradient} cx="56%" cy="17%" rx="69%" ry="91%">
              <Stop offset="0" stopColor="#F7D8EB" />
              <Stop offset="1" stopColor="#F7D8EB" stopOpacity={0} />
            </RadialGradient>
            <RadialGradient id={yellowGradient} cx="36%" cy="88%" rx="52%" ry="87%">
              <Stop offset="0" stopColor="#FAF6CB" />
              <Stop offset="1" stopColor="#FAF6CB" stopOpacity={0} />
            </RadialGradient>
          </Defs>
          <Rect width="590" height="292" fill="#AECCEE" />
          <Rect width="590" height="292" fill={`url(#${pinkGradient})`} />
          <Rect width="590" height="292" fill={`url(#${yellowGradient})`} />
        </Svg>
      </View>
      <View style={styles.content}>
        <View style={styles.copy}>
          <Text style={styles.title}>Today’s Daily Challenge</Text>
          <Text style={styles.description}>{dateLabel ?? 'A fresh picture awaits you.'}</Text>
          <View style={styles.streak}>
            <Image
              source={require('@/assets/images/canvas/daily-streak-flame.png')}
              style={styles.streakIcon}
              contentFit="contain"
              accessible={false}
            />
            <Text style={styles.streakLabel}>{streak} Day Streak</Text>
          </View>
          <View style={[styles.button, complete && styles.completedButton]}>
            <Text style={styles.buttonLabel}>{action}</Text>
          </View>
        </View>
        <View pointerEvents="none" style={[styles.preview, { width: previewSize, height: previewSize }]}>
          <Artwork art={challenge} filled={complete ? filled : undefined} outlineOnly={!complete} hideNumbers />
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { overflow: 'hidden', borderRadius: 20, backgroundColor: '#EBD6EC' },
  content: {
    flexGrow: 1, flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 14, paddingVertical: 12,
  },
  copy: { flex: 1, minWidth: 0, gap: 6, alignItems: 'flex-start', justifyContent: 'center' },
  title: { color: '#3A3A3A', fontFamily: 'Poppins-SemiBold', fontSize: 17, lineHeight: 21 },
  description: { color: '#68616B', fontFamily: 'Poppins-Regular', fontSize: 13 },
  streak: { flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: 18, paddingVertical: 4, paddingHorizontal: 8, backgroundColor: '#FFFAEB' },
  streakIcon: { width: 18, height: 18 },
  streakLabel: { color: '#956344', fontFamily: 'Poppins-SemiBold', fontSize: 12 },
  button: { marginTop: 2, borderRadius: 24, backgroundColor: '#3A3A3A', paddingVertical: 5, paddingHorizontal: 13 },
  completedButton: { backgroundColor: '#36634E' },
  buttonLabel: { color: '#FFFFFF', fontFamily: 'Poppins-Regular', fontSize: 15, lineHeight: 21 },
  preview: { borderRadius: 12, overflow: 'hidden', backgroundColor: '#FFFFFF' },
});
