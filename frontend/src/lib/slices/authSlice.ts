import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  companyId?: string;
  branchId?: string;
  isSuperAdmin?: boolean;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface Company {
  id: string;
  name: string;
  slug: string;
  logoUrl?: string;
}

export interface Branch {
  id: string;
  name: string;
  address: string;
  isActive: boolean;
  availableRoles: string[];
}

export interface AuthState {
  user: User | null;
  tokens: AuthTokens | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  loginStep: 'email' | 'company' | 'pin' | 'complete';
  selectedCompany: Company | null;
  selectedBranch: Branch | null;
  selectedRole: string;
}

const initialState: AuthState = {
  user: null,
  tokens: null,
  isAuthenticated: false,
  isLoading: false,
  loginStep: 'email',
  selectedCompany: null,
  selectedBranch: null,
  selectedRole: '',
};

export const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setUser: (state, action: PayloadAction<User>) => {
      state.user = action.payload;
      state.isAuthenticated = true;
    },
    setTokens: (state, action: PayloadAction<AuthTokens>) => {
      state.tokens = action.payload;
    },
    setLoginStep: (state, action: PayloadAction<AuthState['loginStep']>) => {
      state.loginStep = action.payload;
    },
    setSelectedCompany: (state, action: PayloadAction<Company | null>) => {
      state.selectedCompany = action.payload;
    },
    setSelectedBranch: (state, action: PayloadAction<Branch | null>) => {
      state.selectedBranch = action.payload;
    },
    setSelectedRole: (state, action: PayloadAction<string>) => {
      state.selectedRole = action.payload;
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
    },
    logout: (state) => {
      state.user = null;
      state.tokens = null;
      state.isAuthenticated = false;
      state.loginStep = 'email';
      state.selectedCompany = null;
      state.selectedBranch = null;
      state.selectedRole = '';
    },
    resetLoginFlow: (state) => {
      state.loginStep = 'email';
      state.selectedCompany = null;
      state.selectedBranch = null;
      state.selectedRole = '';
    },
    setCredentials: (state, action: PayloadAction<{ user: User; tokens: AuthTokens }>) => {
      state.user = action.payload.user;
      state.tokens = action.payload.tokens;
      state.isAuthenticated = true;
    },
  },
});

export const {
  setUser,
  setTokens,
  setLoginStep,
  setSelectedCompany,
  setSelectedBranch,
  setSelectedRole,
  setLoading,
  logout,
  resetLoginFlow,
  setCredentials,
} = authSlice.actions;
