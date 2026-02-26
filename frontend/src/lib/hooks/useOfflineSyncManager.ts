import { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { useDispatch } from 'react-redux';
import { posApi } from '../api/endpoints/posApi';
import { getPendingOfflineOrders, removeOfflineOrder, updateOfflineOrderStatus } from '../offline/db';
import { AppDispatch } from '../store';

export const useOfflineSyncManager = () => {
  const dispatch = useDispatch<AppDispatch>();
  const [isSyncing, setIsSyncing] = useState(false);
  const syncLockRef = useCallback(() => {
    // We use a ref to track sync status across renders to prevent race conditions
    // but we also keep isSyncing state for UI indicators.
    return (window as any)._posSyncInProgress === true;
  }, []);
  const setSyncLock = (val: boolean) => {
    (window as any)._posSyncInProgress = val;
    setIsSyncing(val);
  };
  const [pendingCount, setPendingCount] = useState(0);

  const checkPendingOrders = useCallback(async () => {
    try {
      const orders = await getPendingOfflineOrders();
      setPendingCount(orders.length);
    } catch (error) {
      console.error('Failed to check pending orders', error);
    }
  }, []);

  const syncOrders = useCallback(async () => {
    if (!window.navigator.onLine || syncLockRef()) {
      if (syncLockRef()) console.log('[Sync] Skip: Sync already in progress');
      return;
    }
    
    try {
      setSyncLock(true);
      const orders = await getPendingOfflineOrders();
      
      if (orders.length === 0) {
        return;
      }

      console.log(`[Sync] Starting sync for ${orders.length} tasks...`);
      let successCount = 0;
      toast.loading(`Syncing ${orders.length} offline orders...`, { id: 'sync-orders' });

      for (const task of orders) {
        try {
          await updateOfflineOrderStatus(task.id, { status: 'syncing' });
          
          if (task.type === 'PROCESS_PAYMENT') {
            // Standalone payment for existing server order
            await dispatch(posApi.endpoints.processPayment.initiate(task.payload)).unwrap();
          } else {
            // New order (might include payment data if it was merged)
            await dispatch(posApi.endpoints.createPOSOrder.initiate(task.payload)).unwrap();
          }
          
          // Success, remove from queue
          await removeOfflineOrder(task.id);
          successCount++;
        } catch (error) {
          console.error(`Failed to sync task ${task.id} (${task.type})`, error);
          await updateOfflineOrderStatus(task.id, { 
            status: 'failed', 
            retryCount: (task.retryCount || 0) + 1,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      }

      if (successCount > 0) {
        toast.success(`Successfully synced ${successCount} offline transactions!`, { id: 'sync-orders' });
        dispatch(posApi.util.invalidateTags(['POS', 'Order', 'Table', 'Transactions', 'Payment']));
      } else {
        toast.error('Failed to sync offline orders. Will retry later.', { id: 'sync-orders' });
      }
      
      checkPendingOrders();
    } catch (error) {
      console.error('Error during sync process', error);
      toast.dismiss('sync-orders');
    } finally {
      setSyncLock(false);
    }
  }, [dispatch, syncLockRef, checkPendingOrders]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleOnline = () => {
      toast.success('Internet connection restored!');
      syncOrders();
    };

    const handleOffline = () => {
      toast.error('You are offline. POS orders will be saved locally and synced later.', { duration: 5000 });
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    checkPendingOrders();
    
    if (window.navigator.onLine) {
      syncOrders();
    }

    // Set up an interval to constantly check pending orders locally so UI syncs correctly.
    const interval = setInterval(() => {
      checkPendingOrders();
    }, 10000);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(interval);
    };
  }, [syncOrders, checkPendingOrders]);

  return { isOnline: typeof window !== 'undefined' ? window.navigator.onLine : true, isSyncing, pendingCount, syncOrders };
};
