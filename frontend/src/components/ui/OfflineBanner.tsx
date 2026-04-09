'use client';
import { ArrowPathIcon, SignalSlashIcon, WifiIcon } from '@heroicons/react/24/outline';
import { format } from 'date-fns';
import { useEffect, useState } from 'react';

interface OfflineBannerProps {
  isOfflineReady: boolean;
  isSyncing: boolean;
  lastSyncedAt: number | null;
  pendingCount: number;
  syncErrors: string[];
  onSyncNow: () => void;
}

export function OfflineBanner({
  isOfflineReady,
  isSyncing,
  lastSyncedAt,
  pendingCount,
  syncErrors,
  onSyncNow,
}: OfflineBannerProps) {
  const [isOnline, setIsOnline] = useState(
    typeof window !== 'undefined' ? window.navigator.onLine : true
  );

  useEffect(() => {
    const onOnline = () => setIsOnline(true);
    const onOffline = () => setIsOnline(false);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, []);

  // When online and no pending orders and no errors, show nothing
  if (isOnline && pendingCount === 0 && syncErrors.length === 0 && !isSyncing) return null;

  // Show syncing indicator when online and syncing background snapshot
  if (isOnline && isSyncing) {
    return (
      <div className="flex items-center gap-2 px-4 py-2 bg-blue-500/10 border-b border-blue-500/20 text-blue-400 text-xs">
        <ArrowPathIcon className="h-3.5 w-3.5 animate-spin shrink-0" />
        <span>Syncing offline data in background…</span>
      </div>
    );
  }

  // Show sync warning if we have errors (e.g. tablet sync failed)
  if (isOnline && syncErrors.length > 0) {
    const formatSyncErrors = (errors: string[]) => {
      if (!errors || errors.length === 0) return '';
      
      const cleanedErrors = errors.map(err => {
        // 1. Handle "resource: HTTP 403 from https://..." pattern
        const resourceMatch = err.match(/^([^:]+):/);
        const resource = resourceMatch ? resourceMatch[1] : 'data';
        
        if (err.includes('HTTP 403')) return `${resource}: Access Denied`;
        if (err.includes('HTTP 401')) return `${resource}: Unauthorized`;
        if (err.includes('HTTP 404')) return `${resource}: Not Found`;
        if (err.includes('HTTP 500')) return `${resource}: Server Error`;
        if (err.includes('Network Error')) return `${resource}: Network Error`;
        
        // 2. Fallback: truncate long messages and remove URLs
        let cleaned = err.split(' from https://')[0]; // Remove URL part
        if (cleaned.length > 40) cleaned = cleaned.substring(0, 37) + '...';
        return cleaned;
      });

      // 3. Limit visible errors to 2, then say "+ X more"
      const MAX_VISIBLE = 4;
      if (cleanedErrors.length <= MAX_VISIBLE) {
        return cleanedErrors.join(', ');
      }
      return `${cleanedErrors.slice(0, MAX_VISIBLE).join(', ')} and ${cleanedErrors.length - MAX_VISIBLE} more`;
    };

    return (
      <div className="flex items-center justify-between gap-2 px-4 py-2 bg-rose-500/10 border-b border-rose-500/20 text-rose-400 text-xs">
        <div className="flex items-center gap-2 overflow-hidden">
          <SignalSlashIcon className="h-3.5 w-3.5 shrink-0" />
          <span className="truncate whitespace-nowrap">Warning: Some data failed to sync ({formatSyncErrors(syncErrors)}).</span>
        </div>
        <button
          onClick={onSyncNow}
          className="flex items-center gap-1 px-2 py-0.5 rounded bg-rose-500/20 hover:bg-rose-500/30 transition-colors shrink-0"
        >
          <ArrowPathIcon className="h-3 w-3" />
          Retry Sync
        </button>
      </div>
    );
  }


  // Show sync success with pending orders when came back online
  if (isOnline && pendingCount > 0) {
    return (
      <div className="flex items-center justify-between gap-2 px-4 py-2 bg-amber-500/10 border-b border-amber-500/20 text-amber-400 text-xs">
        <div className="flex items-center gap-2">
          <WifiIcon className="h-3.5 w-3.5 shrink-0" />
          <span>
            Back online — <strong>{pendingCount} offline order{pendingCount !== 1 ? 's' : ''}</strong> syncing now…
          </span>
        </div>
        <button
          onClick={onSyncNow}
          className="flex items-center gap-1 px-2 py-0.5 rounded bg-amber-500/20 hover:bg-amber-500/30 transition-colors"
        >
          <ArrowPathIcon className="h-3 w-3" />
          Sync now
        </button>
      </div>
    );
  }

  // Offline mode banner
  if (!isOnline) {
    return (
      <div className="flex items-center justify-between gap-2 px-4 py-2.5 bg-rose-600/15 border-b border-rose-500/30 text-rose-300 text-xs">
        <div className="flex items-center gap-3">
          <SignalSlashIcon className="h-4 w-4 shrink-0 text-rose-400" />
          <div>
            <span className="font-semibold text-rose-200">Offline Mode</span>
            {isOfflineReady ? (
              <span className="text-rose-400 ml-2">
                Serving cached data
                {lastSyncedAt && ` (snapshot from ${format(new Date(lastSyncedAt), 'h:mm a')})`}
              </span>
            ) : (
              <span className="text-rose-400 ml-2">No offline data available — connect to internet to load data</span>
            )}
          </div>
        </div>
        {pendingCount > 0 && (
          <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-rose-500/20 text-rose-300">
            <span className="font-bold">{pendingCount}</span>
            <span>order{pendingCount !== 1 ? 's' : ''} pending sync</span>
          </div>
        )}
      </div>
    );
  }

  return null;
}
