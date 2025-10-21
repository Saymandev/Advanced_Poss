import { apiSlice } from '../apiSlice';

export interface DashboardStats {
  todaySales: number;
  todayOrders: number;
  activeOrders: number;
  totalCustomers: number;
  salesTrend: Array<{
    date: string;
    sales: number;
  }>;
  topSellingItems: Array<{
    name: string;
    quantity: number;
    revenue: number;
  }>;
  recentOrders: Array<{
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
    getDashboard: builder.query<DashboardStats, { branchId?: string; date?: string }>({
      query: (params) => ({
        url: '/reports/dashboard',
        params,
      }),
      providesTags: ['Report'],
    }),
    getSalesAnalytics: builder.query<SalesAnalytics, { 
      branchId?: string; 
      startDate?: string; 
      endDate?: string; 
      period?: 'day' | 'week' | 'month' | 'year' 
    }>({
      query: (params) => ({
        url: '/reports/sales',
        params,
      }),
      providesTags: ['Report'],
    }),
    getInventoryReport: builder.query<InventoryReport, { branchId?: string }>({
      query: (params) => ({
        url: '/reports/inventory',
        params,
      }),
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
  useGetInventoryReportQuery,
  useGetCustomerReportQuery,
  useGetStaffReportQuery,
  useExportReportMutation,
} = reportsApi;