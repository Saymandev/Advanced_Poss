import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { logout } from '../slices/authSlice';

// Helper to transparently decrypt AES-encrypted API responses
const decryptIfNeeded = async (response: any) => {
  try {
    // Only run in browser (window/crypto not available during SSR)
    if (typeof window === 'undefined' || !window.crypto?.subtle) {
      return response;
    }

    if (!response || !response.data) return response;

    let body = response.data as any;

    // Handle wrapped format: { success: true, data: { encrypted: true, ... } }
    if (
      body &&
      typeof body === 'object' &&
      'success' in body &&
      'data' in body &&
      body.data &&
      typeof body.data === 'object' &&
      'encrypted' in body.data
    ) {
      body = body.data;
    }

    if (
      !body ||
      typeof body !== 'object' ||
      !body.encrypted ||
      !body.iv ||
      !body.data
    ) {
      return response;
    }

    // Decrypt on the client using the Web Crypto API with a shared key.
    // NOTE: For real security you should derive this key per-session or
    //       use TLS only. A hard-coded key only adds light obfuscation.
    const secret =
      process.env.NEXT_PUBLIC_RESPONSE_ENCRYPTION_KEY || 'default-weak-key-change-me';

    const enc = new TextEncoder();
    const keyMaterial = await window.crypto.subtle.importKey(
      'raw',
      enc.encode(secret),
      { name: 'PBKDF2' },
      false,
      ['deriveKey'],
    );

    // Derive a 256-bit key from the secret (must mirror backend derivation)
    const key = await window.crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: enc.encode('response-encryption-salt'),
        iterations: 1000,
        hash: 'SHA-256',
      },
      keyMaterial,
      { name: 'AES-CBC', length: 256 },
      false,
      ['decrypt'],
    );

    try {
      const iv = Uint8Array.from(
        atob(body.iv || ''),
        (c) => c.charCodeAt(0),
      );

      const cipherBytes = Uint8Array.from(
        atob(body.data || ''),
        (c) => c.charCodeAt(0),
      );

      const decryptedBuffer = await window.crypto.subtle.decrypt(
        { name: 'AES-CBC', iv },
        key,
        cipherBytes,
      );

      const decoded = new TextDecoder().decode(decryptedBuffer);

      // Parse JSON if possible, otherwise keep as string
      let parsed: any;
      try {
        parsed = JSON.parse(decoded);
      } catch {
        parsed = decoded;
      }

      // Replace entire body with decrypted payload so callers see the ORIGINAL
      // response shape from the service (e.g. { success, data: {...} }).
      response.data = parsed;
    } catch (decryptError) {
      console.error('Failed to decrypt API response, returning original:', decryptError);
      return response;
    }

    return response;
  } catch (error) {
    console.error('Failed to decrypt API response', error);
    return response;
  }
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
  let result = await baseQuery(args, api, extraOptions);

  // Try to decrypt encrypted successful responses
  if (result && !result.error) {
    result = await decryptIfNeeded(result);
  }
  
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
      console.log('⚠️ Auth endpoint 401 error - skipping token refresh and redirect (let component handle error)');
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
        console.log('⏳ Token refresh already in progress, waiting...');
        console.log('⏳ Current refresh state:', { isRefreshing, hasPromise: !!refreshPromise });
        try {
          await refreshPromise;
          // Retry the original query with new token
          console.log('🔄 Retrying original request after waiting for refresh...');
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
        console.log('⏳ Refresh started by another request, waiting...');
        if (refreshPromise) {
          try {
            await refreshPromise;
            console.log('🔄 Retrying original request after waiting for refresh...');
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
      console.log('🔄 Attempting to refresh token...');
      console.log('🔄 Refresh state set:', { isRefreshing, timestamp: new Date().toISOString() });
      
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

        console.log('📦 Refresh result structure:', {
          hasData: !!refreshResult.data,
          dataType: typeof refreshResult.data,
          dataKeys: refreshResult.data ? Object.keys(refreshResult.data) : [],
          fullData: refreshResult.data,
        });

        // Tokens are now in httpOnly cookies, backend sets them automatically
        // Check if refresh was successful (backend returns { success: true })
        const refreshSuccess = refreshResult.data && 
          ((refreshResult.data as any).success === true || 
           (refreshResult.data as any).success === undefined); // undefined means no error
        
        if (refreshSuccess) {
          console.log('✅ Token refreshed successfully - new cookies set by backend');
          
          // Retry the original query (cookies are automatically sent)
          console.log('🔄 Retrying original request with new cookies...');
          console.log('🔄 Original request URL:', args?.url || args?.toString() || 'Unknown');
          result = await baseQuery(args, api, extraOptions);
          if (result.error) {
            console.error('❌ Retry failed:', result.error);
            console.error('❌ Retry error status:', result.error.status);
            console.error('❌ Retry error data:', result.error.data);
          } else {
            console.log('✅ Retry successful');
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
  ],
  endpoints: () => ({}),
});

