'use client';
import { useRolePermissions } from '@/hooks/useRolePermissions';
import { useSocket } from '@/lib/hooks/useSocket';
import { useAppSelector } from '@/lib/store';
import { useEffect, useState } from 'react';
import { OrderNotificationModal } from './OrderNotificationModal';

export function OrderNotificationManager() {
  const { user } = useAppSelector((state) => state.auth);
  const { socket, isConnected } = useSocket();
  const { hasFeature } = useRolePermissions();
  const canAccessPOS = hasFeature('order-management');
  
  const [pendingOrders, setPendingOrders] = useState<any[]>([]);
  const [currentOrder, setCurrentOrder] = useState<any | null>(null);
  
  // Check if user is owner, manager, cashier or waiter
  const isAuthorizedRole = user && ['owner', 'manager', 'cashier', 'waiter'].includes(user.role);
  
  useEffect(() => {
    if (!socket || !isConnected || !isAuthorizedRole || !canAccessPOS) return;
    
    const handleNewOrder = (orderData: any) => {
      // Only show modal for customer orders (public orders from website), not POS orders
      const orderNumber = orderData.orderNumber || '';
      const isCustomerOrder = 
        orderData.isCustomerOrder === true || 
        orderData.orderSource === 'customer' ||
        (orderNumber && (
          orderNumber.startsWith('PUB') || 
          orderNumber.includes('PUB-')
        ));
      
      // Skip POS orders (they start with POS-)
      const isPOSOrder = orderNumber && (
        orderNumber.startsWith('POS-') ||
        orderNumber.startsWith('POS')
      );
      
      if (isPOSOrder || !isCustomerOrder) {
        return;
      }
      
      // Add order to pending queue
      setPendingOrders((prev) => {
        const orderId = orderData.id || orderData._id || orderData.orderId;
        const exists = prev.some((o) => (o.id || o._id || o.orderId) === orderId);
        if (exists) {
          return prev;
        }
        return [...prev, orderData];
      });
    };
    
    const handleStatusChanged = (payload: any) => {
      const orderId = payload.orderId || payload.id;
      const status = payload.status;

      if (status === 'confirmed' || status === 'cancelled') {
        setPendingOrders((prev) => prev.filter((o) => (o.id || o._id || o.orderId) !== orderId));
        
        setCurrentOrder((prev: any) => {
          if (prev && (prev.id || prev._id || prev.orderId) === orderId) {
            return null;
          }
          return prev;
        });
      }
    };

    socket.on('order:new', handleNewOrder);
    socket.on('order:status-changed', handleStatusChanged);
    return () => {
      socket.off('order:new', handleNewOrder);
      socket.off('order:status-changed', handleStatusChanged);
    };
  }, [socket, isConnected, isAuthorizedRole, canAccessPOS]);

  // Show next order from queue when current one is closed
  useEffect(() => {
    if (!currentOrder && pendingOrders.length > 0) {
      const nextOrder = pendingOrders[0];
      setCurrentOrder(nextOrder);
      setPendingOrders((prev) => prev.slice(1));
    }
  }, [currentOrder, pendingOrders]);

  const handleCloseModal = () => {
    setCurrentOrder(null);
  };

  // Don't render anything if user is not in an authorized role or lacks POS access
  if (!isAuthorizedRole || !canAccessPOS) {
    return null;
  }

  return (
    <OrderNotificationModal
      isOpen={!!currentOrder}
      onClose={handleCloseModal}
      order={currentOrder}
    />
  );
}
