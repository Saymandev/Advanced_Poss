import { apiSlice } from '../apiSlice';

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  role: string;
  avatar?: string;
  isActive: boolean;
  isEmailVerified: boolean;
  twoFactorEnabled: boolean;
  companyId?: string;
  branchId?: string;
  employeeId?: string;
  salary?: number;
  commissionRate?: number;
  shift?: string;
  joinedDate?: string;
  lastLogin?: string;
  createdAt: string;
  updatedAt: string;
  branch?: {
    id: string;
    name: string;
    address?: string;
  };
  company?: {
    id: string;
    name: string;
  };
}

export interface UpdateProfileRequest {
  firstName?: string;
  lastName?: string;
  phone?: string;
  avatar?: string;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

export interface ChangePinRequest {
  currentPin: string;
  newPin: string;
}

export interface AdminUpdatePinRequest {
  userId: string;
  newPin: string;
}

export interface AdminUpdatePasswordRequest {
  userId: string;
  newPassword: string;
}

export const usersApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getProfile: builder.query<User, void>({
      query: () => '/users/me',
      providesTags: ['User'],
      transformResponse: (response: any) => {
        return response?.data || response;
      },
    }),
    updateProfile: builder.mutation<User, UpdateProfileRequest>({
      query: (data) => ({
        url: '/users/me',
        method: 'PATCH',
        body: data,
      }),
      invalidatesTags: ['User'],
      transformResponse: (response: any) => {
        return response?.data || response;
      },
    }),
    changePassword: builder.mutation<{ message: string }, ChangePasswordRequest>({
      query: (data) => ({
        url: '/auth/change-password',
        method: 'POST',
        body: data,
      }),
    }),
    changePin: builder.mutation<{ message: string }, ChangePinRequest>({
      query: (data) => ({
        url: '/auth/change-pin',
        method: 'POST',
        body: data,
      }),
    }),
    adminUpdatePin: builder.mutation<{ message: string }, AdminUpdatePinRequest>({
      query: ({ userId, newPin }) => ({
        url: `/users/${userId}/admin-update-pin`,
        method: 'PATCH',
        body: { newPin },
      }),
      invalidatesTags: ['User', 'Staff'],
    }),
    adminUpdatePassword: builder.mutation<{ message: string }, AdminUpdatePasswordRequest>({
      query: ({ userId, newPassword }) => ({
        url: `/users/${userId}/admin-update-password`,
        method: 'PATCH',
        body: { newPassword },
      }),
      invalidatesTags: ['User', 'Staff'],
    }),
    activateUser: builder.mutation<{ message: string }, string>({
      query: (userId) => ({
        url: `/users/${userId}/activate`,
        method: 'PATCH',
      }),
      invalidatesTags: ['User', 'Staff'],
    }),
    uploadAvatar: builder.mutation<{ avatarUrl: string }, File>({
      query: (file) => {
        const formData = new FormData();
        formData.append('avatar', file);
        return {
          url: '/users/upload-avatar',
          method: 'POST',
          body: formData,
          prepareHeaders: (headers: Headers) => {
            headers.delete('Content-Type');
            return headers;
          },
        };
      },
      invalidatesTags: ['User'],
      transformResponse: (response: any) => {
        return response?.data || response;
      },
    }),
    getAllUsersSystemWide: builder.query<{ users: User[]; total: number; page: number; limit: number }, any>({
      query: (params) => ({
        url: '/users/system/all',
        params: {
          ...params,
          includeSuperAdmins: true,
        },
      }),
      providesTags: ['User'],
      transformResponse: (response: any) => {
        if (response?.success && response?.data) {
          return response.data;
        }
        return response;
      },
    }),
  }),
});

export const {
  useGetProfileQuery,
  useUpdateProfileMutation,
  useChangePasswordMutation,
  useChangePinMutation,
  useAdminUpdatePinMutation,
  useAdminUpdatePasswordMutation,
  useActivateUserMutation,
  useUploadAvatarMutation,
  useGetAllUsersSystemWideQuery,
} = usersApi;

