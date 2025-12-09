import { apiSlice } from '../apiSlice';

export interface ContactForm {
  id: string;
  companyId?: string | null;
  company?: {
    id: string;
    name: string;
    slug: string;
  } | null;
  name: string;
  email: string;
  phone?: string;
  subject: string;
  message: string;
  status: 'new' | 'read' | 'replied' | 'archived';
  readAt?: string;
  readBy?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  } | null;
  adminNotes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ContactFormListResponse {
  success: boolean;
  data: ContactForm[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface ContactFormStats {
  total: number;
  new: number;
  read: number;
  replied: number;
  archived: number;
}

export interface UpdateContactFormDto {
  status?: 'new' | 'read' | 'replied' | 'archived';
  adminNotes?: string;
}

export interface ContactFormFilters {
  companyId?: string | null;
  status?: 'new' | 'read' | 'replied' | 'archived';
  search?: string;
  page?: number;
  limit?: number;
}

export const contactFormsApi = apiSlice.injectEndpoints({
  overrideExisting: true,
  endpoints: (builder) => ({
    getContactForms: builder.query<ContactFormListResponse, ContactFormFilters>({
      query: (filters) => {
        const params = new URLSearchParams();
        if (filters.companyId !== undefined) {
          params.append('companyId', filters.companyId === null ? 'null' : filters.companyId);
        }
        if (filters.status) params.append('status', filters.status);
        if (filters.search) params.append('search', filters.search);
        if (filters.page) params.append('page', filters.page.toString());
        if (filters.limit) params.append('limit', filters.limit.toString());
        
        return {
          url: `/contact-forms${params.toString() ? `?${params.toString()}` : ''}`,
          method: 'GET',
        };
      },
      transformResponse: (response: any) => {
        // Backend returns: { success: true, data: [...], pagination: {...} }
        // Return the full structure including pagination
        if (response?.success && response?.data && response?.pagination) {
          return response;
        }
        // If response.data is an array but no pagination, add default pagination
        if (response?.data && Array.isArray(response.data)) {
          return {
            success: response.success ?? true,
            data: response.data,
            pagination: response.pagination || {
              page: 1,
              limit: response.data.length || 20,
              total: response.data.length || 0,
              totalPages: 1,
            },
          };
        }
        // Fallback: return as-is
        return response;
      },
      providesTags: ['ContactForm'],
    }),

    getContactFormById: builder.query<{ success: boolean; data: ContactForm }, string>({
      query: (id) => ({
        url: `/contact-forms/${id}`,
        method: 'GET',
      }),
      transformResponse: (response: any) => {
        return response?.data || response;
      },
      providesTags: (result, error, id) => [{ type: 'ContactForm', id }],
    }),

    getContactFormStats: builder.query<{ success: boolean; data: ContactFormStats }, string | null | undefined>({
      query: (companyId) => {
        const params = new URLSearchParams();
        if (companyId !== undefined) {
          params.append('companyId', companyId === null ? 'null' : companyId);
        }
        return {
          url: `/contact-forms/stats${params.toString() ? `?${params.toString()}` : ''}`,
          method: 'GET',
        };
      },
      transformResponse: (response: any) => {
        return response?.data || response;
      },
      providesTags: ['ContactForm'],
    }),

    updateContactForm: builder.mutation<{ success: boolean; message: string; data: ContactForm }, { id: string; data: UpdateContactFormDto }>({
      query: ({ id, data }) => ({
        url: `/contact-forms/${id}`,
        method: 'PATCH',
        body: data,
      }),
      transformResponse: (response: any) => {
        return response?.data || response;
      },
      invalidatesTags: (result, error, { id }) => [
        { type: 'ContactForm', id },
        'ContactForm',
      ],
    }),
  }),
});

export const {
  useGetContactFormsQuery,
  useGetContactFormByIdQuery,
  useGetContactFormStatsQuery,
  useUpdateContactFormMutation,
} = contactFormsApi;

