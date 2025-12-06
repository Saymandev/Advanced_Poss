import { apiSlice } from '../apiSlice';

export interface SuperAdminNotification {
  id: string;
  type: string;
  title: string;
  message: string;
  companyId?: string;
  metadata?: Record<string, any>;
  createdAt: string;
  readAt?: string;
}

export interface NotificationsListResponse {
  items: SuperAdminNotification[];
  total: number;
  unreadCount: number;
}

export const superAdminNotificationsApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getSuperAdminNotifications: builder.query<NotificationsListResponse, { page?: number; limit?: number }>({
      query: ({ page = 1, limit = 20 } = {}) => ({
        url: '/super-admin/notifications',
        params: { page, limit },
      }),
      providesTags: ['SuperAdminNotifications'],
    }),
    getSuperAdminUnreadCount: builder.query<number, void>({
      query: () => '/super-admin/notifications/unread-count',
      providesTags: ['SuperAdminNotifications'],
    }),
    markSuperAdminNotificationRead: builder.mutation<void, string>({
      query: (id) => ({
        url: `/super-admin/notifications/${id}/read`,
        method: 'POST',
      }),
      invalidatesTags: ['SuperAdminNotifications'],
    }),
    markAllSuperAdminNotificationsRead: builder.mutation<void, void>({
      query: () => ({
        url: `/super-admin/notifications/read-all`,
        method: 'POST',
      }),
      invalidatesTags: ['SuperAdminNotifications'],
    }),
    clearSuperAdminNotification: builder.mutation<void, string>({
      query: (id) => ({
        url: `/super-admin/notifications/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['SuperAdminNotifications'],
    }),
    clearAllSuperAdminNotifications: builder.mutation<void, void>({
      query: () => ({
        url: `/super-admin/notifications`,
        method: 'DELETE',
      }),
      invalidatesTags: ['SuperAdminNotifications'],
    }),
  }),
});

export const {
  useGetSuperAdminNotificationsQuery,
  useGetSuperAdminUnreadCountQuery,
  useMarkSuperAdminNotificationReadMutation,
  useMarkAllSuperAdminNotificationsReadMutation,
  useClearSuperAdminNotificationMutation,
  useClearAllSuperAdminNotificationsMutation,
} = superAdminNotificationsApi;

