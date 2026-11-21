import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { catalogKey, catalogUrl } from './catalog-config';
import type { ArtRegion, NumberArt } from './number-art';

export const CATALOG_PAGE_SIZE = 24;

type LightRow = {
  id: string;
  title: string;
  category_id: string;
  outline_path: string | null;
  size: number | null;
  line_width: number | null;
  added_at: string | null;
};

type VectorThumbnail = { id: string; regions: ArtRegion[]; palette: string[] };
type PageRow = LightRow & Partial<Pick<VectorThumbnail, 'regions' | 'palette'>>;

export type CatalogListItem = NumberArt & {
  addedAt: string | null;
};

function outlineSource(path: string | null) {
  if (!path) return undefined;
  const encodedPath = path.split('/').map(encodeURIComponent).join('/');
  return { uri: `${catalogUrl}/storage/v1/object/public/color-catalog/${encodedPath}` };
}

function toItem(row: PageRow, labels: Map<string, string>): CatalogListItem {
  return {
    id: row.id,
    title: row.title,
    category: labels.get(row.category_id) ?? '',
    size: row.size ?? undefined,
    lineWidth: row.line_width ?? undefined,
    palette: row.palette ?? [],
    regions: row.regions ?? [],
    outline: outlineSource(row.outline_path),
    addedAt: row.added_at,
  };
}

async function fetchCatalogPage(category: string | null, offset: number) {
  const endpoint = `${catalogUrl}/rest/v1/catalog_drawings`;
  const columns = 'id,title,category_id,outline_path,size,line_width,added_at';
  const query = new URLSearchParams({
    select: columns,
    is_published: 'eq.true',
    order: 'added_at.desc.nullslast,sort_order.asc,id.asc',
    limit: String(CATALOG_PAGE_SIZE),
    offset: String(offset),
  });
  if (category !== null) {
    query.set('select', `${columns},matching:catalog_drawing_categories()`);
    query.set('matching.category_id', `eq.${category}`);
    query.set('or', `(category_id.eq.${category},matching.not.is.null)`);
  }

  const headers = { apikey: catalogKey };
  const response = await fetch(`${endpoint}?${query}`, { headers: { ...headers, Prefer: 'count=exact' } });
  if (!response.ok) throw new Error('Catalog page request failed');
  const rows: LightRow[] = await response.json();
  const total = Number(response.headers.get('content-range')?.split('/')[1]);
  if (!Number.isInteger(total) || total < 0) throw new Error('Catalog count is unavailable');

  // Download vector paths only for cards without an outline image.
  const missingOutlines = rows.filter((row) => !row.outline_path).map((row) => row.id);
  if (missingOutlines.length === 0) return { rows, total };

  const vectorQuery = new URLSearchParams({ select: 'id,regions,palette', id: `in.(${missingOutlines.join(',')})` });
  const vectorResponse = await fetch(`${endpoint}?${vectorQuery}`, { headers });
  if (!vectorResponse.ok) throw new Error('Catalog thumbnail request failed');
  const vectors: VectorThumbnail[] = await vectorResponse.json();
  const byId = new Map(vectors.map((vector) => [vector.id, vector]));
  return { rows: rows.map((row) => ({ ...row, ...byId.get(row.id) })), total };
}

type PageState = { rows: PageRow[]; total: number | null; loading: boolean; error: boolean };
const emptyState: PageState = { rows: [], total: null, loading: false, error: false };

/**
 * Pages through the published catalog for one category (null = All).
 * `loadMore` is safe to call repeatedly (e.g. on every scroll event): it does nothing while a page is
 * in flight, after an error, or once everything is loaded. Responses for a previous category are discarded.
 */
export function usePagedDrawings(category: string | null, labels: Map<string, string>, enabled = true) {
  const [state, setState] = useState<PageState>(emptyState);
  const live = useRef(state);
  const request = useRef(0);

  const commit = useCallback((next: PageState) => {
    live.current = next;
    setState(next);
  }, []);

  const loadPage = useCallback(async (reset: boolean) => {
    if (!enabled) return;
    const current = live.current;
    if (!reset && (current.loading || current.error || (current.total !== null && current.rows.length >= current.total))) return;
    const id = ++request.current;
    const offset = reset ? 0 : current.rows.length;
    commit(reset ? { ...emptyState, loading: true } : { ...current, loading: true, error: false });
    try {
      const page = await fetchCatalogPage(category, offset);
      if (id !== request.current) return;
      const base = reset ? [] : live.current.rows;
      const seen = new Set(base.map((row) => row.id));
      commit({ rows: [...base, ...page.rows.filter((row) => !seen.has(row.id))], total: page.total, loading: false, error: false });
    } catch {
      if (id !== request.current) return;
      commit({ ...live.current, loading: false, error: true });
    }
  }, [category, enabled, commit]);

  useEffect(() => {
    void loadPage(true);
  }, [loadPage]);

  const items = useMemo(() => state.rows.map((row) => toItem(row, labels)), [state.rows, labels]);
  const hasMore = state.total === null || state.rows.length < state.total;
  const loadMore = useCallback(() => loadPage(false), [loadPage]);
  const refresh = useCallback(() => loadPage(true), [loadPage]);
  const retry = useCallback(() => {
    if (live.current.rows.length === 0) return loadPage(true);
    commit({ ...live.current, error: false });
    return loadPage(false);
  }, [loadPage, commit]);

  return { items, total: state.total, loading: state.loading, error: state.error, hasMore, loadMore, retry, refresh };
}
