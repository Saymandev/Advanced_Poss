import { apiSlice } from '../apiSlice';

export interface InventoryItem {
  id: string;
  name: string;
  description?: string;
  category: string;
  unit: string;
  currentStock: number;
  minStock: number;
  maxStock: number;
  unitPrice: number;
  totalValue: number;
  supplier?: {
    id: string;
    name: string;
    contactInfo: string;
  };
  expiryDate?: string;
  lastRestocked?: string;
  status: 'in-stock' | 'low-stock' | 'out-of-stock' | 'expired';
  location?: string;
  barcode?: string;
  sku?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateInventoryItemRequest {
  name: string;
  description?: string;
  category: string;
  unit: string;
  currentStock: number;
  minStock: number;
  maxStock: number;
  unitPrice: number;
  supplierId?: string;
  expiryDate?: string;
  location?: string;
  barcode?: string;
  sku?: string;
  notes?: string;
}

export interface UpdateInventoryItemRequest extends Partial<CreateInventoryItemRequest> {
  id: string;
}

export interface StockAdjustment {
  id: string;
  inventoryItemId: string;
  type: 'in' | 'out' | 'adjustment';
  quantity: number;
  reason: string;
  notes?: string;
  performedBy: string;
  createdAt: string;
}

export interface CreateStockAdjustmentRequest {
  inventoryItemId: string;
  type: 'in' | 'out' | 'adjustment';
  quantity: number;
  reason: string;
  notes?: string;
}

export interface Supplier {
  id: string;
  name: string;
  contactPerson: string;
  email: string;
  phoneNumber: string;
  address: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  };
  paymentTerms: string;
  isActive: boolean;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export const inventoryApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getInventoryItems: builder.query<{ items: InventoryItem[]; total: number }, any>({
      query: (params) => ({
        url: '/inventory',
        params,
      }),
      providesTags: ['Ingredient'],
    }),
    getInventoryItemById: builder.query<InventoryItem, string>({
      query: (id) => `/inventory/${id}`,
      providesTags: ['Ingredient'],
    }),
    createInventoryItem: builder.mutation<InventoryItem, CreateInventoryItemRequest>({
      query: (data) => ({
        url: '/inventory',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['Ingredient'],
    }),
    updateInventoryItem: builder.mutation<InventoryItem, UpdateInventoryItemRequest>({
      query: ({ id, ...data }) => ({
        url: `/inventory/${id}`,
        method: 'PATCH',
        body: data,
      }),
      invalidatesTags: ['Ingredient'],
    }),
    deleteInventoryItem: builder.mutation<void, string>({
      query: (id) => ({
        url: `/inventory/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Ingredient'],
    }),
    adjustStock: builder.mutation<StockAdjustment, CreateStockAdjustmentRequest>({
      query: (data) => ({
        url: '/inventory/adjust-stock',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['Ingredient'],
    }),
    getStockAdjustments: builder.query<{ adjustments: StockAdjustment[]; total: number }, any>({
      query: (params) => ({
        url: '/inventory/adjustments',
        params,
      }),
      providesTags: ['Ingredient'],
    }),
    getLowStockItems: builder.query<InventoryItem[], { branchId?: string }>({
      query: (params) => ({
        url: '/inventory/low-stock',
        params,
      }),
      providesTags: ['Ingredient'],
    }),
    getExpiringItems: builder.query<InventoryItem[], { 
      branchId?: string; 
      days?: number 
    }>({
      query: (params) => ({
        url: '/inventory/expiring',
        params,
      }),
      providesTags: ['Ingredient'],
    }),
    getSuppliers: builder.query<{ suppliers: Supplier[]; total: number }, any>({
      query: (params) => ({
        url: '/suppliers',
        params,
      }),
      providesTags: ['Supplier'],
    }),
    createSupplier: builder.mutation<Supplier, Omit<Supplier, 'id' | 'createdAt' | 'updatedAt'>>({
      query: (data) => ({
        url: '/suppliers',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['Supplier'],
    }),
    updateSupplier: builder.mutation<Supplier, { id: string; data: Partial<Supplier> }>({
      query: ({ id, data }) => ({
        url: `/suppliers/${id}`,
        method: 'PATCH',
        body: data,
      }),
      invalidatesTags: ['Supplier'],
    }),
    deleteSupplier: builder.mutation<void, string>({
      query: (id) => ({
        url: `/suppliers/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Supplier'],
    }),
  }),
});

export const {
  useGetInventoryItemsQuery,
  useGetInventoryItemByIdQuery,
  useCreateInventoryItemMutation,
  useUpdateInventoryItemMutation,
  useDeleteInventoryItemMutation,
  useAdjustStockMutation,
  useGetStockAdjustmentsQuery,
  useGetLowStockItemsQuery,
  useGetExpiringItemsQuery,
  useGetSuppliersQuery,
  useCreateSupplierMutation,
  useUpdateSupplierMutation,
  useDeleteSupplierMutation,
} = inventoryApi;
