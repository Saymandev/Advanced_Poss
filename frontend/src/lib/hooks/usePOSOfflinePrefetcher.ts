'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { getSnapshot } from '../offline/db';
import { PrefetchResult, runPOSPrefetch, SNAPSHOT_KEYS } from '../offline/posPrefetcher';
import { useAppSelector } from '../store';

export interface POSOfflineState {
  isOfflineReady: boolean;    // True when at least menu + payment methods are cached
  isSyncing: boolean;         // True while a prefetch is running
  lastSyncedAt: number | null; // Unix timestamp of last successful full sync
  syncErrors: string[];       // Any endpoints that failed during last sync
  syncNow: (forceRefresh?: boolean) => Promise<void>; // Manual trigger
}

export const usePOSOfflinePrefetcher = (): POSOfflineState => {
  const { user, companyContext } = useAppSelector((state) => state.auth);
  const [isOfflineReady, setIsOfflineReady] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncedAt, setLastSyncedAt] = useState<number | null>(null);
  const [syncErrors, setSyncErrors] = useState<string[]>([]);
  const hasRunRef = useRef(false); // prevent double-run in React StrictMode

  const branchId: string =
    (user as any)?.branchId ||
    (companyContext as any)?.branchId ||
    (companyContext as any)?.branches?.[0]?._id ||
    (companyContext as any)?.branches?.[0]?.id ||
    '';

  const companyId: string =
    (user as any)?.companyId ||
    (companyContext as any)?.companyId ||
    '';

  // Check if we already have usable offline data (don't wait for a new sync)
  const checkExistingSnapshot = useCallback(async () => {
    const [menuSnap, paymentSnap] = await Promise.all([
      getSnapshot(SNAPSHOT_KEYS.MENU_ITEMS),
      getSnapshot(SNAPSHOT_KEYS.PAYMENT_METHODS),
    ]);
    // As long as we have menu items and payment methods (even stale), POS is functional offline
    if (menuSnap && paymentSnap) {
      setIsOfflineReady(true);
      setLastSyncedAt(menuSnap.savedAt);
    }
  }, []);

  const syncNow = useCallback(async (forceRefresh = false) => {
    if (!branchId || !companyId) return;
    if (typeof window === 'undefined' || !window.navigator.onLine) return;
    if (isSyncing) return;

    setIsSyncing(true);
    setSyncErrors([]);

    try {
      const summary = await runPOSPrefetch({
        branchId,
        companyId,
        forceRefresh,
        onProgress: (result: PrefetchResult) => {
          if (!result.success) {
            setSyncErrors(prev => [...prev, `${result.key}: ${result.error}`]);
          }
        },
      });

      const successKeys = summary.results.filter(r => r.success).map(r => r.key);
      const hasCore = successKeys.includes(SNAPSHOT_KEYS.MENU_ITEMS) &&
                      successKeys.includes(SNAPSHOT_KEYS.PAYMENT_METHODS);
      if (hasCore || isOfflineReady) {
        setIsOfflineReady(true);
        setLastSyncedAt(summary.completedAt);
      }

      if (summary.hasErrors) {
        console.warn('[POS Offline] Some prefetch endpoints failed:', summary.results.filter(r => !r.success));
      }
    } catch (error) {
      console.error('[POS Offline] Prefetch crashed:', error);
    } finally {
      setIsSyncing(false);
    }
  }, [branchId, companyId, isSyncing, isOfflineReady]);

  // On mount: check existing snapshot, then trigger a background sync if needed
  useEffect(() => {
    if (!branchId || !companyId) return;
    if (hasRunRef.current) return;
    hasRunRef.current = true;

    checkExistingSnapshot();
    // Kick off background sync (TTL-aware, won't re-fetch fresh data)
    syncNow(false);
  }, [branchId, companyId, checkExistingSnapshot, syncNow]);

  // Re-sync when coming back online
  useEffect(() => {
    const handleOnline = () => {
      syncNow(false);
    };
    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, [syncNow]);

  // Periodic background refresh for tables (most dynamic data)
  // Tables have 5-min TTL so this runs every 4.5 minutes while online
  useEffect(() => {
    if (!branchId || !companyId) return;
    const interval = setInterval(() => {
      if (window.navigator.onLine) {
        syncNow(false); // TTL-aware, only fetches what's stale
      }
    }, 4.5 * 60 * 1000); // 4.5 minutes
    return () => clearInterval(interval);
  }, [branchId, companyId, syncNow]);

  return { isOfflineReady, isSyncing, lastSyncedAt, syncErrors, syncNow };
};
