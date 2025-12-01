import { apiSlice } from '../apiSlice';

export interface SubscriptionPlan {
  id: string;
  name: string;
  displayName: string;
  description: string;
  price: number;
  currency: string;
  billingCycle: 'monthly' | 'yearly';
  trialPeriod: number; // Trial period in hours
  stripePriceId?: string;
  features: {
    pos: boolean;
    inventory: boolean;
    crm: boolean;
    accounting: boolean;
    aiInsights: boolean;
    multiBranch: boolean;
    maxUsers: number;
    maxBranches: number;
  };
  limits?: {
    maxBranches: number;
    maxUsers: number;
    storageGB: number;
    maxTables?: number;
    maxMenuItems?: number;
  };
  isActive: boolean;
  isPopular?: boolean;
  sortOrder?: number;
  featureList?: string[]; // Admin-manageable feature descriptions
  createdAt: string;
  updatedAt: string;
}

export interface Subscription {
  id: string;
  companyId: string;
  planId: string;
  plan: SubscriptionPlan;
  planKey?: string;
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

export interface SubscriptionListItem extends Subscription {
  company?: {
    id?: string;
    _id?: string;
    name?: string;
    email?: string;
  };
}

export interface SubscriptionListResponse {
  subscriptions: SubscriptionListItem[];
  total: number;
}

export const subscriptionsApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getSubscriptionPlans: builder.query<SubscriptionPlan[] | { plans: SubscriptionPlan[]; total: number }, any>({
      query: (params) => ({
        url: '/subscription-plans',
        params,
      }),
      providesTags: ['Subscription'],
      transformResponse: (response: any) => {
        const normalize = (plans: SubscriptionPlan[]) =>
          plans.map((plan) => ({
            ...plan,
            featureList:
              plan.featureList && plan.featureList.length > 0
                ? plan.featureList
                : [
                    plan.features?.pos ? 'POS & Ordering' : null,
                    plan.features?.inventory ? 'Inventory Management' : null,
                    plan.features?.crm ? 'Customer CRM' : null,
                    plan.features?.multiBranch ? 'Multi-branch Support' : null,
                    plan.features?.aiInsights ? 'AI Insights' : null,
                    plan.features?.accounting ? 'Accounting & Reports' : null,
                  ].filter(Boolean) as string[],
          }));

        // Handle { success: true, data: [...] } format (from backend interceptor)
        if (response && typeof response === 'object' && 'success' in response && 'data' in response) {
          const data = response.data;
          if (Array.isArray(data)) {
            return normalize(data);
          }
          // If data is an object with plans property
          if (data && typeof data === 'object' && 'plans' in data) {
            return {
              ...data,
              plans: normalize(data.plans || []),
            };
          }
        }

        // Handle direct array format
        if (Array.isArray(response)) {
          return normalize(response);
        }

        // Handle { plans: [...] } format
        if (response && typeof response === 'object' && 'plans' in response) {
          return {
            ...response,
            plans: normalize(response.plans || []),
          };
        }

        // Fallback: return empty array
        console.warn('Subscription plans response format not recognized:', response);
        return [];
      },
    }),
    // Super Admin: create a new subscription plan
    createSubscriptionPlan: builder.mutation<SubscriptionPlan, Partial<SubscriptionPlan>>({
      query: (data) => ({
        url: '/subscription-plans',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['Subscription'],
    }),
    // Super Admin: update an existing subscription plan
    updateSubscriptionPlan: builder.mutation<SubscriptionPlan, { id: string; data: Partial<SubscriptionPlan> }>({
      query: ({ id, data }) => ({
        url: `/subscription-plans/${id}`,
        method: 'PATCH',
        body: data,
      }),
      invalidatesTags: ['Subscription'],
    }),
    // Super Admin: delete a subscription plan
    deleteSubscriptionPlan: builder.mutation<void, string>({
      query: (id) => ({
        url: `/subscription-plans/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Subscription'],
    }),
    // Super Admin: list all subscriptions system-wide (with optional filters)
    getAllSubscriptions: builder.query<SubscriptionListResponse, { companyId?: string; status?: string; plan?: string; limit?: number; offset?: number }>({
      query: (params) => ({
        url: '/subscriptions',
        params,
      }),
      providesTags: ['Subscription'],
      transformResponse: (response: any): SubscriptionListResponse => {
        const data = response?.data ?? response;
        if (!data) {
          return { subscriptions: [], total: 0 };
        }
        const subscriptions = Array.isArray(data.subscriptions) ? data.subscriptions : [];
        const total = typeof data.total === 'number' ? data.total : subscriptions.length;
        return { subscriptions, total };
      },
    }),
    getCurrentSubscription: builder.query<Subscription, { companyId: string }>({
      query: (params) => ({
        url: '/subscriptions/current',
        params,
      }),
      providesTags: ['Subscription'],
    }),
    getSubscriptionByCompany: builder.query<Subscription, { companyId: string }>({
      query: ({ companyId }) => ({
        url: `/subscriptions/company/${companyId}`,
      }),
      providesTags: ['Subscription'],
      // Handle 404 gracefully - subscription might not exist or be inactive
      keepUnusedDataFor: 60, // Cache for 60 seconds
    }),
    createSubscription: builder.mutation<Subscription, { 
      companyId: string;
      plan: string; // SubscriptionPlan enum value (e.g., 'basic', 'premium', 'enterprise') - REQUIRED
      billingCycle: string; // BillingCycle enum value (e.g., 'monthly', 'yearly') - REQUIRED
      email: string; // REQUIRED
      companyName: string; // REQUIRED
      paymentMethodId?: string; // Optional
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
  useGetAllSubscriptionsQuery,
  useGetSubscriptionPlansQuery,
  useCreateSubscriptionPlanMutation,
  useUpdateSubscriptionPlanMutation,
  useDeleteSubscriptionPlanMutation,
  useGetCurrentSubscriptionQuery,
  useGetSubscriptionByCompanyQuery,
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
