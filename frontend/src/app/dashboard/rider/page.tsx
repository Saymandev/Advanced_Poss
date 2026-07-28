'use client';

import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Pagination } from '@/components/ui/Pagination';
import { useGetDeliveryOrdersQuery, useUpdateDeliveryStatusMutation } from '@/lib/api/endpoints/posApi';
import { useAppSelector } from '@/lib/store';
import { formatCurrency, formatDateTime } from '@/lib/utils';
import { 
  MapPinIcon, 
  PhoneIcon, 
  ClockIcon, 
  ArrowRightIcon,
  UserIcon,
  CurrencyDollarIcon,
  TruckIcon,
  ShoppingBagIcon,
  MagnifyingGlassIcon,
  CalendarIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';

export default function RiderDashboardPage() {
  const { user } = useAppSelector((state) => state.auth);
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<'active' | 'completed'>('active');
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [page, setPage] = useState(1);
  const limit = 12;

  const [updateDeliveryStatus, { isLoading: isUpdating }] = useUpdateDeliveryStatusMutation();

  const driverId = (user as any)?._id || user?.id;

  // We fetch active or completed delivery orders assigned to this user with backend pagination
  const { data: rawData, isLoading } = useGetDeliveryOrdersQuery({ 
    assignedDriverId: driverId,
    deliveryStatus: activeTab,
    search: searchTerm,
    date: dateFilter,
    page,
    limit
  }, {
    skip: !driverId,
    pollingInterval: activeTab === 'active' ? 15000 : 0
  });

  const orders = rawData?.orders || [];
  const totalPages = rawData?.totalPages || 1;

  // We also fetch a separate quick query just to get the top stats without pagination/filters
  const { data: statsData } = useGetDeliveryOrdersQuery({ 
    assignedDriverId: driverId,
    deliveryStatus: 'active',
    limit: 500
  }, {
    skip: !driverId,
    pollingInterval: 60000
  });
  
  const statsOrders = statsData?.orders || [];
  const outForDeliveryCount = statsOrders.filter((o: any) => o.deliveryStatus === 'out_for_delivery' || o.status === 'served').length;
  const readyForPickupCount = statsOrders.filter((o: any) => o.status === 'ready').length;
  const preparingCount = statsOrders.length - outForDeliveryCount - readyForPickupCount;

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
    setPage(1);
  };

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setDateFilter(e.target.value);
    setPage(1);
  };

  const handleTabChange = (tab: 'active' | 'completed') => {
    setActiveTab(tab);
    setPage(1);
  };

  const getCustomerName = (order: any) => {
    return order.customerName || order.customerInfo?.name || order.deliveryDetails?.contactName || 'Customer';
  };

  const getCustomerPhone = (order: any) => {
    return order.customerPhone || order.customerInfo?.phone || order.deliveryDetails?.contactPhone || '';
  };

  const getDeliveryAddress = (order: any) => {
    if (order.deliveryAddress) {
      return {
        street: order.deliveryAddress.street || order.deliveryAddress.addressLine1 || '',
        city: order.deliveryAddress.city || '',
        zip: order.deliveryAddress.zipCode || order.deliveryAddress.postalCode || '',
      };
    }
    if (order.deliveryDetails) {
      return {
        street: order.deliveryDetails.addressLine1 || '',
        city: order.deliveryDetails.city || '',
        zip: order.deliveryDetails.postalCode || '',
      };
    }
    return null;
  };

  const getStatusConfig = (order: any) => {
    if (order.deliveryStatus === 'out_for_delivery' || order.status === 'served') {
      return { label: 'Out for Delivery', color: 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300', dot: 'bg-blue-500' };
    }
    if (order.status === 'ready') {
      return { label: 'Ready for Pickup', color: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300', dot: 'bg-emerald-500 animate-pulse' };
    }
    if (order.deliveryStatus === 'delivered' || order.status === 'completed') {
      return { label: 'Delivered', color: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300', dot: 'bg-slate-400' };
    }
    if (order.deliveryStatus === 'cancelled' || order.status === 'cancelled') {
      return { label: 'Cancelled', color: 'bg-rose-50 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300', dot: 'bg-rose-500' };
    }
    return { label: 'Preparing', color: 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300', dot: 'bg-amber-500' };
  };

  const handleStartDelivery = async (order: any) => {
    const id = order.id || order._id;
    if (id) {
      if (order.deliveryStatus !== 'out_for_delivery' && order.status !== 'served') {
        try {
          await updateDeliveryStatus({ orderId: id, status: 'out_for_delivery' as any }).unwrap();
          toast.success('Delivery started!');
          router.push(`/dashboard/rider/${id}`);
        } catch (error) {
          console.error('Failed to start delivery:', error);
          toast.error('Failed to start delivery. Please try again.');
        }
      } else {
        router.push(`/dashboard/rider/${id}`);
      }
    } else {
      toast.error('Order ID is missing!');
      console.error('Missing order ID for:', order);
    }
  };

  const handleViewDetails = (order: any) => {
    const id = order.id || order._id;
    if (id) {
      router.push(`/dashboard/rider/${id}`);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      {/* Premium Header */}
      <div className="relative overflow-hidden bg-gradient-to-br from-primary-700 via-primary-600 to-primary-800 text-white shadow-xl">
        <div className="absolute top-0 right-0 -mr-20 -mt-20 w-80 h-80 rounded-full bg-white opacity-[0.04] blur-3xl"></div>
        <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-60 h-60 rounded-full bg-white opacity-[0.08] blur-2xl"></div>
        
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">Rider Dashboard</h1>
              <p className="text-primary-100 text-sm sm:text-base font-medium mt-1">
                Welcome back, {user?.firstName || 'Driver'} 👋
              </p>
            </div>
            <div className="h-12 w-12 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/30 shadow-inner text-xl font-bold">
              {user?.firstName?.charAt(0) || 'D'}
            </div>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-3 gap-3 mt-4">
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3 sm:p-4 border border-white/10">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></div>
                <span className="text-xs sm:text-sm text-primary-100 font-medium">Ready</span>
              </div>
              <p className="text-xl sm:text-2xl font-black">{readyForPickupCount}</p>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3 sm:p-4 border border-white/10">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-2 h-2 rounded-full bg-blue-400"></div>
                <span className="text-xs sm:text-sm text-primary-100 font-medium">On Route</span>
              </div>
              <p className="text-xl sm:text-2xl font-black">{outForDeliveryCount}</p>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3 sm:p-4 border border-white/10">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-2 h-2 rounded-full bg-amber-400"></div>
                <span className="text-xs sm:text-sm text-primary-100 font-medium">Preparing</span>
              </div>
              <p className="text-xl sm:text-2xl font-black">{preparingCount}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        
        {/* Filters */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <MagnifyingGlassIcon className="h-5 w-5 text-slate-400" />
              </div>
              <input
                type="text"
                placeholder="Search by customer name, phone, or order #"
                value={searchTerm}
                onChange={handleSearchChange}
                className="block w-full pl-10 pr-3 py-2.5 border border-slate-200 dark:border-slate-600 rounded-xl bg-slate-50 dark:bg-slate-900 text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-shadow"
              />
            </div>
            <div className="w-full md:w-64 relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <CalendarIcon className="h-5 w-5 text-slate-400" />
              </div>
              <input
                type="date"
                value={dateFilter}
                onChange={handleDateChange}
                className="block w-full pl-10 pr-3 py-2.5 border border-slate-200 dark:border-slate-600 rounded-xl bg-slate-50 dark:bg-slate-900 text-sm text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-shadow"
              />
            </div>
            {(searchTerm || dateFilter) && (
              <Button 
                variant="ghost" 
                onClick={() => { setSearchTerm(''); setDateFilter(''); setPage(1); }}
                className="md:w-auto h-[42px] border border-slate-200 dark:border-slate-600 rounded-xl"
              >
                Clear
              </Button>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 p-1 bg-slate-200/50 dark:bg-slate-800 rounded-xl w-full max-w-sm">
          <button
            onClick={() => handleTabChange('active')}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg font-bold text-sm transition-all ${activeTab === 'active' ? 'bg-white dark:bg-slate-700 text-primary-600 shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
          >
            <TruckIcon className="w-4 h-4" />
            Active
          </button>
          <button
            onClick={() => handleTabChange('completed')}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg font-bold text-sm transition-all ${activeTab === 'completed' ? 'bg-white dark:bg-slate-700 text-primary-600 shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
          >
            <CheckCircleIcon className="w-4 h-4" />
            Completed
          </button>
        </div>

        {/* Deliveries List */}
        <div>
          {isLoading ? (
            <div className="flex justify-center p-16">
              <div className="flex flex-col items-center gap-3">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-600"></div>
                <p className="text-sm text-slate-400 font-medium">Loading deliveries...</p>
              </div>
            </div>
          ) : orders.length === 0 ? (
            <Card className="border-0 shadow-md bg-white dark:bg-slate-800 rounded-2xl">
              <CardContent className="p-10 sm:p-16 text-center text-slate-500">
                <div className="bg-slate-50 dark:bg-slate-700/50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
                  {activeTab === 'active' ? (
                     <TruckIcon className="w-10 h-10 text-slate-300 dark:text-slate-500" />
                  ) : (
                     <CheckCircleIcon className="w-10 h-10 text-slate-300 dark:text-slate-500" />
                  )}
                </div>
                <p className="font-bold text-slate-700 dark:text-slate-300 text-lg mb-1">
                  {(searchTerm || dateFilter) ? 'No matches found' : `No ${activeTab} deliveries`}
                </p>
                <p className="text-sm max-w-sm mx-auto">
                  {(searchTerm || dateFilter) ? 'Try adjusting your search or date filter.' : activeTab === 'active' ? "You're all caught up! Wait for the restaurant to assign you new orders." : "You haven't completed any deliveries yet."}
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-5">
              {orders.map((order: any) => {
                const status = getStatusConfig(order);
                const customerName = getCustomerName(order);
                const customerPhone = getCustomerPhone(order);
                const address = getDeliveryAddress(order);
                const orderId = order.id || order._id;
                const items = order.items || [];

                return (
                  <Card 
                    key={orderId} 
                    className="group overflow-hidden border-0 shadow-md hover:shadow-xl transition-all duration-300 bg-white dark:bg-slate-800/90 rounded-2xl cursor-pointer"
                    onClick={() => handleViewDetails(order)}
                  >
                    <CardContent className="p-0">
                      {/* Card Header */}
                      <div className="p-4 sm:p-5 pb-3 border-b border-slate-100 dark:border-slate-700/50">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-extrabold text-base sm:text-lg text-slate-900 dark:text-white tracking-tight group-hover:text-primary-600 transition-colors">
                              #{order.orderNumber}
                            </p>
                            <p className="text-xs font-medium text-slate-400 flex items-center gap-1.5 mt-1">
                              <ClockIcon className="w-3.5 h-3.5" />
                              {formatDateTime(activeTab === 'completed' ? (order.completedAt || order.updatedAt || order.createdAt) : order.createdAt)}
                            </p>
                          </div>
                          <Badge className={`px-3 py-1 rounded-full font-semibold border-0 text-xs flex items-center gap-1.5 ${status.color}`}>
                            {activeTab === 'active' && <span className={`w-1.5 h-1.5 rounded-full ${status.dot}`}></span>}
                            {status.label}
                          </Badge>
                        </div>
                      </div>

                      {/* Customer Info */}
                      <div className="p-4 sm:p-5 py-3 space-y-3">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-primary-50 dark:bg-primary-900/30 flex items-center justify-center flex-shrink-0">
                            <UserIcon className="w-4 h-4 text-primary-600 dark:text-primary-400" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-bold text-slate-800 dark:text-slate-200 truncate">{customerName}</p>
                            {customerPhone && (
                              <a 
                                href={`tel:${customerPhone}`} 
                                className="text-xs font-medium text-primary-600 hover:text-primary-700 flex items-center gap-1 mt-0.5"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <PhoneIcon className="w-3 h-3" />
                                {customerPhone}
                              </a>
                            )}
                          </div>
                          {customerPhone && activeTab === 'active' && (
                            <a 
                              href={`tel:${customerPhone}`}
                              onClick={(e) => e.stopPropagation()}
                              className="w-9 h-9 rounded-full bg-emerald-50 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-600 hover:bg-emerald-100 transition-colors flex-shrink-0"
                            >
                              <PhoneIcon className="w-4 h-4" />
                            </a>
                          )}
                        </div>

                        {address && address.street && (
                          <div className="flex items-start gap-3">
                            <div className="w-9 h-9 rounded-full bg-rose-50 dark:bg-rose-900/30 flex items-center justify-center flex-shrink-0 mt-0.5">
                              <MapPinIcon className="w-4 h-4 text-rose-600 dark:text-rose-400" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-semibold text-slate-700 dark:text-slate-300 leading-snug">{address.street}</p>
                              {(address.city || address.zip) && (
                                <p className="text-xs text-slate-400 mt-0.5">{[address.city, address.zip].filter(Boolean).join(', ')}</p>
                              )}
                            </div>
                          </div>
                        )}

                        {items.length > 0 && (
                          <div className="flex items-start gap-3">
                            <div className="w-9 h-9 rounded-full bg-violet-50 dark:bg-violet-900/30 flex items-center justify-center flex-shrink-0">
                              <ShoppingBagIcon className="w-4 h-4 text-violet-600 dark:text-violet-400" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">{items.length} Item{items.length > 1 ? 's' : ''}</p>
                              <div className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                                {items.slice(0, 3).map((item: any, i: number) => (
                                  <span key={i}>
                                    {item.quantity}x {item.name || 'Item'}{i < Math.min(items.length, 3) - 1 ? ', ' : ''}
                                  </span>
                                ))}
                                {items.length > 3 && <span className="text-slate-400"> +{items.length - 3} more</span>}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Card Footer */}
                      <div className="p-4 sm:p-5 pt-3 border-t border-slate-100 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-800/50">
                        <div className="flex justify-between items-center">
                          <div className="flex items-center gap-2">
                            <CurrencyDollarIcon className="w-5 h-5 text-slate-400" />
                            <div>
                              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider leading-none">Collect</p>
                              <p className="font-black text-lg text-slate-900 dark:text-white leading-tight">{formatCurrency(order.totalAmount || 0)}</p>
                            </div>
                          </div>
                          {activeTab === 'active' && order.status === 'ready' && order.deliveryStatus !== 'out_for_delivery' ? (
                            <Button 
                              onClick={(e) => {
                                e.stopPropagation();
                                handleStartDelivery(order);
                              }}
                              className="rounded-xl shadow-lg shadow-primary-600/20 hover:shadow-primary-600/40 transition-all hover:scale-[1.03] bg-gradient-to-r from-primary-600 to-primary-500 hover:from-primary-700 hover:to-primary-600 border-0 px-5 py-2.5 font-bold text-sm"
                            >
                              Start Delivery
                              <ArrowRightIcon className="w-4 h-4 ml-1.5 stroke-[2.5]" />
                            </Button>
                          ) : activeTab === 'active' && (order.deliveryStatus === 'out_for_delivery' || order.status === 'served') ? (
                            <Button 
                              onClick={(e) => {
                                e.stopPropagation();
                                handleViewDetails(order);
                              }}
                              className="rounded-xl shadow-lg shadow-primary-600/20 hover:shadow-primary-600/40 transition-all hover:scale-[1.03] bg-gradient-to-r from-primary-600 to-primary-500 hover:from-primary-700 hover:to-primary-600 border-0 px-5 py-2.5 font-bold text-sm"
                            >
                              Continue
                              <ArrowRightIcon className="w-4 h-4 ml-1.5 stroke-[2.5]" />
                            </Button>
                          ) : (
                            <Button 
                              variant="outline"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleViewDetails(order);
                              }}
                              className="rounded-xl font-bold text-sm px-5 py-2.5"
                            >
                              View Details
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="mt-6 flex justify-center">
            <Pagination 
              currentPage={page} 
              totalPages={totalPages} 
              onPageChange={setPage} 
              showItemsPerPage={false} 
            />
          </div>
        )}
      </div>
    </div>
  );
}
