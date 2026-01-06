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
  success?: boolean;
  requires2FA?: boolean;
  temporaryToken?: string;
  data?: {
    user?: {
      id: string;
      email: string;
      firstName: string;
      lastName: string;
      role: string;
      companyId: string | null;
      branchId: string | null;
      isSuperAdmin?: boolean;
    };
    tokens?: {
      accessToken: string;
      refreshToken: string;
    };
    accessToken?: string;
    refreshToken?: string;
    sessionId?: string;
    requiresPayment?: boolean;
    subscriptionPlan?: {
      name: string;
      displayName?: string;
      price?: number;
      currency?: string;
      stripePriceId?: string;
      trialPeriod?: number;
    };
    company?: {
      id: string;
      name: string;
      email: string;
      slug?: string;
    };
    branch?: {
      id: string;
      name: string;
      address?: string;
      slug?: string;
    };
  };
  // Direct response (if not wrapped)
  user?: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: string;
    companyId: string | null;
    branchId: string | null;
    isSuperAdmin?: boolean;
  };
  tokens?: {
    accessToken: string;
    refreshToken: string;
  };
  accessToken?: string;
  refreshToken?: string;
  requiresPayment?: boolean;
  subscriptionPlan?: {
    name: string;
    displayName?: string;
    price?: number;
    currency?: string;
    stripePriceId?: string;
    trialPeriod?: number;
  };
}

export interface Verify2FALoginRequest {
  temporaryToken: string;
  token?: string;
  backupCode?: string;
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
      transformResponse: (response: any) => {
        // Handle different response structures
        // Backend returns: { success: true, data: { user, company, branch, ... } }
        // Or direct: { user, company, branch, ... }
        const data = response?.data || response;
        
        // If response already has success and data structure
        if (response?.success && response?.data) {
          return {
            success: true,
            data: {
              user: data.user,
              company: data.company,
              branch: data.branch,
              requiresPayment: data.requiresPayment,
              subscriptionPlan: data.subscriptionPlan,
            },
          };
        }
        
        // If response is direct (shouldn't happen with TransformInterceptor, but handle it)
        if (data?.user) {
          return {
            success: true,
            data: {
              user: data.user,
              company: data.company,
              branch: data.branch,
              requiresPayment: data.requiresPayment,
              subscriptionPlan: data.subscriptionPlan,
            },
          };
        }
        
        // Fallback - return as is
        return response;
      },
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
    verify2FALogin: builder.mutation<LoginResponse, Verify2FALoginRequest>({
      query: (data) => ({
        url: '/auth/2fa/verify-login',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['Auth'],
    }),
    setup2FA: builder.mutation<{ secret: string; qrCode: string; backupCodes: string[]; message: string }, void>({
      query: () => ({
        url: '/auth/2fa/setup',
        method: 'GET',
      }),
      transformResponse: (response: any) => {
        // Handle TransformInterceptor wrapper: { success: true, data: ... }
        const data = response?.data || response;
        return {
          secret: data.secret,
          qrCode: data.qrCode,
          backupCodes: data.backupCodes,
          message: data.message,
        };
      },
    }),
    enable2FA: builder.mutation<{ message: string; backupCodes: string[] }, { token: string }>({
      query: (data) => ({
        url: '/auth/2fa/enable',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['Auth', 'User'],
    }),
    disable2FA: builder.mutation<{ message: string }, { password?: string; pin?: string }>({
      query: (data) => ({
        url: '/auth/2fa/disable',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['Auth', 'User'],
    }),
    verifyPin: builder.mutation<{ message: string }, { pin: string }>({
      query: (data) => ({
        url: '/auth/verify-pin',
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
  useVerify2FALoginMutation,
  useSetup2FAMutation,
  useEnable2FAMutation,
  useDisable2FAMutation,
  useVerifyPinMutation,
} = authApi;

