'use client';

import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { DataTable } from '@/components/ui/DataTable';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Select } from '@/components/ui/Select';
import { useGetOrderByIdQuery, useGetOrdersQuery } from '@/lib/api/endpoints/ordersApi';
import { useAppSelector } from '@/lib/store';
import { formatCurrency, formatDateTime } from '@/lib/utils';
import {
  ClockIcon,
  CurrencyDollarIcon,
  DocumentTextIcon,
  EyeIcon,
  MagnifyingGlassIcon,
  PrinterIcon,
  UserIcon
} from '@heroicons/react/24/outline';
import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';

interface Order {
  id: string;
  orderNumber: string;
  customerName: string;
  customerPhone?: string;
  customerEmail?: string;
  tableNumber?: number | string;
  status: 'pending' | 'preparing' | 'ready' | 'served' | 'cancelled' | 'completed';
  total: number;
  subtotal: number;
  tax: number;
  tip?: number;
  items: Array<{
    id: string;
    name: string;
    quantity: number;
    price: number;
    total: number;
    notes?: string;
  }>;
  createdAt: string;
  completedAt?: string;
  notes?: string;
  paymentMethod: string;
  paymentStatus?: 'pending' | 'paid' | 'partially_paid' | 'refunded';
  waiterName?: string;
  orderType?: string;
}

export default function OrderHistoryPage() {
  const { user, companyContext } = useAppSelector((state) => state.auth);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');
  const [paymentFilter, setPaymentFilter] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [selectedOrderId, setSelectedOrderId] = useState<string>('');

  const branchId = (user as any)?.branchId || 
                   (companyContext as any)?.branchId || 
                   (companyContext as any)?.branches?.[0]?._id ||
                   (companyContext as any)?.branches?.[0]?.id;

  // Calculate date range based on filter
  const dateRange = useMemo(() => {
    const today = new Date();
    const start = new Date();
    const end = new Date(today);
    end.setHours(23, 59, 59, 999);

    switch (dateFilter) {
      case 'today':
        start.setHours(0, 0, 0, 0);
        return { start: start.toISOString().split('T')[0], end: end.toISOString().split('T')[0] };
      case 'yesterday':
        start.setDate(today.getDate() - 1);
        start.setHours(0, 0, 0, 0);
        end.setDate(today.getDate() - 1);
        end.setHours(23, 59, 59, 999);
        return { start: start.toISOString().split('T')[0], end: end.toISOString().split('T')[0] };
      case 'this_week':
        start.setDate(today.getDate() - today.getDay());
        start.setHours(0, 0, 0, 0);
        return { start: start.toISOString().split('T')[0], end: end.toISOString().split('T')[0] };
      case 'this_month':
        start.setDate(1);
        start.setHours(0, 0, 0, 0);
        return { start: start.toISOString().split('T')[0], end: end.toISOString().split('T')[0] };
      case 'custom':
        return { start: startDate, end: endDate };
      default:
        return { start: undefined, end: undefined };
    }
  }, [dateFilter, startDate, endDate]);

  const { data: ordersResponse, isLoading, error, refetch } = useGetOrdersQuery({
    branchId,
    search: searchQuery || undefined,
    status: statusFilter !== 'all' ? statusFilter : undefined,
    startDate: dateRange.start,
    endDate: dateRange.end,
    page: currentPage,
    limit: itemsPerPage,
  }, { skip: !branchId });

  const { data: selectedOrderData } = useGetOrderByIdQuery(selectedOrderId, {
    skip: !selectedOrderId || !isDetailsModalOpen,
  });

  // Extract orders from API response
  const orders = useMemo(() => {
    if (!ordersResponse) return [];
    
    const response = ordersResponse as any;
    let items = [];
    
    if (response.data) {
      items = response.data.orders || response.data.items || [];
    } else {
      items = response.orders || response.items || [];
    }
    
    if (!Array.isArray(items)) return [];
    
    return items.map((order: any) => ({
      id: order._id || order.id,
      orderNumber: order.orderNumber || order.order_id,
      customerName: order.customerId?.name || order.customer?.name || 'Walk-in',
      customerPhone: order.customerId?.phone || order.customer?.phone,
      customerEmail: order.customerId?.email || order.customer?.email,
      tableNumber: order.tableId?.number || order.tableId?.tableNumber || order.tableNumber,
      status: order.status || 'pending',
      total: order.total || order.totalAmount || 0,
      subtotal: order.subtotal || order.total - (order.tax || 0),
      tax: order.tax || order.taxAmount || 0,
      tip: order.tip || order.tipAmount,
      items: order.items?.map((item: any) => ({
        id: item._id || item.id,
        name: item.menuItemId?.name || item.name,
        quantity: item.quantity,
        price: item.price,
        total: item.quantity * item.price,
        notes: item.notes,
      })) || [],
      createdAt: order.createdAt || new Date().toISOString(),
      completedAt: order.completedAt,
      notes: order.notes,
      paymentMethod: order.paymentMethod || 'cash',
      paymentStatus: order.paymentStatus || (order.status === 'completed' ? 'paid' : 'pending'),
      waiterName: order.waiterId?.name || order.waiter?.name,
      orderType: order.orderType || 'dine_in',
    }));
  }, [ordersResponse]);

  const totalOrders = useMemo(() => {
    const response = ordersResponse as any;
    if (response?.data?.total) return response.data.total;
    if (response?.total) return response.total;
    return orders.length;
  }, [ordersResponse, orders.length]);

  // Client-side payment filter
  const filteredByPayment = useMemo(() => {
    if (paymentFilter === 'all') return orders;
    return orders.filter(o => o.paymentMethod?.toLowerCase() === paymentFilter.toLowerCase());
  }, [orders, paymentFilter]);

  // Update selected order when data loads
  useEffect(() => {
    if (selectedOrderData && selectedOrderId) {
      const orderData = selectedOrderData as any;
      setSelectedOrder({
        id: orderData._id || orderData.id,
        orderNumber: orderData.orderNumber || orderData.order_id,
        customerName: orderData.customerId?.name || orderData.customer?.name || 'Walk-in',
        customerPhone: orderData.customerId?.phone || orderData.customer?.phone,
        customerEmail: orderData.customerId?.email || orderData.customer?.email,
        tableNumber: orderData.tableId?.number || orderData.tableId?.tableNumber || orderData.tableNumber,
        status: orderData.status || 'pending',
        total: orderData.total || orderData.totalAmount || 0,
        subtotal: orderData.subtotal || orderData.total - (orderData.tax || 0),
        tax: orderData.tax || orderData.taxAmount || 0,
        tip: orderData.tip || orderData.tipAmount,
        items: orderData.items?.map((item: any) => ({
          id: item._id || item.id,
          name: item.menuItemId?.name || item.name,
          quantity: item.quantity,
          price: item.price,
          total: item.quantity * item.price,
          notes: item.notes,
        })) || [],
        createdAt: orderData.createdAt || new Date().toISOString(),
        completedAt: orderData.completedAt,
        notes: orderData.notes,
        paymentMethod: orderData.paymentMethod || 'cash',
        paymentStatus: orderData.paymentStatus || (orderData.status === 'completed' ? 'paid' : 'pending'),
        waiterName: orderData.waiterId?.name || orderData.waiter?.name,
        orderType: orderData.orderType || 'dine_in',
      });
    }
  }, [selectedOrderData, selectedOrderId]);

  const openDetailsModal = (order: Order) => {
    setSelectedOrder(order);
    setSelectedOrderId(order.id);
    setIsDetailsModalOpen(true);
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { label: 'Pending', variant: 'warning' as const },
      preparing: { label: 'Preparing', variant: 'info' as const },
      ready: { label: 'Ready', variant: 'info' as const },
      served: { label: 'Served', variant: 'success' as const },
      completed: { label: 'Completed', variant: 'success' as const },
      cancelled: { label: 'Cancelled', variant: 'danger' as const },
    };
    return statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
  };

  const columns = [
    {
      key: 'orderNumber',
      title: 'Order #',
      sortable: true,
      render: (value: string) => (
        <div className="flex items-center gap-2">
          <DocumentTextIcon className="w-4 h-4 text-gray-400" />
          <span className="font-medium text-gray-900 dark:text-white">{value}</span>
        </div>
      ),
    },
    {
      key: 'customerName',
      title: 'Customer',
      sortable: true,
      render: (value: string, row: Order) => (
        <div className="flex items-center gap-2">
          <UserIcon className="w-4 h-4 text-gray-400" />
          <div>
            <p className="font-medium text-gray-900 dark:text-white">
              {value || 'Walk-in'}
            </p>
            {row.customerPhone && (
              <p className="text-xs text-gray-500 dark:text-gray-400">{row.customerPhone}</p>
            )}
          </div>
        </div>
      ),
    },
    {
      key: 'tableNumber',
      title: 'Table',
      render: (value?: number | string) => (
        <span className="font-medium text-gray-900 dark:text-white">
          {value ? (typeof value === 'number' ? `Table ${value}` : `Table ${value}`) : 'Takeout'}
        </span>
      ),
    },
    {
      key: 'total',
      title: 'Total',
      align: 'right' as const,
      sortable: true,
      render: (value: number) => (
        <span className="font-semibold text-gray-900 dark:text-white">
          {formatCurrency(value)}
        </span>
      ),
    },
    {
      key: 'status',
      title: 'Status',
      render: (value: string) => {
        const statusConfig = getStatusBadge(value);
        return (
          <Badge variant={statusConfig.variant}>
            {statusConfig.label}
          </Badge>
        );
      },
    },
    {
      key: 'orderType',
      title: 'Type',
      render: (value?: string) => (
        <Badge variant="secondary" className="capitalize">
          {value ? value.replace('_', ' ') : 'Dine In'}
        </Badge>
      ),
    },
    {
      key: 'createdAt',
      title: 'Date',
      sortable: true,
      render: (value: string) => (
        <div className="text-sm text-gray-600 dark:text-gray-400">
          {formatDateTime(value)}
        </div>
      ),
    },
    {
      key: 'actions',
      title: 'Actions',
      render: (value: any, row: Order) => (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => openDetailsModal(row)}
        >
          <EyeIcon className="w-4 h-4" />
        </Button>
      ),
    },
  ];

  const stats = useMemo(() => {
    const completedOrders = orders.filter(o => o.status === 'completed');
    const paidOrders = orders.filter(o => o.paymentStatus === 'paid' || o.status === 'completed');
    
    return {
      total: totalOrders,
      totalRevenue: paidOrders.reduce((sum, o) => sum + o.total, 0),
      completed: completedOrders.length,
      cancelled: orders.filter(o => o.status === 'cancelled').length,
    };
  }, [orders, totalOrders]);
  
  const filteredOrders = useMemo(() => {
    return filteredByPayment; // Filtered by payment method
  }, [filteredByPayment]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Order History</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            View and analyze past orders with advanced filtering
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Total Orders</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white">{stats.total}</p>
              </div>
              <DocumentTextIcon className="w-8 h-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Total Revenue</p>
                <p className="text-3xl font-bold text-green-600">{formatCurrency(stats.totalRevenue)}</p>
              </div>
              <CurrencyDollarIcon className="w-8 h-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Completed</p>
                <p className="text-3xl font-bold text-blue-600">{stats.completed}</p>
              </div>
              <ClockIcon className="w-8 h-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Cancelled</p>
                <p className="text-3xl font-bold text-red-600">{stats.cancelled}</p>
              </div>
              <DocumentTextIcon className="w-8 h-8 text-red-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Search orders..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select
              options={[
                { value: 'all', label: 'All Status' },
                { value: 'pending', label: 'Pending' },
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
            <Select
              options={[
                { value: 'all', label: 'All Dates' },
                { value: 'today', label: 'Today' },
                { value: 'yesterday', label: 'Yesterday' },
                { value: 'this_week', label: 'This Week' },
                { value: 'this_month', label: 'This Month' },
                { value: 'custom', label: 'Custom Range' },
              ]}
              value={dateFilter}
              onChange={setDateFilter}
              placeholder="Filter by date"
            />
            {dateFilter === 'custom' && (
              <div className="col-span-5 grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Start Date
                  </label>
                  <Input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    End Date
                  </label>
                  <Input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                  />
                </div>
              </div>
            )}
            <Select
              options={[
                { value: 'all', label: 'All Payments' },
                { value: 'cash', label: 'Cash' },
                { value: 'card', label: 'Card' },
                { value: 'digital_wallet', label: 'Digital Wallet' },
                { value: 'bank_transfer', label: 'Bank Transfer' },
              ]}
              value={paymentFilter}
              onChange={setPaymentFilter}
              placeholder="Filter by payment"
            />
            <Button
              variant="secondary"
              onClick={() => {
                setSearchQuery('');
                setStatusFilter('all');
                setDateFilter('all');
                setPaymentFilter('all');
                setStartDate('');
                setEndDate('');
              }}
            >
              Clear Filters
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Orders Table */}
      {isLoading ? (
        <Card>
          <CardContent className="p-6">
            <div className="text-center py-12">
              <p className="text-gray-500 dark:text-gray-400">Loading order history...</p>
            </div>
          </CardContent>
        </Card>
      ) : error ? (
        <Card>
          <CardContent className="p-6">
            <div className="text-center py-12">
              <p className="text-red-600">Error loading orders. Please try again.</p>
              <Button onClick={() => refetch()} className="mt-4">
                Retry
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <DataTable
          data={filteredOrders}
          columns={columns}
          loading={isLoading}
          searchable={false}
          selectable={true}
          pagination={{
            currentPage,
            totalPages: Math.ceil(totalOrders / itemsPerPage),
            itemsPerPage,
            totalItems: totalOrders,
            onPageChange: setCurrentPage,
            onItemsPerPageChange: setItemsPerPage,
          }}
          exportable={true}
          exportFilename="order-history"
          onExport={(format, items) => {
            console.log(`Exporting ${items.length} orders as ${format}`);
            toast.success(`Exporting ${items.length} orders as ${format.toUpperCase()}`);
          }}
          emptyMessage="No orders found."
        />
      )}

      {/* Order Details Modal */}
      <Modal
        isOpen={isDetailsModalOpen}
        onClose={() => {
          setIsDetailsModalOpen(false);
          setSelectedOrder(null);
        }}
        title={`Order #${selectedOrder?.orderNumber}`}
        className="max-w-4xl"
      >
        {selectedOrder && (
          <div className="space-y-6">
            {/* Order Header */}
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                  Order #{selectedOrder.orderNumber}
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  {formatDateTime(selectedOrder.createdAt)}
                </p>
              </div>
              <Badge variant={getStatusBadge(selectedOrder.status).variant}>
                {getStatusBadge(selectedOrder.status).label}
              </Badge>
            </div>

            {/* Customer & Order Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-medium text-gray-900 dark:text-white mb-3">Customer Information</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Name:</span>
                    <span className="font-medium text-gray-900 dark:text-white">{selectedOrder.customerName}</span>
                  </div>
                  {selectedOrder.customerPhone && (
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Phone:</span>
                      <span className="font-medium text-gray-900 dark:text-white">{selectedOrder.customerPhone}</span>
                    </div>
                  )}
                  {selectedOrder.customerEmail && (
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Email:</span>
                      <span className="font-medium text-gray-900 dark:text-white">{selectedOrder.customerEmail}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Table:</span>
                    <span className="font-medium text-gray-900 dark:text-white">
                      {selectedOrder.tableNumber ? `Table ${selectedOrder.tableNumber}` : 'Takeout'}
                    </span>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="font-medium text-gray-900 dark:text-white mb-3">Order Summary</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Payment Method:</span>
                    <Badge variant="secondary" className="capitalize">
                      {selectedOrder.paymentMethod.replace('_', ' ')}
                    </Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Subtotal:</span>
                    <span className="font-medium text-gray-900 dark:text-white">{formatCurrency(selectedOrder.subtotal)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Tax:</span>
                    <span className="font-medium text-gray-900 dark:text-white">{formatCurrency(selectedOrder.tax)}</span>
                  </div>
                  {selectedOrder.tip && (
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Tip:</span>
                      <span className="font-medium text-gray-900 dark:text-white">{formatCurrency(selectedOrder.tip)}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-semibold text-lg">
                    <span className="text-gray-900 dark:text-white">Total:</span>
                    <span className="text-primary-600">{formatCurrency(selectedOrder.total)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Order Items */}
            <div>
              <h4 className="font-medium text-gray-900 dark:text-white mb-3">Order Items</h4>
              <div className="bg-gray-50 dark:bg-gray-800 rounded-lg overflow-hidden">
                <div className="max-h-64 overflow-y-auto">
                  {selectedOrder.items.map((item, index) => (
                    <div key={item.id} className={`p-4 ${index !== selectedOrder.items.length - 1 ? 'border-b border-gray-200 dark:border-gray-700' : ''}`}>
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <p className="font-medium text-gray-900 dark:text-white">{item.name}</p>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            {item.quantity} × {formatCurrency(item.price)}
                          </p>
                          {item.notes && (
                            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                              Note: {item.notes}
                            </p>
                          )}
                        </div>
                        <p className="font-medium text-gray-900 dark:text-white">
                          {formatCurrency(item.total)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {selectedOrder.notes && (
              <div>
                <h4 className="font-medium text-gray-900 dark:text-white mb-2">Notes</h4>
                <p className="text-sm text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-800 p-3 rounded-lg">
                  {selectedOrder.notes}
                </p>
              </div>
            )}

            {selectedOrder.waiterName && (
              <div>
                <h4 className="font-medium text-gray-900 dark:text-white mb-2">Served By</h4>
                <p className="text-sm text-gray-600 dark:text-gray-400">{selectedOrder.waiterName}</p>
              </div>
            )}

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
              <Button
                variant="secondary"
                onClick={() => {
                  setIsDetailsModalOpen(false);
                  setSelectedOrder(null);
                  setSelectedOrderId('');
                }}
              >
                Close
              </Button>
              <Button 
                variant="secondary"
                onClick={() => {
                  if (selectedOrder?.id) {
                    window.open(`/dashboard/pos/receipts/${selectedOrder.id}`, '_blank');
                  } else {
                    toast.error('Receipt not available');
                  }
                }}
              >
                <PrinterIcon className="w-4 h-4 mr-2" />
                Print Receipt
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
