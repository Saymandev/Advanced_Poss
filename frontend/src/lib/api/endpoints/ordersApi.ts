import { apiSlice } from '@/lib/api/apiSlice'

export interface Order {
  id: string
  status: string
  tableId?: string
  items: Array<{ menuItemId: string; quantity: number; price: number }>
}

export const ordersApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    listOrders: builder.query<{ data: Order[] } | Order[], { page?: number; limit?: number } | void>({
      query: (params) => ({ url: '/orders', params }),
      providesTags: ['Orders'],
    }),
    getOrder: builder.query<Order, string>({
      query: (id) => `/orders/${id}`,
      providesTags: (_r, _e, id) => [{ type: 'Orders', id } as any],
    }),
    createOrder: builder.mutation<Order, Partial<Order>>({
      query: (body) => ({ url: '/orders', method: 'POST', body }),
      invalidatesTags: ['Orders'],
    }),
    updateOrder: builder.mutation<Order, { id: string; changes: Partial<Order> }>({
      query: ({ id, changes }) => ({ url: `/orders/${id}`, method: 'PUT', body: changes }),
      invalidatesTags: (_r, _e, arg) => [{ type: 'Orders', id: arg.id } as any],
    }),
    deleteOrder: builder.mutation<{ success: boolean }, string>({
      query: (id) => ({ url: `/orders/${id}`, method: 'DELETE' }),
      invalidatesTags: ['Orders'],
    }),
    updateOrderStatus: builder.mutation<Order, { id: string; status: string }>({
      query: ({ id, status }) => ({ url: `/orders/${id}/status`, method: 'PATCH', body: { status } }),
      invalidatesTags: (_r, _e, arg) => [{ type: 'Orders', id: arg.id } as any],
    }),
    addPaymentToOrder: builder.mutation<Order, { id: string; amount: number; method: string }>({
      query: ({ id, ...body }) => ({ url: `/orders/${id}/payment`, method: 'POST', body }),
      invalidatesTags: (_r, _e, arg) => [{ type: 'Orders', id: arg.id } as any],
    }),
  }),
})

export const { useListOrdersQuery, useGetOrderQuery, useCreateOrderMutation, useUpdateOrderMutation, useDeleteOrderMutation, useUpdateOrderStatusMutation, useAddPaymentToOrderMutation } = ordersApi


