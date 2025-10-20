import type { RootState } from '@/lib/store'
import { BaseQueryFn, createApi, FetchArgs, fetchBaseQuery } from '@reduxjs/toolkit/query/react'

const BASE_URL = 'http://localhost:5000/api/v1'

const rawBaseQuery = fetchBaseQuery({
  baseUrl: BASE_URL,
  prepareHeaders: (headers, { getState }) => {
    const state = getState() as RootState
    const token = state.auth.accessToken
    if (token) {
      headers.set('authorization', `Bearer ${token}`)
    }
    headers.set('content-type', 'application/json')
    return headers
  },
})

const baseQueryWithReauth: BaseQueryFn<string | FetchArgs, unknown, unknown> = async (args, api, extraOptions) => {
  let result: any = await rawBaseQuery(args, api, extraOptions)
  if (result?.error && (result.error as any).status === 401) {
    const refreshToken = (api.getState() as RootState).auth.refreshToken
    if (!refreshToken) return result
    const refreshResult: any = await rawBaseQuery(
      { url: '/auth/refresh', method: 'POST', body: { refreshToken } },
      api,
      extraOptions
    )
    if (refreshResult.data) {
      api.dispatch({ type: 'auth/setTokens', payload: refreshResult.data })
      result = await rawBaseQuery(args, api, extraOptions)
    } else {
      api.dispatch({ type: 'auth/logout' })
    }
  }
  return result
}

export const apiSlice = createApi({
  reducerPath: 'api',
  baseQuery: baseQueryWithReauth,
  tagTypes: [
    'Auth','Users','Companies','Company','Branches','Categories','MenuItems','Tables','Orders','Payments','Customers','Kitchen','Ingredients','Suppliers','Expenses','Attendance','Subscriptions','SubscriptionPlans','Reports','Backups','AI','Websockets','WorkPeriods','LoginActivity'
  ],
  endpoints: () => ({}),
})


