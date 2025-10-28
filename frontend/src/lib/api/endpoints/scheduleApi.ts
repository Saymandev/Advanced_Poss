import { apiSlice } from '../apiSlice';

export interface ScheduleShift {
  id: string;
  userId: string;
  employeeId?: string;
  employeeName: string;
  role: string;
  position: string;
  date: string;
  startTime: string;
  endTime: string;
  shiftType: 'morning' | 'afternoon' | 'evening' | 'night' | 'custom';
  status: 'scheduled' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled' | 'no_show';
  notes?: string;
  branchId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateScheduleRequest {
  userId: string;
  branchId?: string;
  date: string;
  startTime: string;
  endTime: string;
  shiftType: 'morning' | 'afternoon' | 'evening' | 'night' | 'custom';
  position: string;
  notes?: string;
}

export interface UpdateScheduleRequest {
  userId?: string;
  date?: string;
  startTime?: string;
  endTime?: string;
  shiftType?: 'morning' | 'afternoon' | 'evening' | 'night' | 'custom';
  position?: string;
  notes?: string;
  status?: 'scheduled' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled' | 'no_show';
}

export interface ScheduleFilters {
  branchId?: string;
  userId?: string;
  employeeId?: string; // For compatibility
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
      query: (filters) => {
        const params: any = { ...filters };
        // Convert employeeId to userId for backend compatibility
        if (params.employeeId && !params.userId) {
          params.userId = params.employeeId;
          delete params.employeeId;
        }
        return {
          url: '/schedule/shifts',
          params,
        };
      },
      transformResponse: (response: any) => {
        const data = response.data || response;
        let items = [];
        
        if (data.shifts) {
          items = data.shifts;
        } else if (Array.isArray(data)) {
          items = data;
        } else {
          items = data.items || [];
        }
        
        return {
          shifts: items.map((shift: any) => {
            const user = shift.userId || {};
            return {
              id: shift._id || shift.id,
              userId: shift.userId?._id || shift.userId || '',
              employeeId: shift.userId?.employeeId || user.employeeId,
              employeeName: shift.userId?.firstName && shift.userId?.lastName
                ? `${shift.userId.firstName} ${shift.userId.lastName}`
                : user?.name || 'Unknown',
              role: shift.userId?.role || user?.role || shift.position || '',
              position: shift.position || shift.userId?.role || '',
              date: shift.date || new Date().toISOString(),
              startTime: shift.time?.start || shift.startTime || '09:00',
              endTime: shift.time?.end || shift.endTime || '17:00',
              shiftType: shift.shiftType || 'custom',
              status: shift.status || 'scheduled',
              notes: shift.notes,
              branchId: shift.branchId?._id || shift.branchId || '',
              createdAt: shift.createdAt || new Date().toISOString(),
              updatedAt: shift.updatedAt || new Date().toISOString(),
            } as ScheduleShift;
          }),
          total: data.total || items.length,
        };
      },
      providesTags: ['Schedule'],
    }),

    // Get shift by ID
    getShift: builder.query<ScheduleShift, string>({
      query: (id) => `/schedule/shifts/${id}`,
      transformResponse: (response: any) => {
        const shift = response.data || response;
        const user = shift.userId || {};
        return {
          id: shift._id || shift.id,
          userId: shift.userId?._id || shift.userId || '',
          employeeId: shift.userId?.employeeId || user.employeeId,
          employeeName: shift.userId?.firstName && shift.userId?.lastName
            ? `${shift.userId.firstName} ${shift.userId.lastName}`
            : user?.name || 'Unknown',
          role: shift.userId?.role || user?.role || shift.position || '',
          position: shift.position || shift.userId?.role || '',
          date: shift.date || new Date().toISOString(),
          startTime: shift.time?.start || shift.startTime || '09:00',
          endTime: shift.time?.end || shift.endTime || '17:00',
          shiftType: shift.shiftType || 'custom',
          status: shift.status || 'scheduled',
          notes: shift.notes,
          branchId: shift.branchId?._id || shift.branchId || '',
          createdAt: shift.createdAt || new Date().toISOString(),
          updatedAt: shift.updatedAt || new Date().toISOString(),
        } as ScheduleShift;
      },
      providesTags: (result, error, id) => [{ type: 'Schedule', id }],
    }),

    // Create new shift
    createShift: builder.mutation<ScheduleShift, CreateScheduleRequest>({
      query: (data) => ({
        url: '/schedule/shifts',
        method: 'POST',
        body: {
          userId: data.userId,
          branchId: data.branchId,
          date: data.date,
          shiftType: data.shiftType || 'custom',
          position: data.position,
          time: {
            start: data.startTime,
            end: data.endTime,
          },
          notes: data.notes,
          status: 'scheduled',
        },
      }),
      invalidatesTags: ['Schedule'],
    }),

    // Update shift
    updateShift: builder.mutation<ScheduleShift, { id: string; data: UpdateScheduleRequest }>({
      query: ({ id, data }) => {
        const body: any = {};
        if (data.userId) body.userId = data.userId;
        if (data.date) body.date = data.date;
        if (data.shiftType) body.shiftType = data.shiftType;
        if (data.position) body.position = data.position;
        if (data.startTime || data.endTime) {
          body.time = {};
          if (data.startTime) body.time.start = data.startTime;
          if (data.endTime) body.time.end = data.endTime;
        }
        if (data.notes !== undefined) body.notes = data.notes;
        if (data.status) body.status = data.status;
        
        return {
          url: `/schedule/shifts/${id}`,
          method: 'PUT',
          body,
        };
      },
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
      transformResponse: (response: any) => {
        const data = response.data || response;
        return {
          totalShifts: data.totalShifts || 0,
          confirmedShifts: data.confirmedShifts || 0,
          scheduledShifts: data.scheduledShifts || 0,
          completedShifts: data.completedShifts || 0,
          cancelledShifts: data.cancelledShifts || 0,
          upcomingShifts: data.upcomingShifts || 0,
        };
      },
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
