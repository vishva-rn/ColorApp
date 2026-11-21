import { useCallback, useMemo, useState } from 'react';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { StatusBar } from 'expo-status-bar';
import {
  ActivityIndicator, Alert, AppState, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View, useWindowDimensions,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import Artwork from '@/components/color-by-number/Artwork';
import DailyChallengeCard from '@/components/color-by-number/DailyChallengeCard';
import { refreshColorCatalog, useColorCatalog, type DailyChallenge } from '@/lib/color-catalog';
import { loadDailyStreak, localDateKey } from '@/lib/daily-streak';
import { setDrawingPreview } from '@/lib/drawing-preview';
import { loadProgress } from '@/lib/number-progress';

const GUTTER = 24;
const CARD_GAP = 10;
const dateFormat = new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' });
const dayFormat = new Intl.DateTimeFormat(undefined, { day: 'numeric' });
const monthFormat = new Intl.DateTimeFormat(undefined, { month: 'long', year: 'numeric' });

function calendarDate(key: string) {
  const [year, month, day = 1] = key.split('-').map(Number);
  return new Date(year, month - 1, day);
}

type CalendarItem =
  | { kind: 'month'; key: string; title: string }
  | { kind: 'drawings'; key: string; drawings: DailyChallenge[] };

function buildCalendarItems(challenges: DailyChallenge[], today: string): CalendarItem[] {
  const currentMonth = today.slice(0, 7);
  const drawingsByMonth = new Map<string, DailyChallenge[]>();
  for (const challenge of challenges) {
    if (challenge.challengeDate === today) continue;
    const month = challenge.challengeDate.slice(0, 7);
    const drawings = drawingsByMonth.get(month) ?? [];
    drawings.push(challenge);
    drawingsByMonth.set(month, drawings);
  }
  const otherMonths = [...drawingsByMonth.keys()].filter((month) => month !== currentMonth).sort().reverse();
  const items: CalendarItem[] = [];
  for (const month of [currentMonth, ...otherMonths]) {
    const drawings = drawingsByMonth.get(month);
    if (!drawings?.length) continue;
    drawings.sort((a, b) => a.challengeDate.localeCompare(b.challengeDate));
    items.push({ kind: 'month', key: month, title: monthFormat.format(calendarDate(month)) });
    for (let i = 0; i < drawings.length; i += 2) {
      items.push({ kind: 'drawings', key: drawings[i].challengeDate, drawings: drawings.slice(i, i + 2) });
    }
  }
  return items;
}

export default function DailyCalendar() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const { left, right } = useSafeAreaInsets();
  const gridWidth = Math.max(0, Math.min(width - left - right, 1000) - 2 * GUTTER);
  const cardSize = Math.max(0, Math.floor((gridWidth - CARD_GAP) / 2));
  const { status, dailyChallenges } = useColorCatalog();
  const [today, setToday] = useState(localDateKey);
  const [streak, setStreak] = useState(loadDailyStreak);
  const [progress, setProgress] = useState(loadProgress);
  const [refreshing, setRefreshing] = useState(false);

  useFocusEffect(useCallback(() => {
    let midnight: ReturnType<typeof setTimeout>;
    function updateDay() {
      clearTimeout(midnight);
      const tomorrow = new Date();
      setToday(localDateKey(tomorrow));
      setStreak(loadDailyStreak(tomorrow));
      tomorrow.setHours(24, 0, 0, 0);
      midnight = setTimeout(updateDay, tomorrow.getTime() - Date.now() + 100);
    }
    updateDay();
    setProgress(loadProgress());
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') updateDay();
    });
    return () => {
      clearTimeout(midnight);
      subscription.remove();
    };
  }, []));

  const todayChallenge = dailyChallenges.find(({ challengeDate }) => challengeDate === today);
  const items = useMemo(() => buildCalendarItems(dailyChallenges, today), [dailyChallenges, today]);

  function openDrawing(challenge: DailyChallenge) {
    setDrawingPreview(challenge);
    router.push({ pathname: '/drawing', params: { artId: challenge.id } });
  }

  async function refresh() {
    setRefreshing(true);
    try {
      await refreshColorCatalog(true);
      setProgress(loadProgress());
      setStreak(loadDailyStreak());
    } finally {
      setRefreshing(false);
    }
  }

  return (
    <SafeAreaView style={styles.screen}>
      <StatusBar style="dark" />
      <View style={styles.content}>
        <View style={styles.header}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Back to Canvas"
            hitSlop={4}
            onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)')}
            style={styles.control}
          >
            <Ionicons name="chevron-back" size={23} color="#382E2C" />
          </Pressable>
          <Text accessibilityRole="header" style={styles.title}>Daily Challenge</Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`View streak, ${streak} ${streak === 1 ? 'day' : 'days'}`}
            onPress={() => Alert.alert(`${streak}-day streak`, 'Finish the daily challenge each day to grow your streak.')}
            style={styles.control}
          >
            <Image source={require('@/assets/images/canvas/daily-trophy.png')} style={styles.trophy} accessible={false} />
          </Pressable>
        </View>
        <ScrollView
          style={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}
          contentContainerStyle={styles.grid}
        >
          {todayChallenge && (
            <View style={styles.listHeader}>
              <DailyChallengeCard
                challenge={todayChallenge}
                dateLabel={dateFormat.format(calendarDate(today))}
                filled={progress[todayChallenge.id]}
                streak={streak}
                width={gridWidth}
                onPress={() => openDrawing(todayChallenge)}
              />
            </View>
          )}
          {items.length === 0 && (
            <View style={styles.empty}>
              {status === 'loading' ? (
                <ActivityIndicator accessibilityLabel="Loading daily drawings" color="#A85C5E" />
              ) : (
                <>
                  <Text style={styles.emptyText}>
                    {status === 'unavailable' ? 'Couldn’t load the drawings.' : 'No other daily drawings yet.'}
                  </Text>
                  {status === 'unavailable' && (
                    <Pressable accessibilityRole="button" onPress={refresh} style={styles.retry}>
                      <Text style={styles.retryText}>Try again</Text>
                    </Pressable>
                  )}
                </>
              )}
            </View>
          )}
          {items.map((item) => item.kind === 'month' ? (
            <Text key={item.key} accessibilityRole="header" style={styles.monthTitle}>{item.title}</Text>
          ) : (
            <View key={item.key} style={styles.row}>
              {item.drawings.map((drawing) => {
                const date = calendarDate(drawing.challengeDate);
                const upcoming = drawing.challengeDate > today;
                const filled = progress[drawing.id] ?? [];
                const painted = new Set(filled);
                const count = drawing.regions.filter(({ id }) => painted.has(id)).length;
                const total = drawing.regions.length;
                const done = total > 0 && count === total;
                const progressLabel = count ? `${Math.floor(count / total * 100)}% painted` : undefined;
                return (
                  <Pressable
                    key={drawing.id}
                    accessibilityRole="button"
                    accessibilityLabel={[dateFormat.format(date), drawing.title, upcoming ? 'Upcoming' : done ? 'Completed' : progressLabel].filter(Boolean).join(', ')}
                    accessibilityState={{ disabled: upcoming }}
                    disabled={upcoming}
                    onPress={() => openDrawing(drawing)}
                    style={[styles.card, { width: cardSize, height: cardSize }]}
                  >
                    <View style={styles.artwork} pointerEvents="none">
                      <View style={[styles.preview, upcoming && styles.upcomingArtwork]}>
                        <Artwork art={drawing} filled={filled} outlineOnly={count === 0} hideNumbers />
                      </View>
                      <View style={styles.dateCircle}>
                        <Text style={styles.date}>{dayFormat.format(date)}</Text>
                      </View>
                      {(upcoming || done) && (
                        <View style={styles.statusIcon}>
                          <Ionicons name={upcoming ? 'lock-closed' : 'checkmark'} size={13} color={upcoming ? '#4F3F3B' : '#315F49'} />
                        </View>
                      )}
                    </View>
                  </Pressable>
                );
              })}
            </View>
          ))}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F7F2EF', alignItems: 'center' },
  content: { flex: 1, width: '100%', maxWidth: 1000 },
  header: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: GUTTER, paddingTop: 8, paddingBottom: 16,
  },
  control: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' },
  title: { flex: 1, color: '#382E2C', fontFamily: 'Fraunces-Regular', fontSize: 24, textAlign: 'center' },
  trophy: { width: 39, height: 39 },
  listHeader: { marginBottom: 6 },
  list: { flex: 1 },
  monthTitle: { color: '#382E2C', fontFamily: 'Fraunces-Regular', fontSize: 22, paddingTop: 14, paddingBottom: 10 },
  grid: { flexGrow: 1, paddingHorizontal: GUTTER, paddingBottom: 16 },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: CARD_GAP, marginBottom: CARD_GAP },
  card: {
    backgroundColor: '#FFFFFF', padding: 6, borderRadius: 20,
    boxShadow: '0 2px 10px rgba(58, 42, 36, 0.07)',
  },
  dateCircle: {
    position: 'absolute', top: 5, left: 5, width: 29, height: 29,
    borderRadius: 15, alignItems: 'center', justifyContent: 'center', backgroundColor: '#000000',
  },
  date: { color: '#FFFFFF', fontFamily: 'Poppins-SemiBold', fontSize: 12 },
  statusIcon: {
    position: 'absolute', top: 5, right: 5, width: 24, height: 24,
    borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F7F2EF',
  },
  artwork: { flex: 1, borderRadius: 14, overflow: 'hidden' },
  preview: StyleSheet.absoluteFillObject,
  upcomingArtwork: { opacity: 0.55 },
  empty: { alignItems: 'center', gap: 12, padding: 20, paddingTop: 44 },
  emptyText: { color: '#69554C', fontFamily: 'Poppins-Regular', fontSize: 13, textAlign: 'center' },
  retry: { backgroundColor: '#FFFFFF', borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10 },
  retryText: { color: '#73474B', fontFamily: 'Poppins-SemiBold', fontSize: 12 },
});
