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
  menuItemsCount?: number;
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
      transformResponse: (response: any) => {
        const data = response.data || response;
        let items = [];
        
        // Handle array response
        if (Array.isArray(data)) {
          items = data;
        } else if (data.categories) {
          items = data.categories;
        } else if (data.items) {
          items = data.items;
        }
        
        return {
          categories: items.map((cat: any) => ({
            id: cat._id || cat.id,
            name: cat.name,
            description: cat.description,
            icon: cat.icon,
            color: cat.color,
            sortOrder: cat.sortOrder,
            isActive: cat.isActive !== undefined ? cat.isActive : true,
            type: cat.type,
            companyId: cat.companyId || cat.company?.id || cat.company?._id,
            branchId: cat.branchId || cat.branch?.id || cat.branch?._id,
            menuItemsCount: cat.menuItemsCount !== undefined ? cat.menuItemsCount : 0,
            createdAt: cat.createdAt || new Date().toISOString(),
            updatedAt: cat.updatedAt || new Date().toISOString(),
          })) as Category[],
          total: data.total || items.length,
        };
      },
      providesTags: (result) =>
        result?.categories
          ? [
              ...result.categories.map(({ id }) => ({ type: 'Category' as const, id })),
              'Category',
            ]
          : ['Category'],
    }),
    getCategoryById: builder.query<Category, string>({
      query: (id) => `/categories/${id}`,
      transformResponse: (response: any) => {
        const cat = response.data || response;
        return {
          id: cat._id || cat.id,
          name: cat.name,
          description: cat.description,
          icon: cat.icon,
          color: cat.color,
          sortOrder: cat.sortOrder,
          isActive: cat.isActive !== undefined ? cat.isActive : true,
          type: cat.type,
          companyId: cat.companyId || cat.company?.id || cat.company?._id,
          branchId: cat.branchId || cat.branch?.id || cat.branch?._id,
          menuItemsCount: cat.menuItemsCount !== undefined ? cat.menuItemsCount : 0,
          createdAt: cat.createdAt || new Date().toISOString(),
          updatedAt: cat.updatedAt || new Date().toISOString(),
        } as Category;
      },
      providesTags: ['Category'],
    }),
    getCategoriesByCompany: builder.query<Category[], string>({
      query: (companyId) => `/categories/company/${companyId}`,
      transformResponse: (response: any) => {
        const data = response.data || response;
        const items = Array.isArray(data) ? data : (data.categories || data.items || []);
        return items.map((cat: any) => ({
          id: cat._id || cat.id,
          name: cat.name,
          description: cat.description,
          icon: cat.icon,
          color: cat.color,
          sortOrder: cat.sortOrder,
          isActive: cat.isActive !== undefined ? cat.isActive : true,
          type: cat.type,
          companyId: cat.companyId || cat.company?.id || cat.company?._id,
          branchId: cat.branchId || cat.branch?.id || cat.branch?._id,
          menuItemsCount: cat.menuItemsCount !== undefined ? cat.menuItemsCount : 0,
          createdAt: cat.createdAt || new Date().toISOString(),
          updatedAt: cat.updatedAt || new Date().toISOString(),
        })) as Category[];
      },
      providesTags: ['Category'],
    }),
    getCategoriesByBranch: builder.query<Category[], string>({
      query: (branchId) => `/categories/branch/${branchId}`,
      transformResponse: (response: any) => {
        // Handle wrapped response from TransformInterceptor: { success: true, data: [...] }
        // or direct response: [...]
        let data: any;
        
        if (response && typeof response === 'object') {
          if (response.success && response.data) {
            // Wrapped response: { success: true, data: [...] }
            data = response.data;
          } else if (response.data) {
            // Has data property
            data = response.data;
          } else {
            // Direct response
            data = response;
          }
        } else {
          data = response;
        }
        
        // Extract items array
        let items: any[] = [];
        if (Array.isArray(data)) {
          items = data;
        } else if (data && typeof data === 'object') {
          if (Array.isArray(data.categories)) {
            items = data.categories;
          } else if (Array.isArray(data.items)) {
            items = data.items;
          }
        }
        
        // Map to Category format
        return items.map((cat: any) => ({
          id: cat._id || cat.id,
          name: cat.name,
          description: cat.description,
          icon: cat.icon,
          color: cat.color,
          sortOrder: cat.sortOrder,
          isActive: cat.isActive !== undefined ? cat.isActive : true,
          type: cat.type,
          companyId: cat.companyId || cat.company?.id || cat.company?._id,
          branchId: cat.branchId || cat.branch?.id || cat.branch?._id,
          menuItemsCount: cat.menuItemsCount !== undefined ? cat.menuItemsCount : 0,
          createdAt: cat.createdAt || new Date().toISOString(),
          updatedAt: cat.updatedAt || new Date().toISOString(),
        })) as Category[];
      },
      providesTags: ['Category'],
    }),
    createCategory: builder.mutation<Category, CreateCategoryRequest>({
      query: (data) => ({
        url: '/categories',
        method: 'POST',
        body: data,
      }),
      transformResponse: (response: any) => {
        const cat = response.data || response;
        return {
          id: cat._id || cat.id,
          name: cat.name,
          description: cat.description,
          icon: cat.icon,
          color: cat.color,
          sortOrder: cat.sortOrder,
          isActive: cat.isActive !== undefined ? cat.isActive : true,
          type: cat.type,
          companyId: cat.companyId || cat.company?.id || cat.company?._id,
          branchId: cat.branchId || cat.branch?.id || cat.branch?._id,
          menuItemsCount: cat.menuItemsCount !== undefined ? cat.menuItemsCount : 0,
          createdAt: cat.createdAt || new Date().toISOString(),
          updatedAt: cat.updatedAt || new Date().toISOString(),
        } as Category;
      },
      invalidatesTags: (result, error) => {
        if (error) return [];
        return ['Category'];
      },
      async onQueryStarted(arg, { dispatch, queryFulfilled }) {
        try {
          await queryFulfilled;
          // Force refetch of categories list
          dispatch(
            categoriesApi.util.invalidateTags(['Category'])
          );
        } catch (error) {
          // Handle error
        }
      },
    }),
    updateCategory: builder.mutation<Category, UpdateCategoryRequest>({
      query: ({ id, ...data }) => ({
        url: `/categories/${id}`,
        method: 'PATCH',
        body: data,
      }),
      transformResponse: (response: any) => {
        const cat = response.data || response;
        return {
          id: cat._id || cat.id,
          name: cat.name,
          description: cat.description,
          icon: cat.icon,
          color: cat.color,
          sortOrder: cat.sortOrder,
          isActive: cat.isActive !== undefined ? cat.isActive : true,
          type: cat.type,
          companyId: cat.companyId || cat.company?.id || cat.company?._id,
          branchId: cat.branchId || cat.branch?.id || cat.branch?._id,
          menuItemsCount: cat.menuItemsCount !== undefined ? cat.menuItemsCount : 0,
          createdAt: cat.createdAt || new Date().toISOString(),
          updatedAt: cat.updatedAt || new Date().toISOString(),
        } as Category;
      },
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
      invalidatesTags: ['Category', 'MenuItem'], // Also invalidate menu items as they reference categories
    }),
    toggleCategoryStatus: builder.mutation<Category, string>({
      query: (id) => ({
        url: `/categories/${id}/toggle-status`,
        method: 'PATCH',
      }),
      transformResponse: (response: any) => {
        const cat = response.data || response;
        return {
          id: cat._id || cat.id,
          name: cat.name,
          description: cat.description,
          icon: cat.icon,
          color: cat.color,
          sortOrder: cat.sortOrder,
          isActive: cat.isActive !== undefined ? cat.isActive : true,
          type: cat.type,
          companyId: cat.companyId || cat.company?.id || cat.company?._id,
          branchId: cat.branchId || cat.branch?.id || cat.branch?._id,
          createdAt: cat.createdAt || new Date().toISOString(),
          updatedAt: cat.updatedAt || new Date().toISOString(),
        } as Category;
      },
      invalidatesTags: (result, error, id) => [
        { type: 'Category', id },
        'Category',
        'MenuItem', // Menu items might filter by active categories
      ],
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
  useToggleCategoryStatusMutation,
} = categoriesApi;

