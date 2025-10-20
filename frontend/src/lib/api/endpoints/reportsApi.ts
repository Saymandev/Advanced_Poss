import { apiSlice } from '@/lib/api/apiSlice'

export const reportsApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    dashboardStats: builder.query<any, void>({ query: () => '/reports/dashboard', providesTags: ['Reports'] }),
    salesAnalytics: builder.query<any, void>({ query: () => '/reports/sales-analytics', providesTags: ['Reports'] }),
    topSellingItems: builder.query<any, void>({ query: () => '/reports/top-selling-items', providesTags: ['Reports'] }),
    revenueByCategory: builder.query<any, void>({ query: () => '/reports/revenue-by-category', providesTags: ['Reports'] }),
    lowStock: builder.query<any, void>({ query: () => '/reports/low-stock', providesTags: ['Reports'] }),
  }),
})

export const { useDashboardStatsQuery, useSalesAnalyticsQuery, useTopSellingItemsQuery, useRevenueByCategoryQuery, useLowStockQuery } = reportsApi


