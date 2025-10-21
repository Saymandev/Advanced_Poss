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

export const settingsApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    // Tax Settings
    getTaxSettings: builder.query<TaxSettings[], string>({
      query: (companyId) => `/settings/taxes?companyId=${companyId}`,
      providesTags: ['Settings'],
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
    }),
    updateCompanySettings: builder.mutation<CompanySettings, { companyId: string; data: Partial<CompanySettings> }>({
      query: ({ companyId, data }) => ({
        url: `/settings/company`,
        method: 'PATCH',
        body: { companyId, ...data },
      }),
      invalidatesTags: ['Settings'],
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
} = settingsApi;
