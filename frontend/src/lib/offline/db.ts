import { IDBPDatabase, openDB } from 'idb';
import { CreatePOSOrderRequest } from '../api/endpoints/posApi';

const DB_NAME = 'raha-pos-offline-db';
const DB_VERSION = 2; // bumped to trigger schema upgrade

// Default TTL in milliseconds
export const TTL = {
  MENU_ITEMS: 8 * 60 * 60 * 1000,       // 8 hours
  CATEGORIES: 24 * 60 * 60 * 1000,      // 24 hours
  PAYMENT_METHODS: 24 * 60 * 60 * 1000, // 24 hours
  POS_SETTINGS: 12 * 60 * 60 * 1000,    // 12 hours
  STAFF: 24 * 60 * 60 * 1000,           // 24 hours
  TABLES: 5 * 60 * 1000,                // 5 minutes (dynamic)
  DELIVERY_ZONES: 24 * 60 * 60 * 1000,  // 24 hours
  CUSTOMERS: 12 * 60 * 60 * 1000,       // 12 hours
  GENERIC: 8 * 60 * 60 * 1000,          // 8 hours default
};

export const STORES = {
  CATALOG_CACHE: 'catalogCache',  // Generic API response cache (keyed by URL)
  SYNC_QUEUE: 'syncQueue',        // Offline order queue
  POS_SNAPSHOT: 'posSnapshot',    // Structured POS data (our prefetcher uses this)
  SNAPSHOT_META: 'snapshotMeta',  // Tracks last sync time per data type
} as const;

export interface CachedData<T = any> {
  key: string;
  data: T;
  timestamp: number;
  ttl?: number; // ms — if omitted, never expires (legacy)
}

export interface QueuedOrder {
  id: string;
  type: 'CREATE_ORDER' | 'PROCESS_PAYMENT';
  payload: any;
  status: 'pending' | 'syncing' | 'failed';
  createdAt: string;
  error?: string;
  retryCount: number;
}

export interface SnapshotEntry<T = any> {
  key: string;      // e.g. 'menuItems', 'categories'
  data: T;
  savedAt: number;  // unix timestamp
  ttl: number;      // ms
}

let dbPromise: Promise<IDBPDatabase> | null = null;

export const getDB = async (): Promise<IDBPDatabase | null> => {
  if (typeof window === 'undefined') return null;
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db, oldVersion) {
        // v1 stores
        if (!db.objectStoreNames.contains(STORES.CATALOG_CACHE)) {
          db.createObjectStore(STORES.CATALOG_CACHE, { keyPath: 'key' });
        }
        if (!db.objectStoreNames.contains(STORES.SYNC_QUEUE)) {
          const queueStore = db.createObjectStore(STORES.SYNC_QUEUE, { keyPath: 'id' });
          queueStore.createIndex('status', 'status');
          queueStore.createIndex('createdAt', 'createdAt');
        }
        // v2 stores (new)
        if (oldVersion < 2) {
          if (!db.objectStoreNames.contains(STORES.POS_SNAPSHOT)) {
            db.createObjectStore(STORES.POS_SNAPSHOT, { keyPath: 'key' });
          }
          if (!db.objectStoreNames.contains(STORES.SNAPSHOT_META)) {
            db.createObjectStore(STORES.SNAPSHOT_META, { keyPath: 'key' });
          }
        }
      },
    });
  }
  return dbPromise;
};

// ─── Generic Cache (for API request caching) ─────────────────────────────────

export const saveToCache = async <T>(key: string, data: T, ttl = TTL.GENERIC): Promise<void> => {
  try {
    const db = await getDB();
    if (!db) return;
    await db.put(STORES.CATALOG_CACHE, { key, data, timestamp: Date.now(), ttl });
  } catch (error) {
    console.error(`[OfflineDB] Failed to save cache for key ${key}:`, error);
  }
};

export const getFromCache = async <T>(key: string): Promise<T | null> => {
  try {
    const db = await getDB();
    if (!db) return null;
    const record = await db.get(STORES.CATALOG_CACHE, key) as CachedData<T> | undefined;
    if (!record) return null;
    // TTL check — if a ttl is set and the record is expired, return null
    if (record.ttl && Date.now() - record.timestamp > record.ttl) {
      db.delete(STORES.CATALOG_CACHE, key).catch(() => {});
      return null;
    }
    return record.data;
  } catch (error) {
    console.error(`[OfflineDB] Failed to read cache for key ${key}:`, error);
    return null;
  }
};

export const clearExpiredCache = async (): Promise<void> => {
  try {
    const db = await getDB();
    if (!db) return;
    const all = await db.getAll(STORES.CATALOG_CACHE) as CachedData[];
    const now = Date.now();
    const keysToDelete = all
      .filter(r => r.ttl && now - r.timestamp > r.ttl)
      .map(r => r.key);
    await Promise.all(keysToDelete.map(k => db.delete(STORES.CATALOG_CACHE, k)));
  } catch (error) {
    console.error('[OfflineDB] Failed to clear expired cache:', error);
  }
};

// ─── POS Snapshot (structured, prefetched data) ───────────────────────────────

export const saveSnapshot = async <T>(key: string, data: T, ttl: number): Promise<void> => {
  try {
    const db = await getDB();
    if (!db) return;
    const entry: SnapshotEntry<T> = { key, data, savedAt: Date.now(), ttl };
    await db.put(STORES.POS_SNAPSHOT, entry);
  } catch (error) {
    console.error(`[OfflineDB] Failed to save snapshot for key ${key}:`, error);
  }
};

export const getSnapshot = async <T>(key: string): Promise<{ data: T; isFresh: boolean; savedAt: number } | null> => {
  try {
    const db = await getDB();
    if (!db) return null;
    const record = await db.get(STORES.POS_SNAPSHOT, key) as SnapshotEntry<T> | undefined;
    if (!record) return null;
    const isFresh = Date.now() - record.savedAt < record.ttl;
    return { data: record.data, isFresh, savedAt: record.savedAt };
  } catch (error) {
    console.error(`[OfflineDB] Failed to read snapshot for key ${key}:`, error);
    return null;
  }
};

export const getSnapshotAge = async (key: string): Promise<number | null> => {
  try {
    const db = await getDB();
    if (!db) return null;
    const record = await db.get(STORES.POS_SNAPSHOT, key) as SnapshotEntry | undefined;
    return record ? Date.now() - record.savedAt : null;
  } catch {
    return null;
  }
};

export const isSnapshotFresh = async (key: string, ttl: number): Promise<boolean> => {
  const age = await getSnapshotAge(key);
  return age !== null && age < ttl;
};

// ─── Sync Queue ───────────────────────────────────────────────────────────────

export const enqueueOfflineOrder = async (payload: CreatePOSOrderRequest): Promise<string> => {
  try {
    const db = await getDB();
    if (!db) throw new Error('DB not initialized');
    const id = crypto.randomUUID();
    const order: QueuedOrder = { 
      id, 
      type: 'CREATE_ORDER',
      payload, 
      status: 'pending', 
      createdAt: new Date().toISOString(), 
      retryCount: 0 
    };
    await db.put(STORES.SYNC_QUEUE, order);
    return id;
  } catch (error) {
    console.error('[OfflineDB] Failed to enqueue offline order:', error);
    throw error;
  }
};

export const enqueueOfflinePayment = async (payload: any): Promise<string> => {
  try {
    const db = await getDB();
    if (!db) throw new Error('DB not initialized');
    const id = crypto.randomUUID();
    const task: QueuedOrder = { 
      id, 
      type: 'PROCESS_PAYMENT',
      payload, 
      status: 'pending', 
      createdAt: new Date().toISOString(), 
      retryCount: 0 
    };
    await db.put(STORES.SYNC_QUEUE, task);
    return id;
  } catch (error) {
    console.error('[OfflineDB] Failed to enqueue offline payment:', error);
    throw error;
  }
};

/**
 * Finds a queued order by a temporary ID (like the offlineId generated in apiSlice)
 * This is useful for linking payments to orders that haven't been synced yet.
 */
export const findQueuedOrderById = async (id: string): Promise<QueuedOrder | null> => {
  try {
    const db = await getDB();
    if (!db) return null;
    return await db.get(STORES.SYNC_QUEUE, id) as QueuedOrder | undefined || null;
  } catch {
    return null;
  }
};

export const getPendingOfflineOrders = async (): Promise<QueuedOrder[]> => {
  try {
    const db = await getDB();
    if (!db) return [];
    return await db.getAllFromIndex(STORES.SYNC_QUEUE, 'status', 'pending');
  } catch (error) {
    console.error('[OfflineDB] Failed to get pending offline orders:', error);
    return [];
  }
};

export const updateOfflineOrderStatus = async (id: string, updates: Partial<QueuedOrder>): Promise<void> => {
  try {
    const db = await getDB();
    if (!db) return;
    const order = await db.get(STORES.SYNC_QUEUE, id) as QueuedOrder | undefined;
    if (order) await db.put(STORES.SYNC_QUEUE, { ...order, ...updates });
  } catch (error) {
    console.error(`[OfflineDB] Failed to update offline order ${id}:`, error);
  }
};

export const removeOfflineOrder = async (id: string): Promise<void> => {
  try {
    const db = await getDB();
    if (!db) return;
    await db.delete(STORES.SYNC_QUEUE, id);
  } catch (error) {
    console.error(`[OfflineDB] Failed to remove offline order ${id}:`, error);
  }
};

export const getOfflineOrderCount = async (): Promise<number> => {
  try {
    const orders = await getPendingOfflineOrders();
    return orders.length;
  } catch {
    return 0;
  }
};
