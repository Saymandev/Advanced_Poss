'use client';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { useGetBranchBySlugQuery, useGetCompanyBySlugQuery, useTrackOrderQuery, useGetLiveTrackingQuery } from '@/lib/api/endpoints/publicApi';
import { usePublicSocket } from '@/lib/hooks/usePublicSocket';
import { formatCurrency, formatDateTime } from '@/lib/utils';
import {
  CheckCircleIcon,
  ClockIcon,
  HomeIcon,
  PhoneIcon,
  XCircleIcon,
  MapIcon,
  ArrowLeftIcon
} from '@heroicons/react/24/outline';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import dynamic from 'next/dynamic';

const LiveTrackingMap = dynamic(
  () => import('@/components/tracking/LiveTrackingMap'),
  { ssr: false, loading: () => <div className="animate-pulse bg-gray-200 dark:bg-gray-800 rounded-lg h-[400px] w-full flex items-center justify-center"><MapIcon className="w-12 h-12 text-gray-400" /></div> }
);

export default function OrderTrackingPage() {
  const params = useParams();
  const companySlug = params.companySlug as string;
  const branchSlug = params.branchSlug as string;
  const orderId = params.orderId as string;
  const { 
    data: company, 
    isLoading: companyLoading,
    isError: companyError 
  } = useGetCompanyBySlugQuery(companySlug, {
    skip: !companySlug,
  });
  const { 
    data: orderData, 
    isLoading: orderLoading, 
    isError: orderError,
    error: orderErrorData,
    refetch: refetchOrder
  } = useTrackOrderQuery({ orderId, companySlug, branchSlug }, {
    skip: !orderId,
    // WebSocket handles real-time updates, API call is for initial load and fallback
  });

  const { data: liveTrackingData } = useGetLiveTrackingQuery(
    { orderId, companySlug, branchSlug },
    { 
      skip: !orderId, 
      pollingInterval: 30000 // Poll every 30s as fallback if WS fails
    }
  );

  const { data: branch } = useGetBranchBySlugQuery({ companySlug, branchSlug }, {
    skip: !companySlug || !branchSlug,
  });

  const contactPhone = orderData?.data?.branchId?.phone || branch?.phone || company?.phone;
  // Local state for real-time order updates
  const [order, setOrder] = useState<any>(null);
  
  // Local state for live tracking
  const [riderLocation, setRiderLocation] = useState<any>(null);
  const [isFollowingRider, setIsFollowingRider] = useState(true);

  // WebSocket for real-time updates
  const { socket, isConnected, joinOrder, leaveOrder } = usePublicSocket();
  
  // Update local order state when data loads
  useEffect(() => {
    if (orderData) {
      setOrder(orderData);
    }
  }, [orderData]);

  // Update tracking state when data loads
  useEffect(() => {
    if (liveTrackingData?.data?.riderLocation) {
      setRiderLocation(liveTrackingData.data.riderLocation);
    }
  }, [liveTrackingData]);

  // Join order room for real-time updates
  // Support both orderId (MongoDB _id) and orderNumber
  useEffect(() => {
    if (!orderId || !isConnected || !order) return;
    // Use order._id if available, otherwise use orderId from URL (could be orderNumber)
    const orderRoomId = (order as any)?._id || (order as any)?.id || orderId;
    if (orderRoomId) {
      joinOrder(orderRoomId);
    }
    return () => {
      if (orderRoomId) {
        leaveOrder(orderRoomId);
      }
    };
  }, [orderId, order, isConnected, joinOrder, leaveOrder]);

  // Listen for real-time order status updates and location updates
  useEffect(() => {
    if (!socket || !isConnected || !orderId) return;
    
    const handleStatusChange = (data: any) => {
      // Match order by orderId, order.id, order._id, or order.orderNumber
      const receivedOrderId = data.orderId || data.order?.id || data.order?._id;
      const currentOrderId = order?.id || order?._id || orderId;
      if (receivedOrderId === currentOrderId || 
          receivedOrderId === orderId ||
          data.order?.orderNumber === order?.orderNumber) {
        // Update local order state with new data
        if (data.order) {
          setOrder((prevOrder: any) => ({
            ...prevOrder,
            ...data.order,
            status: data.status || data.order.status || prevOrder?.status,
          }));
        } else if (data.status) {
          // If only status was sent, update status and refetch for full data
          setOrder((prevOrder: any) => ({
            ...prevOrder,
            status: data.status,
          }));
          // Refetch after a short delay to get full updated order data
          setTimeout(() => {
            refetchOrder();
          }, 500);
        }
        // Show toast notification for status changes
        const statusMessages: Record<string, string> = {
          confirmed: 'Your order has been confirmed! 🎉',
          preparing: 'Your order is being prepared! 👨‍🍳',
          ready: 'Your order is ready! ✅',
          served: 'Your order is out for delivery! 🚚',
          completed: 'Your order has been delivered! 🎊',
          cancelled: 'Your order has been cancelled. ❌',
        };
        if (data.status && statusMessages[data.status] && order?.status !== data.status) {
          const isError = data.status === 'cancelled';
          toast[isError ? 'error' : 'success'](statusMessages[data.status], {
            duration: 6000,
            icon: isError ? '⚠️' : '✅',
          });
        }
      }
    };

    const handleLocationUpdate = (data: any) => {
      if (data.orderId === orderId || data.orderId === order?.id || data.orderId === order?._id) {
        setRiderLocation({
          lat: data.lat,
          lng: data.lng,
          heading: data.heading,
          speed: data.speed,
        });
      }
    };

    const handleRiderAssigned = (data: any) => {
      if (data.orderId === orderId || data.orderId === order?.id || data.orderId === order?._id) {
        toast.success(`Rider ${data.riderInfo?.name || 'assigned'} is picking up your order!`);
        refetchOrder();
      }
    };

    socket.on('order:status-changed', handleStatusChange);
    socket.on('order:updated', handleStatusChange);
    socket.on('delivery:status-changed', handleStatusChange);
    socket.on('rider:location-update', handleLocationUpdate);
    socket.on('delivery:rider-assigned', handleRiderAssigned);
    
    return () => {
      socket.off('order:status-changed', handleStatusChange);
      socket.off('order:updated', handleStatusChange);
      socket.off('delivery:status-changed', handleStatusChange);
      socket.off('rider:location-update', handleLocationUpdate);
      socket.off('delivery:rider-assigned', handleRiderAssigned);
    };
  }, [socket, isConnected, orderId, order, refetchOrder]);
  useEffect(() => {
    if (companyError) {
      toast.error('Failed to load company information');
    }
    if (orderError) {
      const errorMessage = (orderErrorData as any)?.data?.message || 'Failed to load order';
      toast.error(errorMessage);
    }
  }, [companyError, orderError, orderErrorData]);
  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      pending: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300',
      confirmed: 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300',
      preparing: 'bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-300',
      ready: 'bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300',
      served: 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300',
      completed: 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300',
      cancelled: 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300',
    };
    return colors[status] || 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-300';
  };
  const getStatusIcon = (status: string) => {
    if (status === 'completed' || status === 'served') return CheckCircleIcon;
    if (status === 'cancelled') return XCircleIcon;
    return ClockIcon;
  };
  const getStatusSteps = () => {
    if (!order) return [];
    const steps = [
      { key: 'pending', label: 'Order Placed', time: (order as any).createdAt },
      { key: 'confirmed', label: 'Confirmed', time: (order as any).confirmedAt },
      { key: 'preparing', label: 'Preparing', time: (order as any).startedPreparingAt },
      { key: 'ready', label: 'Ready', time: (order as any).readyAt },
    ];
    if (order.orderType === 'delivery' || order.type === 'delivery') {
      steps.push({ key: 'served', label: 'Out for Delivery', time: (order as any).servedAt });
      steps.push({ key: 'completed', label: 'Delivered', time: (order as any).completedAt });
    } else {
      steps.push({ key: 'completed', label: 'Completed', time: (order as any).completedAt });
    }
    return steps;
  };
  const getCurrentStepIndex = () => {
    const status = order?.status || 'pending';
    const statusOrder = ['pending', 'confirmed', 'preparing', 'ready', 'served', 'completed'];
    return statusOrder.indexOf(status);
  };
  if (companyLoading || orderLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading order details...</p>
        </div>
      </div>
    );
  }
  if (orderError || !order) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center px-4">
        <Card className="max-w-2xl w-full">
          <CardContent className="p-8 text-center">
            <XCircleIcon className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Order Not Found</h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              We couldn't find an order with that ID. Please check your order number.
            </p>
            <Link href={`/${companySlug}/${branchSlug}/shop`}>
              <Button>Back to Shop</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }
  const StatusIcon = getStatusIcon(order.status);
  const steps = getStatusSteps();
  const currentStep = getCurrentStepIndex();

  const isDelivery = order.orderType === 'delivery' || order.type === 'delivery';
  const showLiveTracking = isDelivery && (
    order.status === 'ready' || 
    order.status === 'served' || 
    order.status === 'completed' ||
    order.status === 'out_for_delivery' ||
    order.status === 'assigned' ||
    order.status === 'picked_up' ||
    order.deliveryStatus === 'out_for_delivery' ||
    !!riderLocation // show map as soon as rider location exists
  );
  return (
    <div className="h-[100dvh] w-full flex flex-col md:flex-row bg-gray-50 dark:bg-gray-900 overflow-hidden">
      {/* Left Sidebar */}
      <div className="w-full md:w-[400px] h-[50vh] md:h-full flex flex-col flex-shrink-0 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 shadow-xl z-10 order-2 md:order-1">
        
        {/* Header */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-800 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <Link href={`/${companySlug}/${branchSlug}/shop`}>
              <Button variant="ghost" size="sm" className="text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white -ml-2">
                <ArrowLeftIcon className="w-4 h-4 mr-2" />
                Order list
              </Button>
            </Link>
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`}></div>
              <span className="text-xs text-gray-500 hidden sm:inline">Live route refreshes every 5s</span>
            </div>
          </div>
          
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">
              {order.orderNumber || orderId}
            </h1>
            <Badge className={getStatusColor(order.status)}>
              {order.status?.toUpperCase() || 'UNKNOWN'}
            </Badge>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto">
          {/* Rider Section */}
          {liveTrackingData?.data?.riderInfo && order.status === 'served' && (
            <div className="p-4 border-b border-gray-100 dark:border-gray-800">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">Rider</h3>
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                  <span className="font-bold text-lg">{liveTrackingData.data.riderInfo.name?.charAt(0) || 'R'}</span>
                </div>
                <div className="flex-1">
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Rider Name</p>
                  <p className="font-medium text-gray-900 dark:text-white">{liveTrackingData.data.riderInfo.name || 'Your Rider'}</p>
                </div>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Vehicle</p>
                  <p className="font-medium text-gray-900 dark:text-white">{liveTrackingData.data.riderInfo.vehicleNumber || 'On the way'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Phone</p>
                  {liveTrackingData.data.riderInfo.phone ? (
                    <a href={`tel:${liveTrackingData.data.riderInfo.phone}`} className="font-medium text-primary-600 hover:underline flex items-center gap-1">
                      <PhoneIcon className="w-3 h-3" /> Call Rider
                    </a>
                  ) : (
                    <p className="font-medium text-gray-900 dark:text-white">-</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* History Timeline */}
          <div className="p-4 border-b border-gray-100 dark:border-gray-800">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">Dispatch History</h3>
            <div className="space-y-6">
              {steps.map((step, index) => {
                const isCompleted = index <= currentStep;
                const isCurrent = index === currentStep;
                
                return (
                  <div key={step.key} className="flex gap-4">
                    <div className="relative flex flex-col items-center">
                      <div className={`w-3 h-3 rounded-full flex-shrink-0 z-10 ${
                        isCompleted 
                          ? 'bg-green-500' 
                          : isCurrent
                            ? 'bg-primary-500 animate-pulse'
                            : 'bg-gray-300 dark:bg-gray-700'
                      }`} />
                      {index !== steps.length - 1 && (
                        <div className={`w-0.5 h-full absolute top-3 ${
                          index < currentStep ? 'bg-green-500' : 'bg-gray-200 dark:bg-gray-800'
                        }`} />
                      )}
                    </div>
                    <div className="flex-1 pb-2">
                      <div className="flex justify-between items-start">
                        <p className={`text-sm font-medium ${isCurrent || isCompleted ? 'text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-500'}`}>
                          {step.label}
                        </p>
                        {isCompleted && (
                          <span className="text-[10px] font-medium text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/30 px-2 py-0.5 rounded">
                            {step.key === 'confirmed' ? 'Accepted' : 'Completed'}
                          </span>
                        )}
                      </div>
                      {step.time ? (
                        <p className="text-xs text-gray-500 mt-0.5">{formatDateTime(step.time)}</p>
                      ) : isCurrent ? (
                        <p className="text-xs text-primary-600 mt-0.5">In progress...</p>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Locations */}
          <div className="p-4 border-b border-gray-100 dark:border-gray-800">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">Locations</h3>
            <div className="space-y-4">
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Pickup</p>
                <p className="text-sm text-gray-900 dark:text-white">
                  {liveTrackingData?.data?.pickupLocation?.address || branch?.address?.street || 'Restaurant Location'}
                </p>
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Dropoff</p>
                <p className="text-sm text-gray-900 dark:text-white">
                  {liveTrackingData?.data?.dropoffLocation?.address || order?.deliveryAddress?.street || 'Customer Location'}
                </p>
              </div>
            </div>
          </div>

          {/* Order Items */}
          <div className="p-4">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">Order Items</h3>
            <div className="space-y-3">
              {order.items?.map((item: any, index: number) => (
                <div key={index} className="flex justify-between items-start border-b border-gray-100 dark:border-gray-800 pb-3 last:border-0 last:pb-0">
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">{item.name || `Item ${index + 1}`}</p>
                    <p className="text-xs text-gray-500 mt-0.5">Qty: {item.quantity || 1}</p>
                    {item.specialInstructions && (
                      <p className="text-[10px] text-gray-500 italic mt-0.5">{item.specialInstructions}</p>
                    )}
                  </div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    {formatCurrency(item.totalPrice || item.price * (item.quantity || 1))}
                  </p>
                </div>
              ))}
            </div>
            
            <div className="mt-4 pt-3 border-t border-gray-200 dark:border-gray-800 space-y-2">
              <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400">
                <span>Subtotal</span>
                <span>{formatCurrency(order.subtotal || 0)}</span>
              </div>
              {(order.taxAmount || 0) > 0 && (
                <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400">
                  <span>Tax</span>
                  <span>{formatCurrency(order.taxAmount)}</span>
                </div>
              )}
              {(order.deliveryFee || 0) > 0 && (
                <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400">
                  <span>Delivery Fee</span>
                  <span>{formatCurrency(order.deliveryFee)}</span>
                </div>
              )}
              {(order.discountAmount || 0) > 0 && (
                <div className="flex justify-between text-sm text-green-600 dark:text-green-400">
                  <span>Discount</span>
                  <span>-{formatCurrency(order.discountAmount)}</span>
                </div>
              )}
              <div className="flex justify-between text-base font-bold text-gray-900 dark:text-white pt-2 border-t border-gray-200 dark:border-gray-800">
                <span>Total</span>
                <span>{formatCurrency(order.totalAmount || order.total || 0)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Map Panel */}
      <div className="flex-1 relative h-[50vh] md:h-full bg-gray-100 dark:bg-gray-900 order-1 md:order-2">
        {showLiveTracking ? (
          <>
            <div className="absolute inset-0 z-0">
              <LiveTrackingMap 
                riderLocation={riderLocation}
                pickupLocation={liveTrackingData?.data?.pickupLocation}
                dropoffLocation={liveTrackingData?.data?.dropoffLocation}
                isFollowingRider={isFollowingRider}
              />
            </div>
            {/* Overlay UI on map */}
            <div className="absolute bottom-6 left-6 right-6 md:right-auto flex flex-col sm:flex-row gap-4 z-10">
              {liveTrackingData?.data?.estimatedDeliveryMinutes && (
                <div className="bg-white/90 dark:bg-gray-900/90 backdrop-blur shadow-xl rounded-xl px-4 py-3 border border-gray-200 dark:border-gray-800">
                  <p className="text-[10px] text-gray-500 uppercase font-bold tracking-wider">ETA</p>
                  <p className="text-xl font-bold text-primary-600">{liveTrackingData.data.estimatedDeliveryMinutes} min</p>
                </div>
              )}
              {riderLocation && (
                <div className="bg-white/90 dark:bg-gray-900/90 backdrop-blur shadow-xl rounded-xl px-4 py-3 border border-gray-200 dark:border-gray-800 flex items-center">
                  <label className="flex items-center gap-2 text-sm font-medium cursor-pointer text-gray-900 dark:text-white">
                    <input 
                      type="checkbox" 
                      checked={isFollowingRider}
                      onChange={(e) => setIsFollowingRider(e.target.checked)}
                      className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                    />
                    Follow Rider
                  </label>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="absolute inset-0 flex items-center justify-center flex-col bg-gray-50 dark:bg-gray-900 p-6 text-center z-10">
            <MapIcon className="w-16 h-16 text-gray-300 dark:text-gray-700 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Live Tracking Unavailable</h3>
            <p className="text-gray-500 dark:text-gray-400 max-w-sm">Live tracking will appear here once your order is out for delivery.</p>
          </div>
        )}
      </div>
    </div>
  );
}
