import { apiSlice } from '../apiSlice';

export interface ScheduleShift {
  id: string;
  employeeId: string;
  employeeName: string;
  role: string;
  date: string;
  startTime: string;
  endTime: string;
  status: 'scheduled' | 'confirmed' | 'completed' | 'cancelled';
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateScheduleRequest {
  employeeId: string;
  date: string;
  startTime: string;
  endTime: string;
  notes?: string;
}

export interface UpdateScheduleRequest {
  employeeId?: string;
  date?: string;
  startTime?: string;
  endTime?: string;
  notes?: string;
  status?: 'scheduled' | 'confirmed' | 'completed' | 'cancelled';
}

export interface ScheduleFilters {
  branchId?: string;
  employeeId?: string;
  status?: string;
  startDate?: string;
  endDate?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export const scheduleApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    // Get all shifts
    getShifts: builder.query<{ shifts: ScheduleShift[]; total: number }, ScheduleFilters>({
      query: (filters) => ({
        url: '/schedule/shifts',
        params: filters,
      }),
      providesTags: ['Schedule'],
    }),

    // Get shift by ID
    getShift: builder.query<ScheduleShift, string>({
      query: (id) => `/schedule/shifts/${id}`,
      providesTags: (result, error, id) => [{ type: 'Schedule', id }],
    }),

    // Create new shift
    createShift: builder.mutation<ScheduleShift, CreateScheduleRequest>({
      query: (data) => ({
        url: '/schedule/shifts',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['Schedule'],
    }),

    // Update shift
    updateShift: builder.mutation<ScheduleShift, { id: string; data: UpdateScheduleRequest }>({
      query: ({ id, data }) => ({
        url: `/schedule/shifts/${id}`,
        method: 'PUT',
        body: data,
      }),
      invalidatesTags: (result, error, { id }) => [{ type: 'Schedule', id }, 'Schedule'],
    }),

    // Delete shift
    deleteShift: builder.mutation<void, string>({
      query: (id) => ({
        url: `/schedule/shifts/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Schedule'],
    }),

    // Update shift status
    updateShiftStatus: builder.mutation<ScheduleShift, { id: string; status: ScheduleShift['status'] }>({
      query: ({ id, status }) => ({
        url: `/schedule/shifts/${id}/status`,
        method: 'PATCH',
        body: { status },
      }),
      invalidatesTags: (result, error, { id }) => [{ type: 'Schedule', id }, 'Schedule'],
    }),

    // Get shifts for specific date range
    getShiftsByDateRange: builder.query<ScheduleShift[], { startDate: string; endDate: string; branchId?: string }>({
      query: ({ startDate, endDate, branchId }) => ({
        url: '/schedule/shifts/date-range',
        params: { startDate, endDate, branchId },
      }),
      providesTags: ['Schedule'],
    }),

    // Get employee availability
    getEmployeeAvailability: builder.query<{ available: boolean; conflicts: ScheduleShift[] }, { employeeId: string; date: string; startTime: string; endTime: string }>({
      query: (params) => ({
        url: '/schedule/availability',
        params,
      }),
    }),

    // Bulk create shifts
    bulkCreateShifts: builder.mutation<{ created: number; failed: number }, CreateScheduleRequest[]>({
      query: (shifts) => ({
        url: '/schedule/shifts/bulk',
        method: 'POST',
        body: { shifts },
      }),
      invalidatesTags: ['Schedule'],
    }),

    // Get schedule statistics
    getScheduleStats: builder.query<{
      totalShifts: number;
      confirmedShifts: number;
      scheduledShifts: number;
      completedShifts: number;
      cancelledShifts: number;
      upcomingShifts: number;
    }, { branchId?: string; startDate?: string; endDate?: string }>({
      query: (params) => ({
        url: '/schedule/stats',
        params,
      }),
      providesTags: ['Schedule'],
    }),

    // Copy schedule from previous week
    copySchedule: builder.mutation<{ copied: number }, { fromDate: string; toDate: string; branchId?: string }>({
      query: (data) => ({
        url: '/schedule/copy',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['Schedule'],
    }),

    // Get shift templates
    getShiftTemplates: builder.query<Array<{
      id: string;
      name: string;
      role: string;
      startTime: string;
      endTime: string;
      duration: number;
    }>, void>({
      query: () => '/schedule/templates',
      providesTags: ['Schedule'],
    }),

    // Create shift template
    createShiftTemplate: builder.mutation<void, {
      name: string;
      role: string;
      startTime: string;
      endTime: string;
    }>({
      query: (data) => ({
        url: '/schedule/templates',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['Schedule'],
    }),
  }),
});

export const {
  useGetShiftsQuery,
  useGetShiftQuery,
  useCreateShiftMutation,
  useUpdateShiftMutation,
  useDeleteShiftMutation,
  useUpdateShiftStatusMutation,
  useGetShiftsByDateRangeQuery,
  useGetEmployeeAvailabilityQuery,
  useBulkCreateShiftsMutation,
  useGetScheduleStatsQuery,
  useCopyScheduleMutation,
  useGetShiftTemplatesQuery,
  useCreateShiftTemplateMutation,
} = scheduleApi;
