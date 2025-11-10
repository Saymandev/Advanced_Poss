'use client';

import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { DataTable } from '@/components/ui/DataTable';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Select } from '@/components/ui/Select';
import { useCancelPOSOrderMutation, useGetPOSOrderQuery, useGetPOSOrdersQuery, useUpdatePOSOrderMutation } from '@/lib/api/endpoints/posApi';
import { useAppSelector } from '@/lib/store';
import { formatCurrency, formatDateTime } from '@/lib/utils';
import {
  ArrowPathIcon,
  BanknotesIcon,
  ClockIcon,
  CurrencyDollarIcon,
  EyeIcon,
  MagnifyingGlassIcon,
  PlusIcon,
  PrinterIcon,
  ShoppingCartIcon,
  UserIcon,
  XCircleIcon
} from '@heroicons/react/24/outline';
import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';

interface Order {
  id: string;
  orderNumber: string;
  customerName?: string;
  customerPhone?: string;
  tableNumber: number | string;
  status: string;
  orderType?: 'dine-in' | 'takeaway' | 'delivery' | string;
  waiterName?: string;
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
  paymentStatus: string;
  createdAt: string;
  updatedAt: string;
  servedAt?: string;
  completedAt?: string;
}

type QuickRange = 'last7' | 'today' | 'yesterday' | 'thisMonth' | 'custom';

const formatDateInput = (date: Date) => {
  const tzOffsetMs = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - tzOffsetMs).toISOString().split('T')[0];
};

const computeDateRange = (range: QuickRange): { start: string; end: string } => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const end = new Date(today);

  switch (range) {
    case 'today':
      return { start: formatDateInput(today), end: formatDateInput(end) };
    case 'yesterday': {
      const start = new Date(today);
      start.setDate(start.getDate() - 1);
      return { start: formatDateInput(start), end: formatDateInput(start) };
    }
    case 'thisMonth': {
      const start = new Date(today.getFullYear(), today.getMonth(), 1);
      return { start: formatDateInput(start), end: formatDateInput(end) };
    }
    case 'last7':
    default: {
      const start = new Date(today);
      start.setDate(start.getDate() - 6);
      return { start: formatDateInput(start), end: formatDateInput(end) };
    }
  }
};

// Mock data for demonstration (not used - replaced by API)
const _mockOrders: Order[] = [
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
  const { user, companyContext } = useAppSelector((state) => state.auth);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [selectedOrderId, setSelectedOrderId] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [committedSearch, setCommittedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [orderTypeFilter, setOrderTypeFilter] = useState<'all' | 'dine-in' | 'takeaway' | 'delivery'>('all');
  const [activeQuickRange, setActiveQuickRange] = useState<QuickRange>('last7');
  const [dateRange, setDateRange] = useState(() => computeDateRange('last7'));
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);
  
  const branchId = (user as any)?.branchId || 
                   (companyContext as any)?.branchId || 
                   (companyContext as any)?.branches?.[0]?._id ||
                   (companyContext as any)?.branches?.[0]?.id;
  
  const { data: ordersResponse, isLoading, error, refetch } = useGetPOSOrdersQuery({
    branchId,
    search: committedSearch || undefined,
    status: statusFilter !== 'all' ? statusFilter : undefined,
    orderType: orderTypeFilter !== 'all' ? orderTypeFilter : undefined,
    startDate: dateRange.start,
    endDate: dateRange.end,
    page: currentPage,
    limit: itemsPerPage,
  }, { skip: !branchId });
  
  const { data: selectedOrderData } = useGetPOSOrderQuery(selectedOrderId, {
    skip: !selectedOrderId || !isViewModalOpen,
  });
  
  const [updatePOSOrder, { isLoading: isUpdatingStatus }] = useUpdatePOSOrderMutation();
  const [cancelPOSOrder, { isLoading: isCancelling }] = useCancelPOSOrderMutation();

  const handleQuickRange = (range: QuickRange) => {
    setActiveQuickRange(range);
    setDateRange(computeDateRange(range));
    setCurrentPage(1);
  };

  const handleDateInputChange = (field: 'start' | 'end', value: string) => {
    if (!value) {
      return;
    }
    setDateRange((prev) => {
      const next = { ...prev, [field]: value } as { start: string; end: string };
      if (field === 'start' && new Date(value) > new Date(next.end)) {
        next.end = value;
      }
      if (field === 'end' && new Date(value) < new Date(next.start)) {
        next.start = value;
      }
      return next;
    });
    setActiveQuickRange('custom');
    setCurrentPage(1);
  };

  const handleStatusFilterChange = (value: string) => {
    setStatusFilter(value);
    setCurrentPage(1);
  };

  const handleOrderTypeFilterChange = (value: 'all' | 'dine-in' | 'takeaway' | 'delivery') => {
    setOrderTypeFilter(value);
    setCurrentPage(1);
  };

  const handleSearchSubmit = () => {
    const trimmed = searchTerm.trim();
    if (trimmed === committedSearch) return;
    setCommittedSearch(trimmed);
    setCurrentPage(1);
  };

  const handleClearSearch = () => {
    if (!committedSearch && !searchTerm) return;
    setSearchTerm('');
    setCommittedSearch('');
    setCurrentPage(1);
  };

  const handleRefresh = () => {
    refetch();
    toast.success('Orders refreshed');
  };
  
  // Extract orders from API response
  const orders = useMemo(() => {
    const items = ordersResponse?.orders ?? [];
    return items.map((order: any) => {
      const rawType = order.orderType || order.order_type || order.type || 'dine-in';
      const normalizedType = typeof rawType === 'string' ? rawType.replace('_', '-') : 'dine-in';

      return {
        id: order._id || order.id,
        orderNumber: order.orderNumber,
        customerName: order.customerInfo?.name || order.customerName || 'Walk-in',
        customerPhone: order.customerInfo?.phone || order.customerPhone,
        tableNumber:
          order.tableId?.tableNumber ||
          order.tableId?.number ||
          order.tableNumber ||
          '—',
        status: order.status || 'pending',
        orderType: normalizedType,
        items:
          order.items?.map((item: any) => ({
            id: item._id || item.id || item.menuItemId?._id || item.menuItemId,
            name: item.menuItemId?.name || item.name,
            quantity: item.quantity,
            price: item.price,
            notes: item.notes,
          })) || [],
        total: order.totalAmount ?? order.total ?? 0,
        tax: order.taxAmount ?? order.tax ?? 0,
        tip: order.tipAmount ?? order.tip,
        discount: order.discountAmount ?? order.discount,
        paymentMethod: order.paymentMethod,
        paymentStatus: order.status === 'paid' ? 'paid' : 'pending',
        createdAt: order.createdAt || new Date().toISOString(),
        updatedAt: order.updatedAt || new Date().toISOString(),
        servedAt: order.servedAt,
        completedAt: order.completedAt,
        waiterName:
          order.userId?.name ||
          [order.userId?.firstName, order.userId?.lastName]
            .filter(Boolean)
            .join(' ') ||
          order.waiterName,
      };
    });
  }, [ordersResponse]);
  
  const totalOrders = useMemo(() => {
    if (typeof ordersResponse?.total === 'number') {
      return ordersResponse.total;
    }
    return orders.length;
  }, [ordersResponse, orders.length]);

  const handleStatusChange = async (orderId: string, newStatus: Order['status']) => {
    try {
      if (newStatus === 'cancelled') {
        await cancelPOSOrder(orderId).unwrap();
        toast.success('Order cancelled');
      } else {
        await updatePOSOrder({ id: orderId, data: { status: newStatus as 'pending' | 'paid' } }).unwrap();
        toast.success(`Order status updated to ${newStatus}`);
      }

      refetch();
      if (selectedOrderId === orderId && selectedOrderData) {
        const updated = orders.find((o) => o.id === orderId);
        if (updated) setSelectedOrder(updated);
      }
    } catch (error: any) {
      toast.error(error?.data?.message || 'Failed to update order status');
    }
  };
  
  const handleDeleteOrder = async (orderId: string) => {
    if (!confirm('Are you sure you want to cancel this order? This action cannot be undone.')) {
      return;
    }
    
    try {
      await cancelPOSOrder(orderId).unwrap();
      toast.success('Order cancelled successfully');
      refetch();
      if (selectedOrderId === orderId) {
        setIsViewModalOpen(false);
        setSelectedOrderId('');
      }
    } catch (error: any) {
      toast.error(error?.data?.message || 'Failed to cancel order');
    }
  };

  const openViewModal = (order: Order) => {
    setSelectedOrder(order);
    setSelectedOrderId(order.id);
    setIsViewModalOpen(true);
  };
  
  // Update selected order when data loads
  useEffect(() => {
    if (selectedOrderData && selectedOrderId) {
      const orderData = selectedOrderData as any;
      const rawType = orderData.orderType || orderData.order_type || orderData.type || 'dine-in';
      const normalizedType = typeof rawType === 'string' ? rawType.replace('_', '-') : 'dine-in';

      setSelectedOrder({
        id: orderData._id || orderData.id,
        orderNumber: orderData.orderNumber,
        customerName: orderData.customerInfo?.name || orderData.customerName || 'Walk-in',
        customerPhone: orderData.customerInfo?.phone || orderData.customerPhone,
        tableNumber:
          orderData.tableId?.tableNumber ||
          orderData.tableId?.number ||
          orderData.tableNumber ||
          '—',
        status: orderData.status || 'pending',
        orderType: normalizedType,
        items:
          orderData.items?.map((item: any) => ({
            id: item._id || item.id || item.menuItemId?._id || item.menuItemId,
            name: item.menuItemId?.name || item.name,
            quantity: item.quantity,
            price: item.price,
            notes: item.notes,
          })) || [],
        total: orderData.totalAmount ?? orderData.total ?? 0,
        tax: orderData.taxAmount ?? orderData.tax ?? 0,
        tip: orderData.tipAmount ?? orderData.tip,
        discount: orderData.discountAmount ?? orderData.discount,
        paymentMethod: orderData.paymentMethod,
        paymentStatus: orderData.status === 'paid' ? 'paid' : 'pending',
        createdAt: orderData.createdAt || new Date().toISOString(),
        updatedAt: orderData.updatedAt || new Date().toISOString(),
        servedAt: orderData.servedAt,
        completedAt: orderData.completedAt,
        waiterName:
          orderData.userId?.name ||
          [orderData.userId?.firstName, orderData.userId?.lastName]
            .filter(Boolean)
            .join(' ') ||
          orderData.waiterName,
      });
    }
  }, [selectedOrderData, selectedOrderId]);

  const getStatusBadge = (status: Order['status']) => {
    const variants: Record<string, 'warning' | 'info' | 'success' | 'secondary' | 'danger'> = {
      pending: 'warning',
      paid: 'success',
      confirmed: 'info',
      preparing: 'info',
      ready: 'success',
      served: 'success',
      completed: 'secondary',
      cancelled: 'danger',
    };

    return <Badge variant={variants[status] || 'secondary'}>{status}</Badge>;
  };

  const getPaymentStatusBadge = (status: Order['paymentStatus']) => {
    const variants = {
      pending: 'warning',
      paid: 'success',
      refunded: 'danger',
      cancelled: 'danger',
    } as const;

    const variant = variants[status as keyof typeof variants] || 'secondary';
    return <Badge variant={variant}>{status}</Badge>;
  };

  const getOrderTypeBadge = (type?: Order['orderType']) => {
    const config: Record<string, { label: string; variant: 'secondary' | 'info' | 'success' }> = {
      'dine-in': { label: 'Dine-In', variant: 'info' },
      takeaway: { label: 'Takeaway', variant: 'secondary' },
      delivery: { label: 'Delivery', variant: 'success' },
    };

    const fallback = { label: type || 'Unknown', variant: 'secondary' as const };
    const entry = (type && config[type]) || fallback;
    return <Badge variant={entry.variant}>{entry.label}</Badge>;
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
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {typeof row.tableNumber === 'number' ? `Table ${row.tableNumber}` : row.tableNumber}
                </p>
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
      key: 'orderType',
      title: 'Type',
      render: (value: Order['orderType']) => getOrderTypeBadge(value),
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
                { value: 'paid', label: 'Mark Paid' },
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

  const stats = useMemo(() => ({
    total: totalOrders,
    pending: orders.filter((o) => o.status === 'pending').length,
    paid: orders.filter((o) => o.status === 'paid').length,
    cancelled: orders.filter((o) => o.status === 'cancelled').length,
    totalRevenue: orders
      .filter((o) => o.status === 'paid' || o.paymentStatus === 'paid')
      .reduce((sum, o) => sum + (o.total ?? 0), 0),
  }), [orders, totalOrders]);
  
  const filteredOrders = useMemo(() => {
    let filtered = orders;

    if (statusFilter !== 'all') {
      filtered = filtered.filter((order) => order.status === statusFilter);
    }

    if (orderTypeFilter !== 'all') {
      filtered = filtered.filter((order) => (order.orderType || 'dine-in') === orderTypeFilter);
    }

    if (committedSearch) {
      const query = committedSearch.toLowerCase();
      filtered = filtered.filter((order) =>
        order.orderNumber.toLowerCase().includes(query) ||
        (order.customerName && order.customerName.toLowerCase().includes(query)) ||
        (order.customerPhone && order.customerPhone.includes(query))
      );
    }

    return filtered;
  }, [orders, statusFilter, orderTypeFilter, committedSearch]);

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
        <div className="flex gap-2">
          <Button onClick={() => window.open('/dashboard/pos', '_blank')}>
            <PlusIcon className="w-5 h-5 mr-2" />
            New Order
          </Button>
        </div>
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
                <p className="text-sm text-gray-600 dark:text-gray-400">Paid</p>
                <p className="text-3xl font-bold text-green-600">{stats.paid}</p>
              </div>
              <BanknotesIcon className="w-8 h-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Cancelled</p>
                <p className="text-3xl font-bold text-red-500">{stats.cancelled}</p>
              </div>
              <XCircleIcon className="w-8 h-8 text-red-500" />
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
              <CurrencyDollarIcon className="w-8 h-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-6 space-y-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Input
                placeholder="Search orders..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault();
                    handleSearchSubmit();
                  }
                }}
                className="pl-10"
              />
              <MagnifyingGlassIcon className="h-5 w-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            </div>
            <div className="flex gap-2">
              <Button variant="primary" onClick={handleSearchSubmit} disabled={searchTerm.trim() === committedSearch.trim()}>
                Search
              </Button>
              {(searchTerm || committedSearch) && (
                <Button variant="secondary" onClick={handleClearSearch}>
                  Clear
                </Button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Select
              options={[
                { value: 'all', label: 'All Status' },
                { value: 'pending', label: 'Pending' },
                { value: 'paid', label: 'Paid' },
                { value: 'cancelled', label: 'Cancelled' },
              ]}
              value={statusFilter}
              onChange={handleStatusFilterChange}
              placeholder="Filter by status"
            />
            <Select
              options={[
                { value: 'all', label: 'All Types' },
                { value: 'dine-in', label: 'Dine-In' },
                { value: 'takeaway', label: 'Takeaway' },
                { value: 'delivery', label: 'Delivery' },
              ]}
              value={orderTypeFilter}
              onChange={(value) => handleOrderTypeFilterChange(value as 'all' | 'dine-in' | 'takeaway' | 'delivery')}
              placeholder="Filter by type"
            />
            <div className="flex items-center">
              <Button
                variant="secondary"
                onClick={handleRefresh}
                className="flex items-center gap-2"
              >
                <ArrowPathIcon className="h-4 w-4" />
                Refresh
              </Button>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              {([
                { label: 'Last 7 Days', value: 'last7' },
                { label: 'Today', value: 'today' },
                { label: 'Yesterday', value: 'yesterday' },
                { label: 'This Month', value: 'thisMonth' },
              ] as Array<{ label: string; value: QuickRange }>).map(({ label, value }) => (
                <Button
                  key={value}
                  variant={activeQuickRange === value ? 'primary' : 'secondary'}
                  onClick={() => handleQuickRange(value)}
                  className={activeQuickRange === value ? '' : 'bg-slate-900/80 text-slate-100 hover:bg-slate-800/80'}
                >
                  {label}
                </Button>
              ))}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Start Date</label>
                <Input
                  type="date"
                  value={dateRange.start}
                  max={dateRange.end}
                  onChange={(event) => handleDateInputChange('start', event.target.value)}
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">End Date</label>
                <Input
                  type="date"
                  value={dateRange.end}
                  min={dateRange.start}
                  onChange={(event) => handleDateInputChange('end', event.target.value)}
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Orders Table */}
      {isLoading ? (
        <Card>
          <CardContent className="p-6">
            <div className="text-center py-12">
              <p className="text-gray-500 dark:text-gray-400">Loading orders...</p>
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
          exportFilename="orders"
          onExport={(format, items) => {
            console.log(`Exporting ${items.length} orders as ${format}`);
            toast.success(`Exporting ${items.length} orders as ${format.toUpperCase()}`);
          }}
          emptyMessage="No orders found."
        />
      )}

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
                    <span className="text-gray-600 dark:text-gray-400">Order Type:</span>
                    {getOrderTypeBadge(selectedOrder.orderType)}
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
                  setSelectedOrderId('');
                }}
              >
                Close
              </Button>
              {selectedOrder.paymentStatus !== 'paid' && selectedOrder.status !== 'completed' && selectedOrder.status !== 'cancelled' && (
                <Button
                  variant="secondary"
                  onClick={() => window.open(`/dashboard/pos/receipts/${selectedOrder.id}`, '_blank')}
                >
                  <PrinterIcon className="w-4 h-4 mr-2" />
                  Print Receipt
                </Button>
              )}
              <Button
                variant="secondary"
                onClick={() => handleDeleteOrder(selectedOrder.id)}
                disabled={isCancelling}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                {isCancelling ? 'Cancelling...' : 'Cancel Order'}
              </Button>
              {selectedOrder.status !== 'completed' && selectedOrder.status !== 'cancelled' && (
                <Select
                  options={[
                    { value: 'pending', label: 'Mark Pending' },
                    { value: 'paid', label: 'Mark Paid' },
                    { value: 'cancelled', label: 'Cancel Order' },
                  ]}
                  value={selectedOrder.status}
                  onChange={(value) => handleStatusChange(selectedOrder.id, value as Order['status'])}
                  className="w-40"
                  disabled={isUpdatingStatus}
                />
              )}
            </div>
          </div>
        )}
      </Modal>

    </div>
  );
}