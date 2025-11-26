'use client';

import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import {
    KitchenOrder,
    useCancelKitchenOrderMutation,
    useCompleteKitchenOrderItemMutation,
    useCompleteKitchenOrderMutation,
    useGetKitchenDelayedOrdersQuery,
    useGetKitchenPendingOrdersQuery,
    useGetKitchenPreparingOrdersQuery,
    useGetKitchenReadyOrdersQuery,
    useGetKitchenStatsQuery,
    useGetKitchenUrgentOrdersQuery,
    useMarkKitchenOrderUrgentMutation,
    useStartKitchenOrderItemMutation,
    useStartKitchenOrderMutation,
    useUpdateKitchenItemPriorityMutation
} from '@/lib/api/endpoints/kitchenApi';
import { useGetStaffQuery } from '@/lib/api/endpoints/staffApi';
import { useAppSelector } from '@/lib/store';
import { formatDateTime } from '@/lib/utils';
import {
    ArrowPathIcon,
    ArrowsPointingInIcon,
    ArrowsPointingOutIcon,
    ArrowsUpDownIcon,
    CheckCircleIcon,
    ClockIcon,
    FireIcon,
    MagnifyingGlassIcon,
    SpeakerWaveIcon,
    SpeakerXMarkIcon,
    UserIcon,
    XCircleIcon
} from '@heroicons/react/24/outline';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import toast from 'react-hot-toast';

export default function KitchenPage() {
  const { user, companyContext } = useAppSelector((state) => state.auth);
  const [selectedOrder, setSelectedOrder] = useState<KitchenOrder | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [searchQuery, setSearchQuery] = useState('');
  const [filterOrderType, setFilterOrderType] = useState<'all' | 'dine-in' | 'takeaway' | 'delivery'>('all');
  const [sortBy, setSortBy] = useState<'time' | 'priority' | 'table'>('time');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const previousOrderCounts = useRef<{ pending: number; urgent: number }>({ pending: 0, urgent: 0 });

  const branchId = (user as any)?.branchId || 
                   (companyContext as any)?.branchId || 
                   (companyContext as any)?.branches?.[0]?._id ||
                   (companyContext as any)?.branches?.[0]?.id;

  // Fetch chefs for assignment
  const { data: chefsData } = useGetStaffQuery(
    { role: 'chef', branchId, isActive: true },
    { skip: !branchId }
  );
  const chefs = useMemo(() => chefsData?.staff || [], [chefsData]);

  // Update time every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // API calls with polling for real-time updates
  const { data: statsResponse, isLoading: statsLoading } = useGetKitchenStatsQuery(branchId || '', {
    skip: !branchId,
    pollingInterval: 30000, // Refresh every 30 seconds
  });

  const { data: pendingResponse, isLoading: pendingLoading, refetch: refetchPending } = useGetKitchenPendingOrdersQuery(branchId || '', {
    skip: !branchId,
    pollingInterval: 10000, // Refresh every 10 seconds
  });

  const { data: preparingResponse, isLoading: preparingLoading, refetch: refetchPreparing } = useGetKitchenPreparingOrdersQuery(branchId || '', {
    skip: !branchId,
    pollingInterval: 10000,
  });

  const { data: readyResponse, isLoading: readyLoading, refetch: refetchReady } = useGetKitchenReadyOrdersQuery(branchId || '', {
    skip: !branchId,
    pollingInterval: 10000,
  });

  const { data: urgentResponse } = useGetKitchenUrgentOrdersQuery(branchId || '', {
    skip: !branchId,
    pollingInterval: 15000,
  });

  const { data: delayedResponse } = useGetKitchenDelayedOrdersQuery(branchId || '', {
    skip: !branchId,
    pollingInterval: 20000,
  });

  // Refetch function
  const refetchAll = useCallback(() => {
    if (!branchId) return;
    refetchPending();
    refetchPreparing();
    refetchReady();
  }, [branchId, refetchPending, refetchPreparing, refetchReady]);

  // Auto-refresh orders every 30 seconds
  useEffect(() => {
    if (!branchId) return;
    const interval = setInterval(() => {
      refetchAll();
    }, 30000);
    return () => clearInterval(interval);
  }, [branchId, refetchAll]);

  const playSound = useCallback((type: 'new-order' | 'urgent') => {
    if (!soundEnabled) return;
    
    try {
      const audio = new Audio();
      if (type === 'urgent') {
        // Urgent alert sound (higher frequency beep)
        audio.src = 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSuBzvLZiTYIGWi77+efTRAMUKfj8LZjHAY4kdfyzHksBSR3x/DdkEAKFF606euoVRQKRp/g8r5sIQUrgc7y2Yk2CBlou+/nn00QDFCn4/C2YxwGOJHX8sx5LAUkd8fw3ZBACg==';
      } else {
        // New order sound (lower frequency beep)
        audio.src = 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSuBzvLZiTYIGWi77+efTRAMUKfj8LZjHAY4kdfyzHksBSR3x/DdkEAKFF606euoVRQKRp/g8r5sIQUrgc7y2Yk2CBlou+/nn00QDFCn4/C2YxwGOJHX8sx5LAUkd8fw3ZBACg==';
      }
      audio.volume = 0.3;
      audio.play().catch(() => {}); // Ignore errors
    } catch (error) {
      console.error(error);
      // Fallback: use Web Audio API
      try {
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.frequency.value = type === 'urgent' ? 800 : 400;
        oscillator.type = 'sine';
        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
        
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.3);
      } catch (fallbackError) {
        console.error(fallbackError);
      }
    }
  }, [soundEnabled]);

  // Extract data from API responses (already transformed by API)
  const kitchenStats = useMemo(() => {
    if (!statsResponse) return null;
    return statsResponse;
  }, [statsResponse]);

  const pendingOrders = useMemo(() => {
    return pendingResponse || [];
  }, [pendingResponse]);

  const preparingOrders = useMemo(() => {
    return preparingResponse || [];
  }, [preparingResponse]);

  const readyOrders = useMemo(() => {
    return readyResponse || [];
  }, [readyResponse]);

  const urgentOrders = useMemo(() => {
    return urgentResponse || [];
  }, [urgentResponse]);

  const delayedOrders = useMemo(() => {
    return delayedResponse || [];
  }, [delayedResponse]);

  // Sound alerts for new/urgent orders
  useEffect(() => {
    if (!soundEnabled) return;
    
    const currentPending = pendingOrders.length;
    const currentUrgent = urgentOrders.length;
    
    if (currentPending > previousOrderCounts.current.pending) {
      playSound('new-order');
    }
    
    if (currentUrgent > previousOrderCounts.current.urgent) {
      playSound('urgent');
    }
    
    previousOrderCounts.current = { pending: currentPending, urgent: currentUrgent };
  }, [pendingOrders.length, urgentOrders.length, soundEnabled, playSound]);

  // Full-screen mode
  useEffect(() => {
    if (isFullScreen) {
      document.documentElement.requestFullscreen?.().catch(() => {});
    } else {
      if (document.fullscreenElement) {
        document.exitFullscreen?.().catch(() => {});
      }
    }
  }, [isFullScreen]);

  // Calculate elapsed time for orders
  const getElapsedTime = useCallback((order: any) => {
    if (!order.receivedAt && !order.createdAt) return 0;
    const startTime = new Date(order.receivedAt || order.createdAt).getTime();
    const now = Date.now();
    return Math.floor((now - startTime) / 60000); // minutes
  }, []);


  // Filter and sort orders
  const filterAndSortOrders = useCallback((orders: any[]) => {
    const filtered = orders.filter((order: any) => {
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesOrderNumber = order.orderNumber?.toLowerCase().includes(query);
        const matchesTableNumber = order.tableNumber?.toLowerCase().includes(query);
        const matchesCustomerName = order.customerName?.toLowerCase().includes(query);
        if (!matchesOrderNumber && !matchesTableNumber && !matchesCustomerName) {
          return false;
        }
      }
      
      // Order type filter
      if (filterOrderType !== 'all' && order.orderType !== filterOrderType) {
        return false;
      }
      
      return true;
    });

    // Sort orders
    filtered.sort((a, b) => {
      let comparison = 0;
      
      if (sortBy === 'time') {
        const timeA = new Date(a.receivedAt || a.createdAt).getTime();
        const timeB = new Date(b.receivedAt || b.createdAt).getTime();
        comparison = timeA - timeB;
      } else if (sortBy === 'priority') {
        const priorityOrder = { urgent: 4, high: 3, normal: 2, low: 1 };
        const priorityA = priorityOrder[a.priority as keyof typeof priorityOrder] || 2;
        const priorityB = priorityOrder[b.priority as keyof typeof priorityOrder] || 2;
        comparison = priorityB - priorityA; // Higher priority first
      } else if (sortBy === 'table') {
        const tableA = parseInt(a.tableNumber || '0') || 0;
        const tableB = parseInt(b.tableNumber || '0') || 0;
        comparison = tableA - tableB;
      }
      
      return sortOrder === 'asc' ? comparison : -comparison;
    });

    return filtered;
  }, [searchQuery, filterOrderType, sortBy, sortOrder]);

  // Apply filters and sorting to orders
  const filteredPendingOrders = useMemo(() => filterAndSortOrders(pendingOrders), [pendingOrders, filterAndSortOrders]);
  const filteredPreparingOrders = useMemo(() => filterAndSortOrders(preparingOrders), [preparingOrders, filterAndSortOrders]);
  const filteredReadyOrders = useMemo(() => filterAndSortOrders(readyOrders), [readyOrders, filterAndSortOrders]);

  // Mutations
  const [startOrder] = useStartKitchenOrderMutation();
  const [startItem] = useStartKitchenOrderItemMutation();
  const [completeItem] = useCompleteKitchenOrderItemMutation();
  const [completeOrder] = useCompleteKitchenOrderMutation();
  const [markUrgent] = useMarkKitchenOrderUrgentMutation();
  const [cancelOrder] = useCancelKitchenOrderMutation();
  const [updateItemPriority] = useUpdateKitchenItemPriorityMutation();

  const handleItemStatusChange = async (orderId: string, itemId: string, newStatus: 'pending' | 'preparing' | 'ready', chefId?: string) => {
    try {
      if (newStatus === 'preparing') {
        const chef = chefId || (user as any)?._id || (user as any)?.id;
        if (!chef) {
          toast.error('Please select a chef');
          return;
        }
        await startItem({ id: orderId, itemId, chefId: chef }).unwrap();
        toast.success('Item preparation started');
        refetchAll();
      } else if (newStatus === 'ready') {
        await completeItem({ id: orderId, itemId }).unwrap();
        toast.success('Item completed');
        refetchAll();
      }
    } catch (error: any) {
      toast.error(error?.data?.message || error?.message || 'Failed to update item status');
    }
  };

  const handleOrderStatusChange = async (orderId: string, newStatus: 'pending' | 'preparing' | 'ready' | 'completed', chefId?: string) => {
    try {
      if (newStatus === 'preparing') {
        const chef = chefId || (user as any)?._id || (user as any)?.id;
        if (!chef) {
          toast.error('Please select a chef');
          return;
        }
        await startOrder({ id: orderId, chefId: chef }).unwrap();
        toast.success('Order preparation started');
        refetchAll();
      } else if (newStatus === 'ready' || newStatus === 'completed') {
        await completeOrder(orderId).unwrap();
        toast.success(newStatus === 'ready' ? 'Order marked as ready' : 'Order completed');
        refetchAll();
      }
    } catch (error: any) {
      toast.error(error?.data?.message || error?.message || 'Failed to update order status');
    }
  };


  const handleMarkUrgent = async (orderId: string) => {
    if (!confirm('Mark this order as urgent?')) return;
    try {
      await markUrgent(orderId).unwrap();
      toast.success('Order marked as urgent');
      refetchAll();
    } catch (error: any) {
      toast.error(error?.data?.message || error?.message || 'Failed to mark order as urgent');
    }
  };

  const handleCancelOrder = async (orderId: string) => {
    if (!confirm('Are you sure you want to cancel this order?')) return;
    try {
      await cancelOrder(orderId).unwrap();
      toast.success('Order cancelled');
      refetchAll();
    } catch (error: any) {
      toast.error(error?.data?.message || error?.message || 'Failed to cancel order');
    }
  };

  const handleUpdateItemPriority = async (orderId: string, itemId: string, priority: number) => {
    try {
      await updateItemPriority({ id: orderId, itemId, priority: priority.toString() }).unwrap();
      toast.success('Item priority updated');
      refetchAll();
    } catch (error: any) {
      toast.error(error?.data?.message || error?.message || 'Failed to update priority');
    }
  };

  const getPriorityBadge = (priority: 'urgent' | 'high' | 'normal' | 'low' | undefined) => {
    const variants = {
      urgent: 'danger',
      high: 'warning',
      normal: 'secondary',
      low: 'secondary',
    } as const;

    return (
      <Badge variant={variants[priority || 'normal']}>
        {(priority || 'normal').toUpperCase()}
      </Badge>
    );
  };

  const getStatusBadge = (status: KitchenOrder['status']) => {
    const variants: any = {
      pending: 'warning',
      preparing: 'info',
      ready: 'success',
      served: 'info',
      completed: 'secondary',
      cancelled: 'danger',
    };

    return (
      <Badge variant={variants[status] || 'secondary'}>
        {status.toUpperCase()}
      </Badge>
    );
  };

  const getItemStatusBadge = (status: string) => {
    const variants = {
      pending: 'warning',
      preparing: 'info',
      ready: 'success',
    } as const;

    return (
      <Badge variant={variants[status as keyof typeof variants]}>
        {status.toUpperCase()}
      </Badge>
    );
  };

  // Use API data instead of filtered local state
  const isLoading = pendingLoading || preparingLoading || readyLoading || statsLoading;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Kitchen Display</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Real-time kitchen order management
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setSoundEnabled(!soundEnabled)}
            title={soundEnabled ? 'Disable Sound Alerts' : 'Enable Sound Alerts'}
          >
            {soundEnabled ? (
              <SpeakerWaveIcon className="w-4 h-4 mr-2" />
            ) : (
              <SpeakerXMarkIcon className="w-4 h-4 mr-2" />
            )}
            Sound
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setIsFullScreen(!isFullScreen)}
            title={isFullScreen ? 'Exit Full Screen' : 'Enter Full Screen'}
          >
            {isFullScreen ? (
              <ArrowsPointingInIcon className="w-4 h-4 mr-2" />
            ) : (
              <ArrowsPointingOutIcon className="w-4 h-4 mr-2" />
            )}
            {isFullScreen ? 'Exit' : 'Full Screen'}
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => refetchAll()}
            title="Refresh Orders"
          >
            <ArrowPathIcon className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          <div className="text-right">
            <p className="text-sm text-gray-600 dark:text-gray-400">Current Time</p>
            <p className="text-lg font-semibold text-gray-900 dark:text-white">
              {currentTime.toLocaleTimeString()}
            </p>
            {(urgentOrders.length > 0 || delayedOrders.length > 0) && (
              <div className="mt-2 flex gap-2">
                {urgentOrders.length > 0 && (
                  <Badge variant="danger" className="text-xs">
                    {urgentOrders.length} Urgent
                  </Badge>
                )}
                {delayedOrders.length > 0 && (
                  <Badge variant="warning" className="text-xs">
                    {delayedOrders.length} Delayed
                  </Badge>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <Input
                  type="text"
                  placeholder="Search by order number, table, or customer..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="w-full sm:w-48">
              <Select
                options={[
                  { value: 'all', label: 'All Order Types' },
                  { value: 'dine-in', label: 'Dine-In' },
                  { value: 'takeaway', label: 'Takeaway' },
                  { value: 'delivery', label: 'Delivery' },
                ]}
                value={filterOrderType}
                onChange={(value) => setFilterOrderType(value as any)}
              />
            </div>
            <div className="w-full sm:w-48">
              <Select
                options={[
                  { value: 'time', label: 'Sort by Time' },
                  { value: 'priority', label: 'Sort by Priority' },
                  { value: 'table', label: 'Sort by Table' },
                ]}
                value={sortBy}
                onChange={(value) => setSortBy(value as any)}
              />
            </div>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
              title={`Sort ${sortOrder === 'asc' ? 'Descending' : 'Ascending'}`}
            >
              <ArrowsUpDownIcon className="w-4 h-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Kitchen Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Pending Orders</p>
                <p className="text-3xl font-bold text-yellow-600">
                  {isLoading ? '...' : pendingOrders.length}
                </p>
              </div>
              <ClockIcon className="w-8 h-8 text-yellow-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Preparing</p>
                <p className="text-3xl font-bold text-blue-600">
                  {isLoading ? '...' : preparingOrders.length}
                </p>
              </div>
              <FireIcon className="w-8 h-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Ready for Service</p>
                <p className="text-3xl font-bold text-green-600">
                  {isLoading ? '...' : readyOrders.length}
                </p>
              </div>
              <CheckCircleIcon className="w-8 h-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Avg Prep Time</p>
                <p className="text-3xl font-bold text-purple-600">
                  {isLoading ? '...' : `${Math.round(kitchenStats?.avgPrepTime || 0)} min`}
                </p>
              </div>
              <ClockIcon className="w-8 h-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Kitchen Performance Dashboard */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Performance Metrics</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600 dark:text-gray-400">Orders Completed Today</span>
              <span className="text-xl font-bold text-gray-900 dark:text-white">
                {isLoading ? '...' : kitchenStats?.ordersCompleted || 0}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600 dark:text-gray-400">Urgent Orders</span>
              <span className="text-xl font-bold text-red-600">
                {isLoading ? '...' : urgentOrders.length}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600 dark:text-gray-400">Delayed Orders</span>
              <span className="text-xl font-bold text-orange-600">
                {isLoading ? '...' : delayedOrders.length}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600 dark:text-gray-400">Total Active Orders</span>
              <span className="text-xl font-bold text-blue-600">
                {isLoading ? '...' : (pendingOrders.length + preparingOrders.length + readyOrders.length)}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Preparation Time Analytics</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-600 dark:text-gray-400">Average Prep Time</span>
                <span className="text-xl font-bold text-purple-600">
                  {isLoading ? '...' : `${Math.round(kitchenStats?.avgPrepTime || 0)} min`}
                </span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div 
                  className="bg-purple-600 h-2 rounded-full transition-all"
                  style={{ width: `${Math.min((kitchenStats?.avgPrepTime || 0) / 60 * 100, 100)}%` }}
                />
              </div>
            </div>
            {preparingOrders.length > 0 && (
              <div className="mt-4">
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Current Prep Times</p>
                <div className="space-y-2">
                  {preparingOrders.slice(0, 5).map((order: any) => {
                    const elapsed = getElapsedTime(order);
                    return (
                      <div key={order.id || order._id} className="flex items-center justify-between text-sm">
                        <span className="text-gray-600 dark:text-gray-400">#{order.orderNumber}</span>
                        <span className={`font-semibold ${elapsed > 30 ? 'text-red-600' : elapsed > 20 ? 'text-orange-600' : 'text-green-600'}`}>
                          {elapsed} min
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Order Status Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Pending</span>
                  <span className="text-sm font-semibold text-yellow-600">
                    {pendingOrders.length} ({pendingOrders.length + preparingOrders.length + readyOrders.length > 0 
                      ? Math.round((pendingOrders.length / (pendingOrders.length + preparingOrders.length + readyOrders.length)) * 100) 
                      : 0}%)
                  </span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div 
                    className="bg-yellow-600 h-2 rounded-full transition-all"
                    style={{ 
                      width: `${pendingOrders.length + preparingOrders.length + readyOrders.length > 0 
                        ? (pendingOrders.length / (pendingOrders.length + preparingOrders.length + readyOrders.length)) * 100 
                        : 0}%` 
                    }}
                  />
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Preparing</span>
                  <span className="text-sm font-semibold text-blue-600">
                    {preparingOrders.length} ({pendingOrders.length + preparingOrders.length + readyOrders.length > 0 
                      ? Math.round((preparingOrders.length / (pendingOrders.length + preparingOrders.length + readyOrders.length)) * 100) 
                      : 0}%)
                  </span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div 
                    className="bg-blue-600 h-2 rounded-full transition-all"
                    style={{ 
                      width: `${pendingOrders.length + preparingOrders.length + readyOrders.length > 0 
                        ? (preparingOrders.length / (pendingOrders.length + preparingOrders.length + readyOrders.length)) * 100 
                        : 0}%` 
                    }}
                  />
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Ready</span>
                  <span className="text-sm font-semibold text-green-600">
                    {readyOrders.length} ({pendingOrders.length + preparingOrders.length + readyOrders.length > 0 
                      ? Math.round((readyOrders.length / (pendingOrders.length + preparingOrders.length + readyOrders.length)) * 100) 
                      : 0}%)
                  </span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div 
                    className="bg-green-600 h-2 rounded-full transition-all"
                    style={{ 
                      width: `${pendingOrders.length + preparingOrders.length + readyOrders.length > 0 
                        ? (readyOrders.length / (pendingOrders.length + preparingOrders.length + readyOrders.length)) * 100 
                        : 0}%` 
                    }}
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Order Columns */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Pending Orders */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ClockIcon className="w-5 h-5 text-yellow-600" />
              Pending Orders ({filteredPendingOrders.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {isLoading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-600 mx-auto"></div>
                <p className="text-gray-600 dark:text-gray-400 mt-2">Loading orders...</p>
              </div>
            ) : filteredPendingOrders.length === 0 ? (
              <div className="text-center py-8">
                <ClockIcon className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                <p className="text-gray-600 dark:text-gray-400">
                  {searchQuery || filterOrderType !== 'all' ? 'No orders match your filters' : 'No pending orders'}
                </p>
              </div>
            ) : (
              filteredPendingOrders.map((order: any) => {
                const elapsedMinutes = getElapsedTime(order);
                const isUrgent = order.isUrgent || order.priority === 'urgent' || elapsedMinutes > 20;
                const isDelayed = order.isDelayed || elapsedMinutes > 30;
                return (
                  <div 
                    key={order.id || order._id} 
                    className={`border rounded-lg p-4 ${
                      isUrgent || isDelayed
                        ? 'border-red-300 dark:border-red-700 bg-red-50 dark:bg-red-900/30 animate-pulse' 
                        : 'border-yellow-200 dark:border-yellow-800 bg-yellow-50 dark:bg-yellow-900/20'
                    }`}
                  >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-gray-900 dark:text-white">
                      Order #{order.orderNumber || order.order_id}
                    </h3>
                    {getPriorityBadge(order.priority)}
                    {order.priority === 'urgent' && (
                      <FireIcon className="w-5 h-5 text-red-600 animate-pulse" />
                    )}
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {order.orderType === 'dine-in' ? `Table ${order.tableNumber || 'N/A'}` : 
                       order.orderType === 'takeaway' ? 'Takeaway' : 'Delivery'}
                    </p>
                    {order.customerName && (
                      <p className="text-xs text-gray-500 dark:text-gray-500">
                        Customer: {order.customerName}
                      </p>
                    )}
                    <p className="text-xs text-gray-500 dark:text-gray-500">
                      {formatDateTime(order.receivedAt || order.createdAt)}
                    </p>
                    {order.receivedAt && (
                      <p className="text-xs font-semibold text-orange-600 dark:text-orange-400 mt-1">
                        Elapsed: {getElapsedTime(order)} min
                      </p>
                    )}
                  </div>
                </div>

                <div className="space-y-2 mb-3">
                  {(order.items || []).map((item: any) => (
                    <div key={item.id || item._id || item.itemId} className="border-b border-gray-200 dark:border-gray-700 pb-2 last:border-0">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className="font-medium text-gray-900 dark:text-white">
                            {item.quantity}x {item.name || item.menuItemId?.name || 'Item'}
                          </p>
                          {/* Variants & Addons */}
                          {item.selectedVariant && (
                            <p className="text-sm text-blue-600 dark:text-blue-400 mt-1">
                              Variant: {item.selectedVariant.name}
                              {item.selectedVariant.priceModifier > 0 && ` (+${item.selectedVariant.priceModifier})`}
                            </p>
                          )}
                          {item.selectedAddons && item.selectedAddons.length > 0 && (
                            <div className="text-sm text-purple-600 dark:text-purple-400 mt-1">
                              <span className="font-medium">Addons: </span>
                              {item.selectedAddons.map((addon: any, idx: number) => (
                                <span key={idx}>
                                  {addon.name}
                                  {idx < item.selectedAddons.length - 1 ? ', ' : ''}
                                </span>
                              ))}
                            </div>
                          )}
                          {/* Special Instructions */}
                          {item.specialInstructions && (
                            <p className="text-sm text-orange-600 dark:text-orange-400 mt-1">
                              ⚠️ {item.specialInstructions}
                            </p>
                          )}
                          {/* Chef Assignment */}
                          {item.preparedBy && (
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 flex items-center gap-1">
                              <UserIcon className="w-3 h-3" />
                              {typeof item.preparedBy === 'object' 
                                ? `${item.preparedBy.firstName || ''} ${item.preparedBy.lastName || ''}`.trim() || 'Chef'
                                : 'Chef'}
                            </p>
                          )}
                          {item.prepTime && (
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              Prep: {item.prepTime} min
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          {chefs.length > 0 && (
                            <Select
                              options={chefs.map((chef) => ({
                                value: chef.id,
                                label: `${chef.firstName} ${chef.lastName}`,
                              }))}
                              value=""
                              onChange={(chefId) => {
                                if (chefId) {
                                  handleItemStatusChange(order.id || order._id, item.id || item._id || item.itemId, 'preparing', chefId);
                                }
                              }}
                              placeholder="Assign Chef"
                              className="w-32"
                            />
                          )}
                          {!chefs.length && (
                            <Button
                              size="sm"
                              onClick={() => handleItemStatusChange(order.id || order._id, item.id || item._id || item.itemId, 'preparing')}
                            >
                              Start
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {order.specialInstructions && (
                  <div className="mb-3 p-2 bg-orange-100 dark:bg-orange-900/30 rounded text-sm text-orange-800 dark:text-orange-400">
                    ⚠️ {order.specialInstructions}
                  </div>
                )}

                <div className="flex gap-2">
                  {chefs.length > 0 ? (
                    <Select
                      options={chefs.map((chef) => ({
                        value: chef.id,
                        label: `${chef.firstName} ${chef.lastName}`,
                      }))}
                      value=""
                      onChange={(chefId) => {
                        if (chefId) {
                          handleOrderStatusChange(order.id || order._id, 'preparing', chefId);
                        }
                      }}
                      placeholder="Assign Chef & Start"
                      className="flex-1"
                    />
                  ) : (
                    <Button
                      onClick={() => handleOrderStatusChange(order.id || order._id, 'preparing')}
                      className="flex-1"
                    >
                      Start Preparing
                    </Button>
                  )}
                  {order.priority !== 'urgent' && (
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => handleMarkUrgent(order.id || order._id)}
                      title="Mark as Urgent"
                    >
                      <FireIcon className="w-4 h-4" />
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleCancelOrder(order.id || order._id)}
                    className="text-red-600"
                    title="Cancel Order"
                  >
                    <XCircleIcon className="w-4 h-4" />
                  </Button>
                </div>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>

        {/* Preparing Orders */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FireIcon className="w-5 h-5 text-blue-600" />
              Preparing ({filteredPreparingOrders.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {isLoading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                <p className="text-gray-600 dark:text-gray-400 mt-2">Loading orders...</p>
              </div>
            ) : filteredPreparingOrders.length === 0 ? (
              <div className="text-center py-8">
                <FireIcon className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                <p className="text-gray-600 dark:text-gray-400">
                  {searchQuery || filterOrderType !== 'all' ? 'No orders match your filters' : 'No orders being prepared'}
                </p>
              </div>
            ) : (
              filteredPreparingOrders.map((order: any) => {
                const elapsedMinutes = getElapsedTime(order);
                return (
                  <div 
                    key={order.id || order._id} 
                    className={`border rounded-lg p-4 ${
                      order.priority === 'urgent' 
                        ? 'border-red-300 dark:border-red-700 bg-red-50 dark:bg-red-900/30' 
                        : 'border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20'
                    }`}
                  >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-gray-900 dark:text-white">
                      Order #{order.orderNumber || order.order_id}
                    </h3>
                    {getPriorityBadge(order.priority)}
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {order.orderType === 'dine-in' ? `Table ${order.tableNumber || 'N/A'}` : 
                       order.orderType === 'takeaway' ? 'Takeaway' : 'Delivery'}
                    </p>
                    {order.customerName && (
                      <p className="text-xs text-gray-500 dark:text-gray-500">
                        Customer: {order.customerName}
                      </p>
                    )}
                    <p className="text-xs text-gray-500 dark:text-gray-500">
                      Est: {order.estimatedTime ? `${order.estimatedTime} min` : 'TBD'}
                    </p>
                    {order.startedAt && (
                      <p className="text-xs font-semibold text-blue-600 dark:text-blue-400 mt-1">
                        Prep time: {elapsedMinutes} min
                      </p>
                    )}
                  </div>
                </div>

                <div className="space-y-2 mb-3">
                  {(order.items || []).map((item: any) => (
                    <div key={item.id || item._id || item.itemId} className="border-b border-gray-200 dark:border-gray-700 pb-2 last:border-0">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className="font-medium text-gray-900 dark:text-white">
                            {item.quantity}x {item.name || item.menuItemId?.name || 'Item'}
                          </p>
                          {/* Variants & Addons */}
                          {item.selectedVariant && (
                            <p className="text-sm text-blue-600 dark:text-blue-400 mt-1">
                              Variant: {item.selectedVariant.name}
                              {item.selectedVariant.priceModifier > 0 && ` (+${item.selectedVariant.priceModifier})`}
                            </p>
                          )}
                          {item.selectedAddons && item.selectedAddons.length > 0 && (
                            <div className="text-sm text-purple-600 dark:text-purple-400 mt-1">
                              <span className="font-medium">Addons: </span>
                              {item.selectedAddons.map((addon: any, idx: number) => (
                                <span key={idx}>
                                  {addon.name}
                                  {idx < item.selectedAddons.length - 1 ? ', ' : ''}
                                </span>
                              ))}
                            </div>
                          )}
                          {/* Special Instructions */}
                          {item.specialInstructions && (
                            <p className="text-sm text-orange-600 dark:text-orange-400 mt-1">
                              ⚠️ {item.specialInstructions}
                            </p>
                          )}
                          {/* Chef Assignment */}
                          {item.preparedBy && (
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 flex items-center gap-1">
                              <UserIcon className="w-3 h-3" />
                              {typeof item.preparedBy === 'object' 
                                ? `${item.preparedBy.firstName || ''} ${item.preparedBy.lastName || ''}`.trim() || 'Chef'
                                : 'Chef'}
                            </p>
                          )}
                          {/* Item Priority */}
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-xs text-gray-500 dark:text-gray-400">Priority:</span>
                            <Select
                              options={[
                                { value: '0', label: 'Low' },
                                { value: '1', label: 'Normal' },
                                { value: '2', label: 'High' },
                                { value: '3', label: 'Urgent' },
                              ]}
                              value={item.priority?.toString() || '1'}
                              onChange={(priority) => {
                                handleUpdateItemPriority(order.id || order._id, item.id || item._id || item.itemId, parseInt(priority));
                              }}
                              className="w-24"
                            />
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {getItemStatusBadge(item.status)}
                          {item.status !== 'ready' && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleItemStatusChange(order.id || order._id, item.id || item._id || item.itemId, 'ready')}
                            >
                              <CheckCircleIcon className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => handleOrderStatusChange(order.id || order._id, 'ready')}
                    className="flex-1"
                  >
                    Mark Ready
                  </Button>
                  {order.priority !== 'urgent' && (
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => handleMarkUrgent(order.id || order._id)}
                      title="Mark as Urgent"
                    >
                      <FireIcon className="w-4 h-4" />
                    </Button>
                  )}
                </div>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>

        {/* Ready Orders */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircleIcon className="w-5 h-5 text-green-600" />
              Ready for Service ({filteredReadyOrders.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {isLoading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto"></div>
                <p className="text-gray-600 dark:text-gray-400 mt-2">Loading orders...</p>
              </div>
            ) : filteredReadyOrders.length === 0 ? (
              <div className="text-center py-8">
                <CheckCircleIcon className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                <p className="text-gray-600 dark:text-gray-400">
                  {searchQuery || filterOrderType !== 'all' ? 'No orders match your filters' : 'No orders ready for service'}
                </p>
              </div>
            ) : (
              filteredReadyOrders.map((order: any) => {
                return (
                  <div key={order.id || order._id} className="border border-green-200 dark:border-green-800 rounded-lg p-4 bg-green-50 dark:bg-green-900/20">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-gray-900 dark:text-white">
                      Order #{order.orderNumber || order.order_id}
                    </h3>
                    {getPriorityBadge(order.priority)}
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {order.orderType === 'dine-in' ? `Table ${order.tableNumber || 'N/A'}` : 
                       order.orderType === 'takeaway' ? 'Takeaway' : 'Delivery'}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-500">
                      Ready since: {formatDateTime(order.updatedAt || order.createdAt)}
                    </p>
                  </div>
                </div>

                <div className="space-y-2 mb-3">
                  {(order.items || []).map((item: any) => (
                    <div key={item.id || item._id || item.itemId} className="border-b border-gray-200 dark:border-gray-700 pb-2 last:border-0">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className="font-medium text-gray-900 dark:text-white">
                            {item.quantity}x {item.name || item.menuItemId?.name || 'Item'}
                          </p>
                          {/* Variants & Addons */}
                          {item.selectedVariant && (
                            <p className="text-sm text-blue-600 dark:text-blue-400 mt-1">
                              Variant: {item.selectedVariant.name}
                              {item.selectedVariant.priceModifier > 0 && ` (+${item.selectedVariant.priceModifier})`}
                            </p>
                          )}
                          {item.selectedAddons && item.selectedAddons.length > 0 && (
                            <div className="text-sm text-purple-600 dark:text-purple-400 mt-1">
                              <span className="font-medium">Addons: </span>
                              {item.selectedAddons.map((addon: any, idx: number) => (
                                <span key={idx}>
                                  {addon.name}
                                  {idx < item.selectedAddons.length - 1 ? ', ' : ''}
                                </span>
                              ))}
                            </div>
                          )}
                          {/* Special Instructions */}
                          {item.specialInstructions && (
                            <p className="text-sm text-orange-600 dark:text-orange-400 mt-1">
                              ⚠️ {item.specialInstructions}
                            </p>
                          )}
                          {/* Chef Assignment */}
                          {item.preparedBy && (
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 flex items-center gap-1">
                              <UserIcon className="w-3 h-3" />
                              {typeof item.preparedBy === 'object' 
                                ? `${item.preparedBy.firstName || ''} ${item.preparedBy.lastName || ''}`.trim() || 'Chef'
                                : 'Chef'}
                            </p>
                          )}
                        </div>
                        <Badge variant="success">
                          READY
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>

                <Button
                  onClick={() => handleOrderStatusChange(order.id || order._id, 'completed')}
                  className="w-full"
                >
                  Mark as Served
                </Button>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>
      </div>

      {/* Order Details Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                  Order #{selectedOrder.orderNumber}
                </h2>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedOrder(null)}
                >
                  <XCircleIcon className="w-5 h-5" />
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="font-medium text-gray-900 dark:text-white mb-3">Order Details</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Table:</span>
                      <span className="font-medium text-gray-900 dark:text-white">
                        {selectedOrder.tableNumber}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Order Type:</span>
                      <span className="font-medium text-gray-900 dark:text-white capitalize">
                        {selectedOrder.orderType || 'Dine-in'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Status:</span>
                      {getStatusBadge(selectedOrder.status)}
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Ordered:</span>
                      <span className="font-medium text-gray-900 dark:text-white">
                        {formatDateTime(selectedOrder.createdAt)}
                      </span>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="font-medium text-gray-900 dark:text-white mb-3">Order Items</h3>
                  <div className="space-y-3">
                    {selectedOrder.items.map((item) => (
                      <div key={item.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                        <div className="flex-1">
                          <p className="font-medium text-gray-900 dark:text-white">
                            {item.quantity}x {item.name}
                          </p>
                          {item.notes && (
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              Note: {item.notes}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          {getItemStatusBadge(item.status)}
                          {item.status !== 'ready' && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleItemStatusChange(selectedOrder.id, item.id, 'ready')}
                            >
                              <CheckCircleIcon className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {selectedOrder.specialInstructions && (
                <div className="mt-6 p-4 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
                  <h4 className="font-medium text-orange-800 dark:text-orange-400 mb-2">
                    Special Instructions
                  </h4>
                  <p className="text-orange-700 dark:text-orange-300">
                    {selectedOrder.specialInstructions}
                  </p>
                </div>
              )}

              <div className="flex justify-end gap-3 mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
                <Button
                  variant="secondary"
                  onClick={() => setSelectedOrder(null)}
                >
                  Close
                </Button>
                <Button onClick={() => handleOrderStatusChange(selectedOrder.id, 'ready')}>
                  Mark All Ready
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}