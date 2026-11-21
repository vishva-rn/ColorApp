import { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions, type GestureResponderEvent } from 'react-native';
import { useReducedMotion } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Artwork from '@/components/color-by-number/Artwork';
import ColorSwatch, { SWATCH_GAP, SWATCH_SIZE } from '@/components/color-by-number/ColorSwatch';
import DrawingComplete from '@/components/color-by-number/DrawingComplete';
import DrawingLoading from '@/components/color-by-number/DrawingLoading';
import type { FillRevealEnd, FillReveals } from '@/components/color-by-number/RegionFill';
import { refreshColorCatalog, reportCatalogCompletion, useColorCatalog } from '@/lib/color-catalog';
import { localDateKey, recordDailyCompletion } from '@/lib/daily-streak';
import type { NumberArt } from '@/lib/number-art';
import { loadHintsRemaining, loadProgress, saveProgress, spendDrawingHint } from '@/lib/number-progress';
import { useCatalogDrawing } from '@/lib/catalog-drawing';
import { getDrawingPreview } from '@/lib/drawing-preview';

const PALETTE_PADDING = 20;

export default function Drawing() {
  const { artId } = useLocalSearchParams<{ artId?: string }>();
  return <DrawingPage key={artId} artId={artId} />;
}

function DrawingPage({ artId }: { artId?: string }) {
  const router = useRouter();
  const [preview] = useState(() => getDrawingPreview(artId));
  const [savedRegions] = useState(() => artId ? loadProgress()[artId] ?? [] : []);
  const [opening, setOpening] = useState(true);
  const openCanvas = useCallback(() => setOpening(false), []);
  const { status, drawings, dailyChallenges, history } = useColorCatalog();
  const challenge = dailyChallenges.find((drawing) => drawing.id === artId);
  const known = (challenge && challenge.challengeDate <= localDateKey() ? challenge : undefined)
    ?? drawings.find((drawing) => drawing.id === artId)
    ?? (savedRegions.length ? history.find((drawing) => drawing.id === artId) : undefined);
  // Library pages that are not in the home catalog are downloaded one at a time when opened.
  const remote = useCatalogDrawing(artId, Boolean(known) || Boolean(challenge) || status === 'loading');
  const art = known ?? remote.art;
  const loading = !!artId && !art && (status === 'loading' || (!challenge && remote.status === 'loading'));
  const unavailable = (status === 'unavailable' && remote.status !== 'ready') || (!known && !challenge && remote.status === 'unavailable');
  if (loading || (art && opening)) {
    return <DrawingLoading art={art ?? preview} filled={savedRegions} canOpen={!!art} onContinue={openCanvas} />;
  }
  if (!art) {
    return (
      <SafeAreaView style={s.screen}>
        <View style={s.message}>
          <Text style={s.title}>{unavailable ? 'Couldn’t load the picture' : 'Choose your next picture'}</Text>
          {unavailable && (
            <Pressable onPress={() => { void refreshColorCatalog(true); remote.retry(); }} style={s.button}>
              <Text style={s.white}>Try again</Text>
            </Pressable>
          )}
          <Pressable onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)')} style={s.button}>
            <Text style={s.white}>Back to gallery</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }
  return <Coloring key={art.id} art={art} savedRegions={savedRegions} challengeDate={challenge?.challengeDate} />;
}
function Coloring({ art, savedRegions, challengeDate }: { art: NumberArt; savedRegions: string[]; challengeDate?: string }) {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const canvasSize = Math.min(560, width - 24);
  const [filled, setFilled] = useState(() => art.regions.filter(({ id }) => savedRegions.includes(id)).map(({ id }) => id));
  const [selectedColor, setSelectedColor] = useState<number>();
  const [finishingColors, setFinishingColors] = useState<number[]>([]);
  const [hint, setHint] = useState<string>();
  const [hintsRemaining, setHintsRemaining] = useState(() => loadHintsRemaining(art.id));
  const [earnedStreak, setEarnedStreak] = useState<number>();
  const [notice, setNotice] = useState('');
  const [saveError, setSaveError] = useState(false);
  const [reveals, setReveals] = useState<FillReveals>({});
  const canvas = useRef<View>(null);
  const palette = useRef<ScrollView>(null);
  const painted = useRef(filled);
  const reduceMotion = useReducedMotion();
  const filledIds = new Set(filled);
  const regionCounts = new Map<number, number>();
  const remainingCounts = new Map<number, number>();
  for (const region of art.regions) {
    regionCounts.set(region.color, (regionCounts.get(region.color) ?? 0) + 1);
    if (!filledIds.has(region.id)) {
      remainingCounts.set(region.color, (remainingCounts.get(region.color) ?? 0) + 1);
    }
  }
  const swatches = art.palette
    .map((color, index) => ({
      color,
      number: index + 1,
      total: regionCounts.get(index + 1) ?? 0,
      remaining: remainingCounts.get(index + 1) ?? 0,
      finishing: finishingColors.includes(index + 1),
    }))
    .filter(({ total, remaining, finishing }) => total > 0 && (remaining > 0 || finishing));
  const activeSwatch = swatches.find(({ number, remaining }) => remaining > 0 && number === selectedColor)
    ?? swatches.find(({ remaining }) => remaining > 0);
  const selected = activeSwatch?.number;
  const selectedIndex = activeSwatch ? swatches.indexOf(activeSwatch) : -1;
  const complete = remainingCounts.size === 0;
  const completingColor = swatches.some(({ finishing }) => finishing);
  const hintDisabled = complete || hint !== undefined || hintsRemaining === 0;

  const scrollToSelected = useCallback(() => {
    if (selectedIndex < 0 || completingColor) return;
    const center = PALETTE_PADDING + selectedIndex * (SWATCH_SIZE + SWATCH_GAP) + SWATCH_SIZE / 2;
    palette.current?.scrollTo({ x: Math.max(0, center - width / 2), animated: !reduceMotion });
  }, [completingColor, reduceMotion, selectedIndex, width]);

  useEffect(() => {
    const frame = requestAnimationFrame(scrollToSelected);
    return () => cancelAnimationFrame(frame);
  }, [scrollToSelected]);

  const finishReveal = useCallback<FillRevealEnd>((id, reveal) => {
    setReveals((current) => {
      if (current[id] !== reveal) return current;
      const next = { ...current };
      delete next[id];
      return next;
    });
  }, []);

  const finishSwatch = useCallback((number: number) => {
    setFinishingColors((colors) => colors.filter((color) => color !== number));
  }, []);
  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(''), 2200);
    return () => clearTimeout(timer);
  }, [notice]);

  const persist = (next: string[]) => {
    try {
      saveProgress(art.id, next);
      setSaveError(false);
      if (next.length === art.regions.length) {
        if (challengeDate) {
          const streak = recordDailyCompletion(challengeDate);
          if (streak !== undefined) setEarnedStreak(streak);
        } else {
          reportCatalogCompletion(art.id);
        }
      }
    } catch {
      setSaveError(true);
    }
  };
  const paint = (id: string, event: GestureResponderEvent) => {
    const region = art.regions.find((item) => item.id === id);
    if (!region || region.color !== selected || painted.current.includes(id)) return;
    if (!reduceMotion) {
      const { pageX: tapX, pageY: tapY } = event.nativeEvent;
      setReveals((current) => ({
        ...current,
        [id]: {
          measureTap: (size, callback) => {
            canvas.current?.measure((_x, _y, width, height, left, top) => {
              const x = (tapX - left) * size / width;
              const y = (tapY - top) * size / height;
              if (x >= 0 && x <= size && y >= 0 && y <= size) callback({ x, y });
            });
          },
        },
      }));
    }
    const next = [...painted.current, id];
    painted.current = next;
    setFilled(next);
    persist(next);
    setNotice('');
    if (id === hint) setHint(undefined);
    void Haptics.selectionAsync().catch(() => {});

    const nextIds = new Set(next);
    if (!art.regions.some((item) => item.color === selected && !nextIds.has(item.id))) {
      if (!reduceMotion) setFinishingColors((colors) => [...colors, region.color]);
      const nextSwatch = swatches.slice(selectedIndex + 1).find(({ remaining }) => remaining > 0)
        ?? swatches.find(({ number, remaining }) => number !== selected && remaining > 0);
      setSelectedColor(nextSwatch?.number);
    }
  };

  function showHint() {
    if (hintDisabled) return;
    const region = art.regions.find((item) => item.color === selected && !painted.current.includes(item.id));
    if (!region) return;

    try {
      const result = spendDrawingHint(art.id);
      setHintsRemaining(result.remaining);
      if (result.applied) {
        setHint(region.id);
        setNotice('');
      }
    } catch {
      setNotice('Couldn’t use your hint. Tap the bulb to try again.');
    }
  }

  const goBack = () => router.canGoBack() ? router.back() : router.replace('/(tabs)');

  if (complete && !completingColor) {
    return (
      <DrawingComplete
        art={art}
        filled={filled}
        earnedStreak={earnedStreak}
        onBack={goBack}
        onRetryProgress={saveError ? () => persist(filled) : undefined}
      />
    );
  }

  return (
    <SafeAreaView style={s.screen}>
      <View style={s.header}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Back to gallery"
          onPress={goBack}
          style={s.icon}
        >
          <Ionicons name="chevron-back" size={24} color="#292725" />
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Hint, ${hintsRemaining} free ${hintsRemaining === 1 ? 'hint' : 'hints'} left`}
          accessibilityState={{ disabled: hintDisabled }}
          disabled={hintDisabled}
          onPress={showHint}
          style={[s.icon, s.hintButton, hintDisabled && s.hintDisabled]}
        >
          <Ionicons name={hint ? 'bulb' : 'bulb-outline'} size={23} color="#5C431B" />
          <Text style={s.hintCount}>{hintsRemaining}</Text>
        </Pressable>
      </View>
      <ScrollView
        style={s.canvasArea}
        contentContainerStyle={s.canvasContent}
        maximumZoomScale={3}
        minimumZoomScale={1}
        bouncesZoom
        centerContent
      >
        <View ref={canvas} collapsable={false} style={[s.canvas, { width: canvasSize, height: canvasSize }]}>
          <Artwork art={art} filled={filled} selected={selected} hint={hint} onRegion={paint} reveals={reveals} onRevealEnd={finishReveal} />
        </View>
      </ScrollView>
      <View style={s.bottom}>
        {notice ? <Text accessibilityLiveRegion="polite" style={s.notice}>{notice}</Text> : null}
        {saveError && (
          <Pressable accessibilityRole="button" onPress={() => persist(filled)}>
            <Text style={s.error}>Progress could not be saved. Tap to retry.</Text>
          </Pressable>
        )}
        {swatches.length > 0 && (
          <ScrollView
            ref={palette}
            horizontal
            showsHorizontalScrollIndicator={false}
            onContentSizeChange={scrollToSelected}
            contentContainerStyle={s.palette}
          >
            {swatches.map(({ color, number, total, remaining, finishing }) => (
              <ColorSwatch
                key={number}
                color={color}
                number={number}
                total={total}
                remaining={remaining}
                gradient={art.gradients?.[number - 1]}
                selected={selected === number}
                finishing={finishing}
                reduceMotion={reduceMotion}
                onFinished={finishSwatch}
                onSelect={() => {
                  if (selected === number) return;
                  setSelectedColor(number);
                  setHint(undefined);
                  setNotice('');
                }}
              />
            ))}
          </ScrollView>
        )}
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#FAF8F5' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12 },
  icon: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 22, backgroundColor: '#FFFFFF' },
  hintButton: { backgroundColor: '#F8EDDC' },
  hintDisabled: { opacity: 0.55 },
  hintCount: {
    position: 'absolute',
    top: -3,
    right: -3,
    width: 19,
    height: 19,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#FAF8F5',
    backgroundColor: '#E9C77D',
    color: '#3F2D13',
    fontSize: 11,
    fontWeight: '700',
    lineHeight: 17,
    textAlign: 'center',
    includeFontPadding: false,
  },
  title: { fontFamily: 'Fraunces-Regular', fontSize: 21, color: '#494452' },
  canvasArea: { flex: 1 },
  canvasContent: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 12 },
  canvas: { backgroundColor: '#FFFFFF', borderRadius: 10, overflow: 'hidden' },
  bottom: { backgroundColor: '#FFFFFF', borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingVertical: 16 },
  palette: { paddingLeft: PALETTE_PADDING, paddingRight: PALETTE_PADDING - SWATCH_GAP },
  message: { alignItems: 'center', justifyContent: 'center', padding: 24, gap: 12 },
  button: { paddingVertical: 14, paddingHorizontal: 25, backgroundColor: '#77718F', borderRadius: 25, marginTop: 8 },
  white: { color: '#FFFFFF', fontFamily: 'Poppins-Medium', fontSize: 12 },
  notice: { textAlign: 'center', fontFamily: 'Poppins-Medium', fontSize: 11, color: '#625C72', marginBottom: 10 },
  error: { textAlign: 'center', color: '#B35353', fontSize: 11, marginBottom: 12 },
});
