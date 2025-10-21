'use client';

import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { DataTable } from '@/components/ui/DataTable';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Select } from '@/components/ui/Select';
import { useAppSelector } from '@/lib/store';
import { formatCurrency, formatDateTime } from '@/lib/utils';
import {
    ClockIcon,
    EyeIcon,
    PlusIcon,
    ShoppingCartIcon,
    UserIcon
} from '@heroicons/react/24/outline';
import { useState } from 'react';
import toast from 'react-hot-toast';

interface Order {
  id: string;
  orderNumber: string;
  customerName?: string;
  customerPhone?: string;
  tableNumber: number;
  status: 'pending' | 'confirmed' | 'preparing' | 'ready' | 'served' | 'completed' | 'cancelled';
  items: Array<{
    id: string;
    name: string;
    quantity: number;
    price: number;
    notes?: string;
  }>;
  total: number;
  tax: number;
  tip?: number;
  discount?: number;
  paymentMethod?: 'cash' | 'card' | 'digital_wallet';
  paymentStatus: 'pending' | 'paid' | 'refunded';
  createdAt: string;
  updatedAt: string;
  servedAt?: string;
  completedAt?: string;
}

// Mock data for demonstration
const mockOrders: Order[] = [
  {
    id: '1',
    orderNumber: 'ORD-2024-001',
    customerName: 'John Doe',
    customerPhone: '+1 (555) 123-4567',
    tableNumber: 5,
    status: 'preparing',
    items: [
      { id: '1', name: 'Grilled Salmon', quantity: 1, price: 24.99, notes: 'Medium rare' },
      { id: '2', name: 'Caesar Salad', quantity: 1, price: 12.99 },
      { id: '3', name: 'House Wine', quantity: 2, price: 8.99 },
    ],
    total: 55.96,
    tax: 4.48,
    tip: 8.39,
    paymentMethod: 'card',
    paymentStatus: 'paid',
    createdAt: '2024-01-20T18:30:00Z',
    updatedAt: '2024-01-20T18:45:00Z',
  },
  {
    id: '2',
    orderNumber: 'ORD-2024-002',
    customerName: 'Jane Smith',
    tableNumber: 8,
    status: 'pending',
    items: [
      { id: '4', name: 'Chicken Parmesan', quantity: 1, price: 18.99 },
      { id: '5', name: 'Garlic Bread', quantity: 1, price: 6.99 },
      { id: '6', name: 'Soft Drink', quantity: 1, price: 2.99 },
    ],
    total: 28.97,
    tax: 2.32,
    paymentMethod: 'cash',
    paymentStatus: 'pending',
    createdAt: '2024-01-20T18:35:00Z',
    updatedAt: '2024-01-20T18:35:00Z',
  },
  {
    id: '3',
    orderNumber: 'ORD-2024-003',
    tableNumber: 12,
    status: 'ready',
    items: [
      { id: '7', name: 'Margherita Pizza', quantity: 1, price: 16.99 },
      { id: '8', name: 'Caesar Salad', quantity: 1, price: 12.99 },
    ],
    total: 29.98,
    tax: 2.40,
    paymentStatus: 'paid',
    createdAt: '2024-01-20T18:20:00Z',
    updatedAt: '2024-01-20T18:40:00Z',
    servedAt: '2024-01-20T18:40:00Z',
  },
];

export default function OrdersPage() {
  const { user } = useAppSelector((state) => state.auth);
  const [orders, setOrders] = useState<Order[]>(mockOrders);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);

  const handleStatusChange = (orderId: string, newStatus: Order['status']) => {
    setOrders(prev => prev.map(order =>
      order.id === orderId
        ? {
            ...order,
            status: newStatus,
            updatedAt: new Date().toISOString(),
            ...(newStatus === 'served' && !order.servedAt && { servedAt: new Date().toISOString() }),
            ...(newStatus === 'completed' && !order.completedAt && { completedAt: new Date().toISOString() }),
          }
        : order
    ));
    toast.success(`Order status updated to ${newStatus}`);
  };

  const openViewModal = (order: Order) => {
    setSelectedOrder(order);
    setIsViewModalOpen(true);
  };

  const getStatusBadge = (status: Order['status']) => {
    const variants = {
      pending: 'warning',
      confirmed: 'info',
      preparing: 'info',
      ready: 'success',
      served: 'success',
      completed: 'secondary',
      cancelled: 'danger',
    } as const;

    return <Badge variant={variants[status]}>{status}</Badge>;
  };

  const getPaymentStatusBadge = (status: Order['paymentStatus']) => {
    const variants = {
      pending: 'warning',
      paid: 'success',
      refunded: 'danger',
    } as const;

    return <Badge variant={variants[status]}>{status}</Badge>;
  };

  const columns = [
    {
      key: 'orderNumber',
      title: 'Order #',
      sortable: true,
      render: (value: string, row: Order) => (
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
            <ShoppingCartIcon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <p className="font-medium text-gray-900 dark:text-white">{value}</p>
            <p className="text-sm text-gray-500 dark:text-gray-400">Table {row.tableNumber}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'customerName',
      title: 'Customer',
      render: (value: string) => (
        <div className="flex items-center gap-2">
          <UserIcon className="w-4 h-4 text-gray-400" />
          <span className="text-sm text-gray-600 dark:text-gray-400">
            {value || 'Walk-in'}
          </span>
        </div>
      ),
    },
    {
      key: 'items',
      title: 'Items',
      render: (value: any, row: Order) => (
        <div className="text-sm text-gray-600 dark:text-gray-400">
          {row.items.length} items
          <br />
          <span className="font-medium text-gray-900 dark:text-white">
            {formatCurrency(row.total)}
          </span>
        </div>
      ),
    },
    {
      key: 'status',
      title: 'Status',
      render: (value: Order['status']) => getStatusBadge(value),
    },
    {
      key: 'paymentStatus',
      title: 'Payment',
      render: (value: Order['paymentStatus']) => getPaymentStatusBadge(value),
    },
    {
      key: 'createdAt',
      title: 'Time',
      render: (value: string) => (
        <span className="text-sm text-gray-600 dark:text-gray-400">
          {new Date(value).toLocaleTimeString()}
        </span>
      ),
    },
    {
      key: 'actions',
      title: 'Actions',
      render: (value: any, row: Order) => (
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => openViewModal(row)}
          >
            <EyeIcon className="w-4 h-4" />
          </Button>
          {row.status !== 'completed' && row.status !== 'cancelled' && (
            <Select
              options={[
                { value: 'pending', label: 'Pending' },
                { value: 'confirmed', label: 'Confirmed' },
                { value: 'preparing', label: 'Preparing' },
                { value: 'ready', label: 'Ready' },
                { value: 'served', label: 'Served' },
                { value: 'completed', label: 'Completed' },
                { value: 'cancelled', label: 'Cancelled' },
              ]}
              value={row.status}
              onChange={(value) => handleStatusChange(row.id, value as Order['status'])}
              className="w-32"
            />
          )}
        </div>
      ),
    },
  ];

  const stats = {
    total: orders.length,
    pending: orders.filter(o => o.status === 'pending').length,
    preparing: orders.filter(o => o.status === 'preparing').length,
    ready: orders.filter(o => o.status === 'ready').length,
    completed: orders.filter(o => o.status === 'completed').length,
    totalRevenue: orders.filter(o => o.paymentStatus === 'paid').reduce((sum, o) => sum + o.total, 0),
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Orders Management</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Manage restaurant orders and transactions
          </p>
        </div>
        <Button onClick={() => setIsCreateModalOpen(true)}>
          <PlusIcon className="w-5 h-5 mr-2" />
          New Order
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Total Orders</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white">{stats.total}</p>
              </div>
              <ShoppingCartIcon className="w-8 h-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Pending</p>
                <p className="text-3xl font-bold text-yellow-600">{stats.pending}</p>
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
                <p className="text-3xl font-bold text-orange-600">{stats.preparing}</p>
              </div>
              <ClockIcon className="w-8 h-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Ready</p>
                <p className="text-3xl font-bold text-green-600">{stats.ready}</p>
              </div>
              <ClockIcon className="w-8 h-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Revenue</p>
                <p className="text-3xl font-bold text-purple-600">{formatCurrency(stats.totalRevenue)}</p>
              </div>
              <ShoppingCartIcon className="w-8 h-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <Input
                placeholder="Search orders..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="w-full sm:w-48">
              <Select
                options={[
                  { value: 'all', label: 'All Status' },
                  { value: 'pending', label: 'Pending' },
                  { value: 'confirmed', label: 'Confirmed' },
                  { value: 'preparing', label: 'Preparing' },
                  { value: 'ready', label: 'Ready' },
                  { value: 'served', label: 'Served' },
                  { value: 'completed', label: 'Completed' },
                  { value: 'cancelled', label: 'Cancelled' },
                ]}
                value={statusFilter}
                onChange={setStatusFilter}
                placeholder="Filter by status"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Orders Table */}
      <DataTable
        data={orders}
        columns={columns}
        loading={false}
        searchable={false}
        selectable={true}
        pagination={{
          currentPage,
          totalPages: Math.ceil(orders.length / itemsPerPage),
          itemsPerPage,
          totalItems: orders.length,
          onPageChange: setCurrentPage,
          onItemsPerPageChange: setItemsPerPage,
        }}
        exportable={true}
        exportFilename="orders"
        onExport={(format, items) => {
          console.log(`Exporting ${items.length} orders as ${format}`);
        }}
        emptyMessage="No orders found."
      />

      {/* Order Details Modal */}
      <Modal
        isOpen={isViewModalOpen}
        onClose={() => {
          setIsViewModalOpen(false);
          setSelectedOrder(null);
        }}
        title={`Order Details - ${selectedOrder?.orderNumber}`}
        className="max-w-4xl"
      >
        {selectedOrder && (
          <div className="space-y-6">
            {/* Order Header */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <h3 className="font-medium text-gray-900 dark:text-white mb-2">Order Information</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Order #:</span>
                    <span className="font-medium text-gray-900 dark:text-white">{selectedOrder.orderNumber}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Table:</span>
                    <span className="font-medium text-gray-900 dark:text-white">{selectedOrder.tableNumber}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Status:</span>
                    {getStatusBadge(selectedOrder.status)}
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Payment:</span>
                    {getPaymentStatusBadge(selectedOrder.paymentStatus)}
                  </div>
                </div>
              </div>

              <div>
                <h3 className="font-medium text-gray-900 dark:text-white mb-2">Customer Details</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Name:</span>
                    <span className="font-medium text-gray-900 dark:text-white">
                      {selectedOrder.customerName || 'Walk-in Customer'}
                    </span>
                  </div>
                  {selectedOrder.customerPhone && (
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Phone:</span>
                      <span className="font-medium text-gray-900 dark:text-white">{selectedOrder.customerPhone}</span>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <h3 className="font-medium text-gray-900 dark:text-white mb-2">Timestamps</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Ordered:</span>
                    <span className="font-medium text-gray-900 dark:text-white">
                      {formatDateTime(selectedOrder.createdAt)}
                    </span>
                  </div>
                  {selectedOrder.servedAt && (
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Served:</span>
                      <span className="font-medium text-gray-900 dark:text-white">
                        {formatDateTime(selectedOrder.servedAt)}
                      </span>
                    </div>
                  )}
                  {selectedOrder.completedAt && (
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Completed:</span>
                      <span className="font-medium text-gray-900 dark:text-white">
                        {formatDateTime(selectedOrder.completedAt)}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Order Items */}
            <div>
              <h3 className="font-medium text-gray-900 dark:text-white mb-4">Order Items</h3>
              <div className="space-y-3">
                {selectedOrder.items.map((item) => (
                  <div key={item.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <div className="flex-1">
                      <p className="font-medium text-gray-900 dark:text-white">{item.name}</p>
                      {item.notes && (
                        <p className="text-sm text-gray-600 dark:text-gray-400">Note: {item.notes}</p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-gray-900 dark:text-white">
                        {item.quantity} × {formatCurrency(item.price)}
                      </p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {formatCurrency(item.quantity * item.price)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Order Summary */}
            <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
              <div className="max-w-md ml-auto space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">Subtotal:</span>
                  <span className="font-medium text-gray-900 dark:text-white">
                    {formatCurrency(selectedOrder.total - selectedOrder.tax)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">Tax:</span>
                  <span className="font-medium text-gray-900 dark:text-white">
                    {formatCurrency(selectedOrder.tax)}
                  </span>
                </div>
                {selectedOrder.tip && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400">Tip:</span>
                    <span className="font-medium text-gray-900 dark:text-white">
                      {formatCurrency(selectedOrder.tip)}
                    </span>
                  </div>
                )}
                {selectedOrder.discount && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400">Discount:</span>
                    <span className="font-medium text-green-600">
                      -{formatCurrency(selectedOrder.discount)}
                    </span>
                  </div>
                )}
                <div className="border-t border-gray-200 dark:border-gray-700 pt-2">
                  <div className="flex justify-between text-lg font-bold">
                    <span className="text-gray-900 dark:text-white">Total:</span>
                    <span className="text-gray-900 dark:text-white">
                      {formatCurrency(selectedOrder.total + (selectedOrder.tip || 0) - (selectedOrder.discount || 0))}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
              <Button
                variant="secondary"
                onClick={() => {
                  setIsViewModalOpen(false);
                  setSelectedOrder(null);
                }}
              >
                Close
              </Button>
              {selectedOrder.status !== 'completed' && selectedOrder.status !== 'cancelled' && (
                <Select
                  options={[
                    { value: 'pending', label: 'Mark Pending' },
                    { value: 'confirmed', label: 'Mark Confirmed' },
                    { value: 'preparing', label: 'Mark Preparing' },
                    { value: 'ready', label: 'Mark Ready' },
                    { value: 'served', label: 'Mark Served' },
                    { value: 'completed', label: 'Mark Completed' },
                    { value: 'cancelled', label: 'Cancel Order' },
                  ]}
                  value={selectedOrder.status}
                  onChange={(value) => handleStatusChange(selectedOrder.id, value as Order['status'])}
                  className="w-40"
                />
              )}
            </div>
          </div>
        )}
      </Modal>

      {/* Create Order Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Create New Order"
        className="max-w-2xl"
      >
        <div className="space-y-4">
          <p className="text-gray-600 dark:text-gray-400">
            Order creation functionality would be implemented here with menu item selection, customer details, and table assignment.
          </p>

          <div className="flex justify-end gap-3 pt-4">
            <Button
              variant="secondary"
              onClick={() => setIsCreateModalOpen(false)}
            >
              Cancel
            </Button>
            <Button>
              Create Order
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}