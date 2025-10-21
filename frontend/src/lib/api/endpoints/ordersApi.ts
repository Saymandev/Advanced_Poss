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
    }),
    getOrderById: builder.query<Order, string>({
      query: (id) => `/orders/${id}`,
      providesTags: ['Order'],
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
  }),
});

export const {
  useGetOrdersQuery,
  useGetOrderByIdQuery,
  useCreateOrderMutation,
  useUpdateOrderStatusMutation,
} = ordersApi;

