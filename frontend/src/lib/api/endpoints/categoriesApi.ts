import { apiSlice } from '@/lib/api/apiSlice';

export interface Category { id: string; name: string; }

export const categoriesApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    listCategories: builder.query<Category[] | { data: Category[] }, void>({ query: () => '/categories', providesTags: ['Categories'] }),
    getCategory: builder.query<Category, string>({ query: (id) => `/categories/${id}`, providesTags: (_r,_e,id) => [{ type: 'Categories', id } as any] }),
    createCategory: builder.mutation<Category, Partial<Category>>({ query: (body) => ({ url: '/categories', method: 'POST', body }), invalidatesTags: ['Categories'] }),
    updateCategory: builder.mutation<Category, { id: string; changes: Partial<Category> }>({ query: ({ id, changes }) => ({ url: `/categories/${id}`, method: 'PUT', body: changes }), invalidatesTags: (_r,_e,arg)=>[{ type:'Categories', id: arg.id } as any] }),
    deleteCategory: builder.mutation<{ success: boolean }, string>({ query: (id) => ({ url: `/categories/${id}`, method: 'DELETE' }), invalidatesTags: ['Categories'] }),
  }),
})

export const { useListCategoriesQuery, useGetCategoryQuery, useCreateCategoryMutation, useUpdateCategoryMutation, useDeleteCategoryMutation } = categoriesApi


