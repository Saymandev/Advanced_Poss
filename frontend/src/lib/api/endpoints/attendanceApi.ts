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
    }),
    checkOut: builder.mutation<AttendanceRecord, CheckOutRequest>({
      query: (data) => ({
        url: '/attendance/check-out',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['Attendance'],
    }),
    getAttendanceRecords: builder.query<{ records: AttendanceRecord[]; total: number }, any>({
      query: (params) => ({
        url: '/attendance',
        params,
      }),
      providesTags: ['Attendance'],
    }),
    getTodayAttendance: builder.query<AttendanceRecord[], string>({
      query: (branchId) => `/attendance/branch/${branchId}/today`,
      providesTags: ['Attendance'],
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
      query: (branchId) => `/attendance/stats/${branchId}`,
      providesTags: ['Attendance'],
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
