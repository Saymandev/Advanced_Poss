import { createSlice } from '@reduxjs/toolkit';

export type Theme = 'light' | 'dark' | 'system';

interface ThemeState {
  theme: Theme;
  systemTheme: 'light' | 'dark';
}

const initialState: ThemeState = {
  theme: 'system',
  systemTheme: 'light',
};

export const themeSlice = createSlice({
  name: 'theme',
  initialState,
  reducers: {
    setTheme: (state, action) => {
      state.theme = action.payload;
    },
    setSystemTheme: (state, action) => {
      state.systemTheme = action.payload;
    },
  },
});

export const { setTheme, setSystemTheme } = themeSlice.actions;
