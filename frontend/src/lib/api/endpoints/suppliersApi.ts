import { apiSlice } from '../apiSlice';

export interface Supplier {
  id: string;
  name: string;
  contactPerson: string;
  email: string;
  phoneNumber: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  website?: string;
  taxId?: string;
  paymentTerms: string;
  leadTime: number; // in days
  minimumOrder: number;
  rating: number; // 1-5 stars
  isActive: boolean;
  notes?: string;
  branchId: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateSupplierRequest {
  name: string;
  contactPerson: string;
  email: string;
  phoneNumber: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  website?: string;
  taxId?: string;
  paymentTerms: string;
  leadTime: number;
  minimumOrder: number;
  rating: number;
  notes?: string;
  branchId: string;
}

export interface UpdateSupplierRequest {
  name?: string;
  contactPerson?: string;
  email?: string;
  phoneNumber?: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  country?: string;
  website?: string;
  taxId?: string;
  paymentTerms?: string;
  leadTime?: number;
  minimumOrder?: number;
  rating?: number;
  isActive?: boolean;
  notes?: string;
}

export const suppliersApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getSuppliers: builder.query<{ suppliers: Supplier[]; total: number }, {
      branchId?: string;
      isActive?: boolean;
      search?: string;
      rating?: number;
      page?: number;
      limit?: number;
    }>({
      query: (params) => ({
        url: '/suppliers',
        params,
      }),
      providesTags: ['Supplier'],
    }),
    getSupplierById: builder.query<Supplier, string>({
      query: (id) => `/suppliers/${id}`,
      providesTags: ['Supplier'],
    }),
    createSupplier: builder.mutation<Supplier, CreateSupplierRequest>({
      query: (data) => ({
        url: '/suppliers',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['Supplier'],
    }),
    updateSupplier: builder.mutation<Supplier, { id: string; data: UpdateSupplierRequest }>({
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
    toggleSupplierStatus: builder.mutation<Supplier, string>({
      query: (id) => ({
        url: `/suppliers/${id}/toggle-status`,
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
  useDeleteSupplierMutation,
  useToggleSupplierStatusMutation,
} = suppliersApi;
