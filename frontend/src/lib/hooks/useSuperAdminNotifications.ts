'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  useClearAllSuperAdminNotificationsMutation,
  useClearSuperAdminNotificationMutation,
  useGetSuperAdminNotificationsQuery,
  useMarkAllSuperAdminNotificationsReadMutation,
  useMarkSuperAdminNotificationReadMutation,
} from '../api/endpoints/superAdminNotificationsApi';
import { useAppSelector } from '../store';

export const useSuperAdminNotifications = () => {
  const { user } = useAppSelector((state) => state.auth);
  const isSuperAdmin = user?.role?.toLowerCase() === 'super_admin';
  const [isOpen, setIsOpen] = useState(false);

  const {
    data,
    refetch,
    isFetching,
  } = useGetSuperAdminNotificationsQuery(
    { page: 1, limit: 20 },
    { skip: !isSuperAdmin || !isOpen },
  );

  const [markRead] = useMarkSuperAdminNotificationReadMutation();
  const [markAllRead] = useMarkAllSuperAdminNotificationsReadMutation();
  const [clearOne] = useClearSuperAdminNotificationMutation();
  const [clearAll] = useClearAllSuperAdminNotificationsMutation();

  // Trigger fetch when dropdown is opened
  useEffect(() => {
    if (isOpen && isSuperAdmin) {
      refetch();
    }
  }, [isOpen, isSuperAdmin, refetch]);

  const notifications = useMemo(() => data?.items || [], [data]);
  const unreadCount = data?.unreadCount || 0;

  const handleMarkRead = async (id: string) => {
    await markRead(id);
    refetch();
  };

  const handleMarkAll = async () => {
    await markAllRead();
    refetch();
  };

  const handleClear = async (id: string) => {
    await clearOne(id);
    refetch();
  };

  const handleClearAll = async () => {
    await clearAll();
    refetch();
  };

  return {
    isOpen,
    setIsOpen,
    isFetching,
    notifications,
    unreadCount,
    markAsRead: handleMarkRead,
    markAllAsRead: handleMarkAll,
    clearNotification: handleClear,
    clearAll: handleClearAll,
    refresh: refetch,
  };
};

