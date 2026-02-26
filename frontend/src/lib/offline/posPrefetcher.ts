/**
 * POS Offline Prefetch Service (Enterprise Grade)
 *
 * Fetches ALL data required for the POS to work offline.
 * - No pagination: Uses large limits to get everything.
 * - Auth via httpOnly cookies (credentials: 'include').
 * - Structured storage in IndexedDB `posSnapshot` store.
 * - TTL-aware: only re-fetches when data is stale.
 */

import { isSnapshotFresh, saveSnapshot, TTL } from './db';

const getApiBase = () =>
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1';

// ─── Snapshot Keys ────────────────────────────────────────────────────────────
export const SNAPSHOT_KEYS = {
  MENU_ITEMS: 'menuItems',
  CATEGORIES: 'categories',
  PAYMENT_METHODS: 'paymentMethods',
  STAFF: 'staff',
  TABLES: 'tables',
  POS_SETTINGS: 'posSettings',
  DELIVERY_ZONES: 'deliveryZones',
  CUSTOMERS: 'customers',
} as const;

export type SnapshotKey = (typeof SNAPSHOT_KEYS)[keyof typeof SNAPSHOT_KEYS];

// ─── Result types ─────────────────────────────────────────────────────────────
export interface PrefetchResult {
  key: SnapshotKey;
  success: boolean;
  count?: number;
  error?: string;
}

export interface PrefetchSummary {
  results: PrefetchResult[];
  startedAt: number;
  completedAt: number;
  hasErrors: boolean;
}

// ─── Internal fetch helper ────────────────────────────────────────────────────
const fetchJson = async (url: string): Promise<any> => {
  const response = await fetch(url, {
    method: 'GET',
    credentials: 'include', // httpOnly auth cookies
    headers: { 'Content-Type': 'application/json' },
  });
  if (!response.ok) {
    throw new Error(`HTTP ${response.status} from ${url}`);
  }
  const json = await response.json();
  // Handle both { data: {...} } and raw response shapes
  return json?.data ?? json;
};

// ─── Per-endpoint fetchers ────────────────────────────────────────────────────

const fetchMenuItems = async (branchId: string): Promise<PrefetchResult> => {
  try {
    const params = new URLSearchParams({ limit: '9999', isAvailable: 'true' });
    if (branchId) params.set('branchId', branchId);
    const raw = await fetchJson(`${getApiBase()}/pos/menu-items?${params}`);
    const items = raw?.menuItems || raw?.items || (Array.isArray(raw) ? raw : []);
    await saveSnapshot(SNAPSHOT_KEYS.MENU_ITEMS, items, TTL.MENU_ITEMS);
    return { key: SNAPSHOT_KEYS.MENU_ITEMS, success: true, count: items.length };
  } catch (error: any) {
    return { key: SNAPSHOT_KEYS.MENU_ITEMS, success: false, error: error.message };
  }
};

const fetchCategories = async (branchId: string): Promise<PrefetchResult> => {
  try {
    const params = new URLSearchParams({ limit: '9999' });
    if (branchId) params.set('branchId', branchId);
    const raw = await fetchJson(`${getApiBase()}/categories?${params}`);
    const items = raw?.categories || (Array.isArray(raw) ? raw : []);
    await saveSnapshot(SNAPSHOT_KEYS.CATEGORIES, items, TTL.CATEGORIES);
    return { key: SNAPSHOT_KEYS.CATEGORIES, success: true, count: items.length };
  } catch (error: any) {
    return { key: SNAPSHOT_KEYS.CATEGORIES, success: false, error: error.message };
  }
};

const fetchPaymentMethods = async (companyId: string, branchId: string): Promise<PrefetchResult> => {
  try {
    // Use the branch-specific endpoint (the correct one POS actually uses)
    const url = companyId && branchId
      ? `${getApiBase()}/payment-methods/branch/${companyId}/${branchId}`
      : `${getApiBase()}/payment-methods`;
    const raw = await fetchJson(url);
    const items = raw?.paymentMethods || (Array.isArray(raw) ? raw : []);
    await saveSnapshot(SNAPSHOT_KEYS.PAYMENT_METHODS, items, TTL.PAYMENT_METHODS);
    return { key: SNAPSHOT_KEYS.PAYMENT_METHODS, success: true, count: items.length };
  } catch (error: any) {
    return { key: SNAPSHOT_KEYS.PAYMENT_METHODS, success: false, error: error.message };
  }
};

const fetchStaff = async (companyId: string, branchId: string): Promise<PrefetchResult> => {
  try {
    const params = new URLSearchParams({ limit: '9999', status: 'active' });
    if (companyId) params.set('companyId', companyId);
    if (branchId) params.set('branchId', branchId);
    const raw = await fetchJson(`${getApiBase()}/users?${params}`);
    const items = raw?.users || (Array.isArray(raw) ? raw : []);
    await saveSnapshot(SNAPSHOT_KEYS.STAFF, items, TTL.STAFF);
    return { key: SNAPSHOT_KEYS.STAFF, success: true, count: items.length };
  } catch (error: any) {
    return { key: SNAPSHOT_KEYS.STAFF, success: false, error: error.message };
  }
};

const fetchTables = async (branchId: string): Promise<PrefetchResult> => {
  try {
    const params = new URLSearchParams();
    if (branchId) params.set('branchId', branchId);
    const raw = await fetchJson(`${getApiBase()}/pos/tables/available?${params}`);
    
    // Handle all potential response shapes
    let items = [];
    if (Array.isArray(raw)) {
      items = raw;
    } else if (raw?.tables && Array.isArray(raw.tables)) {
      items = raw.tables;
    } else if (raw?.items && Array.isArray(raw.items)) {
      items = raw.items;
    } else if (raw?.data && Array.isArray(raw.data)) {
      items = raw.data;
    } else if (raw?.data?.tables && Array.isArray(raw.data.tables)) {
      items = raw.data.tables;
    }
    
    await saveSnapshot(SNAPSHOT_KEYS.TABLES, items, TTL.TABLES);
    return { key: SNAPSHOT_KEYS.TABLES, success: true, count: items.length };
  } catch (error: any) {
    return { key: SNAPSHOT_KEYS.TABLES, success: false, error: error.message };
  }
};

const fetchPOSSettings = async (branchId: string): Promise<PrefetchResult> => {
  try {
    const params = new URLSearchParams();
    if (branchId) params.set('branchId', branchId);
    const raw = await fetchJson(`${getApiBase()}/pos/settings?${params}`);
    await saveSnapshot(SNAPSHOT_KEYS.POS_SETTINGS, raw, TTL.POS_SETTINGS);
    return { key: SNAPSHOT_KEYS.POS_SETTINGS, success: true };
  } catch (error: any) {
    return { key: SNAPSHOT_KEYS.POS_SETTINGS, success: false, error: error.message };
  }
};

const fetchDeliveryZones = async (branchId: string): Promise<PrefetchResult> => {
  try {
    if (!branchId) return { key: SNAPSHOT_KEYS.DELIVERY_ZONES, success: true, count: 0 };
    const raw = await fetchJson(`${getApiBase()}/delivery-zones?branchId=${branchId}&limit=999`);
    const items = raw?.deliveryZones || (Array.isArray(raw) ? raw : []);
    await saveSnapshot(SNAPSHOT_KEYS.DELIVERY_ZONES, items, TTL.DELIVERY_ZONES);
    return { key: SNAPSHOT_KEYS.DELIVERY_ZONES, success: true, count: items.length };
  } catch (error: any) {
    return { key: SNAPSHOT_KEYS.DELIVERY_ZONES, success: false, error: error.message };
  }
};

const fetchCustomers = async (): Promise<PrefetchResult> => {
  try {
    // Fetch first 1000 customers for offline search — more than enough for most businesses
    const raw = await fetchJson(`${getApiBase()}/customers?limit=1000&page=1`);
    const items = raw?.customers || (Array.isArray(raw) ? raw : []);
    await saveSnapshot(SNAPSHOT_KEYS.CUSTOMERS, items, TTL.CUSTOMERS);
    return { key: SNAPSHOT_KEYS.CUSTOMERS, success: true, count: items.length };
  } catch (error: any) {
    return { key: SNAPSHOT_KEYS.CUSTOMERS, success: false, error: error.message };
  }
};

// ─── Main Prefetch Orchestrator ───────────────────────────────────────────────

export interface PrefetchContext {
  branchId: string;
  companyId: string;
  forceRefresh?: boolean;
  onProgress?: (result: PrefetchResult) => void;
}

export const runPOSPrefetch = async (ctx: PrefetchContext): Promise<PrefetchSummary> => {
  const startedAt = Date.now();
  const { branchId, companyId, forceRefresh = false, onProgress } = ctx;

  // Helper: skip if still fresh (unless forceRefresh)
  const shouldSkip = async (key: SnapshotKey, ttl: number): Promise<boolean> => {
    if (forceRefresh) return false;
    return isSnapshotFresh(key, ttl);
  };

  const runFetcher = async (
    key: SnapshotKey,
    ttl: number,
    fetcher: () => Promise<PrefetchResult>
  ): Promise<PrefetchResult> => {
    if (await shouldSkip(key, ttl)) {
      const skipped: PrefetchResult = { key, success: true, count: -1 }; // -1 = served from cache
      onProgress?.(skipped);
      return skipped;
    }
    const result = await fetcher();
    onProgress?.(result);
    return result;
  };

  // Run all fetchers — tables in parallel with the rest
  // but we run them concurrently for speed
  const results = await Promise.allSettled([
    runFetcher(SNAPSHOT_KEYS.MENU_ITEMS, TTL.MENU_ITEMS, () => fetchMenuItems(branchId)),
    runFetcher(SNAPSHOT_KEYS.CATEGORIES, TTL.CATEGORIES, () => fetchCategories(branchId)),
    runFetcher(SNAPSHOT_KEYS.PAYMENT_METHODS, TTL.PAYMENT_METHODS, () => fetchPaymentMethods(companyId, branchId)),
    runFetcher(SNAPSHOT_KEYS.STAFF, TTL.STAFF, () => fetchStaff(companyId, branchId)),
    runFetcher(SNAPSHOT_KEYS.TABLES, TTL.TABLES, () => fetchTables(branchId)),
    runFetcher(SNAPSHOT_KEYS.POS_SETTINGS, TTL.POS_SETTINGS, () => fetchPOSSettings(branchId)),
    runFetcher(SNAPSHOT_KEYS.DELIVERY_ZONES, TTL.DELIVERY_ZONES, () => fetchDeliveryZones(branchId)),
    runFetcher(SNAPSHOT_KEYS.CUSTOMERS, TTL.CUSTOMERS, () => fetchCustomers()),
  ]);

  const finalResults: PrefetchResult[] = results.map((r, i) => {
    const keys = Object.values(SNAPSHOT_KEYS);
    if (r.status === 'fulfilled') return r.value;
    return { key: keys[i] as SnapshotKey, success: false, error: (r.reason as Error)?.message };
  });

  return {
    results: finalResults,
    startedAt,
    completedAt: Date.now(),
    hasErrors: finalResults.some(r => !r.success),
  };
};
