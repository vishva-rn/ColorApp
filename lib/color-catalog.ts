import { File, Paths } from 'expo-file-system';
import { useEffect, useSyncExternalStore } from 'react';
import { AppState, Platform } from 'react-native';

import { queueCatalogCompletion, syncCatalogCompletions } from './catalog-completions';
import { catalogKey, catalogUrl } from './catalog-config';
import { INTEREST_ART } from './interest-art';
import { MOSAIC_SUNRISE } from './mosaic-sunrise';
import type { ArtGradient, ArtRegion, NumberArt } from './number-art';
import { loadProgress } from './number-progress';
import { cachedDrawings, warmDrawingCache } from './catalog-drawing';

type CategoryRow = {
  id: string;
  label: string;
  image_path: string | null;
};

type DrawingRow = {
  id: string;
  title: string;
  category_id: string;
  outline_path: string | null;
  size: number | null;
  line_width: number | null;
  palette: string[];
  regions: ArtRegion[];
  extra_category_ids: string[];
  completed_count?: number;
  added_at?: string;
};

type DailyChallengeRow = {
  challenge_date: string;
  catalog_drawing_id?: string | null;
  outline_path?: string | null;
  title: string;
  size: number;
  palette: string[];
  gradients?: ArtGradient[] | null;
  regions: ArtRegion[];
  featured_art?: {
    id: string;
    title: string;
    palette: string[];
    gradients: ArtGradient[];
    regions: ArtRegion[];
    details: string[];
  } | null;
};

type CatalogData = {
  categories: CategoryRow[];
  drawings: DrawingRow[];
  daily_challenges?: DailyChallengeRow[];
};
export type DailyChallenge = NumberArt & { challengeDate: string };
type CachedCatalog = CatalogData & { savedDrawings?: (DrawingRow & { categoryLabel: string })[] };
type CatalogCategory = { id: string; label: string; image?: { uri: string } };
type CatalogDrawing = NumberArt & {
  categoryIds: string[];
  completedCount: number;
  addedAt: string | null;
};
type Catalog = {
  status: 'loading' | 'ready' | 'unavailable';
  categories: CatalogCategory[];
  drawings: CatalogDrawing[];
  dailyChallenges: DailyChallenge[];
  history: NumberArt[];
};

// Keep older vector drawings available for existing progress in History.
const legacyHistory = [...INTEREST_ART, MOSAIC_SUNRISE];
const initialCatalog: Catalog = {
  status: 'loading',
  categories: [],
  drawings: [],
  dailyChallenges: [],
  history: legacyHistory,
};

const cacheKey = 'color-catalog-v1.json';
const listeners = new Set<() => void>();
let catalog = initialCatalog;
let cachedData: CachedCatalog | undefined;
let cacheLoaded = false;
let lastRefresh = 0;
let pendingRefresh: Promise<void> | undefined;

function imageSource(path: string | null) {
  if (!path) return undefined;
  const encodedPath = path.split('/').map(encodeURIComponent).join('/');
  return { uri: `${catalogUrl}/storage/v1/object/public/color-catalog/${encodedPath}` };
}

function toDrawing(row: DrawingRow, label: string): CatalogDrawing {
  if (!row.palette?.length || !row.regions?.length || !Array.isArray(row.extra_category_ids)) {
    throw new Error('Invalid catalog drawing');
  }
  return {
    id: row.id,
    title: row.title,
    category: label,
    categoryIds: [row.category_id, ...row.extra_category_ids],
    size: row.size ?? undefined,
    lineWidth: row.line_width ?? undefined,
    palette: row.palette,
    regions: row.regions,
    outline: imageSource(row.outline_path),
    completedCount: row.completed_count ?? 0,
    addedAt: row.added_at ?? null,
  };
}

function dailyPaletteGradients(palette: string[]): ArtGradient[] {
  return palette.map((color) => {
    if (!/^#[0-9a-f]{6}$/i.test(color)) return [color, color];

    const rgb = [1, 3, 5].map((offset) => parseInt(color.slice(offset, offset + 2), 16));
    const blend = (target: number[], amount: number) => '#' + rgb.map((channel, index) => (
      Math.round(channel + (target[index] - channel) * amount).toString(16).padStart(2, '0')
    )).join('');

    return [blend([255, 249, 229], 0.35), blend([45, 35, 66], 0.18)];
  });
}

function toCatalog(data: CachedCatalog): Catalog {
  const categories = data.categories.map((row) => ({
    id: row.id,
    label: row.label,
    image: imageSource(row.image_path),
  }));
  const labels = new Map(categories.map(({ id, label }) => [id, label]));
  const drawings = data.drawings.map((row) => {
    const label = labels.get(row.category_id);
    if (!label) throw new Error('Missing catalog category');
    return toDrawing(row, label);
  });
  const dailyRows = data.daily_challenges ?? [];
  const originalChallenges = dailyRows.map((row): DailyChallenge => {
    // A daily row with its own outline PNG is drawn like a catalog page: outline image over the regions.
    const outline = imageSource(row.outline_path ?? null);
    if (outline) {
      return {
        id: `daily-${row.challenge_date}-${row.catalog_drawing_id ?? 'outline'}`,
        challengeDate: row.challenge_date,
        title: row.title,
        category: 'Daily Challenge',
        size: row.size,
        palette: row.palette,
        gradients: row.gradients ?? dailyPaletteGradients(row.palette),
        regions: row.regions,
        outline,
      };
    }
    return {
      id: `daily-${row.challenge_date}`,
      challengeDate: row.challenge_date,
      title: row.title,
      category: 'Daily Challenge',
      size: row.size,
      lineWidth: row.gradients ? 1.45 : 2.2,
      palette: row.palette,
      gradients: row.gradients ?? undefined,
      regions: row.regions,
    };
  });
  const drawingsById = new Map(drawings.map((drawing) => [drawing.id, drawing]));
  const previousChallenges = originalChallenges.map((challenge, index): DailyChallenge => {
    if (dailyRows[index].outline_path) return challenge;
    const sourceId = dailyRows[index].catalog_drawing_id;
    const source = sourceId ? drawingsById.get(sourceId) : undefined;
    if (!source?.outline) return challenge;

    return {
      ...source,
      id: `${challenge.id}-${source.id}`,
      challengeDate: challenge.challengeDate,
      category: challenge.category,
      gradients: dailyPaletteGradients(source.palette),
    };
  });
  const dailyChallenges = previousChallenges.map((challenge, index): DailyChallenge => {
    const artwork = dailyRows[index].featured_art;
    if (!artwork || dailyRows[index].outline_path) return challenge;

    return {
      ...artwork,
      id: `daily-${challenge.challengeDate}-${artwork.id}`,
      challengeDate: challenge.challengeDate,
      category: challenge.category,
      size: 300,
      lineWidth: 1.3,
    };
  });
  const saved = (data.savedDrawings ?? []).map((row) => toDrawing(row, row.categoryLabel));
  const history = new Map<string, NumberArt>();
  for (const art of [...drawings, ...dailyChallenges, ...previousChallenges, ...originalChallenges, ...saved, ...legacyHistory]) {
    if (!history.has(art.id)) history.set(art.id, art);
  }
  return { status: 'ready', categories, drawings, dailyChallenges, history: [...history.values()] };
}

function readCache() {
  if (cacheLoaded) return;
  cacheLoaded = true;
  try {
    const file = Platform.OS !== 'web' ? new File(Paths.document, cacheKey) : null;
    const raw = file ? (file.exists ? file.textSync() : null) : globalThis.localStorage?.getItem(cacheKey);
    if (raw) {
      const parsed = JSON.parse(raw) as CachedCatalog;
      catalog = toCatalog(parsed);
      cachedData = parsed;
    }
  } catch {
    // A fresh fetch can still load the catalog.
  }
}

function saveCache(data: CachedCatalog) {
  try {
    const raw = JSON.stringify(data);
    if (Platform.OS === 'web') {
      globalThis.localStorage?.setItem(cacheKey, raw);
    } else {
      new File(Paths.document, cacheKey).write(raw);
    }
  } catch {
    // The live catalog stays available in memory.
  }
}

function retainStartedDrawings(data: CatalogData) {
  const progress = loadProgress();
  const active = new Set(data.drawings.map(({ id }) => id));
  const oldCategories = new Map(cachedData?.categories.map(({ id, label }) => [id, label]));
  const oldDrawings = (cachedData?.drawings ?? []).map((drawing) => ({
    ...drawing,
    categoryLabel: oldCategories.get(drawing.category_id) ?? '',
  }));
  return [...(cachedData?.savedDrawings ?? []), ...oldDrawings].filter(({ id }) =>
    !active.has(id) && Boolean(progress[id]?.length),
  );
}

function publishCatalog(next: Catalog) {
  catalog = next;
  listeners.forEach((listener) => listener());
}

export function refreshColorCatalog(force = false): Promise<void> {
  if (pendingRefresh) return pendingRefresh;
  if (!force && Date.now() - lastRefresh < 30_000) return Promise.resolve();

  readCache();
  if (catalog.status === 'unavailable') publishCatalog(initialCatalog);
  lastRefresh = Date.now();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12_000);
  pendingRefresh = (async () => {
    try {
      const fetchCatalog = async () => {
        const response = await fetch(`${catalogUrl}/rest/v1/rpc/get_color_catalog`, {
          method: 'POST',
          headers: { apikey: catalogKey, 'Content-Type': 'application/json' },
          body: '{}',
          signal: controller.signal,
        });
        if (!response.ok) throw new Error('Catalog request failed');
        const data = await response.json() as CatalogData;
        const next = { ...data, savedDrawings: retainStartedDrawings(data) };
        const nextCatalog = toCatalog(next);
        saveCache(next);
        cachedData = next;
        publishCatalog(nextCatalog);
      };

      await fetchCatalog();
      warmDrawingCache();
      if (await syncCatalogCompletions([...catalog.drawings, ...cachedDrawings()], controller.signal)) {
        await fetchCatalog();
      }
    } catch {
      if (catalog.status === 'loading') {
        publishCatalog({ ...initialCatalog, status: 'unavailable' });
      }
    } finally {
      clearTimeout(timeout);
      pendingRefresh = undefined;
    }
  })();
  return pendingRefresh;
}

export function reportCatalogCompletion(drawingId: string) {
  readCache();
  if (!catalog.drawings.some(({ id }) => id === drawingId) && !cachedDrawings().some(({ id }) => id === drawingId)) return;

  try {
    queueCatalogCompletion(drawingId);
  } catch {
    // The next refresh can recover the completion from saved coloring progress.
  }

  // An in-flight refresh may already have taken its snapshot of queued completions.
  void Promise.resolve(pendingRefresh).then(() => refreshColorCatalog(true));
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

function getSnapshot() {
  readCache();
  return catalog;
}

export function useColorCatalog() {
  const snapshot = useSyncExternalStore(subscribe, getSnapshot, () => initialCatalog);

  useEffect(() => {
    void refreshColorCatalog();
    const listener = AppState.addEventListener('change', (state) => {
      if (state === 'active') void refreshColorCatalog();
    });
    return () => listener.remove();
  }, []);

  return snapshot;
}
