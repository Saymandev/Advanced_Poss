'use client';

import React, { useEffect, useState, useRef } from 'react';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { 
  useGetPOSOrderQuery, 
  useUpdateRiderLocationMutation,
  useUpdateDeliveryStatusMutation
} from '@/lib/api/endpoints/posApi';
import { formatCurrency } from '@/lib/utils';
import { MapPinIcon, PhoneIcon, CheckCircleIcon, ArrowLeftIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import toast from 'react-hot-toast';

export default function RiderActiveDeliveryPage() {
  const params = useParams();
  const router = useRouter();
  const orderId = params.orderId as string;

  const { data: orderData, isLoading } = useGetPOSOrderQuery(orderId, {
    skip: !orderId,
    pollingInterval: 10000 // Poll occasionally just to get status updates if restaurant cancels
  });
  
  const [updateLocation] = useUpdateRiderLocationMutation();
  const [updateStatus] = useUpdateDeliveryStatusMutation();

  const [isTracking, setIsTracking] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [watchId, setWatchId] = useState<number | null>(null);
  const [isCompleting, setIsCompleting] = useState(false);
  const [lastPings, setLastPings] = useState<number>(0);

  const order = orderData as any;

  // Cleanup watcher when component unmounts
  useEffect(() => {
    return () => {
      if (watchId !== null) {
        navigator.geolocation.clearWatch(watchId);
      }
    };
  }, [watchId]);

  const startTracking = async () => {
    if (!('geolocation' in navigator)) {
      setLocationError('Geolocation is not supported by your browser.');
      return;
    }

    setLocationError(null);
    setIsTracking(true);

    // If order is just "ready", transition it to "served" automatically when they start tracking
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
        
        // Ping backend with new location
        updateLocation({
          orderId,
          lat: latitude,
          lng: longitude,
          heading: heading || undefined,
          speed: speed || undefined
        }).catch(err => console.error("Failed to update rider location", err));

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
        maximumAge: 5000, // don't use cached positions older than 5s
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
      
      // Stop tracking
      if (watchId !== null) navigator.geolocation.clearWatch(watchId);
      
      // Go back to dashboard
      router.push('/dashboard/rider');
    } catch (e: any) {
      toast.error(e.data?.message || 'Failed to complete order');
      setIsCompleting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex justify-center items-center bg-gray-50 dark:bg-gray-900">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen p-6 text-center bg-gray-50 dark:bg-gray-900">
        <p className="text-gray-500">Order not found.</p>
        <Link href="/dashboard/rider">
          <Button className="mt-4">Go Back</Button>
        </Link>
      </div>
    );
  }

  const isCompleted = order.status === 'completed' || order.status === 'cancelled';

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 shadow-sm p-4 sticky top-0 z-10">
        <div className="flex items-center justify-between max-w-md mx-auto">
          <Link href="/dashboard/rider" className="text-gray-500 hover:text-primary-600 transition-colors">
            <ArrowLeftIcon className="w-6 h-6" />
          </Link>
          <div className="text-center">
            <h1 className="font-bold text-gray-900 dark:text-white">Order #{order.orderNumber}</h1>
            <p className="text-xs text-gray-500">{order.status.toUpperCase()}</p>
          </div>
          <div className="w-6"></div> {/* Spacer for centering */}
        </div>
      </div>

      <div className="flex-1 max-w-md mx-auto w-full p-4 space-y-6 flex flex-col">
        {/* Customer Info Card */}
        <Card>
          <CardContent className="p-4">
            <h2 className="text-sm font-black text-gray-400 uppercase tracking-wider mb-3">Delivery Details</h2>
            
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="bg-primary-100 p-2 rounded-full text-primary-600 mt-1">
                  <MapPinIcon className="w-5 h-5" />
                </div>
                <div>
                  <p className="font-bold text-gray-900 dark:text-white text-lg">
                    {order.customerName || 'Customer'}
                  </p>
                  {order.deliveryAddress ? (
                    <p className="text-gray-600 dark:text-gray-300">
                      {order.deliveryAddress.street}<br/>
                      {order.deliveryAddress.city} {order.deliveryAddress.zipCode}
                    </p>
                  ) : (
                    <p className="text-red-500 text-sm">No delivery address provided.</p>
                  )}
                </div>
              </div>

              {order.customerPhone && (
                <div className="flex items-center gap-3 border-t border-gray-100 dark:border-gray-700 pt-3">
                  <div className="bg-green-100 p-2 rounded-full text-green-600">
                    <PhoneIcon className="w-5 h-5" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-gray-900 dark:text-white">{order.customerPhone}</p>
                  </div>
                  <a href={`tel:${order.customerPhone}`}>
                    <Button variant="secondary" size="sm" className="border-green-200 text-green-700 hover:bg-green-50">
                      Call
                    </Button>
                  </a>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Order Summary */}
        <Card>
          <CardContent className="p-4">
            <h2 className="text-sm font-black text-gray-400 uppercase tracking-wider mb-3">Payment Info</h2>
            <div className="flex justify-between items-center bg-gray-50 dark:bg-gray-800 p-3 rounded-lg border border-gray-100 dark:border-gray-700">
              <div>
                <p className="text-sm text-gray-500">Amount to Collect</p>
                <p className="text-xl font-bold text-gray-900 dark:text-white">{formatCurrency(order.totalAmount || 0)}</p>
              </div>
              <Badge className={order.paymentStatus === 'paid' ? 'bg-green-100 text-green-800' : 'bg-orange-100 text-orange-800'}>
                {order.paymentStatus === 'paid' ? 'PAID' : 'COLLECT CASH'}
              </Badge>
            </div>
          </CardContent>
        </Card>

        {locationError && (
          <div className="bg-red-50 text-red-700 p-4 rounded-lg flex items-start gap-3">
            <ExclamationTriangleIcon className="w-6 h-6 flex-shrink-0" />
            <p className="text-sm">{locationError}</p>
          </div>
        )}

        <div className="flex-1"></div> {/* Push controls to bottom */}

        {/* Action Controls */}
        {!isCompleted && (
          <div className="space-y-3 sticky bottom-4">
            <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-lg border border-gray-100 dark:border-gray-700 space-y-4">
              
              <div className="flex items-center justify-between px-2">
                <div>
                  <p className="font-bold text-gray-900 dark:text-white">Live Tracking</p>
                  <p className="text-xs text-gray-500">
                    {isTracking ? `Broadcasting location... (${lastPings} pings)` : 'Customer cannot see you on the map'}
                  </p>
                </div>
                <div>
                  {isTracking ? (
                    <Button variant="danger" onClick={stopTracking} className="shadow-md">
                      Pause Tracking
                    </Button>
                  ) : (
                    <Button onClick={startTracking} className="shadow-md shadow-primary-500/30">
                      Start Tracking
                    </Button>
                  )}
                </div>
              </div>

              <div className="border-t border-gray-100 dark:border-gray-700 pt-4">
                <Button 
                  className="w-full h-14 text-lg font-bold shadow-lg shadow-green-500/20" 
                  variant="primary"
                  style={{ backgroundColor: '#10b981' }} // Emerald 500
                  onClick={markAsDelivered}
                  disabled={isCompleting || isTracking}
                >
                  <CheckCircleIcon className="w-6 h-6 mr-2" />
                  {isTracking ? "Pause tracking to complete" : "MARK AS DELIVERED"}
                </Button>
              </div>

            </div>
          </div>
        )}
      </div>
    </div>
  );
}
