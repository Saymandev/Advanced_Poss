'use client';

import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { useGetCompanyBySlugQuery, useTrackOrderQuery } from '@/lib/api/endpoints/publicApi';
import { formatCurrency, formatDateTime } from '@/lib/utils';
import {
    CheckCircleIcon,
    ClockIcon,
    ExclamationTriangleIcon,
    HomeIcon,
    PhoneIcon,
    XCircleIcon
} from '@heroicons/react/24/outline';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import toast from 'react-hot-toast';

export default function OrderTrackingPage() {
  const params = useParams();
  const router = useRouter();
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
    data: order, 
    isLoading: orderLoading, 
    isError: orderError,
    error: orderErrorData 
  } = useTrackOrderQuery(orderId, {
    skip: !orderId,
    refetchInterval: 30000, // Refetch every 30 seconds for real-time updates
  });

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

    if (order.type === 'delivery') {
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

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-8">
        {/* Header */}
        <div className="mb-6 md:mb-8">
          <Link href={`/${companySlug}/${branchSlug}/shop`}>
            <Button variant="ghost" className="mb-4">
              <HomeIcon className="w-5 h-5 mr-2" />
              Back to Shop
            </Button>
          </Link>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-2 md:mb-3">
            Order Tracking
          </h1>
          <div className="flex flex-wrap items-center gap-3 md:gap-4">
            <Badge className={getStatusColor(order.status)}>
              <StatusIcon className="w-4 h-4 mr-1" />
              {order.status?.toUpperCase() || 'UNKNOWN'}
            </Badge>
            <span className="text-sm sm:text-base text-gray-600 dark:text-gray-400">
              Order #{order.orderNumber || orderId}
            </span>
          </div>
        </div>

        {/* Status Timeline */}
        <Card className="mb-6">
          <CardContent className="p-4 md:p-6">
            <h2 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white mb-4 md:mb-6">
              Order Status
            </h2>
            <div className="relative">
              {steps.map((step, index) => {
                const isCompleted = index <= currentStep;
                const isCurrent = index === currentStep;
                const StepIcon = isCompleted ? CheckCircleIcon : ClockIcon;

                return (
                  <div key={step.key} className="flex items-start gap-3 md:gap-4 mb-6 md:mb-8 last:mb-0">
                    <div className={`flex-shrink-0 w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center transition-colors ${
                      isCompleted ? 'bg-green-500 dark:bg-green-600' : 'bg-gray-300 dark:bg-gray-700'
                    }`}>
                      <StepIcon className={`w-5 h-5 sm:w-6 sm:h-6 ${isCompleted ? 'text-white' : 'text-gray-600 dark:text-gray-400'}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className={`font-semibold text-sm sm:text-base ${
                        isCurrent 
                          ? 'text-green-600 dark:text-green-400' 
                          : isCompleted 
                            ? 'text-gray-900 dark:text-white' 
                            : 'text-gray-400 dark:text-gray-500'
                      }`}>
                        {step.label}
                      </div>
                      {step.time && (
                        <div className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-1">
                          {formatDateTime(step.time)}
                        </div>
                      )}
                      {!step.time && isCurrent && (
                        <div className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-1">
                          In progress...
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Order Details */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
          {/* Order Items */}
          <Card>
            <CardContent className="p-4 md:p-6">
              <h2 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white mb-4">
                Order Items
              </h2>
              <div className="space-y-3">
                {order.items?.map((item: any, index: number) => (
                  <div key={index} className="flex justify-between items-start pb-3 border-b border-gray-200 dark:border-gray-700 last:border-0">
                    <div className="flex-1 min-w-0 pr-2">
                      <p className="font-semibold text-sm sm:text-base text-gray-900 dark:text-white truncate">
                        {item.name || `Item ${index + 1}`}
                      </p>
                      <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">
                        Qty: {item.quantity || 1}
                      </p>
                      {item.specialInstructions && (
                        <p className="text-xs text-gray-500 dark:text-gray-500 mt-1 italic">
                          {item.specialInstructions}
                        </p>
                      )}
                    </div>
                    <p className="font-semibold text-sm sm:text-base text-gray-900 dark:text-white flex-shrink-0">
                      {formatCurrency(item.totalPrice || item.price * (item.quantity || 1))}
                    </p>
                  </div>
                ))}
              </div>
              <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 space-y-2">
                <div className="flex justify-between text-sm sm:text-base text-gray-600 dark:text-gray-400">
                  <span>Subtotal</span>
                  <span>{formatCurrency(order.subtotal || 0)}</span>
                </div>
                {(order.taxAmount || 0) > 0 && (
                  <div className="flex justify-between text-sm sm:text-base text-gray-600 dark:text-gray-400">
                    <span>Tax</span>
                    <span>{formatCurrency(order.taxAmount || 0)}</span>
                  </div>
                )}
                {(order.deliveryFee || 0) > 0 && (
                  <div className="flex justify-between text-sm sm:text-base text-gray-600 dark:text-gray-400">
                    <span>Delivery Fee</span>
                    <span>{formatCurrency(order.deliveryFee || 0)}</span>
                  </div>
                )}
                <div className="flex justify-between text-base sm:text-lg font-bold text-gray-900 dark:text-white pt-2 border-t border-gray-200 dark:border-gray-700">
                  <span>Total</span>
                  <span>{formatCurrency(order.total || order.totalAmount || 0)}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Delivery & Contact Info */}
          <Card>
            <CardContent className="p-4 md:p-6">
              <h2 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white mb-4">
                Delivery Information
              </h2>
              
              {order.type === 'delivery' && order.deliveryAddress && (
                <div className="mb-4 md:mb-6">
                  <h3 className="font-semibold text-sm sm:text-base text-gray-900 dark:text-white mb-2">
                    Delivery Address
                  </h3>
                  <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400">
                    {order.deliveryAddress.street && `${order.deliveryAddress.street}, `}
                    {order.deliveryAddress.city}
                    {order.deliveryAddress.zipCode && ` ${order.deliveryAddress.zipCode}`}
                  </p>
                </div>
              )}

              {order.type === 'pickup' && (
                <div className="mb-4 md:mb-6">
                  <h3 className="font-semibold text-sm sm:text-base text-gray-900 dark:text-white mb-2">
                    Pickup Location
                  </h3>
                  {(order.branchId as any)?.address ? (
                    <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400">
                      {(order.branchId as any).address.street && `${(order.branchId as any).address.street}, `}
                      {(order.branchId as any).address.city}
                    </p>
                  ) : (
                    <p className="text-sm sm:text-base text-gray-500 dark:text-gray-500">
                      Please contact the restaurant for pickup details
                    </p>
                  )}
                </div>
              )}

              <div className="mb-4 md:mb-6">
                <h3 className="font-semibold text-sm sm:text-base text-gray-900 dark:text-white mb-2">
                  Payment Method
                </h3>
                <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 capitalize">
                  {order.paymentMethod || 'Cash'}
                </p>
                <p className={`text-xs sm:text-sm mt-1 font-medium ${
                  order.paymentStatus === 'paid' 
                    ? 'text-green-600 dark:text-green-400' 
                    : 'text-yellow-600 dark:text-yellow-400'
                }`}>
                  {order.paymentStatus === 'paid' ? '✓ Paid' : 'Pending Payment'}
                </p>
              </div>

              {company?.phone && (
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                  <h3 className="font-semibold text-sm sm:text-base text-gray-900 dark:text-white mb-2">
                    Need Help?
                  </h3>
                  <a 
                    href={`tel:${company.phone}`} 
                    className="flex items-center gap-2 text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 transition-colors"
                  >
                    <PhoneIcon className="w-5 h-5" />
                    <span className="text-sm sm:text-base">{company.phone}</span>
                  </a>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

