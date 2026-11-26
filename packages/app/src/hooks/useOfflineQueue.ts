import { useState, useEffect, useCallback } from 'react';
import { offlineSyncService } from '../services/offline-sync.service';

export function useOfflineQueue() {
  const [isOnline, setIsOnline] = useState<boolean>(() =>
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const [pendingCount, setPendingCount] = useState<number>(0);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    const unsubscribe = offlineSyncService.subscribe((count) => {
      setPendingCount(count);
    });

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      unsubscribe();
    };
  }, []);

  const syncNow = useCallback(async () => {
    setIsSyncing(true);
    try {
      return await offlineSyncService.syncAll();
    } finally {
      setIsSyncing(false);
    }
  }, []);

  return {
    isOnline,
    pendingCount,
    isSyncing,
    syncNow,
  };
}
