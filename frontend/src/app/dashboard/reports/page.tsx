'use client';

import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Select } from '@/components/ui/Select';
import {
  useExportReportMutation,
  useGetDashboardQuery,
  useGetPeakHoursQuery,
  useGetRevenueByCategoryQuery,
  useGetSalesAnalyticsQuery,
  useGetTopSellingItemsQuery
} from '@/lib/api/endpoints/reportsApi';
import { useAppSelector } from '@/lib/store';
import { formatCurrency } from '@/lib/utils';
import {
  ArrowTrendingDownIcon,
  ArrowTrendingUpIcon,
  ChartBarIcon,
  ClockIcon,
  CurrencyDollarIcon,
  ShoppingCartIcon,
  UsersIcon,
} from '@heroicons/react/24/outline';
import { useMemo, useState } from 'react';
import { toast } from 'react-hot-toast';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts';

const COLORS = ['#0ea5e9', '#8b5cf6', '#f59e0b', '#10b981', '#ef4444', '#ec4899'];

export default function ReportsPage() {
  const { user, companyContext } = useAppSelector((state) => state.auth);
  const [selectedPeriod, setSelectedPeriod] = useState('week');
  
  const companyId = (user as any)?.companyId || 
                    (companyContext as any)?.companyId ||
                    (companyContext as any)?._id ||
                    (companyContext as any)?.id;
  
  const branchId = (user as any)?.branchId || 
                   (companyContext as any)?.branchId ||
                   (companyContext as any)?.branches?.[0]?._id ||
                   (companyContext as any)?.branches?.[0]?.id;

  // Calculate date ranges based on period
  const { startDate, endDate } = useMemo(() => {
    const now = new Date();
    const end = new Date(now);
    let start = new Date(now);

    switch (selectedPeriod) {
      case 'day':
        start.setHours(0, 0, 0, 0);
        end.setHours(23, 59, 59, 999);
        break;
      case 'week':
        start.setDate(now.getDate() - 7);
        break;
      case 'month':
        start = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case 'year':
        start = new Date(now.getFullYear(), 0, 1);
        break;
    }

    return {
      startDate: start.toISOString(),
      endDate: end.toISOString(),
    };
  }, [selectedPeriod]);

  const { data: dashboardData, isLoading: isLoadingDashboard } = useGetDashboardQuery({ 
    branchId: branchId || undefined, 
    companyId: companyId || undefined
  }, { skip: !companyId });

  const { data: salesAnalytics, isLoading: isLoadingAnalytics } = useGetSalesAnalyticsQuery({
    branchId: branchId || undefined,
    period: selectedPeriod as 'day' | 'week' | 'month' | 'year',
  }, { skip: !branchId });

  const { data: topSellingItems, isLoading: isLoadingTopItems } = useGetTopSellingItemsQuery({
    branchId: branchId || undefined,
    limit: 5,
  }, { skip: !branchId });

  const { data: revenueByCategory, isLoading: isLoadingCategory } = useGetRevenueByCategoryQuery({
    branchId: branchId || undefined,
  }, { skip: !branchId });

  const { data: peakHoursData, isLoading: isLoadingPeakHours } = useGetPeakHoursQuery({
    branchId: branchId || undefined,
    startDate,
    endDate,
  }, { skip: !branchId });

  const [exportReport, { isLoading: isExporting }] = useExportReportMutation();

  // Transform real API data for charts (memoized to prevent re-renders)
  const salesData = useMemo(() => {
    return salesAnalytics?.salesByDay?.map((item: any) => ({
      name: new Date(item.day || item.date).toLocaleDateString('en-US', { weekday: 'short' }) || 'N/A',
      sales: item.sales || 0,
      orders: item.orders || 0,
    })) || [];
  }, [salesAnalytics?.salesByDay]);

  const topItems = useMemo(() => {
    return topSellingItems?.map((item, index) => ({
      name: item.name || 'Unknown Item',
      orders: item.quantity || 0,
      revenue: item.revenue || 0,
      avgRevenue: item.quantity ? item.revenue / item.quantity : 0,
      index,
    })) || [];
  }, [topSellingItems]);

  // Calculate trends (comparing current period with previous period)
  const trends = useMemo(() => {
    if (!salesAnalytics || !dashboardData) {
      return {
        revenueChange: 0,
        ordersChange: 0,
        avgOrderValueChange: 0,
      };
    }

    const currentRevenue = salesAnalytics.totalSales || 0;
    const currentOrders = salesAnalytics.totalOrders || 0;
    const currentAvgOrderValue = salesAnalytics.averageOrderValue || 0;

    // Compare with previous period based on selected period
    let prevRevenue = 0;
    let prevOrders = 0;
    
    if (selectedPeriod === 'day') {
      // Compare with yesterday (use week data as approximation)
      prevRevenue = dashboardData.week?.revenue ? dashboardData.week.revenue / 7 : 0;
      prevOrders = dashboardData.week?.orders ? Math.round(dashboardData.week.orders / 7) : 0;
    } else if (selectedPeriod === 'week') {
      // Compare with previous week (use month data as approximation)
      prevRevenue = dashboardData.month?.revenue ? dashboardData.month.revenue / 4 : 0;
      prevOrders = dashboardData.month?.orders ? Math.round(dashboardData.month.orders / 4) : 0;
    } else if (selectedPeriod === 'month') {
      // Compare with previous month (use current month as baseline)
      prevRevenue = dashboardData.month?.revenue || 0;
      prevOrders = dashboardData.month?.orders || 0;
    }

    const prevAvgOrderValue = prevOrders > 0 ? prevRevenue / prevOrders : 0;

    return {
      revenueChange: prevRevenue > 0 ? ((currentRevenue - prevRevenue) / prevRevenue) * 100 : 0,
      ordersChange: prevOrders > 0 ? ((currentOrders - prevOrders) / prevOrders) * 100 : 0,
      avgOrderValueChange: prevAvgOrderValue > 0 ? ((currentAvgOrderValue - prevAvgOrderValue) / prevAvgOrderValue) * 100 : 0,
    };
  }, [salesAnalytics, dashboardData, selectedPeriod]);

  const categoryData = revenueByCategory?.map((item, index) => ({
    name: item.category || 'Unknown',
    value: item.percentage || 0,
    sales: item.sales || 0,
    color: COLORS[index % COLORS.length],
  })) || [];

  const hourlyData = peakHoursData?.hourlyData?.map((item: any) => ({
    hour: item.hour >= 12 ? `${item.hour > 12 ? item.hour - 12 : item.hour} PM` : `${item.hour || 0} AM`,
    orders: item.orders || 0,
    sales: item.sales || 0,
  })) || [];

  // Calculate peak hours
  const peakHours = useMemo(() => {
    if (!peakHoursData?.peakHours || peakHoursData.peakHours.length === 0) {
      return { text: 'N/A', orders: 0 };
    }
    const peak = peakHoursData.peakHours[0];
    const hour = peak.hour;
    const hourText = hour >= 12 ? `${hour > 12 ? hour - 12 : hour} PM` : `${hour} AM`;
    const nextHour = hour + 1;
    const nextHourText = nextHour >= 12 ? `${nextHour > 12 ? nextHour - 12 : nextHour} PM` : `${nextHour} AM`;
    return {
      text: `${hourText}-${nextHourText}`,
      orders: Math.round(peak.orders || 0),
    };
  }, [peakHoursData]);

  // Find best performing day
  const bestDay = useMemo(() => {
    if (!salesData || salesData.length === 0) return null;
    const best = salesData.reduce((max, day) => 
      day.sales > max.sales ? day : max, salesData[0]
    );
    return {
      name: best.name,
      sales: best.sales,
      orders: best.orders,
    };
  }, [salesData]);

  // Find most popular item
  const mostPopularItem = useMemo(() => {
    if (!topItems || topItems.length === 0) return null;
    return topItems[0];
  }, [topItems]);

  const isLoading = isLoadingDashboard || isLoadingAnalytics || isLoadingTopItems || isLoadingCategory || isLoadingPeakHours;

  const handleExport = async (type: 'sales' | 'inventory' | 'customers' | 'staff', format: 'pdf' | 'excel' | 'csv') => {
    try {
      const result = await exportReport({
        type,
        format,
        params: {
          branchId: branchId,
          companyId: companyId,
          period: selectedPeriod,
          startDate,
          endDate,
        },
      }).unwrap();
      if (result.downloadUrl) {
        window.open(result.downloadUrl, '_blank');
      }
      toast.success(`Report exported as ${format.toUpperCase()}`);
    } catch (error: any) {
      toast.error(error?.data?.message || 'Failed to export report');
    }
  };

  const formatPercentage = (value: number) => {
    const sign = value >= 0 ? '+' : '';
    return `${sign}${value.toFixed(1)}%`;
  };

  const TrendIndicator = ({ value }: { value: number }) => {
    const isPositive = value >= 0;
    const Icon = isPositive ? ArrowTrendingUpIcon : ArrowTrendingDownIcon;
    const color = isPositive ? 'text-green-600' : 'text-red-600';
    
    return (
      <div className="flex items-center gap-1">
        <Icon className={`w-4 h-4 ${color}`} />
        <span className={`text-sm font-medium ${color}`}>
          {formatPercentage(value)}
        </span>
        <span className="text-sm text-gray-500">vs last period</span>
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Reports & Analytics</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Comprehensive insights into your restaurant performance
          </p>
          <p className="text-xs text-amber-600 dark:text-amber-400 mt-2">
            ⚠️ Note: Sales reports show completed orders only. Pending orders will appear after completion.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Select
            options={[
              { value: 'day', label: 'Today' },
              { value: 'week', label: 'Last 7 Days' },
              { value: 'month', label: 'Last 30 Days' },
              { value: 'year', label: 'Last Year' },
            ]}
            value={selectedPeriod}
            onChange={(value) => setSelectedPeriod(value)}
          />
          <Button
            onClick={() => handleExport('sales', 'pdf')}
            variant="secondary"
            disabled={isExporting}
          >
            <ChartBarIcon className="w-4 h-4 mr-2" />
            {isExporting ? 'Exporting...' : 'Export Report'}
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Total Revenue</p>
                <p className="text-3xl font-bold text-green-600">
                  {formatCurrency(salesAnalytics?.totalSales || dashboardData?.today?.revenue || 0)}
                </p>
                <div className="mt-2">
                  <TrendIndicator value={trends.revenueChange} />
                </div>
                <p className="text-xs text-gray-500 mt-1">Completed orders only</p>
              </div>
              <CurrencyDollarIcon className="w-8 h-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Completed Orders</p>
                <p className="text-3xl font-bold text-blue-600">
                  {salesAnalytics?.totalOrders || dashboardData?.today?.completed || 0}
                </p>
                <div className="mt-2">
                  <TrendIndicator value={trends.ordersChange} />
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  {dashboardData?.today?.orders ? `${dashboardData.today.orders} total today` : ''}
                </p>
              </div>
              <ShoppingCartIcon className="w-8 h-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Avg Order Value</p>
                <p className="text-3xl font-bold text-purple-600">
                  {formatCurrency(salesAnalytics?.averageOrderValue || 0)}
                </p>
                <div className="mt-2">
                  <TrendIndicator value={trends.avgOrderValueChange} />
                </div>
              </div>
              <ChartBarIcon className="w-8 h-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Peak Hours</p>
                <p className="text-3xl font-bold text-orange-600">{peakHours.text}</p>
                <div className="flex items-center gap-1 mt-2">
                  <ClockIcon className="w-4 h-4 text-orange-600" />
                  <span className="text-sm text-gray-500">{peakHours.orders} orders avg</span>
                </div>
              </div>
              <ClockIcon className="w-8 h-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Sales Trend */}
        <Card>
          <CardHeader>
            <CardTitle>Sales Trend</CardTitle>
          </CardHeader>
          <CardContent>
            {salesData.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-500 dark:text-gray-400">No sales data available</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={salesData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200 dark:stroke-gray-700" />
                  <XAxis dataKey="name" className="text-sm" />
                  <YAxis className="text-sm" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'rgba(255, 255, 255, 0.95)',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                    }}
                  />
                  <Line type="monotone" dataKey="sales" stroke="#0ea5e9" strokeWidth={3} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Sales by Category */}
        <Card>
          <CardHeader>
            <CardTitle>Sales by Category</CardTitle>
          </CardHeader>
          <CardContent>
            {categoryData.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-500 dark:text-gray-400">No category data available</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={categoryData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {categoryData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Hourly Orders */}
        <Card>
          <CardHeader>
            <CardTitle>Orders by Hour</CardTitle>
          </CardHeader>
          <CardContent>
            {hourlyData.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-500 dark:text-gray-400">No hourly data available</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={hourlyData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200 dark:stroke-gray-700" />
                  <XAxis dataKey="hour" className="text-sm" />
                  <YAxis className="text-sm" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'rgba(255, 255, 255, 0.95)',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                    }}
                  />
                  <Bar dataKey="orders" fill="#8b5cf6" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Top Selling Items */}
        <Card>
          <CardHeader>
            <CardTitle>Top Selling Items</CardTitle>
          </CardHeader>
          <CardContent>
            {topItems.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-500 dark:text-gray-400">No data available</p>
              </div>
            ) : (
              <div className="space-y-4">
                {topItems.map((item) => (
                  <div key={item.name} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                        item.index === 0 ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400' :
                        item.index === 1 ? 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400' :
                        item.index === 2 ? 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400' :
                        'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
                      }`}>
                        {item.index + 1}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">{item.name}</p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {item.orders} orders
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-gray-900 dark:text-white">
                        {formatCurrency(item.revenue)}
                      </p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Avg: {formatCurrency(item.avgRevenue)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Active Orders</p>
                <p className="text-3xl font-bold text-green-600">
                  {dashboardData?.active?.orders || 0}
                </p>
                <p className="text-sm text-gray-500 mt-1">Currently processing</p>
              </div>
              <ShoppingCartIcon className="w-8 h-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Total Customers</p>
                <p className="text-3xl font-bold text-blue-600">
                  {dashboardData?.customers?.total || 0}
                </p>
                <p className="text-sm text-gray-500 mt-1">
                  {dashboardData?.customers?.active || 0} active
                </p>
              </div>
              <UsersIcon className="w-8 h-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Inventory Alerts</p>
                <p className="text-3xl font-bold text-purple-600">
                  {(dashboardData?.inventory?.lowStock || 0) + (dashboardData?.inventory?.outOfStock || 0)}
                </p>
                <p className="text-sm text-gray-500 mt-1">
                  {dashboardData?.inventory?.lowStock || 0} low, {dashboardData?.inventory?.outOfStock || 0} out
                </p>
              </div>
              <ChartBarIcon className="w-8 h-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Additional Insights */}
      <Card>
        <CardHeader>
          <CardTitle>Performance Insights</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {bestDay && (
              <div>
                <h4 className="font-medium text-gray-900 dark:text-white mb-3">Best Performing Day</h4>
                <div className="flex items-center gap-3 p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                  <div className="w-10 h-10 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
                    <ArrowTrendingUpIcon className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900 dark:text-white">{bestDay.name}</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {formatCurrency(bestDay.sales)} in sales • {bestDay.orders} orders
                    </p>
                  </div>
                </div>
              </div>
            )}

            {mostPopularItem && (
              <div>
                <h4 className="font-medium text-gray-900 dark:text-white mb-3">Most Popular Item</h4>
                <div className="flex items-center gap-3 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
                    <ShoppingCartIcon className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900 dark:text-white">{mostPopularItem.name}</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {mostPopularItem.orders} orders • {formatCurrency(mostPopularItem.revenue)} revenue
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
