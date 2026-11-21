import { File, Paths } from 'expo-file-system';
import { Platform } from 'react-native';

export type ArtProgress = Record<string, string[]>;
export const FREE_HINTS = 3;
const PROGRESS_KEY = 'color-by-number-v1';
const HINTS_KEY = 'color-by-number-hints-v1';

function readEntries(key: string): [string, unknown][] {
  try {
    const file = Platform.OS === 'web' ? null : new File(Paths.document, `${key}.json`);
    const raw = file ? (file.exists ? file.textSync() : '{}') : globalThis.localStorage?.getItem(key) ?? '{}';
    const data: unknown = JSON.parse(raw);
    if (!data || typeof data !== 'object' || Array.isArray(data)) return [];
    return Object.entries(data);
  } catch {
    return [];
  }
}

function writeRecord(key: string, data: Record<string, string[] | number>) {
  if (Platform.OS === 'web') {
    globalThis.localStorage.setItem(key, JSON.stringify(data));
    return;
  }
  const file = new File(Paths.document, `${key}.json`);
  if (!file.exists) file.create({ intermediates: true });
  file.write(JSON.stringify(data));
}

export function loadProgress(): ArtProgress {
  return Object.fromEntries(readEntries(PROGRESS_KEY).filter((entry): entry is [string, string[]] => (
    Array.isArray(entry[1]) && entry[1].every((id) => typeof id === 'string')
  )));
}

export function saveProgress(id: string, regions: string[]) {
  writeRecord(PROGRESS_KEY, { ...loadProgress(), [id]: regions });
}

function loadHintUses() {
  return new Map(readEntries(HINTS_KEY).filter((entry): entry is [string, number] => {
    const count = entry[1];
    return typeof count === 'number' && Number.isInteger(count) && count >= 0 && count <= FREE_HINTS;
  }));
}

export function loadHintsRemaining(id: string) {
  return FREE_HINTS - (loadHintUses().get(id) ?? 0);
}

export function spendDrawingHint(id: string) {
  const used = loadHintUses();
  const count = used.get(id) ?? 0;
  if (count >= FREE_HINTS) return { applied: false, remaining: 0 };

  used.set(id, count + 1);
  writeRecord(HINTS_KEY, Object.fromEntries(used));
  return { applied: true, remaining: FREE_HINTS - count - 1 };
}
