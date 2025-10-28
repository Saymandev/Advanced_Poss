'use client';

import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { useGetCompanyBySlugQuery, useTrackOrderQuery } from '@/lib/api/endpoints/publicApi';
import { formatCurrency, formatDateTime } from '@/lib/utils';
import {
    CheckCircleIcon,
    ClockIcon,
    HomeIcon,
    PhoneIcon,
    XCircleIcon
} from '@heroicons/react/24/outline';
import Link from 'next/link';
import { useParams } from 'next/navigation';

export default function OrderTrackingPage() {
  const params = useParams();
  const companySlug = params.companySlug as string;
  const branchSlug = params.branchSlug as string;
  const orderId = params.orderId as string;

  const { data: company } = useGetCompanyBySlugQuery(companySlug);
  const { data: order, isLoading, error } = useTrackOrderQuery(orderId);

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      pending: 'bg-yellow-100 text-yellow-800',
      confirmed: 'bg-blue-100 text-blue-800',
      preparing: 'bg-orange-100 text-orange-800',
      ready: 'bg-purple-100 text-purple-800',
      served: 'bg-green-100 text-green-800',
      completed: 'bg-green-100 text-green-800',
      cancelled: 'bg-red-100 text-red-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
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

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <Card className="max-w-2xl w-full">
          <div className="p-8 text-center">
            <XCircleIcon className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Order Not Found</h2>
            <p className="text-gray-600 mb-6">
              We couldn't find an order with that ID. Please check your order number.
            </p>
            <Link href={`/${companySlug}/${branchSlug}/shop`}>
              <Button>Back to Shop</Button>
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  const StatusIcon = getStatusIcon(order.status);
  const steps = getStatusSteps();
  const currentStep = getCurrentStepIndex();

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <Link href={`/${companySlug}/${branchSlug}/shop`}>
            <Button variant="ghost" className="mb-4">
              <HomeIcon className="w-5 h-5 mr-2" />
              Back to Shop
            </Button>
          </Link>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Order Tracking</h1>
          <div className="flex items-center gap-4">
            <Badge className={getStatusColor(order.status)}>
              <StatusIcon className="w-4 h-4 mr-1" />
              {order.status?.toUpperCase()}
            </Badge>
            <span className="text-gray-600">Order #{order.orderNumber}</span>
          </div>
        </div>

        {/* Status Timeline */}
        <Card className="mb-6">
          <div className="p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-6">Order Status</h2>
            <div className="relative">
              {steps.map((step, index) => {
                const isCompleted = index <= currentStep;
                const isCurrent = index === currentStep;
                const StepIcon = isCompleted ? CheckCircleIcon : ClockIcon;

                return (
                  <div key={step.key} className="flex items-start gap-4 mb-8 last:mb-0">
                    <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${
                      isCompleted ? 'bg-green-500' : 'bg-gray-300'
                    }`}>
                      <StepIcon className={`w-6 h-6 ${isCompleted ? 'text-white' : 'text-gray-600'}`} />
                    </div>
                    <div className="flex-1">
                      <div className={`font-semibold ${isCurrent ? 'text-green-600' : isCompleted ? 'text-gray-900' : 'text-gray-400'}`}>
                        {step.label}
                      </div>
                      {step.time && (
                        <div className="text-sm text-gray-500 mt-1">
                          {formatDateTime(step.time)}
                        </div>
                      )}
                      {!step.time && isCurrent && (
                        <div className="text-sm text-gray-500 mt-1">In progress...</div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </Card>

        {/* Order Details */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Order Items */}
          <Card>
            <div className="p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Order Items</h2>
              <div className="space-y-3">
                {order.items?.map((item: any, index: number) => (
                  <div key={index} className="flex justify-between items-start pb-3 border-b last:border-0">
                    <div>
                      <p className="font-semibold text-gray-900">{item.name}</p>
                      <p className="text-sm text-gray-600">Qty: {item.quantity}</p>
                      {item.specialInstructions && (
                        <p className="text-xs text-gray-500 mt-1 italic">{item.specialInstructions}</p>
                      )}
                    </div>
                    <p className="font-semibold text-gray-900">{formatCurrency(item.totalPrice)}</p>
                  </div>
                ))}
              </div>
              <div className="mt-4 pt-4 border-t space-y-2">
                <div className="flex justify-between text-gray-600">
                  <span>Subtotal</span>
                  <span>{formatCurrency(order.subtotal || 0)}</span>
                </div>
                {order.taxAmount > 0 && (
                  <div className="flex justify-between text-gray-600">
                    <span>Tax</span>
                    <span>{formatCurrency(order.taxAmount || 0)}</span>
                  </div>
                )}
                {order.deliveryFee > 0 && (
                  <div className="flex justify-between text-gray-600">
                    <span>Delivery Fee</span>
                    <span>{formatCurrency(order.deliveryFee || 0)}</span>
                  </div>
                )}
                <div className="flex justify-between text-lg font-bold text-gray-900 pt-2 border-t">
                  <span>Total</span>
                  <span>{formatCurrency(order.total || 0)}</span>
                </div>
              </div>
            </div>
          </Card>

          {/* Delivery & Contact Info */}
          <Card>
            <div className="p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Delivery Information</h2>
              
              {order.type === 'delivery' && order.deliveryAddress && (
                <div className="mb-6">
                  <h3 className="font-semibold text-gray-900 mb-2">Delivery Address</h3>
                  <p className="text-gray-600">
                    {order.deliveryAddress.street}<br />
                    {order.deliveryAddress.city} {order.deliveryAddress.zipCode}
                  </p>
                </div>
              )}

              {order.type === 'pickup' && (
                <div className="mb-6">
                  <h3 className="font-semibold text-gray-900 mb-2">Pickup Location</h3>
                  {(order.branchId as any)?.address && (
                    <p className="text-gray-600">
                      {(order.branchId as any).address.street}<br />
                      {(order.branchId as any).address.city}
                    </p>
                  )}
                </div>
              )}

              <div className="mb-6">
                <h3 className="font-semibold text-gray-900 mb-2">Payment Method</h3>
                <p className="text-gray-600 capitalize">{order.paymentMethod || 'Cash'}</p>
                <p className={`text-sm mt-1 ${
                  order.paymentStatus === 'paid' ? 'text-green-600' : 'text-yellow-600'
                }`}>
                  {order.paymentStatus === 'paid' ? 'Paid' : 'Pending Payment'}
                </p>
              </div>

              {company?.phone && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h3 className="font-semibold text-gray-900 mb-2">Need Help?</h3>
                  <a href={`tel:${company.phone}`} className="flex items-center gap-2 text-blue-600 hover:text-blue-700">
                    <PhoneIcon className="w-5 h-5" />
                    {company.phone}
                  </a>
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

