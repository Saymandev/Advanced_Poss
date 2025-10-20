import { apiSlice } from '@/lib/api/apiSlice';

export interface Customer { id: string; name: string; email?: string; phone?: string }

export const customersApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    listCustomers: builder.query<Customer[] | { data: Customer[] }, void>({ query: () => '/customers', providesTags: ['Customers'] }),
    getCustomer: builder.query<Customer, string>({ query: (id) => `/customers/${id}`, providesTags: (_r,_e,id)=>[{ type:'Customers', id } as any] }),
    createCustomer: builder.mutation<Customer, Partial<Customer>>({ query: (body) => ({ url: '/customers', method: 'POST', body }), invalidatesTags: ['Customers'] }),
    updateCustomer: builder.mutation<Customer, { id: string; changes: Partial<Customer> }>({ query: ({ id, changes }) => ({ url: `/customers/${id}`, method: 'PUT', body: changes }), invalidatesTags: (_r,_e,arg)=>[{ type:'Customers', id: arg.id } as any] }),
    deleteCustomer: builder.mutation<{ success: boolean }, string>({ query: (id) => ({ url: `/customers/${id}`, method: 'DELETE' }), invalidatesTags: ['Customers'] }),
    customerOrders: builder.query<any, string>({ query: (id) => `/customers/${id}/orders`, providesTags: ['Customers'] }),
    customerLoyalty: builder.query<any, string>({ query: (id) => `/customers/${id}/loyalty`, providesTags: ['Customers'] }),
  }),
})

export const { useListCustomersQuery, useGetCustomerQuery, useCreateCustomerMutation, useUpdateCustomerMutation, useDeleteCustomerMutation, useCustomerOrdersQuery, useCustomerLoyaltyQuery } = customersApi


