'use client';
import { OrderNotificationModal } from './OrderNotificationModal';
import { useAppSelector } from '@/lib/store';
import { useSocket } from '@/lib/hooks/useSocket';
import { useEffect, useState } from 'react';
export function OrderNotificationManager() {
  const { user } = useAppSelector((state) => state.auth);
  const { socket, isConnected } = useSocket();
  const [pendingOrders, setPendingOrders] = useState<any[]>([]);
  const [currentOrder, setCurrentOrder] = useState<any | null>(null);
  // Check if user is owner or manager
  const isOwnerOrManager = user && (user.role === 'owner' || user.role === 'manager');
  useEffect(() => {
    if (!socket || !isConnected || !isOwnerOrManager) return;
    const handleNewOrder = (orderData: any) => {
      // Only show modal for customer orders (public orders from website), not POS orders
      // Check multiple ways to identify customer orders:
      // 1. Check for explicit flag
      // 2. Check order number prefix (PUB = customer order, POS- = POS order)
      // 3. Check order source
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
        // Check if order already exists to avoid duplicates
        const orderId = orderData.id || orderData._id || orderData.orderId;
        const exists = prev.some((o) => (o.id || o._id || o.orderId) === orderId);
        if (exists) {
          return prev;
        }
        return [...prev, orderData];
      });
    };
    socket.on('order:new', handleNewOrder);
    return () => {
      socket.off('order:new', handleNewOrder);
    };
  }, [socket, isConnected, isOwnerOrManager]);
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
  // Don't render anything if user is not owner or manager
  if (!isOwnerOrManager) {
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