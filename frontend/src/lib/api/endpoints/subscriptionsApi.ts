import { apiSlice } from '@/lib/api/apiSlice';

export interface Subscription { id: string; plan: string; status: string }

export const subscriptionsApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    listSubscriptions: builder.query<Subscription[] | { data: Subscription[] }, void>({ query: () => '/subscriptions', providesTags: ['Subscriptions'] }),
    getSubscription: builder.query<Subscription, string>({ query: (id) => `/subscriptions/${id}`, providesTags: (_r,_e,id)=>[{ type:'Subscriptions', id } as any] }),
    createSubscription: builder.mutation<Subscription, Partial<Subscription>>({ query: (body) => ({ url: '/subscriptions', method: 'POST', body }), invalidatesTags: ['Subscriptions'] }),
    updateSubscription: builder.mutation<Subscription, { id: string; changes: Partial<Subscription> }>({ query: ({ id, changes }) => ({ url: `/subscriptions/${id}`, method: 'PUT', body: changes }), invalidatesTags: (_r,_e,arg)=>[{ type:'Subscriptions', id: arg.id } as any] }),
    upgradeSubscription: builder.mutation<Subscription, { id: string; plan: string }>({ query: ({ id, plan }) => ({ url: `/subscriptions/${id}/upgrade`, method: 'PATCH', body: { plan } }), invalidatesTags: (_r,_e,arg)=>[{ type:'Subscriptions', id: arg.id } as any] }),
    cancelSubscription: builder.mutation<Subscription, string>({ query: (id) => ({ url: `/subscriptions/${id}/cancel`, method: 'PATCH' }), invalidatesTags: (_r,_e,id)=>[{ type:'Subscriptions', id } as any] }),
    reactivateSubscription: builder.mutation<Subscription, string>({ query: (id) => ({ url: `/subscriptions/${id}/reactivate`, method: 'PATCH' }), invalidatesTags: (_r,_e,id)=>[{ type:'Subscriptions', id } as any] }),
    pauseSubscription: builder.mutation<Subscription, string>({ query: (id) => ({ url: `/subscriptions/${id}/pause`, method: 'PATCH' }), invalidatesTags: (_r,_e,id)=>[{ type:'Subscriptions', id } as any] }),
    resumeSubscription: builder.mutation<Subscription, string>({ query: (id) => ({ url: `/subscriptions/${id}/resume`, method: 'PATCH' }), invalidatesTags: (_r,_e,id)=>[{ type:'Subscriptions', id } as any] }),
    processPayment: builder.mutation<any, { id: string; amount: number; method: string }>({ query: ({ id, ...body }) => ({ url: `/subscriptions/${id}/payment`, method: 'POST', body }), invalidatesTags: (_r,_e,arg)=>[{ type:'Subscriptions', id: arg.id } as any] }),
    listPlans: builder.query<any, void>({ query: () => '/subscriptions/plans/list', providesTags: ['Subscriptions'] }),
    companyBillingHistory: builder.query<any, string>({ query: (companyId) => `/subscriptions/company/${companyId}/billing-history`, providesTags: ['Subscriptions'] }),
    checkLimit: builder.query<any, { companyId: string; limitType: string }>({ query: ({ companyId, limitType }) => `/subscriptions/${companyId}/limits/${limitType}`, providesTags: ['Subscriptions'] }),
  }),
})

export const { useListSubscriptionsQuery, useGetSubscriptionQuery, useCreateSubscriptionMutation, useUpdateSubscriptionMutation, useUpgradeSubscriptionMutation, useCancelSubscriptionMutation, useReactivateSubscriptionMutation, usePauseSubscriptionMutation, useResumeSubscriptionMutation, useProcessPaymentMutation, useListPlansQuery, useCompanyBillingHistoryQuery, useCheckLimitQuery } = subscriptionsApi


