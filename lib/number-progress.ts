import { File, Paths } from 'expo-file-system';
import { Platform } from 'react-native';
export type ArtProgress = Record<string, string[]>;
const KEY = 'color-by-number-v1';
export function loadProgress(): ArtProgress {
  try {
    const file = Platform.OS === 'web' ? null : new File(Paths.document, `${KEY}.json`);
    const raw = file ? (file.exists ? file.textSync() : '{}') : globalThis.localStorage?.getItem(KEY) ?? '{}';
    const data: unknown = JSON.parse(raw);
    if (!data || typeof data !== 'object' || Array.isArray(data)) return {};
    return Object.fromEntries(Object.entries(data).filter(([,v])=>Array.isArray(v) && v.every(x=>typeof x==='string')));
  } catch { return {}; }
}
export function saveProgress(id: string, regions: string[]) {
  const data = {...loadProgress(), [id]: regions};
  if (Platform.OS === 'web') { globalThis.localStorage.setItem(KEY, JSON.stringify(data)); return; }
  const file = new File(Paths.document, `${KEY}.json`);
  if (!file.exists) file.create({intermediates:true});
  file.write(JSON.stringify(data));
}
