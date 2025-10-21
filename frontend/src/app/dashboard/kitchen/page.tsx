'use client';

import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { useAppSelector } from '@/lib/store';
import { formatDateTime } from '@/lib/utils';
import {
  CheckCircleIcon,
  ClockIcon,
  FireIcon,
  XCircleIcon
} from '@heroicons/react/24/outline';
import { useState } from 'react';
import toast from 'react-hot-toast';

interface KitchenOrder {
  id: string;
  orderNumber: string;
  tableNumber: number;
  customerName?: string;
  status: 'pending' | 'preparing' | 'ready' | 'served';
  priority: 'normal' | 'high' | 'urgent';
  items: Array<{
    id: string;
    name: string;
    quantity: number;
    notes?: string;
    status: 'pending' | 'preparing' | 'ready';
    preparationTime?: number;
  }>;
  createdAt: string;
  estimatedReadyTime?: string;
  specialInstructions?: string;
}

// Mock data for kitchen display
const mockKitchenOrders: KitchenOrder[] = [
  {
    id: '1',
    orderNumber: 'ORD-2024-001',
    tableNumber: 5,
    customerName: 'John Doe',
    status: 'preparing',
    priority: 'normal',
    items: [
      {
        id: '1',
        name: 'Grilled Salmon',
        quantity: 1,
        notes: 'Medium rare',
        status: 'preparing',
        preparationTime: 15,
      },
      {
        id: '2',
        name: 'Caesar Salad',
        quantity: 1,
        status: 'ready',
        preparationTime: 8,
      },
    ],
    createdAt: '2024-01-20T18:30:00Z',
    estimatedReadyTime: '2024-01-20T18:45:00Z',
    specialInstructions: 'Customer has nut allergy',
  },
  {
    id: '2',
    orderNumber: 'ORD-2024-002',
    tableNumber: 8,
    customerName: 'Jane Smith',
    status: 'pending',
    priority: 'high',
    items: [
      {
        id: '3',
        name: 'Chicken Parmesan',
        quantity: 1,
        status: 'pending',
        preparationTime: 20,
      },
      {
        id: '4',
        name: 'Garlic Bread',
        quantity: 1,
        status: 'pending',
        preparationTime: 5,
      },
    ],
    createdAt: '2024-01-20T18:35:00Z',
    estimatedReadyTime: '2024-01-20T18:55:00Z',
  },
  {
    id: '3',
    orderNumber: 'ORD-2024-003',
    tableNumber: 12,
    status: 'ready',
    priority: 'normal',
    items: [
      {
        id: '5',
        name: 'Margherita Pizza',
        quantity: 1,
        status: 'ready',
        preparationTime: 12,
      },
    ],
    createdAt: '2024-01-20T18:20:00Z',
    estimatedReadyTime: '2024-01-20T18:32:00Z',
  },
];

export default function KitchenPage() {
  const { user } = useAppSelector((state) => state.auth);
  const [orders, setOrders] = useState<KitchenOrder[]>(mockKitchenOrders);
  const [selectedOrder, setSelectedOrder] = useState<KitchenOrder | null>(null);

  const handleItemStatusChange = (orderId: string, itemId: string, newStatus: 'pending' | 'preparing' | 'ready') => {
    setOrders(prev => prev.map(order =>
      order.id === orderId
        ? {
            ...order,
            items: order.items.map(item =>
              item.id === itemId ? { ...item, status: newStatus } : item
            ),
          }
        : order
    ));

    if (newStatus === 'ready') {
      toast.success('Item marked as ready!');
    }
  };

  const handleOrderStatusChange = (orderId: string, newStatus: KitchenOrder['status']) => {
    setOrders(prev => prev.map(order =>
      order.id === orderId
        ? {
            ...order,
            status: newStatus,
            items: order.items.map(item => ({ ...item, status: newStatus === 'ready' ? 'ready' : item.status })),
          }
        : order
    ));

    toast.success(`Order marked as ${newStatus}`);
  };

  const getPriorityBadge = (priority: KitchenOrder['priority']) => {
    const variants = {
      urgent: 'danger',
      high: 'warning',
      normal: 'secondary',
    } as const;

    return (
      <Badge variant={variants[priority]}>
        {priority.toUpperCase()}
      </Badge>
    );
  };

  const getStatusBadge = (status: KitchenOrder['status']) => {
    const variants = {
      pending: 'warning',
      preparing: 'info',
      ready: 'success',
      served: 'primary',
    } as const;

    return (
      <Badge variant={variants[status]}>
        {status.toUpperCase()}
      </Badge>
    );
  };

  const getItemStatusBadge = (status: string) => {
    const variants = {
      pending: 'warning',
      preparing: 'info',
      ready: 'success',
    } as const;

    return (
      <Badge variant={variants[status as keyof typeof variants]}>
        {status.toUpperCase()}
      </Badge>
    );
  };

  const pendingOrders = orders.filter(order => order.status === 'pending');
  const preparingOrders = orders.filter(order => order.status === 'preparing');
  const readyOrders = orders.filter(order => order.status === 'ready');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Kitchen Display</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Real-time kitchen order management
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <p className="text-sm text-gray-600 dark:text-gray-400">Current Time</p>
            <p className="text-lg font-semibold text-gray-900 dark:text-white">
              {new Date().toLocaleTimeString()}
            </p>
          </div>
        </div>
      </div>

      {/* Kitchen Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Pending Orders</p>
                <p className="text-3xl font-bold text-yellow-600">{pendingOrders.length}</p>
              </div>
              <ClockIcon className="w-8 h-8 text-yellow-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Preparing</p>
                <p className="text-3xl font-bold text-blue-600">{preparingOrders.length}</p>
              </div>
              <FireIcon className="w-8 h-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Ready for Service</p>
                <p className="text-3xl font-bold text-green-600">{readyOrders.length}</p>
              </div>
              <CheckCircleIcon className="w-8 h-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Avg Prep Time</p>
                <p className="text-3xl font-bold text-purple-600">18 min</p>
              </div>
              <ClockIcon className="w-8 h-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Order Columns */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Pending Orders */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ClockIcon className="w-5 h-5 text-yellow-600" />
              Pending Orders ({pendingOrders.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {pendingOrders.map((order) => (
              <div key={order.id} className="border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 bg-yellow-50 dark:bg-yellow-900/20">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-gray-900 dark:text-white">
                      Order #{order.orderNumber}
                    </h3>
                    {getPriorityBadge(order.priority)}
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Table {order.tableNumber}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-500">
                      {formatDateTime(order.createdAt)}
                    </p>
                  </div>
                </div>

                <div className="space-y-2 mb-3">
                  {order.items.map((item) => (
                    <div key={item.id} className="flex items-center justify-between">
                      <div className="flex-1">
                        <p className="font-medium text-gray-900 dark:text-white">
                          {item.quantity}x {item.name}
                        </p>
                        {item.notes && (
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            Note: {item.notes}
                          </p>
                        )}
                      </div>
                      <Button
                        size="sm"
                        onClick={() => handleItemStatusChange(order.id, item.id, 'preparing')}
                        className="ml-2"
                      >
                        Start
                      </Button>
                    </div>
                  ))}
                </div>

                {order.specialInstructions && (
                  <div className="mb-3 p-2 bg-orange-100 dark:bg-orange-900/30 rounded text-sm text-orange-800 dark:text-orange-400">
                    ⚠️ {order.specialInstructions}
                  </div>
                )}

                <Button
                  onClick={() => handleOrderStatusChange(order.id, 'preparing')}
                  className="w-full"
                >
                  Start Preparing
                </Button>
              </div>
            ))}

            {pendingOrders.length === 0 && (
              <p className="text-center text-gray-500 dark:text-gray-400 py-8">
                No pending orders
              </p>
            )}
          </CardContent>
        </Card>

        {/* Preparing Orders */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FireIcon className="w-5 h-5 text-blue-600" />
              Preparing ({preparingOrders.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {preparingOrders.map((order) => (
              <div key={order.id} className="border border-blue-200 dark:border-blue-800 rounded-lg p-4 bg-blue-50 dark:bg-blue-900/20">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-gray-900 dark:text-white">
                      Order #{order.orderNumber}
                    </h3>
                    {getPriorityBadge(order.priority)}
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Table {order.tableNumber}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-500">
                      Est: {order.estimatedReadyTime ? formatDateTime(order.estimatedReadyTime) : 'TBD'}
                    </p>
                  </div>
                </div>

                <div className="space-y-2 mb-3">
                  {order.items.map((item) => (
                    <div key={item.id} className="flex items-center justify-between">
                      <div className="flex-1">
                        <p className="font-medium text-gray-900 dark:text-white">
                          {item.quantity}x {item.name}
                        </p>
                        {item.notes && (
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            Note: {item.notes}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        {getItemStatusBadge(item.status)}
                        {item.status !== 'ready' && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleItemStatusChange(order.id, item.id, 'ready')}
                          >
                            <CheckCircleIcon className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => handleOrderStatusChange(order.id, 'pending')}
                    className="flex-1"
                  >
                    Back to Pending
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => handleOrderStatusChange(order.id, 'ready')}
                    className="flex-1"
                  >
                    Mark Ready
                  </Button>
                </div>
              </div>
            ))}

            {preparingOrders.length === 0 && (
              <p className="text-center text-gray-500 dark:text-gray-400 py-8">
                No orders being prepared
              </p>
            )}
          </CardContent>
        </Card>

        {/* Ready Orders */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircleIcon className="w-5 h-5 text-green-600" />
              Ready for Service ({readyOrders.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {readyOrders.map((order) => (
              <div key={order.id} className="border border-green-200 dark:border-green-800 rounded-lg p-4 bg-green-50 dark:bg-green-900/20">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-gray-900 dark:text-white">
                      Order #{order.orderNumber}
                    </h3>
                    {getPriorityBadge(order.priority)}
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Table {order.tableNumber}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-500">
                      Ready since: {formatDateTime(order.estimatedReadyTime || order.createdAt)}
                    </p>
                  </div>
                </div>

                <div className="space-y-2 mb-3">
                  {order.items.map((item) => (
                    <div key={item.id} className="flex items-center justify-between">
                      <div className="flex-1">
                        <p className="font-medium text-gray-900 dark:text-white">
                          {item.quantity}x {item.name}
                        </p>
                        {item.notes && (
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            Note: {item.notes}
                          </p>
                        )}
                      </div>
                      <Badge variant="success">
                        READY
                      </Badge>
                    </div>
                  ))}
                </div>

                <Button
                  onClick={() => handleOrderStatusChange(order.id, 'served')}
                  className="w-full"
                >
                  Mark as Served
                </Button>
              </div>
            ))}

            {readyOrders.length === 0 && (
              <p className="text-center text-gray-500 dark:text-gray-400 py-8">
                No orders ready for service
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Order Details Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                  Order #{selectedOrder.orderNumber}
                </h2>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedOrder(null)}
                >
                  <XCircleIcon className="w-5 h-5" />
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="font-medium text-gray-900 dark:text-white mb-3">Order Details</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Table:</span>
                      <span className="font-medium text-gray-900 dark:text-white">
                        {selectedOrder.tableNumber}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Customer:</span>
                      <span className="font-medium text-gray-900 dark:text-white">
                        {selectedOrder.customerName || 'Walk-in'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Status:</span>
                      {getStatusBadge(selectedOrder.status)}
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Ordered:</span>
                      <span className="font-medium text-gray-900 dark:text-white">
                        {formatDateTime(selectedOrder.createdAt)}
                      </span>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="font-medium text-gray-900 dark:text-white mb-3">Order Items</h3>
                  <div className="space-y-3">
                    {selectedOrder.items.map((item) => (
                      <div key={item.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                        <div className="flex-1">
                          <p className="font-medium text-gray-900 dark:text-white">
                            {item.quantity}x {item.name}
                          </p>
                          {item.notes && (
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              Note: {item.notes}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          {getItemStatusBadge(item.status)}
                          {item.status !== 'ready' && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleItemStatusChange(selectedOrder.id, item.id, 'ready')}
                            >
                              <CheckCircleIcon className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {selectedOrder.specialInstructions && (
                <div className="mt-6 p-4 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
                  <h4 className="font-medium text-orange-800 dark:text-orange-400 mb-2">
                    Special Instructions
                  </h4>
                  <p className="text-orange-700 dark:text-orange-300">
                    {selectedOrder.specialInstructions}
                  </p>
                </div>
              )}

              <div className="flex justify-end gap-3 mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
                <Button
                  variant="secondary"
                  onClick={() => setSelectedOrder(null)}
                >
                  Close
                </Button>
                <Button onClick={() => handleOrderStatusChange(selectedOrder.id, 'ready')}>
                  Mark All Ready
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}