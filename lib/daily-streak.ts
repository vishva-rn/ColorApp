import { File, Paths } from 'expo-file-system';
import { Platform } from 'react-native';

const fileName = 'daily-challenge-streak-v1.json';

export function localDateKey(date = new Date()) {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

function readCompletedDays(): string[] {
  try {
    const file = Platform.OS === 'web' ? null : new File(Paths.document, fileName);
    const raw = file
      ? (file.exists ? file.textSync() : '[]')
      : (globalThis.localStorage.getItem(fileName) ?? '[]');
    const days: unknown = JSON.parse(raw);
    return Array.isArray(days) ? days.filter((day) => typeof day === 'string') : [];
  } catch {
    return [];
  }
}

export function recordDailyCompletion(challengeDate: string) {
  const now = new Date();
  if (challengeDate !== localDateKey(now)) return;

  const days = readCompletedDays();
  if (days.includes(challengeDate)) return;

  const completed = [...days, challengeDate];
  const raw = JSON.stringify(completed);
  if (Platform.OS === 'web') globalThis.localStorage.setItem(fileName, raw);
  else {
    const file = new File(Paths.document, fileName);
    if (!file.exists) file.create();
    file.write(raw);
  }
  return countStreak(completed, now);
}

export function loadDailyStreak(now = new Date()) {
  return countStreak(readCompletedDays(), now);
}

function countStreak(completed: string[], now: Date) {
  const days = new Set(completed);
  const date = new Date(now);
  if (!days.has(localDateKey(date))) date.setDate(date.getDate() - 1);

  let streak = 0;
  while (days.has(localDateKey(date))) {
    streak += 1;
    date.setDate(date.getDate() - 1);
  }
  return streak;
}
