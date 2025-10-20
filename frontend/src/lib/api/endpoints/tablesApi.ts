import { apiSlice } from '@/lib/api/apiSlice';

export interface Table { id: string; name: string; status?: string }

export const tablesApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    listTables: builder.query<Table[] | { data: Table[] }, void>({ query: () => '/tables', providesTags: ['Tables'] }),
    getTable: builder.query<Table, string>({ query: (id) => `/tables/${id}`, providesTags: (_r,_e,id)=>[{ type:'Tables', id } as any] }),
    createTable: builder.mutation<Table, Partial<Table>>({ query: (body) => ({ url: '/tables', method: 'POST', body }), invalidatesTags: ['Tables'] }),
    updateTable: builder.mutation<Table, { id: string; changes: Partial<Table> }>({ query: ({ id, changes }) => ({ url: `/tables/${id}`, method: 'PUT', body: changes }), invalidatesTags: (_r,_e,arg)=>[{ type:'Tables', id: arg.id } as any] }),
    deleteTable: builder.mutation<{ success: boolean }, string>({ query: (id) => ({ url: `/tables/${id}`, method: 'DELETE' }), invalidatesTags: ['Tables'] }),
    reserveTable: builder.mutation<Table, { id: string; data?: any }>({ query: ({ id, data }) => ({ url: `/tables/${id}/reserve`, method: 'POST', body: data }), invalidatesTags: (_r,_e,arg)=>[{ type:'Tables', id: arg.id } as any] }),
    updateTableStatus: builder.mutation<Table, { id: string; status: string }>({ query: ({ id, status }) => ({ url: `/tables/${id}/status`, method: 'PATCH', body: { status } }), invalidatesTags: (_r,_e,arg)=>[{ type:'Tables', id: arg.id } as any] }),
  }),
})

export const { useListTablesQuery, useGetTableQuery, useCreateTableMutation, useUpdateTableMutation, useDeleteTableMutation, useReserveTableMutation, useUpdateTableStatusMutation } = tablesApi


