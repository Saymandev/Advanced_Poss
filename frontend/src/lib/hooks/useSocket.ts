'use client';

import { useAppSelector } from '@/lib/store';
import { useCallback, useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { useNotifications } from './useNotifications';

// Get socket URL from environment or default to API URL
const getSocketUrl = () => {
  if (typeof window === 'undefined') return 'http://localhost:5000';
  
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1';
  // Extract base URL (remove /api/v1 if present)
  const baseUrl = apiUrl.replace(/\/api\/v1$/, '');
  return baseUrl;
};

const SOCKET_URL = getSocketUrl();

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
  const { addNotification } = useNotifications();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const branchIdRef = useRef<string | null>(null);
  const tableIdRef = useRef<string | null>(null);

  const branchId = (user as any)?.branchId || 
                   (companyContext as any)?.branchId || 
                   (companyContext as any)?.branches?.[0]?._id ||
                   (companyContext as any)?.branches?.[0]?.id;

  // Initialize socket connection
  useEffect(() => {
    if (!branchId) return;

    const token = typeof window !== 'undefined' 
      ? localStorage.getItem('token') || sessionStorage.getItem('token')
      : null;

    const newSocket = io(`${SOCKET_URL}/ws`, {
      transports: ['websocket', 'polling'],
      auth: token ? { token } : undefined,
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
    });

    newSocket.on('connect', () => {
      console.log('✅ Socket.IO connected:', newSocket.id);
      setIsConnected(true);
      
      // Auto-join branch room
      if (branchId) {
        newSocket.emit('join-branch', { branchId });
        branchIdRef.current = branchId;
      }
    });

    newSocket.on('disconnect', () => {
      console.log('❌ Socket.IO disconnected');
      setIsConnected(false);
    });

    newSocket.on('connect_error', (error) => {
      console.error('Socket.IO connection error:', error);
    });

    // Order events
    newSocket.on('order:new', (data: any) => {
      console.log('📦 New order received:', data);
      addNotification({
        type: 'order',
        title: 'New Order',
        message: `Order #${data.orderNumber || data.id} has been created`,
        data: { orderId: data.id || data._id, order: data },
      });
    });

    // Review events
    newSocket.on('system:notification', (data: any) => {
      if (data.type === 'review') {
        console.log('⭐ New review received:', data);
        addNotification({
          type: 'review',
          title: data.title || 'New Review',
          message: data.message || 'A customer left a review',
          data: data.data || {},
        });
      } else {
        // Handle other system notifications
        console.log('🔔 System notification:', data);
        addNotification({
          type: data.type || 'info',
          title: data.title || 'Notification',
          message: data.message || '',
          data: data.data || {},
        });
      }
    });

    newSocket.on('order:updated', (data: any) => {
      console.log('📦 Order updated:', data);
    });

    newSocket.on('order:status-changed', (data: any) => {
      console.log('📦 Order status changed:', data);
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
    });

    newSocket.on('order:payment-received', (data: any) => {
      console.log('💳 Payment received:', data);
      addNotification({
        type: 'payment',
        title: 'Payment Received',
        message: `Payment of ${data.payment?.amount || 0} received for order #${data.order?.orderNumber || data.orderId}`,
        data: { orderId: data.orderId, payment: data.payment },
      });
    });

    // Kitchen events
    newSocket.on('kitchen:new-order', (data: any) => {
      console.log('🍳 Kitchen: New order:', data);
      addNotification({
        type: 'kitchen',
        title: 'New Kitchen Order',
        message: `Order #${data.orderNumber || data.id} sent to kitchen`,
        data: { orderId: data.id || data._id, order: data },
      });
    });

    newSocket.on('kitchen:order-received', (data: any) => {
      console.log('🍳 Kitchen: Order received:', data);
    });

    newSocket.on('kitchen:order-status-changed', (data: any) => {
      console.log('🍳 Kitchen: Order status changed:', data);
    });

    newSocket.on('kitchen:item-ready', (data: any) => {
      console.log('🍳 Kitchen: Item ready:', data);
      addNotification({
        type: 'kitchen',
        title: 'Item Ready',
        message: `Item from order #${data.orderId} is ready`,
        data: { orderId: data.orderId, itemId: data.itemId },
      });
    });

    // Inventory events
    newSocket.on('inventory:low-stock', (data: any) => {
      console.log('⚠️ Low stock alert:', data);
      addNotification({
        type: 'system',
        title: 'Low Stock Alert',
        message: `${data.name} is low on stock (${data.currentStock} ${data.ingredient?.unit || ''} remaining)`,
        data: { ingredientId: data.ingredientId, ingredient: data.ingredient },
      });
    });

    newSocket.on('inventory:out-of-stock', (data: any) => {
      console.log('🚨 Out of stock alert:', data);
      addNotification({
        type: 'system',
        title: 'Out of Stock Alert',
        message: `${data.name} is out of stock`,
        data: { ingredientId: data.ingredientId, ingredient: data.ingredient },
      });
    });

    newSocket.on('inventory:stock-updated', (data: any) => {
      console.log('📊 Stock updated:', data);
    });

    // Table events
    newSocket.on('table:status-changed', (data: any) => {
      console.log('🪑 Table status changed:', data);
    });

    newSocket.on('table:order-created', (data: any) => {
      console.log('🪑 Table order created:', data);
    });

    newSocket.on('table:payment-received', (data: any) => {
      console.log('🪑 Table payment received:', data);
    });

    // System events
    newSocket.on('system:alert', (data: any) => {
      console.log('⚠️ System alert:', data);
      addNotification({
        type: 'system',
        title: data.title || 'System Alert',
        message: data.message || JSON.stringify(data),
        data,
      });
    });

    newSocket.on('system:notification', (data: any) => {
      console.log('🔔 System notification:', data);
      addNotification({
        type: 'system',
        title: data.title || 'Notification',
        message: data.message || JSON.stringify(data),
        data,
      });
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
  }, [branchId, addNotification]);

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

