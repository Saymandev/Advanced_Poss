'use client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { useGetPOSOrdersQuery, useGetPOSStatsQuery } from '@/lib/api/endpoints/posApi';
import { useGetReviewsQuery } from '@/lib/api/endpoints/reviewsApi';
import { useGetStaffQuery } from '@/lib/api/endpoints/staffApi';
import { useAppSelector } from '@/lib/store';
import { formatCurrency } from '@/lib/utils';
import {
  CurrencyDollarIcon,
  ShoppingBagIcon,
} from '@heroicons/react/24/outline';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
type QuickRange = 'today' | 'yesterday' | 'thisWeek' | 'thisMonth' | 'lastMonth' | 'lifetime';
const formatDateInput = (date: Date) => {
  // Use local date methods for consistent formatting
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};
const computeDateRange = (range: QuickRange): { start: string; end: string } => {
  // Always get today's date fresh
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  switch (range) {
    case 'today':
      return { start: formatDateInput(today), end: formatDateInput(endDate) };
    case 'yesterday': {
      const start = new Date(today);
      start.setDate(start.getDate() - 1);
      return { start: formatDateInput(start), end: formatDateInput(start) };
    }
    case 'thisWeek': {
      const start = new Date(today);
      start.setDate(start.getDate() - 6);
      return { start: formatDateInput(start), end: formatDateInput(endDate) };
    }
    case 'thisMonth': {
      const start = new Date(today.getFullYear(), today.getMonth(), 1);
      return { start: formatDateInput(start), end: formatDateInput(endDate) };
    }
    case 'lastMonth': {
      const start = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      const lastMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0);
      return { start: formatDateInput(start), end: formatDateInput(lastMonthEnd) };
    }
    case 'lifetime':
    default:
      return { start: '2020-01-01', end: formatDateInput(endDate) };
  }
};
const QUICK_RANGE_OPTIONS: Array<{ label: string; value: QuickRange }> = [
  { label: 'Today', value: 'today' },
  { label: 'Yesterday', value: 'yesterday' },
  { label: 'This Week', value: 'thisWeek' },
  { label: 'This Month', value: 'thisMonth' },
  { label: 'Last Month', value: 'lastMonth' },
  { label: 'Lifetime', value: 'lifetime' },
];
export default function DashboardPage() {
  const { user } = useAppSelector((state) => state.auth);
  const router = useRouter();
  // Default to 'lifetime' to show all past data
  const [quickRange, setQuickRange] = useState<QuickRange>('lifetime');
  const [dateRange, setDateRange] = useState(() => {
    // Ensure we always calculate with current date
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayStr = formatDateInput(today);
    return {
      start: '2020-01-01',
      end: todayStr, // Always use today's date
    };
  });
  const [isRouting, setIsRouting] = useState(true);
  // Route users to their appropriate dashboards
  useEffect(() => {
    if (!user?.role) {
      setIsRouting(false);
      return;
    }
    const userRole = user.role.toLowerCase();
    // Super admin still uses dedicated dashboard
    if (userRole === 'super_admin') {
      router.replace('/dashboard/super-admin');
      return;
    }
    // Managers should use the same main dashboard as owner and other roles
    // So we do NOT redirect managers away from this page anymore.
    // Owner and other roles stay here - show owner/manager dashboard
    setIsRouting(false);
  }, [user?.role, router]);
  const branchId = user?.branchId;
  const { companyContext } = useAppSelector((state) => state.auth);
  const companyId = user?.companyId || companyContext?.companyId;
  // Get today's date - always fresh
  const todayStr = useMemo(() => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    return formatDateInput(today);
  }, []);
  // Ensure dateRange is always valid before making queries
  const validDateRange = useMemo(() => {
    // Recalculate based on quick range
    const computed = computeDateRange(quickRange);
    // CRITICAL: Force end date to never exceed today
    if (computed.end > todayStr) {
      computed.end = todayStr;
    }
    // Update state if it's different
    if (dateRange.start !== computed.start || dateRange.end !== computed.end) {
      setDateRange(computed);
    }
    return computed;
  }, [dateRange, quickRange, todayStr]);
  // Force end date to always be today (never future) for API calls
  const safeDateRange = useMemo(() => {
    // Ensure end date is never in the future
    let endDate = validDateRange.end;
    if (endDate > todayStr) {
      endDate = todayStr;
    }
    return {
      start: validDateRange.start,
      end: endDate,
    };
  }, [validDateRange, todayStr]);
  const statsParams = useMemo(() => ({
    branchId: branchId || undefined,
    startDate: safeDateRange.start,
    endDate: safeDateRange.end,
  }), [branchId, safeDateRange.start, safeDateRange.end]);
  const { data: statsData, isLoading: statsLoading, error: statsError } = useGetPOSStatsQuery(
    statsParams,
    { skip: !validDateRange.start || !validDateRange.end }
  );
  // Debug: Log query params
  useEffect(() => {
    if (statsError) {
      console.error('Dashboard stats error:', statsError);
    }
  }, [statsParams, validDateRange, branchId, statsLoading, statsData, statsError]);
  const { data: ordersData, isLoading: ordersLoading, error: ordersError } = useGetPOSOrdersQuery(
    {
      branchId: branchId || undefined,
      startDate: safeDateRange.start,
      endDate: safeDateRange.end,
      page: 1,
      limit: 10000, // Get all orders for breakdown calculations
      // Don't filter by status - get all orders (pending, paid, cancelled)
    },
    { skip: !safeDateRange.start || !safeDateRange.end }
  );
  // Debug: Log orders query
  useEffect(() => {
    if (ordersError) {
      console.error('Dashboard orders error:', ordersError);
      console.error('Error details:', ordersError);
    }
    // Debug logging removed
  }, [ordersLoading, ordersData, ordersError, validDateRange, safeDateRange, branchId]);
  // Get reviews for waiter ratings
  const { data: reviewsData, error: reviewsError } = useGetReviewsQuery(
    { branchId: branchId || undefined, companyId: companyId || undefined },
    { skip: !branchId && !companyId }
  );
  // Debug: Log reviews data
  useEffect(() => {
    if (reviewsData) {
      // Debug logging removed
      if (Array.isArray(reviewsData) && reviewsData.length > 0) {
        // Debug logging removed
      }
    }
    if (reviewsError) {
      console.error('❌ Reviews Error:', reviewsError);
    }
  }, [reviewsData, reviewsError]);
  // Get staff/waiter data - filter by both company and branch
  const { data: staffData } = useGetStaffQuery(
    {
      companyId: companyId || undefined,
      branchId: branchId || undefined,
      limit: 100,
    },
    { skip: !companyId }
  );
  const stats = useMemo(() => {
    if (statsLoading || !statsData) {
      return {
        totalOrders: 0,
        totalRevenue: 0,
        averageOrderValue: 0,
        ordersToday: 0,
        revenueToday: 0,
        topSellingItems: [],
      };
    }
    const extracted = (statsData as any) || {};
    return {
      totalOrders: extracted?.totalOrders ?? 0,
      totalRevenue: extracted?.totalRevenue ?? 0,
      averageOrderValue: extracted?.averageOrderValue ?? 0,
      ordersToday: extracted?.ordersToday ?? 0,
      revenueToday: extracted?.revenueToday ?? 0,
      topSellingItems: Array.isArray(extracted?.topSellingItems) ? extracted.topSellingItems : [],
    };
  }, [statsData, statsLoading]);
  // Transform orders to ensure proper structure
  const orders = useMemo(() => {
    const ordersArray = (ordersData as any)?.orders || [];
    // Transform orders to ensure all required fields are present
    const transformed = ordersArray.map((order: any) => {
      // Payment method can be in multiple places:
      // 1. order.paymentMethod (direct field)
      // 2. order.payment_method (snake_case)
      // 3. order.paymentId?.method (from populated POSPayment)
      // 4. order.payment?.method (alternative structure)
      let paymentMethod = order.paymentMethod || order.payment_method;
      if (!paymentMethod && order.paymentId) {
        // If paymentId is populated, get method from it
        if (typeof order.paymentId === 'object' && order.paymentId.method) {
          paymentMethod = order.paymentId.method;
        } else if (typeof order.paymentId === 'string') {
          // If it's just an ID, we can't get the method without another query
          // But we'll try to get it from payment object if available
          paymentMethod = order.payment?.method;
        }
      }
      if (!paymentMethod && order.payment) {
        paymentMethod = order.payment.method || order.payment.method;
      }
      return {
        id: order._id || order.id,
        orderNumber: order.orderNumber || order.order_number || 'N/A',
        orderType: order.orderType || order.order_type || 'unknown',
        status: order.status || 'pending',
        paymentMethod: paymentMethod || 'unknown',
        totalAmount: order.totalAmount || order.total_amount || order.total || 0,
        createdAt: order.createdAt || order.created_at || order.date || new Date().toISOString(),
        items: order.items || [],
        customerInfo: order.customerInfo || order.customer_info,
      };
    });
    return transformed;
  }, [ordersData]);
  // Breakdown by Type (Order Type)
  const breakdownByType = useMemo(() => {
    if (!Array.isArray(orders) || orders.length === 0) {
      return [];
    }
    const breakdown: Record<string, { orders: number; amount: number }> = {};
    orders.forEach((order: any) => {
      const type = order.orderType || order.order_type || 'unknown';
      if (!breakdown[type]) {
        breakdown[type] = { orders: 0, amount: 0 };
      }
      breakdown[type].orders += 1;
      const amount = order.totalAmount || order.total_amount || order.total || 0;
      if (order.status === 'paid' && amount > 0) {
        breakdown[type].amount += amount;
      }
    });
    return Object.entries(breakdown)
      .filter(([, data]) => data.orders > 0) // Only show types with orders
      .map(([type, data]) => ({
        type: type.charAt(0).toUpperCase() + type.slice(1).replace('-', ' '),
        orders: data.orders,
        amount: data.amount,
      }));
  }, [orders]);
  // Payment method name mapping for better display
  const getPaymentMethodDisplayName = (method: string): string => {
    if (!method || method === 'unknown') return 'Unknown';
    const methodMap: Record<string, string> = {
      'cash': 'Cash',
      'card': 'Card',
      'bkash': 'bKash',
      'nagad': 'Nagad',
      'rocket': 'Rocket',
      'upay': 'Upay',
      'visa': 'Visa',
      'mastercard': 'Mastercard',
      'amex': 'American Express',
      'split': 'Split Payment',
      'bank_transfer': 'Bank Transfer',
      'mobile_wallet': 'Mobile Wallet',
      'due': 'Due',
      'complimentary': 'Complimentary',
    };
    return methodMap[method.toLowerCase()] || method.charAt(0).toUpperCase() + method.slice(1);
  };
  // Breakdown by Payment Methods
  const breakdownByPayment = useMemo(() => {
    if (!Array.isArray(orders) || orders.length === 0) {
      return [];
    }
    const breakdown: Record<string, { orders: number; amount: number }> = {};
    orders.forEach((order: any) => {
      const method = order.paymentMethod || order.payment_method || 'unknown';
      if (!breakdown[method]) {
        breakdown[method] = { orders: 0, amount: 0 };
      }
      breakdown[method].orders += 1;
      const amount = order.totalAmount || order.total_amount || order.total || 0;
      if (order.status === 'paid' && amount > 0) {
        breakdown[method].amount += amount;
      }
    });
    return Object.entries(breakdown)
      .filter(([, data]) => data.orders > 0) // Only show methods with orders
      .map(([method, data]) => ({
        method: getPaymentMethodDisplayName(method),
        orders: data.orders,
        amount: data.amount,
      }));
  }, [orders]);
  // Hourly sales data (1 AM to 11 PM)
  const hourlySales = useMemo(() => {
    const hourly: Record<number, { sales: number; orders: number }> = {};
    // Initialize all hours from 1 AM to 11 PM (1 to 23)
    for (let i = 1; i <= 23; i++) {
      hourly[i] = { sales: 0, orders: 0 };
    }
    orders.forEach((order: any) => {
      if (!order.createdAt || order.status !== 'paid') return;
      const createdAt = order.createdAt || order.created_at || order.date;
      if (!createdAt) return;
      try {
        const orderDate = new Date(createdAt);
        if (isNaN(orderDate.getTime())) return; // Invalid date
        const hour = orderDate.getHours();
        const amount = order.totalAmount || order.total_amount || order.total || 0;
        if (hour >= 1 && hour <= 23 && amount > 0) {
          hourly[hour].orders += 1;
          hourly[hour].sales += amount;
        }
      } catch (error) {
        console.warn('Error processing order date:', createdAt, error);
      }
    });
    // Format hours properly: 1 AM, 3 AM, ..., 11 AM, 12 PM, 1 PM, ..., 11 PM
    return Object.entries(hourly)
      .filter(([hour]) => parseInt(hour) >= 1 && parseInt(hour) <= 23)
      .map(([hourStr, data]) => {
        const hour = parseInt(hourStr);
        let displayHour = hour;
        let period = 'AM';
        if (hour === 0) {
          displayHour = 12;
          period = 'AM';
        } else if (hour === 12) {
          displayHour = 12;
          period = 'PM';
        } else if (hour > 12) {
          displayHour = hour - 12;
          period = 'PM';
        }
        return {
          hour: `${displayHour} ${period}`,
          hourNum: hour,
          sales: data.sales,
          orders: data.orders,
        };
      })
      .sort((a, b) => a.hourNum - b.hourNum);
  }, [orders]);
  // Top Waiters with Ratings
  const topWaiters = useMemo(() => {
    const waiters: Record<string, { name: string; ratings: number[]; totalOrders: number }> = {};
    // Get all waiters from staff data
    const staff = staffData?.staff || [];
    staff.forEach((member: any) => {
      if (member.role?.toLowerCase() === 'waiter') {
        // Normalize waiter ID to string for consistent matching
        const waiterId = (member.id || member._id?.toString() || member._id || '').toString();
        if (waiterId) {
          waiters[waiterId] = {
            name: `${member.firstName || ''} ${member.lastName || ''}`.trim() || member.email || 'Unknown Waiter',
            ratings: [],
            totalOrders: 0,
          };
        }
      }
    });
    // Count orders per waiter
    orders.forEach((order: any) => {
      // Normalize waiter ID from order
      const orderWaiterId = (order.waiterId || order.userId || '').toString();
      if (orderWaiterId && waiters[orderWaiterId]) {
        waiters[orderWaiterId].totalOrders += 1;
      }
    });
    // Add ratings from reviews
    // Handle both array and object response formats
    let reviews: any[] = [];
    if (reviewsData) {
      if (Array.isArray(reviewsData)) {
        reviews = reviewsData;
      } else if ((reviewsData as any).data && Array.isArray((reviewsData as any).data)) {
        reviews = (reviewsData as any).data;
      } else if ((reviewsData as any).reviews && Array.isArray((reviewsData as any).reviews)) {
        reviews = (reviewsData as any).reviews;
      }
    }
    reviews.forEach((review: any) => {
      if (review.waiterId && review.waiterRating) {
        // waiterId should already be normalized to string by transformResponse
        // But handle edge cases where it might still be an object
        let waiterId: string = '';
        if (typeof review.waiterId === 'string') {
          waiterId = review.waiterId;
        } else if (review.waiterId?._id) {
          waiterId = typeof review.waiterId._id === 'string' 
            ? review.waiterId._id 
            : review.waiterId._id.toString();
        } else if (review.waiterId?.id) {
          waiterId = typeof review.waiterId.id === 'string'
            ? review.waiterId.id
            : review.waiterId.id.toString();
        } else {
          // Skip if waiterId is "[object Object]" or invalid
          const idStr = String(review.waiterId);
          if (idStr && idStr !== '[object Object]' && idStr.length > 10) {
            waiterId = idStr;
          } else {
            console.warn('⚠️ Invalid waiterId in review:', review.waiterId, 'Review ID:', review.id);
            return; // Skip this review
          }
        }
        // Match waiter ID (exact match)
        if (waiterId && waiters[waiterId]) {
          waiters[waiterId].ratings.push(review.waiterRating);
        } else {
          // Try to find waiter by matching normalized format
          const normalizedWaiterId = waiterId.toLowerCase().trim();
          const matchingWaiterKey = Object.keys(waiters).find(key => 
            key.toLowerCase().trim() === normalizedWaiterId
          );
          if (matchingWaiterKey) {
            waiters[matchingWaiterKey].ratings.push(review.waiterRating);
          } else {
            console.warn('⚠️ Waiter not found for review waiterId:', waiterId, 'Available waiters:', Object.keys(waiters));
          }
        }
      }
    });
    // Calculate average ratings and sort
    return Object.entries(waiters)
      .map(([waiterId, data]) => ({
        waiterId,
        name: data.name || 'Unknown Waiter',
        rating: data.ratings.length > 0
          ? (data.ratings.reduce((sum, r) => sum + r, 0) / data.ratings.length).toFixed(1)
          : 'N/A',
        totalRatings: data.ratings.length,
        totalOrders: data.totalOrders,
      }))
      .sort((a, b) => {
        // Sort by rating first (if available), then by total orders
        if (a.rating !== 'N/A' && b.rating !== 'N/A') {
          return parseFloat(b.rating) - parseFloat(a.rating);
        }
        if (a.rating !== 'N/A') return -1;
        if (b.rating !== 'N/A') return 1;
        return b.totalOrders - a.totalOrders;
      })
      .slice(0, 5); // Top 5 waiters
  }, [reviewsData, orders, staffData]);
  const handleQuickRange = (range: QuickRange) => {
    setQuickRange(range);
    setDateRange(computeDateRange(range));
  };
  const handleDateChange = (field: 'start' | 'end', value: string) => {
    if (!value) return;
    setDateRange(prev => ({ ...prev, [field]: value }));
    setQuickRange('lifetime'); // Switch to lifetime when manually selecting dates
  };
  if (isRouting) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading dashboard...</p>
        </div>
      </div>
    );
  }
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Overview of your restaurant performance
          </p>
        </div>
      </div>
      {/* Date Filters */}
      <Card>
        <CardContent className="p-6 space-y-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Start Date
              </label>
              <Input
                type="date"
                value={dateRange.start}
                max={dateRange.end || undefined}
                onChange={(e) => handleDateChange('start', e.target.value)}
              />
            </div>
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                End Date
              </label>
              <Input
                type="date"
                value={dateRange.end}
                min={dateRange.start || undefined}
                onChange={(e) => handleDateChange('end', e.target.value)}
              />
            </div>
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Quick Range
              </label>
              <select
                value={quickRange}
                onChange={(e) => handleQuickRange(e.target.value as QuickRange)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              >
                {QUICK_RANGE_OPTIONS.map(({ label, value }) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </div>
          </div>
        </CardContent>
      </Card>
      {/* Breakdown Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Breakdown by Type */}
        <Card>
          <CardHeader>
            <CardTitle>Breakdown by Type</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700">
                    <th className="text-left py-3 px-4 font-semibold text-gray-900 dark:text-white">Type</th>
                    <th className="text-right py-3 px-4 font-semibold text-gray-900 dark:text-white">Orders</th>
                    <th className="text-right py-3 px-4 font-semibold text-gray-900 dark:text-white">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {breakdownByType.map((item, index) => (
                    <tr key={index} className="border-b border-gray-200 dark:border-gray-700">
                      <td className="py-3 px-4 text-gray-900 dark:text-white">{item.type}</td>
                      <td className="text-right py-3 px-4 text-gray-900 dark:text-white">{item.orders}</td>
                      <td className="text-right py-3 px-4 font-semibold text-gray-900 dark:text-white">{formatCurrency(item.amount)}</td>
                    </tr>
                  ))}
                  {breakdownByType.length === 0 && (
                    <tr>
                      <td colSpan={3} className="text-center py-8 text-gray-500 dark:text-gray-400">No data available</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
        {/* Breakdown by Payment Methods */}
        <Card>
          <CardHeader>
            <CardTitle>Breakdown by Payment Methods</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700">
                    <th className="text-left py-3 px-4 font-semibold text-gray-900 dark:text-white">Method</th>
                    <th className="text-right py-3 px-4 font-semibold text-gray-900 dark:text-white">Orders</th>
                    <th className="text-right py-3 px-4 font-semibold text-gray-900 dark:text-white">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {breakdownByPayment.map((item, index) => (
                    <tr key={index} className="border-b border-gray-200 dark:border-gray-700">
                      <td className="py-3 px-4 text-gray-900 dark:text-white">{item.method}</td>
                      <td className="text-right py-3 px-4 text-gray-900 dark:text-white">{item.orders}</td>
                      <td className="text-right py-3 px-4 font-semibold text-gray-900 dark:text-white">{formatCurrency(item.amount)}</td>
                    </tr>
                  ))}
                  {breakdownByPayment.length === 0 && (
                    <tr>
                      <td colSpan={3} className="text-center py-8 text-gray-500 dark:text-gray-400">No data available</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
      {/* Charts Row - Hourly Data */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Total Sales Chart - Hourly */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CurrencyDollarIcon className="h-5 w-5" />
              Total Sales
            </CardTitle>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Showing total sales for the provided data</p>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={hourlySales}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200 dark:stroke-gray-700" />
                <XAxis 
                  dataKey="hour" 
                  className="text-sm"
                  angle={-45}
                  textAnchor="end"
                  height={80}
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
                <Line type="monotone" dataKey="sales" stroke="#10b981" strokeWidth={2} name="Sales" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        {/* Total Orders Chart - Hourly */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShoppingBagIcon className="h-5 w-5" />
              Total Orders
            </CardTitle>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Showing total orders for the provided data</p>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={hourlySales}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200 dark:stroke-gray-700" />
                <XAxis 
                  dataKey="hour" 
                  className="text-sm"
                  angle={-45}
                  textAnchor="end"
                  height={80}
                />
                <YAxis className="text-sm" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'rgba(255, 255, 255, 0.95)',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                  }}
                />
                <Line type="monotone" dataKey="orders" stroke="#3b82f6" strokeWidth={2} name="Orders" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
      {/* Top Selling Items and Top Waiters */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top 5 Selling Items */}
        {stats.topSellingItems && stats.topSellingItems.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Top 5 Selling Items</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200 dark:border-gray-700">
                      <th className="text-left py-3 px-4 font-semibold text-gray-900 dark:text-white">Food Item</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-900 dark:text-white">Category</th>
                      <th className="text-right py-3 px-4 font-semibold text-gray-900 dark:text-white">Qty</th>
                      <th className="text-right py-3 px-4 font-semibold text-gray-900 dark:text-white">Total Sales</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.topSellingItems.slice(0, 5).map((item: any, index: number) => (
                      <tr key={item.menuItemId || index} className="border-b border-gray-200 dark:border-gray-700">
                        <td className="py-3 px-4 text-gray-900 dark:text-white">{item.name || 'Unknown Item'}</td>
                        <td className="py-3 px-4 text-gray-600 dark:text-gray-400">{item.category || 'N/A'}</td>
                        <td className="text-right py-3 px-4 text-gray-900 dark:text-white">{item.quantity || 0}</td>
                        <td className="text-right py-3 px-4 font-semibold text-gray-900 dark:text-white">{formatCurrency(item.revenue || 0)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}
        {/* Top Waiters */}
        <Card>
          <CardHeader>
            <CardTitle>Top Waiters</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700">
                    <th className="text-left py-3 px-4 font-semibold text-gray-900 dark:text-white">Name</th>
                    <th className="text-right py-3 px-4 font-semibold text-gray-900 dark:text-white">Rating</th>
                  </tr>
                </thead>
                <tbody>
                  {topWaiters.map((waiter, index) => (
                    <tr key={waiter.waiterId || index} className="border-b border-gray-200 dark:border-gray-700">
                      <td className="py-3 px-4 text-gray-900 dark:text-white">{waiter.name}</td>
                      <td className="text-right py-3 px-4">
                        {waiter.rating !== 'N/A' ? (
                          <span className="font-semibold text-gray-900 dark:text-white">
                            ⭐ {waiter.rating} ({waiter.totalRatings} reviews)
                          </span>
                        ) : (
                          <span className="text-gray-500 dark:text-gray-400">No ratings yet</span>
                        )}
                      </td>
                    </tr>
                  ))}
                  {topWaiters.length === 0 && (
                    <tr>
                      <td colSpan={2} className="text-center py-8 text-gray-500 dark:text-gray-400">No waiter data available</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
