import { apiSlice } from '@/lib/api/apiSlice';

export interface Company { id: string; name: string; email: string }

export const companiesApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    listCompanies: builder.query<Company[] | { data: Company[] }, void>({ query: () => '/companies', providesTags: ['Companies'] }),
    getCompany: builder.query<Company, string>({ query: (id) => `/companies/${id}`, providesTags: (_r,_e,id)=>[{ type:'Companies', id } as any] }),
    createCompany: builder.mutation<Company, Partial<Company>>({ query: (body) => ({ url: '/companies', method: 'POST', body }), invalidatesTags: ['Companies'] }),
    updateCompany: builder.mutation<Company, { id: string; changes: Partial<Company> }>({ query: ({ id, changes }) => ({ url: `/companies/${id}`, method: 'PUT', body: changes }), invalidatesTags: (_r,_e,arg)=>[{ type:'Companies', id: arg.id } as any] }),
    deleteCompany: builder.mutation<{ success: boolean }, string>({ query: (id) => ({ url: `/companies/${id}`, method: 'DELETE' }), invalidatesTags: ['Companies'] }),
  }),
})

export const { useListCompaniesQuery, useGetCompanyQuery, useCreateCompanyMutation, useUpdateCompanyMutation, useDeleteCompanyMutation } = companiesApi


