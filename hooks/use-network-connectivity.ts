import NetInfo, { NetInfoState } from '@react-native-community/netinfo';
import { useCallback, useEffect, useState } from 'react';

/**
 * Hook to monitor network connectivity
 * @returns isConnected - boolean | null (null = still checking)
 */
export function useNetworkConnectivity() {
  const [isConnected, setIsConnected] = useState<boolean | null>(null);
  
  const resolveConnectivity = useCallback((state: NetInfoState): boolean => {
    if (!state.isConnected) return false;
    if (state.isInternetReachable === false) return false;
    return true;
  }, []);

  const refreshConnectivity = useCallback(async () => {
    const state = await NetInfo.fetch();
    setIsConnected(resolveConnectivity(state));
  }, [resolveConnectivity]);

  useEffect(() => {
    // Get initial network state
    refreshConnectivity().catch(() => {
      setIsConnected(false);
    });

    // Subscribe to network state changes
    const unsubscribe = NetInfo.addEventListener((state: NetInfoState) => {
      setIsConnected(resolveConnectivity(state));
    });

    return () => unsubscribe();
  }, [refreshConnectivity, resolveConnectivity]);

  return {
    isConnected,
    refreshConnectivity,
  };
}
