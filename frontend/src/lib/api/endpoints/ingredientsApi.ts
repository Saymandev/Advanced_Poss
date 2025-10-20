import { apiSlice } from '@/lib/api/apiSlice';

export interface Ingredient { id: string; name: string; stock?: number; lowStockThreshold?: number }

export const ingredientsApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    listIngredients: builder.query<Ingredient[] | { data: Ingredient[] }, void>({ query: () => '/ingredients', providesTags: ['Ingredients'] }),
    getIngredient: builder.query<Ingredient, string>({ query: (id) => `/ingredients/${id}`, providesTags: (_r,_e,id)=>[{ type:'Ingredients', id } as any] }),
    createIngredient: builder.mutation<Ingredient, Partial<Ingredient>>({ query: (body) => ({ url: '/ingredients', method: 'POST', body }), invalidatesTags: ['Ingredients'] }),
    updateIngredient: builder.mutation<Ingredient, { id: string; changes: Partial<Ingredient> }>({ query: ({ id, changes }) => ({ url: `/ingredients/${id}`, method: 'PUT', body: changes }), invalidatesTags: (_r,_e,arg)=>[{ type:'Ingredients', id: arg.id } as any] }),
    deleteIngredient: builder.mutation<{ success: boolean }, string>({ query: (id) => ({ url: `/ingredients/${id}`, method: 'DELETE' }), invalidatesTags: ['Ingredients'] }),
    updateStock: builder.mutation<Ingredient, { id: string; stock: number }>({ query: ({ id, stock }) => ({ url: `/ingredients/${id}/stock`, method: 'PATCH', body: { stock } }), invalidatesTags: (_r,_e,arg)=>[{ type:'Ingredients', id: arg.id } as any] }),
  }),
})

export const { useListIngredientsQuery, useGetIngredientQuery, useCreateIngredientMutation, useUpdateIngredientMutation, useDeleteIngredientMutation, useUpdateStockMutation } = ingredientsApi


