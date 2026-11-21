import { Directory, File, Paths } from 'expo-file-system';
import { useEffect, useState } from 'react';
import { Platform } from 'react-native';

import { catalogKey, catalogUrl } from './catalog-config';
import type { ArtRegion, NumberArt } from './number-art';

type DrawingRow = {
  id: string;
  title: string;
  category_id: string;
  category_label?: string | null;
  outline_path: string | null;
  size: number | null;
  line_width: number | null;
  palette: string[];
  regions: ArtRegion[];
  extra_category_ids: string[];
};

/** Full page data for one picture. Cached on the device after the first open, so it works offline. */
export type FullDrawing = NumberArt & { categoryIds: string[] };

const PREFIX = 'catalog-drawing-';
const memory = new Map<string, FullDrawing>();
let warmed = false;

function cacheFile(id: string) {
  return new File(Paths.document, `${PREFIX}${encodeURIComponent(id)}.json`);
}

function outlineSource(path: string | null) {
  if (!path) return undefined;
  const encodedPath = path.split('/').map(encodeURIComponent).join('/');
  return { uri: `${catalogUrl}/storage/v1/object/public/color-catalog/${encodedPath}` };
}

function toFull(row: DrawingRow): FullDrawing {
  if (!row.palette?.length || !row.regions?.length) throw new Error('Invalid catalog drawing');
  return {
    id: row.id,
    title: row.title,
    category: row.category_label ?? '',
    categoryIds: [row.category_id, ...(row.extra_category_ids ?? [])],
    size: row.size ?? undefined,
    lineWidth: row.line_width ?? undefined,
    palette: row.palette,
    regions: row.regions,
    outline: outlineSource(row.outline_path),
  };
}

function parse(raw: string | null | undefined): FullDrawing | undefined {
  if (!raw) return undefined;
  try {
    const art = JSON.parse(raw) as FullDrawing;
    return art?.regions?.length ? art : undefined;
  } catch {
    return undefined;
  }
}

function readCached(id: string): FullDrawing | undefined {
  const hit = memory.get(id);
  if (hit) return hit;
  try {
    const raw = Platform.OS === 'web'
      ? globalThis.localStorage?.getItem(`${PREFIX}${id}`)
      : (cacheFile(id).exists ? cacheFile(id).textSync() : null);
    const art = parse(raw);
    if (art) memory.set(id, art);
    return art;
  } catch {
    return undefined;
  }
}

function writeCached(art: FullDrawing) {
  memory.set(art.id, art);
  try {
    const raw = JSON.stringify(art);
    if (Platform.OS === 'web') globalThis.localStorage?.setItem(`${PREFIX}${art.id}`, raw);
    else cacheFile(art.id).write(raw);
  } catch {
    // Kept in memory for this session.
  }
}

/** Loads every previously opened picture from the device into memory (once per app run). */
export function warmDrawingCache() {
  if (warmed) return;
  warmed = true;
  try {
    if (Platform.OS === 'web') {
      const storage = globalThis.localStorage;
      for (let index = 0; index < storage.length; index += 1) {
        const key = storage.key(index);
        if (key?.startsWith(PREFIX)) readCached(key.slice(PREFIX.length));
      }
      return;
    }
    for (const entry of new Directory(Paths.document).list()) {
      const name = entry.name;
      if (entry instanceof File && name.startsWith(PREFIX) && name.endsWith('.json')) {
        readCached(decodeURIComponent(name.slice(PREFIX.length, -'.json'.length)));
      }
    }
  } catch {
    // Nothing cached yet.
  }
}

/** Pictures opened at least once: lets My Art and completion sync include paged pictures. */
export function cachedDrawings(): FullDrawing[] {
  return [...memory.values()];
}

async function fetchDrawing(id: string, signal?: AbortSignal): Promise<FullDrawing | null> {
  const response = await fetch(`${catalogUrl}/rest/v1/rpc/get_catalog_drawing`, {
    method: 'POST',
    headers: { apikey: catalogKey, 'Content-Type': 'application/json' },
    body: JSON.stringify({ p_id: id }),
    signal,
  });
  if (!response.ok) throw new Error('Drawing request failed');
  const row = await response.json() as DrawingRow | null;
  if (!row) return null;
  const art = toFull(row);
  writeCached(art);
  return art;
}

/**
 * Loads one picture for the coloring screen. A cached copy shows immediately;
 * the server copy replaces it when it arrives. `skip` = the caller already has the picture.
 */
export function useCatalogDrawing(id: string | undefined, skip = false) {
  const [attempt, setAttempt] = useState(0);
  const [art, setArt] = useState<FullDrawing | undefined>(() => (id && !skip ? readCached(id) : undefined));
  const [status, setStatus] = useState<'loading' | 'ready' | 'missing' | 'unavailable'>(() => (art ? 'ready' : 'loading'));

  useEffect(() => {
    if (!id || skip) return;
    let active = true;
    const controller = new AbortController();
    const cached = readCached(id);
    if (cached) { setArt(cached); setStatus('ready'); } else setStatus('loading');
    fetchDrawing(id, controller.signal)
      .then((fresh) => {
        if (!active) return;
        if (fresh) { setArt(fresh); setStatus('ready'); } else if (!cached) setStatus('missing');
      })
      .catch(() => { if (active && !cached) setStatus('unavailable'); });
    return () => { active = false; controller.abort(); };
  }, [id, skip, attempt]);

  return { art, status, retry: () => setAttempt((value) => value + 1) };
}
