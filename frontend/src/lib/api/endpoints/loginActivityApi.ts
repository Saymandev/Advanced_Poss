import { apiSlice } from '../apiSlice';

export interface LoginActivity {
  id: string;
  userId: string;
  userEmail: string;
  userName: string;
  companyId: string;
  companyName: string;
  branchId?: string;
  branchName?: string;
  action: 'login' | 'logout' | 'failed_login' | 'password_change' | 'pin_change' | 'role_change';
  ipAddress: string;
  userAgent: string;
  location?: {
    country: string;
    city: string;
    region: string;
  };
  device: {
    type: 'desktop' | 'mobile' | 'tablet';
    os: string;
    browser: string;
  };
  success: boolean;
  failureReason?: string;
  metadata?: Record<string, any>;
  createdAt: string;
}

export interface LoginSession {
  id: string;
  userId: string;
  sessionId: string;
  ipAddress: string;
  userAgent: string;
  location?: {
    country: string;
    city: string;
    region: string;
  };
  device: {
    type: 'desktop' | 'mobile' | 'tablet';
    os: string;
    browser: string;
  };
  isActive: boolean;
  lastActivity: string;
  createdAt: string;
  expiresAt: string;
}

export interface LoginStats {
  totalLogins: number;
  successfulLogins: number;
  failedLogins: number;
  uniqueUsers: number;
  activeSessions: number;
  topCountries: Array<{
    country: string;
    count: number;
  }>;
  topDevices: Array<{
    device: string;
    count: number;
  }>;
  loginTrends: Array<{
    date: string;
    logins: number;
    failures: number;
  }>;
  recentActivities: LoginActivity[];
}

export interface LoginDashboard {
  stats: LoginStats;
  recentActivities: LoginActivity[];
  activeSessions: LoginSession[];
  securityAlerts: Array<{
    type: 'suspicious_login' | 'multiple_failures' | 'unusual_location' | 'new_device';
    message: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    timestamp: string;
  }>;
}

export const loginActivityApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getActivities: builder.query<{ activities: LoginActivity[]; total: number }, any>({
      query: (params) => ({
        url: '/login-activity/activities',
        params,
      }),
      providesTags: ['LoginActivity'],
    }),
    getSessions: builder.query<{ sessions: LoginSession[]; total: number }, any>({
      query: (params) => ({
        url: '/login-activity/sessions',
        params,
      }),
      providesTags: ['LoginActivity'],
    }),
    getLoginStats: builder.query<LoginStats, any>({
      query: (params) => ({
        url: '/login-activity/stats',
        params,
      }),
      providesTags: ['LoginActivity'],
    }),
    getLoginDashboard: builder.query<LoginDashboard, any>({
      query: (params) => ({
        url: '/login-activity/dashboard',
        params,
      }),
      providesTags: ['LoginActivity'],
    }),
    logActivity: builder.mutation<LoginActivity, Partial<LoginActivity>>({
      query: (data) => ({
        url: '/login-activity/activities',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['LoginActivity'],
    }),
    createSession: builder.mutation<LoginSession, Partial<LoginSession>>({
      query: (data) => ({
        url: '/login-activity/sessions',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['LoginActivity'],
    }),
    updateSessionActivity: builder.mutation<LoginSession, { sessionId: string; activity: string }>({
      query: ({ sessionId, activity }) => ({
        url: `/login-activity/sessions/${sessionId}/activity`,
        method: 'PUT',
        body: { activity },
      }),
      invalidatesTags: ['LoginActivity'],
    }),
    terminateSession: builder.mutation<{ message: string }, string>({
      query: (sessionId) => ({
        url: `/login-activity/sessions/${sessionId}/terminate`,
        method: 'PUT',
      }),
      invalidatesTags: ['LoginActivity'],
    }),
    deleteUserSessions: builder.mutation<{ message: string }, string>({
      query: (userId) => ({
        url: `/login-activity/sessions/user/${userId}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['LoginActivity'],
    }),
    deleteCompanySessions: builder.mutation<{ message: string }, string>({
      query: (companyId) => ({
        url: `/login-activity/sessions/company/${companyId}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['LoginActivity'],
    }),
    cleanupExpiredSessions: builder.mutation<{ message: string; cleaned: number }, void>({
      query: () => ({
        url: '/login-activity/cleanup/expired-sessions',
        method: 'POST',
      }),
      invalidatesTags: ['LoginActivity'],
    }),
  }),
});

export const {
  useGetActivitiesQuery,
  useGetSessionsQuery,
  useGetLoginStatsQuery,
  useGetLoginDashboardQuery,
  useLogActivityMutation,
  useCreateSessionMutation,
  useUpdateSessionActivityMutation,
  useTerminateSessionMutation,
  useDeleteUserSessionsMutation,
  useDeleteCompanySessionsMutation,
  useCleanupExpiredSessionsMutation,
} = loginActivityApi;
