import { File, Paths } from 'expo-file-system';
import { uuid } from 'expo-modules-core';
import { Platform } from 'react-native';

import { catalogKey, catalogUrl } from './catalog-config';
import type { NumberArt } from './number-art';
import { loadProgress } from './number-progress';

type CompletionState = {
  installationId: string;
  pending: string[];
  synced: string[];
};

const storageKey = 'color-catalog-completions-v1.json';
let state: CompletionState | undefined;

function loadState() {
  if (state) return state;
  const file = Platform.OS === 'web' ? null : new File(Paths.document, storageKey);
  const raw = file ? (file.exists ? file.textSync() : null) : globalThis.localStorage?.getItem(storageKey);
  state = raw ? JSON.parse(raw) as CompletionState : {
    installationId: uuid.v4(),
    pending: [],
    synced: [],
  };
  return state;
}

function saveState(current: CompletionState) {
  const raw = JSON.stringify(current);
  if (Platform.OS === 'web') globalThis.localStorage.setItem(storageKey, raw);
  else new File(Paths.document, storageKey).write(raw);
}

export function queueCatalogCompletion(drawingId: string) {
  const current = loadState();
  if (!current.synced.includes(drawingId) && !current.pending.includes(drawingId)) {
    current.pending.push(drawingId);
    saveState(current);
  }
}

export async function syncCatalogCompletions(drawings: NumberArt[], signal: AbortSignal) {
  const current = loadState();
  const progress = loadProgress();
  for (const drawing of drawings) {
    const filled = new Set(progress[drawing.id]);
    if (filled.size >= drawing.regions.length && drawing.regions.every(({ id }) => filled.has(id))) {
      queueCatalogCompletion(drawing.id);
    }
  }
  if (!current.pending.length) return false;

  const published = new Set(drawings.map(({ id }) => id));
  const pending = current.pending.filter((id) => published.has(id));
  if (!pending.length) return false;

  // Persist the installation ID before submitting so retries use the same ID.
  saveState(current);
  let synced = false;
  for (let offset = 0; offset < pending.length; offset += 100) {
    const response = await fetch(`${catalogUrl}/rest/v1/rpc/record_catalog_completions`, {
      method: 'POST',
      headers: { apikey: catalogKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        p_installation_id: current.installationId,
        p_drawing_ids: pending.slice(offset, offset + 100),
      }),
      signal,
    });
    if (!response.ok) break;
    const accepted = new Set<string>(await response.json());
    if (!accepted.size) continue;
    current.pending = current.pending.filter((id) => !accepted.has(id));
    current.synced.push(...accepted);
    saveState(current);
    synced = true;
  }
  return synced;
}
