import { apiSlice } from '../apiSlice';

export interface SubscriptionPlan {
  id: string;
  name: string;
  description: string;
  price: number;
  billingCycle: 'monthly' | 'yearly';
  features: string[];
  limits: {
    maxBranches: number;
    maxUsers: number;
    maxTables: number;
    maxMenuItems: number;
    maxCustomers: number;
    storageGB: number;
  };
  isActive: boolean;
  isPopular?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Subscription {
  id: string;
  companyId: string;
  planId: string;
  plan: SubscriptionPlan;
  status: 'active' | 'cancelled' | 'expired' | 'suspended';
  currentPeriodStart: string;
  currentPeriodEnd: string;
  cancelAtPeriodEnd: boolean;
  cancelledAt?: string;
  trialEnd?: string;
  isTrial: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface BillingHistory {
  id: string;
  subscriptionId: string;
  amount: number;
  currency: string;
  status: 'paid' | 'pending' | 'failed' | 'refunded';
  paymentMethod: string;
  invoiceUrl?: string;
  paidAt?: string;
  createdAt: string;
}

export interface UsageStats {
  branches: number;
  users: number;
  tables: number;
  menuItems: number;
  customers: number;
  storageUsed: number;
  storageLimit: number;
}

export const subscriptionsApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getSubscriptionPlans: builder.query<{ plans: SubscriptionPlan[]; total: number }, any>({
      query: (params) => ({
        url: '/subscription-plans',
        params,
      }),
      providesTags: ['Subscription'],
    }),
    getCurrentSubscription: builder.query<Subscription, { companyId: string }>({
      query: (params) => ({
        url: '/subscriptions/current',
        params,
      }),
      providesTags: ['Subscription'],
    }),
    createSubscription: builder.mutation<Subscription, { 
      planId: string; 
      paymentMethodId: string;
      companyId: string;
    }>({
      query: (data) => ({
        url: '/subscriptions',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['Subscription'],
    }),
    updateSubscription: builder.mutation<Subscription, { 
      id: string; 
      planId: string;
      paymentMethodId?: string;
    }>({
      query: ({ id, ...data }) => ({
        url: `/subscriptions/${id}`,
        method: 'PATCH',
        body: data,
      }),
      invalidatesTags: ['Subscription'],
    }),
    cancelSubscription: builder.mutation<Subscription, { 
      id: string; 
      cancelAtPeriodEnd?: boolean;
    }>({
      query: ({ id, ...data }) => ({
        url: `/subscriptions/${id}/cancel`,
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['Subscription'],
    }),
    reactivateSubscription: builder.mutation<Subscription, string>({
      query: (id) => ({
        url: `/subscriptions/${id}/reactivate`,
        method: 'POST',
      }),
      invalidatesTags: ['Subscription'],
    }),
    getBillingHistory: builder.query<{ history: BillingHistory[]; total: number }, any>({
      query: (params) => ({
        url: '/subscriptions/billing-history',
        params,
      }),
      providesTags: ['Subscription'],
    }),
    getUsageStats: builder.query<UsageStats, { companyId: string }>({
      query: (params) => ({
        url: '/subscriptions/usage',
        params,
      }),
      providesTags: ['Subscription'],
    }),
    createPaymentMethod: builder.mutation<{ paymentMethodId: string }, {
      type: 'card';
      card: {
        number: string;
        expMonth: number;
        expYear: number;
        cvc: string;
      };
    }>({
      query: (data) => ({
        url: '/subscriptions/payment-methods',
        method: 'POST',
        body: data,
      }),
    }),
    getPaymentMethods: builder.query<{ paymentMethods: any[] }, { companyId: string }>({
      query: (params) => ({
        url: '/subscriptions/payment-methods',
        params,
      }),
      providesTags: ['Subscription'],
    }),
    deletePaymentMethod: builder.mutation<void, string>({
      query: (id) => ({
        url: `/subscriptions/payment-methods/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Subscription'],
    }),
  }),
});

export const {
  useGetSubscriptionPlansQuery,
  useGetCurrentSubscriptionQuery,
  useCreateSubscriptionMutation,
  useUpdateSubscriptionMutation,
  useCancelSubscriptionMutation,
  useReactivateSubscriptionMutation,
  useGetBillingHistoryQuery,
  useGetUsageStatsQuery,
  useCreatePaymentMethodMutation,
  useGetPaymentMethodsQuery,
  useDeletePaymentMethodMutation,
} = subscriptionsApi;
