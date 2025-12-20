import { apiSlice } from '../apiSlice';
export interface Supplier {
  id: string;
  code?: string;
  name: string;
  description?: string;
  logo?: string;
  type: 'food' | 'beverage' | 'equipment' | 'packaging' | 'service' | 'other';
  contactPerson: string;
  email: string;
  phone: string;
  phoneNumber?: string; // alias for phone
  alternatePhone?: string;
  website?: string;
  address: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  };
  // For backwards compatibility
  city?: string;
  state?: string;
  zipCode?: string;
  country?: string;
  taxId?: string;
  registrationNumber?: string;
  paymentTerms: 'net-7' | 'net-15' | 'net-30' | 'net-60' | 'cod' | 'prepaid';
  creditLimit?: number;
  currentBalance?: number;
  bankDetails?: {
    bankName: string;
    accountNumber: string;
    accountName: string;
    ifscCode?: string;
    swiftCode?: string;
  };
  productCategories?: string[];
  certifications?: string[];
  notes?: string;
  tags?: string[];
  rating: number;
  onTimeDeliveryRate?: number;
  qualityScore?: number;
  totalOrders?: number;
  totalPurchases?: number;
  lastOrderDate?: string;
  firstOrderDate?: string;
  isActive: boolean;
  isPreferred: boolean;
  deactivatedAt?: string;
  createdAt: string;
  updatedAt: string;
}
export interface CreateSupplierRequest {
  companyId: string;
  name: string;
  description?: string;
  logo?: string;
  type: 'food' | 'beverage' | 'equipment' | 'packaging' | 'service' | 'other';
  contactPerson: string;
  email: string;
  phone: string;
  alternatePhone?: string;
  website?: string;
  address: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  };
  taxId?: string;
  registrationNumber?: string;
  paymentTerms: 'net-7' | 'net-15' | 'net-30' | 'net-60' | 'cod' | 'prepaid';
  creditLimit?: number;
  bankDetails?: {
    bankName: string;
    accountNumber: string;
    accountName: string;
    ifscCode?: string;
    swiftCode?: string;
  };
  productCategories?: string[];
  certifications?: string[];
  notes?: string;
  tags?: string[];
}
export interface UpdateSupplierRequest extends Partial<CreateSupplierRequest> {
  rating?: number;
}
export const suppliersApi = apiSlice.injectEndpoints({
  overrideExisting: true,
  endpoints: (builder) => ({
    getSuppliers: builder.query<{ suppliers: Supplier[]; total: number }, {
      companyId?: string;
      type?: string;
      isActive?: boolean;
      search?: string;
      rating?: number;
      page?: number;
      limit?: number;
    }>({
      query: (params) => {
        // Remove undefined values to avoid sending them as query params
        const cleanParams: any = {};
        Object.keys(params).forEach(key => {
          const value = params[key as keyof typeof params];
          if (value !== undefined && value !== '' && value !== null) {
            cleanParams[key] = value;
          }
        });
        return {
          url: '/suppliers',
          params: cleanParams,
        };
      },
      transformResponse: (response: any) => {
        try {
          const data = response.data || response;
          let suppliers = [];
          if (data.suppliers && Array.isArray(data.suppliers)) {
            suppliers = data.suppliers;
          } else if (Array.isArray(data)) {
            suppliers = data;
          } else if (data.items && Array.isArray(data.items)) {
            suppliers = data.items;
          } else {
            console.warn('⚠️ Unexpected response structure:', data);
            suppliers = [];
          }
          const transformed = {
            suppliers: suppliers
              .filter((supplier: any) => {
                // Filter out invalid suppliers
                if (!supplier || (!supplier._id && !supplier.id)) {
                  console.warn('⚠️ Invalid supplier object:', supplier);
                  return false;
                }
                return true;
              })
              .map((supplier: any) => ({
                id: supplier._id?.toString() || supplier.id?.toString() || '',
                code: supplier.code,
                name: supplier.name || '',
                description: supplier.description,
                logo: supplier.logo,
                type: supplier.type || 'food',
                contactPerson: supplier.contactPerson || '',
                email: supplier.email || '',
                phone: supplier.phone || '',
                phoneNumber: supplier.phone || supplier.phoneNumber, // alias
                alternatePhone: supplier.alternatePhone,
                website: supplier.website,
                address: supplier.address || {
                  street: '',
                  city: '',
                  state: '',
                  zipCode: '',
                  country: '',
                },
                city: supplier.address?.city,
                state: supplier.address?.state,
                zipCode: supplier.address?.zipCode,
                country: supplier.address?.country,
                taxId: supplier.taxId,
                registrationNumber: supplier.registrationNumber,
                paymentTerms: supplier.paymentTerms || 'net-30',
                creditLimit: supplier.creditLimit,
                currentBalance: supplier.currentBalance,
                bankDetails: supplier.bankDetails,
                productCategories: supplier.productCategories || [],
                certifications: supplier.certifications || [],
                notes: supplier.notes,
                tags: supplier.tags || [],
                rating: supplier.rating || 5,
                onTimeDeliveryRate: supplier.onTimeDeliveryRate || 0,
                qualityScore: supplier.qualityScore || 0,
                totalOrders: supplier.totalOrders || 0,
                totalPurchases: supplier.totalPurchases || 0,
                lastOrderDate: supplier.lastOrderDate,
                firstOrderDate: supplier.firstOrderDate,
                isActive: supplier.isActive !== undefined ? supplier.isActive : true,
                isPreferred: supplier.isPreferred || false,
                deactivatedAt: supplier.deactivatedAt,
                createdAt: supplier.createdAt || new Date().toISOString(),
                updatedAt: supplier.updatedAt || new Date().toISOString(),
              } as Supplier)),
            total: typeof data.total === 'number' ? data.total : suppliers.length,
          };
          return transformed;
        } catch (error) {
          console.error('❌ Suppliers API Transform Error:', error);
          console.error('Response that caused error:', response);
          // Return empty result instead of throwing to prevent query from hanging
          return {
            suppliers: [],
            total: 0,
          };
        }
      },
      providesTags: (result) => 
        result 
          ? [{ type: 'Supplier' as const, id: 'LIST' }, ...result.suppliers.map(({ id }) => ({ type: 'Supplier' as const, id }))]
          : [{ type: 'Supplier' as const, id: 'LIST' }],
    }),
    getSupplierById: builder.query<Supplier, string>({
      query: (id) => `/suppliers/${id}`,
      transformResponse: (response: any) => {
        const supplier = response.data || response;
        return {
          id: supplier._id || supplier.id,
          code: supplier.code,
          name: supplier.name || '',
          description: supplier.description,
          logo: supplier.logo,
          type: supplier.type || 'food',
          contactPerson: supplier.contactPerson || '',
          email: supplier.email || '',
          phone: supplier.phone || '',
          phoneNumber: supplier.phone || supplier.phoneNumber,
          alternatePhone: supplier.alternatePhone,
          website: supplier.website,
          address: supplier.address || {
            street: '',
            city: '',
            state: '',
            zipCode: '',
            country: '',
          },
          city: supplier.address?.city,
          state: supplier.address?.state,
          zipCode: supplier.address?.zipCode,
          country: supplier.address?.country,
          taxId: supplier.taxId,
          registrationNumber: supplier.registrationNumber,
          paymentTerms: supplier.paymentTerms || 'net-30',
          creditLimit: supplier.creditLimit,
          currentBalance: supplier.currentBalance,
          bankDetails: supplier.bankDetails,
          productCategories: supplier.productCategories || [],
          certifications: supplier.certifications || [],
          notes: supplier.notes,
          tags: supplier.tags || [],
          rating: supplier.rating || 5,
          onTimeDeliveryRate: supplier.onTimeDeliveryRate || 0,
          qualityScore: supplier.qualityScore || 0,
          totalOrders: supplier.totalOrders || 0,
          totalPurchases: supplier.totalPurchases || 0,
          lastOrderDate: supplier.lastOrderDate,
          firstOrderDate: supplier.firstOrderDate,
          isActive: supplier.isActive !== undefined ? supplier.isActive : true,
          isPreferred: supplier.isPreferred || false,
          deactivatedAt: supplier.deactivatedAt,
          createdAt: supplier.createdAt || new Date().toISOString(),
          updatedAt: supplier.updatedAt || new Date().toISOString(),
        } as Supplier;
      },
      providesTags: ['Supplier'],
    }),
    createSupplier: builder.mutation<Supplier, CreateSupplierRequest>({
      query: (data) => ({
        url: '/suppliers',
        method: 'POST',
        body: data,
      }),
      transformResponse: (response: any) => {
        const data = response.data || response;
        const supplier = {
          id: data._id || data.id,
          code: data.code,
          name: data.name || '',
          description: data.description,
          logo: data.logo,
          type: data.type || 'food',
          contactPerson: data.contactPerson || '',
          email: data.email || '',
          phone: data.phone || '',
          phoneNumber: data.phone || data.phoneNumber,
          alternatePhone: data.alternatePhone,
          website: data.website,
          address: data.address || {
            street: '',
            city: '',
            state: '',
            zipCode: '',
            country: '',
          },
          city: data.address?.city,
          state: data.address?.state,
          zipCode: data.address?.zipCode,
          country: data.address?.country,
          taxId: data.taxId,
          registrationNumber: data.registrationNumber,
          paymentTerms: data.paymentTerms || 'net-30',
          creditLimit: data.creditLimit,
          currentBalance: data.currentBalance,
          bankDetails: data.bankDetails,
          productCategories: data.productCategories || [],
          certifications: data.certifications || [],
          notes: data.notes,
          tags: data.tags || [],
          rating: data.rating || 5,
          onTimeDeliveryRate: data.onTimeDeliveryRate || 0,
          qualityScore: data.qualityScore || 0,
          totalOrders: data.totalOrders || 0,
          totalPurchases: data.totalPurchases || 0,
          lastOrderDate: data.lastOrderDate,
          firstOrderDate: data.firstOrderDate,
          isActive: data.isActive !== undefined ? data.isActive : true,
          isPreferred: data.isPreferred || false,
          deactivatedAt: data.deactivatedAt,
          createdAt: data.createdAt || new Date().toISOString(),
          updatedAt: data.updatedAt || new Date().toISOString(),
        } as Supplier;
        return supplier;
      },
      invalidatesTags: [{ type: 'Supplier', id: 'LIST' }, 'Supplier'],
    }),
    updateSupplier: builder.mutation<Supplier, { id: string; data: UpdateSupplierRequest }>({
      query: ({ id, data }) => ({
        url: `/suppliers/${id}`,
        method: 'PATCH',
        body: data,
      }),
      invalidatesTags: (result, error, { id }) => [{ type: 'Supplier', id }, { type: 'Supplier', id: 'LIST' }],
    }),
    updateSupplierRating: builder.mutation<Supplier, { id: string; rating: number }>({
      query: ({ id, rating }) => ({
        url: `/suppliers/${id}/rating`,
        method: 'PATCH',
        body: { rating },
      }),
      invalidatesTags: ['Supplier'],
    }),
    makeSupplierPreferred: builder.mutation<Supplier, string>({
      query: (id) => ({
        url: `/suppliers/${id}/make-preferred`,
        method: 'POST',
      }),
      invalidatesTags: (result, error, id) => [{ type: 'Supplier', id }, { type: 'Supplier', id: 'LIST' }],
    }),
    removeSupplierPreferred: builder.mutation<Supplier, string>({
      query: (id) => ({
        url: `/suppliers/${id}/remove-preferred`,
        method: 'POST',
      }),
      invalidatesTags: (result, error, id) => [{ type: 'Supplier', id }, { type: 'Supplier', id: 'LIST' }],
    }),
    activateSupplier: builder.mutation<Supplier, string>({
      query: (id) => ({
        url: `/suppliers/${id}/activate`,
        method: 'PATCH',
      }),
      invalidatesTags: (result, error, id) => [{ type: 'Supplier', id }, { type: 'Supplier', id: 'LIST' }],
    }),
    deactivateSupplier: builder.mutation<Supplier, string>({
      query: (id) => ({
        url: `/suppliers/${id}/deactivate`,
        method: 'PATCH',
      }),
      invalidatesTags: (result, error, id) => [{ type: 'Supplier', id }, { type: 'Supplier', id: 'LIST' }],
    }),
    deleteSupplier: builder.mutation<void, string>({
      query: (id) => ({
        url: `/suppliers/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: (result, error, id) => [{ type: 'Supplier', id }, { type: 'Supplier', id: 'LIST' }],
    }),
    getSupplierPerformance: builder.query<any, string>({
      query: (id) => `/suppliers/${id}/performance`,
      providesTags: ['Supplier'],
    }),
    getSupplierStats: builder.query<any, string>({
      query: (companyId) => `/suppliers/company/${companyId}/stats`,
      providesTags: ['Supplier'],
    }),
    toggleSupplierStatus: builder.mutation<Supplier, { id: string; isActive: boolean }>({
      query: ({ id, isActive }) => ({
        url: `/suppliers/${id}/${isActive ? 'deactivate' : 'activate'}`,
        method: 'PATCH',
      }),
      invalidatesTags: ['Supplier'],
    }),
  }),
});
export const {
  useGetSuppliersQuery,
  useGetSupplierByIdQuery,
  useCreateSupplierMutation,
  useUpdateSupplierMutation,
  useUpdateSupplierRatingMutation,
  useMakeSupplierPreferredMutation,
  useRemoveSupplierPreferredMutation,
  useActivateSupplierMutation,
  useDeactivateSupplierMutation,
  useDeleteSupplierMutation,
  useGetSupplierPerformanceQuery,
  useGetSupplierStatsQuery,
  useToggleSupplierStatusMutation,
} = suppliersApi;