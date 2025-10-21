import { apiSlice } from '../apiSlice';

export interface PaymentIntent {
  id: string;
  clientSecret: string;
  amount: number;
  currency: string;
  status: 'requires_payment_method' | 'requires_confirmation' | 'requires_action' | 'processing' | 'succeeded' | 'canceled';
  orderId?: string;
  customerId?: string;
  metadata?: Record<string, string>;
}

export interface CheckoutSession {
  id: string;
  url: string;
  amount: number;
  currency: string;
  status: 'open' | 'complete' | 'expired';
  orderId?: string;
  customerId?: string;
  expiresAt: string;
}

export interface PaymentConfirmation {
  paymentIntentId: string;
  status: 'succeeded' | 'failed' | 'requires_action';
  transactionId?: string;
  receiptUrl?: string;
  error?: string;
}

export interface WebhookEvent {
  id: string;
  type: string;
  data: any;
  created: number;
  livemode: boolean;
}

export const paymentsApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    createPaymentIntent: builder.mutation<PaymentIntent, { 
      amount: number; 
      currency?: string; 
      orderId?: string; 
      customerId?: string;
      metadata?: Record<string, string>;
    }>({
      query: (data) => ({
        url: '/payments/create-payment-intent',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['Payment'],
    }),
    createCheckoutSession: builder.mutation<CheckoutSession, { 
      amount: number; 
      currency?: string; 
      orderId?: string; 
      customerId?: string;
      successUrl?: string;
      cancelUrl?: string;
    }>({
      query: (data) => ({
        url: '/payments/create-checkout-session',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['Payment'],
    }),
    confirmPayment: builder.mutation<PaymentConfirmation, { 
      paymentIntentId: string; 
      paymentMethodId?: string;
    }>({
      query: (data) => ({
        url: '/payments/confirm-payment',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['Payment', 'Order'],
    }),
    handleWebhook: builder.mutation<void, WebhookEvent>({
      query: (event) => ({
        url: '/payments/webhook',
        method: 'POST',
        body: event,
      }),
      invalidatesTags: ['Payment', 'Order', 'Subscription'],
    }),
  }),
});

export const {
  useCreatePaymentIntentMutation,
  useCreateCheckoutSessionMutation,
  useConfirmPaymentMutation,
  useHandleWebhookMutation,
} = paymentsApi;
