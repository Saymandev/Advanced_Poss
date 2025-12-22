import { apiSlice } from '../apiSlice';
export interface SubscriptionPlan {
  id: string;
  name: string;
  displayName: string;
  description: string;
  price: number;
  currency: string;
  billingCycle: 'monthly' | 'quarterly' | 'yearly';
  trialPeriod: number; // Trial period in hours (e.g., 168 = 7 days)
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
  enabledFeatureKeys?: string[]; // Array of enabled feature keys (new flexible format)
  limits?: {
    maxBranches: number;
    maxUsers: number;
    storageGB: number;
    maxTables?: number;
    maxMenuItems?: number;
    maxOrders?: number;
    maxCustomers?: number;
    // Public ordering system
    publicOrderingEnabled?: boolean;
    maxPublicBranches?: number;
    // Review system
    reviewsEnabled?: boolean;
    reviewModerationRequired?: boolean;
    maxReviewsPerMonth?: number;
    // Custom domain and whitelabel
    whitelabelEnabled?: boolean;
    customDomainEnabled?: boolean;
    prioritySupportEnabled?: boolean;
  };
  isActive: boolean;
  isPopular?: boolean;
  sortOrder?: number;
  featureList?: string[]; // Admin-manageable feature descriptions
  createdAt: string;
  updatedAt: string;
}
export interface AvailableFeaturesResponse {
  success: boolean;
  data: {
    featuresByCategory: Record<string, Array<{ key: string; name: string }>>;
    allFeatureKeys: string[];
  };
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
        // If response is still encrypted (decryption failed), bail out safely
        if (response && typeof response === 'object') {
          const payload = (response as any).data || response;
          if (payload && typeof payload === 'object' && payload.encrypted) {
            console.warn('Subscription plans response is still encrypted; returning empty list to avoid UI crash.');
            return [];
          }
        }
        const normalize = (plans: any) => {
          if (!Array.isArray(plans)) {
            console.warn('Expected plans array but received:', plans);
            return [];
          }
          return plans.map((plan) => ({
            ...plan,
            // Preserve featureNames from backend (mapped from enabledFeatureKeys)
            // Only create featureList fallback if featureNames is not available
            featureList:
              plan.featureNames && plan.featureNames.length > 0
                ? plan.featureNames // Use featureNames if available (from enabledFeatureKeys)
                : (plan.featureList && plan.featureList.length > 0
                  ? plan.featureList
                  : [
                      plan.features?.pos ? 'POS & Ordering' : null,
                      plan.features?.inventory ? 'Inventory Management' : null,
                      plan.features?.crm ? 'Customer CRM' : null,
                      plan.features?.multiBranch ? 'Multi-branch Support' : null,
                      plan.features?.aiInsights ? 'AI Insights' : null,
                      plan.features?.accounting ? 'Accounting & Reports' : null,
                    ].filter(Boolean) as string[]),
            // Also preserve featureNames if it exists
            featureNames: plan.featureNames || undefined,
          }));
        };
        // Handle { success: true, data: [...] } format (from backend interceptor)
        if (response && typeof response === 'object' && 'success' in response && 'data' in response) {
          const data = response.data;
          if (Array.isArray(data)) {
            const normalized = normalize(data);
            return normalized;
          }
          // If data is an object with plans property
          if (data && typeof data === 'object' && 'plans' in data) {
            const normalized = {
              ...data,
              plans: normalize(data.plans || []),
            };
            return normalized;
          }
          // If data is an object with items property (fallback)
          if (data && typeof data === 'object' && 'items' in data) {
            const normalized = {
              ...data,
              items: normalize((data as any).items || []),
            };
            return normalized;
          }
          // Unknown shape, return empty array to avoid runtime errors
          console.warn('Success response data shape not recognized for subscription plans:', data);
          return [];
        }
        // Handle direct array format
        if (Array.isArray(response)) {
          const normalized = normalize(response);
          return normalized;
        }
        // Handle { plans: [...] } format
        if (response && typeof response === 'object' && 'plans' in response) {
          const normalized = {
            ...response,
            plans: normalize(response.plans || []),
          };
          return normalized;
        }
        // Fallback: return empty array
        console.warn('Subscription plans response format not recognized:', response);
        console.warn('Response keys:', response && typeof response === 'object' ? Object.keys(response) : 'N/A');
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
      transformResponse: (response: any) => {
        // Handle { success: true, data: {...} } format (from backend interceptor)
        if (response && typeof response === 'object' && 'success' in response && 'data' in response) {
          return response.data;
        }
        // Handle direct plan object
        return response;
      },
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
      plan?: string; // SubscriptionPlan enum value (e.g., 'basic', 'premium', 'enterprise') - Optional if enabledFeatures provided
      enabledFeatures?: string[]; // Array of feature keys for feature-based subscription
      billingCycle: string; // BillingCycle enum value (e.g., 'monthly', 'quarterly', 'yearly') - REQUIRED
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
      // Invalidate both subscription and company so UI refreshes plan immediately
      invalidatesTags: ['Subscription', 'Company'],
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
    // Get all available features for plan customization (Super Admin)
    getAvailableFeatures: builder.query<AvailableFeaturesResponse, void>({
      query: () => ({
        url: '/subscription-plans/available-features',
      }),
      providesTags: ['Subscription'],
    }),
    // Get plan with normalized features
    getPlanWithFeatures: builder.query<SubscriptionPlan, string>({
      query: (id) => ({
        url: `/subscription-plans/${id}/features`,
      }),
      providesTags: ['Subscription'],
    }),
    // Migrate legacy plan to new enabledFeatureKeys format (Super Admin)
    migratePlanFeatures: builder.mutation<SubscriptionPlan, string>({
      query: (id) => ({
        url: `/subscription-plans/${id}/migrate-features`,
        method: 'POST',
      }),
      invalidatesTags: ['Subscription'],
    }),
    // Get subscription features catalog (for feature-based subscriptions)
    getSubscriptionFeatures: builder.query<
      {
        id: string;
        key: string;
        name: string;
        description?: string;
        category: string;
        basePriceMonthly: number;
        basePriceYearly: number;
        perBranchPriceMonthly?: number;
        perUserPriceMonthly?: number;
        isActive: boolean;
        isRequired?: boolean;
      }[],
      void
    >({
      query: () => ({
        url: '/subscription-features',
      }),
      providesTags: ['Subscription'],
      transformResponse: (response: any) => {
        // Handle { success: true, data: [...] } format (from backend interceptor)
        if (response && typeof response === 'object' && 'success' in response && 'data' in response) {
          const data = response.data;
          if (Array.isArray(data)) {
            return data;
          }
        }
        // Handle direct array format
        if (Array.isArray(response)) {
          return response;
        }
        // Fallback: return empty array
        console.warn('Subscription features response format not recognized:', response);
        return [];
      },
    }),
    // Calculate price for feature-based subscription
    calculateFeaturePrice: builder.mutation<
      {
        basePrice: number;
        branchPrice: number;
        userPrice: number;
        totalPrice: number;
        features: any[];
      },
      {
        featureKeys: string[];
        billingCycle: 'monthly' | 'quarterly' | 'yearly';
        branchCount?: number;
        userCount?: number;
      }
    >({
      query: (body) => ({
        url: '/subscription-features/calculate-price',
        method: 'POST',
        body,
      }),
    }),
    // Seed default features (Super Admin only)
    seedSubscriptionFeatures: builder.mutation<
      {
        success: boolean;
        message: string;
        data: any[];
      },
      void
    >({
      query: () => ({
        url: '/subscription-features/seed',
        method: 'GET',
      }),
      invalidatesTags: ['Subscription'],
    }),
    // Create subscription feature (Super Admin only)
    createSubscriptionFeature: builder.mutation<any, any>({
      query: (data) => ({
        url: '/subscription-features',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['Subscription'],
    }),
    // Update subscription feature (Super Admin only)
    updateSubscriptionFeature: builder.mutation<any, { id: string; data: any }>({
      query: ({ id, data }) => ({
        url: `/subscription-features/${id}`,
        method: 'PUT',
        body: data,
      }),
      invalidatesTags: ['Subscription'],
    }),
    // Delete subscription feature (Super Admin only)
    deleteSubscriptionFeature: builder.mutation<void, string>({
      query: (id) => ({
        url: `/subscription-features/${id}`,
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
  useGetAvailableFeaturesQuery,
  useGetPlanWithFeaturesQuery,
  useMigratePlanFeaturesMutation,
  useGetSubscriptionFeaturesQuery,
  useCalculateFeaturePriceMutation,
  useSeedSubscriptionFeaturesMutation,
  useCreateSubscriptionFeatureMutation,
  useUpdateSubscriptionFeatureMutation,
  useDeleteSubscriptionFeatureMutation,
} = subscriptionsApi;
