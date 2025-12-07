import { apiSlice } from '../apiSlice';

export enum ContentPageType {
  BLOG = 'blog',
  CAREER = 'career',
  HELP_CENTER = 'help_center',
  PAGE = 'page',
}

export enum ContentPageStatus {
  DRAFT = 'draft',
  PUBLISHED = 'published',
  ARCHIVED = 'archived',
}

export interface ContentPage {
  _id: string;
  id?: string;
  type: ContentPageType;
  title: string;
  slug: string;
  excerpt?: string;
  content: string;
  featuredImage?: string;
  images?: string[];
  tags?: string[];
  status: ContentPageStatus;
  isFeatured: boolean;
  viewCount: number;
  publishedAt?: string;
  authorId?: string;
  authorName?: string;
  readingTime?: number;
  jobTitle?: string;
  location?: string;
  employmentType?: string;
  salaryRange?: string;
  applicationDeadline?: string;
  applicationUrl?: string;
  requirements?: string[];
  responsibilities?: string[];
  category?: string;
  subcategory?: string;
  helpfulCount: number;
  notHelpfulCount: number;
  allowComments: boolean;
  metaTitle?: string;
  metaDescription?: string;
  metaKeywords?: string[];
  sortOrder: number;
  createdBy?: {
    _id: string;
    name?: string;
    email?: string;
  };
  updatedBy?: {
    _id: string;
    name?: string;
    email?: string;
  };
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateContentPageDto {
  type: ContentPageType;
  title: string;
  slug: string;
  excerpt?: string;
  content: string;
  featuredImage?: string;
  images?: string[];
  tags?: string[];
  status?: ContentPageStatus;
  isFeatured?: boolean;
  authorName?: string;
  readingTime?: number;
  jobTitle?: string;
  location?: string;
  employmentType?: string;
  salaryRange?: string;
  applicationDeadline?: string;
  applicationUrl?: string;
  requirements?: string[];
  responsibilities?: string[];
  category?: string;
  subcategory?: string;
  allowComments?: boolean;
  metaTitle?: string;
  metaDescription?: string;
  metaKeywords?: string[];
  sortOrder?: number;
}

export interface UpdateContentPageDto extends Partial<CreateContentPageDto> {}

export const cmsApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    // Public endpoints
    getPublicContentPages: builder.query<ContentPage[], { type?: ContentPageType; featured?: boolean; limit?: number }>({
      query: (params) => {
        const queryParams = new URLSearchParams();
        if (params.type) queryParams.append('type', params.type);
        if (params.featured !== undefined) queryParams.append('featured', params.featured.toString());
        if (params.limit) queryParams.append('limit', params.limit.toString());
        return {
          url: `/cms/public${queryParams.toString() ? `?${queryParams.toString()}` : ''}`,
          method: 'GET',
        };
      },
    }),

    getContentPageBySlug: builder.query<ContentPage, string>({
      query: (slug) => ({
        url: `/cms/public/slug/${slug}`,
        method: 'GET',
      }),
    }),

    getCategories: builder.query<string[], ContentPageType>({
      query: (type) => ({
        url: `/cms/categories?type=${type}`,
        method: 'GET',
      }),
    }),

    // Admin endpoints (require auth)
    getAllContentPages: builder.query<ContentPage[], { type?: ContentPageType; status?: ContentPageStatus; isActive?: boolean; search?: string }>({
      query: (params) => {
        const queryParams = new URLSearchParams();
        if (params.type) queryParams.append('type', params.type);
        if (params.status) queryParams.append('status', params.status);
        if (params.isActive !== undefined) queryParams.append('isActive', params.isActive.toString());
        if (params.search) queryParams.append('search', params.search);
        return {
          url: `/cms${queryParams.toString() ? `?${queryParams.toString()}` : ''}`,
          method: 'GET',
        };
      },
      providesTags: ['ContentPages'],
    }),

    getContentPageById: builder.query<ContentPage, string>({
      query: (id) => ({
        url: `/cms/${id}`,
        method: 'GET',
      }),
      providesTags: (result, error, id) => [{ type: 'ContentPages', id }],
    }),

    createContentPage: builder.mutation<ContentPage, CreateContentPageDto>({
      query: (data) => ({
        url: '/cms',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['ContentPages'],
    }),

    updateContentPage: builder.mutation<ContentPage, { id: string; data: UpdateContentPageDto }>({
      query: ({ id, data }) => ({
        url: `/cms/${id}`,
        method: 'PATCH',
        body: data,
      }),
      invalidatesTags: (result, error, { id }) => [{ type: 'ContentPages', id }, 'ContentPages'],
    }),

    deleteContentPage: builder.mutation<void, string>({
      query: (id) => ({
        url: `/cms/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['ContentPages'],
    }),

    hardDeleteContentPage: builder.mutation<void, string>({
      query: (id) => ({
        url: `/cms/${id}/hard`,
        method: 'DELETE',
      }),
      invalidatesTags: ['ContentPages'],
    }),
  }),
});

export const {
  useGetPublicContentPagesQuery,
  useGetContentPageBySlugQuery,
  useGetCategoriesQuery,
  useGetAllContentPagesQuery,
  useGetContentPageByIdQuery,
  useCreateContentPageMutation,
  useUpdateContentPageMutation,
  useDeleteContentPageMutation,
  useHardDeleteContentPageMutation,
} = cmsApi;

