import { apiSlice } from '../apiSlice';

export interface POSOrderItem {
  menuItemId: string;
  name?: string; // Menu item name (stored for easier access)
  quantity: number;
  price: number;
  notes?: string;
}

export interface CreatePOSOrderRequest {
  orderType: 'dine-in' | 'delivery' | 'takeaway';
  tableId?: string;
  deliveryFee?: number;
  deliveryDetails?: {
    contactName?: string;
    contactPhone?: string;
    addressLine1?: string;
    addressLine2?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    instructions?: string;
    assignedDriver?: string;
  };
  takeawayDetails?: {
    contactName?: string;
    contactPhone?: string;
    instructions?: string;
    assignedDriver?: string;
  };
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
  guestCount?: number;
  waiterId?: string; // Optional waiter/user ID to assign the order to
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

export type DeliveryStatus = 'pending' | 'assigned' | 'out_for_delivery' | 'delivered' | 'cancelled';

export interface DeliveryOrder extends POSOrder {
  deliveryStatus?: DeliveryStatus;
  assignedDriverId?: string;
  assignedAt?: string;
  outForDeliveryAt?: string;
  deliveredAt?: string;
}

export const posApi = apiSlice.injectEndpoints({
  overrideExisting: true,
  endpoints: (builder) => ({
    // Create POS order
    createPOSOrder: builder.mutation<POSOrder, CreatePOSOrderRequest>({
      query: (data) => ({
        url: '/pos/orders',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['Order', 'POS', 'Table', 'Customer'],
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
      orderType?: 'dine-in' | 'delivery' | 'takeaway';
      search?: string;
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
      transformResponse: (response: any) => {
        return response.data || response;
      },
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
    cancelPOSOrder: builder.mutation<POSOrder, { id: string; reason?: string }>({
      query: ({ id, reason }) => ({
        url: `/pos/orders/${id}/cancel`,
        method: 'PATCH',
        body: { reason: reason || 'Cancelled from POS terminal' },
      }),
      invalidatesTags: (result, error, { id }) => [{ type: 'POS', id }, 'POS'],
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
      invalidatesTags: ['POS', 'Payment', 'Customer'],
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

    // Get delivery orders
    getDeliveryOrders: builder.query<DeliveryOrder[], { deliveryStatus?: DeliveryStatus; assignedDriverId?: string }>({
      query: (params) => ({
        url: '/pos/delivery-orders',
        params,
      }),
      providesTags: ['POS'],
      transformResponse: (response: any) => {
        const data = response.data || response;
        let orders = [];
        if (Array.isArray(data)) {
          orders = data;
        } else if (Array.isArray(data?.orders)) {
          orders = data.orders;
        }
        // Normalize _id to id for consistency
        return orders.map((order: any) => ({
          ...order,
          id: order._id || order.id,
        }));
      },
    }),

    // Assign driver to delivery order
    assignDeliveryDriver: builder.mutation<DeliveryOrder, { orderId: string; driverId: string }>({
      query: ({ orderId, driverId }) => ({
        url: `/pos/orders/${orderId}/assign-driver`,
        method: 'POST',
        body: { driverId },
      }),
      invalidatesTags: ['POS'],
    }),

    // Update delivery status
    updateDeliveryStatus: builder.mutation<DeliveryOrder, { orderId: string; status: DeliveryStatus }>({
      query: ({ orderId, status }) => ({
        url: `/pos/orders/${orderId}/delivery-status`,
        method: 'PATCH',
        body: { status },
      }),
      invalidatesTags: ['POS'],
    }),

    // Get waiter active orders count (for busy indicator)
    getWaiterActiveOrdersCount: builder.query<Record<string, number>, void>({
      query: () => ({
        url: '/pos/waiters/active-orders',
      }),
      providesTags: ['POS'],
      transformResponse: (response: any) => {
        return response.data || response || {};
      },
    }),

    // Get available tables for POS
    getAvailableTables: builder.query<Array<{
      id: string;
      number: string;
      tableNumber?: string;
      capacity: number;
      status: 'available' | 'occupied' | 'reserved';
      currentOrderId?: string;
      location?: string;
      orderDetails?: {
        currentOrderId?: string;
        orderNumber: string;
        tokenNumber: string;
        totalAmount: number;
        waiterName?: string;
        guestCount?: number;
        holdCount?: number;
        usedSeats?: number;
        remainingSeats?: number;
        orderStatus?: string;
        allOrders?: Array<{
          id: string;
          orderNumber: string;
          totalAmount: number;
          guestCount?: number;
          status: string;
        }>;
      };
    }>, void>({
      query: () => {
        // Use POS endpoint which gets tables from branchId in JWT token
        // No need to pass branchId - backend extracts it from JWT
        return {
          url: '/pos/tables/available',
        };
      },
      providesTags: (result) => 
        result 
          ? [
              ...result.map(({ id }) => ({ type: 'Table' as const, id })),
              { type: 'Table' as const, id: 'LIST' },
              'Table',
              'POS',
            ]
          : ['Table', 'POS'],
      transformResponse: (response: any) => {
        const data = response.data || response;
        let items = [];
        
        // Handle different response structures
        if (Array.isArray(data)) {
          items = data;
        } else if (data.tables) {
          items = data.tables;
        } else if (data.items) {
          items = data.items;
        }
        
        // Normalize table format
        return items.map((table: any) => ({
          id: table._id || table.id,
          number: table.tableNumber || table.number || '',
          tableNumber: table.tableNumber || table.number || '',
          capacity: table.capacity || 0,
          status: table.status || 'available',
          currentOrderId: table.currentOrderId,
          location: table.location,
          orderDetails: table.orderDetails ? {
            ...table.orderDetails,
            orderStatus: table.orderDetails.orderStatus || table.orderDetails.status,
          } : undefined,
        }));
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
      stockStatus?: 'ok' | 'low' | 'out';
      isLowStock?: boolean;
      isOutOfStock?: boolean;
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
        const data = response.data || response;
        
        // Handle array response directly
        const normalize = (item: any) => ({
          id: item._id || item.id,
          name: item.name,
          description: item.description,
          price: item.price || 0,
          image: item.imageUrl || item.image,
          category: item.categoryId || item.category || { id: '', name: 'Uncategorized' },
          isAvailable: item.isAvailable !== undefined ? item.isAvailable : true,
          stock: item.stock || item.currentStock,
          stockStatus: item.stockStatus || (item.isOutOfStock ? 'out' : item.isLowStock ? 'low' : 'ok'),
          isLowStock: item.isLowStock || item.stockStatus === 'low',
          isOutOfStock: item.isOutOfStock || item.stockStatus === 'out',
        });

        if (Array.isArray(data)) {
          return data.map(normalize);
        }
        
        // Handle object with items array
        const items = data.menuItems || data.items || [];
        return items.map(normalize);
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
      transformResponse: (response: any) => {
        return response.data || response;
      },
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
      invalidatesTags: ['POS', 'Payment', 'Customer'],
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
      transformResponse: (response: any) => {
        const data = response.data || response;
        return Array.isArray(data) ? data : (data.orders || data.items || []);
      },
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
      transformResponse: (response: any) => {
        const data = response.data || response;
        return Array.isArray(data) ? data : (data.printers || data.items || []);
      },
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
      transformResponse: (response: any) => {
        return response.data || response;
      },
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
      transformResponse: (response: any) => {
        return response.data || response;
      },
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
      transformResponse: (response: any) => {
        return response.data || response;
      },
      invalidatesTags: ['Printer'],
    }),
    
    // Delete printer
    deletePrinter: builder.mutation<{ success: boolean; message: string }, string>({
      query: (name) => ({
        url: `/pos/printers/${name}`,
        method: 'DELETE',
      }),
      transformResponse: (response: any) => {
        return response.data || response;
      },
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
      transformResponse: (response: any) => {
        return response.data || response;
      },
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
      transformResponse: (response: any) => {
        const data = response.data || response;
        return Array.isArray(data) ? data : (data.queue || data.items || []);
      },
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
      transformResponse: (response: any) => {
        return response.data || response;
      },
      providesTags: (result, error, jobId) => [{ type: 'PrintJob', id: jobId }],
    }),

    // Cancel print job
    cancelPrintJob: builder.mutation<{ success: boolean; message: string }, string>({
      query: (jobId) => ({
        url: `/pos/print-jobs/${jobId}`,
        method: 'DELETE',
      }),
      transformResponse: (response: any) => {
        return response.data || response;
      },
      invalidatesTags: ['PrintJob'],
    }),

    // Get POS settings
    getPOSSettings: builder.query<{
      taxRate: number;
      serviceCharge: number;
      currency: string;
      defaultPaymentMode?: 'pay-first' | 'pay-later';
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
      providesTags: (result, error, arg) => [
        { type: 'POS', id: 'SETTINGS' },
        { type: 'POS', id: `SETTINGS-${arg.branchId || 'default'}` },
        'POS', // Also tag with general POS tag for broader invalidation
      ],
      transformResponse: (response: any) => {
        return response.data || response;
      },
    }),

    // Update POS settings
    updatePOSSettings: builder.mutation<void, {
      taxRate?: number;
      serviceCharge?: number;
      currency?: string;
      defaultPaymentMode?: 'pay-first' | 'pay-later';
      receiptSettings?: any;
      printerSettings?: any;
    }>({
      query: (data) => ({
        url: '/pos/settings',
        method: 'PUT',
        body: data,
      }),
      invalidatesTags: () => [
        { type: 'POS', id: 'SETTINGS' },
        { type: 'POS', id: 'SETTINGS-default' },
        'POS', // Invalidate all POS queries to ensure settings refresh everywhere
      ],
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
  useGetWaiterActiveOrdersCountQuery,
  useGetDeliveryOrdersQuery,
  useAssignDeliveryDriverMutation,
  useUpdateDeliveryStatusMutation,
} = posApi;
