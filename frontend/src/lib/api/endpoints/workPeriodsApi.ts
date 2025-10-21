import { apiSlice } from '../apiSlice';

export interface WorkPeriod {
  id: string;
  name: string;
  startTime: string;
  endTime: string;
  isActive: boolean;
  branchId: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateWorkPeriodRequest {
  name: string;
  startTime: string;
  endTime: string;
  branchId: string;
}

export interface UpdateWorkPeriodRequest extends Partial<CreateWorkPeriodRequest> {
  id: string;
}

export interface WorkPeriodStats {
  totalPeriods: number;
  activePeriods: number;
  totalRevenue: number;
  totalOrders: number;
  averageOrderValue: number;
  topSellingItems: Array<{
    name: string;
    quantity: number;
    revenue: number;
  }>;
  hourlyStats: Array<{
    hour: number;
    orders: number;
    revenue: number;
  }>;
}

export const workPeriodsApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getWorkPeriods: builder.query<{ workPeriods: WorkPeriod[]; total: number }, any>({
      query: (params) => ({
        url: '/work-periods',
        params,
      }),
      providesTags: ['WorkPeriod'],
    }),
    getWorkPeriodById: builder.query<WorkPeriod, string>({
      query: (id) => `/work-periods/${id}`,
      providesTags: ['WorkPeriod'],
    }),
    createWorkPeriod: builder.mutation<WorkPeriod, CreateWorkPeriodRequest>({
      query: (data) => ({
        url: '/work-periods',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['WorkPeriod'],
    }),
    updateWorkPeriod: builder.mutation<WorkPeriod, UpdateWorkPeriodRequest>({
      query: ({ id, ...data }) => ({
        url: `/work-periods/${id}`,
        method: 'PATCH',
        body: data,
      }),
      invalidatesTags: ['WorkPeriod'],
    }),
    deleteWorkPeriod: builder.mutation<void, string>({
      query: (id) => ({
        url: `/work-periods/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['WorkPeriod'],
    }),
    startWorkPeriod: builder.mutation<WorkPeriod, string>({
      query: (id) => ({
        url: `/work-periods/${id}/start`,
        method: 'POST',
      }),
      invalidatesTags: ['WorkPeriod'],
    }),
    endWorkPeriod: builder.mutation<WorkPeriod, string>({
      query: (id) => ({
        url: `/work-periods/${id}/end`,
        method: 'POST',
      }),
      invalidatesTags: ['WorkPeriod'],
    }),
    getWorkPeriodStats: builder.query<WorkPeriodStats, { 
      workPeriodId: string; 
      startDate?: string; 
      endDate?: string 
    }>({
      query: ({ workPeriodId, ...params }) => ({
        url: `/work-periods/${workPeriodId}/stats`,
        params,
      }),
      providesTags: ['WorkPeriod'],
    }),
    getCurrentWorkPeriod: builder.query<WorkPeriod | null, { branchId: string }>({
      query: (params) => ({
        url: '/work-periods/current',
        params,
      }),
      providesTags: ['WorkPeriod'],
    }),
  }),
});

export const {
  useGetWorkPeriodsQuery,
  useGetWorkPeriodByIdQuery,
  useCreateWorkPeriodMutation,
  useUpdateWorkPeriodMutation,
  useDeleteWorkPeriodMutation,
  useStartWorkPeriodMutation,
  useEndWorkPeriodMutation,
  useGetWorkPeriodStatsQuery,
  useGetCurrentWorkPeriodQuery,
} = workPeriodsApi;
