'use client';

import React, { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { 
  useGetPOSOrderQuery, 
  useUpdateRiderLocationMutation,
  useUpdateDeliveryStatusMutation
} from '@/lib/api/endpoints/posApi';
import { formatCurrency } from '@/lib/utils';
import { 
  MapPinIcon, 
  PhoneIcon, 
  CheckCircleIcon, 
  ArrowLeftIcon, 
  ExclamationTriangleIcon,
  UserIcon,
  ShoppingBagIcon,
  CurrencyDollarIcon,
  SignalIcon,
  StopIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';
import { useParams, useRouter } from 'next/navigation';
import toast from 'react-hot-toast';

export default function RiderActiveDeliveryPage() {
  const params = useParams();
  const router = useRouter();
  const orderId = params.orderId as string;

  const { data: orderData, isLoading } = useGetPOSOrderQuery(orderId, {
    skip: !orderId,
    pollingInterval: 10000
  });
  
  const [updateLocation] = useUpdateRiderLocationMutation();
  const [updateStatus] = useUpdateDeliveryStatusMutation();

  const [isTracking, setIsTracking] = useState(false);
  const [isOffline, setIsOffline] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [watchId, setWatchId] = useState<number | null>(null);
  const [isCompleting, setIsCompleting] = useState(false);
  const [lastPings, setLastPings] = useState<number>(0);
  const [showLocationModal, setShowLocationModal] = useState(false);

  const order = orderData as any;

  // Cleanup watcher when component unmounts
  useEffect(() => {
    return () => {
      if (watchId !== null) {
        navigator.geolocation.clearWatch(watchId);
      }
    };
  }, [watchId]);

  // Network connection listener
  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    if (typeof window !== 'undefined') {
      setIsOffline(!navigator.onLine);
      window.addEventListener('online', handleOnline);
      window.addEventListener('offline', handleOffline);

      return () => {
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
      };
    }
  }, []);

  // Check location permission on mount — show custom modal if not yet granted
  useEffect(() => {
    if (typeof window === 'undefined' || !('permissions' in navigator)) return;
    navigator.permissions.query({ name: 'geolocation' }).then((result) => {
      if (result.state === 'prompt') {
        // Permission hasn't been asked yet — show our custom modal to prime the user
        setShowLocationModal(true);
      } else if (result.state === 'denied') {
        setLocationError('Location permission denied. Please allow location access to continue tracking.');
      }
      // If 'granted', do nothing — rider can start tracking freely
    }).catch(() => {
      // permissions API not available — show modal as fallback
      setShowLocationModal(true);
    });
  }, []);


  // Called by the modal's "Allow" button — triggers the actual native browser permission prompt
  const handleAllowLocation = async () => {
    setShowLocationModal(false);
    await startTracking(true); // pass true to skip the check and force the native prompt
  };

  const startTracking = async (skipPermissionCheck = false) => {
    if (!('geolocation' in navigator)) {
      setLocationError('Geolocation is not supported by your browser.');
      return;
    }

    // Geolocation API requires a secure context (HTTPS or localhost). 
    // If the user accesses the site via HTTP (e.g., http://raha.bd), the browser automatically blocks it.
    if (window.isSecureContext === false) {
      setLocationError('Location blocked: Your site must use HTTPS (SSL) for live tracking to work. HTTP is not allowed by browsers.');
      return;
    }

    // Check current permission state — show modal if still in prompt state
    if (!skipPermissionCheck && 'permissions' in navigator) {
      try {
        const result = await navigator.permissions.query({ name: 'geolocation' });
        if (result.state === 'prompt') {
          setShowLocationModal(true);
          return;
        }
        if (result.state === 'denied') {
          setLocationError('Location permission denied. Please allow location access to continue tracking.');
          return;
        }
      } catch (e) {
        // Some browsers (like older Safari) might throw on permissions.query
        console.error("Permissions API error", e);
      }
    }

    setLocationError(null);
    setIsTracking(true);

    // If order is just "ready", transition it to "out_for_delivery" automatically
    if (order?.status === 'ready') {
      try {
        await updateStatus({ orderId, status: 'out_for_delivery' }).unwrap();
        toast.success('Order marked as Out for Delivery');
      } catch (e) {
        console.error('Failed to update status', e);
      }
    }

    const id = navigator.geolocation.watchPosition(
      (position) => {
        const { latitude, longitude, heading, speed } = position.coords;
        
        if (!isOffline && navigator.onLine) {
          updateLocation({
            orderId,
            lat: latitude,
            lng: longitude,
            heading: heading || undefined,
            speed: speed || undefined
          }).catch(err => console.error("Failed to update rider location", err));
        }

        setLastPings(p => p + 1);
        setLocationError(null);
      },
      (error) => {
        console.error('Geolocation error:', error);
        setIsTracking(false);
        switch(error.code) {
          case error.PERMISSION_DENIED:
            setLocationError("Location permission denied. Please allow location access to continue tracking.");
            break;
          case error.POSITION_UNAVAILABLE:
            setLocationError("Location information is unavailable.");
            break;
          case error.TIMEOUT:
            setLocationError("The request to get user location timed out.");
            break;
          default:
            setLocationError("An unknown error occurred getting location.");
            break;
        }
      },
      {
        enableHighAccuracy: true,
        maximumAge: 5000,
        timeout: 10000
      }
    );

    setWatchId(id);
    toast.success('Live tracking started!');
  };

  const stopTracking = () => {
    if (watchId !== null) {
      navigator.geolocation.clearWatch(watchId);
      setWatchId(null);
    }
    setIsTracking(false);
    toast.success('Live tracking paused');
  };


  const markAsDelivered = async () => {
    if (!confirm('Are you sure you want to mark this order as delivered?')) return;
    
    setIsCompleting(true);
    try {
      await updateStatus({ orderId, status: 'delivered' }).unwrap();
      toast.success('Order delivered successfully! 🎉');
      
      if (watchId !== null) navigator.geolocation.clearWatch(watchId);
      
      router.push('/dashboard/rider');
    } catch (e: any) {
      toast.error(e.data?.message || 'Failed to complete order');
      setIsCompleting(false);
    }
  };

  // Helper functions
  const getCustomerName = (order: any) => {
    return order?.customerName || order?.customerInfo?.name || order?.deliveryDetails?.contactName || 'Customer';
  };

  const getCustomerPhone = (order: any) => {
    return order?.customerPhone || order?.customerInfo?.phone || order?.deliveryDetails?.contactPhone || '';
  };

  const getDeliveryAddress = (order: any) => {
    if (order?.deliveryAddress) {
      return {
        street: order.deliveryAddress.street || order.deliveryAddress.addressLine1 || '',
        city: order.deliveryAddress.city || '',
        zip: order.deliveryAddress.zipCode || order.deliveryAddress.postalCode || '',
      };
    }
    if (order?.deliveryDetails) {
      return {
        street: order.deliveryDetails.addressLine1 || '',
        city: order.deliveryDetails.city || '',
        zip: order.deliveryDetails.postalCode || '',
      };
    }
    return null;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex justify-center items-center bg-slate-50 dark:bg-slate-900">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
          <p className="text-sm text-slate-400 font-medium">Loading order details...</p>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen flex flex-col justify-center items-center bg-slate-50 dark:bg-slate-900 p-6">
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg p-10 text-center max-w-sm w-full">
          <div className="bg-rose-50 dark:bg-rose-900/30 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
            <ExclamationTriangleIcon className="w-8 h-8 text-rose-500" />
          </div>
          <p className="font-bold text-slate-700 dark:text-slate-300 text-lg mb-1">Order not found</p>
          <p className="text-sm text-slate-400 mb-6">This order may have been removed or the link is invalid.</p>
          <Button onClick={() => router.push('/dashboard/rider')} className="w-full">
            <ArrowLeftIcon className="w-4 h-4 mr-2" /> Back to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  const isCompleted = order.status === 'completed' || order.status === 'cancelled' || order.deliveryStatus === 'delivered';
  const customerName = getCustomerName(order);
  const customerPhone = getCustomerPhone(order);
  const address = getDeliveryAddress(order);
  const items = order.items || [];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex flex-col">

      {/* ====== Location Permission Modal ====== */}
      {showLocationModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden animate-in slide-in-from-bottom-4 duration-300">
            {/* Modal Header with gradient */}
            <div className="relative bg-gradient-to-br from-primary-600 via-primary-500 to-blue-500 px-6 pt-8 pb-10 text-white text-center overflow-hidden">
              <div className="absolute top-0 right-0 -mr-8 -mt-8 w-32 h-32 rounded-full bg-white/10 blur-2xl"></div>
              <div className="absolute bottom-0 left-0 -ml-8 -mb-8 w-24 h-24 rounded-full bg-white/10 blur-xl"></div>
              
              {/* Icon */}
              <div className="relative z-10 w-20 h-20 rounded-full bg-white/20 border-4 border-white/30 flex items-center justify-center mx-auto mb-4 shadow-inner">
                <MapPinIcon className="w-10 h-10 text-white" />
              </div>
              <h2 className="relative z-10 text-2xl font-black tracking-tight">Allow Location Access</h2>
              <p className="relative z-10 text-primary-100 text-sm mt-1">Required for live tracking</p>

              {/* Dismiss button */}
              <button
                onClick={() => setShowLocationModal(false)}
                className="absolute top-4 right-4 z-10 w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-white hover:bg-white/30 transition-colors"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="-mt-5 relative z-10 bg-white dark:bg-slate-800 rounded-t-3xl px-6 pt-5 pb-6">
              <p className="text-slate-600 dark:text-slate-300 text-sm text-center mb-5">
                We need your phone's GPS to share your real-time location with the customer, so they can track their order on the map.
              </p>

              {/* Bullet points */}
              <div className="space-y-3 mb-6">
                {[
                  { emoji: '📍', text: 'Customer sees your live position on the map' },
                  { emoji: '🔒', text: 'Location is only shared while you are on delivery' },
                  { emoji: '🔕', text: 'Stops automatically when you mark the order as delivered' },
                ].map((item) => (
                  <div key={item.emoji} className="flex items-center gap-3 bg-slate-50 dark:bg-slate-900/50 rounded-xl px-4 py-3">
                    <span className="text-lg">{item.emoji}</span>
                    <p className="text-sm text-slate-700 dark:text-slate-300 font-medium">{item.text}</p>
                  </div>
                ))}
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col gap-3">
                <button
                  onClick={handleAllowLocation}
                  className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-primary-600 to-primary-500 hover:from-primary-700 hover:to-primary-600 text-white font-bold text-base shadow-lg shadow-primary-500/30 hover:shadow-primary-500/50 transition-all hover:scale-[1.02] active:scale-[0.98]"
                >
                  Allow Location Access
                </button>
                <button
                  onClick={() => setShowLocationModal(false)}
                  className="w-full py-3 rounded-2xl text-slate-400 dark:text-slate-500 font-medium text-sm hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                >
                  Not now
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="bg-white dark:bg-slate-800 shadow-sm sticky top-0 z-10 border-b border-slate-100 dark:border-slate-700">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-3 sm:py-4">

          <div className="flex items-center justify-between">
            <button 
              onClick={() => router.push('/dashboard/rider')} 
              className="text-slate-500 hover:text-primary-600 transition-colors p-1 -ml-1"
            >
              <ArrowLeftIcon className="w-5 h-5 sm:w-6 sm:h-6" />
            </button>
            <div className="text-center">
              <h1 className="font-bold text-slate-900 dark:text-white text-sm sm:text-base">Order #{order.orderNumber}</h1>
              <Badge className={`text-[10px] px-2 py-0.5 rounded-full font-semibold border-0 mt-0.5 ${
                isCompleted ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300' :
                order.deliveryStatus === 'out_for_delivery' || order.status === 'served' ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' :
                order.status === 'ready' ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300' :
                'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300'
              }`}>
                {isCompleted ? 'COMPLETED' :
                 order.deliveryStatus === 'out_for_delivery' || order.status === 'served' ? 'OUT FOR DELIVERY' :
                 order.status === 'ready' ? 'READY FOR PICKUP' : 
                 (order.deliveryStatus || order.status || 'PENDING').toUpperCase()}
              </Badge>
            </div>
            <div className="w-6"></div>
          </div>
        </div>
      </div>

      {/* Offline Banner */}
      {isOffline && (
        <div className="bg-orange-500 text-white px-4 py-2.5 text-center text-sm font-semibold flex items-center justify-center gap-2 shadow-inner z-20">
          <SignalIcon className="w-5 h-5 animate-pulse" />
          You are offline. Live tracking updates are paused until you reconnect.
        </div>
      )}

      {/* Content */}
      <div className="flex-1 max-w-4xl mx-auto w-full px-4 sm:px-6 py-5 sm:py-6 flex flex-col">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
          
          {/* Customer & Address Card */}
          <Card className="border-0 shadow-md rounded-2xl bg-white dark:bg-slate-800">
            <CardContent className="p-5 sm:p-6">
              <h2 className="text-xs font-black text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                <UserIcon className="w-4 h-4" /> Customer & Delivery
              </h2>
              
              <div className="space-y-4">
                {/* Customer Name */}
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-primary-50 dark:bg-primary-900/30 flex items-center justify-center flex-shrink-0">
                    <span className="text-primary-700 dark:text-primary-300 font-bold text-lg">{customerName.charAt(0).toUpperCase()}</span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-slate-900 dark:text-white text-lg truncate">{customerName}</p>
                    {customerPhone && (
                      <p className="text-sm text-slate-400 mt-0.5">{customerPhone}</p>
                    )}
                  </div>
                </div>

                {/* Phone Call Button */}
                {customerPhone && (
                  <a href={`tel:${customerPhone}`} className="block">
                    <Button variant="secondary" className="w-full border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-900/20 hover:bg-emerald-100 shadow-none">
                      <PhoneIcon className="w-4 h-4 mr-2" /> Call Customer
                    </Button>
                  </a>
                )}

                {/* Address */}
                {address && address.street && (
                  <div className="bg-slate-50 dark:bg-slate-900/50 rounded-xl p-4 border-l-4 border-primary-500">
                    <div className="flex items-start gap-3">
                      <MapPinIcon className="w-5 h-5 text-primary-500 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="font-semibold text-slate-800 dark:text-slate-200 text-sm">{address.street}</p>
                        {(address.city || address.zip) && (
                          <p className="text-xs text-slate-400 mt-0.5">{[address.city, address.zip].filter(Boolean).join(', ')}</p>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {!address?.street && (
                  <div className="bg-amber-50 dark:bg-amber-900/20 rounded-xl p-4 border-l-4 border-amber-400">
                    <p className="text-sm text-amber-700 dark:text-amber-300 font-medium">No delivery address provided</p>
                  </div>
                )}

                {/* Delivery Notes */}
                {(order.notes || order.deliveryDetails?.instructions) && (
                  <div className="bg-violet-50 dark:bg-violet-900/20 rounded-xl p-4">
                    <p className="text-xs font-bold text-violet-500 uppercase tracking-wider mb-1">Notes</p>
                    <p className="text-sm text-violet-800 dark:text-violet-200">{order.notes || order.deliveryDetails?.instructions}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Order & Payment Card */}
          <Card className="border-0 shadow-md rounded-2xl bg-white dark:bg-slate-800">
            <CardContent className="p-5 sm:p-6">
              <h2 className="text-xs font-black text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                <ShoppingBagIcon className="w-4 h-4" /> Order Details
              </h2>

              {/* Order Items */}
              {items.length > 0 && (
                <div className="space-y-2 mb-5">
                  {items.map((item: any, i: number) => (
                    <div key={i} className="flex items-center justify-between py-2 border-b border-slate-50 dark:border-slate-700/50 last:border-0">
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs font-bold w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0">
                          {item.quantity}x
                        </span>
                        <span className="text-sm font-medium text-slate-700 dark:text-slate-300 truncate">{item.name || 'Item'}</span>
                      </div>
                      <span className="text-sm font-semibold text-slate-500 dark:text-slate-400 flex-shrink-0 ml-2">{formatCurrency(item.price * item.quantity)}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Payment Info */}
              <div className="bg-slate-50 dark:bg-slate-900/50 rounded-xl p-4 border border-slate-100 dark:border-slate-700">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <CurrencyDollarIcon className="w-5 h-5 text-slate-400" />
                    <div>
                      <p className="text-xs text-slate-400 font-medium">Amount to Collect</p>
                      <p className="text-xl font-black text-slate-900 dark:text-white">{formatCurrency(order.totalAmount || 0)}</p>
                    </div>
                  </div>
                  <Badge className={`rounded-full font-bold border-0 ${order.paymentStatus === 'paid' ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300' : 'bg-orange-50 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300'}`}>
                    {order.paymentStatus === 'paid' ? '✓ PAID' : 'COLLECT CASH'}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Location Error */}
        {locationError && (
          <div className="bg-rose-50 dark:bg-rose-900/20 text-rose-700 dark:text-rose-300 p-4 rounded-xl flex flex-col gap-3 mt-4 border border-rose-200 dark:border-rose-800">
            <div className="flex items-start gap-3">
              <ExclamationTriangleIcon className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-bold mb-1">{locationError}</p>
                <p className="text-xs text-rose-500 dark:text-rose-400">
                  To enable: Open your browser settings → Site Settings → Location → Allow for this site. Then tap "Retry" below.
                </p>
              </div>
            </div>
            <Button 
              variant="secondary" 
              size="sm" 
              onClick={() => { setLocationError(null); startTracking(true); }}
              className="self-end border-rose-200 dark:border-rose-700 text-rose-700 dark:text-rose-300 hover:bg-rose-100 dark:hover:bg-rose-900/40"
            >
              Retry Location Access
            </Button>
          </div>
        )}

        {/* Spacer */}
        <div className="flex-1 min-h-[2rem]"></div>

        {/* Action Controls */}
        {!isCompleted && (
          <div className="sticky bottom-4 mt-6">
            <div className="bg-white dark:bg-slate-800 p-4 sm:p-5 rounded-2xl shadow-xl border border-slate-100 dark:border-slate-700 space-y-4 max-w-4xl">
              
              {/* Live Tracking Control */}
              <div className="flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <div className={`w-2.5 h-2.5 rounded-full ${isTracking ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'}`}></div>
                    <p className="font-bold text-slate-900 dark:text-white text-sm sm:text-base">Live Tracking</p>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5 ml-[18px]">
                    {isTracking ? `Broadcasting location (${lastPings} updates)` : 'Customer cannot see your location'}
                  </p>
                </div>
                <div className="flex-shrink-0">
                  {isTracking ? (
                    <Button variant="danger" onClick={stopTracking} size="sm" className="shadow-md">
                      <StopIcon className="w-4 h-4 mr-1.5" /> Pause
                    </Button>
                  ) : (
                    <Button onClick={() => startTracking()} size="sm" className="shadow-md shadow-primary-500/20">
                      <SignalIcon className="w-4 h-4 mr-1.5" /> Start Tracking
                    </Button>
                  )}
                </div>
              </div>

              {/* Mark Delivered */}
              <div className="border-t border-slate-100 dark:border-slate-700 pt-4">
                <Button 
                  className="w-full h-12 sm:h-14 text-base sm:text-lg font-bold shadow-lg rounded-xl border-0" 
                  variant="success"
                  onClick={markAsDelivered}
                  disabled={isCompleting || isTracking}
                  isLoading={isCompleting}
                >
                  <CheckCircleIcon className="w-5 h-5 sm:w-6 sm:h-6 mr-2" />
                  {isTracking ? "Pause tracking to complete" : "MARK AS DELIVERED"}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Completed State */}
        {isCompleted && (
          <div className="mt-6 mb-4">
            <Card className="border-0 shadow-md rounded-2xl bg-emerald-50 dark:bg-emerald-900/20">
              <CardContent className="p-6 sm:p-8 text-center">
                <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mx-auto mb-3">
                  <CheckCircleIcon className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
                </div>
                <p className="font-bold text-emerald-800 dark:text-emerald-200 text-lg">Delivery Complete</p>
                <p className="text-sm text-emerald-600 dark:text-emerald-400 mt-1 mb-4">This order has been delivered successfully.</p>
                <Button onClick={() => router.push('/dashboard/rider')} variant="primary" className="shadow-md">
                  <ArrowLeftIcon className="w-4 h-4 mr-2" /> Back to Dashboard
                </Button>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
