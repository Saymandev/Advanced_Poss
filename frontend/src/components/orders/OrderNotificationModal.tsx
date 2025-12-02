'use client';

import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { useUpdateOrderStatusMutation } from '@/lib/api/endpoints/ordersApi';
import { formatCurrency } from '@/lib/utils';
import { 
  CheckCircleIcon, 
  XCircleIcon,
  ClockIcon,
  UserIcon,
  MapPinIcon,
  ShoppingBagIcon
} from '@heroicons/react/24/outline';
import { useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';

interface OrderNotificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: any;
}

export function OrderNotificationModal({ isOpen, onClose, order }: OrderNotificationModalProps) {
  const [updateOrderStatus, { isLoading: isUpdating }] = useUpdateOrderStatusMutation();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [hasPlayedSound, setHasPlayedSound] = useState(false);

  // Play notification sound when modal opens
  useEffect(() => {
    if (isOpen && order && !hasPlayedSound) {
      try {
        // Create audio context for notification sound
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        // Create a pleasant notification sound (two-tone chime)
        oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
        oscillator.frequency.setValueAtTime(1000, audioContext.currentTime + 0.1);
        
        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
        
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.5);
        
        setHasPlayedSound(true);
      } catch (error) {
        console.error('Failed to play notification sound:', error);
        // Fallback: Try using HTML5 audio if available
        try {
          const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBzGH0fPTgjMGHm7A7+OZUgwPVKzn77JcGAg+ltjyxnwsBSp+zfLZkUELFVuz6OytVhQKRaDf8sJtIQcxh9Hz04IzBh5uwO/jm');
          audio.volume = 0.5;
          audio.play().catch(() => {
            // Ignore audio play errors
          });
        } catch (audioError) {
          // Ignore fallback errors too
        }
      }
    }
  }, [isOpen, order, hasPlayedSound]);

  // Reset sound flag when modal closes
  useEffect(() => {
    if (!isOpen) {
      setHasPlayedSound(false);
    }
  }, [isOpen]);

  if (!order) return null;

  const handleConfirm = async () => {
    try {
      const orderId = order.id || order._id || order.orderId;
      await updateOrderStatus({
        id: orderId,
        status: 'confirmed',
      }).unwrap();
      
      toast.success(`Order #${order.orderNumber} confirmed`);
      onClose();
    } catch (error: any) {
      toast.error(error.data?.message || 'Failed to confirm order');
    }
  };

  const handleReject = async () => {
    try {
      const orderId = order.id || order._id || order.orderId;
      await updateOrderStatus({
        id: orderId,
        status: 'cancelled',
      }).unwrap();
      
      toast.success(`Order #${order.orderNumber} rejected`);
      onClose();
    } catch (error: any) {
      toast.error(error.data?.message || 'Failed to reject order');
    }
  };

  const items = order.items || [];
  const orderType = order.type || 'delivery';
  const customerName = order.customer?.firstName && order.customer?.lastName
    ? `${order.customer.firstName} ${order.customer.lastName}`
    : order.customerName || order.guestName || 'Guest';

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="flex items-center gap-3">
          <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-full">
            <ShoppingBagIcon className="w-6 h-6 text-green-600 dark:text-green-400" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white">
              New Order Received
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Order #{order.orderNumber}
            </p>
          </div>
        </div>
      }
      size="lg"
      className="z-[9999]"
    >
      <div className="space-y-6">
        {/* Order Summary */}
        <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ClockIcon className="w-5 h-5 text-gray-500" />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Order Type:
              </span>
            </div>
            <span className="px-3 py-1 text-sm font-semibold rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-400 capitalize">
              {orderType}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <UserIcon className="w-5 h-5 text-gray-500" />
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Customer:
            </span>
            <span className="text-sm text-gray-900 dark:text-white font-semibold">
              {customerName}
            </span>
          </div>

          {order.deliveryAddress && (
            <div className="flex items-start gap-2">
              <MapPinIcon className="w-5 h-5 text-gray-500 mt-0.5" />
              <div className="flex-1">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-1">
                  Delivery Address:
                </span>
                <span className="text-sm text-gray-900 dark:text-white">
                  {typeof order.deliveryAddress === 'string'
                    ? order.deliveryAddress
                    : [
                        order.deliveryAddress.street,
                        order.deliveryAddress.city,
                        order.deliveryAddress.zipCode,
                      ]
                        .filter(Boolean)
                        .join(', ')}
                </span>
              </div>
            </div>
          )}

          {order.specialInstructions && (
            <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-1">
                Special Instructions:
              </span>
              <span className="text-sm text-gray-900 dark:text-white">
                {order.specialInstructions}
              </span>
            </div>
          )}
        </div>

        {/* Order Items */}
        <div>
          <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
            Order Items
          </h4>
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {items.map((item: any, index: number) => (
              <div
                key={index}
                className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg"
              >
                <div className="flex-1">
                  <p className="font-medium text-gray-900 dark:text-white">
                    {item.name}
                  </p>
                  {item.specialInstructions && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      Note: {item.specialInstructions}
                    </p>
                  )}
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">
                    {item.quantity} × {formatCurrency(item.unitPrice || item.price || 0)}
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {formatCurrency((item.unitPrice || item.price || 0) * item.quantity)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Order Total */}
        <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
          <div className="flex items-center justify-between text-lg font-bold text-gray-900 dark:text-white">
            <span>Total:</span>
            <span className="text-2xl text-green-600 dark:text-green-400">
              {formatCurrency(order.total || 0)}
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
          <Button
            onClick={handleReject}
            disabled={isUpdating}
            variant="secondary"
            className="flex-1 flex items-center justify-center gap-2 bg-red-50 hover:bg-red-100 dark:bg-red-900/20 dark:hover:bg-red-900/30 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800"
          >
            <XCircleIcon className="w-5 h-5" />
            Reject Order
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={isUpdating}
            className="flex-1 flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white"
          >
            <CheckCircleIcon className="w-5 h-5" />
            Confirm Order
          </Button>
        </div>
      </div>
    </Modal>
  );
}

