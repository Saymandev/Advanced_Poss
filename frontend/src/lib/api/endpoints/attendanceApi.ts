import { apiSlice } from '../apiSlice';

export interface AttendanceRecord {
  id: string;
  userId: string;
  userName: string;
  branchId: string;
  branchName: string;
  checkIn: string;
  checkOut?: string;
  status: 'present' | 'absent' | 'late' | 'half-day';
  totalHours?: number;
  overtime?: number;
  notes?: string;
  approvedBy?: string;
  approvedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CheckInRequest {
  branchId: string;
  notes?: string;
}

export interface CheckOutRequest {
  notes?: string;
}

export interface AttendanceStats {
  totalEmployees: number;
  presentToday: number;
  absentToday: number;
  lateToday: number;
  averageHours: number;
  totalOvertime: number;
  attendanceRate: number;
}

export const attendanceApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    checkIn: builder.mutation<AttendanceRecord, CheckInRequest>({
      query: (data) => ({
        url: '/attendance/check-in',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['Attendance'],
      transformResponse: (response: any) => {
        const data = response?.data || response;
        return {
          id: data.id || data._id,
          userId: data.userId?.id || data.userId?._id || data.userId,
          userName: data.userName || `${data.userId?.firstName || ''} ${data.userId?.lastName || ''}`.trim() || data.userId?.email || 'Unknown',
          branchId: data.branchId?.id || data.branchId?._id || data.branchId,
          branchName: data.branchName || data.branchId?.name || data.branchId?.code || 'Unknown',
          checkIn: data.checkIn,
          checkOut: data.checkOut,
          status: data.status || 'present',
          totalHours: data.totalHours || data.workHours || 0,
          overtime: data.overtime || data.overtimeHours || 0,
          notes: data.notes,
          approvedBy: data.approvedBy,
          approvedAt: data.approvedAt,
          createdAt: data.createdAt,
          updatedAt: data.updatedAt,
        };
      },
    }),
    checkOut: builder.mutation<AttendanceRecord, CheckOutRequest>({
      query: (data) => ({
        url: '/attendance/check-out',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['Attendance'],
      transformResponse: (response: any) => {
        const data = response?.data || response;
        return {
          id: data.id || data._id,
          userId: data.userId?.id || data.userId?._id || data.userId,
          userName: data.userName || `${data.userId?.firstName || ''} ${data.userId?.lastName || ''}`.trim() || data.userId?.email || 'Unknown',
          branchId: data.branchId?.id || data.branchId?._id || data.branchId,
          branchName: data.branchName || data.branchId?.name || data.branchId?.code || 'Unknown',
          checkIn: data.checkIn,
          checkOut: data.checkOut,
          status: data.status || 'present',
          totalHours: data.totalHours || data.workHours || 0,
          overtime: data.overtime || data.overtimeHours || 0,
          notes: data.notes,
          approvedBy: data.approvedBy,
          approvedAt: data.approvedAt,
          createdAt: data.createdAt,
          updatedAt: data.updatedAt,
        };
      },
    }),
    forceCheckOut: builder.mutation<AttendanceRecord, { userId: string; notes?: string }>({
      query: ({ userId, ...data }) => ({
        url: `/attendance/${userId}/force-check-out`,
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['Attendance'],
      transformResponse: (response: any) => {
        const data = response?.data || response;
        return {
          id: data.id || data._id,
          userId: data.userId?.id || data.userId?._id || data.userId,
          userName: data.userName || `${data.userId?.firstName || ''} ${data.userId?.lastName || ''}`.trim() || data.userId?.email || 'Unknown',
          branchId: data.branchId?.id || data.branchId?._id || data.branchId,
          branchName: data.branchName || data.branchId?.name || data.branchId?.code || 'Unknown',
          checkIn: data.checkIn,
          checkOut: data.checkOut,
          status: data.status || 'present',
          totalHours: data.totalHours || data.workHours || 0,
          overtime: data.overtime || data.overtimeHours || 0,
          notes: data.notes,
          approvedBy: data.approvedBy,
          approvedAt: data.approvedAt,
          createdAt: data.createdAt,
          updatedAt: data.updatedAt,
        };
      },
    }),
    getAttendanceRecords: builder.query<{ records: AttendanceRecord[]; total: number }, any>({
      query: (params) => ({
        url: '/attendance',
        params,
      }),
      providesTags: ['Attendance'],
      transformResponse: (response: any) => {
        const data = response?.data || response;
        const rawRecords: any[] =
          Array.isArray(data?.attendance) ? data.attendance :
          Array.isArray(data?.records) ? data.records :
          Array.isArray(data) ? data :
          [];

        const records: AttendanceRecord[] = rawRecords.map((item: any) => ({
          id: item.id || item._id?.toString() || '',
          userId: item.userId?.id || item.userId?._id?.toString() || (typeof item.userId === 'string' ? item.userId : ''),
          userName:
            item.userName ||
            (item.userId?.firstName && item.userId?.lastName
              ? `${item.userId.firstName} ${item.userId.lastName}`.trim()
              : item.userId?.fullName || item.userId?.email || 'Unknown'),
          branchId: item.branchId?.id || item.branchId?._id?.toString() || (typeof item.branchId === 'string' ? item.branchId : ''),
          branchName: item.branchName || item.branchId?.name || item.branchId?.code || 'Unknown',
          checkIn: item.checkIn,
          checkOut: item.checkOut,
          status: item.status || 'present',
          totalHours: item.totalHours || item.workHours || 0,
          overtime: item.overtime || item.overtimeHours || 0,
          notes: item.notes,
          approvedBy: item.approvedBy,
          approvedAt: item.approvedAt,
          createdAt: item.createdAt,
          updatedAt: item.updatedAt,
        }));

        return {
          records,
          total: data.total || records.length,
        };
      },
    }),
    getTodayAttendance: builder.query<AttendanceRecord[], string>({
      query: (branchId) => `/attendance/branch/${branchId}/today`,
      providesTags: ['Attendance'],
      transformResponse: (response: any) => {
        // TransformInterceptor wraps in { success: true, data: ... }
        // Backend returns array directly with userName and branchName already transformed
        let dataArray: any[] = [];
        
        // Handle TransformInterceptor wrapper: { success: true, data: [...] }
        if (response && typeof response === 'object' && 'success' in response && 'data' in response) {
          dataArray = Array.isArray(response.data) ? response.data : [];
        } else if (Array.isArray(response)) {
          dataArray = response;
        } else if (response?.data) {
          dataArray = Array.isArray(response.data) ? response.data : [];
        } else if (response?.attendance && Array.isArray(response.attendance)) {
          dataArray = response.attendance;
        }
        
        // Backend already provides userName and branchName, so we just need to ensure required fields exist
        return dataArray.map((item: any) => ({
          id: item.id || item._id?.toString() || '',
          userId: item.userId?.id || item.userId?._id?.toString() || (typeof item.userId === 'string' ? item.userId : ''),
          userName: item.userName || 
            (item.userId?.firstName && item.userId?.lastName 
              ? `${item.userId.firstName} ${item.userId.lastName}`.trim()
              : item.userId?.fullName || item.userId?.email || 'Unknown'),
          branchId: item.branchId?.id || item.branchId?._id?.toString() || (typeof item.branchId === 'string' ? item.branchId : ''),
          branchName: item.branchName || item.branchId?.name || item.branchId?.code || 'Unknown',
          checkIn: item.checkIn,
          checkOut: item.checkOut,
          status: item.status || 'present',
          totalHours: item.totalHours || item.workHours || 0,
          overtime: item.overtime || item.overtimeHours || 0,
          notes: item.notes,
          approvedBy: item.approvedBy,
          approvedAt: item.approvedAt,
          createdAt: item.createdAt,
          updatedAt: item.updatedAt,
        }));
      },
    }),
    getBranchAttendance: builder.query<AttendanceRecord[], string>({
      query: (branchId) => `/attendance/branch/${branchId}`,
      providesTags: ['Attendance'],
    }),
    getUserAttendance: builder.query<AttendanceRecord[], string>({
      query: (userId) => `/attendance/user/${userId}`,
      providesTags: ['Attendance'],
    }),
    getMonthlyAttendance: builder.query<AttendanceRecord[], { userId: string; year: number; month: number }>({
      query: ({ userId, year, month }) => `/attendance/user/${userId}/monthly/${year}/${month}`,
      providesTags: ['Attendance'],
    }),
    getAttendanceStats: builder.query<AttendanceStats, string>({
      query: (branchId) => {
        // Get today's date range for stats
        const today = new Date();
        const startDate = new Date(today);
        startDate.setHours(0, 0, 0, 0);
        const endDate = new Date(today);
        endDate.setHours(23, 59, 59, 999);
        return `/attendance/stats/${branchId}?startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}`;
      },
      providesTags: ['Attendance'],
      transformResponse: (response: any) => {
        const data = response?.data || response;
        // Get total employees count from branch or calculate from attendance records
        const totalEmployees = data.totalEmployees || 0;
        return {
          totalEmployees,
          presentToday: data.present || 0,
          absentToday: data.absent || 0,
          lateToday: data.late || 0,
          averageHours: data.averageWorkHours || 0,
          totalOvertime: data.totalOvertimeHours || 0,
          attendanceRate: data.totalRecords > 0 ? ((data.present || 0) / data.totalRecords) * 100 : 0,
        };
      },
    }),
    getAttendanceById: builder.query<AttendanceRecord, string>({
      query: (id) => `/attendance/${id}`,
      providesTags: ['Attendance'],
    }),
    markAbsent: builder.mutation<AttendanceRecord, { userId: string; date: string; reason?: string }>({
      query: (data) => ({
        url: '/attendance/mark-absent',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['Attendance'],
    }),
    updateAttendance: builder.mutation<AttendanceRecord, { id: string; data: Partial<AttendanceRecord> }>({
      query: ({ id, data }) => ({
        url: `/attendance/${id}`,
        method: 'PATCH',
        body: data,
      }),
      invalidatesTags: ['Attendance'],
    }),
    approveAttendance: builder.mutation<AttendanceRecord, string>({
      query: (id) => ({
        url: `/attendance/${id}/approve`,
        method: 'POST',
      }),
      invalidatesTags: ['Attendance'],
    }),
    deleteAttendance: builder.mutation<void, string>({
      query: (id) => ({
        url: `/attendance/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Attendance'],
    }),
  }),
});

export const {
  useCheckInMutation,
  useCheckOutMutation,
  useForceCheckOutMutation,
  useGetAttendanceRecordsQuery,
  useGetTodayAttendanceQuery,
  useGetBranchAttendanceQuery,
  useGetUserAttendanceQuery,
  useGetMonthlyAttendanceQuery,
  useGetAttendanceStatsQuery,
  useGetAttendanceByIdQuery,
  useMarkAbsentMutation,
  useUpdateAttendanceMutation,
  useApproveAttendanceMutation,
  useDeleteAttendanceMutation,
} = attendanceApi;
