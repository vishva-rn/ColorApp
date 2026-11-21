import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useFocusEffect, useIsFocused } from '@react-navigation/native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { ActivityIndicator, Alert, AppState, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useReducedMotion } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import Artwork from './Artwork';
import DailyChallengeCard from './DailyChallengeCard';
import { refreshColorCatalog, useColorCatalog } from '@/lib/color-catalog';
import { loadDailyStreak, localDateKey } from '@/lib/daily-streak';
import { loadProgress, type ArtProgress } from '@/lib/number-progress';
import { usePagedDrawings, type CatalogListItem } from '@/lib/catalog-pages';
import { cachedDrawings, warmDrawingCache } from '@/lib/catalog-drawing';
import { setDrawingPreview } from '@/lib/drawing-preview';
import type { NumberArt } from '@/lib/number-art';
import CategorySelectedBackground from '@/assets/images/svgicons/category-selected-bg.svg';

const POPULAR_CARD_RADIUS = 20;
const BANNER_GAP = 12;
const BANNER_INTERVAL_MS = 4_000;
const CANVAS_TILE_GAP = 10;
const CANVAS_TILE_RADIUS = 20;
const CANVAS_TILE_PADDING = 6;
const canvasScreenStyle = { backgroundColor: '#F7F2EF' };

export default function Gallery({myArt=false}: {myArt?:boolean}) {
  const router=useRouter();
  const {width}=useWindowDimensions();
  const isFocused = useIsFocused();
  const reduceMotion = useReducedMotion();
  const bannerScroll = useRef<ScrollView>(null);
  const bannerOffset = useRef(0);
  const bannerViewportWidth = useRef(0);
  const bannerTimer = useRef<ReturnType<typeof setInterval> | undefined>(undefined);
  const { status, categories, drawings, dailyChallenges, history } = useColorCatalog();
  const [selectedFilter, setSelectedFilter] = useState<string | null>(null);
  const [progress, setProgress] = useState<ArtProgress>({});
  const [refreshing, setRefreshing] = useState(false);
  const [today, setToday] = useState(localDateKey);
  const [streak, setStreak] = useState(loadDailyStreak);

  useFocusEffect(useCallback(() => {
    warmDrawingCache();
    setProgress(loadProgress());
    void refreshColorCatalog();
    if (myArt) return;

    let midnight: ReturnType<typeof setTimeout>;
    function updateDay() {
      clearTimeout(midnight);
      const now = new Date();
      setToday(localDateKey(now));
      setStreak(loadDailyStreak(now));
      const tomorrow = new Date(now);
      tomorrow.setHours(24, 0, 0, 0);
      midnight = setTimeout(() => {
        updateDay();
        void refreshColorCatalog();
      }, tomorrow.getTime() - now.getTime() + 100);
    }
    updateDay();
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') updateDay();
    });
    return () => {
      clearTimeout(midnight);
      subscription.remove();
    };
  }, [myArt]));

  const filters = myArt
    ? [{ id: 'in-progress', label: 'In progress' }, { id: 'completed', label: 'Completed' }]
    : categories;
  const activeFilter = filters.some(({ id }) => id === selectedFilter) ? selectedFilter : null;
  const labels = useMemo(() => new Map(categories.map(({ id, label }) => [id, label])), [categories]);
  const paged = usePagedDrawings(activeFilter, labels, !myArt);
  const gridStatus = myArt ? status : paged.loading ? 'loading' : paged.error ? 'unavailable' : 'ready';
  const popular = drawings.reduce<(typeof drawings)[number] | undefined>((best, drawing) => {
    if (!best || drawing.completedCount > best.completedCount) return drawing;
    if (drawing.completedCount === best.completedCount && (drawing.addedAt ?? '') > (best.addedAt ?? '')) {
      return drawing;
    }
    return best;
  }, undefined);
  const todayChallenge = dailyChallenges.find(({ challengeDate }) => challengeDate === today);

  function openDrawing(art: NumberArt) {
    setDrawingPreview(art);
    router.push({ pathname: '/drawing', params: { artId: art.id } });
  }

  function startDailyChallenge() {
    if (todayChallenge) {
      openDrawing(todayChallenge);
    } else {
      Alert.alert('Daily Challenge', status === 'loading' ? 'Today’s picture is loading.' : 'There’s no daily picture available right now.');
    }
  }

  function showStreak() {
    Alert.alert(`${streak} Day Streak`, 'Finish the daily challenge each day to grow your streak.');
  }

  const startedDrawings = useMemo(() => {
    const byId = new Map<string, NumberArt>();
    for (const art of [...history, ...cachedDrawings()]) {
      if (progress[art.id]?.length && !byId.has(art.id)) byId.set(art.id, art);
    }
    return byId;
  }, [history, progress]);
  const artwork: (NumberArt | CatalogListItem)[] = myArt
    ? [...startedDrawings.values()].filter((art) => {
        const count = art.regions.filter((region) => progress[art.id]?.includes(region.id)).length;
        return count > 0 && (!activeFilter || (activeFilter === 'completed'
          ? count === art.regions.length
          : count < art.regions.length));
      })
    : paged.items;

  async function handleRefresh() {
    setRefreshing(true);
    try {
      await Promise.all([refreshColorCatalog(true), myArt ? Promise.resolve() : paged.refresh()]);
    } finally {
      setRefreshing(false);
    }
  }

  const columns=width>=700?3:2;
  const gridGap = myArt ? 14 : CANVAS_TILE_GAP;
  const cardWidth = (Math.min(width, 1000) - 48 - (columns - 1) * gridGap) / columns;
  const hasTwoBanners = Boolean(popular && todayChallenge);
  const bannerWidth = Math.min(width, 1000) - 48 - (hasTwoBanners ? 32 : 0);

  const stopBannerTimer = useCallback(() => {
    clearInterval(bannerTimer.current);
    bannerTimer.current = undefined;
  }, []);

  const startBannerTimer = useCallback(() => {
    stopBannerTimer();
    if (myArt || !hasTwoBanners || !isFocused || reduceMotion || AppState.currentState !== 'active') return;

    bannerTimer.current = setInterval(() => {
      const viewport = bannerViewportWidth.current;
      const endOffset = 2 * bannerWidth + BANNER_GAP - viewport;
      if (viewport <= 0 || endOffset <= 0) return;
      const nextOffset = bannerOffset.current < endOffset / 2 ? endOffset : 0;
      bannerScroll.current?.scrollTo({ x: nextOffset, animated: true });
    }, BANNER_INTERVAL_MS);
  }, [bannerWidth, hasTwoBanners, isFocused, myArt, reduceMotion, stopBannerTimer]);

  useEffect(() => {
    if (myArt || !hasTwoBanners || !isFocused || reduceMotion) return;

    startBannerTimer();
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') startBannerTimer();
      else stopBannerTimer();
    });
    return () => {
      subscription.remove();
      stopBannerTimer();
    };
  }, [hasTwoBanners, isFocused, myArt, reduceMotion, startBannerTimer, stopBannerTimer]);

  return <SafeAreaView style={[s.screen, !myArt && canvasScreenStyle]} edges={['top','left','right']}>
    <ScrollView
      onScroll={myArt ? undefined : ({ nativeEvent: { layoutMeasurement, contentOffset, contentSize } }) => {
        if (layoutMeasurement.height + contentOffset.y >= contentSize.height - 900) void paged.loadMore();
      }}
      scrollEventThrottle={myArt ? undefined : 200}
      contentContainerStyle={[s.content, !myArt && canvasHeader.content]}
      refreshControl={myArt ? undefined : <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
    >
      {myArt ? <>
        <View style={s.header}>
          <View><Text style={s.eyebrow}>A LITTLE COLOR. A LITTLE CALM.</Text><Text style={s.title}>My Art</Text></View>
          <Text style={s.flower}>✿</Text>
        </View>
        <Text style={s.subtitle}>Your moments of color, saved here.</Text>
      </> : (
        <View style={canvasHeader.container}>
          <View style={canvasHeader.copy}>
            <Text style={canvasHeader.subtitle}>Your Creative</Text>
            <Text accessibilityRole="header" style={canvasHeader.title}>Canvas</Text>
          </View>
          <View style={canvasHeader.actions}>
            <Pressable accessibilityRole="button" accessibilityLabel={`View streak, ${streak} days`} onPress={showStreak} hitSlop={4}>
              <Image source={require('@/assets/images/canvas/daily-trophy.png')} style={canvasHeader.icon} />
            </Pressable>
            <Pressable accessibilityRole="button" accessibilityLabel="Open drawing calendar" onPress={() => router.push('/daily-calendar')} hitSlop={4}>
              <Image source={require('@/assets/images/canvas/daily-calendar.png')} style={canvasHeader.icon} accessible={false} />
            </Pressable>
          </View>
        </View>
      )}
      {!myArt && (popular || todayChallenge) && (
        <ScrollView
          ref={bannerScroll}
          horizontal
          showsHorizontalScrollIndicator={false}
          snapToInterval={bannerWidth + BANNER_GAP}
          decelerationRate="fast"
          onLayout={(event) => { bannerViewportWidth.current = event.nativeEvent.layout.width; }}
          onScroll={(event) => { bannerOffset.current = event.nativeEvent.contentOffset.x; }}
          scrollEventThrottle={16}
          onScrollBeginDrag={stopBannerTimer}
          onScrollEndDrag={startBannerTimer}
          contentContainerStyle={canvasHeader.banners}
        >
          {popular && <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Start coloring ${popular.title}, the popular picture`}
            onPress={() => openDrawing(popular)}
            style={[popularCard.container, { width: bannerWidth }]}
          >
            <Image
              source={require('@/assets/images/canvas/popular-picture-background.png')}
              style={StyleSheet.absoluteFill}
              contentFit="cover"
              accessible={false}
              pointerEvents="none"
            />
            <View style={popularCard.copy}>
              <View>
                <Text style={popularCard.title}>Popular pic</Text>
                <Text style={popularCard.description}>Discover everyone&apos;s favorites.</Text>
              </View>
              <View style={popularCard.button}>
                <Text style={popularCard.buttonLabel}>Start</Text>
              </View>
            </View>
            <View style={popularCard.easel} pointerEvents="none">
              <Image
                source={require('@/assets/images/canvas/popular-picture-easel.png')}
                style={StyleSheet.absoluteFill}
                contentFit="fill"
                accessible={false}
              />
              <View style={popularCard.drawing}>
                <Artwork art={popular} outlineOnly />
              </View>
            </View>
          </Pressable>}
          {todayChallenge && (
            <DailyChallengeCard
              challenge={todayChallenge}
              filled={progress[todayChallenge.id]}
              streak={streak}
              width={bannerWidth}
              onPress={startDailyChallenge}
            />
          )}
        </ScrollView>
      )}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.filters}>
        {[{ id: null, label: 'All' }, ...filters].map(({ id, label }) => {
          const selected = id === activeFilter;
          return (
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ selected }}
              key={id === null ? 'all-filter' : `category-${id}`}
              onPress={() => setSelectedFilter(id)}
              style={[s.chip, selected && { backgroundColor: 'transparent' }]}
            >
              {selected && <View pointerEvents="none" style={StyleSheet.absoluteFill}>
                <CategorySelectedBackground width="100%" height="100%" preserveAspectRatio="none" />
              </View>}
              <Text style={[s.chipText, selected && { color: '#3A3A3A' }]}>{label}</Text>
            </Pressable>
          );
        })}
      </ScrollView>
      <View style={s.section}><Text style={s.sectionTitle}>{myArt?'Your collection':'Find your next happy moment'}</Text><Text style={s.count}>{myArt ? artwork.length : paged.total ?? artwork.length} pictures</Text></View>
      <View style={[s.grid, { gap: gridGap }]}>{artwork.map(art=>{
        const filled = progress[art.id] ?? [];
        if (!myArt) {
          const isNew = 'addedAt' in art && art.addedAt !== null && localDateKey(new Date(art.addedAt)) === today;
          const thumbnail = startedDrawings.get(art.id) ?? art;
          const painted = new Set(filled);
          const paintedCount = filled.length ? thumbnail.regions.filter(({ id }) => painted.has(id)).length : 0;
          const progressLabel = paintedCount ? `, ${Math.round(paintedCount / thumbnail.regions.length * 100)}% painted` : '';
          const newLabel = isNew ? ', added today' : '';
          return (
            <Pressable
              key={art.id}
              accessibilityRole="button"
              accessibilityLabel={`${art.title}${newLabel}${progressLabel}`}
              onPress={() => openDrawing(paintedCount ? thumbnail : art)}
              style={[canvasTile.card, { width: cardWidth, height: cardWidth }]}
            >
              <View pointerEvents="none" style={canvasTile.art}>
                <Artwork art={paintedCount ? thumbnail : art} filled={filled} outlineOnly={!paintedCount} hideNumbers />
              </View>
              {isNew && (
                <View pointerEvents="none" style={canvasTile.ribbon}>
                  <Image
                    source={require('@/assets/images/canvas/new-drawing-ribbon.png')}
                    style={StyleSheet.absoluteFill}
                    contentFit="contain"
                    accessible={false}
                  />
                </View>
              )}
            </Pressable>
          );
        }

        const total=art.regions.length;
        const count=art.regions.filter(r=>filled.includes(r.id)).length;
        const percent=total ? Math.round(count/total*100) : 0;
        return <Pressable key={art.id} accessibilityRole="button" accessibilityLabel={`${art.title}, ${percent}% complete`} onPress={() => openDrawing(art)} style={[s.card,{width:cardWidth}]}>
          <View pointerEvents="none" style={s.art}>
            <Artwork art={art} filled={filled} />
          </View>
          <View style={s.cardBody}><Text style={s.cardTitle}>{art.title}</Text><View style={s.section}><Text style={s.cardMeta}>{art.category}</Text><Text style={s.cardMeta}>{percent===100?'✓ Done':count?`${percent}%`:`${art.palette.length} colors`}</Text></View>{count>0&&<View style={s.track}><View style={[s.fill,{width:`${percent}%`}]}/></View>}</View>
        </Pressable>;
      })}</View>
      {artwork.length === 0 && gridStatus === 'loading' && (
        <View style={s.empty}><ActivityIndicator accessibilityLabel="Loading pictures" /></View>
      )}
      {artwork.length === 0 && gridStatus === 'unavailable' && (
        <View style={s.empty}>
          <Text style={s.heroTitle}>Couldn’t load pictures</Text>
          <Pressable onPress={myArt ? handleRefresh : () => void paged.retry()} style={s.activeChip}>
            <Text style={{ color: 'white', padding: 14 }}>Try again</Text>
          </Pressable>
        </View>
      )}
      {artwork.length === 0 && gridStatus === 'ready' && <View style={s.empty}>
        <Text style={s.heroTitle}>{myArt ? 'A blank page, a fresh start' : 'No pictures yet'}</Text>
        {myArt && <>
          <Text style={s.subtitle}>Choose a picture from Home. Your progress will appear here automatically.</Text>
          <Pressable onPress={() => router.navigate('/(tabs)')} style={s.activeChip}>
            <Text style={{ color: 'white', padding: 14 }}>Explore pictures →</Text>
          </Pressable>
        </>}
      </View>}
      {!myArt && artwork.length > 0 && paged.loading && (
        <View style={s.more}><ActivityIndicator accessibilityLabel="Loading more pictures" /></View>
      )}
      {!myArt && artwork.length > 0 && paged.error && (
        <Pressable accessibilityRole="button" onPress={() => void paged.retry()} style={s.more}>
          <Text style={s.count}>Couldn’t load more pictures. Tap to try again.</Text>
        </Pressable>
      )}
      <Text style={s.footer}>Made for a slower, more colorful moment.</Text>
    </ScrollView>
  </SafeAreaView>;
}

const canvasTile = StyleSheet.create({
  card: {
    borderRadius: CANVAS_TILE_RADIUS,
    padding: CANVAS_TILE_PADDING,
    backgroundColor: '#FFFFFF',
    boxShadow: '0 2px 10px rgba(58, 42, 36, 0.07)',
  },
  art: {
    flex: 1,
    borderRadius: CANVAS_TILE_RADIUS - CANVAS_TILE_PADDING,
    overflow: 'hidden',
  },
  ribbon: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: 60,
    aspectRatio: 120 / 64,
    borderTopLeftRadius: CANVAS_TILE_RADIUS,
    overflow: 'hidden',
  },
});

const canvasHeader = StyleSheet.create({
  content: { paddingTop: 8 },
  container: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  copy: { flexShrink: 1 },
  subtitle: { color: '#838383', fontFamily: 'Poppins-Regular', fontSize: 12 },
  title: { color: '#3A3A3A', fontFamily: 'Fraunces-Regular', fontSize: 32, lineHeight: 36 },
  actions: { flexDirection: 'row', gap: 6 },
  icon: { width: 39, height: 39 },
  banners: { gap: BANNER_GAP, paddingTop: 23 },
});

const popularCard = StyleSheet.create({
  container: {
    aspectRatio: 590 / 292,
    minHeight: 158,
    backgroundColor: '#FFF3E9',
    borderRadius: POPULAR_CARD_RADIUS,
    overflow: 'hidden',
  },
  copy: {
    flex: 1,
    width: '47%',
    marginLeft: '6.8%',
    paddingTop: '7.5%',
    paddingBottom: '6.8%',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  title: {
    color: '#3A3A3A',
    fontFamily: 'Poppins-SemiBold',
    fontSize: 20,
    lineHeight: 24,
  },
  description: {
    color: '#838383',
    fontFamily: 'Poppins-Regular',
    fontSize: 15,
    lineHeight: 18,
    marginTop: 2,
  },
  button: {
    backgroundColor: '#3A3A3A',
    borderRadius: 24,
    paddingHorizontal: 18,
    paddingVertical: 5,
    marginTop: 8,
  },
  buttonLabel: {
    color: '#FFFFFF',
    fontFamily: 'Poppins-Regular',
    fontSize: 18,
    lineHeight: 23,
  },
  easel: {
    position: 'absolute',
    right: '7.8%',
    bottom: 0,
    width: '40.3%',
    aspectRatio: 238 / 266,
  },
  drawing: {
    position: 'absolute',
    top: '7.5%',
    bottom: '29.7%',
    left: '13.4%',
    right: '13.4%',
    borderBottomLeftRadius: 3,
    borderBottomRightRadius: 3,
    overflow: 'hidden',
  },
});
const s=StyleSheet.create({screen:{flex:1,backgroundColor:'#FAF8F5'},content:{padding:24,paddingBottom:115,maxWidth:1000,width:'100%',alignSelf:'center'},header:{flexDirection:'row',justifyContent:'space-between',alignItems:'center'},eyebrow:{fontSize:9,letterSpacing:1.5,color:'#8D8C90',fontFamily:'Poppins-Medium'},title:{fontSize:32,color:'#343347',fontFamily:'Fraunces-Regular',marginTop:8},flower:{fontSize:45,color:'#8D8BB0'},subtitle:{fontSize:12,color:'#898591',lineHeight:21,marginTop:8,fontFamily:'Poppins-Regular'},heroTitle:{fontFamily:'Fraunces-Regular',fontSize:25,color:'#45435A',marginVertical:9},filters:{gap:4,paddingVertical:24},chip:{paddingHorizontal:12,paddingVertical:10,borderRadius:24},activeChip:{backgroundColor:'#77718F',borderRadius:24},chipText:{fontSize:14,color:'#838383',fontFamily:'Poppins-Medium'},section:{flexDirection:'row',alignItems:'center',justifyContent:'space-between'},sectionTitle:{fontFamily:'Poppins-SemiBold',fontSize:13,color:'#494554'},count:{fontSize:10,color:'#99909A'},grid:{flexDirection:'row',flexWrap:'wrap',gap:14,marginTop:18},card:{backgroundColor:'white',borderRadius:17,overflow:'hidden',borderWidth:1,borderColor:'#F0ECE7'},art:{aspectRatio:1,backgroundColor:'white'},cardBody:{padding:12},cardTitle:{fontFamily:'Poppins-Medium',fontSize:11,color:'#494452',marginBottom:7},cardMeta:{fontSize:9,color:'#9A929D'},track:{height:3,backgroundColor:'#EFEBF3',marginTop:10,borderRadius:3},fill:{height:3,backgroundColor:'#8D88A6',borderRadius:3},empty:{paddingVertical:45,alignItems:'center',gap:15},more:{paddingVertical:22,alignItems:'center'},footer:{textAlign:'center',color:'#ADA5AF',fontSize:10,marginTop:35}});
