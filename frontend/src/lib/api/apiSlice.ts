import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { RootState } from '../store';

const baseQuery = fetchBaseQuery({
  baseUrl: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1',
  prepareHeaders: (headers, { getState }) => {
    // Try to get token from Redux state first
    let token = (getState() as RootState).auth.accessToken;
    
    // Fallback to localStorage if not in Redux (for edge cases)
    if (!token && typeof window !== 'undefined') {
      token = localStorage.getItem('accessToken');
    }
    
    if (token) {
      headers.set('authorization', `Bearer ${token}`);
    }
    return headers;
  },
});

// Wrapper to handle subscription expiry errors
const baseQueryWithSubscriptionHandling = async (args: any, api: any, extraOptions: any) => {
  const result = await baseQuery(args, api, extraOptions);
  
  // Handle subscription expired errors
  if (result.error && result.error.status === 401) {
    const errorData = result.error.data as any;
    
    // Check if it's a subscription expiry error
    if (errorData?.code === 'SUBSCRIPTION_EXPIRED' || errorData?.code === 'TRIAL_EXPIRED') {
      // Redirect to upgrade page if in browser
      if (typeof window !== 'undefined') {
        // Show subscription expired message
        if (errorData?.message) {
          console.error('Subscription Expired:', errorData.message);
          // You can show a toast/notification here
        }
        
        // Redirect to subscriptions page
        window.location.href = '/dashboard/subscriptions';
      }
    }
  }
  
  return result;
};

export const apiSlice = createApi({
  reducerPath: 'api',
  baseQuery: baseQueryWithSubscriptionHandling,
  tagTypes: [
    'Auth',
    'User',
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
  ],
  endpoints: () => ({}),
});

