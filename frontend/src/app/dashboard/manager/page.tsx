'use client';

import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { DataTable } from '@/components/ui/DataTable';
import { useRolePermissions } from '@/hooks/useRolePermissions';
import { useGetPOSOrdersQuery, useGetPOSStatsQuery } from '@/lib/api/endpoints/posApi';
import { useGetStaffQuery } from '@/lib/api/endpoints/staffApi';
import { useAppSelector } from '@/lib/store';
import { formatCurrency, formatDateTime } from '@/lib/utils';
import {
    BuildingStorefrontIcon,
    ChartBarIcon,
    ClipboardDocumentListIcon,
    ClockIcon,
    CurrencyDollarIcon,
    ShoppingBagIcon,
    TruckIcon,
    UserGroupIcon,
} from '@heroicons/react/24/outline';
import { useMemo, useState } from 'react';
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

type QuickRange = 'today' | 'yesterday' | 'last7' | 'last30' | 'thisMonth';

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
      return { start: formatDateInput(end), end: formatDateInput(end) };
    case 'yesterday': {
      const start = new Date(today);
      start.setDate(start.getDate() - 1);
      return { start: formatDateInput(start), end: formatDateInput(start) };
    }
    case 'last30': {
      const start = new Date(today);
      start.setDate(start.getDate() - 29);
      return { start: formatDateInput(start), end: formatDateInput(end) };
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

const QUICK_RANGE_OPTIONS: Array<{ label: string; value: QuickRange }> = [
  { label: 'Today', value: 'today' },
  { label: 'Yesterday', value: 'yesterday' },
  { label: 'Last 7 Days', value: 'last7' },
  { label: 'Last 30 Days', value: 'last30' },
  { label: 'This Month', value: 'thisMonth' },
];

export default function ManagerDashboardPage() {
  const { user, companyContext } = useAppSelector((state) => state.auth);
  const { hasFeature } = useRolePermissions();
  const [activeQuickRange, setActiveQuickRange] = useState<QuickRange>('last7');
  const [dateRange, setDateRange] = useState(() => computeDateRange('last7'));

  const branchId = user?.branchId;
  const companyId = user?.companyId || companyContext?.companyId || null;

  // Stats for sales/orders
  const statsParams = {
    branchId: branchId || undefined,
    startDate: dateRange.start,
    endDate: dateRange.end,
  };

  const { data: statsData } = useGetPOSStatsQuery(statsParams);
  const { data: ordersData, isLoading: ordersLoading } = useGetPOSOrdersQuery({
    branchId: branchId || undefined,
    startDate: dateRange.start,
    endDate: dateRange.end,
    page: 1,
    limit: 10,
  });

  // Staff data (if manager has staff-management feature)
  const { data: staffData } = useGetStaffQuery(
    {
      companyId,
      limit: 10,
    },
    { skip: !companyId || !hasFeature('staff-management') }
  );

  // Extract stats
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

  // Extract orders
  const orders = useMemo(() => {
    const items = (ordersData as any)?.orders || [];
    return items.map((order: any) => ({
      id: order._id || order.id,
      orderNumber: order.orderNumber || order.order_number || 'N/A',
      tableId: typeof order.tableId === 'object' 
        ? order.tableId?.tableNumber || order.tableId?.number || 'N/A'
        : order.tableId || 'N/A',
      totalAmount: order.totalAmount || order.total_amount || order.total || 0,
      status: order.status || 'pending',
      paymentMethod: order.paymentMethod || order.payment_method || null,
      createdAt: order.createdAt || order.created_at || order.date,
      orderType: order.orderType || 'unknown',
    }));
  }, [ordersData]);

  // Revenue chart data
  const revenueByDate = useMemo(() => {
    if (!Array.isArray(orders) || orders.length === 0) return [];
    
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

  // Stats cards based on available features
  const statsCards = useMemo(() => {
    const cards = [];

    if (hasFeature('reports') || hasFeature('dashboard')) {
      cards.push(
        {
          title: 'Total Revenue',
          value: formatCurrency(stats.totalRevenue),
          icon: CurrencyDollarIcon,
          color: 'text-green-600',
          bgColor: 'bg-green-50 dark:bg-green-900/20',
        },
        {
          title: 'Total Orders',
          value: (stats.totalOrders ?? 0).toString(),
          icon: ShoppingBagIcon,
          color: 'text-blue-600',
          bgColor: 'bg-blue-50 dark:bg-blue-900/20',
        },
        {
          title: 'Average Order Value',
          value: formatCurrency(stats.averageOrderValue),
          icon: ChartBarIcon,
          color: 'text-purple-600',
          bgColor: 'bg-purple-50 dark:bg-purple-900/20',
        },
        {
          title: 'Orders Today',
          value: (stats.ordersToday ?? 0).toString(),
          icon: ClockIcon,
          color: 'text-orange-600',
          bgColor: 'bg-orange-50 dark:bg-orange-900/20',
        }
      );
    }

    if (hasFeature('staff-management')) {
      const staffCount = staffData?.staff?.length || 0;
      cards.push({
        title: 'Active Staff',
        value: staffCount.toString(),
        icon: UserGroupIcon,
        color: 'text-indigo-600',
        bgColor: 'bg-indigo-50 dark:bg-indigo-900/20',
      });
    }

    return cards;
  }, [stats, hasFeature, staffData]);

  // Recent orders columns
  const orderColumns = [
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
      render: (value: any, row: any) => (
        <Badge className="bg-blue-100 text-blue-800">
          Table {row?.tableId || value || 'N/A'}
        </Badge>
      ),
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
        const statusConfig: Record<string, { color: string; text: string }> = {
          pending: { color: 'bg-yellow-100 text-yellow-800', text: 'Pending' },
          paid: { color: 'bg-green-100 text-green-800', text: 'Paid' },
          cancelled: { color: 'bg-red-100 text-red-800', text: 'Cancelled' },
        };
        const config = statusConfig[status] || statusConfig.pending;
        return <Badge className={config.color}>{config.text}</Badge>;
      },
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
  ];

  const handleQuickRange = (range: QuickRange) => {
    setActiveQuickRange(range);
    setDateRange(computeDateRange(range));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Manager Dashboard</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Operational overview and key performance indicators
          </p>
        </div>
      </div>

      {/* Quick Range Filter */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-2">
            {QUICK_RANGE_OPTIONS.map(({ label, value }) => {
              const isActive = activeQuickRange === value;
              return (
                <Button
                  key={value}
                  variant={isActive ? 'primary' : 'secondary'}
                  onClick={() => handleQuickRange(value)}
                  size="sm"
                >
                  {label}
                </Button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Stats Cards */}
      {statsCards.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {statsCards.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <Card key={index} className={stat.bgColor}>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                        {stat.title}
                      </p>
                      <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                        {stat.value}
                      </p>
                    </div>
                    <Icon className={`h-10 w-10 ${stat.color}`} />
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Charts Row - Only if user has reports/dashboard feature */}
      {(hasFeature('reports') || hasFeature('dashboard')) && revenueByDate.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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

          {/* Top Selling Items */}
          {stats.topSellingItems && stats.topSellingItems.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ShoppingBagIcon className="h-5 w-5" />
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
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Recent Orders - Only if user has order-management feature */}
      {hasFeature('order-management') && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ClipboardDocumentListIcon className="h-5 w-5" />
              Recent Orders
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {ordersLoading ? (
              <div className="p-6 text-center text-gray-500">Loading orders...</div>
            ) : orders && orders.length > 0 ? (
              <DataTable
                data={orders}
                columns={orderColumns}
                loading={ordersLoading}
              />
            ) : (
              <div className="p-6 text-center text-gray-500">No orders found</div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Quick Actions Grid - Based on available features */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {hasFeature('menu-management') && (
          <Card className="hover:shadow-lg transition-shadow cursor-pointer">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                  <ClipboardDocumentListIcon className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white">Menu Management</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Manage menu items</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {hasFeature('table-management') && (
          <Card className="hover:shadow-lg transition-shadow cursor-pointer">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
                  <BuildingStorefrontIcon className="w-6 h-6 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white">Tables</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Manage restaurant tables</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {hasFeature('inventory') && (
          <Card className="hover:shadow-lg transition-shadow cursor-pointer">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center">
                  <TruckIcon className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white">Inventory</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Manage stock levels</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

