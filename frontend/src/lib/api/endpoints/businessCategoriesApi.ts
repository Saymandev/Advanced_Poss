import { apiSlice } from '../apiSlice';

export interface BusinessCategory {
  id: string;
  name: string;
  code: string;
  businessType: string;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateBusinessCategoryRequest {
  name: string;
  code: string;
  businessType: string;
  isActive?: boolean;
}

export interface UpdateBusinessCategoryRequest extends Partial<CreateBusinessCategoryRequest> {}

export const businessCategoriesApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getBusinessCategories: builder.query<BusinessCategory[], void>({
      query: () => '/business-categories',
      providesTags: ['BusinessCategory'],
      transformResponse: (response: any) => {
        return response.data || [];
      },
    }),
    
    getPublicBusinessCategories: builder.query<BusinessCategory[], void>({
      query: () => '/business-categories/public',
      transformResponse: (response: any) => {
        return response.data || [];
      },
    }),

    createBusinessCategory: builder.mutation<BusinessCategory, CreateBusinessCategoryRequest>({
      query: (data) => ({
        url: '/business-categories',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['BusinessCategory'],
    }),

    updateBusinessCategory: builder.mutation<BusinessCategory, { id: string; data: UpdateBusinessCategoryRequest }>({
      query: ({ id, data }) => ({
        url: `/business-categories/${id}`,
        method: 'PUT',
        body: data,
      }),
      invalidatesTags: ['BusinessCategory'],
    }),

    deleteBusinessCategory: builder.mutation<void, string>({
      query: (id) => ({
        url: `/business-categories/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['BusinessCategory'],
    }),
  }),
});

export const {
  useGetBusinessCategoriesQuery,
  useGetPublicBusinessCategoriesQuery,
  useCreateBusinessCategoryMutation,
  useUpdateBusinessCategoryMutation,
  useDeleteBusinessCategoryMutation,
} = businessCategoriesApi;
