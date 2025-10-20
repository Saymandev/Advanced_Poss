import { apiSlice } from '@/lib/api/apiSlice';
import { setCredentials } from '@/lib/slices/authSlice';

export const authApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    findCompany: builder.mutation<any, { email?: string; companyId?: string }>({
      query: (body) => ({ url: '/auth/find-company', method: 'POST', body }),
    }),
    pinLoginWithRole: builder.mutation<any, { companyId: string; branchId: string; role: string; pin: string; userId?: string }>({
      query: (body) => ({ url: '/auth/login/pin-with-role', method: 'POST', body }),
      async onQueryStarted(arg, { dispatch, queryFulfilled }) {
        try {
          const { data } = await queryFulfilled
          const { user, tokens } = data
          dispatch(setCredentials({ user, accessToken: tokens.accessToken, refreshToken: tokens.refreshToken }))
        } catch {}
      },
    }),
    superAdminLogin: builder.mutation<any, { email: string; password: string }>({
      query: (body) => ({ url: '/auth/login/super-admin', method: 'POST', body }),
      async onQueryStarted(arg, { dispatch, queryFulfilled }) {
        try {
          const { data } = await queryFulfilled
          dispatch(setCredentials({ user: data.user, accessToken: data.tokens.accessToken, refreshToken: data.tokens.refreshToken }))
        } catch {}
      },
    }),
    refreshTokens: builder.mutation<{ accessToken: string; refreshToken: string }, { refreshToken: string }>({
      query: (body) => ({ url: '/auth/refresh', method: 'POST', body }),
    }),
    logout: builder.mutation<{ message: string }, void>({
      query: () => ({ url: '/auth/logout', method: 'POST' }),
    }),
  }),
})

export const { useFindCompanyMutation, usePinLoginWithRoleMutation, useSuperAdminLoginMutation, useRefreshTokensMutation, useLogoutMutation } = authApi


