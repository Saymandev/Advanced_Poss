import { apiSlice } from '../apiSlice';
export interface InventoryItem {
  id: string;
  name: string;
  description?: string;
  category: 'food' | 'beverage' | 'packaging' | 'cleaning' | 'other';
  unit: 'kg' | 'g' | 'l' | 'ml' | 'pcs' | 'box' | 'pack' | 'bottle' | 'can';
  currentStock: number;
  minimumStock: number;
  maximumStock: number;
  reorderPoint: number;
  reorderQuantity: number;
  unitCost: number;
  totalValue: number;
  supplier?: {
    id: string;
    name: string;
    contactInfo: string;
  };
  preferredSupplierId?: string;
  storageLocation?: string;
  storageTemperature?: string;
  shelfLife?: number;
  expiryDate?: string;
  lastRestocked?: string;
  lastRestockedDate?: string;
  isLowStock: boolean;
  isOutOfStock: boolean;
  needsReorder: boolean;
  status: 'in-stock' | 'low-stock' | 'out-of-stock' | 'expired';
  location?: string;
  barcode?: string;
  sku?: string;
  tags?: string[];
  notes?: string;
  createdAt: string;
  updatedAt: string;
}
export interface CreateInventoryItemRequest {
  companyId: string;
  branchId?: string;
  name: string;
  description?: string;
  category: 'food' | 'beverage' | 'packaging' | 'cleaning' | 'other';
  unit: 'kg' | 'g' | 'l' | 'ml' | 'pcs' | 'box' | 'pack' | 'bottle' | 'can';
  currentStock: number;
  minimumStock: number;
  maximumStock?: number;
  reorderPoint?: number;
  reorderQuantity?: number;
  unitCost: number;
  preferredSupplierId?: string;
  storageLocation?: string;
  storageTemperature?: string;
  shelfLife?: number;
  barcode?: string;
  sku?: string;
  tags?: string[];
  notes?: string;
}
export interface UpdateInventoryItemRequest extends Partial<CreateInventoryItemRequest> {
  id: string;
}
export interface StockAdjustment {
  id: string;
  inventoryItemId: string;
  type: 'add' | 'remove' | 'set' | 'wastage';
  quantity: number;
  reason?: string;
  notes?: string;
  performedBy: string;
  createdAt: string;
}
export interface CreateStockAdjustmentRequest {
  type: 'add' | 'remove' | 'set' | 'wastage';
  quantity: number;
  reason?: string;
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
        url: '/ingredients',
        params,
      }),
      transformResponse: (response: any) => {
        // Handle wrapped response from TransformInterceptor: { success: true, data: [...] }
        // or direct response: [...]
        const unwrapData = (payload: any): any => {
          if (!payload || typeof payload !== 'object') return payload;
          if ('success' in payload && payload.success && payload.data) {
            return unwrapData(payload.data);
          }
          if ('data' in payload && payload.data) {
            return unwrapData(payload.data);
          }
          return payload;
        };
        const normalizedResponse = unwrapData(response);
        let items = [];
        let total = 0;
        if (Array.isArray(normalizedResponse)) {
          items = normalizedResponse;
          total = items.length;
        } else if (normalizedResponse && typeof normalizedResponse === 'object') {
          if (Array.isArray(normalizedResponse.ingredients)) {
            items = normalizedResponse.ingredients;
          } else if (Array.isArray(normalizedResponse.items)) {
            items = normalizedResponse.items;
          }
          total = normalizedResponse.total ?? items.length ?? 0;
        }
        return {
          items: items.map((ingredient: any) => ({
            id: ingredient._id || ingredient.id,
            name: ingredient.name || '',
            description: ingredient.description,
            category: ingredient.category || 'food',
            unit: ingredient.unit || 'pcs',
            currentStock: ingredient.currentStock || 0,
            minimumStock: ingredient.minimumStock || ingredient.minStock || 0,
            maximumStock: ingredient.maximumStock || ingredient.maxStock || 0,
            reorderPoint: ingredient.reorderPoint || 0,
            reorderQuantity: ingredient.reorderQuantity || 0,
            unitCost: ingredient.unitCost || ingredient.unitPrice || 0,
            totalValue: (ingredient.unitCost || ingredient.unitPrice || 0) * (ingredient.currentStock || 0),
            preferredSupplierId: ingredient.preferredSupplierId,
            storageLocation: ingredient.storageLocation,
            storageTemperature: ingredient.storageTemperature,
            shelfLife: ingredient.shelfLife,
            lastRestockedDate: ingredient.lastRestockedDate,
            isLowStock: ingredient.isLowStock || false,
            isOutOfStock: ingredient.isOutOfStock || false,
            needsReorder: ingredient.needsReorder || false,
            status: ingredient.isOutOfStock ? 'out-of-stock' : ingredient.isLowStock ? 'low-stock' : 'in-stock',
            barcode: ingredient.barcode,
            sku: ingredient.sku,
            tags: ingredient.tags || [],
            notes: ingredient.notes,
            createdAt: ingredient.createdAt || new Date().toISOString(),
            updatedAt: ingredient.updatedAt || new Date().toISOString(),
          } as InventoryItem)),
          total,
        };
      },
      providesTags: ['Ingredient'],
    }),
    getInventoryItemById: builder.query<InventoryItem, string>({
      query: (id) => `/ingredients/${id}`,
      transformResponse: (response: any) => {
        const ingredient = response.data || response;
        return {
          id: ingredient._id || ingredient.id,
          name: ingredient.name || '',
          description: ingredient.description,
          category: ingredient.category || 'food',
          unit: ingredient.unit || 'pcs',
          currentStock: ingredient.currentStock || 0,
          minimumStock: ingredient.minimumStock || ingredient.minStock || 0,
          maximumStock: ingredient.maximumStock || ingredient.maxStock || 0,
          reorderPoint: ingredient.reorderPoint || 0,
          reorderQuantity: ingredient.reorderQuantity || 0,
          unitCost: ingredient.unitCost || ingredient.unitPrice || 0,
          totalValue: (ingredient.unitCost || ingredient.unitPrice || 0) * (ingredient.currentStock || 0),
          preferredSupplierId: ingredient.preferredSupplierId,
          storageLocation: ingredient.storageLocation,
          storageTemperature: ingredient.storageTemperature,
          shelfLife: ingredient.shelfLife,
          lastRestockedDate: ingredient.lastRestockedDate,
          isLowStock: ingredient.isLowStock || false,
          isOutOfStock: ingredient.isOutOfStock || false,
          needsReorder: ingredient.needsReorder || false,
          status: ingredient.isOutOfStock ? 'out-of-stock' : ingredient.isLowStock ? 'low-stock' : 'in-stock',
          barcode: ingredient.barcode,
          sku: ingredient.sku,
          tags: ingredient.tags || [],
          notes: ingredient.notes,
          createdAt: ingredient.createdAt || new Date().toISOString(),
          updatedAt: ingredient.updatedAt || new Date().toISOString(),
        } as InventoryItem;
      },
      providesTags: ['Ingredient'],
    }),
    createInventoryItem: builder.mutation<InventoryItem, CreateInventoryItemRequest>({
      query: (data) => ({
        url: '/ingredients',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['Ingredient'],
    }),
    updateInventoryItem: builder.mutation<InventoryItem, UpdateInventoryItemRequest & { minStock?: number; maxStock?: number; unitPrice?: number }>({
      query: ({ id, ...data }) => {
        const body: any = {};
        // Map frontend field names to backend field names
        if (data.name !== undefined) body.name = data.name;
        if (data.description !== undefined) body.description = data.description;
        if (data.category !== undefined) body.category = data.category;
        if (data.unit !== undefined) body.unit = data.unit;
        if (data.currentStock !== undefined) body.currentStock = data.currentStock;
        // Handle both frontend aliases and backend field names
        if ((data as any).minStock !== undefined) body.minimumStock = (data as any).minStock;
        if (data.minimumStock !== undefined) body.minimumStock = data.minimumStock;
        if ((data as any).maxStock !== undefined) body.maximumStock = (data as any).maxStock;
        if (data.maximumStock !== undefined) body.maximumStock = data.maximumStock;
        if (data.reorderPoint !== undefined) body.reorderPoint = data.reorderPoint;
        if (data.reorderQuantity !== undefined) body.reorderQuantity = data.reorderQuantity;
        // Handle both frontend aliases and backend field names
        if ((data as any).unitPrice !== undefined) body.unitCost = (data as any).unitPrice;
        if (data.unitCost !== undefined) body.unitCost = data.unitCost;
        if (data.preferredSupplierId !== undefined) body.preferredSupplierId = data.preferredSupplierId;
        if (data.storageLocation !== undefined) body.storageLocation = data.storageLocation;
        if (data.storageTemperature !== undefined) body.storageTemperature = data.storageTemperature;
        if (data.shelfLife !== undefined) body.shelfLife = data.shelfLife;
        if (data.sku !== undefined) body.sku = data.sku;
        if (data.barcode !== undefined) body.barcode = data.barcode;
        if (data.tags !== undefined) body.tags = data.tags;
        if (data.notes !== undefined) body.notes = data.notes;
        return {
          url: `/ingredients/${id}`,
          method: 'PATCH',
          body,
        };
      },
      invalidatesTags: ['Ingredient'],
    }),
    deleteInventoryItem: builder.mutation<void, string>({
      query: (id) => ({
        url: `/ingredients/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Ingredient'],
    }),
    adjustStock: builder.mutation<StockAdjustment, { id: string; data: CreateStockAdjustmentRequest }>({
      query: ({ id, data }) => ({
        url: `/ingredients/${id}/adjust-stock`,
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['Ingredient'],
    }),
    addStock: builder.mutation<InventoryItem, { id: string; quantity: number }>({
      query: ({ id, quantity }) => ({
        url: `/ingredients/${id}/add-stock`,
        method: 'POST',
        body: { quantity },
      }),
      invalidatesTags: ['Ingredient'],
    }),
    removeStock: builder.mutation<InventoryItem, { id: string; quantity: number }>({
      query: ({ id, quantity }) => ({
        url: `/ingredients/${id}/remove-stock`,
        method: 'POST',
        body: { quantity },
      }),
      invalidatesTags: ['Ingredient'],
    }),
    getLowStockItems: builder.query<InventoryItem[], { companyId?: string; branchId?: string }>({
      query: ({ companyId, branchId }) => ({
        url: `/ingredients/company/${companyId}/low-stock`,
        params: { branchId },
      }),
      transformResponse: (response: any) => {
        const data = response.data || response || [];
        return Array.isArray(data) ? data.map((item: any) => ({
          id: item._id || item.id,
          name: item.name,
          currentStock: item.currentStock,
          minimumStock: item.minimumStock || item.minStock,
          unit: item.unit,
        } as InventoryItem)) : [];
      },
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
    fixAllStockStatuses: builder.mutation<{ fixed: number; total: number }, string>({
      query: (companyId) => ({
        url: `/ingredients/company/${companyId}/fix-all-statuses`,
        method: 'POST',
      }),
      invalidatesTags: ['Ingredient'],
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
  useAddStockMutation,
  useRemoveStockMutation,
  useGetLowStockItemsQuery,
  useGetExpiringItemsQuery,
  useGetSuppliersQuery,
  useCreateSupplierMutation,
  useUpdateSupplierMutation,
  useDeleteSupplierMutation,
  useFixAllStockStatusesMutation,
} = inventoryApi;
