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
          menuItems: items.map((item: any) => {
            // Extract category - handle both object and string/ID formats
            let categoryValue = '';
            if (item.categoryId) {
              // If categoryId is an object (populated), extract the name or ID
              if (typeof item.categoryId === 'object' && item.categoryId !== null) {
                categoryValue = item.categoryId.name || item.categoryId._id || item.categoryId.id || '';
              } else {
                // If categoryId is a string/ID, use it directly
                categoryValue = item.categoryId;
              }
            } else if (item.category) {
              // If category is an object (populated), extract the name or ID
              if (typeof item.category === 'object' && item.category !== null) {
                categoryValue = item.category.name || item.category._id || item.category.id || '';
              } else {
                // If category is a string/ID, use it directly
                categoryValue = item.category;
              }
            }
            
            // Extract categoryId - ensure it's always a string
            let categoryIdValue: string = '';
            if (item.categoryId) {
              if (typeof item.categoryId === 'object' && item.categoryId !== null) {
                categoryIdValue = item.categoryId._id || item.categoryId.id || '';
              } else {
                categoryIdValue = String(item.categoryId);
              }
            }
            
            // Extract category name for display
            // categoryValue is already a string (converted above), so use it directly
            const categoryName: string = typeof categoryValue === 'string' ? categoryValue : 'Uncategorized';
            
            // Handle ingredients - preserve structure if objects, convert to array
            let ingredientsArray: any[] = [];
            if (item.ingredients && Array.isArray(item.ingredients)) {
              ingredientsArray = item.ingredients;
            }
            
            // Handle allergens - extract from nutrition object if present
            let allergensArray: string[] = [];
            if (item.allergens && Array.isArray(item.allergens)) {
              allergensArray = item.allergens;
            } else if (item.nutrition && item.nutrition.allergens && Array.isArray(item.nutrition.allergens)) {
              allergensArray = item.nutrition.allergens;
            }
            
            // Handle nutrition object
            const nutrition = item.nutrition || (item.nutritionalInfo ? {
              calories: item.nutritionalInfo.calories,
              protein: item.nutritionalInfo.protein,
              carbs: item.nutritionalInfo.carbs,
              fat: item.nutritionalInfo.fat,
              allergens: item.nutritionalInfo.allergens,
            } : undefined);
            
            return {
              id: item._id || item.id,
              name: item.name,
              description: item.description || '',
              price: item.price || 0,
              category: categoryName,
              categoryId: categoryIdValue,
              categoryObject: typeof item.category === 'object' ? item.category : (typeof item.categoryId === 'object' ? item.categoryId : null),
              isAvailable: item.isAvailable !== undefined ? item.isAvailable : true,
              imageUrl: item.imageUrl || item.image || (item.images && item.images.length > 0 ? item.images[0] : undefined),
              images: item.images || [],
              ingredients: ingredientsArray,
              allergens: allergensArray,
              preparationTime: item.preparationTime,
              nutritionalInfo: nutrition,
              tags: item.tags || [],
              popularity: item.popularity || item.averageRating || 4.0,
              createdAt: item.createdAt || new Date().toISOString(),
              updatedAt: item.updatedAt || new Date().toISOString(),
            };
          }) as any[],
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
        
        // Extract category - handle both object and string/ID formats
        let categoryValue = '';
        if (item.categoryId) {
          if (typeof item.categoryId === 'object' && item.categoryId !== null) {
            categoryValue = item.categoryId.name || item.categoryId._id || item.categoryId.id || '';
          } else {
            categoryValue = item.categoryId;
          }
        } else if (item.category) {
          if (typeof item.category === 'object' && item.category !== null) {
            categoryValue = item.category.name || item.category._id || item.category.id || '';
          } else {
            categoryValue = item.category;
          }
        }
        
        return {
          id: item._id || item.id,
          name: item.name,
          description: item.description,
          price: item.price || 0,
          category: categoryValue,
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
    uploadMenuImages: builder.mutation<
      { success: boolean; images: Array<{ url: string; publicId: string; width: number; height: number }> },
      FormData
    >({
      query: (formData) => ({
        url: '/menu-items/upload-images',
        method: 'POST',
        body: formData,
        // Don't set Content-Type header - browser will set it with boundary for multipart/form-data
        prepareHeaders: (headers: Headers) => {
          // Remove Content-Type to let browser set it with boundary
          headers.delete('Content-Type');
          return headers;
        },
      }),
    }),
    createMenuItem: builder.mutation<MenuItem, CreateMenuItemRequest>({
      query: (data) => ({
        url: '/menu-items',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: () => [
        { type: 'MenuItem', id: 'LIST' },
        'MenuItem',
      ],
      // Force refetch by invalidating all menu item queries
      async onQueryStarted(_arg, { dispatch, queryFulfilled }) {
        try {
          await queryFulfilled;
          // Invalidate all menu item list queries
          dispatch(
            menuItemsApi.util.invalidateTags([
              { type: 'MenuItem', id: 'LIST' },
              'MenuItem',
            ]),
          );
        } catch {
          // Ignore errors
        }
      },
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
  useUploadMenuImagesMutation,
} = menuItemsApi;