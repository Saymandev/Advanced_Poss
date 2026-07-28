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
import { useRouter } from 'next/navigation';

export default function RiderDashboardPage() {
  const { user } = useAppSelector((state) => state.auth);
  const router = useRouter();

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
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 pb-20">
      {/* Premium Header */}
      <div className="relative overflow-hidden bg-gradient-to-br from-primary-700 via-primary-600 to-primary-800 text-white p-8 shadow-xl rounded-b-[2.5rem]">
        {/* Abstract shapes for background */}
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 rounded-full bg-white opacity-5 blur-3xl"></div>
        <div className="absolute bottom-0 left-0 -ml-16 -mb-16 w-48 h-48 rounded-full bg-white opacity-10 blur-2xl"></div>
        
        <div className="relative z-10">
          <div className="flex justify-between items-center mb-2">
            <h1 className="text-3xl font-extrabold tracking-tight">Rider App</h1>
            <div className="h-11 w-11 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/30 shadow-inner">
               <span className="font-bold text-lg">{user?.firstName?.charAt(0) || 'D'}</span>
            </div>
          </div>
          <p className="text-primary-100 text-lg font-medium flex items-center gap-2">
            Welcome back, {user?.firstName || 'Driver'} 👋
          </p>
        </div>
      </div>

      <div className="max-w-md mx-auto p-4 mt-4 space-y-8">
        <div>
          <div className="flex items-center justify-between mb-5 mt-2 px-1">
            <h2 className="text-xl font-extrabold text-slate-800 dark:text-white tracking-tight">Active Deliveries</h2>
            <div className="bg-primary-100 dark:bg-primary-900/50 text-primary-700 dark:text-primary-300 font-bold px-3 py-1 rounded-full text-sm shadow-inner border border-primary-200 dark:border-primary-800">
              {activeOrders.length}
            </div>
          </div>

          {isLoading ? (
            <div className="flex justify-center p-12">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-600"></div>
            </div>
          ) : activeOrders.length === 0 ? (
            <Card className="border-0 shadow-md bg-white dark:bg-slate-800 rounded-2xl">
              <CardContent className="p-10 text-center text-slate-500">
                <div className="bg-slate-50 dark:bg-slate-700/50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <MapPinIcon className="w-10 h-10 text-slate-300 dark:text-slate-500" />
                </div>
                <p className="font-bold text-slate-700 dark:text-slate-300 mb-1">No active deliveries</p>
                <p className="text-sm">Wait for the restaurant to assign you orders.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-5">
              {activeOrders.map((order: any) => (
                <Card key={order.id || order._id} className="group overflow-hidden border-0 shadow-md hover:shadow-xl hover:-translate-y-1 transition-all duration-300 bg-white dark:bg-slate-800/90 backdrop-blur-sm rounded-2xl">
                  <CardContent className="p-5">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <p className="font-extrabold text-lg text-slate-900 dark:text-white tracking-tight group-hover:text-primary-600 transition-colors">#{order.orderNumber}</p>
                        <p className="text-xs font-medium text-slate-500 flex items-center gap-1.5 mt-1">
                          <ClockIcon className="w-3.5 h-3.5" />
                          {formatDateTime(order.createdAt)}
                        </p>
                      </div>
                      <Badge className={`px-3 py-1 rounded-full font-semibold border-0 ${
                        order.deliveryStatus === 'out_for_delivery' || order.status === 'served' 
                          ? 'bg-blue-50 text-blue-700 shadow-sm shadow-blue-100 dark:bg-blue-900/30 dark:text-blue-300' 
                          : order.status === 'ready' 
                            ? 'bg-emerald-50 text-emerald-700 shadow-sm shadow-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-300 animate-pulse' 
                            : 'bg-amber-50 text-amber-700 shadow-sm shadow-amber-100 dark:bg-amber-900/30 dark:text-amber-300'
                      }`}>
                        {order.deliveryStatus === 'out_for_delivery' || order.status === 'served' ? 'Out for Delivery' :
                         order.status === 'ready' ? 'Ready for Pickup' :
                         'Assigned / Preparing'}
                      </Badge>
                    </div>

                    {order.deliveryAddress && (
                      <div className="mb-5 bg-gradient-to-r from-slate-50 to-slate-100/50 dark:from-slate-900/50 dark:to-slate-800/50 p-4 rounded-xl border-l-4 border-primary-500 shadow-sm">
                        <div className="flex items-start gap-3">
                          <div className="mt-0.5 bg-white dark:bg-slate-800 p-1.5 rounded-full shadow-sm text-primary-500 flex-shrink-0">
                            <MapPinIcon className="w-4 h-4" />
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                              {order.deliveryAddress.street}
                            </p>
                            <p className="text-xs text-slate-500 mt-0.5">
                              {order.deliveryAddress.city} {order.deliveryAddress.zipCode}
                            </p>
                          </div>
                        </div>
                        {order.customerPhone && (
                          <div className="mt-3 ml-10">
                            <a href={`tel:${order.customerPhone}`} className="inline-flex items-center gap-2 text-primary-700 hover:text-primary-800 bg-primary-50 hover:bg-primary-100 dark:bg-primary-900/30 dark:text-primary-300 px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors">
                              <PhoneIcon className="w-3.5 h-3.5" /> Call Customer
                            </a>
                          </div>
                        )}
                      </div>
                    )}

                    <div className="flex justify-between items-center pt-3 border-t border-slate-100 dark:border-slate-700/50">
                      <div className="flex flex-col">
                        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Value</span>
                        <span className="font-black text-lg text-slate-900 dark:text-white">{formatCurrency(order.totalAmount || 0)}</span>
                      </div>
                      <Button 
                        onClick={() => router.push(`/dashboard/rider/${order.id || order._id}`)}
                        className="rounded-xl shadow-lg shadow-primary-600/30 hover:shadow-primary-600/50 transition-all hover:scale-105 bg-gradient-to-r from-primary-600 to-primary-500 hover:from-primary-700 hover:to-primary-600 border-0 px-6 py-5 font-bold"
                      >
                        {order.deliveryStatus === 'out_for_delivery' || order.status === 'served' ? 'Continue' : 'Start'} 
                        <ArrowRightIcon className="w-4 h-4 ml-2 stroke-[3]" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        {completedOrders.length > 0 && (
          <div className="mt-8 pb-4">
            <h2 className="text-lg font-bold text-slate-800 dark:text-white mb-4 px-1 tracking-tight">Recently Completed</h2>
            <div className="space-y-3">
              {completedOrders.slice(0, 5).map((order: any) => (
                <Card key={order.id || order._id} className="border-0 shadow-sm bg-white/60 dark:bg-slate-800/50 backdrop-blur-sm rounded-xl">
                  <CardContent className="p-4 flex justify-between items-center">
                    <div className="flex items-center gap-3">
                       <div className="h-10 w-10 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-slate-400">
                         <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                           <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                         </svg>
                       </div>
                      <div>
                        <p className="font-bold text-slate-700 dark:text-slate-300">#{order.orderNumber}</p>
                        <p className="text-xs font-medium text-slate-400">{formatDateTime(order.completedAt || order.updatedAt)}</p>
                      </div>
                    </div>
                    <Badge className={`rounded-full px-3 py-1 font-semibold border-0 ${order.status === 'completed' || order.deliveryStatus === 'delivered' ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400' : 'bg-rose-50 text-rose-600 dark:bg-rose-900/20 dark:text-rose-400'}`}>
                      {order.deliveryStatus === 'delivered' || order.status === 'completed' ? 'Delivered' : order.status}
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
