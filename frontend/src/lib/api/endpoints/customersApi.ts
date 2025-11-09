import { apiSlice } from '../apiSlice';

export interface Customer {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  dateOfBirth?: string;
  address?: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  };
  loyaltyPoints: number;
  tier: 'bronze' | 'silver' | 'gold' | 'platinum';
  totalOrders: number;
  totalSpent: number;
  lastOrderDate?: string;
  preferences?: {
    dietaryRestrictions: string[];
    favoriteItems: string[];
    allergies: string[];
  };
  notes?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCustomerRequest {
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  dateOfBirth?: string;
  address?: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  };
  preferences?: {
    dietaryRestrictions: string[];
    favoriteItems: string[];
    allergies: string[];
  };
  notes?: string;
}

export interface UpdateCustomerRequest extends Partial<CreateCustomerRequest> {
  id: string;
}

export interface CustomerOrder {
  id: string;
  orderNumber: string;
  total: number;
  status: string;
  items: Array<{
    name: string;
    quantity: number;
    price: number;
  }>;
  createdAt: string;
}

export interface LoyaltyTransaction {
  id: string;
  type: 'earned' | 'redeemed' | 'expired' | 'adjusted';
  points: number;
  description: string;
  orderId?: string;
  createdAt: string;
}

export const customersApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getCustomers: builder.query<{ customers: Customer[]; total: number }, any>({
      query: (params) => ({
        url: '/customers',
        params,
      }),
      transformResponse: (response: any) => {
        const data = response.data || response;
        return {
          customers: data.customers || data.items || data || [],
          total: data.total || (Array.isArray(data) ? data.length : 0),
        };
      },
      providesTags: ['Customer'],
    }),
    getCustomerById: builder.query<Customer, string>({
      query: (id) => `/customers/${id}`,
      transformResponse: (response: any) => {
        const data = response.data || response;
        return {
          id: data._id || data.id,
          firstName: data.firstName || '',
          lastName: data.lastName || '',
          email: data.email || '',
          phoneNumber: data.phone || data.phoneNumber || '',
          dateOfBirth: data.dateOfBirth,
          address: data.address,
          loyaltyPoints: data.loyaltyPoints || 0,
          tier: data.loyaltyTier || data.tier || 'bronze',
          totalOrders: data.totalOrders || 0,
          totalSpent: data.totalSpent || 0,
          lastOrderDate: data.lastOrderDate,
          preferences: data.preferences,
          notes: data.notes,
          isActive: data.isActive !== undefined ? data.isActive : true,
          createdAt: data.createdAt || new Date().toISOString(),
          updatedAt: data.updatedAt || new Date().toISOString(),
        } as Customer;
      },
      providesTags: ['Customer'],
    }),
    createCustomer: builder.mutation<Customer, CreateCustomerRequest>({
      query: (data) => ({
        url: '/customers',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['Customer'],
    }),
    updateCustomer: builder.mutation<Customer, UpdateCustomerRequest>({
      query: ({ id, ...data }) => ({
        url: `/customers/${id}`,
        method: 'PATCH',
        body: data,
      }),
      invalidatesTags: ['Customer'],
    }),
    deleteCustomer: builder.mutation<void, string>({
      query: (id) => ({
        url: `/customers/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Customer'],
    }),
    getCustomerOrders: builder.query<{ orders: CustomerOrder[]; total: number }, string>({
      query: (customerId) => `/customers/${customerId}/orders`,
      transformResponse: (response: any) => {
        const data = response.data || response;
        return {
          orders: data.orders || data.items || data || [],
          total: data.total || (Array.isArray(data) ? data.length : 0),
        };
      },
      providesTags: ['Customer', 'Order'],
    }),
    getCustomerLoyaltyHistory: builder.query<{ transactions: LoyaltyTransaction[]; total: number }, string>({
      query: (customerId) => `/customers/${customerId}/loyalty`,
      transformResponse: (response: any) => {
        const data = response.data || response;
        return {
          transactions: data.transactions || data.items || data || [],
          total: data.total || (Array.isArray(data) ? data.length : 0),
        };
      },
      providesTags: ['Customer'],
    }),
    updateLoyaltyPoints: builder.mutation<Customer, { 
      customerId: string; 
      points: number; 
      type: 'add' | 'subtract'; 
      description: string 
    }>({
      query: ({ customerId, ...data }) => ({
        url: `/customers/${customerId}/loyalty`,
        method: 'PATCH',
        body: data,
      }),
      invalidatesTags: ['Customer'],
    }),
    searchCustomers: builder.query<Customer[], { query: string; branchId?: string }>({
      query: (params) => ({
        url: '/customers/search',
        params,
      }),
    }),
  }),
});

export const {
  useGetCustomersQuery,
  useGetCustomerByIdQuery,
  useCreateCustomerMutation,
  useUpdateCustomerMutation,
  useDeleteCustomerMutation,
  useGetCustomerOrdersQuery,
  useGetCustomerLoyaltyHistoryQuery,
  useUpdateLoyaltyPointsMutation,
  useSearchCustomersQuery,
  useLazySearchCustomersQuery,
} = customersApi;
