import { apiSlice } from '../apiSlice';

export interface WorkPeriod {
  id: string;
  serial: number;
  startTime: string;
  endTime?: string;
  startedBy: string;
  endedBy?: string;
  duration?: string;
  openingBalance: number;
  closingBalance?: number;
  status: 'active' | 'completed';
  companyId: string;
  createdAt?: string;
  updatedAt?: string;
  // Additional fields that may come from backend
  totalSales?: number;
  totalExpenses?: number;
  expectedClosingBalance?: number;
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
    getWorkPeriods: builder.query<{ workPeriods: WorkPeriod[]; total: number }, { 
      branchId?: string;
      status?: string;
      page?: number;
      limit?: number;
    }>({
      query: (params) => ({
        url: '/work-periods',
        params: {
          ...params,
          // Backend will use companyId from JWT, but we pass branchId if needed for future filtering
        },
      }),
      providesTags: ['WorkPeriod'],
      transformResponse: (response: any) => {
        // Handle TransformInterceptor format: { success: true, data: ... }
        const data = response?.data !== undefined ? response.data : response;
        
        // Ensure workPeriods is an array and map _id to id
        const workPeriods = (data?.workPeriods || []).map((wp: any) => {
          const workPeriod = {
            ...wp,
            id: wp._id ? wp._id.toString() : wp.id,
            serial: wp.serial !== undefined ? wp.serial : (wp.serialNumber !== undefined ? wp.serialNumber : 0),
            startTime: wp.startTime,
            endTime: wp.endTime,
            startedBy: wp.startedBy,
            endedBy: wp.endedBy,
            openingBalance: wp.openingBalance || 0,
            closingBalance: wp.closingBalance,
            status: wp.status || 'completed',
            duration: wp.duration,
            companyId: wp.companyId ? (wp.companyId._id ? wp.companyId._id.toString() : wp.companyId.toString()) : wp.companyId,
          };
          return workPeriod;
        });
        
        return {
          workPeriods,
          total: data?.total || workPeriods.length,
          page: data?.page || 1,
          limit: data?.limit || 10,
          totalPages: data?.totalPages || Math.ceil((data?.total || workPeriods.length) / (data?.limit || 10)),
        };
      },
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
    startWorkPeriod: builder.mutation<WorkPeriod, { openingBalance: number; pin: string }>({
      query: (data) => ({
        url: '/work-periods/start',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['WorkPeriod'],
    }),
    endWorkPeriod: builder.mutation<WorkPeriod, { id: string; actualClosingBalance: number; note?: string; pin: string }>({
      query: ({ id, ...data }) => ({
        url: `/work-periods/${id}/end`,
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['WorkPeriod'],
    }),
    getWorkPeriodSalesSummary: builder.query<any, string>({
      query: (id) => `/work-periods/${id}/sales-summary`,
      providesTags: ['WorkPeriod'],
      transformResponse: (response: any) => {
        // Handle TransformInterceptor format: { success: true, data: ... }
        const data = response?.data !== undefined ? response.data : response;
        
        // Ensure paymentMethods is an array
        if (data?.paymentMethods && !Array.isArray(data.paymentMethods)) {
          data.paymentMethods = [];
        }
        
        // Ensure orders is an array
        if (data?.orders && !Array.isArray(data.orders)) {
          data.orders = [];
        }
        
        return {
          totalOrders: data?.totalOrders || 0,
          grossSales: data?.grossSales || 0,
          subtotal: data?.subtotal || 0,
          vatTotal: data?.vatTotal || 0,
          serviceCharge: data?.serviceCharge || 0,
          voidCount: data?.voidCount || 0,
          cancelCount: data?.cancelCount || 0,
          paymentMethods: data?.paymentMethods || [],
          orders: data?.orders || [],
        };
      },
    }),
    getCurrentWorkPeriod: builder.query<WorkPeriod | null, void>({
      query: () => '/work-periods/active',
      providesTags: ['WorkPeriod'],
      transformResponse: (response: any) => {
        // Handle TransformInterceptor format: { success: true, data: ... }
        const data = response?.data !== undefined ? response.data : response;
        
        // If data is null, return null
        if (data === null || data === undefined) {
          return null;
        }
        
        // If data is an empty object, return null
        if (typeof data === 'object' && Object.keys(data).length === 0) {
          return null;
        }
        
        // If data doesn't have an id or _id, return null
        if (!data.id && !data._id) {
          return null;
        }
        
        // Ensure we have an id field
        if (data._id && !data.id) {
          data.id = data._id.toString();
        }
        
        // Ensure status is set correctly
        if (!data.status) {
          data.status = 'active'; // Default to active if not set
        }
        
        return data;
      },
    }),
    getWorkPeriodActivities: builder.query<{
      totalActivities: number;
      activities: Array<{
        type: string;
        description: string;
        timestamp: string;
        details: any;
      }>;
    }, string>({
      query: (id) => `/work-periods/${id}/activities`,
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
  useGetWorkPeriodSalesSummaryQuery,
  useGetCurrentWorkPeriodQuery,
  useGetWorkPeriodActivitiesQuery,
} = workPeriodsApi;
