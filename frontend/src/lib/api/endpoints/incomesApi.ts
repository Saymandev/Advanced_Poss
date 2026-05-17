import { apiSlice } from '../apiSlice';

export interface Income {
  id: string;
  incomeNumber?: string;
  title: string;
  description?: string;
  amount: number;
  category: 'catering' | 'event' | 'room-service' | 'interest' | 'other';
  paymentMethod: string;
  invoiceNumber?: string;
  customerName?: string;
  customerPhone?: string;
  receiptUrl?: string;
  date: string;
  status: 'pending' | 'received';
  notes?: string;
  tags?: string[];
  createdBy?: string;
  createdByUser?: { id: string; firstName?: string; lastName?: string; name?: string };
  receivedBy?: string;
  receivedByUser?: { id: string; firstName?: string; lastName?: string; name?: string };
  receivedAt?: string;
  workPeriodId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateIncomeRequest {
  companyId: string;
  branchId: string;
  title: string;
  description?: string;
  amount: number;
  category: 'catering' | 'event' | 'room-service' | 'interest' | 'other';
  paymentMethod: string;
  invoiceNumber?: string;
  customerName?: string;
  customerPhone?: string;
  receiptUrl?: string;
  date: string;
  notes?: string;
  tags?: string[];
  createdBy: string;
  status?: 'pending' | 'received';
}

export interface UpdateIncomeRequest extends Partial<CreateIncomeRequest> {
  id: string;
}

export interface IncomeStats {
  count: number;
  totalIncome: number;
  received: number;
  receivedAmount: number;
  pending: number;
  pendingAmount: number;
  byCategory: Record<string, number>;
  byPaymentMethod: Record<string, number>;
  averageIncome: number;
}

export const incomesApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getIncomes: builder.query<{ incomes: Income[]; total: number; page: number; limit: number }, any>({
      query: (params) => ({
        url: '/incomes',
        params,
      }),
      transformResponse: (response: any) => {
        const data = response.data || response;
        let items = [];

        if (Array.isArray(data)) {
          items = data;
        } else if (data.incomes) {
          items = data.incomes;
        } else if (data.items) {
          items = data.items;
        }

        return {
          incomes: items.map((inc: any) => {
            const extractId = (value: any): string | undefined => {
              if (!value) return undefined;
              if (typeof value === 'string') return value;
              if (value._id) return typeof value._id === 'string' ? value._id : value._id.toString();
              if (value.id) return typeof value.id === 'string' ? value.id : value.id.toString();
              return undefined;
            };

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
              id: inc._id?.toString() || inc.id?.toString() || '',
              incomeNumber: inc.incomeNumber,
              title: inc.title,
              description: inc.description,
              amount: inc.amount,
              category: inc.category,
              paymentMethod: inc.paymentMethod,
              invoiceNumber: inc.invoiceNumber,
              customerName: inc.customerName,
              customerPhone: inc.customerPhone,
              receiptUrl: inc.receiptUrl,
              date: inc.date,
              status: inc.status || 'pending',
              notes: inc.notes,
              tags: inc.tags || [],
              createdBy: extractId(inc.createdBy),
              createdByUser: extractUser(inc.createdBy),
              receivedBy: extractId(inc.receivedBy),
              receivedByUser: extractUser(inc.receivedBy),
              receivedAt: inc.receivedAt,
              workPeriodId: inc.workPeriodId?._id?.toString() || inc.workPeriodId?.toString() || inc.workPeriodId,
              createdAt: inc.createdAt || new Date().toISOString(),
              updatedAt: inc.updatedAt || new Date().toISOString(),
            };
          }) as Income[],
          total: data.total || items.length,
          page: data.page || 1,
          limit: data.limit || 20,
        };
      },
      providesTags: (result) =>
        result?.incomes
          ? [
              ...result.incomes.map(({ id }) => ({ type: 'Income' as const, id })),
              'Income',
            ]
          : ['Income'],
    }),
    getIncomeById: builder.query<Income, string>({
      query: (id) => `/incomes/${id}`,
      providesTags: ['Income'],
    }),
    createIncome: builder.mutation<Income, CreateIncomeRequest>({
      query: (data) => ({
        url: '/incomes',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['Income'],
    }),
    updateIncome: builder.mutation<Income, UpdateIncomeRequest>({
      query: ({ id, ...data }) => ({
        url: `/incomes/${id}`,
        method: 'PATCH',
        body: data,
      }),
      invalidatesTags: ['Income'],
    }),
    deleteIncome: builder.mutation<void, string>({
      query: (id) => ({
        url: `/incomes/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Income'],
    }),
    markIncomeAsReceived: builder.mutation<Income, string>({
      query: (id) => ({
        url: `/incomes/${id}/mark-received`,
        method: 'POST',
      }),
      invalidatesTags: ['Income'],
    }),
    getIncomeStats: builder.query<IncomeStats, {
      branchId: string;
      startDate: string;
      endDate: string;
    }>({
      query: ({ branchId, ...params }) => ({
        url: `/incomes/branch/${branchId}/stats`,
        params,
      }),
      providesTags: ['Income'],
    }),
  }),
});

export const {
  useGetIncomesQuery,
  useGetIncomeByIdQuery,
  useCreateIncomeMutation,
  useUpdateIncomeMutation,
  useDeleteIncomeMutation,
  useMarkIncomeAsReceivedMutation,
  useGetIncomeStatsQuery,
} = incomesApi;
