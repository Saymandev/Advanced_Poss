import { apiSlice } from '../apiSlice';

export interface Branch {
  id: string;
  name: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  phoneNumber: string;
  email: string;
  managerId?: string;
  manager?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  isActive: boolean;
  openingTime: string;
  closingTime: string;
  timezone: string;
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
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  country?: string;
  phoneNumber?: string;
  email?: string;
  managerId?: string;
  isActive?: boolean;
  openingTime?: string;
  closingTime?: string;
  timezone?: string;
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
      providesTags: ['Branch'],
    }),
    getBranchById: builder.query<Branch, string>({
      query: (id) => `/branches/${id}`,
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
