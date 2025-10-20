import { apiSlice } from '@/lib/api/apiSlice';

export interface User { id: string; email: string; firstName: string; lastName: string; role: string }

export const usersApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    listUsers: builder.query<User[] | { data: User[] }, { page?: number; limit?: number } | void>({ query: (params) => ({ url: '/users', params }), providesTags: ['Users'] }),
    getUser: builder.query<User, string>({ query: (id) => `/users/${id}`, providesTags: (_r,_e,id)=>[{ type:'Users', id } as any] }),
    createUser: builder.mutation<User, Partial<User>>({ query: (body) => ({ url: '/users', method: 'POST', body }), invalidatesTags: ['Users'] }),
    updateUser: builder.mutation<User, { id: string; changes: Partial<User> }>({ query: ({ id, changes }) => ({ url: `/users/${id}`, method: 'PUT', body: changes }), invalidatesTags: (_r,_e,arg)=>[{ type:'Users', id: arg.id } as any] }),
    deleteUser: builder.mutation<{ success: boolean }, string>({ query: (id) => ({ url: `/users/${id}`, method: 'DELETE' }), invalidatesTags: ['Users'] }),
    toggleUserStatus: builder.mutation<User, string>({ query: (id) => ({ url: `/users/${id}/status`, method: 'PATCH' }), invalidatesTags: (_r,_e,id)=>[{ type:'Users', id } as any] }),
    changeUserRole: builder.mutation<User, { id: string; role: string }>({ query: ({ id, role }) => ({ url: `/users/${id}/role`, method: 'PATCH', body: { role } }), invalidatesTags: (_r,_e,arg)=>[{ type:'Users', id: arg.id } as any] }),
    getProfile: builder.query<User, void>({ query: () => '/users/profile', providesTags: ['Users'] }),
    updateProfile: builder.mutation<User, Partial<User>>({ query: (body) => ({ url: '/users/profile', method: 'PUT', body }), invalidatesTags: ['Users'] }),
  }),
})

export const { useListUsersQuery, useGetUserQuery, useCreateUserMutation, useUpdateUserMutation, useDeleteUserMutation, useToggleUserStatusMutation, useChangeUserRoleMutation, useGetProfileQuery, useUpdateProfileMutation } = usersApi


