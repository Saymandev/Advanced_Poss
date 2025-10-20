import { apiSlice } from '@/lib/api/apiSlice';

export interface Branch { id: string; name: string; address?: any; isActive?: boolean }

export const branchesApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    listBranches: builder.query<Branch[] | { data: Branch[] }, void>({ query: () => '/branches', providesTags: ['Branches'] }),
    getBranch: builder.query<Branch, string>({ query: (id) => `/branches/${id}`, providesTags: (_r,_e,id)=>[{ type:'Branches', id } as any] }),
    createBranch: builder.mutation<Branch, Partial<Branch>>({ query: (body) => ({ url: '/branches', method: 'POST', body }), invalidatesTags: ['Branches'] }),
    updateBranch: builder.mutation<Branch, { id: string; changes: Partial<Branch> }>({ query: ({ id, changes }) => ({ url: `/branches/${id}`, method: 'PUT', body: changes }), invalidatesTags: (_r,_e,arg)=>[{ type:'Branches', id: arg.id } as any] }),
    deleteBranch: builder.mutation<{ success: boolean }, string>({ query: (id) => ({ url: `/branches/${id}`, method: 'DELETE' }), invalidatesTags: ['Branches'] }),
  }),
})

export const { useListBranchesQuery, useGetBranchQuery, useCreateBranchMutation, useUpdateBranchMutation, useDeleteBranchMutation } = branchesApi


