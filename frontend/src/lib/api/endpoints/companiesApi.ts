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
  totalUsers: number;
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

export const companiesApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getCompanies: builder.query<{ companies: Company[]; total: number }, any>({
      query: (params) => ({
        url: '/companies',
        params,
      }),
      providesTags: ['Company'],
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
        console.log('getCompanyById response:', {
          hasLogo: !!data?.logo,
          logoValue: data?.logo?.substring(0, 50) + '...' || 'null',
          allKeys: Object.keys(data || {}),
        });
        return data;
      },
    }),
    getCompanyStats: builder.query<CompanyStats, string>({
      query: (id) => `/companies/${id}/stats`,
      providesTags: ['Company'],
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
    updateCompanySettings: builder.mutation<Company, { id: string; settings: Partial<Company['settings']> }>({
      query: ({ id, settings }) => ({
        url: `/companies/${id}/settings`,
        method: 'PATCH',
        body: { settings },
      }),
      invalidatesTags: ['Company'],
    }),
    deactivateCompany: builder.mutation<Company, string>({
      query: (id) => ({
        url: `/companies/${id}/deactivate`,
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
  }),
});

export const {
  useGetCompaniesQuery,
  useGetMyCompaniesQuery,
  useGetCompanyByIdQuery,
  useGetCompanyStatsQuery,
  useCreateCompanyMutation,
  useUpdateCompanyMutation,
  useUpdateCompanySettingsMutation,
  useDeactivateCompanyMutation,
  useDeleteCompanyMutation,
  useUploadCompanyLogoMutation,
} = companiesApi;
