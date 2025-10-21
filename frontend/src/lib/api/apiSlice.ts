import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { RootState } from '../store';

const baseQuery = fetchBaseQuery({
  baseUrl: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1',
  prepareHeaders: (headers, { getState }) => {
    const token = (getState() as RootState).auth.accessToken;
    if (token) {
      headers.set('authorization', `Bearer ${token}`);
    }
    return headers;
  },
});

export const apiSlice = createApi({
  reducerPath: 'api',
  baseQuery,
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
  ],
  endpoints: () => ({}),
});

