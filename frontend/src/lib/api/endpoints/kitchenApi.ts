import { apiSlice } from '../apiSlice';

export interface KitchenOrderItem {
  itemId: string;
  menuItemId: string;
  name: string;
  quantity: number;
  status: 'pending' | 'preparing' | 'ready' | 'delivered';
  notes?: string;
  priority?: 'low' | 'normal' | 'high' | 'urgent';
  prepTime?: number;
  startedAt?: string;
  completedAt?: string;
}

export interface KitchenOrder {
  id: string;
  orderNumber: string;
  tableNumber?: string;
  orderType: 'dine-in' | 'takeaway' | 'delivery';
  items: KitchenOrderItem[];
  status: 'pending' | 'preparing' | 'ready' | 'completed';
  priority?: 'low' | 'normal' | 'high' | 'urgent';
  specialInstructions?: string;
  estimatedTime?: number;
  createdAt: string;
  updatedAt: string;
}

export interface KitchenStats {
  pending: number;
  preparing: number;
  ready: number;
  delayed: number;
  avgPrepTime: number;
  ordersCompleted: number;
}

export const kitchenApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getKitchenOrders: builder.query<KitchenOrder[], string>({
      query: (branchId) => `/kitchen/branch/${branchId}`,
      providesTags: ['Kitchen'],
      transformResponse: (response: any) => {
        const data = response.data || response;
        return Array.isArray(data) ? data : [];
      },
    }),
    getKitchenPendingOrders: builder.query<KitchenOrder[], string>({
      query: (branchId) => `/kitchen/branch/${branchId}/pending`,
      providesTags: ['Kitchen'],
      transformResponse: (response: any) => {
        const data = response.data || response;
        return Array.isArray(data) ? data : [];
      },
    }),
    getKitchenPreparingOrders: builder.query<KitchenOrder[], string>({
      query: (branchId) => `/kitchen/branch/${branchId}/preparing`,
      providesTags: ['Kitchen'],
      transformResponse: (response: any) => {
        const data = response.data || response;
        return Array.isArray(data) ? data : [];
      },
    }),
    getKitchenReadyOrders: builder.query<KitchenOrder[], string>({
      query: (branchId) => `/kitchen/branch/${branchId}/ready`,
      providesTags: ['Kitchen'],
      transformResponse: (response: any) => {
        const data = response.data || response;
        return Array.isArray(data) ? data : [];
      },
    }),
    getKitchenDelayedOrders: builder.query<KitchenOrder[], string>({
      query: (branchId) => `/kitchen/branch/${branchId}/delayed`,
      providesTags: ['Kitchen'],
      transformResponse: (response: any) => {
        const data = response.data || response;
        return Array.isArray(data) ? data : [];
      },
    }),
    getKitchenUrgentOrders: builder.query<KitchenOrder[], string>({
      query: (branchId) => `/kitchen/branch/${branchId}/urgent`,
      providesTags: ['Kitchen'],
      transformResponse: (response: any) => {
        const data = response.data || response;
        return Array.isArray(data) ? data : [];
      },
    }),
    getKitchenStats: builder.query<KitchenStats, string>({
      query: (branchId) => `/kitchen/branch/${branchId}/stats`,
      providesTags: ['Kitchen'],
      transformResponse: (response: any) => {
        const data = response.data || response;
        return {
          pending: data.pending || 0,
          preparing: data.preparing || 0,
          ready: data.ready || 0,
          delayed: data.delayed || 0,
          urgent: data.urgent || 0,
          avgPrepTime: data.averageTime || data.avgPrepTime || 0,
          ordersCompleted: data.completedToday || data.ordersCompleted || 0,
        };
      },
    }),
    getKitchenOrderById: builder.query<KitchenOrder, string>({
      query: (id) => `/kitchen/${id}`,
      providesTags: ['Kitchen'],
    }),
    getKitchenOrderByOrderId: builder.query<KitchenOrder, string>({
      query: (orderId) => `/kitchen/order/${orderId}`,
      providesTags: ['Kitchen'],
    }),
    startKitchenOrder: builder.mutation<KitchenOrder, { id: string; chefId: string }>({
      query: ({ id, chefId }) => ({
        url: `/kitchen/${id}/start`,
        method: 'POST',
        body: { chefId },
      }),
      invalidatesTags: ['Kitchen', 'Order'],
    }),
    startKitchenOrderItem: builder.mutation<KitchenOrder, { id: string; itemId: string; chefId: string }>({
      query: ({ id, itemId, chefId }) => ({
        url: `/kitchen/${id}/items/${itemId}/start`,
        method: 'POST',
        body: { chefId },
      }),
      invalidatesTags: ['Kitchen'],
    }),
    completeKitchenOrderItem: builder.mutation<KitchenOrder, { id: string; itemId: string }>({
      query: ({ id, itemId }) => ({
        url: `/kitchen/${id}/items/${itemId}/complete`,
        method: 'POST',
      }),
      invalidatesTags: ['Kitchen'],
    }),
    completeKitchenOrder: builder.mutation<KitchenOrder, string>({
      query: (id) => ({
        url: `/kitchen/${id}/complete`,
        method: 'POST',
      }),
      invalidatesTags: ['Kitchen', 'Order'],
    }),
    markKitchenOrderUrgent: builder.mutation<KitchenOrder, { id: string; isUrgent: boolean }>({
      query: ({ id, isUrgent }) => ({
        url: `/kitchen/${id}/urgent`,
        method: 'PATCH',
        body: { isUrgent },
      }),
      invalidatesTags: ['Kitchen'],
    }),
    updateKitchenItemPriority: builder.mutation<KitchenOrder, { id: string; itemId: string; priority: string }>({
      query: ({ id, itemId, priority }) => ({
        url: `/kitchen/${id}/items/${itemId}/priority`,
        method: 'PATCH',
        body: { priority },
      }),
      invalidatesTags: ['Kitchen'],
    }),
    cancelKitchenOrder: builder.mutation<KitchenOrder, string>({
      query: (id) => ({
        url: `/kitchen/${id}/cancel`,
        method: 'POST',
      }),
      invalidatesTags: ['Kitchen', 'Order'],
    }),
  }),
});

export const {
  useGetKitchenOrdersQuery,
  useGetKitchenPendingOrdersQuery,
  useGetKitchenPreparingOrdersQuery,
  useGetKitchenReadyOrdersQuery,
  useGetKitchenDelayedOrdersQuery,
  useGetKitchenUrgentOrdersQuery,
  useGetKitchenStatsQuery,
  useGetKitchenOrderByIdQuery,
  useGetKitchenOrderByOrderIdQuery,
  useStartKitchenOrderMutation,
  useStartKitchenOrderItemMutation,
  useCompleteKitchenOrderItemMutation,
  useCompleteKitchenOrderMutation,
  useMarkKitchenOrderUrgentMutation,
  useUpdateKitchenItemPriorityMutation,
  useCancelKitchenOrderMutation,
} = kitchenApi;

