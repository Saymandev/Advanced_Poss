"use client";
import { useAuth } from '@/lib/hooks/useAuth';
import type { UserRole } from '@/lib/slices/authSlice';
import { ReactNode } from 'react';

export function RoleGuard({ allow, children }: { allow: UserRole[]; children: ReactNode }) {
  const { user } = useAuth()
  if (!user) return null
  if (!allow.includes(user.role)) return null
  return <>{children}</>
}


