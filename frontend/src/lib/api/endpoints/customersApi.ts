import { apiSlice } from '../apiSlice';

export interface Customer {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  phoneNumber?: string;
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
  phone?: string;
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
  overrideExisting: true,
  endpoints: (builder) => ({
    getCustomers: builder.query<{ customers: Customer[]; total: number }, any>({
      query: (params) => {
        // Filter out undefined values to ensure stable cache keys
        const cleanParams: any = {};
        Object.keys(params || {}).forEach(key => {
          if (params[key] !== undefined && params[key] !== null && params[key] !== '') {
            cleanParams[key] = params[key];
          }
        });
        return {
          url: '/customers',
          params: cleanParams,
        };
      },
      transformResponse: (response: any) => {
        const data = response.data || response;
        const customers = data.customers || data.items || (Array.isArray(data) ? data : []);
        return {
          customers: Array.isArray(customers) ? customers : [],
          total: data.total || (Array.isArray(customers) ? customers.length : 0),
        };
      },
      providesTags: (result) => 
        result 
          ? [{ type: 'Customer' as const, id: 'LIST' }, ...(result.customers || []).map(({ id }) => ({ type: 'Customer' as const, id }))]
          : [{ type: 'Customer' as const, id: 'LIST' }],
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
          phone: data.phone || data.phoneNumber || '',
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
      providesTags: (result, error, id) => [
        { type: 'Customer', id },
        { type: 'Customer', id: 'LIST' },
        'Customer',
      ],
    }),
    createCustomer: builder.mutation<Customer, CreateCustomerRequest>({
      query: (data) => ({
        url: '/customers',
        method: 'POST',
        body: {
          ...data,
          phone: data.phone || (data as any).phoneNumber,
        },
      }),
      transformResponse: (response: any) => {
        const data = response.data || response;
        return {
          id: data._id || data.id,
          firstName: data.firstName || '',
          lastName: data.lastName || '',
          email: data.email || '',
          phone: data.phone || data.phoneNumber || '',
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
      invalidatesTags: () => [
        { type: 'Customer', id: 'LIST' },
        'Customer', // Invalidate all customer queries
      ],
      async onQueryStarted(_arg, { dispatch, queryFulfilled }) {
        try {
          await queryFulfilled;
          // Force invalidation of all customer list queries
          dispatch(
            customersApi.util.invalidateTags([
              { type: 'Customer', id: 'LIST' },
              'Customer',
            ])
          );
        } catch {
          // Ignore errors
        }
      },
    }),
    updateCustomer: builder.mutation<Customer, UpdateCustomerRequest>({
      query: ({ id, ...data }) => ({
        url: `/customers/${id}`,
        method: 'PATCH',
        body: {
          ...data,
          phone: data.phone || (data as any).phoneNumber,
        },
      }),
      invalidatesTags: (result, error, { id }) => [
        { type: 'Customer', id }, 
        { type: 'Customer', id: 'LIST' },
        'Customer'
      ],
    }),
    deleteCustomer: builder.mutation<void, string>({
      query: (id) => ({
        url: `/customers/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: (result, error, id) => [
        { type: 'Customer', id }, 
        { type: 'Customer', id: 'LIST' },
        'Customer'
      ],
    }),
    getCustomerOrders: builder.query<{ orders: CustomerOrder[]; total: number }, string>({
      query: (customerId) => `/customers/${customerId}/orders`,
      transformResponse: (response: any) => {
        const data = response.data || response;
        return {
          orders: data.orders || data.items || (Array.isArray(data) ? data : []),
          total: data.total || (Array.isArray(data.orders || data.items || data) ? (data.orders || data.items || data).length : 0),
        };
      },
      providesTags: (result, error, customerId) => [
        { type: 'Customer', id: customerId },
        { type: 'Order', id: 'LIST' },
        'Customer',
        'Order',
      ],
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
      invalidatesTags: (result, error, { customerId }) => [
        { type: 'Customer', id: customerId },
        { type: 'Customer', id: 'LIST' },
        'Customer'
      ],
    }),
    searchCustomers: builder.query<Customer[], { query: string; branchId?: string; companyId?: string }>({
      query: (params) => {
        const cleanParams: any = {
          q: params.query,
        };
        if (params.companyId) cleanParams.companyId = params.companyId;
        if (params.branchId) cleanParams.branchId = params.branchId;
        return {
          url: '/customers/search',
          params: cleanParams,
        };
      },
      transformResponse: (response: any) => {
        const data = response.data || response;
        const customers = Array.isArray(data) ? data : (data.customers || data.items || []);
        return customers.map((customer: any) => ({
          id: customer._id || customer.id,
          firstName: customer.firstName || '',
          lastName: customer.lastName || '',
          email: customer.email || '',
          phoneNumber: customer.phone || customer.phoneNumber || '',
          dateOfBirth: customer.dateOfBirth,
          address: customer.address,
          loyaltyPoints: customer.loyaltyPoints || 0,
          tier: customer.loyaltyTier || customer.tier || 'bronze',
          totalOrders: customer.totalOrders || 0,
          totalSpent: customer.totalSpent || 0,
          lastOrderDate: customer.lastOrderDate,
          preferences: customer.preferences,
          notes: customer.notes,
          isActive: customer.isActive !== undefined ? customer.isActive : true,
          createdAt: customer.createdAt || new Date().toISOString(),
          updatedAt: customer.updatedAt || new Date().toISOString(),
        } as Customer));
      },
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
