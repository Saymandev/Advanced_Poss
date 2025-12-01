import { apiSlice } from '../apiSlice';

export interface RolePermission {
  id: string;
  companyId: string;
  role: 'owner' | 'manager' | 'chef' | 'waiter' | 'cashier';
  features: string[];
  updatedBy?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface UpdateRolePermissionRequest {
  role: 'owner' | 'manager' | 'chef' | 'waiter' | 'cashier';
  features: string[];
}

export const rolePermissionsApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getRolePermissions: builder.query<RolePermission[], void>({
      query: () => '/role-permissions',
      providesTags: ['RolePermission'],
      transformResponse: (response: any) => {
        return response?.data || response || [];
      },
    }),
    getMyPermissions: builder.query<RolePermission | null, void>({
      query: () => '/role-permissions/my-permissions',
      providesTags: ['RolePermission', 'MyPermissions'],
      transformResponse: (response: any) => {
        return response?.data || response || null;
      },
    }),
    updateRolePermission: builder.mutation<RolePermission, UpdateRolePermissionRequest>({
      query: (data) => ({
        url: '/role-permissions',
        method: 'PATCH',
        body: data,
      }),
      invalidatesTags: ['RolePermission', 'MyPermissions', 'Staff'],
      transformResponse: (response: any) => {
        return response?.data || response;
      },
    }),
    getCompanyRolePermissions: builder.query<RolePermission[], string>({
      query: (companyId) => `/role-permissions/system/company/${companyId}`,
      providesTags: ['RolePermission'],
      transformResponse: (response: any) => {
        return response?.data || response || [];
      },
    }),
    updateCompanyRolePermission: builder.mutation<
      RolePermission,
      { companyId: string; data: UpdateRolePermissionRequest }
    >({
      query: ({ companyId, data }) => ({
        url: `/role-permissions/system/company/${companyId}`,
        method: 'PATCH',
        body: data,
      }),
      invalidatesTags: ['RolePermission', 'MyPermissions'],
      transformResponse: (response: any) => {
        return response?.data || response;
      },
    }),
  }),
});

export const {
  useGetRolePermissionsQuery,
  useGetMyPermissionsQuery,
  useUpdateRolePermissionMutation,
  useGetCompanyRolePermissionsQuery,
  useUpdateCompanyRolePermissionMutation,
} = rolePermissionsApi;

