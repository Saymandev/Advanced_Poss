'use client';

import React from 'react';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { useGetDeliveryOrdersQuery } from '@/lib/api/endpoints/posApi';
import { useAppSelector } from '@/lib/store';
import { formatCurrency, formatDateTime } from '@/lib/utils';
import { MapPinIcon, PhoneIcon, ClockIcon, ArrowRightIcon } from '@heroicons/react/24/outline';
import Link from 'next/link';

export default function RiderDashboardPage() {
  const { user } = useAppSelector((state) => state.auth);

  // We fetch active delivery orders assigned to this user
  const { data: ordersData, isLoading, error } = useGetDeliveryOrdersQuery({ 
    assignedDriverId: (user as any)?._id || user?.id
  }, {
    skip: !((user as any)?._id || user?.id),
    pollingInterval: 15000 // poll every 15s for new orders
  });

  const orders = Array.isArray(ordersData) ? ordersData : (ordersData as any)?.orders || [];
  
  // Filter active orders assigned to the rider that are not yet delivered/cancelled
  const activeOrders = orders.filter((o: any) => 
    o.deliveryStatus !== 'delivered' && 
    o.deliveryStatus !== 'cancelled' &&
    o.status !== 'cancelled'
  );
  
  // Past orders
  const completedOrders = orders.filter((o: any) => 
    o.deliveryStatus === 'delivered' || 
    o.deliveryStatus === 'cancelled' ||
    o.status === 'cancelled'
  );

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-20">
      <div className="bg-primary-600 text-white p-6 shadow-md rounded-b-3xl">
        <h1 className="text-2xl font-bold">Rider App</h1>
        <p className="opacity-90">Welcome back, {user?.firstName || 'Driver'}</p>
      </div>

      <div className="max-w-md mx-auto p-4 mt-2 space-y-6">
        <div>
          <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-3 flex items-center justify-between">
            Active Deliveries
            <Badge className="bg-primary-100 text-primary-800">{activeOrders.length}</Badge>
          </h2>

          {isLoading ? (
            <div className="flex justify-center p-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
            </div>
          ) : activeOrders.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center text-gray-500">
                <MapPinIcon className="w-12 h-12 mx-auto mb-3 opacity-20" />
                <p>No active deliveries assigned.</p>
                <p className="text-sm">Wait for the restaurant to assign you orders.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {activeOrders.map((order: any) => (
                <Card key={order.id || order._id} className="overflow-hidden border-2 border-transparent hover:border-primary-500 transition-colors">
                  <CardContent className="p-0">
                    <div className="p-4 bg-white dark:bg-gray-800">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <p className="font-bold text-lg text-gray-900 dark:text-white">#{order.orderNumber}</p>
                          <p className="text-sm text-gray-500 flex items-center gap-1">
                            <ClockIcon className="w-4 h-4" />
                            {formatDateTime(order.createdAt)}
                          </p>
                        </div>
                        <Badge className={
                          order.deliveryStatus === 'out_for_delivery' || order.status === 'served' ? 'bg-blue-100 text-blue-800' :
                          order.status === 'ready' ? 'bg-green-100 text-green-800' :
                          'bg-yellow-100 text-yellow-800'
                        }>
                          {order.deliveryStatus === 'out_for_delivery' || order.status === 'served' ? 'Out for Delivery' :
                           order.status === 'ready' ? 'Ready for Pickup' :
                           'Assigned / Preparing'}
                        </Badge>
                      </div>

                      {order.deliveryAddress && (
                        <div className="mb-4 bg-gray-50 dark:bg-gray-900/50 p-3 rounded-lg">
                          <p className="text-sm font-medium text-gray-900 dark:text-white flex items-start gap-2 mb-2">
                            <MapPinIcon className="w-5 h-5 text-gray-400 mt-0.5" />
                            <span>
                              {order.deliveryAddress.street}<br/>
                              {order.deliveryAddress.city} {order.deliveryAddress.zipCode}
                            </span>
                          </p>
                          {order.customerPhone && (
                            <a href={`tel:${order.customerPhone}`} className="text-primary-600 text-sm flex items-center gap-2 font-medium">
                              <PhoneIcon className="w-4 h-4" /> {order.customerPhone}
                            </a>
                          )}
                        </div>
                      )}

                      <div className="flex justify-between items-center mt-4">
                        <span className="font-bold text-gray-900 dark:text-white">{formatCurrency(order.totalAmount || 0)}</span>
                        <Link href={`/dashboard/rider/${order.id || order._id}`}>
                          <Button className="w-full sm:w-auto shadow-md shadow-primary-500/20">
                            {order.deliveryStatus === 'out_for_delivery' || order.status === 'served' ? 'Continue Delivery' : 'Start Delivery'} <ArrowRightIcon className="w-4 h-4 ml-2" />
                          </Button>
                        </Link>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        {completedOrders.length > 0 && (
          <div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-3">Recently Completed</h2>
            <div className="space-y-3">
              {completedOrders.slice(0, 5).map((order: any) => (
                <Card key={order.id || order._id}>
                  <CardContent className="p-3 flex justify-between items-center">
                    <div>
                      <p className="font-semibold text-gray-900 dark:text-white">#{order.orderNumber}</p>
                      <p className="text-xs text-gray-500">{formatDateTime(order.completedAt || order.updatedAt)}</p>
                    </div>
                    <Badge className={order.status === 'completed' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                      {order.status}
                    </Badge>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
