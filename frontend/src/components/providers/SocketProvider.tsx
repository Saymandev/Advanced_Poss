'use client';

import { useSocket } from '@/lib/hooks/useSocket';
import { useAppSelector } from '@/lib/store';
import { useEffect } from 'react';

export function SocketProvider({ children }: { children: React.ReactNode }) {
  const { isConnected, joinKitchen } = useSocket();
  const { user, companyContext } = useAppSelector((state) => state.auth);

  const branchId = (user as any)?.branchId || 
                   (companyContext as any)?.branchId || 
                   (companyContext as any)?.branches?.[0]?._id ||
                   (companyContext as any)?.branches?.[0]?.id;

  // Auto-join kitchen room when connected
  useEffect(() => {
    if (isConnected && branchId) {
      joinKitchen(branchId);
    }
  }, [isConnected, branchId, joinKitchen]);

  return <>{children}</>;
}

