import { apiSlice } from '../apiSlice';

export interface Staff {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  role: 'owner' | 'manager' | 'chef' | 'waiter' | 'cashier';
  department?: string;
  employeeId: string;
  hireDate: string;
  salary?: number;
  hourlyRate?: number;
  isActive: boolean;
  emergencyContact: {
    name: string;
    relationship: string;
    phoneNumber: string;
  };
  address: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  };
  skills?: string[];
  certifications?: string[];
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateStaffRequest {
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  role: 'owner' | 'manager' | 'chef' | 'waiter' | 'cashier';
  department?: string;
  salary?: number;
  hourlyRate?: number;
  emergencyContact: {
    name: string;
    relationship: string;
    phoneNumber: string;
  };
  address: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  };
  skills?: string[];
  certifications?: string[];
  notes?: string;
}

export interface UpdateStaffRequest extends Partial<CreateStaffRequest> {
  id: string;
}

export interface Attendance {
  id: string;
  staffId: string;
  date: string;
  clockIn?: string;
  clockOut?: string;
  totalHours?: number;
  status: 'present' | 'absent' | 'late' | 'half-day';
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateAttendanceRequest {
  staffId: string;
  date: string;
  clockIn?: string;
  clockOut?: string;
  status: 'present' | 'absent' | 'late' | 'half-day';
  notes?: string;
}

export interface StaffPerformance {
  staffId: string;
  period: string;
  totalHours: number;
  ordersServed: number;
  customerRating: number;
  punctuality: number;
  efficiency: number;
  notes: string;
}

export const staffApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getStaff: builder.query<{ staff: Staff[]; total: number }, any>({
      query: (params) => ({
        url: '/staff',
        params,
      }),
      providesTags: ['Staff'],
    }),
    getStaffById: builder.query<Staff, string>({
      query: (id) => `/staff/${id}`,
      providesTags: ['Staff'],
    }),
    createStaff: builder.mutation<Staff, CreateStaffRequest>({
      query: (data) => ({
        url: '/staff',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['Staff'],
    }),
    updateStaff: builder.mutation<Staff, UpdateStaffRequest>({
      query: ({ id, ...data }) => ({
        url: `/staff/${id}`,
        method: 'PATCH',
        body: data,
      }),
      invalidatesTags: ['Staff'],
    }),
    deleteStaff: builder.mutation<void, string>({
      query: (id) => ({
        url: `/staff/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Staff'],
    }),
    getAttendance: builder.query<{ attendance: Attendance[]; total: number }, any>({
      query: (params) => ({
        url: '/attendance',
        params,
      }),
      providesTags: ['Attendance'],
    }),
    createAttendance: builder.mutation<Attendance, CreateAttendanceRequest>({
      query: (data) => ({
        url: '/attendance',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['Attendance'],
    }),
    updateAttendance: builder.mutation<Attendance, { id: string; clockOut?: string; status?: string }>({
      query: ({ id, ...data }) => ({
        url: `/attendance/${id}`,
        method: 'PATCH',
        body: data,
      }),
      invalidatesTags: ['Attendance'],
    }),
    getStaffPerformance: builder.query<StaffPerformance[], { 
      staffId?: string; 
      startDate?: string; 
      endDate?: string 
    }>({
      query: (params) => ({
        url: '/staff/performance',
        params,
      }),
      providesTags: ['Staff'],
    }),
    clockIn: builder.mutation<Attendance, { staffId: string; date: string }>({
      query: (data) => ({
        url: '/attendance/clock-in',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['Attendance'],
    }),
    clockOut: builder.mutation<Attendance, { staffId: string; date: string }>({
      query: (data) => ({
        url: '/attendance/clock-out',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['Attendance'],
    }),
  }),
});

export const {
  useGetStaffQuery,
  useGetStaffByIdQuery,
  useCreateStaffMutation,
  useUpdateStaffMutation,
  useDeleteStaffMutation,
  useGetAttendanceQuery,
  useCreateAttendanceMutation,
  useUpdateAttendanceMutation,
  useGetStaffPerformanceQuery,
  useClockInMutation,
  useClockOutMutation,
} = staffApi;
