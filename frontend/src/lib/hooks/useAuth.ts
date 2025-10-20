"use client";
import type { RootState } from '@/lib/store';
import { useSelector } from 'react-redux';

export function useAuth() {
  const { user, accessToken, refreshToken } = useSelector((s: RootState) => s.auth)
  const isAuthenticated = Boolean(accessToken && user)
  return { user, accessToken, refreshToken, isAuthenticated }
}


