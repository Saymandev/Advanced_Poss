import { apiSlice } from '../apiSlice';

export interface PurchaseReturn {
  id: string;
  returnNumber: string;
  companyId: string;
  branchId: string;
  supplierId?: string;
  supplierName?: string;
  items: Array<{
    productId: string;
    productName: string;
    quantity: number;
    unitCost: number;
    reason: string;
    notes?: string;
  }>;
  totalAmount: number;
  status: 'pending' | 'approved' | 'rejected' | 'settled';
  settlementType?: 'replacement' | 'credit_note' | 'refund';
  settlementDate?: string;
  createdBy?: { _id: string; firstName: string; lastName: string };
  approvedBy?: { _id: string; firstName: string; lastName: string };
  notes?: string;
  createdAt: string;
}

export const purchaseReturnsApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    createPurchaseReturn: builder.mutation<PurchaseReturn, {
      branchId: string;
      supplierId?: string;
      supplierName?: string;
      items: Array<{ productId: string; productName?: string; quantity: number; unitCost?: number; reason: string; notes?: string }>;
      notes?: string;
    }>({
      query: (body) => ({ url: '/purchase-returns', method: 'POST', body }),
      invalidatesTags: ['PurchaseReturn'],
    }),
    getPurchaseReturns: builder.query<{ returns: PurchaseReturn[]; total: number }, {
      companyId: string;
      branchId?: string;
      status?: string;
      page?: number;
      limit?: number;
    }>({
      query: (params) => ({ url: '/purchase-returns', params }),
      providesTags: ['PurchaseReturn'],
    }),
    getPurchaseReturn: builder.query<PurchaseReturn, string>({
      query: (id) => `/purchase-returns/${id}`,
      providesTags: ['PurchaseReturn'],
    }),
    updatePurchaseReturn: builder.mutation<PurchaseReturn, { id: string; status?: string; settlementType?: string }>({
      query: ({ id, ...body }) => ({ url: `/purchase-returns/${id}`, method: 'PATCH', body }),
      invalidatesTags: ['PurchaseReturn'],
    }),
    deletePurchaseReturn: builder.mutation<void, string>({
      query: (id) => ({ url: `/purchase-returns/${id}`, method: 'DELETE' }),
      invalidatesTags: ['PurchaseReturn'],
    }),
  }),
});

export const {
  useCreatePurchaseReturnMutation,
  useGetPurchaseReturnsQuery,
  useGetPurchaseReturnQuery,
  useUpdatePurchaseReturnMutation,
  useDeletePurchaseReturnMutation,
} = purchaseReturnsApi;
