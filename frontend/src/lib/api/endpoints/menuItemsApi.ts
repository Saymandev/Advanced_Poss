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
      transformResponse: (response: any) => {
        const data = response.data || response;
        let items = [];
        
        // Handle array response
        if (Array.isArray(data)) {
          items = data;
        } else if (data.menuItems) {
          items = data.menuItems;
        } else if (data.items) {
          items = data.items;
        }
        
        return {
          menuItems: items.map((item: any) => ({
            id: item._id || item.id,
            name: item.name,
            description: item.description,
            price: item.price || 0,
            category: item.categoryId || item.category || '',
            isAvailable: item.isAvailable !== undefined ? item.isAvailable : true,
            imageUrl: item.imageUrl || item.image,
            ingredients: item.ingredients || [],
            allergens: item.allergens || [],
            preparationTime: item.preparationTime,
            calories: item.calories,
            createdAt: item.createdAt || new Date().toISOString(),
            updatedAt: item.updatedAt || new Date().toISOString(),
          })) as MenuItem[],
          total: data.total || items.length,
          page: data.page || 1,
          limit: data.limit || items.length,
        };
      },
      providesTags: ['MenuItem'],
    }),
    getMenuItemById: builder.query<MenuItem, string>({
      query: (id) => `/menu-items/${id}`,
      transformResponse: (response: any) => {
        const item = response.data || response;
        return {
          id: item._id || item.id,
          name: item.name,
          description: item.description,
          price: item.price || 0,
          category: item.categoryId || item.category || '',
          isAvailable: item.isAvailable !== undefined ? item.isAvailable : true,
          imageUrl: item.imageUrl || item.image,
          ingredients: item.ingredients || [],
          allergens: item.allergens || [],
          preparationTime: item.preparationTime,
          calories: item.calories,
          createdAt: item.createdAt || new Date().toISOString(),
          updatedAt: item.updatedAt || new Date().toISOString(),
        } as MenuItem;
      },
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