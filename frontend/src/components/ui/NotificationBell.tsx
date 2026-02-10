'use client';

import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { useNotifications } from '@/lib/hooks/useNotifications';
import { useSuperAdminNotifications } from '@/lib/hooks/useSuperAdminNotifications';
import { useAppSelector } from '@/lib/store';
import { formatDateTime } from '@/lib/utils';
import {
  BellIcon,
  CheckIcon,
  TrashIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import { useEffect, useRef, useState } from 'react';

interface NotificationBellProps {
  className?: string;
}

export function NotificationBell({ className }: NotificationBellProps) {
  const { user } = useAppSelector((state) => state.auth);
  const isSuperAdmin = user?.role?.toLowerCase() === 'super_admin';

  const superAdmin = useSuperAdminNotifications();
  const fallbackNotifications = useNotifications();
  const [localOpen, setLocalOpen] = useState(false);
  // Non-super-admin fetch state for panel hydration
  const [isFetchingFallback, setIsFetchingFallback] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);

  const apiBase = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1').replace(/\/$/, '');
  // Tokens are now in httpOnly cookies, so we don't need to manually extract them

  const branchId = (user as any)?.branchId;
  const companyId = (user as any)?.companyId;
  const userId = (user as any)?.id || (user as any)?._id;
  const userRole = (user as any)?.role?.toLowerCase();
  const features = Array.isArray((user as any)?.enabledFeatures) ? (user as any)?.enabledFeatures : [];

  // Super-admin endpoints for mark-read / mark-all
  const markSuperAdminRead = async (id: string) => {
    try {
      await fetch(`${apiBase}/super-admin/notifications/${id}/read`, {
        method: 'POST',
        credentials: 'include', // Important: send httpOnly cookies
      });
    } catch (err) {
      console.warn('Failed to mark super-admin notification read on server:', err);
    }
  };

  const markSuperAdminAllRead = async () => {
    try {
      await fetch(`${apiBase}/super-admin/notifications/read-all`, {
        method: 'POST',
        credentials: 'include', // Important: send httpOnly cookies
      });
    } catch (err) {
      console.warn('Failed to mark all super-admin notifications read on server:', err);
    }
  };

  const fetchFallbackNotifications = async () => {
    setIsFetchingFallback(true);
    try {
      const params = new URLSearchParams();
      if (companyId) params.append('companyId', companyId);
      if (branchId) params.append('branchId', branchId);
      if (userRole) params.append('role', userRole);
      if (userId) params.append('userId', typeof userId === 'string' ? userId : userId.toString());
      if (features.length > 0) params.append('features', features.join(','));

      const res = await fetch(`${apiBase}/notifications?${params.toString()}`, {
        credentials: 'include', // Important: send httpOnly cookies
      });
      const body = await res.json();
      const items = body?.data?.items || body?.items || body || [];
      if (Array.isArray(items)) {
        fallbackNotifications.hydrateNotifications(items);
      }
    } catch (err) {
      console.warn('Failed to fetch notifications:', err);
    } finally {
      setIsFetchingFallback(false);
      setHasLoaded(true);
    }
  };

  const markReadServer = async (id: string) => {
    try {
      await fetch(`${apiBase}/notifications/${id}/read`, {
        method: 'POST',
        credentials: 'include', // Important: send httpOnly cookies
      });
    } catch (err) {
      console.warn('Failed to mark notification read on server:', err);
    }
  };

  const markAllReadServer = async () => {
    try {
      const params = new URLSearchParams();
      if (companyId) params.append('companyId', companyId);
      if (branchId) params.append('branchId', branchId);
      if (userRole) params.append('role', userRole);
      if (userId) params.append('userId', typeof userId === 'string' ? userId : userId.toString());
      await fetch(`${apiBase}/notifications/read-all?${params.toString()}`, {
        method: 'POST',
        credentials: 'include', // Important: send httpOnly cookies
      });
    } catch (err) {
      console.warn('Failed to mark all notifications read on server:', err);
    }
  };

  const active = isSuperAdmin ? {
    ...superAdmin,
    markAsRead: async (id: string) => {
      superAdmin.markAsRead(id);
      await markSuperAdminRead(id);
    },
    markAllAsRead: async () => {
      superAdmin.markAllAsRead();
      await markSuperAdminAllRead();
    },
  } : {
    notifications: fallbackNotifications.notifications,
    unreadCount: fallbackNotifications.unreadCount,
    markAsRead: async (id: string) => {
      fallbackNotifications.markAsRead(id);
      await markReadServer(id);
    },
    markAllAsRead: async () => {
      fallbackNotifications.markAllAsRead();
      await markAllReadServer();
    },
    clearNotification: fallbackNotifications.clearNotification,
    clearAll: fallbackNotifications.clearAll,
    refresh: fetchFallbackNotifications,
    isFetching: isFetchingFallback,
    isOpen: localOpen,
    setIsOpen: setLocalOpen,
  };

  const {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    clearNotification,
    clearAll,
    setIsOpen,
    isOpen,
    refresh,
    isFetching,
  } = active as any;
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [setIsOpen]);

  // Load notifications when panel first opens (non-super-admin path)
  useEffect(() => {
    if (!isSuperAdmin && active.isOpen && !hasLoaded) {
      fetchFallbackNotifications();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active.isOpen, isSuperAdmin]);

  const getNotificationIcon = (type: string) => {
    const icons = {
      order: '🛎️',
      payment: '💳',
      kitchen: '🍳',
      system: '⚙️',
      promotion: '🎉',
    };
    return icons[type as keyof typeof icons] || '🔔';
  };

  const getNotificationColor = (type: string) => {
    const colors = {
      order: 'text-blue-600',
      payment: 'text-green-600',
      kitchen: 'text-orange-600',
      system: 'text-gray-600',
      promotion: 'text-purple-600',
    };
    return colors[type as keyof typeof colors] || 'text-gray-600';
  };

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2"
      >
        <BellIcon className="w-5 h-5 text-gray-600 dark:text-gray-400" />
        {unreadCount > 0 && (
          <Badge
            variant="danger"
            className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 text-xs flex items-center justify-center"
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </Badge>
        )}
      </Button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-96 max-h-96 bg-white dark:bg-gray-900 rounded-lg shadow-lg border border-gray-200 dark:border-gray-800 z-50 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-800">
            <h3 className="font-semibold text-gray-900 dark:text-white">Notifications</h3>
            <div className="flex items-center gap-2">
              {isSuperAdmin && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => refresh?.()}
                  className="text-xs"
                  disabled={isFetching}
                >
                  {isFetching ? 'Refreshing...' : 'Refresh'}
                </Button>
              )}
              {unreadCount > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={markAllAsRead}
                  className="text-xs"
                >
                  <CheckIcon className="w-4 h-4 mr-1" />
                  Mark all read
                </Button>
              )}
              {notifications.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearAll}
                  className="text-xs text-red-600 hover:text-red-700"
                >
                  <TrashIcon className="w-4 h-4 mr-1" />
                  Clear all
                </Button>
              )}
            </div>
          </div>

          {/* Notifications List */}
          <div className="max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="p-8 text-center">
                <BellIcon className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-500 dark:text-gray-400">No notifications yet</p>
                <p className="text-sm text-gray-400 mt-1">We'll notify you when something happens</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-200 dark:divide-gray-800">
                {notifications.map((notification: any) => (
                  <div
                    key={notification.id}
                    className={`p-4 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer transition-colors ${!notification.read ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                      }`}
                    onClick={() => markAsRead(notification.id)}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`text-lg ${getNotificationColor(notification.type)}`}>
                        {getNotificationIcon(notification.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <p className={`text-sm font-medium ${!notification.read ? 'text-gray-900 dark:text-white' : 'text-gray-700 dark:text-gray-300'
                              }`}>
                              {notification.title}
                            </p>
                            <p className={`text-sm mt-1 ${!notification.read ? 'text-gray-700 dark:text-gray-300' : 'text-gray-600 dark:text-gray-400'
                              }`}>
                              {notification.message}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                              {formatDateTime(notification.timestamp)}
                            </p>
                          </div>
                          <div className="flex items-center gap-1 ml-2">
                            {!notification.read && (
                              <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                clearNotification(notification.id);
                              }}
                              className="opacity-0 group-hover:opacity-100 p-1"
                            >
                              <XMarkIcon className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="p-3 border-t border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsOpen(false)}
                className="w-full text-sm"
              >
                Close
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}