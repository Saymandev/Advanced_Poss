'use client';
import { useAppSelector } from '@/lib/store';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { io, Socket } from 'socket.io-client';
import { useNotifications } from './useNotifications';
// Play LOUD notification sound for waiter order assignments
const playLoudNotificationSound = () => {
  try {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    // Create a loud, attention-grabbing sound (bell/doorbell-like)
    const frequencies = [800, 1000, 1200]; // Three tones for attention
    const duration = 0.3; // 300ms
    frequencies.forEach((freq, index) => {
      setTimeout(() => {
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        oscillator.frequency.setValueAtTime(freq, audioContext.currentTime);
        oscillator.type = 'sine';
        // LOUD volume (0.8 = 80% volume for maximum attention)
        gainNode.gain.setValueAtTime(0, audioContext.currentTime);
        gainNode.gain.linearRampToValueAtTime(0.8, audioContext.currentTime + 0.01);
        gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + duration);
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + duration);
      }, index * 100); // Stagger the tones
    });
  } catch (error) {
    console.warn('Could not play loud notification sound:', error);
    // Fallback: Try simpler beep sound
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      oscillator.frequency.setValueAtTime(1000, audioContext.currentTime);
      oscillator.type = 'sine';
      gainNode.gain.setValueAtTime(0, audioContext.currentTime);
      gainNode.gain.linearRampToValueAtTime(0.8, audioContext.currentTime + 0.01);
      gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.5);
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.5);
    } catch (fallbackError) {
      console.error('All sound methods failed:', fallbackError);
    }
  }
};
// Get socket URL from environment or default to API URL
const getBaseUrls = () => {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1';
  const baseUrl = apiUrl.replace(/\/api\/v1$/, '');
  return { apiUrl, baseUrl };
};
const { apiUrl: API_URL, baseUrl: SOCKET_URL } = getBaseUrls();
interface UseSocketReturn {
  socket: Socket | null;
  isConnected: boolean;
  joinBranch: (branchId: string) => void;
  leaveBranch: (branchId: string) => void;
  joinKitchen: (branchId: string) => void;
  leaveKitchen: (branchId: string) => void;
  joinTable: (tableId: string) => void;
  leaveTable: (tableId: string) => void;
}
export const useSocket = (): UseSocketReturn => {
  const { user, companyContext } = useAppSelector((state) => state.auth);
  const { addNotification, hydrateNotifications } = useNotifications();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const branchIdRef = useRef<string | null>(null);
  const tableIdRef = useRef<string | null>(null);

  // Memoize computed values to prevent infinite re-renders
  const userRole = useMemo(() => (user as any)?.role?.toLowerCase(), [user]);
  const isWaiter = useMemo(() => userRole === 'waiter' || userRole === 'server', [userRole]);
  const isSuperAdmin = useMemo(() => userRole === 'super_admin', [userRole]);

  const branchId = useMemo(() => {
    return (user as any)?.branchId ||
      (companyContext as any)?.branchId ||
      (companyContext as any)?.branches?.[0]?._id ||
      (companyContext as any)?.branches?.[0]?.id;
  }, [user, companyContext]);

  const companyId = useMemo(() => {
    return (user as any)?.companyId ||
      (companyContext as any)?.companyId ||
      (companyContext as any)?._id ||
      (companyContext as any)?.id;
  }, [user, companyContext]);

  const userId = useMemo(() => {
    return (user as any)?.id || (user as any)?._id;
  }, [user]);

  const features = useMemo(() => {
    const userFeatures = (user as any)?.enabledFeatures || [];
    const contextFeatures = (companyContext as any)?.enabledFeatures || [];
    return (userFeatures.length > 0 ? userFeatures : contextFeatures) as string[];
  }, [user, companyContext]);
  // Initialize socket connection
  // Only initialize if user is logged in (has user or is super admin with branchId)
  useEffect(() => {
    // Don't initialize during login flow when there's no user yet
    if (!user && !isSuperAdmin) return;
    // Don't initialize if no branchId and not super admin
    if (!branchId && !isSuperAdmin) return;
    const newSocket = io(`${SOCKET_URL}/ws`, {
      transports: ['websocket', 'polling'],
      auth: {
        userId,
        branchId,
        companyId,
        role: userRole,
        features: Array.isArray(features) ? features : [],
      },
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
    });
    newSocket.on('connect', async () => {
      setIsConnected(true);
      // Auto-join branch room
      if (branchId) {
        newSocket.emit('join-branch', { branchId });
        branchIdRef.current = branchId;
      }
      // Join role room (for super admin notifications)
      if (userRole) {
        newSocket.emit('join-role', { role: userRole });
      }
      // Auto-join user room for personal notifications
      if (userId) {
        const userIdStr = typeof userId === 'string' ? userId : userId.toString();
        newSocket.emit('join-user', { userId: userIdStr });
      } else {
        console.warn('⚠️ No user ID found for joining user room');
      }
      // Hydrate notifications from server on connect
      try {
        const params = new URLSearchParams();
        if (companyId) params.append('companyId', companyId);
        if (branchId) params.append('branchId', branchId);
        if (userRole) params.append('role', userRole);
        if (userId) params.append('userId', typeof userId === 'string' ? userId : userId.toString());
        if (features && features.length > 0) params.append('features', features.join(','));
        const res = await fetch(`${API_URL}/notifications?${params.toString()}`, {
          credentials: 'include', // Important: send httpOnly cookies
        });
        const body = await res.json();
        const items = body?.data?.items || body?.items || body || [];
        if (Array.isArray(items)) {
          hydrateNotifications(items);
        }
      } catch (err) {
        console.warn('Failed to hydrate notifications from server:', err);
      }
    });
    newSocket.on('disconnect', () => {
      setIsConnected(false);
    });
    newSocket.on('connect_error', (error) => {
      console.error('Socket.IO connection error:', error);
    });
    // Order events
    newSocket.on('order:new', (data: any) => {
      // Waiters should NOT get general order:new notifications - they only get order:assigned
      if (!isWaiter) {
        addNotification({
          type: 'order',
          title: 'New Order',
          message: `Order #${data.orderNumber || data.id} has been created`,
          data: { orderId: data.id || data._id, order: data },
        });
      }
    });
    // Review events
    newSocket.on('system:notification', (data: any) => {
      if (data.type === 'review') {
        addNotification({
          type: 'review',
          title: data.title || 'New Review',
          message: data.message || 'A customer left a review',
          data: data.data || {},
        });
      } else {
        // Handle other system notifications
        addNotification({
          type: data.type || 'info',
          title: data.title || 'Notification',
          message: data.message || '',
          data: data.data || {},
        });
      }
    });
    // Scoped notifications (company/branch/role/user/features)
    newSocket.on('notification', (data: any) => {
      addNotification({
        type: (data?.type as any) || 'system',
        title: data?.title || 'Notification',
        message: data?.message || '',
        data: data?.metadata || data?.data || {},
      });
    });
    newSocket.on('order:updated', (_data: any) => {
      // Order updated event handler
    });
    newSocket.on('order:status-changed', (data: any) => {
      // Waiters should only get status changes for their assigned orders
      if (!isWaiter) {
        const statusMessages: Record<string, string> = {
          'pending': 'Order is pending',
          'preparing': 'Order is being prepared',
          'ready': 'Order is ready',
          'completed': 'Order completed',
          'cancelled': 'Order cancelled',
        };
        addNotification({
          type: 'order',
          title: 'Order Status Updated',
          message: `Order #${data.order?.orderNumber || data.orderId}: ${statusMessages[data.status] || data.status}`,
          data: { orderId: data.orderId, order: data.order },
        });
      }
    });
    newSocket.on('order:payment-received', (data: any) => {
      // Waiters should NOT get payment notifications
      if (!isWaiter) {
        addNotification({
          type: 'payment',
          title: 'Payment Received',
          message: `Payment of ${data.payment?.amount || 0} received for order #${data.order?.orderNumber || data.orderId}`,
          data: { orderId: data.orderId, payment: data.payment },
        });
      }
    });
    // Waiter-specific order assignment notification
    newSocket.on('order:assigned', (data: any) => {
      const orderNumber = data.orderNumber || data.order?.orderNumber || 'N/A';
      // Extract table number from multiple possible locations
      const tableNumber = data.tableNumber
        || data.order?.tableNumber
        || data.order?.tableId?.tableNumber
        || data.order?.tableId?.number
        || (typeof data.order?.tableId === 'object' && data.order.tableId ? (data.order.tableId as any).tableNumber || (data.order.tableId as any).number : undefined)
        || undefined;
      const tableInfo = tableNumber ? `Table #${tableNumber}` : (data.orderType || data.order?.orderType || 'Order');
      const itemsCount = data.items?.length || data.order?.items?.length || 0;
      const notes = data.notes || data.order?.notes || '';
      // Add to notification system
      addNotification({
        type: 'order',
        title: 'New Order Assigned',
        message: `${tableInfo} - Order #${orderNumber} (${itemsCount} items)`,
        data: {
          orderId: data.orderId || data.order?.id,
          orderNumber,
          tableNumber: tableNumber,
          orderType: data.orderType || data.order?.orderType,
          totalAmount: data.totalAmount || data.order?.totalAmount,
          items: data.items || data.order?.items || [],
          notes,
          order: data.order || data,
        },
      });
      // Play LOUD notification sound
      try {
        playLoudNotificationSound();
      } catch (soundError) {
        console.error('🛎️ [WAITER] Failed to play notification sound:', soundError);
      }
      // Show automatic toast popup with order details
      // Use setTimeout to ensure toast renders after notification is added
      setTimeout(() => {
        try {
          const toastMessage = notes
            ? `🛎️ New Order Assigned!\n${tableInfo} - Order #${orderNumber}\n${itemsCount} item${itemsCount !== 1 ? 's' : ''}\n📝 Note: ${notes}`
            : `🛎️ New Order Assigned!\n${tableInfo} - Order #${orderNumber}\n${itemsCount} item${itemsCount !== 1 ? 's' : ''}`;
          // Create custom toast with prominent close button
          toast.custom(
            (t) => (
              React.createElement('div', {
                className: t.visible ? 'animate-enter' : 'animate-leave',
                style: {
                  background: '#3b82f6',
                  color: '#fff',
                  padding: '16px',
                  minWidth: '320px',
                  maxWidth: '400px',
                  borderRadius: '8px',
                  boxShadow: '0 10px 25px rgba(0, 0, 0, 0.2)',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '12px',
                  zIndex: 9999,
                  position: 'relative',
                },
              }, [
                React.createElement('span', { key: 'icon', style: { fontSize: '24px' } }, '🛎️'),
                React.createElement('div', { key: 'content', style: { flex: 1, whiteSpace: 'pre-line', fontSize: '14px', lineHeight: '1.5' } }, toastMessage),
                React.createElement('button', {
                  key: 'close',
                  onClick: () => toast.dismiss(t.id),
                  style: {
                    background: 'rgba(255, 255, 255, 0.2)',
                    border: 'none',
                    borderRadius: '4px',
                    color: '#fff',
                    cursor: 'pointer',
                    padding: '4px 8px',
                    fontSize: '18px',
                    fontWeight: 'bold',
                    minWidth: '28px',
                    height: '28px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'background 0.2s',
                  },
                  onMouseEnter: (e: React.MouseEvent<HTMLButtonElement>) => {
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.3)';
                  },
                  onMouseLeave: (e: React.MouseEvent<HTMLButtonElement>) => {
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)';
                  },
                  title: 'Close',
                }, '×'),
              ])
            ),
            {
              duration: Infinity, // Don't auto-close - user must manually close
              position: 'top-right',
            }
          );
        } catch (toastError) {
          console.error('🛎️ [WAITER] Failed to show toast:', toastError);
        }
      }, 100);
    });
    // Kitchen events - waiters should NOT get these
    newSocket.on('kitchen:new-order', (data: any) => {
      if (!isWaiter) {
        addNotification({
          type: 'kitchen',
          title: 'New Kitchen Order',
          message: `Order #${data.orderNumber || data.id} sent to kitchen`,
          data: { orderId: data.id || data._id, order: data },
        });
      }
    });
    newSocket.on('kitchen:order-received', (_data: any) => {
      // Kitchen order received event handler
    });
    newSocket.on('kitchen:order-status-changed', (_data: any) => {
      // Kitchen order status changed event handler
    });
    newSocket.on('kitchen:item-ready', (data: any) => {
      // Waiters can get item ready notifications for their orders
      if (!isWaiter) {
        addNotification({
          type: 'kitchen',
          title: 'Item Ready',
          message: `Item from order #${data.orderId} is ready`,
          data: { orderId: data.orderId, itemId: data.itemId },
        });
      }
    });
    // Inventory events - waiters should NOT get these
    newSocket.on('inventory:low-stock', (data: any) => {
      if (!isWaiter) {
        addNotification({
          type: 'system',
          title: 'Low Stock Alert',
          message: `${data.name} is low on stock (${data.currentStock} ${data.ingredient?.unit || ''} remaining)`,
          data: { ingredientId: data.ingredientId, ingredient: data.ingredient },
        });
      }
    });
    newSocket.on('inventory:out-of-stock', (data: any) => {
      if (!isWaiter) {
        addNotification({
          type: 'system',
          title: 'Out of Stock Alert',
          message: `${data.name} is out of stock`,
          data: { ingredientId: data.ingredientId, ingredient: data.ingredient },
        });
      }
    });
    newSocket.on('inventory:stock-updated', (_data: any) => {
      // Inventory stock updated event handler
    });
    // Table events
    newSocket.on('table:status-changed', (_data: any) => {
      // Table status changed event handler
    });
    newSocket.on('table:order-created', (_data: any) => {
      // Table order created event handler
    });
    newSocket.on('table:payment-received', (_data: any) => {
      // Table payment received event handler
    });
    // System events - waiters should NOT get these
    newSocket.on('system:alert', (data: any) => {
      if (!isWaiter) {
        addNotification({
          type: 'system',
          title: data.title || 'System Alert',
          message: data.message || JSON.stringify(data),
          data,
        });
      }
    });
    newSocket.on('system:notification', (data: any) => {
      // Waiters should only get review notifications, not other system notifications
      if (!isWaiter || data.type === 'review') {
        if (data.type === 'review') {
          addNotification({
            type: 'review',
            title: data.title || 'New Review',
            message: data.message || 'A customer left a review',
            data: data.data || {},
          });
        } else if (!isWaiter) {
          addNotification({
            type: 'system',
            title: data.title || 'Notification',
            message: data.message || JSON.stringify(data),
            data,
          });
        }
      }
    });
    setSocket(newSocket);
    return () => {
      if (branchIdRef.current) {
        newSocket.emit('leave-branch', { branchId: branchIdRef.current });
      }
      if (tableIdRef.current) {
        newSocket.emit('leave-table', { tableId: tableIdRef.current });
      }
      newSocket.close();
    };
  }, [branchId, addNotification, user, isWaiter, userRole, companyId, features, hydrateNotifications, isSuperAdmin, userId]);
  const joinBranch = useCallback((branchId: string) => {
    if (socket && socket.connected) {
      socket.emit('join-branch', { branchId });
      branchIdRef.current = branchId;
    }
  }, [socket]);
  const leaveBranch = useCallback((branchId: string) => {
    if (socket && socket.connected) {
      socket.emit('leave-branch', { branchId });
      branchIdRef.current = null;
    }
  }, [socket]);
  const joinKitchen = useCallback((branchId: string) => {
    if (socket && socket.connected) {
      socket.emit('join-kitchen', { branchId });
    }
  }, [socket]);
  const leaveKitchen = useCallback((branchId: string) => {
    if (socket && socket.connected) {
      socket.emit('leave-kitchen', { branchId });
    }
  }, [socket]);
  const joinTable = useCallback((tableId: string) => {
    if (socket && socket.connected) {
      socket.emit('join-table', { tableId });
      tableIdRef.current = tableId;
    }
  }, [socket]);
  const leaveTable = useCallback((tableId: string) => {
    if (socket && socket.connected) {
      socket.emit('leave-table', { tableId });
      tableIdRef.current = null;
    }
  }, [socket]);
  return {
    socket,
    isConnected,
    joinBranch,
    leaveBranch,
    joinKitchen,
    leaveKitchen,
    joinTable,
    leaveTable,
  };
};
