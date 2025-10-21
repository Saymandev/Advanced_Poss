'use client';

import { Card, CardContent } from '@/components/ui/Card';
import { useGetOrdersQuery } from '@/lib/api/endpoints/ordersApi';
import { useGetTableByIdQuery } from '@/lib/api/endpoints/tablesApi';
import { formatCurrency, formatDateTime } from '@/lib/utils';
import { CheckCircleIcon, ClockIcon, FireIcon, ShoppingBagIcon } from '@heroicons/react/24/outline';
import { useParams } from 'next/navigation';
import { useEffect } from 'react';

export default function CustomerDisplayPage() {
  const params = useParams();
  const tableId = params.tableId as string;

  const { data: tableData } = useGetTableByIdQuery(tableId);
  const { data: ordersData, refetch } = useGetOrdersQuery({ 
    tableId,
    status: 'pending,preparing,ready',
  });

  // Auto-refresh every 3 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      refetch();
    }, 3000);
    return () => clearInterval(interval);
  }, [refetch]);

  const currentOrder = ordersData?.orders?.[0];

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'pending':
        return {
          icon: ShoppingBagIcon,
          color: 'text-yellow-600 dark:text-yellow-400',
          bgColor: 'bg-yellow-100 dark:bg-yellow-900/30',
          label: 'Order Received',
          description: 'Your order has been placed and is being prepared',
          progress: 33,
        };
      case 'preparing':
        return {
          icon: FireIcon,
          color: 'text-blue-600 dark:text-blue-400',
          bgColor: 'bg-blue-100 dark:bg-blue-900/30',
          label: 'Preparing',
          description: 'Our chefs are working on your order',
          progress: 66,
        };
      case 'ready':
        return {
          icon: CheckCircleIcon,
          color: 'text-green-600 dark:text-green-400',
          bgColor: 'bg-green-100 dark:bg-green-900/30',
          label: 'Ready to Serve',
          description: 'Your order is ready and will be served shortly',
          progress: 100,
        };
      default:
        return {
          icon: ClockIcon,
          color: 'text-gray-600 dark:text-gray-400',
          bgColor: 'bg-gray-100 dark:bg-gray-900/30',
          label: 'Pending',
          description: 'Waiting for updates',
          progress: 0,
        };
    }
  };

  if (!currentOrder) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary-500 via-primary-600 to-secondary-600 flex items-center justify-center p-6">
        <Card className="max-w-2xl w-full">
          <CardContent className="p-12 text-center">
            <div className="flex flex-col items-center gap-6">
              <div className="p-6 bg-primary-100 dark:bg-primary-900/30 rounded-full">
                <ShoppingBagIcon className="w-20 h-20 text-primary-600 dark:text-primary-400" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                  Welcome to Table {tableData?.number}
                </h1>
                <p className="text-gray-600 dark:text-gray-400 text-lg">
                  No active orders at the moment
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-500 mt-4">
                  Scan the QR code on your table to place an order
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const statusConfig = getStatusConfig(currentOrder.status);
  const StatusIcon = statusConfig.icon;

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-500 via-primary-600 to-secondary-600 p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center text-white">
          <h1 className="text-4xl font-bold mb-2">🍽️ Advanced POS</h1>
          <p className="text-xl text-primary-100">
            Table {tableData?.number} • Order #{currentOrder.orderNumber}
          </p>
          <p className="text-sm text-primary-200 mt-2">
            {formatDateTime(currentOrder.createdAt)}
          </p>
        </div>

        {/* Status Card */}
        <Card className="shadow-2xl">
          <CardContent className="p-8">
            <div className="flex flex-col items-center text-center mb-8">
              <div className={`p-6 rounded-full ${statusConfig.bgColor} mb-4 animate-pulse`}>
                <StatusIcon className={`w-20 h-20 ${statusConfig.color}`} />
              </div>
              <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                {statusConfig.label}
              </h2>
              <p className="text-lg text-gray-600 dark:text-gray-400">
                {statusConfig.description}
              </p>
            </div>

            {/* Progress Bar */}
            <div className="mb-8">
              <div className="flex justify-between mb-2">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Order Progress
                </span>
                <span className="text-sm font-medium text-primary-600 dark:text-primary-400">
                  {statusConfig.progress}%
                </span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-4 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-1000 ${
                    statusConfig.progress === 100
                      ? 'bg-green-600'
                      : statusConfig.progress >= 66
                      ? 'bg-blue-600'
                      : 'bg-yellow-600'
                  }`}
                  style={{ width: `${statusConfig.progress}%` }}
                />
              </div>
            </div>

            {/* Timeline */}
            <div className="flex justify-between items-center mb-8">
              {['Order Placed', 'Preparing', 'Ready'].map((step, idx) => (
                <div key={step} className="flex flex-col items-center flex-1">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${
                      idx < statusConfig.progress / 33
                        ? 'bg-green-600 text-white'
                        : 'bg-gray-300 dark:bg-gray-600 text-gray-600 dark:text-gray-400'
                    }`}
                  >
                    {idx < statusConfig.progress / 33 ? '✓' : idx + 1}
                  </div>
                  <p className="text-xs mt-2 text-gray-600 dark:text-gray-400">{step}</p>
                </div>
              ))}
            </div>

            {/* Order Items */}
            <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
              <h3 className="font-semibold text-lg text-gray-900 dark:text-white mb-4">
                Your Order
              </h3>
              <div className="space-y-3">
                {currentOrder.items?.map((item: any, idx: number) => (
                  <div
                    key={idx}
                    className="flex justify-between items-center p-4 bg-gray-50 dark:bg-gray-800 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 font-bold">
                        {item.quantity}
                      </span>
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">{item.name}</p>
                        {item.notes && (
                          <p className="text-sm text-gray-500 dark:text-gray-400">{item.notes}</p>
                        )}
                      </div>
                    </div>
                    <span className="font-semibold text-gray-900 dark:text-white">
                      {formatCurrency(item.price * item.quantity)}
                    </span>
                  </div>
                ))}
              </div>

              {/* Total */}
              <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Subtotal</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Tax (10%)</p>
                    <p className="text-lg font-bold text-gray-900 dark:text-white mt-2">Total</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-900 dark:text-white">
                      {formatCurrency(currentOrder.subtotal)}
                    </p>
                    <p className="text-sm text-gray-900 dark:text-white">
                      {formatCurrency(currentOrder.tax)}
                    </p>
                    <p className="text-2xl font-bold text-primary-600 dark:text-primary-400 mt-2">
                      {formatCurrency(currentOrder.total)}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center text-white text-sm">
          <p className="text-primary-100">
            Thank you for dining with us! 
          </p>
          <p className="text-primary-200 text-xs mt-1">
            Display updates automatically every 3 seconds
          </p>
        </div>
      </div>
    </div>
  );
}
