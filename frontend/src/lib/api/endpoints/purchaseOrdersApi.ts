import { apiSlice } from '../apiSlice';

export interface PurchaseOrder {
  id: string;
  orderNumber: string;
  supplierId: string;
  supplier: {
    id: string;
    name: string;
    contactPerson: string;
    phoneNumber: string;
    email: string;
  };
  status: 'draft' | 'pending' | 'approved' | 'ordered' | 'received' | 'cancelled';
  orderDate: string;
  expectedDeliveryDate: string;
  actualDeliveryDate?: string;
  totalAmount: number;
  taxAmount: number;
  discountAmount?: number;
  notes?: string;
  items: Array<{
    id: string;
    ingredientId: string;
    ingredient: {
      id: string;
      name: string;
      unit: string;
    };
    quantity: number;
    unitPrice: number;
    totalPrice: number;
    receivedQuantity?: number;
    notes?: string;
  }>;
  createdBy: string;
  approvedBy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreatePurchaseOrderRequest {
  supplierId: string;
  expectedDeliveryDate: string;
  notes?: string;
  items: Array<{
    ingredientId: string;
    quantity: number;
    unitPrice: number;
    notes?: string;
  }>;
}

export interface UpdatePurchaseOrderRequest {
  expectedDeliveryDate?: string;
  notes?: string;
  status?: PurchaseOrder['status'];
  items?: Array<{
    id?: string;
    ingredientId: string;
    quantity: number;
    unitPrice: number;
    receivedQuantity?: number;
    notes?: string;
  }>;
}

export interface ApprovePurchaseOrderRequest {
  approvedBy: string;
  notes?: string;
}

export const purchaseOrdersApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getPurchaseOrders: builder.query<{ orders: PurchaseOrder[]; total: number }, {
      branchId?: string;
      supplierId?: string;
      status?: string;
      startDate?: string;
      endDate?: string;
      search?: string;
      page?: number;
      limit?: number;
    }>({
      query: (params) => ({
        url: '/purchase-orders',
        params,
      }),
      providesTags: ['PurchaseOrder'],
    }),
    getPurchaseOrderById: builder.query<PurchaseOrder, string>({
      query: (id) => `/purchase-orders/${id}`,
      providesTags: ['PurchaseOrder'],
    }),
    createPurchaseOrder: builder.mutation<PurchaseOrder, CreatePurchaseOrderRequest>({
      query: (data) => ({
        url: '/purchase-orders',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['PurchaseOrder', 'Ingredient'],
    }),
    updatePurchaseOrder: builder.mutation<PurchaseOrder, { id: string; data: UpdatePurchaseOrderRequest }>({
      query: ({ id, data }) => ({
        url: `/purchase-orders/${id}`,
        method: 'PATCH',
        body: data,
      }),
      invalidatesTags: ['PurchaseOrder', 'Ingredient'],
    }),
    deletePurchaseOrder: builder.mutation<void, string>({
      query: (id) => ({
        url: `/purchase-orders/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['PurchaseOrder'],
    }),
    approvePurchaseOrder: builder.mutation<PurchaseOrder, { id: string; data: ApprovePurchaseOrderRequest }>({
      query: ({ id, data }) => ({
        url: `/purchase-orders/${id}/approve`,
        method: 'PATCH',
        body: data,
      }),
      invalidatesTags: ['PurchaseOrder'],
    }),
    receivePurchaseOrder: builder.mutation<PurchaseOrder, { id: string; data: { receivedItems: Array<{ itemId: string; receivedQuantity: number }> } }>({
      query: ({ id, data }) => ({
        url: `/purchase-orders/${id}/receive`,
        method: 'PATCH',
        body: data,
      }),
      invalidatesTags: ['PurchaseOrder', 'Ingredient'],
    }),
    cancelPurchaseOrder: builder.mutation<PurchaseOrder, { id: string; reason: string }>({
      query: ({ id, reason }) => ({
        url: `/purchase-orders/${id}/cancel`,
        method: 'PATCH',
        body: { reason },
      }),
      invalidatesTags: ['PurchaseOrder'],
    }),
  }),
});

export const {
  useGetPurchaseOrdersQuery,
  useGetPurchaseOrderByIdQuery,
  useCreatePurchaseOrderMutation,
  useUpdatePurchaseOrderMutation,
  useDeletePurchaseOrderMutation,
  useApprovePurchaseOrderMutation,
  useReceivePurchaseOrderMutation,
  useCancelPurchaseOrderMutation,
} = purchaseOrdersApi;
