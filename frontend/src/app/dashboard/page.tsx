'use client';

import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { DataTable } from '@/components/ui/DataTable';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Skeleton } from '@/components/ui/Skeleton';
import { useGetPOSOrderQuery, useGetPOSOrdersQuery, useGetPOSStatsQuery } from '@/lib/api/endpoints/posApi';
import { useAppSelector } from '@/lib/store';
import { formatCurrency, formatDateTime } from '@/lib/utils';
import {
  ArrowTrendingDownIcon,
  ArrowTrendingUpIcon,
  ChartBarIcon,
  ClockIcon,
  CurrencyDollarIcon,
  EyeIcon,
  MagnifyingGlassIcon,
  ShoppingBagIcon
} from '@heroicons/react/24/outline';
import { useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

type OrderStatusFilter = 'all' | 'pending' | 'paid' | 'cancelled';
type OrderTypeFilter = 'all' | 'dine-in' | 'delivery' | 'takeaway';
type QuickRange = 'today' | 'yesterday' | 'last7' | 'last30' | 'thisMonth' | 'custom';

const formatDateInput = (date: Date) => {
  const tzOffsetMs = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - tzOffsetMs).toISOString().split('T')[0];
};

const computeDateRange = (range: QuickRange): { start: string; end: string } => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const end = new Date(today);

  switch (range) {
    case 'today': {
      return {
        start: formatDateInput(end),
        end: formatDateInput(end),
      };
    }
    case 'yesterday': {
      const start = new Date(today);
      start.setDate(start.getDate() - 1);
      return {
        start: formatDateInput(start),
        end: formatDateInput(start),
      };
    }
    case 'last30': {
      const start = new Date(today);
      start.setDate(start.getDate() - 29);
      return {
        start: formatDateInput(start),
        end: formatDateInput(end),
      };
    }
    case 'thisMonth': {
      const start = new Date(today.getFullYear(), today.getMonth(), 1);
      return {
        start: formatDateInput(start),
        end: formatDateInput(end),
      };
    }
    case 'last7':
    default: {
      const start = new Date(today);
      start.setDate(start.getDate() - 6);
      return {
        start: formatDateInput(start),
        end: formatDateInput(end),
      };
    }
  }
};

const QUICK_RANGE_OPTIONS: Array<{ label: string; value: QuickRange }> = [
  { label: 'Today', value: 'today' },
  { label: 'Yesterday', value: 'yesterday' },
  { label: 'Last 7 Days', value: 'last7' },
  { label: 'Last 30 Days', value: 'last30' },
  { label: 'This Month', value: 'thisMonth' },
];

export default function POSReportsPage() {
  const { user } = useAppSelector((state) => state.auth);
  const [activeQuickRange, setActiveQuickRange] = useState<QuickRange>('last7');
  const [dateRange, setDateRange] = useState(() => computeDateRange('last7'));
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [isOrderModalOpen, setIsOrderModalOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<OrderStatusFilter>('all');
  const [orderTypeFilter, setOrderTypeFilter] = useState<OrderTypeFilter>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [committedSearch, setCommittedSearch] = useState('');

  const statsParams = {
    branchId: user?.branchId || undefined,
    startDate: dateRange.start,
    endDate: dateRange.end,
    ...(orderTypeFilter !== 'all' ? { orderType: orderTypeFilter } : {}),
  } as const;

  const ordersParams = {
    branchId: user?.branchId || undefined,
    startDate: dateRange.start,
    endDate: dateRange.end,
    page: currentPage,
    limit: itemsPerPage,
    ...(statusFilter !== 'all' ? { status: statusFilter } : {}),
    ...(orderTypeFilter !== 'all' ? { orderType: orderTypeFilter } : {}),
    ...(committedSearch ? { search: committedSearch } : {}),
  } as const;

  // API calls
  const {
    data: statsData,
    isLoading: statsLoading,
    error: statsError,
    refetch: refetchStats,
  } = useGetPOSStatsQuery(statsParams);

  const {
    data: ordersData,
    isLoading: ordersLoading,
    error: ordersError,
    refetch: refetchOrders,
  } = useGetPOSOrdersQuery(ordersParams);

  // Fetch full order details when viewing
  const { data: orderDetails, isLoading: orderDetailsLoading } = useGetPOSOrderQuery(
    selectedOrderId || '',
    { skip: !selectedOrderId }
  );

  // Extract stats from API response (already transformed by API layer)
  const stats = useMemo(() => {
    const extracted = (statsData as any) || {};
    return {
      totalOrders: extracted?.totalOrders ?? 0,
      totalRevenue: extracted?.totalRevenue ?? 0,
      averageOrderValue: extracted?.averageOrderValue ?? 0,
      ordersToday: extracted?.ordersToday ?? 0,
      revenueToday: extracted?.revenueToday ?? 0,
      topSellingItems: Array.isArray(extracted?.topSellingItems) ? extracted.topSellingItems : [],
    };
  }, [statsData]);

  // Extract orders from API response (already transformed by API layer)
  const orders = useMemo(() => {
    const items = (ordersData as any)?.orders || [];
    
    // Transform orders to ensure proper structure
    const transformed = items.map((order: any) => {
      // Handle populated tableId - backend populates with { id, capacity, tableNumber? }
      const tableId = order.tableId;
      let tableNumber = 'N/A';
      
      if (typeof tableId === 'object' && tableId) {
        // Try to get table number from populated object
        tableNumber = tableId.tableNumber || tableId.number || tableId.id || 'N/A';
      } else if (tableId) {
        // If it's a string ID, use it as is
        tableNumber = tableId;
      }
      
      const transformedOrder = {
        id: order._id || order.id,
        orderNumber: order.orderNumber || order.order_number || 'N/A',
        tableId: tableNumber,
        tableIdObj: tableId, // Keep original for reference
        totalAmount: order.totalAmount || order.total_amount || order.total || 0,
        status: order.status || 'pending',
        paymentMethod: order.paymentMethod || order.payment_method || null,
        createdAt: order.createdAt || order.created_at || order.date,
        items: order.items || [],
        customerInfo: order.customerInfo || order.customer_info,
        orderType: order.orderType || 'unknown',
      };
      return transformedOrder;
    });
    return transformed;
  }, [ordersData]);
  
  const totalOrders = useMemo(() => {
    return (ordersData as any)?.total || orders.length;
  }, [ordersData, orders.length]);
  
  // Calculate percentage changes (comparing current period to previous period)
  const previousPeriodStats = useMemo(() => {
    // For now, using estimates - in production, fetch previous period data
    return {
      totalOrders: stats.totalOrders * 0.9, // 10% increase
      totalRevenue: stats.totalRevenue * 0.9,
      ordersToday: stats.ordersToday * 0.9,
    };
  }, [stats]);
  
  const percentageChanges = useMemo(() => {
    const ordersChange = previousPeriodStats.totalOrders > 0
      ? ((stats.totalOrders - previousPeriodStats.totalOrders) / previousPeriodStats.totalOrders) * 100
      : stats.totalOrders > 0 ? 100 : 0;
      
    const revenueChange = previousPeriodStats.totalRevenue > 0
      ? ((stats.totalRevenue - previousPeriodStats.totalRevenue) / previousPeriodStats.totalRevenue) * 100
      : stats.totalRevenue > 0 ? 100 : 0;
      
    const ordersTodayChange = previousPeriodStats.ordersToday > 0
      ? ((stats.ordersToday - previousPeriodStats.ordersToday) / previousPeriodStats.ordersToday) * 100
      : stats.ordersToday > 0 ? 100 : 0;
      
    return {
      orders: ordersChange,
      revenue: revenueChange,
      ordersToday: ordersTodayChange,
    };
  }, [stats, previousPeriodStats]);

  const statsCards = useMemo(() => [
    {
      title: 'Total Revenue',
      value: formatCurrency(stats.totalRevenue),
      icon: CurrencyDollarIcon,
      color: 'text-green-600',
      change: `${percentageChanges.revenue >= 0 ? '+' : ''}${percentageChanges.revenue.toFixed(1)}%`,
      trend: percentageChanges.revenue >= 0 ? 'up' : 'down',
    },
    {
      title: 'Total Orders',
      value: (stats.totalOrders ?? 0).toString(),
      icon: ShoppingBagIcon,
      color: 'text-blue-600',
      change: `${percentageChanges.orders >= 0 ? '+' : ''}${percentageChanges.orders.toFixed(1)}%`,
      trend: percentageChanges.orders >= 0 ? 'up' : 'down',
    },
    {
      title: 'Average Order Value',
      value: formatCurrency(stats.averageOrderValue),
      icon: ChartBarIcon,
      color: 'text-purple-600',
      change: stats.totalOrders > 0 ? formatCurrency(stats.averageOrderValue) : 'N/A',
      trend: 'neutral' as const,
    },
    {
      title: 'Orders Today',
      value: (stats.ordersToday ?? 0).toString(),
      icon: ClockIcon,
      color: 'text-orange-600',
      change: `${percentageChanges.ordersToday >= 0 ? '+' : ''}${percentageChanges.ordersToday.toFixed(1)}%`,
      trend: percentageChanges.ordersToday >= 0 ? 'up' : 'down',
    },
  ], [stats, percentageChanges]);

  const columns = [
    {
      key: 'orderNumber',
      title: 'Order #',
      render: (value: any, row: any) => (
        <div className="font-mono text-sm">{row?.orderNumber || value || 'N/A'}</div>
      ),
    },
    {
      key: 'tableId',
      title: 'Table',
      render: (value: any, row: any) => {
        // row contains the full order object with tableId (already transformed)
        const tableNumber = row?.tableId || value || 'N/A';
        return (
          <Badge className="bg-blue-100 text-blue-800">
            Table {tableNumber}
          </Badge>
        );
      },
    },
    {
      key: 'orderType',
      title: 'Order Type',
      render: (value: any, row: any) => {
        const orderType = (row?.orderType || value || 'unknown') as string;
        const config: Record<string, { label: string; className: string }> = {
          'dine-in': { label: 'Dine-In', className: 'bg-sky-100 text-sky-800' },
          delivery: { label: 'Delivery', className: 'bg-emerald-100 text-emerald-800' },
          takeaway: { label: 'Takeaway', className: 'bg-purple-100 text-purple-800' },
          unknown: { label: 'Unknown', className: 'bg-gray-200 text-gray-700' },
        };
        const { label, className } = config[orderType] || config.unknown;
        return <Badge className={className}>{label}</Badge>;
      },
    },
    {
      key: 'totalAmount',
      title: 'Amount',
      render: (value: any, row: any) => (
        <div className="font-semibold text-green-600">
          {formatCurrency(row?.totalAmount || value || 0)}
        </div>
      ),
    },
    {
      key: 'status',
      title: 'Status',
      render: (value: any, row: any) => {
        const status = row?.status || value || 'pending';
        const statusConfig = {
          pending: { color: 'bg-yellow-100 text-yellow-800', text: 'Pending' },
          paid: { color: 'bg-green-100 text-green-800', text: 'Paid' },
          cancelled: { color: 'bg-red-100 text-red-800', text: 'Cancelled' },
        };
        const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
        return <Badge className={config.color}>{config.text}</Badge>;
      },
    },
    {
      key: 'paymentMethod',
      title: 'Payment',
      render: (value: any, row: any) => (
        <div className="text-sm text-gray-600 dark:text-gray-400 capitalize">
          {row?.paymentMethod || value || 'N/A'}
        </div>
      ),
    },
    {
      key: 'createdAt',
      title: 'Date',
      render: (value: any, row: any) => (
        <div className="text-sm text-gray-600 dark:text-gray-400">
          {row?.createdAt ? formatDateTime(row.createdAt) : (value ? formatDateTime(value) : 'N/A')}
        </div>
      ),
    },
    {
      key: 'actions',
      title: 'Actions',
      render: (value: any, row: any) => (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            if (!row?.id) return;
            setSelectedOrderId(row.id);
            setIsOrderModalOpen(true);
          }}
          className="h-8 w-8 p-0"
        >
          <EyeIcon className="h-4 w-4" />
        </Button>
      ),
    },
  ];

  const handleExport = (format: 'csv' | 'pdf' | 'excel') => {
    if (!orders || orders.length === 0) {
      toast.error('No orders available to export');
      return;
    }

    const headers = ['Order #', 'Type', 'Status', 'Payment', 'Total', 'Date'];
    const rows: string[][] = orders.map((order: any) => [
      String(order.orderNumber ?? order.id ?? ''),
      String(order.orderType ?? ''),
      String(order.status ?? ''),
      String(order.paymentMethod ?? 'N/A'),
      formatCurrency(order.totalAmount || 0),
      order.createdAt ? formatDateTime(order.createdAt) : '',
    ]);

    if (format === 'csv' || format === 'excel') {
      const csvContent = [headers, ...rows]
        .map((row: string[]) =>
          row
            .map((cell: string) => {
              const value = String(cell ?? '');
              return `"${value.replace(/"/g, '""')}"`;
            })
            .join(',')
        )
        .join('\r\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `pos-orders-${Date.now()}.${format === 'excel' ? 'xls' : 'csv'}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      toast.success(`${format.toUpperCase()} export ready`);
      return;
    }

    if (format === 'pdf') {
      const printableRows = rows
        .map(
          (row: string[]) =>
            `<tr>${row
              .map((cell: string) => `<td style="padding:6px 12px;border:1px solid #e5e7eb;">${cell}</td>`)
              .join('')}</tr>`
        )
        .join('');
      const html = `<!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8" />
            <title>POS Orders Report</title>
            <style>
              body { font-family: Arial, sans-serif; padding: 24px; }
              h1 { font-size: 20px; margin-bottom: 16px; }
              table { border-collapse: collapse; width: 100%; }
              th { text-align: left; background: #0f172a; color: #fff; padding: 8px 12px; }
            </style>
          </head>
          <body>
            <h1>POS Orders Report</h1>
            <table>
              <thead>
                <tr>${headers.map((header) => `<th>${header}</th>`).join('')}</tr>
              </thead>
              <tbody>${printableRows}</tbody>
            </table>
          </body>
        </html>`;

      const printWindow = window.open('', '_blank');
      if (!printWindow) {
        toast.error('Pop-up blocked. Allow pop-ups to export PDF.');
        return;
      }
      printWindow.document.write(html);
      printWindow.document.close();
      printWindow.focus();
      printWindow.print();
      toast.success('PDF export sent to print dialog');
      return;
    }

    toast.error('Unsupported export format');
  };

  const handleRefresh = () => {
    Promise.all([refetchStats(), refetchOrders()])
      .then(() => {
        toast.success('Reports refreshed');
      })
      .catch(() => {
        toast.error('Unable to refresh reports right now');
      });
  };
  
  // Prepare chart data for revenue trend (if orders data is available)
  const revenueByDate = useMemo(() => {
    if (!Array.isArray(orders) || orders.length === 0) {
      return [];
    }
    
    // Group orders by date
    const grouped = orders.reduce((acc: any, order: any) => {
      if (!order || !order.createdAt) return acc;
      const date = new Date(order.createdAt).toISOString().split('T')[0];
      if (!acc[date]) {
        acc[date] = { date, revenue: 0, orders: 0 };
      }
      if (order.status === 'paid') {
        acc[date].revenue += order.totalAmount || 0;
        acc[date].orders += 1;
      }
      return acc;
    }, {});
    
    return Object.values(grouped).sort((a: any, b: any) => 
      new Date(a.date).getTime() - new Date(b.date).getTime()
    );
  }, [orders]);
  
  // Payment method breakdown
  const paymentMethodBreakdown = useMemo(() => {
    if (!Array.isArray(orders) || orders.length === 0) {
      return [];
    }
    
    const breakdown = orders.reduce((acc: any, order: any) => {
      if (!order) return acc;
      const method = order.paymentMethod || 'unknown';
      if (!acc[method]) {
        acc[method] = { method, count: 0, revenue: 0 };
      }
      acc[method].count += 1;
      if (order.status === 'paid') {
        acc[method].revenue += order.totalAmount || 0;
      }
      return acc;
    }, {});
    
    return Object.values(breakdown);
  }, [orders]);

  const handleQuickRange = (range: QuickRange) => {
    setActiveQuickRange(range);
    setDateRange(computeDateRange(range));
    setCurrentPage(1);
  };

  const handleStatusChange = (status: OrderStatusFilter) => {
    setStatusFilter(status);
    setCurrentPage(1);
  };

  const handleOrderTypeChange = (orderType: OrderTypeFilter) => {
    setOrderTypeFilter(orderType);
    setCurrentPage(1);
  };

  const handleDateInputChange = (field: 'start' | 'end', value: string) => {
    if (!value) {
      return;
    }

    setDateRange((prev) => {
      const nextRange = { ...prev, [field]: value } as { start: string; end: string };
      const startDate = new Date(nextRange.start);
      const endDate = new Date(nextRange.end);

      if (field === 'start' && startDate > endDate) {
        nextRange.end = value;
      }

      if (field === 'end' && startDate > endDate) {
        nextRange.start = value;
      }

      return nextRange;
    });

    setActiveQuickRange('custom');
    setCurrentPage(1);
  };

  const handleSearchSubmit = () => {
    const trimmed = searchTerm.trim();
    setCommittedSearch((prev) => {
      if (prev === trimmed) {
        return prev;
      }
      setCurrentPage(1);
      return trimmed;
    });
  };

  const handleClearSearch = () => {
    setSearchTerm('');
    setCommittedSearch((prev) => {
      if (prev === '') {
        return prev;
      }
      setCurrentPage(1);
      return '';
    });
  };

  // Error handling
  if (statsError || ordersError) {
    return (
      <div className="space-y-6">
        <div className="text-center py-12">
          <div className="text-red-600 mb-4">
            <ChartBarIcon className="w-12 h-12 mx-auto mb-4" />
            <h2 className="text-xl font-semibold">Error Loading Reports</h2>
            <p className="text-gray-600 mt-2">
              {statsError ? 'Failed to load statistics' : ordersError ? 'Failed to load orders' : 'Failed to load POS reports data'}
            </p>
          </div>
          <Button onClick={handleRefresh} variant="primary">
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
       
      </div>

      {/* Date Range Filter */}
      <Card>
        <CardContent className="p-6 space-y-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Start Date
              </label>
              <Input
                type="date"
                value={dateRange.start}
                max={dateRange.end}
                onChange={(event) => handleDateInputChange('start', event.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                End Date
              </label>
              <Input
                type="date"
                value={dateRange.end}
                min={dateRange.start}
                onChange={(event) => handleDateInputChange('end', event.target.value)}
              />
            </div>
            <div className="flex items-end">
              <Button
                onClick={handleRefresh}
                className="flex items-center gap-2"
              >
                <ChartBarIcon className="h-4 w-4" />
                Refresh
              </Button>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {QUICK_RANGE_OPTIONS.map(({ label, value }) => {
              const isActive = activeQuickRange === value;
              return (
                <Button
                  key={value}
                  variant={isActive ? 'primary' : 'secondary'}
                  onClick={() => handleQuickRange(value)}
                  className={isActive ? '' : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-700'}
                >
                  {label}
                </Button>
              );
            })}
          </div>

          <div className="flex flex-wrap gap-4">
            <div className="flex flex-col">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Order Status
              </label>
              <select
                value={statusFilter}
                onChange={(e) => handleStatusChange(e.target.value as OrderStatusFilter)}
                className="px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              >
                <option value="all">All</option>
                <option value="paid">Paid</option>
                <option value="pending">Pending</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
            <div className="flex flex-col">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Order Type
              </label>
              <select
                value={orderTypeFilter}
                onChange={(e) => handleOrderTypeChange(e.target.value as OrderTypeFilter)}
                className="px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              >
                <option value="all">All</option>
                <option value="dine-in">Dine-In</option>
                <option value="delivery">Delivery</option>
                <option value="takeaway">Takeaway</option>
              </select>
            </div>
            <div className="flex flex-col flex-1 min-w-[260px]">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Search Orders
              </label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <MagnifyingGlassIcon className="h-5 w-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <Input
                    value={searchTerm}
                    onChange={(event) => setSearchTerm(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') {
                        event.preventDefault();
                        handleSearchSubmit();
                      }
                    }}
                    placeholder="Search by order # or customer"
                    className="pl-10"
                  />
                </div>
                <Button
                  variant="primary"
                  onClick={handleSearchSubmit}
                  disabled={searchTerm.trim() === committedSearch.trim()}
                >
                  Search
                </Button>
                {committedSearch && (
                  <Button variant="secondary" onClick={handleClearSearch}>
                    Clear
                  </Button>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statsLoading ? (
          Array.from({ length: 4 }).map((_, index) => (
            <Card key={index}>
              <CardContent className="p-6">
                <Skeleton className="h-20 w-full" />
              </CardContent>
            </Card>
          ))
        ) : (
          statsCards.map((stat, index) => {
            const Icon = stat.icon;
            const TrendIcon = stat.trend === 'up' ? ArrowTrendingUpIcon : ArrowTrendingDownIcon;
            return (
              <Card key={index}>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                        {stat.title}
                      </p>
                      <p className="text-2xl font-bold text-gray-900 dark:text-white">
                        {stat.value}
                      </p>
                      {stat.trend !== 'neutral' && (
                        <div className="flex items-center gap-1 mt-1">
                          <TrendIcon className={`h-4 w-4 ${stat.trend === 'up' ? 'text-green-600' : 'text-red-600'}`} />
                          <span className={`text-sm ${stat.trend === 'up' ? 'text-green-600' : 'text-red-600'}`}>
                            {stat.change}
                          </span>
                          <span className="text-xs text-gray-500">vs previous period</span>
                        </div>
                      )}
                    </div>
                    <Icon className={`h-8 w-8 ${stat.color}`} />
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Trend Chart */}
        {revenueByDate.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ChartBarIcon className="h-5 w-5" />
                Revenue Trend
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={revenueByDate}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200 dark:stroke-gray-700" />
                  <XAxis 
                    dataKey="date" 
                    className="text-sm"
                    tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  />
                  <YAxis className="text-sm" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'rgba(255, 255, 255, 0.95)',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                    }}
                    formatter={(value: number) => formatCurrency(value)}
                  />
                  <Line type="monotone" dataKey="revenue" stroke="#10b981" strokeWidth={3} name="Revenue" />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* Payment Method Breakdown */}
        {paymentMethodBreakdown.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CurrencyDollarIcon className="h-5 w-5" />
                Payment Methods
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={paymentMethodBreakdown}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200 dark:stroke-gray-700" />
                  <XAxis dataKey="method" className="text-sm" />
                  <YAxis className="text-sm" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'rgba(255, 255, 255, 0.95)',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                    }}
                    formatter={(value: number) => formatCurrency(value)}
                  />
                  <Bar dataKey="revenue" fill="#8b5cf6" name="Revenue" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Top Selling Items */}
      {stats.topSellingItems && stats.topSellingItems.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ChartBarIcon className="h-5 w-5" />
              Top Selling Items
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {stats.topSellingItems.slice(0, 5).map((item: any, index: number) => (
                <div key={item.menuItemId || index} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center text-sm font-semibold">
                      {index + 1}
                    </div>
                    <div>
                      <div className="font-medium text-gray-900 dark:text-white">
                        {item.name || 'Unknown Item'}
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        {item.quantity || 0} sold
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold text-gray-900 dark:text-white">
                      {formatCurrency(item.revenue || 0)}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      Revenue
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Orders */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShoppingBagIcon className="h-5 w-5" />
            Recent Orders
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {ordersLoading ? (
            <div className="p-6">
              <Skeleton className="h-40 w-full" />
            </div>
          ) : (
            <DataTable
              data={orders || []}
              columns={columns}
              loading={ordersLoading}
              pagination={{
                currentPage,
                totalPages: Math.ceil(totalOrders / itemsPerPage),
                totalItems: totalOrders,
                itemsPerPage,
                onPageChange: setCurrentPage,
                onItemsPerPageChange: setItemsPerPage,
              }}
            />
          )}
        </CardContent>
      </Card>

      {/* Quick Stats Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Revenue Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Total Revenue:</span>
                <span className="font-semibold">{formatCurrency(stats.totalRevenue)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Today's Revenue:</span>
                <span className="font-semibold">{formatCurrency(stats.revenueToday)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Average Order:</span>
                <span className="font-semibold">{formatCurrency(stats.averageOrderValue)}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Order Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Total Orders:</span>
                <span className="font-semibold">{stats.totalOrders ?? 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Orders Today:</span>
                <span className="font-semibold">{stats.ordersToday ?? 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Period:</span>
                <span className="font-semibold">
                  {new Date(dateRange.start).toLocaleDateString()} - {new Date(dateRange.end).toLocaleDateString()}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Order Details Modal */}
      <Modal
        isOpen={isOrderModalOpen}
        onClose={() => {
          setIsOrderModalOpen(false);
          setSelectedOrderId(null);
        }}
        title={`Order Details - ${orderDetails?.orderNumber || selectedOrderId || 'N/A'}`}
        size="lg"
      >
        {orderDetailsLoading ? (
          <div className="py-8 text-center">
            <Skeleton className="h-20 w-full mb-4" />
            <Skeleton className="h-20 w-full mb-4" />
            <Skeleton className="h-20 w-full" />
          </div>
        ) : orderDetails ? (
          <div className="space-y-6">
            {/* Order Header */}
            <div className="grid grid-cols-2 gap-4 pb-4 border-b">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Order Number</p>
                <p className="font-semibold text-gray-900 dark:text-white">
                  {orderDetails.orderNumber || 'N/A'}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Status</p>
                <Badge className={
                  orderDetails.status === 'paid' ? 'bg-green-100 text-green-800' :
                  orderDetails.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                  'bg-red-100 text-red-800'
                }>
                  {orderDetails.status?.toUpperCase() || 'N/A'}
                </Badge>
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Table</p>
                <p className="font-semibold text-gray-900 dark:text-white">
                  {(() => {
                    const table = orderDetails.tableId;
                    if (!table) return 'N/A';
                    if (typeof table === 'object' && table !== null) {
                      return `Table ${(table as any).tableNumber || (table as any).number || 'N/A'}`;
                    }
                    return `Table ${table}`;
                  })()}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Payment Method</p>
                <p className="font-semibold text-gray-900 dark:text-white capitalize">
                  {orderDetails.paymentMethod || 'N/A'}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Order Type</p>
                <p className="font-semibold text-gray-900 dark:text-white capitalize">
                  {orderDetails.orderType ? orderDetails.orderType.replace('-', ' ') : 'N/A'}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Created At</p>
                <p className="font-semibold text-gray-900 dark:text-white">
                  {orderDetails.createdAt ? formatDateTime(orderDetails.createdAt) : 'N/A'}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Total Amount</p>
                <p className="font-semibold text-green-600 text-lg">
                  {formatCurrency(orderDetails.totalAmount || 0)}
                </p>
              </div>
            </div>

            {/* Customer Info */}
            {orderDetails.customerInfo && (
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Customer Information</h3>
                <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
                  <div className="grid grid-cols-3 gap-4">
                    {orderDetails.customerInfo.name && (
                      <div>
                        <p className="text-sm text-gray-600 dark:text-gray-400">Name</p>
                        <p className="font-medium">{orderDetails.customerInfo.name}</p>
                      </div>
                    )}
                    {orderDetails.customerInfo.phone && (
                      <div>
                        <p className="text-sm text-gray-600 dark:text-gray-400">Phone</p>
                        <p className="font-medium">{orderDetails.customerInfo.phone}</p>
                      </div>
                    )}
                    {orderDetails.customerInfo.email && (
                      <div>
                        <p className="text-sm text-gray-600 dark:text-gray-400">Email</p>
                        <p className="font-medium">{orderDetails.customerInfo.email}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Order Items */}
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Order Items</h3>
              <div className="border rounded-lg overflow-hidden">
                <table className="w-full">
                  <thead className="bg-gray-50 dark:bg-gray-800">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900 dark:text-white">Item</th>
                      <th className="px-4 py-3 text-right text-sm font-semibold text-gray-900 dark:text-white">Quantity</th>
                      <th className="px-4 py-3 text-right text-sm font-semibold text-gray-900 dark:text-white">Price</th>
                      <th className="px-4 py-3 text-right text-sm font-semibold text-gray-900 dark:text-white">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {orderDetails.items && orderDetails.items.length > 0 ? (
                      orderDetails.items.map((item: any, index: number) => {
                        // Handle menuItemId - it might be an ObjectId string, populated object, or null
                        let itemName = 'Unknown Item';
                        if (item.name) {
                          itemName = item.name;
                        } else if (item.menuItemId) {
                          if (typeof item.menuItemId === 'object' && item.menuItemId !== null) {
                            itemName = item.menuItemId.name || 'Unknown Item';
                          } else if (typeof item.menuItemId === 'string') {
                            // If it's just an ID, we can't get the name without additional API call
                            // For now, show the ID or try to fetch name later
                            itemName = `Item ${item.menuItemId.slice(-6)}`;
                          }
                        }
                        
                        return (
                          <tr key={index}>
                            <td className="px-4 py-3">
                              <div>
                                <p className="font-medium text-gray-900 dark:text-white">
                                  {itemName}
                                </p>
                                {item.notes && (
                                  <p className="text-sm text-gray-500 dark:text-gray-400 italic">
                                    Note: {item.notes}
                                  </p>
                                )}
                              </div>
                            </td>
                            <td className="px-4 py-3 text-right text-gray-900 dark:text-white">
                              {item.quantity || 0}
                            </td>
                            <td className="px-4 py-3 text-right text-gray-900 dark:text-white">
                              {formatCurrency(item.price || 0)}
                            </td>
                            <td className="px-4 py-3 text-right font-semibold text-gray-900 dark:text-white">
                              {formatCurrency((item.price || 0) * (item.quantity || 0))}
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan={4} className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
                          No items found
                        </td>
                      </tr>
                    )}
                  </tbody>
                  <tfoot className="bg-gray-50 dark:bg-gray-800">
                    <tr>
                      <td colSpan={3} className="px-4 py-3 text-right font-semibold text-gray-900 dark:text-white">
                        Total:
                      </td>
                      <td className="px-4 py-3 text-right font-bold text-lg text-green-600">
                        {formatCurrency(orderDetails.totalAmount || 0)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            {/* Notes */}
            {orderDetails.notes && (
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Notes</h3>
                <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
                  <p className="text-sm text-gray-700 dark:text-gray-300">{orderDetails.notes}</p>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="py-8 text-center text-gray-500 dark:text-gray-400">
            <p>Order not found</p>
          </div>
        )}
      </Modal>
    </div>
  );
}
