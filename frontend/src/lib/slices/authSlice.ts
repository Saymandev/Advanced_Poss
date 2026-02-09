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
  avatar?: string;
  permissions?: string[];
}

export interface AuthState {
  user: User | null;
  // Tokens are now stored in httpOnly cookies, not in state/localStorage
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
        // Tokens are now in httpOnly cookies, not passed here
        accessToken?: string; // Optional for backward compatibility during migration
        refreshToken?: string; // Optional for backward compatibility during migration
      }>
    ) => {
      state.user = action.payload.user;
      state.isAuthenticated = true;

      // Store minimal user data (exclude sensitive fields like email, phone)
      // Tokens are in httpOnly cookies, not stored in localStorage
      if (typeof window !== 'undefined') {
        const minimalUser = {
          id: action.payload.user.id,
          firstName: action.payload.user.firstName,
          lastName: action.payload.user.lastName,
          role: action.payload.user.role,
          companyId: action.payload.user.companyId,
          branchId: action.payload.user.branchId,
          isSuperAdmin: action.payload.user.isSuperAdmin,
          permissions: action.payload.user.permissions,
        };
        localStorage.setItem('user', JSON.stringify(minimalUser));

        // Clear old tokens from localStorage if they exist (migration cleanup)
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
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
      state.isAuthenticated = false;
      state.companyContext = undefined;

      // Clear localStorage (tokens are cleared by backend via httpOnly cookies)
      if (typeof window !== 'undefined') {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('user');
        localStorage.removeItem('companyContext');
      }
    },
    restoreAuth: (state) => {
      if (typeof window !== 'undefined') {
        const userStr = localStorage.getItem('user');
        const companyContextStr = localStorage.getItem('companyContext');

        // Always restore companyContext if it exists (for login flow)
        if (companyContextStr) {
          try {
            state.companyContext = JSON.parse(companyContextStr);
          } catch (error) {
            // Silent error - invalid JSON, just skip restoration
          }
        }

        // Restore user data if exists
        // Note: Authentication is verified via httpOnly cookies, not localStorage tokens
        if (userStr) {
          try {
            const parsedUser = JSON.parse(userStr);

            // Sanitize companyId and branchId to ensure they're strings, not objects
            const sanitizedUser = {
              ...parsedUser,
              companyId: typeof parsedUser.companyId === 'object' ? parsedUser.companyId?._id || parsedUser.companyId?.id || null : parsedUser.companyId,
              branchId: typeof parsedUser.branchId === 'object' ? parsedUser.branchId?._id || parsedUser.branchId?.id || null : parsedUser.branchId,
            };

            state.user = sanitizedUser;
            // Set authenticated if user exists (actual auth verified by backend via cookies)
            state.isAuthenticated = true;
          } catch (error) {
            // Silent error - invalid JSON
          }
        }

        // Clear old tokens from localStorage (migration cleanup)
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
      }
    },
    restoreCompanyContext: (state) => {
      if (typeof window !== 'undefined') {
        const companyContextStr = localStorage.getItem('companyContext');
        if (companyContextStr) {
          try {
            state.companyContext = JSON.parse(companyContextStr);
          } catch (error) {
            // Silent error - invalid JSON, just skip restoration
          }
        }
      }
    },
    setUser: (state, action: PayloadAction<Partial<User>>) => {
      if (state.user) {
        state.user = { ...state.user, ...action.payload };

        // Update localStorage with minimal user data (exclude sensitive fields)
        if (typeof window !== 'undefined') {
          const minimalUser = {
            id: state.user.id,
            firstName: state.user.firstName,
            lastName: state.user.lastName,
            role: state.user.role,
            companyId: state.user.companyId,
            branchId: state.user.branchId,
            isSuperAdmin: state.user.isSuperAdmin,
            permissions: state.user.permissions,
          };
          localStorage.setItem('user', JSON.stringify(minimalUser));
        }
      }
    },
  },
});

export const { setCredentials, setCompanyContext, clearCompanyContext, logout, restoreAuth, restoreCompanyContext, setUser } = authSlice.actions;
export default authSlice.reducer;

