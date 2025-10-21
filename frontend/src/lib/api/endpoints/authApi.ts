import { apiSlice } from '../apiSlice';

export interface FindCompanyRequest {
  email?: string;
  companyId?: string;
}

export interface FindCompanyResponse {
  success: boolean;
  data: {
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
  };
  timestamp: string;
}

export interface PinLoginRequest {
  companyId: string;
  branchId: string;
  role: string;
  pin: string;
}

export interface LoginResponse {
  success: boolean;
  data: {
    user: {
      id: string;
      email: string;
      firstName: string;
      lastName: string;
      role: string;
      companyId: string;
      branchId: string;
    };
    accessToken: string;
    refreshToken: string;
    sessionId: string;
  };
}

export interface SuperAdminLoginRequest {
  email: string;
  password: string;
}

export interface CompanyOwnerRegisterRequest {
  companyName: string;
  companyType: string;
  country: string;
  companyEmail: string;
  branchName: string;
  branchAddress: {
    street: string;
    city: string;
    state: string;
    country: string;
    zipCode: string;
  };
  package: string;
  firstName: string;
  lastName: string;
  phoneNumber: string;
  pin: string;
}

export const authApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    findCompany: builder.mutation<FindCompanyResponse, FindCompanyRequest>({
      query: (credentials) => ({
        url: '/auth/find-company',
        method: 'POST',
        body: credentials,
      }),
    }),
    pinLogin: builder.mutation<LoginResponse, PinLoginRequest>({
      query: (credentials) => ({
        url: '/auth/login/pin-with-role',
        method: 'POST',
        body: credentials,
      }),
      invalidatesTags: ['Auth'],
    }),
    superAdminLogin: builder.mutation<LoginResponse, SuperAdminLoginRequest>({
      query: (credentials) => ({
        url: '/auth/login/super-admin',
        method: 'POST',
        body: credentials,
      }),
      invalidatesTags: ['Auth'],
    }),
    registerCompanyOwner: builder.mutation<LoginResponse, CompanyOwnerRegisterRequest>({
      query: (data) => ({
        url: '/auth/register',
        method: 'POST',
        body: data,
      }),
    }),
    logout: builder.mutation<void, void>({
      query: () => ({
        url: '/auth/logout',
        method: 'POST',
      }),
      invalidatesTags: ['Auth'],
    }),
    refreshToken: builder.mutation<{ accessToken: string }, { refreshToken: string }>({
      query: (data) => ({
        url: '/auth/refresh',
        method: 'POST',
        body: data,
      }),
    }),
  }),
});

export const {
  useFindCompanyMutation,
  usePinLoginMutation,
  useSuperAdminLoginMutation,
  useRegisterCompanyOwnerMutation,
  useLogoutMutation,
  useRefreshTokenMutation,
} = authApi;

