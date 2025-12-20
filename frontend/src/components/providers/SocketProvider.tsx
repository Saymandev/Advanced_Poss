'use client';

import { useSocket } from '@/lib/hooks/useSocket';
import { useAppSelector } from '@/lib/store';
import { useEffect, useMemo } from 'react';

export function SocketProvider({ children }: { children: React.ReactNode }) {
  const { isConnected, joinKitchen } = useSocket();
  const { user, companyContext } = useAppSelector((state) => state.auth);

  const branchId = useMemo(() => {
    return (user as any)?.branchId || 
           (companyContext as any)?.branchId || 
           (companyContext as any)?.branches?.[0]?._id ||
           (companyContext as any)?.branches?.[0]?.id;
  }, [user, companyContext]);

  // Auto-join kitchen room when connected
  // Only join if user is logged in (has user or companyContext)
  useEffect(() => {
    if (isConnected && branchId && (user || companyContext)) {
      joinKitchen(branchId);
    }
  }, [isConnected, branchId, joinKitchen, user, companyContext]);

  return <>{children}</>;
}

