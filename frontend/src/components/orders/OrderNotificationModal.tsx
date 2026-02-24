'use client';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { useRolePermissions } from '@/hooks/useRolePermissions';
import { useUpdateOrderStatusMutation } from '@/lib/api/endpoints/ordersApi';
import { useCreatePOSOrderMutation, type CreatePOSOrderRequest } from '@/lib/api/endpoints/posApi';
import { useAppSelector } from '@/lib/store';
import { formatCurrency } from '@/lib/utils';
import {
    CheckCircleIcon,
    ClockIcon,
    ComputerDesktopIcon,
    MapPinIcon,
    ShoppingBagIcon,
    UserIcon,
    XCircleIcon,
} from '@heroicons/react/24/outline';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
interface OrderNotificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: any;
}
export function OrderNotificationModal({ isOpen, onClose, order }: OrderNotificationModalProps) {
  const [updateOrderStatus, { isLoading: isUpdating }] = useUpdateOrderStatusMutation();
  const [createPOSOrder] = useCreatePOSOrderMutation();
  const { user } = useAppSelector((state) => state.auth);
  const router = useRouter();
  const { hasFeature } = useRolePermissions();
  const canAccessPOS = hasFeature('order-management');
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
      // First, update the public order status to confirmed
      await updateOrderStatus({
        id: orderId,
        status: 'confirmed',
      }).unwrap();
      // If this is a delivery order from public site, also create a POS delivery order
      const type = (order.type || order.orderType || 'delivery').toLowerCase();
      if (type === 'delivery') {
        const publicCustomer = order.customer || {};
        const publicAddress = order.deliveryAddress || {};
        const customerName =
          publicCustomer.firstName && publicCustomer.lastName
            ? `${publicCustomer.firstName} ${publicCustomer.lastName}`
            : order.customerName || order.guestName || 'Guest';
        // Extract menuItemId properly - handle both populated and non-populated cases
        const items = (order.items || []).map((item: any) => {
          // Try multiple ways to get menuItemId
          let menuItemId = item.menuItemId;
          if (!menuItemId || typeof menuItemId === 'object') {
            menuItemId = item.menuItemId?._id || item.menuItemId?.id || item.menuItemIdId || item.menuItemId;
          }
          if (!menuItemId) {
            console.error('⚠️ Could not extract menuItemId from item:', item);
          }
          return {
            menuItemId: menuItemId?.toString() || '',
            quantity: item.quantity || 1,
            price: item.price || item.unitPrice || 0,
            notes: item.notes || item.specialInstructions || '',
          };
        }).filter((item: any) => item.menuItemId); // Filter out items without menuItemId
        if (items.length === 0) {
          console.error('⚠️ No valid items found for POS order creation');
          toast.error('Failed to create POS order: No valid items found');
        } else {
          const deliveryPayload: CreatePOSOrderRequest = {
            orderType: 'delivery',
            deliveryFee: order.deliveryFee || 0,
            deliveryDetails: {
              contactName: customerName,
              contactPhone: publicCustomer.phone || '',
              addressLine1:
                typeof publicAddress === 'string'
                  ? publicAddress
                  : publicAddress.street || '',
              addressLine2: typeof publicAddress === 'string' ? undefined : publicAddress.addressLine2,
              city: typeof publicAddress === 'string' ? undefined : publicAddress.city,
              postalCode: typeof publicAddress === 'string' ? undefined : publicAddress.zipCode,
              instructions: order.specialInstructions || '',
              ...(order.deliveryZoneId ? { zoneId: order.deliveryZoneId } : {}),
            },
            items,
            customerInfo: {
              name: customerName,
              phone: publicCustomer.phone || '',
              email: publicCustomer.email || '',
            },
            totalAmount: order.total || 0,
            status: 'pending', // Keep as pending so it appears in POS queue
            paymentMethod: (order.paymentMethod as any) || 'cash',
            notes: [
              `Source: Online / Public Order #${order.orderNumber || orderId}`,
              order.specialInstructions || '',
            ]
              .filter(Boolean)
              .join('\n'),
            waiterId: user?.id, // assign to current user (owner/manager/waiter)
          };
          try {
            const posOrderResult = await createPOSOrder(deliveryPayload).unwrap();
            const newPOSOrderId = posOrderResult.id;
            toast.success(`Order confirmed and added to delivery queue! Order #${posOrderResult.orderNumber || posOrderResult.id}`);
            
            // Ask user if they want to process this order in POS right now - only if they have access
            if (canAccessPOS && newPOSOrderId && confirm('Order confirmed! Would you like to process it in POS now?')) {
              router.push(`/dashboard/pos?orderId=${newPOSOrderId}`);
            }
          } catch (posError: any) {
            console.error('❌ Failed to create POS delivery order from public order:', posError);
            const errorMessage = posError?.data?.message || posError?.message || 'Unknown error';
            toast.error(`Order confirmed, but failed to add to delivery queue: ${errorMessage}`);
            // Don't block confirmation if POS order creation fails, but show error
          }
        }
      } else {
        // For non-delivery orders, just confirm
        toast.success(`Order #${order.orderNumber} confirmed`);
      }
      onClose();
    } catch (error: any) {
      console.error('❌ Failed to confirm order:', error);
      toast.error(error.data?.message || error.message || 'Failed to confirm order');
    }
  };

  const handleProcessInPOS = () => {
    const orderId = order.id || order._id || order.orderId;
    router.push(`/dashboard/pos?orderId=${orderId}`);
    onClose();
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
  const customerPhone = order.customer?.phone;
  const customerEmail = order.customer?.email;
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`New Order Received - #${order.orderNumber}`}
      size="lg"
      className="z-[9999]"
    >
      <div className="space-y-6">
        {/* Header with icon */}
        <div className="flex items-center gap-3 pb-4 border-b border-gray-200 dark:border-gray-700">
          <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-full">
            <ShoppingBagIcon className="w-6 h-6 text-green-600 dark:text-green-400" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">
              Order #{order.orderNumber}
            </h3>
          </div>
        </div>
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
            <div className="flex flex-col">
              <span className="text-sm text-gray-900 dark:text-white font-semibold">
                {customerName}
              </span>
              {(customerPhone || customerEmail) && (
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {customerPhone ? `📞 ${customerPhone}` : ''}
                  {customerPhone && customerEmail ? ' • ' : ''}
                  {customerEmail ? `✉️ ${customerEmail}` : ''}
                </span>
              )}
            </div>
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
                {order.deliveryZoneName && (
                  <span className="text-xs text-blue-600 dark:text-blue-400 mt-1 block">
                    Zone: {order.deliveryZoneName}
                    {order.deliveryFee && order.deliveryFee > 0 && (
                      <span className="ml-2">• Delivery Fee: {formatCurrency(order.deliveryFee)}</span>
                    )}
                  </span>
                )}
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
            className="flex-2 flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white"
          >
            <CheckCircleIcon className="w-5 h-5" />
            Confirm Order
          </Button>
          {canAccessPOS && (
            <Button
              onClick={handleProcessInPOS}
              variant="secondary"
              className="flex-1 flex items-center justify-center gap-2"
            >
              <ComputerDesktopIcon className="w-5 h-5" />
              POS
            </Button>
          )}
        </div>
      </div>
    </Modal>
  );
}
