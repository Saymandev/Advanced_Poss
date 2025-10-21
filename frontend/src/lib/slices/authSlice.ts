import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  companyId: string | null;
  branchId: string | null;
  isSuperAdmin?: boolean;
  phoneNumber?: string;
}

export interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  companyContext?: {
    companyId: string;
    companyName: string;
    companySlug: string;
    logoUrl?: string;
    branches: any[];
  };
}

const initialState: AuthState = {
  user: null,
  accessToken: null,
  refreshToken: null,
  isAuthenticated: false,
  companyContext: undefined,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setCredentials: (
      state,
      action: PayloadAction<{
        user: User;
        accessToken: string;
        refreshToken: string;
      }>
    ) => {
      state.user = action.payload.user;
      state.accessToken = action.payload.accessToken;
      state.refreshToken = action.payload.refreshToken;
      state.isAuthenticated = true;
      
      // Save to localStorage
      if (typeof window !== 'undefined') {
        localStorage.setItem('accessToken', action.payload.accessToken);
        localStorage.setItem('refreshToken', action.payload.refreshToken);
        localStorage.setItem('user', JSON.stringify(action.payload.user));
      }
    },
    setCompanyContext: (state, action: PayloadAction<any>) => {
      state.companyContext = action.payload;
      
      // Save to localStorage
      if (typeof window !== 'undefined') {
        localStorage.setItem('companyContext', JSON.stringify(action.payload));
      }
    },
    clearCompanyContext: (state) => {
      state.companyContext = undefined;
      if (typeof window !== 'undefined') {
        localStorage.removeItem('companyContext');
      }
    },
    logout: (state) => {
      state.user = null;
      state.accessToken = null;
      state.refreshToken = null;
      state.isAuthenticated = false;
      state.companyContext = undefined;
      
      // Clear localStorage
      if (typeof window !== 'undefined') {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('user');
        localStorage.removeItem('companyContext');
      }
    },
    restoreAuth: (state) => {
      if (typeof window !== 'undefined') {
        const accessToken = localStorage.getItem('accessToken');
        const refreshToken = localStorage.getItem('refreshToken');
        const userStr = localStorage.getItem('user');
        const companyContextStr = localStorage.getItem('companyContext');
        
        if (accessToken && refreshToken && userStr) {
          state.accessToken = accessToken;
          state.refreshToken = refreshToken;
          state.user = JSON.parse(userStr);
          state.isAuthenticated = true;
          
          if (companyContextStr) {
            state.companyContext = JSON.parse(companyContextStr);
          }
        }
      }
    },
  },
});

export const { setCredentials, setCompanyContext, clearCompanyContext, logout, restoreAuth } = authSlice.actions;
export default authSlice.reducer;

