import { File, Paths } from 'expo-file-system';

export type DrawingHistoryItem = {
  id: string;
  imageUri: string;
  drawingPath: string;
  createdAt: string;
  svgUrl?: string;
  pngUrl?: string;
  drawingPaths?: unknown[];
};

const HISTORY_FILE = new File(Paths.document, 'drawing-history.json');
const MAX_HISTORY_ITEMS = 100;

function sanitizeHistoryItem(value: unknown): DrawingHistoryItem | null {
  if (!value || typeof value !== 'object') return null;

  const candidate = value as Partial<DrawingHistoryItem>;
  if (!candidate.id || !candidate.imageUri || !candidate.createdAt) return null;

  return {
    id: candidate.id,
    imageUri: candidate.imageUri,
    drawingPath: candidate.drawingPath ?? candidate.imageUri,
    createdAt: candidate.createdAt,
    svgUrl: candidate.svgUrl,
    pngUrl: candidate.pngUrl,
    drawingPaths: Array.isArray(candidate.drawingPaths) ? candidate.drawingPaths : undefined,
  };
}

function readHistorySync(): DrawingHistoryItem[] {
  try {
    if (!HISTORY_FILE.exists) return [];
    const content = HISTORY_FILE.textSync();
    const parsed = JSON.parse(content);
    if (!Array.isArray(parsed)) return [];

    return parsed
      .map(sanitizeHistoryItem)
      .filter((item): item is DrawingHistoryItem => item !== null);
  } catch (error) {
    console.error('[drawing-history] read error', error);
    return [];
  }
}

function writeHistorySync(items: DrawingHistoryItem[]) {
  const payload = JSON.stringify(items, null, 2);
  if (!HISTORY_FILE.exists) {
    HISTORY_FILE.create({ intermediates: true });
  }
  HISTORY_FILE.write(payload);
}

export async function getDrawingHistory(): Promise<DrawingHistoryItem[]> {
  return readHistorySync();
}

export async function getDrawingHistoryItemById(id: string): Promise<DrawingHistoryItem | null> {
  const items = readHistorySync();
  return items.find((item) => item.id === id) ?? null;
}

export async function addDrawingToHistory({
  imageUri,
  drawingPath,
  svgUrl,
  pngUrl,
  drawingPaths,
}: {
  imageUri: string;
  drawingPath?: string;
  svgUrl?: string;
  pngUrl?: string;
  drawingPaths?: unknown[];
}): Promise<DrawingHistoryItem> {
  const nextItem: DrawingHistoryItem = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
    imageUri,
    drawingPath: drawingPath ?? imageUri,
    createdAt: new Date().toISOString(),
    svgUrl,
    pngUrl,
    drawingPaths,
  };

  const existing = readHistorySync();
  const nextItems = [nextItem, ...existing].slice(0, MAX_HISTORY_ITEMS);
  writeHistorySync(nextItems);
  return nextItem;
}

export async function upsertDrawingHistoryItem({
  id,
  imageUri,
  drawingPath,
  svgUrl,
  pngUrl,
  drawingPaths,
}: {
  id?: string;
  imageUri: string;
  drawingPath?: string;
  svgUrl?: string;
  pngUrl?: string;
  drawingPaths?: unknown[];
}): Promise<DrawingHistoryItem> {
  const existing = readHistorySync();
  const existingIndex = id ? existing.findIndex((item) => item.id === id) : -1;

  if (existingIndex === -1) {
    return addDrawingToHistory({ imageUri, drawingPath, svgUrl, pngUrl, drawingPaths });
  }

  const previous = existing[existingIndex];
  const updated: DrawingHistoryItem = {
    ...previous,
    imageUri,
    drawingPath: drawingPath ?? imageUri,
    svgUrl: svgUrl ?? previous.svgUrl,
    pngUrl: pngUrl ?? previous.pngUrl,
    drawingPaths,
  };

  const nextItems = [...existing];
  nextItems[existingIndex] = updated;
  writeHistorySync(nextItems);
  return updated;
}

export async function removeDrawingHistoryItem(id: string): Promise<void> {
  const existing = readHistorySync();
  const nextItems = existing.filter((item) => item.id !== id);
  writeHistorySync(nextItems);
}
