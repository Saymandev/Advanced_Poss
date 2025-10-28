import { apiSlice } from '../apiSlice';

export interface OrderItem {
  menuItemId: string;
  name: string;
  quantity: number;
  price: number;
  notes?: string;
}

export interface CreateOrderRequest {
  tableId?: string;
  customerId?: string;
  items: OrderItem[];
  orderType: 'dine-in' | 'takeaway' | 'delivery';
  notes?: string;
}

export interface Order {
  id: string;
  orderNumber: string;
  tableId?: string;
  customerId?: string;
  items: OrderItem[];
  subtotal: number;
  tax: number;
  total: number;
  status: string;
  orderType: string;
  createdAt: string;
  updatedAt: string;
}

export const ordersApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getOrders: builder.query<{ orders: Order[]; total: number }, any>({
      query: (params) => ({
        url: '/orders',
        params,
      }),
      providesTags: ['Order'],
      transformResponse: (response: any) => {
        const data = response.data || response;
        return {
          orders: data.orders || data.items || [],
          total: data.total || (Array.isArray(data.orders) ? data.orders.length : 0),
        };
      },
    }),
    getOrderById: builder.query<Order, string>({
      query: (id) => `/orders/${id}`,
      providesTags: ['Order'],
      transformResponse: (response: any) => {
        return response.data || response;
      },
    }),
    createOrder: builder.mutation<Order, CreateOrderRequest>({
      query: (data) => ({
        url: '/orders',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['Order', 'Table'],
    }),
    updateOrderStatus: builder.mutation<Order, { id: string; status: string }>({
      query: ({ id, status }) => ({
        url: `/orders/${id}/status`,
        method: 'PATCH',
        body: { status },
      }),
      invalidatesTags: ['Order', 'Kitchen'],
    }),
    updateOrder: builder.mutation<Order, { id: string; data: Partial<CreateOrderRequest> }>({
      query: ({ id, data }) => ({
        url: `/orders/${id}`,
        method: 'PATCH',
        body: data,
      }),
      invalidatesTags: ['Order'],
    }),
    addPayment: builder.mutation<Order, { id: string; amount: number; method: string }>({
      query: ({ id, ...data }) => ({
        url: `/orders/${id}/payment`,
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['Order'],
    }),
    splitOrder: builder.mutation<Order, { id: string; splitData: any }>({
      query: ({ id, splitData }) => ({
        url: `/orders/${id}/split`,
        method: 'POST',
        body: splitData,
      }),
      invalidatesTags: ['Order'],
    }),
    deleteOrder: builder.mutation<void, string>({
      query: (id) => ({
        url: `/orders/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Order'],
    }),
  }),
});

export const {
  useGetOrdersQuery,
  useGetOrderByIdQuery,
  useCreateOrderMutation,
  useUpdateOrderStatusMutation,
  useUpdateOrderMutation,
  useAddPaymentMutation,
  useSplitOrderMutation,
  useDeleteOrderMutation,
} = ordersApi;

