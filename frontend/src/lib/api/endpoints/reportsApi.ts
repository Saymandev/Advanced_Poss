import { apiSlice } from '../apiSlice';

export interface DashboardStats {
  today?: {
    orders: number;
    completed: number;
    revenue: number;
    averageOrderValue: number;
  };
  week?: {
    orders: number;
    revenue: number;
  };
  month?: {
    orders: number;
    revenue: number;
  };
  active?: {
    orders: number;
  };
  customers?: {
    total: number;
    active: number;
    vip: number;
  };
  inventory?: {
    lowStock: number;
    outOfStock: number;
  };
  timestamp?: Date;
  // Legacy fields for backwards compatibility
  todaySales?: number;
  todayOrders?: number;
  activeOrders?: number;
  totalCustomers?: number;
  salesTrend?: Array<{
    date: string;
    sales: number;
  }>;
  topSellingItems?: Array<{
    name: string;
    quantity: number;
    revenue: number;
  }>;
  recentOrders?: Array<{
    id: string;
    orderNumber: string;
    customerName?: string;
    itemCount: number;
    total: number;
    status: string;
    createdAt: string;
  }>;
}

export interface SalesAnalytics {
  period: string;
  totalSales: number;
  totalOrders: number;
  averageOrderValue: number;
  salesByCategory: Array<{
    category: string;
    sales: number;
    percentage: number;
  }>;
  salesByHour: Array<{
    hour: number;
    sales: number;
    orders: number;
  }>;
  salesByDay: Array<{
    day: string;
    sales: number;
    orders: number;
  }>;
}

export interface InventoryReport {
  totalItems: number;
  lowStockItems: number;
  outOfStockItems: number;
  totalValue: number;
  items: Array<{
    id: string;
    name: string;
    currentStock: number;
    minStock: number;
    maxStock: number;
    unitPrice: number;
    totalValue: number;
    status: 'in-stock' | 'low-stock' | 'out-of-stock';
  }>;
}

export interface CustomerReport {
  totalCustomers: number;
  newCustomers: number;
  returningCustomers: number;
  averageOrderValue: number;
  topCustomers: Array<{
    id: string;
    name: string;
    email: string;
    totalOrders: number;
    totalSpent: number;
    lastOrderDate: string;
  }>;
  customerTiers: Array<{
    tier: string;
    count: number;
    percentage: number;
  }>;
}

export const reportsApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getDashboard: builder.query<DashboardStats, { branchId?: string; companyId?: string; date?: string }>({
      query: (params) => ({
        url: '/reports/dashboard',
        params,
      }),
      providesTags: ['Report'],
      transformResponse: (response: any) => {
        return response.data || response;
      },
    }),
    getSalesAnalytics: builder.query<SalesAnalytics, { 
      branchId?: string; 
      startDate?: string; 
      endDate?: string; 
      period?: 'day' | 'week' | 'month' | 'year' 
    }>({
      query: (params) => ({
        url: '/reports/sales-analytics',
        params,
      }),
      providesTags: ['Report'],
      transformResponse: (response: any) => {
        const data = response.data || response;
        // Backend returns: { period, data: [...], summary: { totalRevenue, totalOrders, averageOrderValue } }
        return {
          period: data.period || 'week',
          totalSales: data.summary?.totalRevenue || 0,
          totalOrders: data.summary?.totalOrders || 0,
          averageOrderValue: data.summary?.averageOrderValue || 0,
          salesByDay: (data.data || []).map((item: any) => ({
            day: item.date || item.day || '',
            sales: item.revenue || item.sales || 0,
            orders: item.orders || 0,
          })),
          salesByCategory: [], // Will be fetched separately
          salesByHour: [], // Will be fetched separately
        };
      },
    }),
    getRevenueByCategory: builder.query<Array<{
      category: string;
      sales: number;
      percentage: number;
    }>, { branchId?: string }>({
      query: (params) => ({
        url: '/reports/revenue-by-category',
        params,
      }),
      providesTags: ['Report'],
      transformResponse: (response: any) => {
        const data = response.data || response;
        return (Array.isArray(data) ? data : []).map((item: any) => ({
          category: item.categoryId || item.category || 'Unknown',
          sales: item.revenue || item.sales || 0,
          percentage: item.percentage || 0,
        }));
      },
    }),
    getPeakHours: builder.query<{
      hourlyData: Array<{ hour: number; orders: number; sales: number }>;
      peakHours: Array<{ hour: number; orders: number; sales: number }>;
      busiestHour: { hour: number; orders: number; sales: number };
    }, { branchId?: string; startDate?: string; endDate?: string }>({
      query: (params) => {
        if (!params.branchId) {
          throw new Error('branchId is required for peak hours query');
        }
        return {
          url: `/reports/peak-hours/${params.branchId}`,
          params: {
            startDate: params.startDate,
            endDate: params.endDate,
          },
        };
      },
      providesTags: ['Report'],
      transformResponse: (response: any) => {
        const data = response.data || response;
        return {
          hourlyData: data.hourlyData || [],
          peakHours: data.peakHours || [],
          busiestHour: data.busiestHour || { hour: 0, orders: 0, sales: 0 },
        };
      },
    }),
    
    getTopSellingItems: builder.query<Array<{
      name: string;
      quantity: number;
      revenue: number;
    }>, { 
      branchId?: string;
      limit?: number;
    }>({
      query: (params) => ({
        url: '/reports/top-selling-items',
        params,
      }),
      providesTags: ['Report'],
      transformResponse: (response: any) => {
        return response.data || response;
      },
    }),
    getInventoryReport: builder.query<InventoryReport, { branchId?: string }>({
      query: (params) => ({
        url: '/reports/inventory',
        params,
      }),
      transformResponse: (response: any) => {
        return response.data || response;
      },
      providesTags: ['Report'],
    }),
    getCustomerReport: builder.query<CustomerReport, { 
      branchId?: string; 
      startDate?: string; 
      endDate?: string 
    }>({
      query: (params) => ({
        url: '/reports/customers',
        params,
      }),
      transformResponse: (response: any) => {
        return response.data || response;
      },
      providesTags: ['Report'],
    }),
    getStaffReport: builder.query<any, { 
      branchId?: string; 
      startDate?: string; 
      endDate?: string 
    }>({
      query: (params) => ({
        url: '/reports/staff',
        params,
      }),
      transformResponse: (response: any) => {
        return response.data || response;
      },
      providesTags: ['Report'],
    }),
    exportReport: builder.mutation<{ downloadUrl: string }, {
      type: 'sales' | 'inventory' | 'customers' | 'staff';
      format: 'pdf' | 'excel' | 'csv';
      params: any;
    }>({
      query: ({ type, format, params }) => ({
        url: `/reports/export/${type}`,
        method: 'POST',
        body: { format, params },
      }),
    }),
  }),
});

export const {
  useGetDashboardQuery,
  useGetSalesAnalyticsQuery,
  useGetTopSellingItemsQuery,
  useGetInventoryReportQuery,
  useGetCustomerReportQuery,
  useGetStaffReportQuery,
  useGetRevenueByCategoryQuery,
  useGetPeakHoursQuery,
  useExportReportMutation,
} = reportsApi;