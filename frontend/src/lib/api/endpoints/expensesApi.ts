import { apiSlice } from '../apiSlice';

export interface Expense {
  id: string;
  title: string;
  description?: string;
  amount: number;
  category: 'food' | 'supplies' | 'utilities' | 'rent' | 'staff' | 'marketing' | 'maintenance' | 'other';
  paymentMethod: 'cash' | 'card' | 'bank_transfer' | 'check';
  vendor?: string;
  receiptUrl?: string;
  date: string;
  isRecurring: boolean;
  recurringFrequency?: 'daily' | 'weekly' | 'monthly' | 'yearly';
  approvedBy?: string;
  status: 'pending' | 'approved' | 'rejected';
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateExpenseRequest {
  title: string;
  description?: string;
  amount: number;
  category: 'food' | 'supplies' | 'utilities' | 'rent' | 'staff' | 'marketing' | 'maintenance' | 'other';
  paymentMethod: 'cash' | 'card' | 'bank_transfer' | 'check';
  vendor?: string;
  receiptUrl?: string;
  date: string;
  isRecurring?: boolean;
  recurringFrequency?: 'daily' | 'weekly' | 'monthly' | 'yearly';
  notes?: string;
}

export interface UpdateExpenseRequest extends Partial<CreateExpenseRequest> {
  id: string;
}

export interface ExpenseCategory {
  name: string;
  totalAmount: number;
  count: number;
  percentage: number;
}

export interface ExpenseSummary {
  totalExpenses: number;
  thisMonth: number;
  lastMonth: number;
  changePercentage: number;
  categories: ExpenseCategory[];
  topVendors: Array<{
    vendor: string;
    totalAmount: number;
    count: number;
  }>;
}

export const expensesApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getExpenses: builder.query<{ expenses: Expense[]; total: number }, any>({
      query: (params) => ({
        url: '/expenses',
        params,
      }),
      providesTags: ['Expense'],
    }),
    getExpenseById: builder.query<Expense, string>({
      query: (id) => `/expenses/${id}`,
      providesTags: ['Expense'],
    }),
    createExpense: builder.mutation<Expense, CreateExpenseRequest>({
      query: (data) => ({
        url: '/expenses',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['Expense'],
    }),
    updateExpense: builder.mutation<Expense, UpdateExpenseRequest>({
      query: ({ id, ...data }) => ({
        url: `/expenses/${id}`,
        method: 'PATCH',
        body: data,
      }),
      invalidatesTags: ['Expense'],
    }),
    deleteExpense: builder.mutation<void, string>({
      query: (id) => ({
        url: `/expenses/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Expense'],
    }),
    approveExpense: builder.mutation<Expense, { id: string; approved: boolean; notes?: string }>({
      query: ({ id, ...data }) => ({
        url: `/expenses/${id}/approve`,
        method: 'PATCH',
        body: data,
      }),
      invalidatesTags: ['Expense'],
    }),
    getExpenseSummary: builder.query<ExpenseSummary, { 
      branchId?: string; 
      startDate?: string; 
      endDate?: string 
    }>({
      query: (params) => ({
        url: '/expenses/summary',
        params,
      }),
      providesTags: ['Expense'],
    }),
    uploadReceipt: builder.mutation<{ receiptUrl: string }, { expenseId: string; file: File }>({
      query: ({ expenseId, file }) => {
        const formData = new FormData();
        formData.append('receipt', file);
        return {
          url: `/expenses/${expenseId}/receipt`,
          method: 'POST',
          body: formData,
        };
      },
      invalidatesTags: ['Expense'],
    }),
  }),
});

export const {
  useGetExpensesQuery,
  useGetExpenseByIdQuery,
  useCreateExpenseMutation,
  useUpdateExpenseMutation,
  useDeleteExpenseMutation,
  useApproveExpenseMutation,
  useGetExpenseSummaryQuery,
  useUploadReceiptMutation,
} = expensesApi;
