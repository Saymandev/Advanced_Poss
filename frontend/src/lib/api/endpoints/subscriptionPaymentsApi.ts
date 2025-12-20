import { apiSlice } from '../apiSlice';
export enum PaymentGateway {
  STRIPE = 'stripe',
  PAYPAL = 'paypal',
  GOOGLE_PAY = 'google_pay',
  APPLE_PAY = 'apple_pay',
  BKASH = 'bkash',
  NAGAD = 'nagad',
  ROCKET = 'rocket',
  UPAY = 'upay',
  MANUAL = 'manual',
}
export enum PaymentMethodType {
  CARD = 'card',
  DIGITAL_WALLET = 'digital_wallet',
  MOBILE_WALLET = 'mobile_wallet',
  BANK_TRANSFER = 'bank_transfer',
  MANUAL = 'manual',
}
export interface SubscriptionPaymentMethod {
  id: string;
  gateway: PaymentGateway;
  type: PaymentMethodType;
  name: string;
  code: string;
  displayName?: string;
  description?: string;
  icon?: string;
  logo?: string;
  isActive: boolean;
  isDefault?: boolean;
  supportedCountries: string[];
  supportedCurrencies: string[];
  sortOrder: number;
  config?: Record<string, any>;
  metadata?: {
    minAmount?: number;
    maxAmount?: number;
    processingFee?: number;
    processingFeeType?: 'fixed' | 'percentage';
    [key: string]: any;
  };
}
export interface InitializePaymentRequest {
  companyId: string;
  planName: string;
  paymentGateway: PaymentGateway;
  paymentDetails?: {
    transactionId?: string;
    referenceNumber?: string;
    phoneNumber?: string;
    metadata?: Record<string, any>;
  };
  billingCycle?: string;
}
export interface InitializePaymentResponse {
  gateway: PaymentGateway;
  sessionId?: string;
  url?: string;
  clientSecret?: string;
  paymentIntentId?: string;
  instructions?: {
    phoneNumber: string;
    amount: number;
    currency: string;
    reference: string;
    message?: string;
    error?: string;
  };
  paymentReference?: string;
  requiresManualVerification?: boolean;
}
export interface ManualActivationRequest {
  companyId: string;
  planName: string;
  billingCycle?: string;
  notes?: string;
}
export const subscriptionPaymentsApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    // Get available payment methods (public - only active)
    getSubscriptionPaymentMethods: builder.query<
      SubscriptionPaymentMethod[],
      { country?: string; currency?: string }
    >({
      query: ({ country, currency }) => {
        const params = new URLSearchParams();
        if (country) params.append('country', country);
        if (currency) params.append('currency', currency);
        return `/subscription-payments/methods?${params.toString()}`;
      },
      transformResponse: (response: any) => {
        const data = response?.data ?? response;
        if (Array.isArray(data)) return data;
        return [];
      },
      providesTags: ['Subscription'],
    }),
    // ========== Super Admin Payment Method Management ==========
    // Get all payment methods (admin - includes inactive)
    getAllSubscriptionPaymentMethods: builder.query<SubscriptionPaymentMethod[], void>({
      query: () => '/subscription-payments/admin/methods',
      transformResponse: (response: any) => {
        const data = response?.data ?? response;
        if (Array.isArray(data)) return data;
        return [];
      },
      providesTags: ['Subscription'],
    }),
    // Get payment method by ID
    getSubscriptionPaymentMethodById: builder.query<SubscriptionPaymentMethod, string>({
      query: (id) => `/subscription-payments/admin/methods/${id}`,
      transformResponse: (response: any) => {
        return response?.data ?? response;
      },
      providesTags: (result, error, id) => [{ type: 'Subscription', id }],
    }),
    // Create payment method
    createSubscriptionPaymentMethod: builder.mutation<
      SubscriptionPaymentMethod,
      Partial<CreateSubscriptionPaymentMethodDto>
    >({
      query: (body) => ({
        url: '/subscription-payments/admin/methods',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Subscription'],
    }),
    // Update payment method
    updateSubscriptionPaymentMethod: builder.mutation<
      SubscriptionPaymentMethod,
      { id: string; data: Partial<CreateSubscriptionPaymentMethodDto> }
    >({
      query: ({ id, data }) => ({
        url: `/subscription-payments/admin/methods/${id}`,
        method: 'PUT',
        body: data,
      }),
      invalidatesTags: (result, error, { id }) => [{ type: 'Subscription', id }, 'Subscription'],
    }),
    // Delete payment method
    deleteSubscriptionPaymentMethod: builder.mutation<{ message: string }, string>({
      query: (id) => ({
        url: `/subscription-payments/admin/methods/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Subscription'],
    }),
    // Toggle payment method status
    toggleSubscriptionPaymentMethodStatus: builder.mutation<SubscriptionPaymentMethod, string>({
      query: (id) => ({
        url: `/subscription-payments/admin/methods/${id}/toggle`,
        method: 'PATCH',
      }),
      invalidatesTags: (result, error, id) => [{ type: 'Subscription', id }, 'Subscription'],
    }),
    // Initialize payment
    initializeSubscriptionPayment: builder.mutation<
      InitializePaymentResponse,
      InitializePaymentRequest
    >({
      query: (body) => ({
        url: '/subscription-payments/initialize',
        method: 'POST',
        body,
      }),
      transformResponse: (response: any) => {
        // Handle response structure: { success: true, data: {...} } or direct response
        const data = response?.data || response;
        return data;
      },
      invalidatesTags: ['Subscription'],
    }),
    // Manual activation (Super Admin only)
    manualActivateSubscription: builder.mutation<
      { success: boolean; message: string; company: any },
      ManualActivationRequest
    >({
      query: (body) => ({
        url: '/subscription-payments/manual-activation',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Subscription', 'Company'],
    }),
    // Verify payment
    verifySubscriptionPayment: builder.mutation<
      { verified: boolean; paymentId: string; transactionId: string },
      { paymentId: string; transactionId: string }
    >({
      query: (body) => ({
        url: '/subscription-payments/verify',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Subscription'],
    }),
  }),
});
export interface CreateSubscriptionPaymentMethodDto {
  gateway: PaymentGateway;
  type: PaymentMethodType;
  name: string;
  code: string;
  displayName?: string;
  description?: string;
  icon?: string;
  logo?: string;
  isActive?: boolean;
  isDefault?: boolean;
  supportedCountries?: string[];
  supportedCurrencies?: string[];
  sortOrder?: number;
  config?: Record<string, any>;
  metadata?: {
    minAmount?: number;
    maxAmount?: number;
    processingFee?: number;
    processingFeeType?: 'fixed' | 'percentage';
    [key: string]: any;
  };
}
export const {
  useGetSubscriptionPaymentMethodsQuery,
  useGetAllSubscriptionPaymentMethodsQuery,
  useGetSubscriptionPaymentMethodByIdQuery,
  useCreateSubscriptionPaymentMethodMutation,
  useUpdateSubscriptionPaymentMethodMutation,
  useDeleteSubscriptionPaymentMethodMutation,
  useToggleSubscriptionPaymentMethodStatusMutation,
  useInitializeSubscriptionPaymentMutation,
  useManualActivateSubscriptionMutation,
  useVerifySubscriptionPaymentMutation,
} = subscriptionPaymentsApi;