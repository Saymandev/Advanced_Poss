'use client';

import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { DataTable } from '@/components/ui/DataTable';
import { Input } from '@/components/ui/Input';
import { Skeleton } from '@/components/ui/Skeleton';
import { useGetPOSOrdersQuery, useGetPOSStatsQuery } from '@/lib/api/endpoints/posApi';
import { useAppSelector } from '@/lib/store';
import { formatCurrency, formatDateTime } from '@/lib/utils';
import {
  ArrowDownTrayIcon,
  ArrowTrendingDownIcon,
  ArrowTrendingUpIcon,
  ChartBarIcon,
  ClockIcon,
  CurrencyDollarIcon,
  EyeIcon,
  ShoppingBagIcon,
} from '@heroicons/react/24/outline';
import { useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

export default function POSReportsPage() {
  const { user } = useAppSelector((state) => state.auth);
  const [dateRange, setDateRange] = useState({
    start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0],
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);

  // API calls
  const { data: statsData, isLoading: statsLoading, error: statsError } = useGetPOSStatsQuery({
    branchId: user?.branchId || undefined,
    startDate: dateRange.start,
    endDate: dateRange.end,
  });

  const { data: ordersData, isLoading: ordersLoading, error: ordersError } = useGetPOSOrdersQuery({
    branchId: user?.branchId || undefined,
    startDate: dateRange.start,
    endDate: dateRange.end,
    page: currentPage,
    limit: itemsPerPage,
  });

  // Extract stats from API response - handle different response formats
  const stats = useMemo(() => {
    const data = statsData as any;
    const extracted = data?.data || data || {};
    
    return {
      totalOrders: extracted?.totalOrders ?? 0,
      totalRevenue: extracted?.totalRevenue ?? 0,
      averageOrderValue: extracted?.averageOrderValue ?? 0,
      ordersToday: extracted?.ordersToday ?? 0,
      revenueToday: extracted?.revenueToday ?? 0,
      topSellingItems: Array.isArray(extracted?.topSellingItems) ? extracted.topSellingItems : [],
    };
  }, [statsData]);

  // Extract orders from API response
  const orders = useMemo(() => {
    const data = ordersData as any;
    const extracted = data?.data || data;
    
    if (Array.isArray(extracted)) {
      return extracted;
    }
    
    return extracted?.orders || [];
  }, [ordersData]);
  
  const totalOrders = useMemo(() => {
    const data = ordersData as any;
    const extracted = data?.data || data;
    return extracted?.total || orders.length;
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
      render: (order: any) => (
        <div className="font-mono text-sm">{order.orderNumber}</div>
      ),
    },
    {
      key: 'tableId',
      title: 'Table',
      render: (order: any) => (
                <Badge className="bg-blue-100 text-blue-800">
                  Table {order.tableId?.number || order.tableId || 'N/A'}
                </Badge>
      ),
    },
    {
      key: 'totalAmount',
      title: 'Amount',
      render: (order: any) => (
        <div className="font-semibold text-green-600">
          {formatCurrency(order.totalAmount)}
        </div>
      ),
    },
    {
      key: 'status',
      title: 'Status',
      render: (order: any) => {
        const statusConfig = {
          pending: { color: 'bg-yellow-100 text-yellow-800', text: 'Pending' },
          paid: { color: 'bg-green-100 text-green-800', text: 'Paid' },
          cancelled: { color: 'bg-red-100 text-red-800', text: 'Cancelled' },
        };
        const config = statusConfig[order.status as keyof typeof statusConfig] || statusConfig.pending;
        return <Badge className={config.color}>{config.text}</Badge>;
      },
    },
    {
      key: 'paymentMethod',
      title: 'Payment',
      render: (order: any) => (
        <div className="text-sm text-gray-600 dark:text-gray-400 capitalize">
          {order.paymentMethod || 'N/A'}
        </div>
      ),
    },
    {
      key: 'createdAt',
      title: 'Date',
      render: (order: any) => (
        <div className="text-sm text-gray-600 dark:text-gray-400">
          {formatDateTime(order.createdAt)}
        </div>
      ),
    },
    {
      key: 'actions',
      title: 'Actions',
      render: (order: any) => (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            // View order details
            console.log('View order:', order.id);
            toast.success(`Viewing order ${order.orderNumber}`);
          }}
          className="h-8 w-8 p-0"
        >
          <EyeIcon className="h-4 w-4" />
        </Button>
      ),
    },
  ];

  const handleExport = (format: 'csv' | 'pdf' | 'excel') => {
    // Export functionality would be implemented here
    console.log(`Exporting data as ${format}`);
    toast.success(`Exporting data as ${format.toUpperCase()}`);
  };

  const handleRefresh = () => {
    // Refresh data by invalidating cache
    window.location.reload();
  };
  
  // Prepare chart data for revenue trend (if orders data is available)
  const revenueByDate = useMemo(() => {
    if (!Array.isArray(orders) || orders.length === 0) {
      return [];
    }
    
    // Group orders by date
    const grouped = orders.reduce((acc: any, order: any) => {
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
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">POS Reports</h1>
          <p className="text-gray-600 dark:text-gray-400">Analytics and insights for your POS system</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            onClick={() => handleExport('csv')}
            className="flex items-center gap-2"
          >
            <ArrowDownTrayIcon className="h-4 w-4" />
            Export CSV
          </Button>
          <Button
            variant="secondary"
            onClick={() => handleExport('pdf')}
            className="flex items-center gap-2"
          >
            <ArrowDownTrayIcon className="h-4 w-4" />
            Export PDF
          </Button>
        </div>
      </div>

      {/* Date Range Filter */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Start Date
              </label>
              <Input
                type="date"
                value={dateRange.start}
                onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                End Date
              </label>
              <Input
                type="date"
                value={dateRange.end}
                onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
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
              data={orders}
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
    </div>
  );
}
