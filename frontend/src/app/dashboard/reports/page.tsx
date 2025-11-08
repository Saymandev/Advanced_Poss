'use client';

import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Select } from '@/components/ui/Select';
import {
  useExportReportMutation,
  useGetDashboardQuery,
  useGetSalesAnalyticsQuery,
  useGetTopSellingItemsQuery
} from '@/lib/api/endpoints/reportsApi';
import { useAppSelector } from '@/lib/store';
import { formatCurrency } from '@/lib/utils';
import {
  ArrowTrendingUpIcon,
  ChartBarIcon,
  ClockIcon,
  CurrencyDollarIcon,
  ShoppingCartIcon,
  UsersIcon,
} from '@heroicons/react/24/outline';
import { useState } from 'react';
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
  const { user } = useAppSelector((state) => state.auth);
  const [selectedPeriod, setSelectedPeriod] = useState('week');
  
  const { data: dashboardData, isLoading: isLoadingDashboard } = useGetDashboardQuery({ 
    branchId: user?.branchId || undefined, 
    companyId: user?.companyId || undefined
  });

  const { data: salesAnalytics, isLoading: isLoadingAnalytics } = useGetSalesAnalyticsQuery({
    branchId: user?.branchId || undefined,
    period: selectedPeriod as 'day' | 'week' | 'month' | 'year',
  });

  const { data: topSellingItems, isLoading: isLoadingTopItems } = useGetTopSellingItemsQuery({
    branchId: user?.branchId || undefined,
    limit: 5,
  });

  const [exportReport, { isLoading: isExporting }] = useExportReportMutation();

  // Transform real API data for charts
  const salesData = salesAnalytics?.salesByDay?.map((item: any) => ({
    name: item.day || item.date?.split('T')[0] || 'N/A',
    sales: item.sales || 0,
    orders: item.orders || 0,
  })) || Array.from({ length: 7 }, (_, i) => ({
    name: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][i],
    sales: 0,
    orders: 0,
  }));

  const categoryData = salesAnalytics?.salesByCategory?.map((item, index) => ({
    name: item.category || 'Unknown',
    value: item.percentage || 0,
    color: COLORS[index % COLORS.length],
  })) || [
    { name: 'No Data', value: 100, color: '#6b7280' },
  ];

  const hourlyData = salesAnalytics?.salesByHour?.map((item: any) => ({
    hour: item.hour >= 12 ? `${item.hour > 12 ? item.hour - 12 : item.hour} PM` : `${item.hour || 0} AM`,
    orders: item.orders || 0,
    sales: item.sales || 0,
  })) || Array.from({ length: 12 }, (_, i) => ({
    hour: `${i + 8} ${i + 8 >= 12 ? 'PM' : 'AM'}`,
    orders: 0,
    sales: 0,
  }));

  const topItems = topSellingItems?.map((item, index) => ({
    name: item.name || 'Unknown Item',
    orders: item.quantity || 0,
    revenue: item.revenue || 0,
    avgRevenue: item.quantity ? item.revenue / item.quantity : 0,
    index,
  })) || [];

  const isLoading = isLoadingDashboard || isLoadingAnalytics || isLoadingTopItems;

  const handleExport = async (type: 'sales' | 'inventory' | 'customers' | 'staff', format: 'pdf' | 'excel' | 'csv') => {
    try {
      const result = await exportReport({
        type,
        format,
        params: {
          branchId: user?.branchId,
          companyId: user?.companyId,
          period: selectedPeriod,
        },
      }).unwrap();
      window.open(result.downloadUrl, '_blank');
      toast.success(`Report exported as ${format.toUpperCase()}`);
    } catch (error: any) {
      toast.error(error?.data?.message || 'Failed to export report');
    }
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
                  {formatCurrency(dashboardData?.todaySales || salesAnalytics?.totalSales || 0)}
                </p>
                <div className="flex items-center gap-1 mt-2">
                  <ArrowTrendingUpIcon className="w-4 h-4 text-green-600" />
                  <span className="text-sm font-medium text-green-600">+12.5%</span>
                  <span className="text-sm text-gray-500">vs last period</span>
                </div>
              </div>
              <CurrencyDollarIcon className="w-8 h-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Total Orders</p>
                <p className="text-3xl font-bold text-blue-600">
                  {dashboardData?.todayOrders || salesAnalytics?.totalOrders || 0}
                </p>
                <div className="flex items-center gap-1 mt-2">
                  <ArrowTrendingUpIcon className="w-4 h-4 text-blue-600" />
                  <span className="text-sm font-medium text-blue-600">+8.2%</span>
                  <span className="text-sm text-gray-500">vs last period</span>
                </div>
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
                <div className="flex items-center gap-1 mt-2">
                  <ArrowTrendingUpIcon className="w-4 h-4 text-purple-600" />
                  <span className="text-sm font-medium text-purple-600">+4.1%</span>
                  <span className="text-sm text-gray-500">vs last period</span>
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
                <p className="text-3xl font-bold text-orange-600">6-8 PM</p>
                <div className="flex items-center gap-1 mt-2">
                  <ClockIcon className="w-4 h-4 text-orange-600" />
                  <span className="text-sm text-gray-500">35 orders avg</span>
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
          </CardContent>
        </Card>

        {/* Sales by Category */}
        <Card>
          <CardHeader>
            <CardTitle>Sales by Category</CardTitle>
          </CardHeader>
          <CardContent>
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
          </CardContent>
        </Card>

        {/* Hourly Orders */}
        <Card>
          <CardHeader>
            <CardTitle>Orders by Hour</CardTitle>
          </CardHeader>
          <CardContent>
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
                <p className="text-sm text-gray-600 dark:text-gray-400">Customer Satisfaction</p>
                <p className="text-3xl font-bold text-green-600">4.7⭐</p>
                <p className="text-sm text-gray-500 mt-1">Based on 234 reviews</p>
              </div>
              <UsersIcon className="w-8 h-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Avg Service Time</p>
                <p className="text-3xl font-bold text-blue-600">18 min</p>
                <p className="text-sm text-gray-500 mt-1">-3 min from last week</p>
              </div>
              <ClockIcon className="w-8 h-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Table Turnover</p>
                <p className="text-3xl font-bold text-purple-600">4.2x</p>
                <p className="text-sm text-gray-500 mt-1">Tables per hour</p>
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
            <div>
              <h4 className="font-medium text-gray-900 dark:text-white mb-3">Best Performing Day</h4>
              <div className="flex items-center gap-3 p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <div className="w-10 h-10 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
                  <ArrowTrendingUpIcon className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="font-semibold text-gray-900 dark:text-white">Wednesday</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    $9,800 in sales • 45 orders
                  </p>
                </div>
              </div>
            </div>

            <div>
              <h4 className="font-medium text-gray-900 dark:text-white mb-3">Most Popular Item</h4>
              <div className="flex items-center gap-3 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
                  <ShoppingCartIcon className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="font-semibold text-gray-900 dark:text-white">Grilled Salmon</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    45 orders • $1,125 revenue
                  </p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}