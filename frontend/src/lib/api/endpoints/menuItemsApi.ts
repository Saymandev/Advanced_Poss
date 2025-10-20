import { apiSlice } from '@/lib/api/apiSlice'

export interface MenuItem {
  id: string
  name: string
  price: number
  categoryId?: string
  isActive?: boolean
}

export const menuItemsApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    listMenuItems: builder.query<{ data: MenuItem[] } | MenuItem[], { page?: number; limit?: number } | void>({
      query: (params) => ({ url: '/menu-items', params }),
      providesTags: ['MenuItems'],
    }),
    getMenuItem: builder.query<MenuItem, string>({
      query: (id) => `/menu-items/${id}`,
      providesTags: (_r, _e, id) => [{ type: 'MenuItems', id } as any],
    }),
    createMenuItem: builder.mutation<MenuItem, Partial<MenuItem>>({
      query: (body) => ({ url: '/menu-items', method: 'POST', body }),
      invalidatesTags: ['MenuItems'],
    }),
    updateMenuItem: builder.mutation<MenuItem, { id: string; changes: Partial<MenuItem> }>({
      query: ({ id, changes }) => ({ url: `/menu-items/${id}`, method: 'PUT', body: changes }),
      invalidatesTags: (_r, _e, arg) => [{ type: 'MenuItems', id: arg.id } as any],
    }),
    deleteMenuItem: builder.mutation<{ success: boolean }, string>({
      query: (id) => ({ url: `/menu-items/${id}`, method: 'DELETE' }),
      invalidatesTags: ['MenuItems'],
    }),
    toggleMenuItemStatus: builder.mutation<MenuItem, { id: string; isActive: boolean }>({
      query: ({ id, isActive }) => ({ url: `/menu-items/${id}/status`, method: 'PATCH', body: { isActive } }),
      invalidatesTags: (_r, _e, arg) => [{ type: 'MenuItems', id: arg.id } as any],
    }),
  }),
})

export const { useListMenuItemsQuery, useGetMenuItemQuery, useCreateMenuItemMutation, useUpdateMenuItemMutation, useDeleteMenuItemMutation, useToggleMenuItemStatusMutation } = menuItemsApi


