import { apiSlice } from '../apiSlice';

export interface MarketingCampaign {
  id: string;
  name: string;
  type: 'email' | 'sms' | 'push' | 'loyalty' | 'coupon';
  status: 'draft' | 'scheduled' | 'active' | 'completed' | 'paused';
  target: 'all' | 'loyalty' | 'new' | 'inactive' | 'segment';
  segment?: string;
  subject?: string;
  message: string;
  scheduledDate?: string;
  sentDate?: string;
  recipients: number;
  opened?: number;
  clicked?: number;
  converted?: number;
  branchId: string;
  companyId: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCampaignRequest {
  name: string;
  type: 'email' | 'sms' | 'push' | 'loyalty' | 'coupon';
  target: 'all' | 'loyalty' | 'new' | 'inactive' | 'segment';
  segment?: string;
  subject?: string;
  message: string;
  scheduledDate?: string;
}

export interface UpdateCampaignRequest extends Partial<CreateCampaignRequest> {
  id: string;
  status?: MarketingCampaign['status'];
}

export const marketingApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getCampaigns: builder.query<MarketingCampaign[], { branchId?: string; companyId?: string }>({
      query: (params) => ({
        url: '/marketing/campaigns',
        params,
      }),
      providesTags: ['Marketing' as const],
      // For now, return empty array as backend doesn't have this endpoint yet
      transformResponse: () => [],
    }),
    getCampaignById: builder.query<MarketingCampaign, string>({
      query: (id) => `/marketing/campaigns/${id}`,
      providesTags: ['Marketing' as const],
    }),
    createCampaign: builder.mutation<MarketingCampaign, CreateCampaignRequest>({
      query: (data) => ({
        url: '/marketing/campaigns',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['Marketing' as const],
    }),
    updateCampaign: builder.mutation<MarketingCampaign, UpdateCampaignRequest>({
      query: ({ id, ...data }) => ({
        url: `/marketing/campaigns/${id}`,
        method: 'PATCH',
        body: data,
      }),
      invalidatesTags: ['Marketing' as const],
    }),
    deleteCampaign: builder.mutation<void, string>({
      query: (id) => ({
        url: `/marketing/campaigns/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Marketing' as const],
    }),
    sendCampaign: builder.mutation<{ message: string; sent: number }, string>({
      query: (id) => ({
        url: `/marketing/campaigns/${id}/send`,
        method: 'POST',
      }),
      invalidatesTags: ['Marketing' as const],
    }),
    pauseCampaign: builder.mutation<MarketingCampaign, string>({
      query: (id) => ({
        url: `/marketing/campaigns/${id}/pause`,
        method: 'POST',
      }),
      invalidatesTags: ['Marketing' as const],
    }),
    resumeCampaign: builder.mutation<MarketingCampaign, string>({
      query: (id) => ({
        url: `/marketing/campaigns/${id}/resume`,
        method: 'POST',
      }),
      invalidatesTags: ['Marketing' as const],
    }),
  }),
});

export const {
  useGetCampaignsQuery,
  useGetCampaignByIdQuery,
  useCreateCampaignMutation,
  useUpdateCampaignMutation,
  useDeleteCampaignMutation,
  useSendCampaignMutation,
  usePauseCampaignMutation,
  useResumeCampaignMutation,
} = marketingApi;

