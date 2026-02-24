'use client';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Select } from '@/components/ui/Select';
import { useFeatureRedirect } from '@/hooks/useFeatureRedirect';
import {
    useExportReportMutation,
    useGetDashboardQuery,
    useGetDueSettlementsQuery,
    useGetFinancialSummaryQuery,
    useGetPeakHoursQuery,
    useGetRevenueByCategoryQuery,
    useGetSalesAnalyticsQuery,
    useGetTopSellingItemsQuery,
    useGetWastageReportQuery,
} from '@/lib/api/endpoints/reportsApi';
import { useAppSelector } from '@/lib/store';
import { formatCurrency } from '@/lib/utils';
import {
    ArrowPathIcon,
    ArrowTrendingDownIcon,
    ArrowTrendingUpIcon,
    CakeIcon,
    ChartBarIcon,
    ClockIcon,
    CurrencyDollarIcon,
    ExclamationTriangleIcon,
    ShoppingCartIcon,
    TrashIcon,
    UsersIcon,
} from '@heroicons/react/24/outline';
import { useEffect, useMemo, useState } from 'react';
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

// Custom tooltip formatter that ensures 2 decimal places for currency
const formatTooltipCurrency = (value: any): string => {
  if (typeof value === 'number') {
    // Round to 2 decimal places to avoid floating point issues
    const rounded = Math.round(value * 100) / 100;
    return formatCurrency(rounded);
  }
  return formatCurrency(Number(value) || 0);
};

export default function ReportsPage() {
  const { user, companyContext } = useAppSelector((state) => state.auth);
  // Redirect if user doesn't have reports feature (auto-redirects to role-specific dashboard)
  useFeatureRedirect('reports');
  const [selectedPeriod, setSelectedPeriod] = useState<'day' | 'week' | 'month' | 'year'>('week');
  const [activeReport, setActiveReport] = useState<'financial' | 'sales' | 'wastage' | 'food' | 'settlement'>('financial');
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);
  const companyId = useMemo(() => {
    return (user as any)?.companyId || 
           (companyContext as any)?.companyId ||
           (companyContext as any)?._id ||
           (companyContext as any)?.id;
  }, [user, companyContext]);
  const branchId = useMemo(() => {
    return (user as any)?.branchId || 
           (companyContext as any)?.branchId ||
           (companyContext as any)?.branches?.[0]?._id ||
           (companyContext as any)?.branches?.[0]?.id;
  }, [user, companyContext]);
  // Calculate date ranges based on period
  const { startDate, endDate } = useMemo(() => {
    const now = new Date();
    let end = new Date(now);
    let start = new Date(now);
    switch (selectedPeriod) {
      case 'day':
        // For 'day', only show today's data (use local date, not UTC)
        // Create date in local timezone to avoid timezone conversion issues
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        start = new Date(today);
        start.setHours(0, 0, 0, 0);
        end = new Date(today);
        end.setHours(23, 59, 59, 999);
        break;
      case 'week':
        start.setDate(now.getDate() - 7);
        start.setHours(0, 0, 0, 0);
        end.setHours(23, 59, 59, 999);
        break;
      case 'month':
        start = new Date(now.getFullYear(), now.getMonth(), 1);
        start.setHours(0, 0, 0, 0);
        end.setHours(23, 59, 59, 999);
        break;
      case 'year':
        start = new Date(now.getFullYear(), 0, 1);
        start.setHours(0, 0, 0, 0);
        end.setHours(23, 59, 59, 999);
        break;
    }
    // Format dates to ensure the date part is correct regardless of timezone
    // Use UTC date components to create the date string, so the date part matches the user's local date
    const formatDateForAPI = (date: Date) => {
      // Get the local date components (what the user sees)
      const year = date.getFullYear();
      const month = date.getMonth();
      const day = date.getDate();
      const hours = date.getHours();
      const minutes = date.getMinutes();
      const seconds = date.getSeconds();
      const ms = date.getMilliseconds();
      // Create a new Date using UTC components but with the same date values
      // This ensures the date part (YYYY-MM-DD) in the ISO string matches the local date
      const utcDate = new Date(Date.UTC(year, month, day, hours, minutes, seconds, ms));
      return utcDate.toISOString();
    };
    return {
      startDate: formatDateForAPI(start),
      endDate: formatDateForAPI(end),
    };
  }, [selectedPeriod]);
  const { 
    data: dashboardData, 
    isLoading: isLoadingDashboard,
    error: dashboardError,
    refetch: refetchDashboard
  } = useGetDashboardQuery({ 
    branchId: branchId || undefined, 
    companyId: companyId || undefined
  }, { 
    skip: !companyId && !branchId,
    refetchOnMountOrArgChange: true,
  });
  const {
    data: financialSummary,
    isLoading: isLoadingFinancialSummary,
    error: financialSummaryError,
    refetch: refetchFinancialSummary,
  } = useGetFinancialSummaryQuery({
    branchId: branchId || undefined,
    companyId: companyId || undefined,
    startDate,
    endDate,
  }, {
    skip: (!companyId && !branchId) || activeReport !== 'financial',
    refetchOnMountOrArgChange: true,
  });
  const { 
    data: salesAnalytics, 
    isLoading: isLoadingAnalytics,
    error: salesAnalyticsError,
    refetch: refetchSalesAnalytics
  } = useGetSalesAnalyticsQuery({
    branchId: branchId || undefined,
    period: selectedPeriod,
    startDate,
    endDate,
  }, { 
    skip: !branchId && !companyId,
    refetchOnMountOrArgChange: true,
  });
  // Debug logging for sales analytics
  useEffect(() => {
    if (salesAnalytics) {
      // Debug logging removed
    }
  }, [salesAnalytics, selectedPeriod]);
  const { 
    data: topSellingItems, 
    isLoading: isLoadingTopItems,
    error: topItemsError,
    refetch: refetchTopItems
  } = useGetTopSellingItemsQuery({
    branchId: branchId || undefined,
    limit: 5,
  }, { 
    skip: !branchId && !companyId,
    refetchOnMountOrArgChange: true,
  });
  const { 
    data: revenueByCategory, 
    isLoading: isLoadingCategory,
    error: categoryError,
    refetch: refetchCategory
  } = useGetRevenueByCategoryQuery({
    branchId: branchId || undefined,
    startDate,
    endDate,
  }, { 
    skip: !branchId && !companyId,
    refetchOnMountOrArgChange: true,
  });
  // Debug logging for category data
  useEffect(() => {
    // Debug logging removed
  }, [revenueByCategory, isLoadingCategory, categoryError, branchId, startDate, endDate, selectedPeriod]);
  const { 
    data: peakHoursData, 
    isLoading: isLoadingPeakHours,
    error: peakHoursError,
    refetch: refetchPeakHours
  } = useGetPeakHoursQuery({
    branchId: branchId || undefined,
    startDate,
    endDate,
  }, { 
    skip: !branchId || !startDate || !endDate,
    refetchOnMountOrArgChange: true,
  });
  const { 
    data: wastageReport, 
    isLoading: isLoadingWastage,
    error: wastageError,
    refetch: refetchWastage
  } = useGetWastageReportQuery({
    branchId: branchId || undefined,
    companyId: companyId || undefined,
    startDate,
    endDate,
  }, { 
    skip: (!companyId && !branchId) || activeReport !== 'wastage',
    refetchOnMountOrArgChange: true,
  });
  const { 
    data: dueSettlementsData, 
    isLoading: isLoadingSettlements,
    error: settlementsError,
    refetch: refetchSettlements
  } = useGetDueSettlementsQuery({
    branchId: branchId || undefined,
    companyId: companyId || undefined,
  }, { 
    skip: !branchId && !companyId,
    refetchOnMountOrArgChange: true,
  });
  const [exportReport, { isLoading: isExporting }] = useExportReportMutation();
  // Transform real API data for charts (memoized to prevent re-renders)
  const salesData = useMemo(() => {
    if (!salesAnalytics?.salesByDay || !Array.isArray(salesAnalytics.salesByDay) || salesAnalytics.salesByDay.length === 0) {
      return [];
    }
    // Filter out days with no sales for better chart display (especially for year period)
    const filtered = salesAnalytics.salesByDay.filter((item: any) => {
      const sales = Number(item.sales) || 0;
      const orders = Number(item.orders) || 0;
      return sales > 0 || orders > 0;
    });
    // If filtering removed all data, show all data anyway (for debugging)
    const dataToUse = filtered.length > 0 ? filtered : salesAnalytics.salesByDay;
    return dataToUse.map((item: any) => {
      // Handle different date formats
      const dateStr = item.day || item.date || '';
      let date: Date;
      if (dateStr) {
        try {
          date = new Date(dateStr);
          if (isNaN(date.getTime())) {
            // Try parsing as ISO string or other formats
            date = new Date(dateStr.replace(/-/g, '/'));
          }
        } catch {
          date = new Date();
        }
      } else {
        date = new Date();
      }
      const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
      const dayNumber = date.getDate();
      const month = date.toLocaleDateString('en-US', { month: 'short' });
      // For year period, show month and day
      const displayName = selectedPeriod === 'year' 
        ? `${month} ${dayNumber}`
        : selectedPeriod === 'day' 
        ? `${dayName} ${dayNumber}` 
        : dayName;
      return {
        name: displayName,
        fullDate: `${dayNumber} ${month}`,
        sales: Number(item.sales) || 0,
        orders: Number(item.orders) || 0,
      };
    });
  }, [salesAnalytics?.salesByDay, selectedPeriod]);
  const financialCards = useMemo(() => {
    const net = financialSummary?.net ?? 0;
    const sales = financialSummary?.sales?.total ?? 0;
    const expenses = financialSummary?.expenses?.total ?? 0;
    const purchases = financialSummary?.purchases?.total ?? 0;
    return [
      {
        title: 'Net Profit / Loss',
        value: formatCurrency(net),
        color: net >= 0 ? 'text-green-600' : 'text-red-600',
      },
      {
        title: 'Sales',
        value: formatCurrency(sales),
        color: 'text-gray-900 dark:text-white',
      },
      {
        title: 'Expenses',
        value: formatCurrency(expenses),
        color: 'text-gray-900 dark:text-white',
      },
      {
        title: 'Purchases',
        value: formatCurrency(purchases),
        color: 'text-gray-900 dark:text-white',
      },
    ];
  }, [financialSummary]);
  const financialChartData = useMemo(() => {
    if (!financialSummary?.timeline) return [];
    return financialSummary.timeline.map((item: any) => {
      const date = new Date(item.date);
      const label = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      return {
        ...item,
        label,
      };
    });
  }, [financialSummary]);
  const topItems = useMemo(() => {
    return topSellingItems?.map((item: any, index: number) => ({
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
    // Calculate current avg order value
    const currentAvgOrderValue = currentOrders > 0 
      ? (salesAnalytics.averageOrderValue || (currentRevenue / currentOrders))
      : 0;
    // Compare with previous period based on selected period
    // Use dashboard data which has period-specific comparisons
    let prevRevenue = 0;
    let prevOrders = 0;
    if (selectedPeriod === 'day') {
      // For today, compare with yesterday (use dashboard today data if available, otherwise 0)
      // If we have week data, we can estimate yesterday as (week - today) / 6
      const todayRevenue = dashboardData.today?.revenue || 0;
      const todayOrders = dashboardData.today?.completed || 0;
      const weekRevenue = dashboardData.week?.revenue || 0;
      const weekOrders = dashboardData.week?.orders || 0;
      // Estimate previous day as average of other days in week
      if (weekRevenue > todayRevenue && weekOrders > todayOrders) {
        prevRevenue = (weekRevenue - todayRevenue) / Math.max(1, weekOrders - todayOrders) * (weekOrders - todayOrders) / 6;
        prevOrders = (weekOrders - todayOrders) / 6;
      }
    } else if (selectedPeriod === 'week') {
      // For week, compare with previous week
      // Use month data to estimate previous week
      const monthRevenue = dashboardData.month?.revenue || 0;
      const monthOrders = dashboardData.month?.orders || 0;
      // Estimate previous week as (month - current week) / 3 (assuming 4 weeks in month)
      if (monthRevenue > currentRevenue && monthOrders > currentOrders) {
        prevRevenue = (monthRevenue - currentRevenue) / 3;
        prevOrders = Math.round((monthOrders - currentOrders) / 3);
      }
    } else if (selectedPeriod === 'month') {
      // For month, we'd need previous month data - for now use 0 or current as baseline
      // This would ideally come from a separate API call for previous month
      prevRevenue = 0;
      prevOrders = 0;
    }
    const prevAvgOrderValue = prevOrders > 0 ? prevRevenue / prevOrders : 0;
    // Only calculate change if we have valid previous period data
    const revenueChange = prevRevenue > 0 
      ? ((currentRevenue - prevRevenue) / prevRevenue) * 100 
      : (currentRevenue > 0 ? 0 : -100); // If current > 0 but no previous, show 0% (new data)
    const ordersChange = prevOrders > 0 
      ? ((currentOrders - prevOrders) / prevOrders) * 100 
      : (currentOrders > 0 ? 0 : -100);
    const avgOrderValueChange = prevAvgOrderValue > 0 && currentAvgOrderValue > 0
      ? ((currentAvgOrderValue - prevAvgOrderValue) / prevAvgOrderValue) * 100
      : 0;
    return {
      revenueChange,
      ordersChange,
      avgOrderValueChange,
    };
  }, [salesAnalytics, dashboardData, selectedPeriod]);
  const categoryData = useMemo(() => {
    if (!revenueByCategory || !Array.isArray(revenueByCategory) || revenueByCategory.length === 0) {
      return [];
    }
    const filtered = revenueByCategory.filter((item: any) => {
      const sales = item.sales || item.revenue || 0;
      const hasSales = sales > 0;
      return item && hasSales;
    });
    const mapped = filtered.map((item: any, index: number) => ({
      name: item.category || item.categoryId?.name || item.categoryId || 'Unknown',
      value: item.percentage || 0,
      sales: item.sales || item.revenue || 0,
      color: COLORS[index % COLORS.length],
    }));
    return mapped;
  }, [revenueByCategory]);
  const hourlyData = useMemo(() => {
    if (!peakHoursData?.hourlyData || !Array.isArray(peakHoursData.hourlyData)) return [];
    return peakHoursData.hourlyData.map((item: any) => {
      const hour = item.hour ?? 0;
      const hour12 = hour >= 12 
        ? `${hour > 12 ? hour - 12 : hour} PM` 
        : `${hour === 0 ? 12 : hour} AM`;
      return {
        hour: hour12,
        orders: item.orders || 0,
        sales: item.sales || item.revenue || 0,
      };
    });
  }, [peakHoursData]);
  // Calculate peak hours
  const peakHours = useMemo(() => {
    if (!peakHoursData?.peakHours || peakHoursData.peakHours.length === 0) {
      return { text: 'N/A', orders: 0, isAverage: false };
    }
    const peak = peakHoursData.peakHours[0];
    const hour = peak.hour;
    const hourText = hour >= 12 
      ? `${hour > 12 ? hour - 12 : hour} PM` 
      : `${hour === 0 ? 12 : hour} AM`;
    const nextHour = hour + 1;
    const nextHourText = nextHour >= 12 
      ? `${nextHour > 12 ? nextHour - 12 : nextHour} PM` 
      : `${nextHour === 0 ? 12 : nextHour} AM`;
    // Calculate average if period is more than 1 day
    const daysInPeriod = selectedPeriod === 'day' ? 1 : selectedPeriod === 'week' ? 7 : selectedPeriod === 'month' ? 30 : 365;
    const totalOrders = peak.orders || 0;
    const avgOrders = daysInPeriod > 1 ? totalOrders / daysInPeriod : totalOrders;
    return {
      text: `${hourText}-${nextHourText}`,
      orders: daysInPeriod > 1 ? Math.round(avgOrders * 10) / 10 : Math.round(totalOrders),
      isAverage: daysInPeriod > 1,
    };
  }, [peakHoursData, selectedPeriod]);
  // Find best performing day
  const bestDay = useMemo(() => {
    if (!salesData || salesData.length === 0) return null;
    const best = salesData.reduce((max: any, day: any) => 
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
  const isLoading = isLoadingDashboard
    || isLoadingAnalytics
    || isLoadingTopItems
    || isLoadingCategory
    || isLoadingPeakHours
    || isLoadingSettlements
    || (activeReport === 'financial' && isLoadingFinancialSummary);
  const hasError = dashboardError
    || salesAnalyticsError
    || topItemsError
    || categoryError
    || peakHoursError
    || settlementsError
    || (activeReport === 'financial' && financialSummaryError);
  const handleRefresh = () => {
    refetchDashboard();
    refetchFinancialSummary();
    refetchSalesAnalytics();
    refetchTopItems();
    refetchCategory();
    refetchPeakHours();
    refetchSettlements();
    toast.success('Reports refreshed');
  };
  const handleExport = async (type: 'sales' | 'inventory' | 'customers' | 'staff', format: 'pdf' | 'excel' | 'csv') => {
    if (!branchId && !companyId) {
      toast.error('Branch or Company ID is required for export');
      return;
    }
    try {
      const result = await exportReport({
        type,
        format,
        params: {
          branchId: branchId || undefined,
          companyId: companyId || undefined,
          period: selectedPeriod,
          startDate,
          endDate,
        },
      }).unwrap();
      if (result.downloadUrl) {
        window.open(result.downloadUrl, '_blank');
        toast.success(`Report exported as ${format.toUpperCase()}`);
      } else {
        toast.error('Export URL not received from server');
      }
    } catch (error: any) {
      console.error('Export error:', error);
      toast.error(error?.data?.message || error?.message || 'Failed to export report');
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
  if (!mounted) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600"></div>
      </div>
    );
  }
  if (!companyId && !branchId) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Reports & Analytics</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Comprehensive insights into your restaurant performance
            </p>
          </div>
        </div>
        <Card>
          <CardContent className="p-12 text-center">
            <ExclamationTriangleIcon className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              Company or Branch Required
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              Please ensure you are logged in with a valid company or branch context to view reports.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }
  if (isLoading && !dashboardData && !salesAnalytics) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading reports...</p>
        </div>
      </div>
    );
  }
  return (
    <div className="space-y-6">
      {/* Error Banner */}
      {!!hasError && (
        <Card className="bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <ExclamationTriangleIcon className="w-5 h-5 text-red-600 dark:text-red-400" />
              <div>
                <p className="text-sm font-medium text-red-800 dark:text-red-300">
                  Some data failed to load. Please refresh the page or try again later.
                </p>
              </div>
              <Button
                onClick={handleRefresh}
                variant="secondary"
                size="sm"
                className="ml-auto"
              >
                Retry
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">Reports & Analytics</h1>
          <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mt-1">
            Comprehensive insights into your restaurant performance
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:gap-3 w-full sm:w-auto">
          <Select
            options={[
              { value: 'day', label: 'Today' },
              { value: 'week', label: 'Last 7 Days' },
              { value: 'month', label: 'Last 30 Days' },
              { value: 'year', label: 'Last Year' },
            ]}
            value={selectedPeriod}
            onChange={(value) => setSelectedPeriod(value as typeof selectedPeriod)}
            className="w-full sm:w-auto"
          />
          <Button
            onClick={handleRefresh}
            variant="secondary"
            disabled={isLoading}
            className="w-full sm:w-auto text-sm sm:text-base"
          >
            <ArrowPathIcon className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button
            onClick={() => handleExport(activeReport === 'sales' ? 'sales' : 'sales', 'pdf')}
            variant="secondary"
            disabled={isExporting || isLoading}
            className="w-full sm:w-auto text-sm sm:text-base"
          >
            <ChartBarIcon className="w-4 h-4 mr-2" />
            <span className="hidden sm:inline">{isExporting ? 'Exporting...' : 'Export Report'}</span>
            <span className="sm:hidden">{isExporting ? 'Exporting...' : 'Export'}</span>
          </Button>
        </div>
      </div>
      {/* Report Type Selection */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
        <Card 
          className={`cursor-pointer transition-all ${activeReport === 'financial' ? 'ring-2 ring-primary-600 bg-primary-50 dark:bg-primary-900/20' : 'hover:bg-gray-50 dark:hover:bg-gray-800'}`}
          onClick={() => setActiveReport('financial')}
        >
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center gap-3 sm:gap-4">
              <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-lg flex items-center justify-center flex-shrink-0 ${activeReport === 'financial' ? 'bg-primary-600' : 'bg-gray-200 dark:bg-gray-700'}`}>
                <ChartBarIcon className={`w-5 h-5 sm:w-6 sm:h-6 ${activeReport === 'financial' ? 'text-white' : 'text-gray-600 dark:text-gray-400'}`} />
              </div>
              <div className="min-w-0">
                <h3 className={`text-sm sm:text-base font-semibold ${activeReport === 'financial' ? 'text-primary-600 dark:text-primary-400' : 'text-gray-900 dark:text-white'}`}>
                  Financial Summary
                </h3>
                <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">
                  Net, sales, expenses
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card 
          className={`cursor-pointer transition-all ${activeReport === 'sales' ? 'ring-2 ring-primary-600 bg-primary-50 dark:bg-primary-900/20' : 'hover:bg-gray-50 dark:hover:bg-gray-800'}`}
          onClick={() => setActiveReport('sales')}
        >
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center gap-3 sm:gap-4">
              <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-lg flex items-center justify-center flex-shrink-0 ${activeReport === 'sales' ? 'bg-primary-600' : 'bg-gray-200 dark:bg-gray-700'}`}>
                <CurrencyDollarIcon className={`w-5 h-5 sm:w-6 sm:h-6 ${activeReport === 'sales' ? 'text-white' : 'text-gray-600 dark:text-gray-400'}`} />
              </div>
              <div className="min-w-0">
                <h3 className={`text-sm sm:text-base font-semibold ${activeReport === 'sales' ? 'text-primary-600 dark:text-primary-400' : 'text-gray-900 dark:text-white'}`}>
                  Sales Report
                </h3>
                <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">
                  Revenue & orders
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card 
          className={`cursor-pointer transition-all ${activeReport === 'wastage' ? 'ring-2 ring-primary-600 bg-primary-50 dark:bg-primary-900/20' : 'hover:bg-gray-50 dark:hover:bg-gray-800'}`}
          onClick={() => setActiveReport('wastage')}
        >
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center gap-3 sm:gap-4">
              <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-lg flex items-center justify-center flex-shrink-0 ${activeReport === 'wastage' ? 'bg-primary-600' : 'bg-gray-200 dark:bg-gray-700'}`}>
                <TrashIcon className={`w-5 h-5 sm:w-6 sm:h-6 ${activeReport === 'wastage' ? 'text-white' : 'text-gray-600 dark:text-gray-400'}`} />
              </div>
              <div className="min-w-0">
                <h3 className={`text-sm sm:text-base font-semibold ${activeReport === 'wastage' ? 'text-primary-600 dark:text-primary-400' : 'text-gray-900 dark:text-white'}`}>
                  Wastage Report
                </h3>
                <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">
                  Inventory losses
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card 
          className={`cursor-pointer transition-all ${activeReport === 'food' ? 'ring-2 ring-primary-600 bg-primary-50 dark:bg-primary-900/20' : 'hover:bg-gray-50 dark:hover:bg-gray-800'}`}
          onClick={() => setActiveReport('food')}
        >
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center gap-3 sm:gap-4">
              <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-lg flex items-center justify-center flex-shrink-0 ${activeReport === 'food' ? 'bg-primary-600' : 'bg-gray-200 dark:bg-gray-700'}`}>
                <CakeIcon className={`w-5 h-5 sm:w-6 sm:h-6 ${activeReport === 'food' ? 'text-white' : 'text-gray-600 dark:text-gray-400'}`} />
              </div>
              <div className="min-w-0">
                <h3 className={`text-sm sm:text-base font-semibold ${activeReport === 'food' ? 'text-primary-600 dark:text-primary-400' : 'text-gray-900 dark:text-white'}`}>
                  Food Report
                </h3>
                <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">
                  Menu performance
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card 
          className={`cursor-pointer transition-all ${activeReport === 'settlement' ? 'ring-2 ring-primary-600 bg-primary-50 dark:bg-primary-900/20' : 'hover:bg-gray-50 dark:hover:bg-gray-800'}`}
          onClick={() => setActiveReport('settlement')}
        >
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center gap-3 sm:gap-4">
              <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-lg flex items-center justify-center flex-shrink-0 ${activeReport === 'settlement' ? 'bg-primary-600' : 'bg-gray-200 dark:bg-gray-700'}`}>
                <ArrowPathIcon className={`w-5 h-5 sm:w-6 sm:h-6 ${activeReport === 'settlement' ? 'text-white' : 'text-gray-600 dark:text-gray-400'}`} />
              </div>
              <div className="min-w-0">
                <h3 className={`text-sm sm:text-base font-semibold ${activeReport === 'settlement' ? 'text-primary-600 dark:text-primary-400' : 'text-gray-900 dark:text-white'}`}>
                  Due Settlement
                </h3>
                <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">
                  Pending payments
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      {activeReport === 'financial' && (
        <>
          {/* Financial Summary (Sales vs Expenses vs Purchases) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {financialCards.map((card) => (
              <Card key={card.title} className="border border-gray-200 dark:border-gray-800">
                <CardContent className="p-4 sm:p-5">
                  <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 truncate">{card.title}</p>
                  <p className={`text-lg sm:text-xl md:text-2xl font-bold ${card.color} truncate`} title={card.value}>{card.value}</p>
                </CardContent>
              </Card>
            ))}
          </div>
          <Card className="border border-gray-200 dark:border-gray-800">
            <CardHeader>
              <CardTitle>Net Profit / Loss vs Sales, Expenses, Purchases</CardTitle>
            </CardHeader>
            <CardContent className="h-80">
              {isLoadingFinancialSummary ? (
                <div className="flex items-center justify-center h-full">
                  <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-primary-600"></div>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={financialChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="label" />
                    <YAxis />
                    <Tooltip 
                      formatter={(value: any) => formatTooltipCurrency(value)}
                      contentStyle={{
                        backgroundColor: 'rgba(255, 255, 255, 0.95)',
                        border: '1px solid #e5e7eb',
                        borderRadius: '8px',
                      }}
                    />
                    <Line type="monotone" dataKey="sales" name="Sales" stroke="#10b981" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="expenses" name="Expenses" stroke="#ef4444" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="purchases" name="Purchases" stroke="#3b82f6" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="net" name="Net" stroke="#8b5cf6" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </>
      )}
      {/* Report Content Based on Selection */}
      {/* Report Content Based on Selection */}
      {activeReport === 'sales' && (
        <>
          {/* Key Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
        <Card>
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0 flex-1">
                <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 truncate">Total Revenue</p>
                <p className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold text-green-600 truncate" title={formatCurrency(salesAnalytics?.totalSales ?? 0)}>
                  {formatCurrency(salesAnalytics?.totalSales ?? 0)}
                </p>
                <div className="mt-2">
                  <TrendIndicator value={trends.revenueChange} />
                </div>
                <p className="text-xs text-gray-500 mt-1">Completed orders only</p>
              </div>
              <CurrencyDollarIcon className="w-6 h-6 sm:w-8 sm:h-8 text-green-600 flex-shrink-0" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0 flex-1">
                <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 truncate">Completed Orders</p>
                <p className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold text-blue-600 truncate" title={(salesAnalytics?.totalOrders ?? 0).toString()}>
                  {(salesAnalytics?.totalOrders ?? 0).toLocaleString()}
                </p>
                <div className="mt-2">
                  <TrendIndicator value={trends.ordersChange} />
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  {selectedPeriod === 'day' && salesAnalytics?.totalOrders 
                    ? `${salesAnalytics.totalOrders} orders in selected period` 
                    : salesAnalytics?.totalOrders 
                    ? `${salesAnalytics.totalOrders} total orders` 
                    : ''}
                </p>
              </div>
              <ShoppingCartIcon className="w-6 h-6 sm:w-8 sm:h-8 text-blue-600 flex-shrink-0" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0 flex-1">
                <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 truncate">Avg Order Value</p>
                <p className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold text-purple-600 truncate" title={formatCurrency((() => {
                    const totalSales = salesAnalytics?.totalSales || 0;
                    const totalOrders = salesAnalytics?.totalOrders || 0;
                    // Calculate if averageOrderValue is 0 or not provided
                    if (salesAnalytics?.averageOrderValue && salesAnalytics.averageOrderValue > 0) {
                      return salesAnalytics.averageOrderValue;
                    }
                    return totalOrders > 0 ? totalSales / totalOrders : 0;
                  })())}>
                  {formatCurrency((() => {
                    const totalSales = salesAnalytics?.totalSales || 0;
                    const totalOrders = salesAnalytics?.totalOrders || 0;
                    // Calculate if averageOrderValue is 0 or not provided
                    if (salesAnalytics?.averageOrderValue && salesAnalytics.averageOrderValue > 0) {
                      return salesAnalytics.averageOrderValue;
                    }
                    return totalOrders > 0 ? totalSales / totalOrders : 0;
                  })())}
                </p>
                <div className="mt-2">
                  <TrendIndicator value={trends.avgOrderValueChange} />
                </div>
              </div>
              <ChartBarIcon className="w-6 h-6 sm:w-8 sm:h-8 text-purple-600 flex-shrink-0" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0 flex-1">
                <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 truncate">Peak Hours</p>
                <p className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold text-orange-600 truncate" title={peakHours.text}>{peakHours.text}</p>
                <div className="flex items-center gap-1 mt-2">
                  <ClockIcon className="w-4 h-4 text-orange-600" />
                  <span className="text-xs sm:text-sm text-gray-500">
                    {peakHours.orders} {peakHours.isAverage ? 'orders avg' : 'orders'}
                  </span>
                </div>
              </div>
              <ClockIcon className="w-6 h-6 sm:w-8 sm:h-8 text-orange-600 flex-shrink-0" />
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
                    formatter={(value: any) => formatTooltipCurrency(value)}
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
            {isLoadingCategory ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary-600 mx-auto mb-2"></div>
                <p className="text-gray-500 dark:text-gray-400">Loading category data...</p>
              </div>
            ) : categoryData.length === 0 ? (
              <div className="text-center py-12">
                <CakeIcon className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                <p className="text-gray-500 dark:text-gray-400">No category data available</p>
                <p className="text-sm text-gray-400 mt-1">Complete some orders to see category breakdown</p>
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
                  <Tooltip 
                    formatter={(value: any, name: string, props: any) => {
                      // For pie charts, value is percentage, but we want to show sales amount
                      if (props.payload && props.payload.sales !== undefined) {
                        return [formatTooltipCurrency(props.payload.sales), name || 'Sales'];
                      }
                      return [formatTooltipCurrency(value), name || 'Value'];
                    }}
                  />
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
            {isLoadingPeakHours ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary-600 mx-auto mb-2"></div>
                <p className="text-gray-500 dark:text-gray-400">Loading hourly data...</p>
              </div>
            ) : hourlyData.length === 0 ? (
              <div className="text-center py-12">
                <ClockIcon className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                <p className="text-gray-500 dark:text-gray-400">No hourly data available</p>
                <p className="text-sm text-gray-400 mt-1">Complete some orders to see peak hours</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={hourlyData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200 dark:stroke-gray-700" />
                  <XAxis dataKey="hour" className="text-sm" />
                  <YAxis className="text-sm" />
                  <Tooltip
                    formatter={(value: any) => {
                      // For orders, just show the number
                      if (typeof value === 'number') {
                        return value.toLocaleString();
                      }
                      return value;
                    }}
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
            {isLoadingTopItems ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary-600 mx-auto mb-2"></div>
                <p className="text-gray-500 dark:text-gray-400">Loading top items...</p>
              </div>
            ) : topItems.length === 0 ? (
              <div className="text-center py-8">
                <ShoppingCartIcon className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                <p className="text-gray-500 dark:text-gray-400">No top selling items data available</p>
                <p className="text-sm text-gray-400 mt-1">Complete some orders to see top sellers</p>
              </div>
            ) : (
              <div className="space-y-4">
                {topItems.map((item: any) => (
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
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4 lg:gap-6">
        <Card>
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0 flex-1">
                <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 truncate">Active Orders</p>
                <p className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold text-green-600 truncate" title={(dashboardData?.active?.orders || 0).toString()}>
                  {(dashboardData?.active?.orders || 0).toLocaleString()}
                </p>
                <p className="text-xs sm:text-sm text-gray-500 mt-1">Currently processing</p>
              </div>
              <ShoppingCartIcon className="w-6 h-6 sm:w-8 sm:h-8 text-green-600 flex-shrink-0" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0 flex-1">
                <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 truncate">Total Customers</p>
                <p className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold text-blue-600 truncate" title={(dashboardData?.customers?.total || 0).toString()}>
                  {(dashboardData?.customers?.total || 0).toLocaleString()}
                </p>
                <p className="text-xs sm:text-sm text-gray-500 mt-1">
                  {dashboardData?.customers?.active || 0} active
                </p>
              </div>
              <UsersIcon className="w-6 h-6 sm:w-8 sm:h-8 text-blue-600 flex-shrink-0" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0 flex-1">
                <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 truncate">Inventory Alerts</p>
                <p className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold text-purple-600 truncate" title={((dashboardData?.inventory?.lowStock || 0) + (dashboardData?.inventory?.outOfStock || 0)).toString()}>
                  {((dashboardData?.inventory?.lowStock || 0) + (dashboardData?.inventory?.outOfStock || 0)).toLocaleString()}
                </p>
                <p className="text-xs sm:text-sm text-gray-500 mt-1">
                  {dashboardData?.inventory?.lowStock || 0} low, {dashboardData?.inventory?.outOfStock || 0} out
                </p>
              </div>
              <ChartBarIcon className="w-6 h-6 sm:w-8 sm:h-8 text-purple-600 flex-shrink-0" />
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
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
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
        </>
      )}
      {activeReport === 'wastage' && (
        <div className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
            <Card>
              <CardContent className="p-3 sm:p-4 lg:p-6">
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 truncate">Total Wastage</p>
                    <p className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold text-red-600 truncate" title={(isLoadingWastage ? '...' : wastageReport?.summary?.totalWastageCount || 0).toString()}>
                      {isLoadingWastage ? '...' : (wastageReport?.summary?.totalWastageCount || 0).toLocaleString()}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">Items wasted</p>
                  </div>
                  <TrashIcon className="w-6 h-6 sm:w-8 sm:h-8 lg:w-12 lg:h-12 text-red-200 dark:text-red-900 flex-shrink-0" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3 sm:p-4 lg:p-6">
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 truncate">Total Quantity</p>
                    <p className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold text-orange-600 truncate" title={(isLoadingWastage ? '...' : wastageReport?.summary?.totalQuantity?.toFixed(2) || '0.00').toString()}>
                      {isLoadingWastage ? '...' : wastageReport?.summary?.totalQuantity?.toFixed(2) || '0.00'}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">Units wasted</p>
                  </div>
                  <ExclamationTriangleIcon className="w-6 h-6 sm:w-8 sm:h-8 lg:w-12 lg:h-12 text-orange-200 dark:text-orange-900 flex-shrink-0" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3 sm:p-4 lg:p-6">
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 truncate">Wastage Value</p>
                    <p className="text-sm sm:text-base md:text-lg lg:text-2xl font-bold text-purple-600 truncate" title={isLoadingWastage ? '...' : formatCurrency(wastageReport?.summary?.totalCost || 0)}>
                      {isLoadingWastage ? '...' : formatCurrency(wastageReport?.summary?.totalCost || 0)}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">Total loss</p>
                  </div>
                  <CurrencyDollarIcon className="w-6 h-6 sm:w-8 sm:h-8 lg:w-12 lg:h-12 text-purple-200 dark:text-purple-900 flex-shrink-0" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3 sm:p-4 lg:p-6">
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 truncate">Avg Wastage Cost</p>
                    <p className="text-sm sm:text-base md:text-lg lg:text-2xl font-bold text-blue-600 truncate" title={isLoadingWastage ? '...' : formatCurrency(wastageReport?.summary?.avgWastageCost || 0)}>
                      {isLoadingWastage ? '...' : formatCurrency(wastageReport?.summary?.avgWastageCost || 0)}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">Per incident</p>
                  </div>
                  <ChartBarIcon className="w-6 h-6 sm:w-8 sm:h-8 lg:w-12 lg:h-12 text-blue-200 dark:text-blue-900 flex-shrink-0" />
                </div>
              </CardContent>
            </Card>
          </div>
          {isLoadingWastage ? (
            <Card>
              <CardContent className="p-12 text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600 mx-auto mb-4"></div>
                <p className="text-gray-600 dark:text-gray-400">Loading wastage data...</p>
              </CardContent>
            </Card>
          ) : wastageError ? (
            <Card>
              <CardContent className="p-12 text-center">
                <ExclamationTriangleIcon className="w-16 h-16 text-red-400 mx-auto mb-4" />
                <p className="text-red-600 dark:text-red-400">Error loading wastage data</p>
                <Button onClick={() => refetchWastage()} className="mt-4">Retry</Button>
              </CardContent>
            </Card>
          ) : !wastageReport || wastageReport.summary.totalWastageCount === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <TrashIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No Wastage Data</h3>
                <p className="text-gray-600 dark:text-gray-400 mb-6">
                  No wastage records found for the selected period. Start tracking wastage to see reports here.
                </p>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Wastage by Reason */}
              {wastageReport.byReason && wastageReport.byReason.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Wastage by Reason</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={wastageReport.byReason}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis 
                          dataKey="reason" 
                          tick={{ fontSize: 12 }}
                          angle={-45}
                          textAnchor="end"
                          height={80}
                        />
                        <YAxis />
                        <Tooltip 
                          formatter={(value: any) => formatTooltipCurrency(value)}
                          contentStyle={{ backgroundColor: 'rgba(255, 255, 255, 0.95)' }}
                        />
                        <Bar dataKey="totalCost" fill="#ef4444" radius={[8, 8, 0, 0]}>
                          {wastageReport.byReason.map((entry: any, index: number) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length] || '#ef4444'} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                    <div className="mt-4 space-y-2">
                      {wastageReport.byReason.map((item: any, index: number) => (
                        <div key={index} className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-800 rounded">
                          <div className="flex items-center gap-2">
                            <div 
                              className="w-4 h-4 rounded" 
                              style={{ backgroundColor: COLORS[index % COLORS.length] || '#ef4444' }}
                            />
                            <span className="font-medium capitalize">{item.reason.replace('_', ' ')}</span>
                          </div>
                          <div className="text-right">
                            <p className="font-semibold">{formatCurrency(item.totalCost)}</p>
                            <p className="text-xs text-gray-500">{item.totalQuantity.toFixed(2)} units ({item.count} incidents)</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
              {/* Top Wasted Ingredients */}
              {wastageReport.byIngredient && wastageReport.byIngredient.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Top Wasted Ingredients</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {wastageReport.byIngredient.slice(0, 10).map((item: any, index: number) => (
                        <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900 flex items-center justify-center">
                              <span className="text-red-600 dark:text-red-400 font-bold">{index + 1}</span>
                            </div>
                            <div>
                              <p className="font-semibold">{item.ingredientName || 'Unknown'}</p>
                              <p className="text-sm text-gray-500">{item.totalQuantity.toFixed(2)} {item.ingredientUnit || 'units'}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-red-600">{formatCurrency(item.totalCost)}</p>
                            <p className="text-xs text-gray-500">{item.count} incidents</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
              {/* Daily Wastage Trend */}
              {wastageReport.dailyTrend && wastageReport.dailyTrend.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Daily Wastage Trend</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <LineChart data={wastageReport.dailyTrend}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" />
                        <YAxis />
                        <Tooltip 
                          formatter={(value: any) => formatTooltipCurrency(value)}
                          contentStyle={{ backgroundColor: 'rgba(255, 255, 255, 0.95)' }}
                        />
                        <Line 
                          type="monotone" 
                          dataKey="totalCost" 
                          stroke="#ef4444" 
                          strokeWidth={2}
                          dot={{ fill: '#ef4444', r: 4 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </div>
      )}
      {activeReport === 'food' && (
        <Card>
          <CardHeader>
            <CardTitle>Food Report</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4 lg:gap-6">
                <Card>
                  <CardContent className="p-4 sm:p-6">
                    <div className="min-w-0">
                      <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 truncate">Menu Items</p>
                      <p className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold text-blue-600 truncate" title={(topItems.length || 0).toString()}>
                        {(topItems.length || 0).toLocaleString()}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">Total items</p>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 sm:p-6">
                    <div className="min-w-0">
                      <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 truncate">Top Seller</p>
                      <p className="text-base sm:text-lg md:text-xl font-bold text-green-600 truncate" title={mostPopularItem?.name || 'N/A'}>
                        {mostPopularItem?.name || 'N/A'}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        {mostPopularItem?.orders || 0} orders
                      </p>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 sm:p-6">
                    <div className="min-w-0">
                      <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 truncate">Food Revenue</p>
                      <p className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold text-purple-600 truncate" title={formatCurrency(salesAnalytics?.totalSales || 0)}>
                        {formatCurrency(salesAnalytics?.totalSales || 0)}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">Total sales</p>
                    </div>
                  </CardContent>
                </Card>
              </div>
              {/* Top Selling Items */}
              {topItems.length > 0 && (
                <div>
                  <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Top Selling Items</h4>
                  <div className="space-y-3">
                    {topItems.map((item: any) => (
                      <div key={item.name} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
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
                              {item.orders} orders • Avg: {formatCurrency(item.avgRevenue)}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-gray-900 dark:text-white">
                            {formatCurrency(item.revenue)}
                          </p>
                          <p className="text-sm text-gray-600 dark:text-gray-400">Revenue</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {/* Sales by Category */}
              {categoryData.length > 0 && (
                <div>
                  <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Sales by Category</h4>
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
                      <Tooltip 
                        formatter={(value: any, name: string, props: any) => {
                          // For pie charts, value is percentage, but we want to show sales amount
                          if (props.payload && props.payload.sales !== undefined) {
                            return [formatTooltipCurrency(props.payload.sales), name || 'Sales'];
                          }
                          return [formatTooltipCurrency(value), name || 'Value'];
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
      {activeReport === 'settlement' && (
        <Card>
          <CardHeader>
            <CardTitle>Due Settlement</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoadingSettlements ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary-600 mx-auto mb-2"></div>
                <p className="text-gray-500 dark:text-gray-400">Loading settlement data...</p>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4 lg:gap-6">
                  <Card>
                    <CardContent className="p-4 sm:p-6">
                      <div className="min-w-0">
                        <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 truncate">Pending Settlements</p>
                        <p className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold text-orange-600 truncate" title={(dueSettlementsData?.pendingSettlements || 0).toString()}>
                          {(dueSettlementsData?.pendingSettlements || 0).toLocaleString()}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">Unpaid orders</p>
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4 sm:p-6">
                      <div className="min-w-0">
                        <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 truncate">Total Due Amount</p>
                        <p className="text-sm sm:text-base md:text-lg lg:text-2xl font-bold text-red-600 truncate" title={formatCurrency(dueSettlementsData?.totalDueAmount || 0)}>
                          {formatCurrency(dueSettlementsData?.totalDueAmount || 0)}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">Outstanding</p>
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4 sm:p-6">
                      <div className="min-w-0">
                        <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 truncate">Settled Today</p>
                        <p className="text-sm sm:text-base md:text-lg lg:text-2xl font-bold text-green-600 truncate" title={formatCurrency(dueSettlementsData?.settledTodayAmount || 0)}>
                          {formatCurrency(dueSettlementsData?.settledTodayAmount || 0)}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          {dueSettlementsData?.settledToday || 0} orders paid today
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </div>
                {dueSettlementsData?.pendingSettlements === 0 ? (
                  <div className="text-center py-8">
                    <ArrowPathIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No Pending Settlements</h3>
                    <p className="text-gray-600 dark:text-gray-400">
                      All orders have been settled. Check back later for new pending payments.
                    </p>
                  </div>
                ) : (
                  <div>
                    <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                      Pending Orders ({dueSettlementsData?.pendingOrders?.length || 0})
                    </h4>
                    <div className="space-y-3">
                      {dueSettlementsData?.pendingOrders?.map((order: any) => (
                        <div
                          key={order.id}
                          className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700"
                        >
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 bg-orange-100 dark:bg-orange-900/30 rounded-full flex items-center justify-center">
                              <ShoppingCartIcon className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                            </div>
                            <div>
                              <p className="font-medium text-gray-900 dark:text-white">
                                Order #{order.orderNumber}
                              </p>
                              <p className="text-sm text-gray-600 dark:text-gray-400">
                                {order.orderType} • {new Date(order.createdAt).toLocaleDateString()}
                                {order.customerInfo?.name && ` • ${order.customerInfo.name}`}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-semibold text-gray-900 dark:text-white">
                              {formatCurrency(order.totalAmount)}
                            </p>
                            <p className="text-sm text-gray-500 dark:text-gray-400">Pending</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
                  <p className="text-sm text-blue-800 dark:text-blue-400">
                    <strong>Note:</strong> Due settlements track orders that have been completed but payment is still pending or needs to be reconciled.
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
