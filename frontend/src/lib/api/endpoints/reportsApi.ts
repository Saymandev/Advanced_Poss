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

export interface FinancialSummary {
  period: {
    startDate: string | null;
    endDate: string | null;
  };
  sales: {
    total: number;
    orders: number;
    byPaymentMethod: Record<string, number>;
  };
  expenses: {
    total: number;
    paid: number;
    unpaid: number;
  };
  purchases: {
    total: number;
    received: number;
    pending: number;
  };
  net: number;
  timeline: Array<{
    date: string;
    sales: number;
    expenses: number;
    purchases: number;
    net: number;
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
    getFinancialSummary: builder.query<FinancialSummary, { branchId?: string; companyId?: string; startDate?: string; endDate?: string }>({
      query: (params) => ({
        url: '/reports/financial-summary',
        params,
      }),
      providesTags: ['Report'],
      transformResponse: (response: any) => {
        const data = response?.data ?? response;
        return {
          period: {
            startDate: data?.period?.startDate || data?.period?.start || null,
            endDate: data?.period?.endDate || data?.period?.end || null,
          },
          sales: data?.sales || { total: 0, orders: 0, byPaymentMethod: {} },
          expenses: data?.expenses || { total: 0, paid: 0, unpaid: 0 },
          purchases: data?.purchases || { total: 0, received: 0, pending: 0 },
          net: data?.net ?? 0,
          timeline: Array.isArray(data?.timeline) ? data.timeline : [],
        } as FinancialSummary;
      },
    }),
    getSalesAnalytics: builder.query<SalesAnalytics, { 
      branchId?: string; 
      startDate?: string; 
      endDate?: string; 
      period?: 'day' | 'week' | 'month' | 'year' 
    }>({
      query: (params) => {
        const queryParams: any = {};
        if (params.period) queryParams.period = params.period;
        if (params.branchId) queryParams.branchId = params.branchId;
        // Send startDate and endDate if provided (frontend calculates them)
        if (params.startDate) queryParams.startDate = params.startDate;
        if (params.endDate) queryParams.endDate = params.endDate;
        return {
          url: '/reports/sales-analytics',
          params: queryParams,
        };
      },
      providesTags: ['Report'],
      transformResponse: (response: any) => {
        // RTK Query's transformResponse receives result.data from baseQueryWithReauth
        // After decryptIfNeeded, result.data is the HTTP response body
        // TransformInterceptor wraps as: { success: true, data: <actual response>, timestamp: ... }
        // The actual response from backend is: { period, data: [...], summary: { totalRevenue, totalOrders, averageOrderValue } }
        
        // Debug: Log the raw response structure
        console.log('📊 Frontend Transform - Raw Response:', {
          isArray: Array.isArray(response),
          type: typeof response,
          keys: response && typeof response === 'object' && !Array.isArray(response) 
            ? Object.keys(response).slice(0, 10) 
            : [],
          hasSuccess: response?.success,
          hasData: !!response?.data,
          hasPeriod: !!response?.period,
          hasSummary: !!response?.summary,
        });
        
        // If response is an array, something went wrong
        if (Array.isArray(response)) {
          console.error('❌ Response is an array, expected object');
          return {
            period: 'week',
            totalSales: 0,
            totalOrders: 0,
            averageOrderValue: 0,
            salesByDay: [],
            salesByCategory: [],
            salesByHour: [],
          };
        }
        
        // Extract the actual data from TransformInterceptor wrapper
        let actualData = response;
        
        // IMPORTANT: Check for period/summary FIRST to avoid extracting the array
        // If response already has period/summary, it's already the data object
        if (response && typeof response === 'object' && !Array.isArray(response) && 
            ('period' in response || 'summary' in response)) {
          // Already the actual data object: { period, data: [...], summary: {...} }
          actualData = response;
          console.log('📊 Response is already the data object (has period/summary)');
        }
        // Check if response has TransformInterceptor structure: { success: true, data: {...}, timestamp: ... }
        else if (response && typeof response === 'object' && !Array.isArray(response) && 
                 'success' in response && 'data' in response) {
          // TransformInterceptor format: extract the inner data
          actualData = response.data;
          console.log('📊 Extracted from TransformInterceptor wrapper');
        }
        // Check if response has a data property but no success and no period/summary
        else if (response && typeof response === 'object' && !Array.isArray(response) && 
                 'data' in response && !('period' in response) && !('summary' in response)) {
          // Might be partially unwrapped, but only extract if it's not already the data object
          const extracted = response.data;
          // Only use extracted if it has period/summary (is the actual data object)
          if (extracted && typeof extracted === 'object' && !Array.isArray(extracted) &&
              ('period' in extracted || 'summary' in extracted)) {
            actualData = extracted;
            console.log('📊 Extracted from data property (has period/summary)');
          } else {
            // Keep original response if extracted doesn't have the structure we need
            actualData = response;
            console.log('📊 Kept original response (extracted data is not the right structure)');
          }
        }
        
        // Debug logging
        console.log('📊 Frontend Transform - Extracted Data:', {
          actualDataType: typeof actualData,
          isArray: Array.isArray(actualData),
          actualDataKeys: actualData && typeof actualData === 'object' && !Array.isArray(actualData) 
            ? Object.keys(actualData) 
            : [],
          hasSummary: !!actualData?.summary,
          period: actualData?.period,
          summary: actualData?.summary,
          dataIsArray: Array.isArray(actualData?.data),
          dataLength: actualData?.data?.length,
        });
        
        // Validate structure
        if (Array.isArray(actualData) || !actualData || typeof actualData !== 'object') {
          console.error('❌ Invalid response structure after extraction:', {
            isArray: Array.isArray(actualData),
            type: typeof actualData,
            value: actualData,
          });
          return {
            period: 'week',
            totalSales: 0,
            totalOrders: 0,
            averageOrderValue: 0,
            salesByDay: [],
            salesByCategory: [],
            salesByHour: [],
          };
        }
        
        // Backend returns: { period, data: [...], summary: { totalRevenue, totalOrders, averageOrderValue } }
        const transformed = {
          period: actualData.period || 'week',
          totalSales: actualData.summary?.totalRevenue ?? 0,
          totalOrders: actualData.summary?.totalOrders ?? 0,
          averageOrderValue: actualData.summary?.averageOrderValue ?? 0,
          salesByDay: (actualData.data || []).map((item: any) => ({
            day: item.date || item.day || '',
            sales: item.revenue || item.sales || 0,
            orders: item.orders || 0,
          })),
          salesByCategory: [], // Will be fetched separately
          salesByHour: [], // Will be fetched separately
        };
        
        console.log('📊 Frontend Transform - Final Result:', {
          totalSales: transformed.totalSales,
          totalOrders: transformed.totalOrders,
          averageOrderValue: transformed.averageOrderValue,
          salesByDayLength: transformed.salesByDay.length,
          period: transformed.period,
        });
        
        return transformed;
      },
    }),
    getRevenueByCategory: builder.query<Array<{
      category: string;
      sales: number;
      percentage: number;
    }>, { branchId?: string; startDate?: string; endDate?: string }>({
      query: (params) => {
        const queryParams: any = {};
        if (params.branchId) queryParams.branchId = params.branchId;
        if (params.startDate) queryParams.startDate = params.startDate;
        if (params.endDate) queryParams.endDate = params.endDate;
        return {
          url: '/reports/revenue-by-category',
          params: queryParams,
        };
      },
      providesTags: ['Report'],
      transformResponse: (response: any) => {
        // Handle TransformInterceptor wrapper: { success: true, data: [...], timestamp: ... }
        let data = response;
        
        if (response && typeof response === 'object' && !Array.isArray(response)) {
          if ('success' in response && 'data' in response) {
            // TransformInterceptor format
            data = response.data;
          } else if ('data' in response && Array.isArray(response.data)) {
            // Might just have data property
            data = response.data;
          }
        }
        
        // Ensure data is an array
        if (!Array.isArray(data)) {
          console.warn('⚠️ getRevenueByCategory: Expected array, got:', typeof data, data);
          return [];
        }
        
        console.log('📊 getRevenueByCategory - Transformed:', {
          count: data.length,
          categories: data.map((item: any) => ({
            category: item.categoryId || item.category || 'Unknown',
            sales: item.revenue || item.sales || 0,
          })),
        });
        
        const transformed = data.map((item: any) => {
          // Backend returns: { categoryId, category, sales, revenue, percentage }
          const result = {
            category: item.category || item.categoryId || 'Unknown',
            categoryId: item.categoryId,
            sales: item.sales || item.revenue || 0,
            revenue: item.revenue || item.sales || 0,
            percentage: item.percentage || 0,
          };
          return result;
        });
        
        console.log('📊 getRevenueByCategory - Final Transformed:', {
          count: transformed.length,
          items: transformed,
        });
        
        return transformed;
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
    getDueSettlements: builder.query<{
      pendingSettlements: number;
      totalDueAmount: number;
      settledToday: number;
      settledTodayAmount: number;
      pendingOrders: Array<{
        id: string;
        orderNumber: string;
        totalAmount: number;
        orderType: string;
        createdAt: string;
        tableId?: string;
        customerInfo?: any;
      }>;
    }, { branchId?: string; companyId?: string }>({
      query: (params) => ({
        url: '/reports/due-settlements',
        params,
      }),
      providesTags: ['Report'],
      transformResponse: (response: any) => {
        return response.data || response;
      },
    }),
    getWastageReport: builder.query<any, { branchId?: string; companyId?: string; startDate?: string; endDate?: string }>({
      query: ({ branchId, companyId, startDate, endDate }) => {
        const params = new URLSearchParams();
        if (branchId) params.append('branchId', branchId);
        if (companyId) params.append('companyId', companyId);
        if (startDate) params.append('startDate', startDate);
        if (endDate) params.append('endDate', endDate);
        return {
          url: `/reports/wastage?${params.toString()}`,
          method: 'GET',
        };
      },
      providesTags: ['Report'],
      transformResponse: (response: any) => {
        let data = response;
        if (response && typeof response === 'object' && !Array.isArray(response)) {
          if ('success' in response && 'data' in response) {
            data = response.data;
          } else if ('data' in response && typeof response.data === 'object') {
            data = response.data;
          }
        }
        return data;
      },
    }),
  }),
});

export const {
  useGetDashboardQuery,
  useGetFinancialSummaryQuery,
  useGetSalesAnalyticsQuery,
  useGetTopSellingItemsQuery,
  useGetInventoryReportQuery,
  useGetCustomerReportQuery,
  useGetStaffReportQuery,
  useGetRevenueByCategoryQuery,
  useGetPeakHoursQuery,
  useGetDueSettlementsQuery,
  useGetWastageReportQuery,
  useExportReportMutation,
} = reportsApi;