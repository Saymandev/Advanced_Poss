import { apiSlice } from '../apiSlice';

export interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  isAvailable: boolean;
  imageUrl?: string;
  ingredients?: string[];
  allergens?: string[];
  preparationTime?: number;
  calories?: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateMenuItemRequest {
  name: string;
  description: string;
  price: number;
  category: string;
  isAvailable?: boolean;
  imageUrl?: string;
  ingredients?: string[];
  allergens?: string[];
  preparationTime?: number;
  calories?: number;
}

export interface UpdateMenuItemRequest extends Partial<CreateMenuItemRequest> {
  id: string;
}

export const menuItemsApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getMenuItems: builder.query<{ menuItems: MenuItem[]; total: number; page: number; limit: number } | { items: MenuItem[]; total: number }, any>({
      query: (params) => ({
        url: '/menu-items',
        params,
      }),
      providesTags: ['MenuItem'],
    }),
    getMenuItemById: builder.query<MenuItem, string>({
      query: (id) => `/menu-items/${id}`,
      providesTags: ['MenuItem'],
    }),
    createMenuItem: builder.mutation<MenuItem, CreateMenuItemRequest>({
      query: (data) => ({
        url: '/menu-items',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['MenuItem'],
    }),
    updateMenuItem: builder.mutation<MenuItem, UpdateMenuItemRequest>({
      query: ({ id, ...data }) => ({
        url: `/menu-items/${id}`,
        method: 'PATCH',
        body: data,
      }),
      invalidatesTags: ['MenuItem'],
    }),
    deleteMenuItem: builder.mutation<void, string>({
      query: (id) => ({
        url: `/menu-items/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['MenuItem'],
    }),
    toggleAvailability: builder.mutation<MenuItem, { id: string; isAvailable: boolean }>({
      query: ({ id, isAvailable }) => ({
        url: `/menu-items/${id}/availability`,
        method: 'PATCH',
        body: { isAvailable },
      }),
      invalidatesTags: ['MenuItem'],
    }),
  }),
});

export const {
  useGetMenuItemsQuery,
  useGetMenuItemByIdQuery,
  useCreateMenuItemMutation,
  useUpdateMenuItemMutation,
  useDeleteMenuItemMutation,
  useToggleAvailabilityMutation,
} = menuItemsApi;