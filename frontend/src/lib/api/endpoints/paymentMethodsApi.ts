import { apiSlice } from '../apiSlice';

export interface PaymentMethod {
  id: string;
  companyId?: string;
  branchId?: string;
  name: string;
  code: string;
  displayName?: string;
  description?: string;
  type: 'cash' | 'card' | 'mobile_wallet' | 'bank_transfer' | 'due' | 'complimentary' | 'other';
  icon?: string;
  color?: string;
  isActive: boolean;
  sortOrder: number;
  requiresReference: boolean;
  requiresAuthorization: boolean;
  allowsPartialPayment: boolean;
  allowsChangeDue: boolean;
  metadata?: {
    cardType?: string;
    supportedNetworks?: string[];
    provider?: string;
    accountNumber?: string;
    [key: string]: any;
  };
}

export const paymentMethodsApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    // Get all payment methods (with filters)
    getPaymentMethods: builder.query<PaymentMethod[], {
      companyId?: string;
      branchId?: string;
      systemOnly?: boolean;
    }>({
      query: (params = {}) => {
        const queryParams = new URLSearchParams();
        if (params.companyId) queryParams.append('companyId', params.companyId);
        if (params.branchId) queryParams.append('branchId', params.branchId);
        if (params.systemOnly) queryParams.append('systemOnly', 'true');
        
        const queryString = queryParams.toString();
        return `/payment-methods${queryString ? `?${queryString}` : ''}`;
      },
      transformResponse: (response: any) => {
        const data = response?.data ?? response;
        if (Array.isArray(data)) return data;
        if (Array.isArray(data?.paymentMethods)) return data.paymentMethods;
        return [];
      },
      providesTags: ['Payment'],
    }),

    // Get system-wide payment methods
    getSystemPaymentMethods: builder.query<PaymentMethod[], void>({
      query: () => '/payment-methods/system',
      transformResponse: (response: any) => {
        const data = response?.data ?? response;
        if (Array.isArray(data)) return data;
        if (Array.isArray(data?.paymentMethods)) return data.paymentMethods;
        return [];
      },
      providesTags: ['Payment'],
    }),

    // Get payment methods for a company (includes system methods)
    getPaymentMethodsByCompany: builder.query<PaymentMethod[], string>({
      query: (companyId) => `/payment-methods/company/${companyId}`,
      transformResponse: (response: any) => {
        const data = response?.data ?? response;
        if (Array.isArray(data)) return data;
        if (Array.isArray(data?.paymentMethods)) return data.paymentMethods;
        return [];
      },
      providesTags: ['Payment'],
    }),

    // Get payment methods for a branch (includes system + company methods)
    getPaymentMethodsByBranch: builder.query<PaymentMethod[], {
      companyId: string;
      branchId: string;
    }>({
      query: ({ companyId, branchId }) => `/payment-methods/branch/${companyId}/${branchId}`,
      transformResponse: (response: any) => {
        const data = response?.data ?? response;
        if (Array.isArray(data)) return data;
        if (Array.isArray(data?.paymentMethods)) return data.paymentMethods;
        return [];
      },
      providesTags: ['Payment'],
    }),

    // Get single payment method
    getPaymentMethod: builder.query<PaymentMethod, string>({
      query: (id) => `/payment-methods/${id}`,
      transformResponse: (response: any) => {
        const data = response?.data ?? response;
        return data;
      },
      providesTags: ['Payment'],
    }),

    // Create payment method
    createPaymentMethod: builder.mutation<PaymentMethod, {
      companyId?: string;
      branchId?: string;
      name: string;
      code: string;
      displayName?: string;
      description?: string;
      type?: PaymentMethod['type'];
      icon?: string;
      color?: string;
      isActive?: boolean;
      sortOrder?: number;
      requiresReference?: boolean;
      requiresAuthorization?: boolean;
      allowsPartialPayment?: boolean;
      allowsChangeDue?: boolean;
      metadata?: Record<string, any>;
    }>({
      query: (body) => ({
        url: '/payment-methods',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Payment'],
    }),

    // Update payment method
    updatePaymentMethod: builder.mutation<PaymentMethod, {
      id: string;
      data: Partial<Omit<PaymentMethod, 'id'>>;
    }>({
      query: ({ id, data }) => ({
        url: `/payment-methods/${id}`,
        method: 'PATCH',
        body: data,
      }),
      invalidatesTags: ['Payment'],
    }),

    // Delete payment method
    deletePaymentMethod: builder.mutation<void, string>({
      query: (id) => ({
        url: `/payment-methods/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Payment'],
    }),
  }),
});

export const {
  useGetPaymentMethodsQuery,
  useGetSystemPaymentMethodsQuery,
  useGetPaymentMethodsByCompanyQuery,
  useGetPaymentMethodsByBranchQuery,
  useGetPaymentMethodQuery,
  useCreatePaymentMethodMutation,
  useUpdatePaymentMethodMutation,
  useDeletePaymentMethodMutation,
} = paymentMethodsApi;

