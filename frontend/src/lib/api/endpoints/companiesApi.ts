import { apiSlice } from '../apiSlice';
export interface Company {
  id: string;
  name: string;
  slug: string;
  type: string;
  email: string;
  phoneNumber?: string;
  website?: string;
  description?: string;
  logo?: string;
  address: {
    street: string;
    city: string;
    state: string;
    country: string;
    zipCode: string;
  };
  settings: {
    currency: string;
    timezone: string;
    language: string;
    dateFormat: string;
    timeFormat: string;
    taxRate: number;
    serviceCharge: number;
    allowOnlineOrders: boolean;
    allowDelivery: boolean;
    allowTakeaway: boolean;
    minimumOrderAmount: number;
    deliveryFee: number;
    freeDeliveryThreshold: number;
  };
  subscription?: {
    planId: string;
    planName: string;
    status: 'active' | 'inactive' | 'cancelled' | 'expired' | 'trial';
    startDate?: string;
    endDate?: string;
    features?: string[];
    limits?: {
      branches: number;
      users: number;
      menuItems: number;
      orders: number;
      storage: number;
    };
  };
  subscriptionStatus?: 'active' | 'inactive' | 'trial' | 'expired' | 'suspended';
  subscriptionPlan?: 'basic' | 'premium' | 'enterprise';
  trialEndDate?: string;
  subscriptionEndDate?: string;
  customDomain?: string;
  domainVerified?: boolean;
  domainVerificationToken?: string;
  domainVerifiedAt?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}
export interface CreateCompanyRequest {
  name: string;
  type: string;
  email: string;
  phoneNumber?: string;
  website?: string;
  description?: string;
  slug?: string;
  address: {
    street: string;
    city: string;
    state: string;
    country: string;
    zipCode: string;
  };
  settings?: Partial<Company['settings']>;
}
export interface UpdateCompanyRequest extends Partial<CreateCompanyRequest> {
  id: string;
}
export interface CompanyStats {
  totalBranches: number;
  totalUsers: number; // Employees/Staff count
  totalCustomers?: number; // Customers count
  totalOrders: number;
  totalRevenue: number;
  averageOrderValue: number;
  topSellingItems: Array<{
    name: string;
    quantity: number;
    revenue: number;
  }>;
  recentActivity: Array<{
    type: string;
    description: string;
    timestamp: string;
  }>;
}
export interface SystemStats {
  totalCompanies: number;
  activeCompanies: number;
  trialCompanies: number;
  expiredCompanies: number;
  totalUsers: number;
  companiesByPlan: Record<string, number>;
}
export interface CustomDomainInfo {
  domain: string | null;
  verified: boolean;
  verificationToken: string | null;
  verifiedAt: string | null;
  dnsInstructions: {
    recordType: string;
    recordName: string;
    recordValue: string;
    instructions: string;
  } | null;
}
export interface AddCustomDomainRequest {
  domain: string;
}
export interface VerifyCustomDomainRequest {
  token: string;
}
export const companiesApi = apiSlice.injectEndpoints({
  overrideExisting: true,
  endpoints: (builder) => ({
    getCompanies: builder.query<{ companies: Company[]; total: number } | Company[], any>({
      query: (params) => ({
        url: '/companies',
        params,
      }),
      providesTags: ['Company'],
      transformResponse: (response: any) => {
        if (response?.success && response?.data) {
          return response.data;
        }
        if (Array.isArray(response)) {
          return response;
        }
        if (response?.companies) {
          return response;
        }
        return response?.data ?? response;
      },
    }),
    getMyCompanies: builder.query<Company[], void>({
      query: () => '/companies/my-companies',
      providesTags: ['Company'],
    }),
    getCompanyById: builder.query<Company, string>({
      query: (id) => `/companies/${id}`,
      providesTags: ['Company'],
      transformResponse: (response: any) => {
        // Ensure logo field is included
        const data = response?.data ?? response;
        return data;
      },
    }),
    getCompanyStats: builder.query<{ company: Company; stats: CompanyStats }, string>({
      query: (id) => `/companies/${id}/stats`,
      providesTags: ['Company'],
      transformResponse: (response: any) => response?.data || response,
    }),
    getSystemStats: builder.query<SystemStats, void>({
      query: () => '/companies/system/stats',
      providesTags: ['Company'],
      transformResponse: (response: any) => {
        const data = response?.data ?? response;
        return data;
      },
    }),
    createCompany: builder.mutation<Company, CreateCompanyRequest>({
      query: (data) => ({
        url: '/companies',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['Company'],
    }),
    updateCompany: builder.mutation<Company, UpdateCompanyRequest>({
      query: ({ id, ...data }) => ({
        url: `/companies/${id}`,
        method: 'PATCH',
        body: data,
      }),
      invalidatesTags: ['Company'],
    }),
    // Legacy compatibility: we no longer use /companies/:id/settings for general settings.
    // Forward to settings endpoint with validated companyId.
    updateCompanySettings: builder.mutation<
      Company,
      { id?: string; companyId?: string; settings: Partial<Company['settings']> }
    >({
      query: ({ id, companyId, settings }) => {
        let resolvedId = companyId || id;
        // Fallback to cached user/companyContext if missing
        if (!resolvedId && typeof window !== 'undefined') {
          try {
            const storedUser = localStorage.getItem('user');
            if (storedUser) {
              const parsed = JSON.parse(storedUser);
              resolvedId = parsed?.companyId || resolvedId;
            }
            const storedCtx = localStorage.getItem('companyContext');
            if (storedCtx) {
              const parsed = JSON.parse(storedCtx);
              resolvedId =
                parsed?.companyId ||
                parsed?.companyId?._id ||
                parsed?.companyId?.id ||
                resolvedId;
            }
          } catch {
            // ignore parse errors
          }
        }
        const isValidObjectId = (val?: string) =>
          typeof val === 'string' && /^[a-f\d]{24}$/i.test(val);
        if (!isValidObjectId(resolvedId)) {
          throw new Error('Invalid company ID');
        }
        return {
          url: `/settings/company`,
          method: 'PATCH',
          body: { companyId: resolvedId, ...settings },
        };
      },
      invalidatesTags: ['Company'],
    }),
    deactivateCompany: builder.mutation<Company, string>({
      query: (id) => ({
        url: `/companies/${id}/deactivate`,
        method: 'PATCH',
      }),
      invalidatesTags: ['Company'],
    }),
    activateCompany: builder.mutation<Company, string>({
      query: (id) => ({
        url: `/companies/${id}/activate`,
        method: 'PATCH',
      }),
      invalidatesTags: ['Company'],
    }),
    deleteCompany: builder.mutation<void, string>({
      query: (id) => ({
        url: `/companies/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Company'],
    }),
    uploadCompanyLogo: builder.mutation<{ logoUrl: string }, File>({
      query: (file) => {
        const formData = new FormData();
        formData.append('logo', file);
        return {
          url: `/company/upload-logo`,
          method: 'POST',
          body: formData,
        };
      },
      invalidatesTags: ['Company'],
    }),
    getCustomDomainInfo: builder.query<CustomDomainInfo, string>({
      query: (companyId) => `/companies/${companyId}/custom-domain`,
      providesTags: ['Company'],
    }),
    addCustomDomain: builder.mutation<Company, { companyId: string; domain: string }>({
      query: ({ companyId, domain }) => ({
        url: `/companies/${companyId}/custom-domain`,
        method: 'POST',
        body: { domain },
      }),
      invalidatesTags: ['Company'],
    }),
    verifyCustomDomain: builder.mutation<Company, { companyId: string; token: string }>({
      query: ({ companyId, token }) => ({
        url: `/companies/${companyId}/custom-domain/verify`,
        method: 'POST',
        body: { token },
      }),
      invalidatesTags: ['Company'],
    }),
    removeCustomDomain: builder.mutation<Company, string>({
      query: (companyId) => ({
        url: `/companies/${companyId}/custom-domain`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Company'],
    }),
  }),
});
export const {
  useGetCompaniesQuery,
  useGetMyCompaniesQuery,
  useGetCompanyByIdQuery,
  useGetCompanyStatsQuery,
  useGetSystemStatsQuery,
  useCreateCompanyMutation,
  useUpdateCompanyMutation,
  useUpdateCompanySettingsMutation,
  useDeactivateCompanyMutation,
  useActivateCompanyMutation,
  useDeleteCompanyMutation,
  useUploadCompanyLogoMutation,
  useGetCustomDomainInfoQuery,
  useAddCustomDomainMutation,
  useVerifyCustomDomainMutation,
  useRemoveCustomDomainMutation,
} = companiesApi;
