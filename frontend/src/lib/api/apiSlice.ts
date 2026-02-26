import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { enqueueOfflineOrder, getSnapshot } from '../offline/db';
import { SNAPSHOT_KEYS } from '../offline/posPrefetcher';
import { logout } from '../slices/authSlice';
import { decryptData } from '../utils/crypto';

// Maps URL substrings to snapshot keys — used for offline GET fallback
const OFFLINE_SNAPSHOT_MAP: Array<{ match: string; key: string }> = [
  { match: '/pos/menu-items',         key: SNAPSHOT_KEYS.MENU_ITEMS },
  { match: '/categories',             key: SNAPSHOT_KEYS.CATEGORIES },
  { match: '/payment-methods/branch', key: SNAPSHOT_KEYS.PAYMENT_METHODS },
  { match: '/payment-methods',        key: SNAPSHOT_KEYS.PAYMENT_METHODS },
  { match: '/pos/tables/available',   key: SNAPSHOT_KEYS.TABLES },
  { match: '/pos/settings',           key: SNAPSHOT_KEYS.POS_SETTINGS },
  { match: '/pos/waiters/active-orders', key: SNAPSHOT_KEYS.STAFF }, // Map waiter count to staff key (since they are usually synced together)
  { match: '/users',                  key: SNAPSHOT_KEYS.STAFF },    // Fix: Map /users to staff key
  { match: '/staff',                  key: SNAPSHOT_KEYS.STAFF },
  { match: '/delivery-zones',         key: SNAPSHOT_KEYS.DELIVERY_ZONES },
  { match: '/customers',              key: SNAPSHOT_KEYS.CUSTOMERS },
  { match: '/settings/company',       key: SNAPSHOT_KEYS.COMPANY_SETTINGS },
  { match: '/companies/',             key: SNAPSHOT_KEYS.COMPANY_INFO },
];

/** Returns the snapshot key for a given URL, or null if not cacheable */
const getSnapshotKeyForUrl = (url: string): string | null => {
  // More specific matches first (e.g. /payment-methods/branch before /payment-methods)
  const match = OFFLINE_SNAPSHOT_MAP.find(m => url.includes(m.match));
  return match?.key ?? null;
};
// Helper to transparently decrypt AES-encrypted API responses
const decryptIfNeeded = async (response: any) => {
  if (!response || !response.data) return response;
  response.data = await decryptData(response.data);
  return response;
};
const baseQuery = fetchBaseQuery({
  baseUrl: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1',
  credentials: 'include', // Include cookies in requests (required for httpOnly cookies)
  prepareHeaders: (headers) => {
    // Tokens are now in httpOnly cookies, so we don't need to set Authorization header
    // Cookies are automatically sent by the browser
    return headers;
  },
});
// Track refresh attempts to prevent multiple simultaneous refreshes
let isRefreshing = false;
let refreshPromise: Promise<any> | null = null;
// Wrapper to handle token refresh and subscription expiry errors
const baseQueryWithReauth = async (args: any, api: any, extraOptions: any) => {
  const requestUrl = typeof args === 'string' ? args : args?.url || '';
  const isGetRequest = args?.method === 'GET' || !args?.method;

  // ─── OFFLINE HANDLING ──────────────────────────────────────────────────────
  if (typeof window !== 'undefined' && !window.navigator.onLine) {
    // 1. GET requests: serve from IndexedDB snapshot (prefetched by usePOSOfflinePrefetcher)
    if (isGetRequest) {
      const snapshotKey = getSnapshotKeyForUrl(requestUrl);
      if (snapshotKey) {
        const snap = await getSnapshot(snapshotKey);
        if (snap) {
          const items = snap.data;
          const itemCount = Array.isArray(items) ? items.length : (typeof items === 'object' && items !== null ? Object.keys(items).length : 'N/A');
          
          if (snapshotKey === SNAPSHOT_KEYS.MENU_ITEMS || snapshotKey === SNAPSHOT_KEYS.CATEGORIES) {
            console.log(`[Offline] 📦 Serving ${snapshotKey} for ${requestUrl} (${itemCount} items)`);
          } else {
            console.log(`[Offline] Serving ${requestUrl} from snapshot '${snapshotKey}' (age: ${Math.round((Date.now() - snap.savedAt) / 60000)}m, fresh: ${snap.isFresh}, items: ${itemCount})`);
          }
          return { data: items };
        }
        console.warn(`[Offline] ⚠️ No snapshot found for '${snapshotKey}' (${requestUrl}) — data will be missing`);
        return { data: null };
      }
    }

    // 2. POST /pos/orders — queue to IndexedDB for later sync
    if (requestUrl.includes('/pos/orders') && args?.method === 'POST') {
      try {
        const orderPayload = args.body;
        const offlineId = await enqueueOfflineOrder(orderPayload);
        console.log(`[Offline] Order queued with id ${offlineId}`);
        return {
          data: {
            ...orderPayload,
            id: offlineId,
            orderNumber: `OFF-${Math.floor(1000 + Math.random() * 9000)}`,
            createdAt: new Date().toISOString(),
            status: orderPayload.paymentMethod ? 'paid' : 'pending',
            isOffline: true,
          },
        };
      } catch {
        return { error: { status: 503, data: { message: 'Failed to queue offline order' } } };
      }
    }

    // 3. POST /pos/payments — when offline, silently succeed (order is already queued above)
    // The payment record will be created on the backend when the order syncs.
    if (requestUrl.includes('/pos/payments') && args?.method === 'POST') {
      console.log('[Offline] Payment request suppressed — will sync with order');
      return { data: { success: true, isOffline: true } };
    }

    // All other mutations while offline — return a clear error
    if (args?.method && args.method !== 'GET') {
      return { error: { status: 503, data: { message: 'You are offline. This action will be available when reconnected.' } } };
    }
  }
  // ──────────────────────────────────────────────────────────────────────────

  let result = await baseQuery(args, api, extraOptions);
  
  // Try to decrypt encrypted successful responses
  if (result && !result.error) {
    result = await decryptIfNeeded(result);
  }

  // (Offline caching is now handled by usePOSOfflinePrefetcher — not here)
  // Handle 401 unauthorized errors (token expired)
  if (result.error && result.error.status === 401) {
    const errorData = result.error.data as any;
    const requestUrl = args?.url || '';
    console.warn('🔴 401 Unauthorized - Attempting token refresh');
    console.warn('Request URL:', requestUrl || args?.toString() || 'Unknown');
    console.warn('Request args:', { url: args?.url, method: args?.method, body: args?.body });
    console.warn('Error data:', errorData);
    // Skip token refresh and redirect for authentication endpoints (login, PIN login, etc.)
    // These endpoints handle their own errors and shouldn't trigger global redirect
    const authEndpoints = [
      '/auth/login',
      '/auth/login/pin',
      '/auth/login/pin-with-role',
      '/auth/login/super-admin',
      '/auth/register',
      '/auth/find-company',
    ];
    if (authEndpoints.some(endpoint => requestUrl.includes(endpoint))) {
      
      return result; // Return error as-is, let the component handle it
    }
    // Check if it's a subscription expiry error (don't try to refresh token)
    if (errorData?.code === 'SUBSCRIPTION_EXPIRED' || errorData?.code === 'TRIAL_EXPIRED') {
      // Redirect to upgrade page if in browser
      if (typeof window !== 'undefined') {
        if (errorData?.message) {
          console.error('Subscription Expired:', errorData.message);
        }
        window.location.href = '/dashboard/subscriptions';
      }
      return result;
    }
    // Don't try to refresh if this is a refresh token request itself
    if (requestUrl === '/auth/refresh' || requestUrl.includes('/auth/refresh')) {
      console.error('❌ Refresh token request failed - logging out');
      api.dispatch(logout());
      if (typeof window !== 'undefined') {
        window.location.href = '/auth/login';
      }
      return result;
    }
    // Refresh token is in httpOnly cookie, so we can attempt refresh
    // (No need to check for refreshToken - it's in cookie)
    // If refresh is already in progress, wait for it
      if (isRefreshing && refreshPromise) {
        try {
          await refreshPromise;
          // Retry the original query with new token
          result = await baseQuery(args, api, extraOptions);
          return result;
        } catch (error) {
          console.error('❌ Refresh failed while waiting:', error);
          return result;
        }
      }
      // Atomically check and set refresh flag to prevent race conditions
      if (isRefreshing) {
        // Another request started refresh between our check and now, wait for it
        if (refreshPromise) {
          try {
            await refreshPromise;
            result = await baseQuery(args, api, extraOptions);
            return result;
          } catch (error) {
            console.error('❌ Refresh failed while waiting:', error);
            return result;
          }
        }
      }
      // Start refresh process (atomic: check and set)
      isRefreshing = true;
     
      refreshPromise = (async () => {
        try {
          // Create a fresh baseQuery without token for refresh call
          const refreshQuery = fetchBaseQuery({
            baseUrl: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1',
          });
          // Refresh token is in httpOnly cookie, no need to send in body
          let refreshResult = await refreshQuery(
            {
              url: '/auth/refresh',
              method: 'POST',
              body: {}, // Empty body - refresh token is in cookie
            },
            api,
            extraOptions
          );
          // Decrypt refresh response if encrypted
          if (refreshResult && !refreshResult.error) {
            refreshResult = await decryptIfNeeded(refreshResult);
          }
          return refreshResult;
        } finally {
          isRefreshing = false;
          refreshPromise = null;
        }
      })();
      try {
        const refreshResult = await refreshPromise;
     
        // Tokens are now in httpOnly cookies, backend sets them automatically
        // Check if refresh was successful (backend returns { success: true })
        const refreshSuccess = refreshResult.data && 
          ((refreshResult.data as any).success === true || 
           (refreshResult.data as any).success === undefined); // undefined means no error
        if (refreshSuccess) {
          // Retry the original query (cookies are automatically sent)
         
          result = await baseQuery(args, api, extraOptions);
          if (result.error) {
            console.error('❌ Retry failed:', result.error);
            console.error('❌ Retry error status:', result.error.status);
            console.error('❌ Retry error data:', result.error.data);
          } else {
            }
        } else {
          // Refresh failed, logout user
          console.error('❌ Token refresh failed');
          console.error('Refresh result:', refreshResult);
          api.dispatch(logout());
          if (typeof window !== 'undefined') {
            window.location.href = '/auth/login';
          }
        }
      } catch (error: any) {
        // Refresh failed, logout user
        console.error('❌ Token refresh error:', error);
        console.error('Error details:', {
          message: error?.message,
          status: error?.status,
          data: error?.data,
        });
        isRefreshing = false;
        refreshPromise = null;
        api.dispatch(logout());
        if (typeof window !== 'undefined') {
          localStorage.removeItem('accessToken');
          localStorage.removeItem('refreshToken');
          window.location.href = '/auth/login';
        }
      }
  }
  return result;
};
export const apiSlice = createApi({
  reducerPath: 'api',
  baseQuery: baseQueryWithReauth,
  tagTypes: [
    'Auth',
    'User',
    'Marketing',
    'Company',
    'Branch',
    'MenuItem',
    'Category',
    'Order',
    'Table',
    'Room',
    'Booking',
    'Customer',
    'Kitchen',
    'Ingredient',
    'Supplier',
    'Expense',
    'Report',
    'Wastage',
    'Subscription',
    'WorkPeriod',
    'Attendance',
    'Staff',
    'Reservation',
    'AI',
    'Payment',
    'Backup',
    'LoginActivity',
    'Schedule',
    'POS',
    'Printer',
    'PrintJob',
    'Settings',
    'QRCode',
    'DigitalReceipt',
    'DeliveryIntegration',
    'PurchaseOrder',
    'Review',
    'RolePermission',
    'MyPermissions',
    'Gallery',
    'SuperAdminNotifications',
    'ContentPages',
    'SystemFeedback',
    'ContactForm',
    'Transactions',
    'PaymentMethods',
  ],
  endpoints: () => ({}),
});
