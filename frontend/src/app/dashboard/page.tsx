'use client';

import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { StatsSkeleton } from '@/components/ui/Skeleton';
import { useGetOrdersQuery } from '@/lib/api/endpoints/ordersApi';
import {
  useGetDashboardQuery,
  useGetSalesAnalyticsQuery,
  useGetTopSellingItemsQuery,
} from '@/lib/api/endpoints/reportsApi';
import { useGetStaffQuery } from '@/lib/api/endpoints/staffApi';
import { useGetTablesQuery } from '@/lib/api/endpoints/tablesApi';
import { useNotifications } from '@/lib/hooks/useNotifications';
import { useAppSelector } from '@/lib/store';
import { formatCurrency, formatDateTime } from '@/lib/utils';
import {
  ArrowTrendingDownIcon,
  ArrowTrendingUpIcon,
  BeakerIcon,
  BellIcon,
  ChartBarIcon,
  ClockIcon,
  CurrencyDollarIcon,
  ShoppingCartIcon,
  TableCellsIcon,
  UsersIcon,
} from '@heroicons/react/24/outline';
import Link from 'next/link';
import { useMemo } from 'react';
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

const _COLORS = ['#0ea5e9', '#8b5cf6', '#f59e0b', '#10b981', '#ef4444', '#ec4899'];

export default function DashboardPage() {
  const { user } = useAppSelector((state) => state.auth);
  const branchId = user?.branchId || undefined;
  const companyId = user?.companyId || undefined;
  
  // Fetch all dashboard data
  const { data: dashboardData, isLoading: isLoadingDashboard } = useGetDashboardQuery({ 
    branchId,
    companyId 
  });
  
  const { data: salesAnalytics, isLoading: isLoadingAnalytics } = useGetSalesAnalyticsQuery({
    branchId,
    period: 'week',
  });
  
  const { data: topSellingData, isLoading: isLoadingTopSelling } = useGetTopSellingItemsQuery({
    branchId,
    limit: 10,
  });
  
  const { data: tablesData, isLoading: isLoadingTables } = useGetTablesQuery({ branchId });
  const { data: staffData, isLoading: isLoadingStaff } = useGetStaffQuery({ 
    branchId,
    isActive: true 
  });
  const { data: recentOrdersData, isLoading: isLoadingOrders } = useGetOrdersQuery({
    branchId,
    page: 1,
    limit: 5,
    sortBy: 'createdAt',
    sortOrder: 'desc',
  });
  
  const { addNotification } = useNotifications();
  
  // Transform data from backend response
  const dashboardStats = useMemo(() => {
    const data = dashboardData as any;
    return data?.data || data || {};
  }, [dashboardData]);
  
  // Get tables data
  const tables = useMemo(() => {
    const data = tablesData as any;
    const tablesArray = data?.data?.tables || data?.tables || [];
    return Array.isArray(tablesArray) ? tablesArray : [];
  }, [tablesData]);
  
  // Get staff data
  const staff = useMemo(() => {
    const data = staffData as any;
    const staffArray = data?.data?.staff || data?.staff || [];
    return Array.isArray(staffArray) ? staffArray : [];
  }, [staffData]);
  
  // Get recent orders
  const recentOrders = useMemo(() => {
    const data = recentOrdersData as any;
    const ordersArray = data?.data?.orders || data?.orders || [];
    return Array.isArray(ordersArray) ? ordersArray : [];
  }, [recentOrdersData]);
  
  // Transform sales analytics for charts
  const salesTrend = useMemo(() => {
    const analytics = salesAnalytics as any;
    const salesByDay = analytics?.data?.salesByDay || analytics?.salesByDay || [];
    
    if (salesByDay.length > 0) {
      return salesByDay.map((day: any) => ({
        date: day.day,
        sales: day.sales || 0,
      }));
    }
    
    // Fallback: generate last 7 days
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      days.push({
        date: date.toLocaleDateString('en-US', { weekday: 'short' }),
        sales: 0,
      });
    }
    return days;
  }, [salesAnalytics]);
  
  const topSellingItems = useMemo(() => {
    const items = topSellingData || [];
    
    if (!Array.isArray(items)) {
      return [];
    }
    
    return items.slice(0, 5).map((item: any) => ({
      name: item.name || item.menuItemId?.name || 'Unknown',
      quantity: item.quantity || item.totalQuantity || 0,
      revenue: item.revenue || item.totalRevenue || 0,
    }));
  }, [topSellingData]);
  
  // Calculate yesterday for comparison
  const yesterdayStats = useMemo(() => {
    // For now, using week average as approximation
    // In production, you'd fetch yesterday's data
    const weekOrders = dashboardStats?.week?.orders || 0;
    const weekRevenue = dashboardStats?.week?.revenue || 0;
    const avgDailyOrders = weekOrders / 7;
    const avgDailyRevenue = weekRevenue / 7;
    
    return {
      orders: avgDailyOrders,
      revenue: avgDailyRevenue,
    };
  }, [dashboardStats]);
  
  const isLoading = isLoadingDashboard || isLoadingAnalytics || isLoadingTopSelling || isLoadingTables || isLoadingStaff || isLoadingOrders;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="space-y-2">
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-64"></div>
          <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-96"></div>
        </div>
        <StatsSkeleton count={4} />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 space-y-4">
            <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-32"></div>
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-24"></div>
            <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-20"></div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 space-y-4">
            <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-32"></div>
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-24"></div>
            <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-20"></div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 space-y-4">
            <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-32"></div>
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-24"></div>
            <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-20"></div>
          </div>
        </div>
      </div>
    );
  }

  // Extract stats values
  const todaySales = dashboardStats?.today?.revenue || 0;
  const todayOrders = dashboardStats?.today?.orders || 0;
  const activeOrders = dashboardStats?.active?.orders || 0;
  const totalCustomers = dashboardStats?.customers?.total || 0;
  const lowStockItems = dashboardStats?.inventory?.lowStock || 0;
  
  // Calculate percentage changes
  const salesChange = yesterdayStats.revenue > 0
    ? ((todaySales - yesterdayStats.revenue) / yesterdayStats.revenue) * 100
    : todaySales > 0 ? 100 : 0;
  const ordersChange = yesterdayStats.orders > 0
    ? ((todayOrders - yesterdayStats.orders) / yesterdayStats.orders) * 100
    : todayOrders > 0 ? 100 : 0;
  
  const availableTables = tables.filter((t: any) => t.status === 'available').length;
  const occupiedTables = tables.filter((t: any) => t.status === 'occupied').length;
  const activeStaff = staff.filter((s: any) => s.isActive).length;

  const stats = [
    {
      name: "Today's Sales",
      value: formatCurrency(todaySales),
      icon: CurrencyDollarIcon,
      change: `${salesChange >= 0 ? '+' : ''}${salesChange.toFixed(1)}%`,
      changeType: salesChange >= 0 ? 'positive' : 'negative',
      color: 'bg-green-500',
      href: '/dashboard/reports',
    },
    {
      name: "Today's Orders",
      value: todayOrders,
      icon: ShoppingCartIcon,
      change: `${ordersChange >= 0 ? '+' : ''}${ordersChange.toFixed(1)}%`,
      changeType: ordersChange >= 0 ? 'positive' : 'negative',
      color: 'bg-blue-500',
      href: '/dashboard/orders',
    },
    {
      name: 'Active Orders',
      value: activeOrders,
      icon: ClockIcon,
      change: activeOrders > 0 ? 'Active' : 'None',
      changeType: activeOrders > 0 ? 'positive' : 'neutral',
      color: 'bg-orange-500',
      href: '/dashboard/orders',
    },
    {
      name: 'Total Customers',
      value: totalCustomers,
      icon: UsersIcon,
      change: '+0%', // Would calculate from historical data
      changeType: 'positive',
      color: 'bg-purple-500',
      href: '/dashboard/customers',
    },
  ];

  const quickActions = [
    {
      name: 'New Order',
      description: 'Create a new order',
      icon: ShoppingCartIcon,
      href: '/dashboard/orders/new',
      color: 'bg-blue-500',
    },
    {
      name: 'Add Customer',
      description: 'Register a new customer',
      icon: UsersIcon,
      href: '/dashboard/customers/new',
      color: 'bg-green-500',
    },
    {
      name: 'Manage Tables',
      description: 'Update table status',
      icon: TableCellsIcon,
      href: '/dashboard/tables',
      color: 'bg-purple-500',
    },
    {
      name: 'Kitchen View',
      description: 'Check kitchen orders',
      icon: BeakerIcon,
      href: '/dashboard/kitchen',
      color: 'bg-orange-500',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Welcome back, {user?.firstName}! Here's your restaurant overview.
          </p>
        </div>
        <div className="text-right">
          <p className="text-sm text-gray-600 dark:text-gray-400">Current Time</p>
          <p className="text-lg font-semibold text-gray-900 dark:text-white">
            {new Date().toLocaleTimeString()}
          </p>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Link key={stat.name} href={stat.href}>
              <Card className="hover:shadow-lg transition-all cursor-pointer">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">{stat.name}</p>
                      <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">
                        {stat.value}
                      </p>
                      <div className="flex items-center gap-1 mt-2">
                        {stat.changeType === 'positive' ? (
                          <ArrowTrendingUpIcon className="w-4 h-4 text-green-600" />
                        ) : (
                          <ArrowTrendingDownIcon className="w-4 h-4 text-red-600" />
                        )}
                        <span
                          className={`text-sm font-medium ${
                            stat.changeType === 'positive' ? 'text-green-600' : 'text-red-600'
                          }`}
                        >
                          {stat.change}
                        </span>
                        <span className="text-sm text-gray-500">vs yesterday</span>
                      </div>
                    </div>
                    <div className={`p-3 rounded-full ${stat.color}`}>
                      <Icon className="w-8 h-8 text-white" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {quickActions.map((action) => {
              const Icon = action.icon;
              return (
                <Link key={action.name} href={action.href}>
                  <div className="flex items-center gap-3 p-4 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors cursor-pointer">
                    <div className={`p-2 rounded-lg ${action.color}`}>
                      <Icon className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">{action.name}</p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">{action.description}</p>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Sales Trend (Last 7 Days)</CardTitle>
          </CardHeader>
          <CardContent>
            {salesTrend.length > 0 && salesTrend.some((day: any) => day.sales > 0) ? (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={salesTrend}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200 dark:stroke-gray-700" />
                  <XAxis dataKey="date" className="text-sm" />
                  <YAxis className="text-sm" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'rgba(255, 255, 255, 0.95)',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                    }}
                    formatter={(value: number) => formatCurrency(value)}
                  />
                  <Line type="monotone" dataKey="sales" stroke="#0ea5e9" strokeWidth={3} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[300px] text-gray-500">
                No sales data available for this period
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Top Selling Items</CardTitle>
          </CardHeader>
          <CardContent>
            {topSellingItems.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={topSellingItems} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200 dark:stroke-gray-700" />
                  <XAxis type="number" className="text-sm" />
                  <YAxis dataKey="name" type="category" className="text-sm" width={120} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'rgba(255, 255, 255, 0.95)',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                    }}
                    formatter={(value: number) => `${value} orders`}
                  />
                  <Bar dataKey="quantity" fill="#8b5cf6" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[300px] text-gray-500">
                No top selling items data available
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Orders */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Recent Orders</CardTitle>
            <Link href="/dashboard/orders">
              <Button variant="ghost" size="sm">
                View All
              </Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {recentOrders.length > 0 ? (
              recentOrders.slice(0, 5).map((order: any) => (
                <div key={order.id} className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                      <ShoppingCartIcon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">
                        Order #{order.orderNumber || order.id}
                      </p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {order.items?.length || 0} items • {formatCurrency(order.total || 0)}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge variant={
                      order.status === 'completed' ? 'success' : 
                      order.status === 'pending' ? 'warning' : 
                      order.status === 'cancelled' ? 'danger' : 'info'
                    }>
                      {order.status || 'pending'}
                    </Badge>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                      {formatDateTime(order.createdAt)}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-center text-gray-500 dark:text-gray-400 py-8">
                No recent orders
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* System Status */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Tables Available</p>
                <p className="text-2xl font-bold text-green-600">
                  {availableTables}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {occupiedTables} occupied
                </p>
              </div>
              <TableCellsIcon className="w-8 h-8 text-green-600" />
            </div>
            <Link href="/dashboard/tables">
              <Button variant="ghost" size="sm" className="mt-2 w-full">
                Manage Tables
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Low Stock Items</p>
                <p className="text-2xl font-bold text-yellow-600">
                  {lowStockItems}
                </p>
                {lowStockItems > 0 && (
                  <p className="text-xs text-amber-600 mt-1">
                    Action needed
                  </p>
                )}
              </div>
              <ChartBarIcon className="w-8 h-8 text-yellow-600" />
            </div>
            {lowStockItems > 0 && (
              <Link href="/dashboard/inventory">
                <Button variant="ghost" size="sm" className="mt-2 w-full">
                  Check Inventory
                </Button>
              </Link>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Active Staff</p>
                <p className="text-2xl font-bold text-blue-600">
                  {activeStaff}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {staff.length} total
                </p>
              </div>
              <UsersIcon className="w-8 h-8 text-blue-600" />
            </div>
            <Link href="/dashboard/staff">
              <Button variant="ghost" size="sm" className="mt-2 w-full">
                View Staff
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>

      {/* Demo Notifications Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BellIcon className="w-5 h-5" />
            Demo Notifications
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            Test the notification system with different types of alerts
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-3">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => addNotification({
                type: 'order',
                title: 'New Order Received',
                message: 'Order #1234 has been placed by John Doe for Table 5',
              })}
              className="flex flex-col items-center gap-2 p-4 h-auto"
            >
              <Badge variant="info">🛎️</Badge>
              <span>New Order</span>
            </Button>

            <Button
              variant="secondary"
              size="sm"
              onClick={() => addNotification({
                type: 'payment',
                title: 'Payment Completed',
                message: 'Payment of $45.50 has been processed successfully',
              })}
              className="flex flex-col items-center gap-2 p-4 h-auto"
            >
              <Badge variant="success">💳</Badge>
              <span>Payment</span>
            </Button>

            <Button
              variant="secondary"
              size="sm"
              onClick={() => addNotification({
                type: 'kitchen',
                title: 'Order Ready',
                message: 'Grilled Salmon for Table 3 is ready for pickup',
              })}
              className="flex flex-col items-center gap-2 p-4 h-auto"
            >
              <Badge variant="warning">🍳</Badge>
              <span>Kitchen</span>
            </Button>

            <Button
              variant="secondary"
              size="sm"
              onClick={() => addNotification({
                type: 'system',
                title: 'System Update',
                message: 'New features have been deployed successfully',
              })}
              className="flex flex-col items-center gap-2 p-4 h-auto"
            >
              <Badge variant="secondary">⚙️</Badge>
              <span>System</span>
            </Button>

            <Button
              variant="secondary"
              size="sm"
              onClick={() => addNotification({
                type: 'promotion',
                title: 'Special Offer',
                message: 'Weekend promotion: Buy 2 pizzas, get 1 free!',
              })}
              className="flex flex-col items-center gap-2 p-4 h-auto"
            >
              <Badge variant="success">🎉</Badge>
              <span>Promotion</span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}