import { IDBPDatabase, openDB } from 'idb';
import { CreatePOSOrderRequest } from '../api/endpoints/posApi';

const DB_NAME = 'restogo-pos-offline-db';
const DB_VERSION = 1;

export const STORES = {
  CATALOG_CACHE: 'catalogCache',
  SYNC_QUEUE: 'syncQueue',
} as const;

export interface CachedData<T = any> {
  key: string;
  data: T;
  timestamp: number;
}

export interface QueuedOrder {
  id: string; // Internal UUID for the offline queue
  payload: CreatePOSOrderRequest;
  status: 'pending' | 'syncing' | 'failed';
  createdAt: string;
  error?: string;
  retryCount: number;
}

let dbPromise: Promise<IDBPDatabase> | null = null;

export const getDB = async () => {
  if (typeof window === 'undefined') return null;

  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(STORES.CATALOG_CACHE)) {
          db.createObjectStore(STORES.CATALOG_CACHE, { keyPath: 'key' });
        }
        if (!db.objectStoreNames.contains(STORES.SYNC_QUEUE)) {
          const queueStore = db.createObjectStore(STORES.SYNC_QUEUE, { keyPath: 'id' });
          queueStore.createIndex('status', 'status');
          queueStore.createIndex('createdAt', 'createdAt');
        }
      },
    });
  }
  return dbPromise;
};

// --- Cache Methods ---

export const saveToCache = async <T>(key: string, data: T): Promise<void> => {
  try {
    const db = await getDB();
    if (!db) return;
    
    await db.put(STORES.CATALOG_CACHE, {
      key,
      data,
      timestamp: Date.now(),
    });
  } catch (error) {
    console.error(`Failed to save cache for key ${key}:`, error);
  }
};

export const getFromCache = async <T>(key: string): Promise<T | null> => {
  try {
    const db = await getDB();
    if (!db) return null;
    
    const record = await db.get(STORES.CATALOG_CACHE, key) as CachedData<T>;
    return record ? record.data : null;
  } catch (error) {
    console.error(`Failed to read cache for key ${key}:`, error);
    return null;
  }
};

// --- Sync Queue Methods ---

export const enqueueOfflineOrder = async (payload: CreatePOSOrderRequest): Promise<string> => {
  try {
    const db = await getDB();
    if (!db) throw new Error('DB not initialized');
    
    const id = crypto.randomUUID();
    const order: QueuedOrder = {
      id,
      payload,
      status: 'pending',
      createdAt: new Date().toISOString(),
      retryCount: 0,
    };
    
    await db.put(STORES.SYNC_QUEUE, order);
    return id;
  } catch (error) {
    console.error('Failed to enqueue offline order:', error);
    throw error;
  }
};

export const getPendingOfflineOrders = async (): Promise<QueuedOrder[]> => {
  try {
    const db = await getDB();
    if (!db) return [];
    
    return await db.getAllFromIndex(STORES.SYNC_QUEUE, 'status', 'pending');
  } catch (error) {
    console.error('Failed to get pending offline orders:', error);
    return [];
  }
};

export const updateOfflineOrderStatus = async (id: string, updates: Partial<QueuedOrder>): Promise<void> => {
  try {
    const db = await getDB();
    if (!db) return;
    
    const order = await db.get(STORES.SYNC_QUEUE, id) as QueuedOrder | undefined;
    if (order) {
      await db.put(STORES.SYNC_QUEUE, { ...order, ...updates });
    }
  } catch (error) {
    console.error(`Failed to update offline order ${id}:`, error);
  }
};

export const removeOfflineOrder = async (id: string): Promise<void> => {
  try {
    const db = await getDB();
    if (!db) return;
    
    await db.delete(STORES.SYNC_QUEUE, id);
  } catch (error) {
    console.error(`Failed to remove offline order ${id}:`, error);
  }
};
