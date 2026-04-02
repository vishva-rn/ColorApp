import { File, Paths } from 'expo-file-system';

export type OnboardingPrefs = {
  completed: boolean;
  artCategory?: string;
  palette?: string;
  brush?: string;
  completedAt?: string;
};

const ONBOARDING_PREFS_FILE = new File(Paths.document, 'onboarding-prefs.json');

const DEFAULT_PREFS: OnboardingPrefs = {
  completed: false,
};

export async function getOnboardingPrefs(): Promise<OnboardingPrefs> {
  try {
    if (!ONBOARDING_PREFS_FILE.exists) {
      return DEFAULT_PREFS;
    }

    const content = ONBOARDING_PREFS_FILE.textSync();
    const parsed = JSON.parse(content) as Partial<OnboardingPrefs>;

    return {
      completed: Boolean(parsed.completed),
      artCategory: parsed.artCategory,
      palette: parsed.palette,
      brush: parsed.brush,
      completedAt: parsed.completedAt,
    };
  } catch (error) {
    console.error('[onboarding-prefs] read:error', error);
    return DEFAULT_PREFS;
  }
}

export async function saveOnboardingPrefs(update: Partial<OnboardingPrefs>): Promise<OnboardingPrefs> {
  const current = await getOnboardingPrefs();
  const next: OnboardingPrefs = {
    ...current,
    ...update,
  };

  const payload = JSON.stringify(next, null, 2);
  if (!ONBOARDING_PREFS_FILE.exists) {
    ONBOARDING_PREFS_FILE.create({ intermediates: true });
  }
  ONBOARDING_PREFS_FILE.write(payload);
  return next;
}

export async function markOnboardingCompleted(update?: Partial<OnboardingPrefs>): Promise<OnboardingPrefs> {
  return saveOnboardingPrefs({
    ...update,
    completed: true,
    completedAt: new Date().toISOString(),
  });
}
