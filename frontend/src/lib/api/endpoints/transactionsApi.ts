import { apiSlice } from '../apiSlice';

export interface Transaction {
  id: string;
  companyId: string;
  branchId: string;
  transactionNumber: string;
  paymentMethodId: any; // Can be string or populated object
  type: 'IN' | 'OUT';
  category: 'SALE' | 'EXPENSE' | 'PURCHASE' | 'REFUND' | 'PROFIT_WITHDRAWAL' | 'CAPITAL_INJECTION' | 'TRANSFER' | 'OTHER';
  amount: number;
  date: string;
  referenceId?: string;
  referenceModel?: string;
  description?: string;
  notes?: string;
  balanceAfter: number;
  createdBy: any;
  createdAt: string;
  updatedAt: string;
}

export interface AccountBalance {
  _id: string;
  name: string;
  type: string;
  code: string;
  currentBalance: number;
}

export interface TransactionsResponse {
  transactions: Transaction[];
  total: number;
  page: number;
  limit: number;
}

export interface GetTransactionsArgs {
  page?: number;
  limit?: number;
  paymentMethodId?: string;
  type?: string;
  category?: string;
  startDate?: string;
  endDate?: string;
}

export const transactionsApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getTransactions: builder.query<TransactionsResponse, GetTransactionsArgs>({
      query: (params) => ({
        url: '/transactions',
        params,
      }),
      providesTags: ['Transactions'] as any,
      transformResponse: (response: any) => response.data || response,
    }),

    getTransactionById: builder.query<Transaction, string>({
      query: (id) => `/transactions/${id}`,
      providesTags: ((result: any, error: any, id: string) => [{ type: 'Transactions', id }]) as any,
      transformResponse: (response: any) => response.data || response,
    }),

    getAccountBalances: builder.query<AccountBalance[], void>({
      query: () => '/transactions/balances',
      providesTags: ['Transactions', 'PaymentMethods'] as any,
      transformResponse: (response: any) => response.data || response,
    }),

    withdrawProfit: builder.mutation<Transaction, { paymentMethodId: string; amount: number; notes: string }>({
      query: (body) => ({
        url: '/transactions/withdraw-profit',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Transactions', 'PaymentMethods'] as any,
      transformResponse: (response: any) => response.data || response,
    }),
  }),
});

export const {
  useGetTransactionsQuery,
  useGetTransactionByIdQuery,
  useGetAccountBalancesQuery,
  useWithdrawProfitMutation,
} = transactionsApi;
