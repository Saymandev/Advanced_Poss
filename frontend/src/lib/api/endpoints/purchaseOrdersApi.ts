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
  companyId: string;
  branchId?: string;
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
      companyId?: string;
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
      transformResponse: (response: any) => {
        const data = response.data || response;
        const ordersData = data.orders || data.items || [];
        
        return {
          orders: ordersData.map((order: any) => ({
            id: order._id || order.id,
            orderNumber: order.orderNumber,
            supplierId: order.supplierId?._id || order.supplierId?.id || order.supplierId,
            supplier: order.supplier || order.supplierId ? {
              id: order.supplierId?._id || order.supplierId?.id || order.supplierId,
              name: order.supplierId?.name || order.supplier?.name || '',
              contactPerson: order.supplierId?.contactPerson || order.supplier?.contactPerson || '',
              phoneNumber: order.supplierId?.phone || order.supplierId?.phoneNumber || order.supplier?.phoneNumber || '',
              email: order.supplierId?.email || order.supplier?.email || '',
            } : {
              id: '',
              name: '',
              contactPerson: '',
              phoneNumber: '',
              email: '',
            },
            status: order.status,
            orderDate: order.orderDate,
            expectedDeliveryDate: order.expectedDeliveryDate,
            actualDeliveryDate: order.actualDeliveryDate,
            totalAmount: order.totalAmount || 0,
            taxAmount: order.taxAmount || 0,
            discountAmount: order.discountAmount,
            notes: order.notes,
            items: (order.items || []).map((item: any) => ({
              id: item._id || item.id,
              ingredientId: item.ingredientId?._id || item.ingredientId?.id || item.ingredientId,
              ingredient: item.ingredient || item.ingredientId ? {
                id: item.ingredientId?._id || item.ingredientId?.id || item.ingredientId,
                name: item.ingredientId?.name || item.ingredient?.name || item.ingredientName || '',
                unit: item.ingredientId?.unit || item.ingredient?.unit || item.unit || '',
              } : {
                id: '',
                name: item.ingredientName || '',
                unit: item.unit || '',
              },
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              totalPrice: item.totalPrice || (item.quantity * item.unitPrice),
              receivedQuantity: item.receivedQuantity,
              notes: item.notes,
            })),
            createdBy: order.createdBy,
            approvedBy: order.approvedBy,
            createdAt: order.createdAt,
            updatedAt: order.updatedAt,
          } as PurchaseOrder)),
          total: data.total || ordersData.length,
        };
      },
      providesTags: ['PurchaseOrder'],
    }),
    getPurchaseOrderById: builder.query<PurchaseOrder, string>({
      query: (id) => `/purchase-orders/${id}`,
      transformResponse: (response: any) => {
        const order = response.data || response;
        return {
          id: order._id || order.id,
          orderNumber: order.orderNumber,
          supplierId: order.supplierId?._id || order.supplierId?.id || order.supplierId,
          supplier: order.supplier || order.supplierId ? {
            id: order.supplierId?._id || order.supplierId?.id || order.supplierId,
            name: order.supplierId?.name || order.supplier?.name || '',
            contactPerson: order.supplierId?.contactPerson || order.supplier?.contactPerson || '',
            phoneNumber: order.supplierId?.phone || order.supplierId?.phoneNumber || order.supplier?.phoneNumber || '',
            email: order.supplierId?.email || order.supplier?.email || '',
          } : {
            id: '',
            name: '',
            contactPerson: '',
            phoneNumber: '',
            email: '',
          },
          status: order.status,
          orderDate: order.orderDate,
          expectedDeliveryDate: order.expectedDeliveryDate,
          actualDeliveryDate: order.actualDeliveryDate,
          totalAmount: order.totalAmount || 0,
          taxAmount: order.taxAmount || 0,
          discountAmount: order.discountAmount,
          notes: order.notes,
          items: (order.items || []).map((item: any) => ({
            id: item._id || item.id,
            ingredientId: item.ingredientId?._id || item.ingredientId?.id || item.ingredientId,
            ingredient: item.ingredient || item.ingredientId ? {
              id: item.ingredientId?._id || item.ingredientId?.id || item.ingredientId,
              name: item.ingredientId?.name || item.ingredient?.name || item.ingredientName || '',
              unit: item.ingredientId?.unit || item.ingredient?.unit || item.unit || '',
            } : {
              id: '',
              name: item.ingredientName || '',
              unit: item.unit || '',
            },
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            totalPrice: item.totalPrice || (item.quantity * item.unitPrice),
            receivedQuantity: item.receivedQuantity,
            notes: item.notes,
          })),
          createdBy: order.createdBy,
          approvedBy: order.approvedBy,
          createdAt: order.createdAt,
          updatedAt: order.updatedAt,
        } as PurchaseOrder;
      },
      providesTags: ['PurchaseOrder'],
    }),
    createPurchaseOrder: builder.mutation<PurchaseOrder, CreatePurchaseOrderRequest>({
      query: (data) => ({
        url: '/purchase-orders',
        method: 'POST',
        body: data,
      }),
      transformResponse: (response: any) => {
        const order = response.data || response;
        return {
          id: order._id || order.id,
          orderNumber: order.orderNumber,
          supplierId: order.supplierId?._id || order.supplierId?.id || order.supplierId,
          supplier: order.supplier || order.supplierId ? {
            id: order.supplierId?._id || order.supplierId?.id || order.supplierId,
            name: order.supplierId?.name || order.supplier?.name || '',
            contactPerson: order.supplierId?.contactPerson || order.supplier?.contactPerson || '',
            phoneNumber: order.supplierId?.phone || order.supplierId?.phoneNumber || order.supplier?.phoneNumber || '',
            email: order.supplierId?.email || order.supplier?.email || '',
          } : {
            id: '',
            name: '',
            contactPerson: '',
            phoneNumber: '',
            email: '',
          },
          status: order.status,
          orderDate: order.orderDate,
          expectedDeliveryDate: order.expectedDeliveryDate,
          actualDeliveryDate: order.actualDeliveryDate,
          totalAmount: order.totalAmount || 0,
          taxAmount: order.taxAmount || 0,
          discountAmount: order.discountAmount,
          notes: order.notes,
          items: (order.items || []).map((item: any) => ({
            id: item._id || item.id,
            ingredientId: item.ingredientId?._id || item.ingredientId?.id || item.ingredientId,
            ingredient: item.ingredient || item.ingredientId ? {
              id: item.ingredientId?._id || item.ingredientId?.id || item.ingredientId,
              name: item.ingredientId?.name || item.ingredient?.name || item.ingredientName || '',
              unit: item.ingredientId?.unit || item.ingredient?.unit || item.unit || '',
            } : {
              id: '',
              name: item.ingredientName || '',
              unit: item.unit || '',
            },
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            totalPrice: item.totalPrice || (item.quantity * item.unitPrice),
            receivedQuantity: item.receivedQuantity,
            notes: item.notes,
          })),
          createdBy: order.createdBy,
          approvedBy: order.approvedBy,
          createdAt: order.createdAt,
          updatedAt: order.updatedAt,
        } as PurchaseOrder;
      },
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
