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
  phoneNumber?: string;
  role: 'owner' | 'manager' | 'chef' | 'waiter' | 'cashier';
  password?: string;
  pin?: string;
  department?: string;
  salary?: number;
  hourlyRate?: number;
  emergencyContact?: {
    name: string;
    relationship: string;
    phoneNumber: string;
  };
  address?: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  };
  skills?: string[];
  certifications?: string[];
  notes?: string;
  branchId?: string;
  companyId?: string;
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
        url: '/users',
        params,
      }),
      transformResponse: (response: any) => {
        const data = response.data || response;
        let items = [];
        
        if (data.users) {
          items = data.users;
        } else if (Array.isArray(data)) {
          items = data;
        } else {
          items = data.items || [];
        }
        
        // Filter out owners and super_admins for staff management
        const staffItems = items.filter((item: any) => 
          item.role && !['owner', 'super_admin'].includes(item.role)
        );
        
        return {
          staff: staffItems.map((user: any) => ({
            id: user._id || user.id,
            firstName: user.firstName || '',
            lastName: user.lastName || '',
            email: user.email || '',
            phoneNumber: user.phone || user.phoneNumber || '',
            role: user.role || 'waiter',
            employeeId: user.employeeId || '',
            hireDate: user.joinedDate || user.createdAt || new Date().toISOString(),
            salary: user.salary,
            hourlyRate: user.hourlyRate,
            isActive: user.isActive !== undefined ? user.isActive : true,
            address: user.address,
            emergencyContact: user.emergencyContact,
            skills: user.skills || [],
            certifications: user.certifications || [],
            notes: user.notes,
            createdAt: user.createdAt || new Date().toISOString(),
            updatedAt: user.updatedAt || new Date().toISOString(),
          }) as Staff),
          total: data.total || staffItems.length,
        };
      },
      providesTags: ['Staff'],
    }),
    getStaffById: builder.query<Staff, string>({
      query: (id) => `/users/${id}`,
      transformResponse: (response: any) => {
        const data = response.data || response;
        return {
          id: data._id || data.id,
          firstName: data.firstName || '',
          lastName: data.lastName || '',
          email: data.email || '',
          phoneNumber: data.phone || data.phoneNumber || '',
          role: data.role || 'waiter',
          employeeId: data.employeeId || '',
          hireDate: data.joinedDate || data.createdAt || new Date().toISOString(),
          salary: data.salary,
          hourlyRate: data.hourlyRate,
          isActive: data.isActive !== undefined ? data.isActive : true,
          address: data.address,
          emergencyContact: data.emergencyContact,
          skills: data.skills || [],
          certifications: data.certifications || [],
          notes: data.notes,
          createdAt: data.createdAt || new Date().toISOString(),
          updatedAt: data.updatedAt || new Date().toISOString(),
        } as Staff;
      },
      providesTags: ['Staff'],
    }),
    createStaff: builder.mutation<Staff, CreateStaffRequest>({
      query: (data) => {
        // Transform phoneNumber to phone for backend compatibility
        const { phoneNumber, ...rest } = data;
        return {
          url: '/users',
          method: 'POST',
          body: {
            ...rest,
            phone: phoneNumber, // Backend expects 'phone', not 'phoneNumber'
          },
        };
      },
      invalidatesTags: ['Staff'],
    }),
    updateStaff: builder.mutation<Staff, UpdateStaffRequest>({
      query: ({ id, ...data }) => {
        // Transform phoneNumber to phone for backend compatibility
        const { phoneNumber, ...rest } = data;
        const body: any = { ...rest };
        if (phoneNumber !== undefined) {
          body.phone = phoneNumber;
        }
        return {
          url: `/users/${id}`,
          method: 'PATCH',
          body,
        };
      },
      invalidatesTags: ['Staff'],
    }),
    deleteStaff: builder.mutation<void, string>({
      query: (id) => ({
        url: `/users/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Staff'],
    }),
    deactivateStaff: builder.mutation<Staff, string>({
      query: (id) => ({
        url: `/users/${id}/deactivate`,
        method: 'PATCH',
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
  useDeactivateStaffMutation,
  useGetAttendanceQuery,
  useCreateAttendanceMutation,
  useUpdateAttendanceMutation,
  useGetStaffPerformanceQuery,
  useClockInMutation,
  useClockOutMutation,
} = staffApi;
