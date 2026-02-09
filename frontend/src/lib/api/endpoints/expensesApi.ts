import { apiSlice } from '../apiSlice';

export interface Expense {
  id: string;
  expenseNumber?: string;
  title: string;
  description?: string;
  amount: number;
  category: 'ingredient' | 'utility' | 'rent' | 'salary' | 'maintenance' | 'marketing' | 'equipment' | 'transport' | 'other';
  paymentMethod: 'cash' | 'card' | 'bank-transfer' | 'cheque' | 'online' | 'other';
  vendorName?: string;
  vendorPhone?: string;
  invoiceNumber?: string;
  receiptUrl?: string;
  date: string;
  isRecurring: boolean;
  recurringFrequency?: 'daily' | 'weekly' | 'monthly' | 'yearly';
  approvedBy?: string;
  approvedByUser?: { id: string; firstName?: string; lastName?: string; name?: string };
  approvedAt?: string;
  createdBy?: string;
  createdByUser?: { id: string; firstName?: string; lastName?: string; name?: string };
  status: 'pending' | 'approved' | 'rejected' | 'paid';
  notes?: string;
  supplierId?: string;
  purchaseOrderId?: string; // Link to purchase order if created from PO
  createdAt: string;
  updatedAt: string;
}

export interface CreateExpenseRequest {
  companyId: string;
  branchId: string;
  title: string;
  description?: string;
  amount: number;
  category: 'ingredient' | 'utility' | 'rent' | 'salary' | 'maintenance' | 'marketing' | 'equipment' | 'transport' | 'other';
  paymentMethod: 'cash' | 'card' | 'bank-transfer' | 'cheque' | 'online' | 'other';
  vendorName?: string;
  vendorPhone?: string;
  invoiceNumber?: string;
  receiptUrl?: string;
  date: string;
  isRecurring?: boolean;
  recurringFrequency?: 'daily' | 'weekly' | 'monthly' | 'yearly';
  notes?: string;
  supplierId?: string;
  createdBy: string;
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
    getExpenses: builder.query<{ expenses: Expense[]; total: number; page: number; limit: number }, any>({
      query: (params) => ({
        url: '/expenses',
        params,
      }),
      transformResponse: (response: any) => {
        const data = response.data || response;
        let items = [];

        if (Array.isArray(data)) {
          items = data;
        } else if (data.expenses) {
          items = data.expenses;
        } else if (data.items) {
          items = data.items;
        }

        return {
          expenses: items.map((exp: any) => {
            // Helper to extract ID from populated object or string
            const extractId = (value: any): string | undefined => {
              if (!value) return undefined;
              if (typeof value === 'string') return value;
              if (value._id) return typeof value._id === 'string' ? value._id : value._id.toString();
              if (value.id) return typeof value.id === 'string' ? value.id : value.id.toString();
              return undefined;
            };

            // Helper to extract user info from populated object
            const extractUser = (value: any): { id: string; firstName?: string; lastName?: string; name?: string } | undefined => {
              if (!value) return undefined;
              const id = extractId(value);
              if (!id) return undefined;

              if (typeof value === 'object') {
                return {
                  id,
                  firstName: value.firstName,
                  lastName: value.lastName,
                  name: value.name || (value.firstName && value.lastName ? `${value.firstName} ${value.lastName}` : value.firstName || value.lastName || undefined),
                };
              }

              return { id };
            };

            return {
              id: exp._id?.toString() || exp.id?.toString() || '',
              expenseNumber: exp.expenseNumber,
              title: exp.title,
              description: exp.description,
              amount: exp.amount,
              category: exp.category,
              paymentMethod: exp.paymentMethod,
              vendorName: exp.vendorName,
              vendorPhone: exp.vendorPhone,
              invoiceNumber: exp.invoiceNumber,
              receiptUrl: exp.receiptUrl,
              date: exp.date,
              isRecurring: exp.isRecurring || false,
              recurringFrequency: exp.recurringFrequency,
              approvedBy: extractId(exp.approvedBy),
              approvedByUser: extractUser(exp.approvedBy),
              approvedAt: exp.approvedAt,
              createdBy: extractId(exp.createdBy),
              createdByUser: extractUser(exp.createdBy),
              status: exp.status || 'pending',
              notes: exp.notes,
              supplierId: extractId(exp.supplierId),
              purchaseOrderId: exp.purchaseOrderId?._id?.toString() || exp.purchaseOrderId?.toString() || exp.purchaseOrderId,
              createdAt: exp.createdAt || new Date().toISOString(),
              updatedAt: exp.updatedAt || new Date().toISOString(),
            };
          }) as Expense[],
          total: data.total || items.length,
          page: data.page || 1,
          limit: data.limit || 20,
        };
      },
      providesTags: (result) =>
        result?.expenses
          ? [
            ...result.expenses.map(({ id }) => ({ type: 'Expense' as const, id })),
            'Expense',
          ]
          : ['Expense'],
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
      transformResponse: (response: any) => {
        const exp = response.data || response;

        // Helper to extract ID from populated object or string
        const extractId = (value: any): string | undefined => {
          if (!value) return undefined;
          if (typeof value === 'string') return value;
          if (value._id) return typeof value._id === 'string' ? value._id : value._id.toString();
          if (value.id) return typeof value.id === 'string' ? value.id : value.id.toString();
          return undefined;
        };

        // Helper to extract user info from populated object
        const extractUser = (value: any): { id: string; firstName?: string; lastName?: string; name?: string } | undefined => {
          if (!value) return undefined;
          const id = extractId(value);
          if (!id) return undefined;

          if (typeof value === 'object') {
            return {
              id,
              firstName: value.firstName,
              lastName: value.lastName,
              name: value.name || (value.firstName && value.lastName ? `${value.firstName} ${value.lastName}` : value.firstName || value.lastName || undefined),
            };
          }

          return { id };
        };

        return {
          id: exp._id?.toString() || exp.id?.toString() || '',
          expenseNumber: exp.expenseNumber,
          title: exp.title,
          description: exp.description,
          amount: exp.amount,
          category: exp.category,
          paymentMethod: exp.paymentMethod,
          vendorName: exp.vendorName,
          vendorPhone: exp.vendorPhone,
          invoiceNumber: exp.invoiceNumber,
          receiptUrl: exp.receiptUrl,
          date: exp.date,
          isRecurring: exp.isRecurring || false,
          recurringFrequency: exp.recurringFrequency,
          approvedBy: extractId(exp.approvedBy),
          approvedByUser: extractUser(exp.approvedBy),
          approvedAt: exp.approvedAt,
          createdBy: extractId(exp.createdBy),
          createdByUser: extractUser(exp.createdBy),
          status: exp.status || 'pending',
          notes: exp.notes,
          supplierId: extractId(exp.supplierId),
          purchaseOrderId: exp.purchaseOrderId?._id?.toString() || exp.purchaseOrderId?.toString() || exp.purchaseOrderId,
          createdAt: exp.createdAt || new Date().toISOString(),
          updatedAt: exp.updatedAt || new Date().toISOString(),
        } as Expense;
      },
      invalidatesTags: ['Expense'],
      async onQueryStarted(arg, { dispatch, queryFulfilled }) {
        try {
          await queryFulfilled;
          dispatch(expensesApi.util.invalidateTags(['Expense']));
        } catch {
          // Handle error
        }
      },
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
    approveExpense: builder.mutation<Expense, { id: string; approverId?: string }>({
      query: ({ id, approverId }) => ({
        url: `/expenses/${id}/approve`,
        method: 'POST',
        body: approverId ? { approverId } : {},
      }),
      invalidatesTags: ['Expense'],
    }),
    rejectExpense: builder.mutation<Expense, { id: string; approverId?: string; reason?: string }>({
      query: ({ id, approverId, reason }) => ({
        url: `/expenses/${id}/reject`,
        method: 'POST',
        body: { ...(approverId && { approverId }), ...(reason && { reason }) },
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
  useRejectExpenseMutation,
  useGetExpenseSummaryQuery,
  useUploadReceiptMutation,
} = expensesApi;
