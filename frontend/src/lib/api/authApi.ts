import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

export interface CompanyOwnerRegisterRequest {
  companyName: string;
  companyType: 'restaurant' | 'cafe' | 'bar';
  country: string;
  companyEmail: string;
  branchName: string;
  branchAddress: {
    street: string;
    city?: string;
    state?: string;
    country: string;
    zipCode?: string;
  };
  package: string;
  firstName: string;
  lastName: string;
  phoneNumber: string;
  pin: string;
}

export interface FindCompanyRequest {
  email?: string;
  companyId?: string;
}

export interface PinLoginWithRoleRequest {
  companyId: string;
  branchId: string;
  role: string;
  pin: string;
}

export interface SuperAdminLoginRequest {
  email: string;
  password: string;
}

export interface AuthResponse {
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: string;
    companyId?: string;
    branchId?: string;
    isSuperAdmin?: boolean;
  };
  tokens: {
    accessToken: string;
    refreshToken: string;
  };
}

export interface CompanyRegistrationResponse extends AuthResponse {
  company: {
    id: string;
    name: string;
    type: string;
    email: string;
  };
  branch: {
    id: string;
    name: string;
    address: any;
  };
}

export interface FindCompanyResponse {
  found: boolean;
  companyId: string;
  companyName: string;
  companySlug: string;
  logoUrl?: string;
  branches: Array<{
    id: string;
    name: string;
    address: string;
    isActive: boolean;
    availableRoles: string[];
  }>;
  message: string;
}

export const authApi = createApi({
  reducerPath: 'authApi',
  baseQuery: fetchBaseQuery({
    baseUrl: API_BASE_URL,
    prepareHeaders: (headers, { getState }) => {
      // Get token from Redux state
      const token = (getState() as any).auth?.tokens?.accessToken;
      if (token) {
        headers.set('authorization', `Bearer ${token}`);
      }
      headers.set('content-type', 'application/json');
      return headers;
    },
  }),
  tagTypes: ['Auth', 'Company'],
  endpoints: (builder) => ({
    // Company Owner Registration
    registerCompanyOwner: builder.mutation<CompanyRegistrationResponse, CompanyOwnerRegisterRequest>({
      query: (data) => ({
        url: '/auth/register',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['Auth'],
    }),

    // Find Company (Step 1)
    findCompany: builder.mutation<FindCompanyResponse, FindCompanyRequest>({
      query: (data) => ({
        url: '/auth/find-company',
        method: 'POST',
        body: data,
      }),
    }),

    // PIN Login with Role (Step 2)
    pinLoginWithRole: builder.mutation<AuthResponse, PinLoginWithRoleRequest>({
      query: (data) => ({
        url: '/auth/login/pin-with-role',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['Auth'],
    }),

    // Super Admin Login
    superAdminLogin: builder.mutation<AuthResponse, SuperAdminLoginRequest>({
      query: (data) => ({
        url: '/auth/login/super-admin',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['Auth'],
    }),

    // Refresh Token
    refreshToken: builder.mutation<{ tokens: { accessToken: string; refreshToken: string } }, { refreshToken: string }>({
      query: (data) => ({
        url: '/auth/refresh',
        method: 'POST',
        body: data,
      }),
    }),

    // Logout
    logout: builder.mutation<void, void>({
      query: () => ({
        url: '/auth/logout',
        method: 'POST',
      }),
      invalidatesTags: ['Auth'],
    }),
  }),
});

export const {
  useRegisterCompanyOwnerMutation,
  useFindCompanyMutation,
  usePinLoginWithRoleMutation,
  useSuperAdminLoginMutation,
  useRefreshTokenMutation,
  useLogoutMutation,
} = authApi;
