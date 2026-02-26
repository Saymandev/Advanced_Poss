/**
 * POS Offline Prefetch Service (Enterprise Grade)
 *
 * Fetches ALL data required for the POS to work offline.
 * - No pagination: Uses large limits to get everything.
 * - Auth via httpOnly cookies (credentials: 'include').
 * - Structured storage in IndexedDB `posSnapshot` store.
 * - TTL-aware: only re-fetches when data is stale.
 */

import { decryptData } from '../utils/crypto';
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
  COMPANY_SETTINGS: 'companySettings', // New
  COMPANY_INFO: 'companyInfo',         // New
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
  const raw = await response.json();
  
  // Decrypt if the response is encrypted
  const decrypted = await decryptData(raw);
  
  // Handle the standard wrapped response shape { success: true, data: ... }
  // decrypted might already be the data if it was unwrapped during decryption
  if (decrypted && typeof decrypted === 'object' && 'success' in decrypted && 'data' in decrypted) {
    return decrypted.data;
  }
  
  return decrypted;
};

// ─── Helper to extract items from various response shapes ───────────────────
const extractItems = (raw: any, key: string): any[] => {
  if (Array.isArray(raw)) return raw;
  if (!raw || typeof raw !== 'object') return [];
  
  // Try common keys: .items, .data, .[key], .data.[key]
  if (Array.isArray(raw.items)) return raw.items;
  if (Array.isArray(raw.data)) return raw.data;
  if (Array.isArray(raw[key])) return raw[key];
  if (raw.data && Array.isArray(raw.data[key])) return raw.data[key];
  
  // If it's a single object that isn't an array, return it as a 1-item array if appropriate,
  // but usually we expect arrays for items/categories/etc.
  return [];
};

// ─── Per-endpoint fetchers ────────────────────────────────────────────────────

const fetchMenuItems = async (branchId: string, companyId: string): Promise<PrefetchResult> => {
  try {
    const params = new URLSearchParams({ limit: '9999', isAvailable: 'true' });
    if (branchId) params.set('branchId', branchId);
    if (companyId) params.set('companyId', companyId);
    const raw = await fetchJson(`${getApiBase()}/pos/menu-items?${params}`);
    const items = extractItems(raw, 'menuItems');
    await saveSnapshot(SNAPSHOT_KEYS.MENU_ITEMS, items, TTL.MENU_ITEMS);
    console.log(`[POS Offline] 📦 Prefetched ${items.length} menu items for branch ${branchId}`);
    return { key: SNAPSHOT_KEYS.MENU_ITEMS, success: true, count: items.length };
  } catch (error: any) {
    return { key: SNAPSHOT_KEYS.MENU_ITEMS, success: false, error: error.message };
  }
};

const fetchCategories = async (branchId: string, companyId: string): Promise<PrefetchResult> => {
  try {
    const params = new URLSearchParams({ limit: '9999' });
    if (branchId) params.set('branchId', branchId);
    if (companyId) params.set('companyId', companyId);
    const raw = await fetchJson(`${getApiBase()}/categories?${params}`);
    const items = extractItems(raw, 'categories');
    await saveSnapshot(SNAPSHOT_KEYS.CATEGORIES, items, TTL.CATEGORIES);
    console.log(`[POS Offline] 📂 Prefetched ${items.length} categories for branch ${branchId}`);
    return { key: SNAPSHOT_KEYS.CATEGORIES, success: true, count: items.length };
  } catch (error: any) {
    return { key: SNAPSHOT_KEYS.CATEGORIES, success: false, error: error.message };
  }
};

const fetchPaymentMethods = async (companyId: string, branchId: string): Promise<PrefetchResult> => {
  try {
    const url = companyId && branchId
      ? `${getApiBase()}/payment-methods/branch/${companyId}/${branchId}`
      : `${getApiBase()}/payment-methods`;
    const raw = await fetchJson(url);
    const items = extractItems(raw, 'paymentMethods');
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
    const items = extractItems(raw, 'users');
    await saveSnapshot(SNAPSHOT_KEYS.STAFF, items, TTL.STAFF);
    console.log(`[POS Offline] 👥 Prefetched ${items.length} staff members for branch ${branchId}`);
    return { key: SNAPSHOT_KEYS.STAFF, success: true, count: items.length };
  } catch (error: any) {
    return { key: SNAPSHOT_KEYS.STAFF, success: false, error: error.message };
  }
};

const fetchTables = async (branchId: string, companyId: string): Promise<PrefetchResult> => {
  try {
    const params = new URLSearchParams();
    if (branchId) params.set('branchId', branchId);
    if (companyId) params.set('companyId', companyId);
    const raw = await fetchJson(`${getApiBase()}/pos/tables/available?${params}`);
    const items = extractItems(raw, 'tables');
    
    if (items.length > 0 || (branchId && raw)) {
      await saveSnapshot(SNAPSHOT_KEYS.TABLES, items, TTL.TABLES);
    }
    console.log(`[POS Offline] 🪑 Prefetched ${items.length} tables for branch ${branchId}`);
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
    const items = extractItems(raw, 'deliveryZones');
    await saveSnapshot(SNAPSHOT_KEYS.DELIVERY_ZONES, items, TTL.DELIVERY_ZONES);
    return { key: SNAPSHOT_KEYS.DELIVERY_ZONES, success: true, count: items.length };
  } catch (error: any) {
    return { key: SNAPSHOT_KEYS.DELIVERY_ZONES, success: false, error: error.message };
  }
};

const fetchCustomers = async (companyId: string, branchId: string): Promise<PrefetchResult> => {
  try {
    const params = new URLSearchParams({ limit: '5000', page: '1' });
    if (companyId) params.set('companyId', companyId);
    if (branchId) params.set('branchId', branchId);
    const raw = await fetchJson(`${getApiBase()}/customers?${params}`);
    const items = extractItems(raw, 'customers');
    await saveSnapshot(SNAPSHOT_KEYS.CUSTOMERS, items, TTL.CUSTOMERS);
    console.log(`[POS Offline] 👤 Prefetched ${items.length} customers for branch ${branchId}`);
    return { key: SNAPSHOT_KEYS.CUSTOMERS, success: true, count: items.length };
  } catch (error: any) {
    return { key: SNAPSHOT_KEYS.CUSTOMERS, success: false, error: error.message };
  }
};

const fetchCompanySettings = async (companyId: string): Promise<PrefetchResult> => {
  try {
    if (!companyId) return { key: SNAPSHOT_KEYS.COMPANY_SETTINGS, success: true };
    const raw = await fetchJson(`${getApiBase()}/settings/company?companyId=${companyId}`);
    await saveSnapshot(SNAPSHOT_KEYS.COMPANY_SETTINGS, raw, TTL.GENERIC);
    return { key: SNAPSHOT_KEYS.COMPANY_SETTINGS, success: true };
  } catch (error: any) {
    return { key: SNAPSHOT_KEYS.COMPANY_SETTINGS, success: false, error: error.message };
  }
};

const fetchCompanyInfo = async (companyId: string): Promise<PrefetchResult> => {
  try {
    if (!companyId) return { key: SNAPSHOT_KEYS.COMPANY_INFO, success: true };
    const raw = await fetchJson(`${getApiBase()}/companies/${companyId}`);
    await saveSnapshot(SNAPSHOT_KEYS.COMPANY_INFO, raw, TTL.GENERIC);
    return { key: SNAPSHOT_KEYS.COMPANY_INFO, success: true };
  } catch (error: any) {
    return { key: SNAPSHOT_KEYS.COMPANY_INFO, success: false, error: error.message };
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

  const results = await Promise.allSettled([
    runFetcher(SNAPSHOT_KEYS.MENU_ITEMS, TTL.MENU_ITEMS, () => fetchMenuItems(branchId, companyId)),
    runFetcher(SNAPSHOT_KEYS.CATEGORIES, TTL.CATEGORIES, () => fetchCategories(branchId, companyId)),
    runFetcher(SNAPSHOT_KEYS.PAYMENT_METHODS, TTL.PAYMENT_METHODS, () => fetchPaymentMethods(companyId, branchId)),
    runFetcher(SNAPSHOT_KEYS.STAFF, TTL.STAFF, () => fetchStaff(companyId, branchId)),
    runFetcher(SNAPSHOT_KEYS.TABLES, TTL.TABLES, () => fetchTables(branchId, companyId)),
    runFetcher(SNAPSHOT_KEYS.POS_SETTINGS, TTL.POS_SETTINGS, () => fetchPOSSettings(branchId)),
    runFetcher(SNAPSHOT_KEYS.DELIVERY_ZONES, TTL.DELIVERY_ZONES, () => fetchDeliveryZones(branchId)),
    runFetcher(SNAPSHOT_KEYS.CUSTOMERS, TTL.CUSTOMERS, () => fetchCustomers(companyId, branchId)),
    runFetcher(SNAPSHOT_KEYS.COMPANY_SETTINGS, TTL.GENERIC, () => fetchCompanySettings(companyId)),
    runFetcher(SNAPSHOT_KEYS.COMPANY_INFO, TTL.GENERIC, () => fetchCompanyInfo(companyId)),
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
