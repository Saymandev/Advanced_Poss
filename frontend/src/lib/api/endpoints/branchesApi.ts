import { apiSlice } from '../apiSlice';

export interface Branch {
  id: string;
  name: string;
  address: string | {
    street: string;
    city: string;
    state?: string;
    country: string;
    zipCode?: string;
    coordinates?: {
      lat: number;
      lng: number;
    };
  };
  city?: string;
  state?: string;
  zipCode?: string;
  country?: string;
  phoneNumber?: string;
  phone?: string;
  email?: string;
  managerId?: string;
  manager?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  isActive: boolean;
  openingTime?: string;
  closingTime?: string;
  openingHours?: Array<{
    day: string;
    open: string;
    close: string;
    isClosed: boolean;
  }>;
  timezone?: string;
  totalTables?: number;
  totalSeats?: number;
  companyId: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateBranchRequest {
  name: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  phoneNumber: string;
  email: string;
  managerId?: string;
  openingTime: string;
  closingTime: string;
  timezone: string;
  companyId: string;
}

export interface UpdateBranchRequest {
  name?: string;
  address?: string | {
    street: string;
    city: string;
    state?: string;
    country: string;
    zipCode?: string;
    coordinates?: {
      lat: number;
      lng: number;
    };
  };
  phone?: string;
  email?: string;
  managerId?: string;
  isActive?: boolean;
  openingHours?: Array<{
    day: string;
    open: string;
    close: string;
    isClosed: boolean;
  }>;
  totalTables?: number;
  totalSeats?: number;
}

export const branchesApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getBranches: builder.query<{ branches: Branch[]; total: number }, { 
      companyId?: string; 
      isActive?: boolean; 
      search?: string;
      page?: number;
      limit?: number;
    }>({
      query: (params) => ({
        url: '/branches',
        params,
      }),
      transformResponse: (response: any) => {
        const data = response.data || response;
        let items = [];
        
        // Handle array response
        if (Array.isArray(data)) {
          items = data;
        } else if (data.branches) {
          items = data.branches;
        } else if (data.items) {
          items = data.items;
        }
        
        return {
          branches: items.map((branch: any) => ({
            id: branch._id || branch.id,
            companyId: branch.companyId || branch.company?.id || branch.company?._id,
            name: branch.name,
            slug: branch.slug,
            phone: branch.phone,
            email: branch.email,
            address: branch.address,
            managerId: branch.managerId || branch.manager?.id || branch.manager?._id,
            isActive: branch.isActive !== undefined ? branch.isActive : true,
            openingHours: branch.openingHours || [],
            totalTables: branch.totalTables,
            totalSeats: branch.totalSeats,
            createdAt: branch.createdAt || new Date().toISOString(),
            updatedAt: branch.updatedAt || new Date().toISOString(),
          })) as Branch[],
          total: data.total || items.length,
        };
      },
      providesTags: ['Branch'],
    }),
    getBranchById: builder.query<Branch, string>({
      query: (id) => `/branches/${id}`,
      transformResponse: (response: any) => {
        const branch = response.data || response;
        return {
          id: branch._id || branch.id,
          companyId: branch.companyId || branch.company?.id || branch.company?._id,
          name: branch.name,
          slug: branch.slug,
          phone: branch.phone,
          email: branch.email,
          address: branch.address,
          managerId: branch.managerId || branch.manager?.id || branch.manager?._id,
          isActive: branch.isActive !== undefined ? branch.isActive : true,
          openingHours: branch.openingHours || [],
          totalTables: branch.totalTables,
          totalSeats: branch.totalSeats,
          createdAt: branch.createdAt || new Date().toISOString(),
          updatedAt: branch.updatedAt || new Date().toISOString(),
        } as Branch;
      },
      providesTags: ['Branch'],
    }),
    createBranch: builder.mutation<Branch, CreateBranchRequest>({
      query: (data) => ({
        url: '/branches',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['Branch'],
    }),
    updateBranch: builder.mutation<Branch, { id: string; data: UpdateBranchRequest }>({
      query: ({ id, data }) => ({
        url: `/branches/${id}`,
        method: 'PATCH',
        body: data,
      }),
      invalidatesTags: ['Branch'],
    }),
    deleteBranch: builder.mutation<void, string>({
      query: (id) => ({
        url: `/branches/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Branch'],
    }),
    toggleBranchStatus: builder.mutation<Branch, string>({
      query: (id) => ({
        url: `/branches/${id}/toggle-status`,
        method: 'PATCH',
      }),
      invalidatesTags: ['Branch'],
    }),
  }),
});

export const {
  useGetBranchesQuery,
  useGetBranchByIdQuery,
  useCreateBranchMutation,
  useUpdateBranchMutation,
  useDeleteBranchMutation,
  useToggleBranchStatusMutation,
} = branchesApi;
