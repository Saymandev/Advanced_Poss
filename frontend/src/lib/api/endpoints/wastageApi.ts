import { apiSlice } from '../apiSlice';

export enum WastageReason {
  EXPIRED = 'expired',
  DAMAGED = 'damaged',
  SPOILAGE = 'spoilage',
  OVER_PRODUCTION = 'over_production',
  PREPARATION_ERROR = 'preparation_error',
  STORAGE_ISSUE = 'storage_issue',
  CONTAMINATION = 'contamination',
  OTHER = 'other',
}

export interface Wastage {
  _id: string;
  id?: string;
  companyId: string;
  branchId: string;
  ingredientId: string | {
    _id: string;
    name: string;
    unit: string;
    category?: string;
  };
  quantity: number;
  unit: string;
  reason: WastageReason;
  unitCost: number;
  totalCost: number;
  wastageDate: string;
  reportedBy: string | {
    _id: string;
    firstName?: string;
    lastName?: string;
    name?: string;
    email?: string;
  };
  notes?: string;
  batchNumber?: string;
  expiryDate?: string;
  status: 'pending' | 'approved' | 'rejected';
  approvedBy?: string | {
    _id: string;
    firstName?: string;
    lastName?: string;
    name?: string;
  };
  approvedAt?: string;
  attachments?: string[];
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateWastageRequest {
  ingredientId: string;
  quantity: number;
  unit: string;
  reason: WastageReason;
  unitCost: number;
  wastageDate: string;
  notes?: string;
  batchNumber?: string;
  expiryDate?: string;
  attachments?: string[];
}

export interface UpdateWastageRequest extends Partial<CreateWastageRequest> {
  status?: 'pending' | 'approved' | 'rejected';
}

export interface WastageQueryParams {
  branchId?: string;
  ingredientId?: string;
  reason?: WastageReason;
  startDate?: string;
  endDate?: string;
  status?: 'pending' | 'approved' | 'rejected';
  page?: number;
  limit?: number;
}

export interface WastageListResponse {
  wastages: Wastage[];
  total: number;
  page: number;
  limit: number;
}

export const wastageApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getWastages: builder.query<WastageListResponse, WastageQueryParams>({
      query: (params) => ({
        url: '/wastage',
        params,
      }),
      providesTags: ['Wastage' as const],
      transformResponse: (response: any) => {
        const data = response.data || response;
        return {
          wastages: data.wastages || data || [],
          total: data.total || 0,
          page: data.page || 1,
          limit: data.limit || 50,
        };
      },
    }),

    getWastageById: builder.query<Wastage, string>({
      query: (id) => `/wastage/${id}`,
      providesTags: (result, error, id) => [{ type: 'Wastage' as const, id }],
      transformResponse: (response: any) => {
        return response.data || response;
      },
    }),

    getWastageStats: builder.query<any, { branchId?: string; companyId?: string; startDate?: string; endDate?: string }>({
      query: (params) => ({
        url: '/wastage/stats',
        params,
      }),
      providesTags: ['Wastage' as const],
      transformResponse: (response: any) => {
        return response.data || response;
      },
    }),

    createWastage: builder.mutation<Wastage, CreateWastageRequest>({
      query: (data) => ({
        url: '/wastage',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['Wastage', 'Ingredient'],
      transformResponse: (response: any) => {
        return response.data || response;
      },
    }),

    updateWastage: builder.mutation<Wastage, { id: string; data: UpdateWastageRequest }>({
      query: ({ id, data }) => ({
        url: `/wastage/${id}`,
        method: 'PATCH',
        body: data,
      }),
      invalidatesTags: (result, error, { id }) => [{ type: 'Wastage' as const, id }, 'Wastage' as const, 'Ingredient'],
      transformResponse: (response: any) => {
        return response.data || response;
      },
    }),

    deleteWastage: builder.mutation<void, string>({
      query: (id) => ({
        url: `/wastage/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Wastage', 'Ingredient'],
    }),
  }),
});

export const {
  useGetWastagesQuery,
  useGetWastageByIdQuery,
  useGetWastageStatsQuery,
  useCreateWastageMutation,
  useUpdateWastageMutation,
  useDeleteWastageMutation,
} = wastageApi;

