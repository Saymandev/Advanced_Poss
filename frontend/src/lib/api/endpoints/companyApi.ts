import { apiSlice } from '../apiSlice';

export interface CompanySettings {
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
}

export interface CompanyQRCode {
  qrCode: string;
  url: string;
  expiresAt: string;
}

export const companyApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getCompanySettings: builder.query<CompanySettings, void>({
      query: () => '/company/settings',
      providesTags: ['Company'],
    }),
    updateCompanySettings: builder.mutation<CompanySettings, Partial<CompanySettings>>({
      query: (settings) => ({
        url: '/company/settings',
        method: 'PATCH',
        body: settings,
      }),
      invalidatesTags: ['Company'],
    }),
    uploadCompanyLogo: builder.mutation<{ logoUrl: string }, FormData>({
      query: (formData) => ({
        url: '/company/upload-logo',
        method: 'POST',
        body: formData,
      }),
      invalidatesTags: ['Company'],
    }),
    getCompanyQRCode: builder.query<CompanyQRCode, void>({
      query: () => '/company/qr-code',
      providesTags: ['Company'],
    }),
    getCompanyOnlineUrl: builder.query<{ url: string }, void>({
      query: () => '/company/online-url',
      providesTags: ['Company'],
    }),
  }),
});

export const {
  useGetCompanySettingsQuery,
  useUpdateCompanySettingsMutation,
  useUploadCompanyLogoMutation,
  useGetCompanyQRCodeQuery,
  useGetCompanyOnlineUrlQuery,
} = companyApi;
