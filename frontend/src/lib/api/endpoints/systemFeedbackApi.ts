import { apiSlice } from '../apiSlice';

export enum FeedbackType {
  FEEDBACK = 'feedback',
  REVIEW = 'review',
  SUGGESTION = 'suggestion',
  BUG_REPORT = 'bug_report',
}

export interface SystemFeedback {
  _id: string;
  id?: string;
  userId: {
    _id: string;
    firstName?: string;
    lastName?: string;
    email?: string;
  };
  companyId: {
    _id: string;
    name?: string;
  };
  type: FeedbackType;
  rating: number;
  title?: string;
  message: string;
  categories?: string[];
  isAnonymous: boolean;
  isPublic: boolean;
  isResolved: boolean;
  response?: string;
  respondedBy?: {
    _id: string;
    firstName?: string;
    lastName?: string;
  };
  respondedAt?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateSystemFeedbackDto {
  type?: FeedbackType;
  rating: number;
  title?: string;
  message: string;
  categories?: string[];
  isAnonymous?: boolean;
  isPublic?: boolean;
}

export interface PublicStats {
  totalCompanies: number;
  activeCompanies: number;
  totalUsers: number;
  averageRating: number;
  totalFeedback: number;
  totalCustomers: number;
}

export const systemFeedbackApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    // Public endpoints
    getPublicTestimonials: builder.query<SystemFeedback[], { limit?: number }>({
      query: (params) => {
        const queryParams = new URLSearchParams();
        if (params.limit) queryParams.append('limit', params.limit.toString());
        return {
          url: `/system-feedback/testimonials${queryParams.toString() ? `?${queryParams.toString()}` : ''}`,
          method: 'GET',
        };
      },
      transformResponse: (response: any) => {
        // After decryption, response.data is { success: true, data: [...] }
        // So we need to extract response.data.data (the array)
        if (response && response.data) {
          if (Array.isArray(response.data)) {
            return response.data;
          } else if (response.data.data && Array.isArray(response.data.data)) {
            return response.data.data;
          } else if (response.data.success && response.data.data) {
            return response.data.data;
          }
        }
        // Fallback: if response is already an array, return it
        if (Array.isArray(response)) {
          return response;
        }
        return [];
      },
    }),

    getPublicStats: builder.query<PublicStats, void>({
      query: () => ({
        url: '/public/stats',
        method: 'GET',
      }),
      transformResponse: (response: any) => {
        // Handle response structure: { success: true, data: {...} }
        return response?.data || response || {
          totalCompanies: 0,
          activeCompanies: 0,
          totalUsers: 0,
          averageRating: 0,
          totalFeedback: 0,
        };
      },
    }),

    // Authenticated endpoints
    createFeedback: builder.mutation<SystemFeedback, CreateSystemFeedbackDto>({
      query: (data) => ({
        url: '/system-feedback',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['SystemFeedback'],
    }),

    getMyFeedback: builder.query<SystemFeedback[], void>({
      query: () => ({
        url: '/system-feedback/my-feedback',
        method: 'GET',
      }),
      providesTags: ['SystemFeedback'],
    }),

    getAllFeedback: builder.query<SystemFeedback[], { type?: FeedbackType; isPublic?: boolean; limit?: number }>({
      query: (params) => {
        const queryParams = new URLSearchParams();
        if (params.type) queryParams.append('type', params.type);
        if (params.isPublic !== undefined) queryParams.append('isPublic', params.isPublic.toString());
        if (params.limit) queryParams.append('limit', params.limit.toString());
        return {
          url: `/system-feedback${queryParams.toString() ? `?${queryParams.toString()}` : ''}`,
          method: 'GET',
        };
      },
      providesTags: ['SystemFeedback'],
    }),

    getFeedbackById: builder.query<SystemFeedback, string>({
      query: (id) => ({
        url: `/system-feedback/${id}`,
        method: 'GET',
      }),
      providesTags: (result, error, id) => [{ type: 'SystemFeedback', id }],
    }),

    respondToFeedback: builder.mutation<SystemFeedback, { id: string; response: string }>({
      query: ({ id, response }) => ({
        url: `/system-feedback/${id}/respond`,
        method: 'POST',
        body: { response },
      }),
      invalidatesTags: (result, error, { id }) => [{ type: 'SystemFeedback', id }, 'SystemFeedback'],
    }),

    deleteFeedback: builder.mutation<void, string>({
      query: (id) => ({
        url: `/system-feedback/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['SystemFeedback'],
    }),
  }),
});

export const {
  useGetPublicTestimonialsQuery,
  useGetPublicStatsQuery,
  useCreateFeedbackMutation,
  useGetMyFeedbackQuery,
  useGetAllFeedbackQuery,
  useGetFeedbackByIdQuery,
  useRespondToFeedbackMutation,
  useDeleteFeedbackMutation,
} = systemFeedbackApi;

