import { apiSlice } from '../apiSlice';

export interface POSOrderItem {
  menuItemId: string;
  quantity: number;
  price: number;
  notes?: string;
}

export interface CreatePOSOrderRequest {
  tableId: string;
  items: POSOrderItem[];
  customerInfo?: {
    name?: string;
    phone?: string;
    email?: string;
  };
  totalAmount: number;
  status: 'pending' | 'paid' | 'cancelled';
  paymentMethod?: 'cash' | 'card' | 'split';
  notes?: string;
}

export interface POSOrder extends CreatePOSOrderRequest {
  id: string;
  orderNumber: string;
  createdAt: string;
  updatedAt: string;
  branchId: string;
  userId: string;
}

export interface POSPayment {
  id: string;
  orderId: string;
  amount: number;
  method: 'cash' | 'card' | 'split';
  status: 'pending' | 'completed' | 'failed' | 'refunded';
  transactionId?: string;
  createdAt: string;
}

export interface POSStats {
  totalOrders: number;
  totalRevenue: number;
  averageOrderValue: number;
  ordersToday: number;
  revenueToday: number;
  topSellingItems: Array<{
    menuItemId: string;
    name: string;
    quantity: number;
    revenue: number;
  }>;
}

export const posApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    // Create POS order
    createPOSOrder: builder.mutation<POSOrder, CreatePOSOrderRequest>({
      query: (data) => ({
        url: '/pos/orders',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['Order', 'POS', 'Table'],
      transformResponse: (response: any) => {
        return response.data || response;
      },
    }),

    // Get POS orders
    getPOSOrders: builder.query<{ orders: POSOrder[]; total: number }, {
      branchId?: string;
      status?: string;
      startDate?: string;
      endDate?: string;
      page?: number;
      limit?: number;
    }>({
      query: (params) => ({
        url: '/pos/orders',
        params,
      }),
      providesTags: ['POS'],
      transformResponse: (response: any) => {
        const data = response.data || response;
        return {
          orders: data.orders || data || [],
          total: data.total || (Array.isArray(data) ? data.length : 0),
        };
      },
    }),

    // Get POS order by ID
    getPOSOrder: builder.query<POSOrder, string>({
      query: (id) => `/pos/orders/${id}`,
      providesTags: (result, error, id) => [{ type: 'POS', id }],
    }),

    // Update POS order
    updatePOSOrder: builder.mutation<POSOrder, { id: string; data: Partial<CreatePOSOrderRequest> }>({
      query: ({ id, data }) => ({
        url: `/pos/orders/${id}`,
        method: 'PUT',
        body: data,
      }),
      invalidatesTags: (result, error, { id }) => [{ type: 'POS', id }, 'POS'],
    }),

    // Cancel POS order
    cancelPOSOrder: builder.mutation<POSOrder, string>({
      query: (id) => ({
        url: `/pos/orders/${id}/cancel`,
        method: 'PATCH',
      }),
      invalidatesTags: (result, error, id) => [{ type: 'POS', id }, 'POS'],
    }),

    // Process payment
    processPayment: builder.mutation<POSPayment, {
      orderId: string;
      amount: number;
      method: 'cash' | 'card' | 'split';
      transactionId?: string;
    }>({
      query: (data) => ({
        url: '/pos/payments',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['POS', 'Payment'],
    }),

    // Get POS statistics
    getPOSStats: builder.query<POSStats, {
      branchId?: string;
      startDate?: string;
      endDate?: string;
    }>({
      query: (params) => ({
        url: '/pos/stats',
        params,
      }),
      providesTags: ['POS'],
      transformResponse: (response: any) => {
        return response.data || response;
      },
    }),

    // Get available tables for POS
    getAvailableTables: builder.query<Array<{
      id: string;
      number: string;
      capacity: number;
      status: 'available' | 'occupied' | 'reserved';
      currentOrderId?: string;
    }>, { branchId?: string }>({
      query: (params) => ({
        url: '/pos/tables/available',
        params,
      }),
      providesTags: ['Table'],
      transformResponse: (response: any) => {
        return response.data || response || [];
      },
    }),

    // Get menu items for POS
    getPOSMenuItems: builder.query<Array<{
      id: string;
      name: string;
      description?: string;
      price: number;
      image?: string;
      category: {
        id: string;
        name: string;
      };
      isAvailable: boolean;
      stock?: number;
    }>, {
      branchId?: string;
      categoryId?: string;
      search?: string;
      isAvailable?: boolean;
    }>({
      query: (params) => ({
        url: '/pos/menu-items',
        params,
      }),
      providesTags: ['MenuItem'],
      transformResponse: (response: any) => {
        return response.data || response || [];
      },
    }),

    // Get quick stats for POS dashboard
    getQuickStats: builder.query<{
      activeOrders: number;
      availableTables: number;
      totalRevenue: number;
      ordersInProgress: number;
    }, { branchId?: string }>({
      query: (params) => ({
        url: '/pos/quick-stats',
        params,
      }),
      providesTags: ['POS'],
    }),

    // Split order
    splitOrder: builder.mutation<{ order1: POSOrder; order2: POSOrder }, {
      orderId: string;
      items: Array<{
        menuItemId: string;
        quantity: number;
        price: number;
        notes?: string;
      }>;
    }>({
      query: ({ orderId, items }) => ({
        url: `/pos/orders/${orderId}/split`,
        method: 'POST',
        body: { items },
      }),
      invalidatesTags: ['POS'],
    }),

    // Refund order
    refundOrder: builder.mutation<POSPayment, {
      orderId: string;
      amount: number;
      reason: string;
    }>({
      query: (data) => ({
        url: '/pos/refunds',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['POS', 'Payment'],
    }),

    // Get order history for table
    getTableOrderHistory: builder.query<POSOrder[], {
      tableId: string;
      limit?: number;
    }>({
      query: ({ tableId, limit = 10 }) => ({
        url: `/pos/tables/${tableId}/orders`,
        params: { limit },
      }),
      providesTags: ['POS'],
    }),

    // Print receipt
    printReceipt: builder.mutation<{ success: boolean; message: string; jobId?: string }, {
      orderId: string;
      printerId?: string;
    }>({
      query: ({ orderId, printerId }) => ({
        url: `/pos/receipts/${orderId}/print`,
        method: 'POST',
        body: { printerId },
      }),
    }),

    // Print receipt as PDF
    printReceiptPDF: builder.mutation<{ success: boolean; message: string; jobId?: string }, {
      orderId: string;
      printerId?: string;
    }>({
      query: ({ orderId, printerId }) => ({
        url: `/pos/receipts/${orderId}/print-pdf`,
        method: 'POST',
        body: { printerId },
      }),
    }),

    // Get receipt HTML
    getReceiptHTML: builder.query<{ html: string }, string>({
      query: (orderId) => `/pos/receipts/${orderId}/html`,
      transformResponse: (response: any) => {
        return response.data || response;
      },
    }),

    // Download receipt PDF
    downloadReceiptPDF: builder.mutation<Blob, string>({
      query: (orderId) => ({
        url: `/pos/receipts/${orderId}/pdf`,
        method: 'GET',
        responseType: 'blob',
      }),
    }),

    // Printer management
    getPrinters: builder.query<Array<{
      name: string;
      type: string;
      width: number;
      enabled: boolean;
      isOnline: boolean;
    }>, void>({
      query: () => '/pos/printers',
      providesTags: ['Printer'],
    }),

    // Test printer
    testPrinter: builder.mutation<{ success: boolean; message: string }, {
      printerName: string;
    }>({
      query: (data) => ({
        url: '/pos/printers/test',
        method: 'POST',
        body: data,
      }),
    }),
    
    // Create printer
    createPrinter: builder.mutation<any, {
      name: string;
      type: string;
      width: number;
      height?: number;
      networkUrl?: string;
      driver?: string;
      enabled?: boolean;
      location?: any;
      copies?: number;
      priority?: string;
      autoPrint?: boolean;
      description?: string;
      settings?: any;
    }>({
      query: (data) => ({
        url: '/pos/printers',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['Printer'],
    }),
    
    // Update printer
    updatePrinter: builder.mutation<any, {
      name: string;
      data: {
        name?: string;
        type?: string;
        width?: number;
        height?: number;
        networkUrl?: string;
        driver?: string;
        enabled?: boolean;
        location?: any;
        copies?: number;
        priority?: string;
        autoPrint?: boolean;
        description?: string;
        settings?: any;
      };
    }>({
      query: ({ name, data }) => ({
        url: `/pos/printers/${name}`,
        method: 'PUT',
        body: data,
      }),
      invalidatesTags: ['Printer'],
    }),
    
    // Delete printer
    deletePrinter: builder.mutation<{ success: boolean; message: string }, string>({
      query: (name) => ({
        url: `/pos/printers/${name}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Printer'],
    }),
    
    // Get printer status
    getPrinterStatus: builder.query<{
      isOnline: boolean;
      enabled: boolean;
      lastPrinted?: string;
      queueLength: number;
    }, string>({
      query: (name) => `/pos/printers/${name}/status`,
      providesTags: (result, error, name) => [{ type: 'Printer', id: name }],
    }),

    // Get print queue
    getPrintQueue: builder.query<Array<{
      id: string;
      content: string;
      printerName: string;
      status: string;
      createdAt: string;
      completedAt?: string;
      error?: string;
    }>, void>({
      query: () => '/pos/printers/queue',
      providesTags: ['PrintJob'],
    }),

    // Get print job status
    getPrintJobStatus: builder.query<{
      id: string;
      content: string;
      printerName: string;
      status: string;
      createdAt: string;
      completedAt?: string;
      error?: string;
    }, string>({
      query: (jobId) => `/pos/print-jobs/${jobId}`,
      providesTags: (result, error, jobId) => [{ type: 'PrintJob', id: jobId }],
    }),

    // Cancel print job
    cancelPrintJob: builder.mutation<{ success: boolean; message: string }, string>({
      query: (jobId) => ({
        url: `/pos/print-jobs/${jobId}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['PrintJob'],
    }),

    // Get POS settings
    getPOSSettings: builder.query<{
      taxRate: number;
      serviceCharge: number;
      currency: string;
      receiptSettings: {
        header: string;
        footer: string;
        showLogo: boolean;
      };
      printerSettings: {
        enabled: boolean;
        printerId: string;
        autoPrint: boolean;
      };
    }, { branchId?: string }>({
      query: (params) => ({
        url: '/pos/settings',
        params,
      }),
      providesTags: ['POS'],
      transformResponse: (response: any) => {
        return response.data || response;
      },
    }),

    // Update POS settings
    updatePOSSettings: builder.mutation<void, {
      taxRate?: number;
      serviceCharge?: number;
      currency?: string;
      receiptSettings?: any;
      printerSettings?: any;
    }>({
      query: (data) => ({
        url: '/pos/settings',
        method: 'PUT',
        body: data,
      }),
      invalidatesTags: ['POS'],
    }),
  }),
});

export const {
  useCreatePOSOrderMutation,
  useGetPOSOrdersQuery,
  useGetPOSOrderQuery,
  useUpdatePOSOrderMutation,
  useCancelPOSOrderMutation,
  useProcessPaymentMutation,
  useGetPOSStatsQuery,
  useGetAvailableTablesQuery,
  useGetPOSMenuItemsQuery,
  useGetQuickStatsQuery,
  useSplitOrderMutation,
  useRefundOrderMutation,
  useGetTableOrderHistoryQuery,
  usePrintReceiptMutation,
  usePrintReceiptPDFMutation,
  useGetReceiptHTMLQuery,
  useDownloadReceiptPDFMutation,
  useGetPrintersQuery,
  useTestPrinterMutation,
  useCreatePrinterMutation,
  useUpdatePrinterMutation,
  useDeletePrinterMutation,
  useGetPrinterStatusQuery,
  useGetPrintQueueQuery,
  useGetPrintJobStatusQuery,
  useCancelPrintJobMutation,
  useGetPOSSettingsQuery,
  useUpdatePOSSettingsMutation,
} = posApi;
