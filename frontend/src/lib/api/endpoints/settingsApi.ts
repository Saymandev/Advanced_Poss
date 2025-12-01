import { apiSlice } from '../apiSlice';

export interface TaxSettings {
  id: string;
  name: string;
  rate: number; // Percentage
  type: 'percentage' | 'fixed';
  isActive: boolean;
  appliesTo: 'all' | 'food' | 'beverage' | 'alcohol';
  companyId: string;
  createdAt: string;
  updatedAt: string;
}

export interface ServiceChargeSettings {
  id: string;
  name: string;
  rate: number; // Percentage
  isActive: boolean;
  appliesTo: 'all' | 'dine_in' | 'takeout' | 'delivery';
  companyId: string;
  createdAt: string;
  updatedAt: string;
}

export interface InvoiceSettings {
  id: string;
  companyId: string;
  invoicePrefix: string;
  invoiceNumber: number;
  showLogo: boolean;
  logoUrl?: string;
  showAddress: boolean;
  showPhone: boolean;
  showEmail: boolean;
  showWebsite: boolean;
  footerText?: string;
  termsAndConditions?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CompanySettings {
  id: string;
  companyId: string;
  currency: string;
  timezone: string;
  dateFormat: string;
  timeFormat: '12h' | '24h';
  language: string;
  theme: 'light' | 'dark' | 'auto';
  notifications: {
    email: boolean;
    sms: boolean;
    push: boolean;
  };
  features: {
    inventory: boolean;
    kitchen: boolean;
    reports: boolean;
    analytics: boolean;
  };
  createdAt: string;
  updatedAt: string;
}

export interface SystemSettings {
  id?: string;
  maintenanceMode: boolean;
  maintenanceMessage: string;
  defaultCompanySettings: {
    currency: string;
    timezone: string;
    dateFormat: string;
    timeFormat: '12h' | '24h';
    language: string;
  };
  security: {
    minLength: number;
    requireUppercase: boolean;
    requireLowercase: boolean;
    requireNumbers: boolean;
    requireSpecialChars: boolean;
    maxAttempts: number;
    lockoutDuration: number;
  };
  sessionTimeout: number;
  rateLimiting: {
    enabled: boolean;
    windowMs: number;
    max: number;
  };
  email: {
    enabled: boolean;
    provider: 'smtp' | 'sendgrid' | 'ses';
    fromEmail: string;
    fromName: string;
    smtpHost: string;
    smtpPort: number;
    smtpUser: string;
    smtpPassword: string;
    apiKey: string;
  };
  sms: {
    enabled: boolean;
    provider: 'twilio' | 'aws-sns';
    accountSid: string;
    authToken: string;
    fromNumber: string;
    apiKey: string;
  };
  backup: {
    enabled: boolean;
    frequency: 'daily' | 'weekly' | 'monthly';
    retentionDays: number;
    autoCleanup: boolean;
  };
  features: {
    enableNewRegistrations: boolean;
    requireEmailVerification: boolean;
    enableTwoFactor: boolean;
  };
  createdAt?: string;
  updatedAt?: string;
}

export const settingsApi = apiSlice.injectEndpoints({
  overrideExisting: true,
  endpoints: (builder) => ({
    // Tax Settings
    getTaxSettings: builder.query<TaxSettings[], string>({
      query: (companyId) => `/settings/taxes?companyId=${companyId}`,
      providesTags: ['Settings'],
      transformResponse: (response: any) => {
        const data = response?.data ?? response;
        if (Array.isArray(data)) return data;
        if (Array.isArray(data?.taxes)) return data.taxes;
        if (Array.isArray(data?.items)) return data.items;
        return [];
      },
    }),
    createTaxSetting: builder.mutation<TaxSettings, Omit<TaxSettings, 'id' | 'createdAt' | 'updatedAt'>>({
      query: (data) => ({
        url: '/settings/taxes',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['Settings'],
    }),
    updateTaxSetting: builder.mutation<TaxSettings, { id: string; data: Partial<TaxSettings> }>({
      query: ({ id, data }) => ({
        url: `/settings/taxes/${id}`,
        method: 'PATCH',
        body: data,
      }),
      invalidatesTags: ['Settings'],
    }),
    deleteTaxSetting: builder.mutation<void, string>({
      query: (id) => ({
        url: `/settings/taxes/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Settings'],
    }),

    // Service Charge Settings
    getServiceChargeSettings: builder.query<ServiceChargeSettings[], string>({
      query: (companyId) => `/settings/service-charges?companyId=${companyId}`,
      providesTags: ['Settings'],
      transformResponse: (response: any) => {
        const data = response?.data ?? response;
        if (Array.isArray(data)) return data;
        if (Array.isArray(data?.serviceCharges)) return data.serviceCharges;
        if (Array.isArray(data?.items)) return data.items;
        return [];
      },
    }),
    createServiceChargeSetting: builder.mutation<ServiceChargeSettings, Omit<ServiceChargeSettings, 'id' | 'createdAt' | 'updatedAt'>>({
      query: (data) => ({
        url: '/settings/service-charges',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['Settings'],
    }),
    updateServiceChargeSetting: builder.mutation<ServiceChargeSettings, { id: string; data: Partial<ServiceChargeSettings> }>({
      query: ({ id, data }) => ({
        url: `/settings/service-charges/${id}`,
        method: 'PATCH',
        body: data,
      }),
      invalidatesTags: ['Settings'],
    }),
    deleteServiceChargeSetting: builder.mutation<void, string>({
      query: (id) => ({
        url: `/settings/service-charges/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Settings'],
    }),

    // Invoice Settings
    getInvoiceSettings: builder.query<InvoiceSettings, string>({
      query: (companyId) => `/settings/invoice?companyId=${companyId}`,
      providesTags: ['Settings'],
    }),
    updateInvoiceSettings: builder.mutation<InvoiceSettings, { companyId: string; data: Partial<InvoiceSettings> }>({
      query: ({ companyId, data }) => ({
        url: `/settings/invoice`,
        method: 'PATCH',
        body: { companyId, ...data },
      }),
      invalidatesTags: ['Settings'],
    }),

    // Company Settings
    getCompanySettings: builder.query<CompanySettings, string>({
      query: (companyId) => `/settings/company?companyId=${companyId}`,
      providesTags: ['Settings'],
      transformResponse: (response: any) => {
        // Handle backend TransformInterceptor response structure: { success: true, data: {...} }
        if (response?.data) {
          return response.data;
        }
        return response;
      },
    }),
    updateCompanySettings: builder.mutation<CompanySettings, { companyId: string; data: Partial<CompanySettings> }>({
      query: ({ companyId, data }) => ({
        url: `/settings/company`,
        method: 'PATCH',
        body: { companyId, ...data },
      }),
      invalidatesTags: ['Settings'],
      // Refetch company settings when currency or other settings change
      onQueryStarted: async (_arg, { dispatch, queryFulfilled }) => {
        await queryFulfilled;
        // Force refetch of company settings query
        dispatch(
          settingsApi.util.invalidateTags(['Settings'])
        );
      },
    }),

    // System Settings (Super Admin only)
    getSystemSettings: builder.query<SystemSettings, void>({
      query: () => '/settings/system',
      providesTags: ['Settings'],
      transformResponse: (response: any) => {
        if (response?.data) {
          return response.data;
        }
        return response;
      },
    }),
    updateSystemSettings: builder.mutation<SystemSettings, Partial<SystemSettings>>({
      query: (data) => ({
        url: '/settings/system',
        method: 'PATCH',
        body: data,
      }),
      invalidatesTags: ['Settings'],
      transformResponse: (response: any) => {
        if (response?.data) {
          return response.data;
        }
        return response;
      },
    }),
  }),
});

export const {
  useGetTaxSettingsQuery,
  useCreateTaxSettingMutation,
  useUpdateTaxSettingMutation,
  useDeleteTaxSettingMutation,
  useGetServiceChargeSettingsQuery,
  useCreateServiceChargeSettingMutation,
  useUpdateServiceChargeSettingMutation,
  useDeleteServiceChargeSettingMutation,
  useGetInvoiceSettingsQuery,
  useUpdateInvoiceSettingsMutation,
  useGetCompanySettingsQuery,
  useUpdateCompanySettingsMutation,
  useGetSystemSettingsQuery,
  useUpdateSystemSettingsMutation,
} = settingsApi;
