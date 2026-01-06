import { apiSlice } from '../apiSlice';
export interface Branch {
  id: string;
  name: string;
  slug?: string;
  publicUrl?: string;
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
            publicUrl: branch.publicUrl,
            phone: branch.phone,
            email: branch.email,
            address: branch.address,
            managerId: branch.managerId || branch.manager?.id || branch.manager?._id || branch.managerId?._id || branch.managerId?.id,
            manager: branch.managerId && typeof branch.managerId === 'object' && 'firstName' in branch.managerId
              ? {
                  id: branch.managerId._id || branch.managerId.id,
                  firstName: branch.managerId.firstName,
                  lastName: branch.managerId.lastName,
                  email: branch.managerId.email,
                }
              : branch.manager && typeof branch.manager === 'object' && 'firstName' in branch.manager
              ? {
                  id: branch.manager._id || branch.manager.id,
                  firstName: branch.manager.firstName,
                  lastName: branch.manager.lastName,
                  email: branch.manager.email,
                }
              : undefined,
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
          publicUrl: branch.publicUrl,
          phone: branch.phone,
          email: branch.email,
          address: branch.address,
          managerId: branch.managerId || branch.manager?.id || branch.manager?._id || branch.managerId?._id || branch.managerId?.id,
          manager: branch.managerId && typeof branch.managerId === 'object' && 'firstName' in branch.managerId
            ? {
                id: branch.managerId._id || branch.managerId.id,
                firstName: branch.managerId.firstName,
                lastName: branch.managerId.lastName,
                email: branch.managerId.email,
              }
            : branch.manager && typeof branch.manager === 'object' && 'firstName' in branch.manager
            ? {
                id: branch.manager._id || branch.manager.id,
                firstName: branch.manager.firstName,
                lastName: branch.manager.lastName,
                email: branch.manager.email,
              }
            : undefined,
          isActive: branch.isActive !== undefined ? branch.isActive : true,
          openingHours: branch.openingHours || [],
          totalTables: branch.totalTables !== undefined ? branch.totalTables : undefined,
          totalSeats: branch.totalSeats !== undefined ? branch.totalSeats : undefined,
          createdAt: branch.createdAt || new Date().toISOString(),
          updatedAt: branch.updatedAt || new Date().toISOString(),
        } as Branch;
      },
      providesTags: (result, error, id) => [{ type: 'Branch', id }],
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
    softDeleteBranch: builder.mutation<Branch, string>({
      query: (id) => ({
        url: `/branches/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Branch'],
    }),
    restoreBranch: builder.mutation<Branch, string>({
      query: (id) => ({
        url: `/branches/${id}/restore`,
        method: 'PATCH',
      }),
      invalidatesTags: ['Branch'],
    }),
    permanentDeleteBranch: builder.mutation<void, string>({
      query: (id) => ({
        url: `/branches/${id}/permanent`,
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
    updateBranchPublicUrl: builder.mutation<Branch, { id: string; publicUrl: string }>({
      query: ({ id, publicUrl }) => ({
        url: `/branches/${id}/public-url`,
        method: 'PATCH',
        body: { publicUrl },
      }),
      invalidatesTags: ['Branch'],
    }),
    getDeletedBranches: builder.query<{
      branches: Branch[];
      total: number;
      page: number;
      limit: number;
    }, { page?: number; limit?: number }>({
      query: (params) => ({
        url: '/branches/deleted',
        params,
      }),
      providesTags: ['Branch'],
      transformResponse: (response: any) => {
        // Handle TransformInterceptor wrapper: { success: true, data: {...} }
        return response.data || response;
      },
    }),
    getBranchStats: builder.query<{
      branch: Branch;
      stats: {
        totalTables: number;
        totalSeats: number;
        totalStaff: number;
        totalOrders: number;
        todayRevenue: number;
        actualTablesCount?: number;
        actualUsersCount?: number;
      };
    }, string>({
      query: (id) => `/branches/${id}/stats`,
      transformResponse: (response: any) => {
       
        // Handle both wrapped { data: {...} } and direct response
        const data = response.data || response;
        const stats = data.stats || {};
        // Transform the branch object to include manager if populated
        const branch = data.branch || {};
        const transformedBranch = {
          ...branch,
          // Extract manager from populated managerId
          manager: branch.managerId && typeof branch.managerId === 'object' && 'firstName' in branch.managerId
            ? {
                id: branch.managerId._id?.toString() || branch.managerId.id?.toString() || '',
                firstName: branch.managerId.firstName || '',
                lastName: branch.managerId.lastName || '',
                email: branch.managerId.email || '',
              }
            : undefined,
          // Ensure totalTables and totalSeats are included
          totalTables: branch.totalTables !== undefined ? branch.totalTables : undefined,
          totalSeats: branch.totalSeats !== undefined ? branch.totalSeats : undefined,
        };
        const result = {
          branch: transformedBranch,
          stats: {
            totalTables: stats.totalTables ?? 0,
            totalSeats: stats.totalSeats ?? 0,
            totalStaff: stats.totalStaff ?? stats.actualUsersCount ?? 0,
            totalOrders: stats.totalOrders ?? 0,
            todayRevenue: stats.todayRevenue ?? 0,
            actualTablesCount: stats.actualTablesCount ?? 0,
            actualUsersCount: stats.actualUsersCount ?? stats.totalStaff ?? 0,
          },
        };
        return result;
      },
      providesTags: ['Branch'],
    }),
  }),
});
export const {
  useGetBranchesQuery,
  useGetDeletedBranchesQuery,
  useGetBranchByIdQuery,
  useCreateBranchMutation,
  useUpdateBranchMutation,
  useSoftDeleteBranchMutation,
  useRestoreBranchMutation,
  usePermanentDeleteBranchMutation,
  useToggleBranchStatusMutation,
  useUpdateBranchPublicUrlMutation,
  useGetBranchStatsQuery,
} = branchesApi;
