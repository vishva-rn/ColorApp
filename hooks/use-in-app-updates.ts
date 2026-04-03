import Constants from 'expo-constants';
import { useCallback, useEffect, useRef } from 'react';
import { Alert, AppState, AppStateStatus, InteractionManager, Linking, Platform } from 'react-native';
import type { NeedsUpdateResponse } from 'sp-react-native-in-app-updates';

type InAppUpdatesInstance = {
  checkNeedsUpdate: (options?: { curVersion?: string }) => Promise<NeedsUpdateResponse>;
};

type InAppUpdatesCtor = new (isDebug: boolean) => InAppUpdatesInstance;

let inAppUpdatesInstance: InAppUpdatesInstance | null = null;
const UPDATE_CHECK_THROTTLE_MS = 60_000;
let isChecking = false;
let lastCheckedAt = 0;

function getInAppUpdatesInstance() {
  if (!inAppUpdatesInstance) {
    // Lazily require to avoid loading native module on unsupported platforms.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const SpInAppUpdates = require('sp-react-native-in-app-updates').default as InAppUpdatesCtor;
    inAppUpdatesInstance = new SpInAppUpdates(__DEV__);
  }

  return inAppUpdatesInstance;
}

async function openStoreListing(result: NeedsUpdateResponse) {
  if (Platform.OS === 'ios') {
    const appStoreUrl = 'trackViewUrl' in result.other ? result.other.trackViewUrl : undefined;
    if (appStoreUrl) {
      await Linking.openURL(appStoreUrl);
      return;
    }

    const bundleId = Constants.expoConfig?.ios?.bundleIdentifier;
    if (!bundleId) {
      return;
    }

    const deepLinkUrl = `itms-apps://itunes.apple.com/app/${bundleId}`;
    const webUrl = `https://apps.apple.com/app/${bundleId}`;
    const supported = await Linking.canOpenURL(deepLinkUrl);
    await Linking.openURL(supported ? deepLinkUrl : webUrl);
    return;
  }

  if (Platform.OS === 'android') {
    const packageName = Constants.expoConfig?.android?.package;
    if (!packageName) {
      return;
    }

    const deepLinkUrl = `market://details?id=${packageName}`;
    const webUrl = `https://play.google.com/store/apps/details?id=${packageName}`;
    const supported = await Linking.canOpenURL(deepLinkUrl);
    await Linking.openURL(supported ? deepLinkUrl : webUrl);
  }
}

export function useInAppUpdates(options?: { enableLifecycleChecks?: boolean }) {
  const enableLifecycleChecks = options?.enableLifecycleChecks ?? true;
  const appState = useRef(AppState.currentState);

  const checkAndPromptUpdate = useCallback(async (options?: { bypassThrottle?: boolean }) => {
    if (Platform.OS === 'web') {
      return;
    }

    if (isChecking) {
      return;
    }

    const now = Date.now();
    const bypassThrottle = options?.bypassThrottle ?? false;
    if (!bypassThrottle && now - lastCheckedAt < UPDATE_CHECK_THROTTLE_MS) {
      return;
    }

    isChecking = true;
    lastCheckedAt = now;

    try {
      const inAppUpdates = getInAppUpdatesInstance();
      const curVersion = Constants.expoConfig?.version;
      const result = await inAppUpdates.checkNeedsUpdate({ curVersion });

      if (result?.shouldUpdate) {
        Alert.alert(
          'Update Required',
          `A new version is available on the ${Platform.OS === 'ios' ? 'App Store' : 'Play Store'}. Please update to continue.`,
          [
            {
              text: 'Update Now',
              onPress: () => {
                void openStoreListing(result).catch((error) => {
                  console.error('Failed to open store listing:', error);
                });
              },
            },
          ],
          { cancelable: false }
        );
      }
    } catch (error) {
      console.error('Error checking for updates:', error);
    } finally {
      isChecking = false;
    }
  }, []);

  useEffect(() => {
    if (Platform.OS === 'web' || !enableLifecycleChecks) {
      return;
    }

    const subscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
      if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
        setTimeout(() => {
          void checkAndPromptUpdate();
        }, 1000);
      }
      appState.current = nextAppState;
    });

    InteractionManager.runAfterInteractions(() => {
      setTimeout(() => {
        void checkAndPromptUpdate();
      }, Platform.OS === 'ios' ? 3000 : 2000);
    });

    return () => {
      subscription.remove();
    };
  }, [checkAndPromptUpdate, enableLifecycleChecks]);

  return {
    checkAndPromptUpdate,
  };
}

export default useInAppUpdates;
