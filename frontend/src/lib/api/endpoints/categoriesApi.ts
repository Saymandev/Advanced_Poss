import { apiSlice } from '../apiSlice';

export interface Category {
  id: string;
  name: string;
  description?: string;
  icon?: string;
  color?: string;
  sortOrder?: number;
  isActive: boolean;
  companyId: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCategoryRequest {
  name: string;
  description?: string;
  icon?: string;
  color?: string;
  sortOrder?: number;
}

export interface UpdateCategoryRequest extends Partial<CreateCategoryRequest> {
  id: string;
}

export const categoriesApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getCategories: builder.query<{ categories: Category[]; total: number }, any>({
      query: (params) => ({
        url: '/categories',
        params,
      }),
      providesTags: ['Category'],
    }),
    getCategoryById: builder.query<Category, string>({
      query: (id) => `/categories/${id}`,
      providesTags: ['Category'],
    }),
    getCategoriesByCompany: builder.query<Category[], string>({
      query: (companyId) => `/categories/company/${companyId}`,
      providesTags: ['Category'],
    }),
    getCategoriesByBranch: builder.query<Category[], string>({
      query: (branchId) => `/categories/branch/${branchId}`,
      providesTags: ['Category'],
    }),
    createCategory: builder.mutation<Category, CreateCategoryRequest>({
      query: (data) => ({
        url: '/categories',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['Category'],
    }),
    updateCategory: builder.mutation<Category, UpdateCategoryRequest>({
      query: ({ id, ...data }) => ({
        url: `/categories/${id}`,
        method: 'PATCH',
        body: data,
      }),
      invalidatesTags: ['Category'],
    }),
    updateCategorySortOrder: builder.mutation<Category, { id: string; sortOrder: number }>({
      query: ({ id, sortOrder }) => ({
        url: `/categories/${id}/sort-order`,
        method: 'PATCH',
        body: { sortOrder },
      }),
      invalidatesTags: ['Category'],
    }),
    deleteCategory: builder.mutation<void, string>({
      query: (id) => ({
        url: `/categories/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Category'],
    }),
  }),
});

export const {
  useGetCategoriesQuery,
  useGetCategoryByIdQuery,
  useGetCategoriesByCompanyQuery,
  useGetCategoriesByBranchQuery,
  useCreateCategoryMutation,
  useUpdateCategoryMutation,
  useUpdateCategorySortOrderMutation,
  useDeleteCategoryMutation,
} = categoriesApi;

