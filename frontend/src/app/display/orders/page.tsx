'use client';

import ElapsedTime from '@/components/kitchen/ElapsedTime';
import { KitchenOrder, useGetKitchenPendingOrdersQuery, useGetKitchenPreparingOrdersQuery, useGetKitchenReadyOrdersQuery } from '@/lib/api/endpoints/kitchenApi';
import { useGetMenuItemsQuery } from '@/lib/api/endpoints/menuItemsApi';
import { useSocket } from '@/lib/hooks/useSocket';
import { useAppSelector } from '@/lib/store';
import { ClockIcon, FireIcon } from '@heroicons/react/24/outline';
import Image from 'next/image';
import { useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

export default function CustomerOrderDisplayPage() {
  const searchParams = useSearchParams();
  const branchId = searchParams.get('branchId') || '';
  const [currentTime, setCurrentTime] = useState<Date | null>(null);
  const [isMounted, setIsMounted] = useState(false);
  
  const menuScrollRef = useRef<HTMLDivElement>(null);
  const ordersScrollRef = useRef<HTMLDivElement>(null);
  const [menuAutoScroll, setMenuAutoScroll] = useState(true);
  const [ordersAutoScroll, setOrdersAutoScroll] = useState(true);
  const menuUserScrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const ordersUserScrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Get companyId from context (needed for menu items query)
  const { companyContext, user } = useAppSelector((state) => state.auth);
  const companyId = (user as any)?.companyId || 
                   (companyContext as any)?.companyId || 
                   (companyContext as any)?._id ||
                   (companyContext as any)?.id;

  // WebSocket for real-time updates
  const { socket, isConnected, joinKitchen, leaveKitchen } = useSocket();
  
  // Join kitchen room for real-time updates
  useEffect(() => {
    if (branchId && socket && isConnected) {
      joinKitchen(branchId);
      return () => {
        leaveKitchen(branchId);
      };
    }
  }, [branchId, socket, isConnected, joinKitchen, leaveKitchen]);

  // Track last refetch time to prevent excessive refetches
  const lastRefetchTimeRef = useRef<number>(0);
  const REFETCH_DEBOUNCE_MS = 1000; // Minimum 1 second between refetches

  // Fetch menu items for left side - include companyId like menu-items page does
  // Menu items don't change frequently, so poll less often (60s) or rely on WebSocket
  const { data: menuItemsData } = useGetMenuItemsQuery(
    { branchId, companyId, limit: 100 },
    { 
      skip: !branchId, 
      pollingInterval: 60000, // Poll every 60 seconds for menu (items change infrequently)
      refetchOnMountOrArgChange: false, // Prevent refetch on every render
    }
  );
  const menuItems = useMemo(() => {
    if (!menuItemsData) {
      console.log('📋 No menu items data');
      return [];
    }
    const data = menuItemsData as any;
    // Response structure: { menuItems: [], total, page, limit } or { items: [] }
    const items = data.menuItems || data.items || [];
    const result = Array.isArray(items) ? items : [];
    
    console.log('📋 Menu items fetched:', result.length, 'items');
    
    // Filter to only show available items and items with names
    const filtered = result.filter((item: any) => {
      const isAvailable = item.isAvailable !== false;
      const hasName = item.name && item.name.trim() !== '';
      return isAvailable && hasName;
    });
    
    console.log('📋 Menu items after filter:', filtered.length, 'items');
    return filtered;
  }, [menuItemsData]);

  // Create a map of menu items by ID for quick lookup
  const menuItemsMap = useMemo(() => {
    const map = new Map();
    menuItems.forEach((item: any) => {
      const id = item.id || item._id;
      if (id) {
        map.set(id, item);
      }
    });
    return map;
  }, [menuItems]);

  // Fetch orders
  // Use WebSocket for real-time updates, polling only as fallback when WebSocket is disconnected
  // When WebSocket is connected, set very high polling interval (effectively disabled)
  // When disconnected, use longer polling interval (60s) to reduce API calls
  const { data: pendingOrders = [], refetch: refetchPending } = useGetKitchenPendingOrdersQuery(branchId, {
    skip: !branchId,
    pollingInterval: isConnected ? 300000 : 60000, // 5min when WebSocket connected (effectively disabled), 60s fallback
    refetchOnMountOrArgChange: false, // Prevent refetch on every render
  });

  const { data: preparingOrders = [], refetch: refetchPreparing } = useGetKitchenPreparingOrdersQuery(branchId, {
    skip: !branchId,
    pollingInterval: isConnected ? 300000 : 60000, // 5min when WebSocket connected (effectively disabled), 60s fallback
    refetchOnMountOrArgChange: false, // Prevent refetch on every render
  });

  const { data: readyOrders = [], refetch: refetchReady } = useGetKitchenReadyOrdersQuery(branchId, {
    skip: !branchId,
    pollingInterval: isConnected ? 300000 : 60000, // 5min when WebSocket connected (effectively disabled), 60s fallback
    refetchOnMountOrArgChange: false, // Prevent refetch on every render
  });

  const refetchAll = useCallback(() => {
    if (!branchId) return;
    
    // Throttle refetches - prevent if called too frequently
    const now = Date.now();
    if (now - lastRefetchTimeRef.current < REFETCH_DEBOUNCE_MS) {
      return;
    }
    lastRefetchTimeRef.current = now;

    refetchPending();
    refetchPreparing();
    refetchReady();
  }, [branchId, refetchPending, refetchPreparing, refetchReady]);

  // Debounce refetch to prevent excessive API calls from rapid WebSocket events
  const refetchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const handleWebSocketUpdate = useCallback(() => {
    // Clear existing timeout
    if (refetchTimeoutRef.current) {
      clearTimeout(refetchTimeoutRef.current);
    }
    
    // Debounce to 800ms - batch multiple rapid WebSocket events into one refetch
    refetchTimeoutRef.current = setTimeout(() => {
      refetchAll();
    }, 800);
  }, [refetchAll]);

  // WebSocket listeners for real-time updates
  useEffect(() => {
    if (!socket || !isConnected) return;

    socket.on('kitchen:new-order', handleWebSocketUpdate);
    socket.on('kitchen:order-received', handleWebSocketUpdate);
    socket.on('kitchen:order-status-changed', handleWebSocketUpdate);
    socket.on('kitchen:item-ready', handleWebSocketUpdate);
    socket.on('kitchen:item-completed', handleWebSocketUpdate);

    return () => {
      socket.off('kitchen:new-order', handleWebSocketUpdate);
      socket.off('kitchen:order-received', handleWebSocketUpdate);
      socket.off('kitchen:order-status-changed', handleWebSocketUpdate);
      socket.off('kitchen:item-ready', handleWebSocketUpdate);
      socket.off('kitchen:item-completed', handleWebSocketUpdate);
      if (refetchTimeoutRef.current) {
        clearTimeout(refetchTimeoutRef.current);
      }
    };
  }, [socket, isConnected, handleWebSocketUpdate]);

  // Combine all orders and sort by status priority
  const allOrders = useMemo(() => {
    const combined = [
      ...pendingOrders.map((order: KitchenOrder) => ({ ...order, displayStatus: 'pending' })),
      ...preparingOrders.map((order: KitchenOrder) => ({ ...order, displayStatus: 'preparing' })),
      ...readyOrders.map((order: KitchenOrder) => ({ ...order, displayStatus: 'ready' })),
    ];
    
    // Sort by status priority: ready > preparing > pending, then by time (newest first for ready, oldest first for others)
    return combined.sort((a, b) => {
      const statusOrder = { ready: 0, preparing: 1, pending: 2 };
      const statusDiff = statusOrder[a.displayStatus as keyof typeof statusOrder] - statusOrder[b.displayStatus as keyof typeof statusOrder];
      if (statusDiff !== 0) return statusDiff;
      
      const timeA = new Date((a as any).receivedAt || a.createdAt || 0).getTime();
      const timeB = new Date((b as any).receivedAt || b.createdAt || 0).getTime();
      // For ready orders, show newest first; for others, show oldest first
      if (a.displayStatus === 'ready') {
        return timeB - timeA; // Newest first
      }
      return timeA - timeB; // Oldest first
    });
  }, [pendingOrders, preparingOrders, readyOrders]);

  // Handle manual scroll for menu - pause auto-scroll when user scrolls
  useEffect(() => {
    const container = menuScrollRef.current;
    if (!container) return;

    let lastScrollTop = container.scrollTop;

    const handleScroll = () => {
      const currentScrollTop = container.scrollTop;
      // Detect if user manually scrolled (difference > threshold)
      if (Math.abs(currentScrollTop - lastScrollTop) > 5) {
        setMenuAutoScroll(false);
        
        // Resume auto-scroll after 3 seconds of no user interaction
        if (menuUserScrollTimeoutRef.current) {
          clearTimeout(menuUserScrollTimeoutRef.current);
        }
        menuUserScrollTimeoutRef.current = setTimeout(() => {
          setMenuAutoScroll(true);
        }, 3000);
      }
      lastScrollTop = currentScrollTop;
    };

    const handleWheel = () => {
      setMenuAutoScroll(false);
      if (menuUserScrollTimeoutRef.current) {
        clearTimeout(menuUserScrollTimeoutRef.current);
      }
      menuUserScrollTimeoutRef.current = setTimeout(() => {
        setMenuAutoScroll(true);
      }, 3000);
    };

    container.addEventListener('scroll', handleScroll);
    container.addEventListener('wheel', handleWheel);

    return () => {
      container.removeEventListener('scroll', handleScroll);
      container.removeEventListener('wheel', handleWheel);
      if (menuUserScrollTimeoutRef.current) {
        clearTimeout(menuUserScrollTimeoutRef.current);
      }
    };
  }, [setMenuAutoScroll]);

  // Auto-scroll menu items (left side) - Independent scrolling
  useEffect(() => {
    if (!menuScrollRef.current || menuItems.length === 0 || !menuAutoScroll) return;

    const container = menuScrollRef.current;
    const scrollSpeed = 0.8; // pixels per frame
    let currentPos = container.scrollTop; // Start from current position
    let animationFrameId: number | null = null;
    let isScrolling = true;

    const scroll = () => {
      if (!isScrolling || !container || !menuAutoScroll) {
        if (animationFrameId) {
          cancelAnimationFrame(animationFrameId);
        }
        return;
      }

      const maxScroll = container.scrollHeight - container.clientHeight;
      
      if (maxScroll <= 0) {
        // No scroll needed
        if (animationFrameId) {
          cancelAnimationFrame(animationFrameId);
        }
        return;
      }

      currentPos += scrollSpeed;
      
      if (currentPos >= maxScroll) {
        // Reset to top for seamless loop
        container.scrollTop = 0;
        currentPos = 0;
      } else {
        container.scrollTop = currentPos;
      }

      animationFrameId = requestAnimationFrame(scroll);
    };

    // Wait for container to be fully rendered
    const timeoutId = setTimeout(() => {
      if (container && container.scrollHeight > container.clientHeight && menuAutoScroll) {
        animationFrameId = requestAnimationFrame(scroll);
      }
    }, 500);

    return () => {
      isScrolling = false;
      clearTimeout(timeoutId);
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
    };
  }, [menuItems.length, menuAutoScroll]);

  // Handle manual scroll for orders - pause auto-scroll when user scrolls
  useEffect(() => {
    const container = ordersScrollRef.current;
    if (!container) return;

    let lastScrollTop = container.scrollTop;

    const handleScroll = () => {
      const currentScrollTop = container.scrollTop;
      // Detect if user manually scrolled (difference > threshold)
      if (Math.abs(currentScrollTop - lastScrollTop) > 5) {
        setOrdersAutoScroll(false);
        
        // Resume auto-scroll after 3 seconds of no user interaction
        if (ordersUserScrollTimeoutRef.current) {
          clearTimeout(ordersUserScrollTimeoutRef.current);
        }
        ordersUserScrollTimeoutRef.current = setTimeout(() => {
          setOrdersAutoScroll(true);
        }, 3000);
      }
      lastScrollTop = currentScrollTop;
    };

    const handleWheel = () => {
      setOrdersAutoScroll(false);
      if (ordersUserScrollTimeoutRef.current) {
        clearTimeout(ordersUserScrollTimeoutRef.current);
      }
      ordersUserScrollTimeoutRef.current = setTimeout(() => {
        setOrdersAutoScroll(true);
      }, 3000);
    };

    container.addEventListener('scroll', handleScroll);
    container.addEventListener('wheel', handleWheel);

    return () => {
      container.removeEventListener('scroll', handleScroll);
      container.removeEventListener('wheel', handleWheel);
      if (ordersUserScrollTimeoutRef.current) {
        clearTimeout(ordersUserScrollTimeoutRef.current);
      }
    };
  }, [setOrdersAutoScroll]);

  // Auto-scroll orders (right side) - Independent scrolling
  useEffect(() => {
    if (!ordersScrollRef.current || allOrders.length === 0 || !ordersAutoScroll) return;

    const container = ordersScrollRef.current;
    const scrollSpeed = 0.8; // pixels per frame
    let currentPos = container.scrollTop; // Start from current position
    let animationFrameId: number | null = null;
    let isScrolling = true;

    const scroll = () => {
      if (!isScrolling || !container || !ordersAutoScroll) {
        if (animationFrameId) {
          cancelAnimationFrame(animationFrameId);
        }
        return;
      }

      const maxScroll = container.scrollHeight - container.clientHeight;
      
      if (maxScroll <= 0) {
        // No scroll needed
        if (animationFrameId) {
          cancelAnimationFrame(animationFrameId);
        }
        return;
      }

      currentPos += scrollSpeed;
      
      if (currentPos >= maxScroll) {
        // Reset to top for seamless loop
        container.scrollTop = 0;
        currentPos = 0;
      } else {
        container.scrollTop = currentPos;
      }

      animationFrameId = requestAnimationFrame(scroll);
    };

    // Wait for container to be fully rendered
    const timeoutId = setTimeout(() => {
      if (container && container.scrollHeight > container.clientHeight && ordersAutoScroll) {
        animationFrameId = requestAnimationFrame(scroll);
      }
    }, 500);

    return () => {
      isScrolling = false;
      clearTimeout(timeoutId);
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
    };
  }, [allOrders.length, ordersAutoScroll]);

  // Set mounted state and initialize time on client side only
  useEffect(() => {
    setIsMounted(true);
    setCurrentTime(new Date());
  }, []);

  // Update time every second (only after mount)
  useEffect(() => {
    if (!isMounted) return;
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, [isMounted]);

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'ready':
        return {
          label: 'READY',
          bgColor: 'bg-green-500',
          textColor: 'text-green-700',
          borderColor: 'border-green-500',
        };
      case 'preparing':
        return {
          label: 'PREPARING',
          bgColor: 'bg-blue-500',
          textColor: 'text-blue-700',
          borderColor: 'border-blue-500',
        };
      case 'pending':
      default:
        return {
          label: 'PENDING',
          bgColor: 'bg-red-500',
          textColor: 'text-red-700',
          borderColor: 'border-red-500',
        };
    }
  };

  if (!branchId) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center text-white">
          <h1 className="text-4xl font-bold mb-4">Customer Order Display</h1>
          <p className="text-xl">Please provide a branchId parameter</p>
          <p className="text-sm mt-2 text-gray-400">Example: /display/orders?branchId=YOUR_BRANCH_ID</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-gray-900 text-white overflow-hidden flex">
      {/* Left Side - MENU */}
      <div className="w-1/2 border-r border-gray-700 flex flex-col h-full">
        {/* Menu Header */}
        <div className="bg-gray-800 border-b border-gray-700 px-6 py-4 flex-shrink-0">
          <h2 className="text-2xl font-bold">MENU</h2>
        </div>

        {/* Menu Items - Auto Scrolling */}
        <div
          ref={menuScrollRef}
          className="flex-1 overflow-y-auto scrollbar-hide p-6"
          style={{ scrollBehavior: 'auto' }}
        >
          <div className="grid grid-cols-2 gap-4">
            {menuItems.length === 0 ? (
              <div className="col-span-2 flex items-center justify-center h-64">
                <div className="text-center">
                  <ClockIcon className="w-16 h-16 mx-auto mb-4 text-gray-600" />
                  <p className="text-gray-400">No menu items available</p>
                </div>
              </div>
            ) : (
              menuItems.map((item: any) => {
                const displayName = item.name?.length > 20 ? `${item.name.substring(0, 20)}...` : item.name;
                // Category is already a string from API transformResponse
                const categoryName = typeof item.category === 'string' 
                  ? item.category 
                  : (item.category?.name || (item.categoryId as any)?.name || item.categoryName || 'Uncategorized');
                
                return (
                  <div
                    key={item.id || item._id}
                    className="bg-gray-800 rounded-lg overflow-hidden border border-gray-700 hover:border-gray-600 transition-all"
                  >
                    {/* Item Image */}
                    <div className="relative aspect-square bg-gray-700">
                      {(item.imageUrl || item.image || (item as any).image) ? (
                        <Image
                          src={item.imageUrl || item.image || (item as any).image}
                          alt={item.name}
                          fill
                          className="object-cover"
                          unoptimized
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none';
                            const placeholder = (e.target as HTMLImageElement).parentElement?.querySelector('.placeholder-icon');
                            if (placeholder) placeholder.classList.remove('hidden');
                          }}
                        />
                      ) : null}
                      <div className={`w-full h-full flex items-center justify-center placeholder-icon ${(item.imageUrl || item.image || (item as any).image) ? 'hidden' : ''}`}>
                        <div className="text-4xl">🍽️</div>
                      </div>
                      
                      {/* Category Badge */}
                      <div className="absolute top-2 right-2 bg-black/70 text-white px-2 py-1 rounded text-xs font-semibold">
                        {categoryName}
                      </div>
                    </div>

                    {/* Item Info */}
                    <div className="p-3">
                      <h3 className="font-semibold text-white text-sm mb-1" title={item.name}>
                        {displayName}
                      </h3>
                      <p className="text-lg font-bold text-green-400">
                        BDT {item.price || 0}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Duplicate items for seamless loop */}
          {menuItems.length > 0 && (
            <div className="grid grid-cols-2 gap-4 mt-4">
              {menuItems.slice(0, 4).map((item: any) => {
                const displayName = item.name?.length > 20 ? `${item.name.substring(0, 20)}...` : item.name;
                const categoryName = typeof item.category === 'string' 
                  ? item.category 
                  : (item.category?.name || (item.categoryId as any)?.name || item.categoryName || 'Uncategorized');
                
                return (
                  <div
                    key={`dup-${item.id || item._id}`}
                    className="bg-gray-800 rounded-lg overflow-hidden border border-gray-700 opacity-50"
                  >
                    <div className="relative aspect-square bg-gray-700">
                      {(item.imageUrl || item.image || (item as any).image) ? (
                        <Image
                          src={item.imageUrl || item.image || (item as any).image}
                          alt={item.name}
                          fill
                          className="object-cover"
                          unoptimized
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none';
                            const placeholder = (e.target as HTMLImageElement).parentElement?.querySelector('.placeholder-icon');
                            if (placeholder) placeholder.classList.remove('hidden');
                          }}
                        />
                      ) : null}
                      <div className={`w-full h-full flex items-center justify-center placeholder-icon ${(item.imageUrl || item.image || (item as any).image) ? 'hidden' : ''}`}>
                        <div className="text-4xl">🍽️</div>
                      </div>
                      <div className="absolute top-2 right-2 bg-black/70 text-white px-2 py-1 rounded text-xs font-semibold">
                        {categoryName}
                      </div>
                    </div>
                    <div className="p-3">
                      <h3 className="font-semibold text-white text-sm mb-1">{displayName}</h3>
                      <p className="text-lg font-bold text-green-400">BDT {item.price || 0}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Right Side - Today's Orders */}
      <div className="w-1/2 flex flex-col h-full">
        {/* Orders Header */}
        <div className="bg-gray-800 border-b border-gray-700 px-6 py-4 flex items-center justify-between flex-shrink-0">
          <h2 className="text-2xl font-bold">Today's Orders</h2>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
              <span className="text-sm">{isConnected ? 'LIVE' : 'POLLING'}</span>
            </div>
            <div className="text-sm text-gray-400">
              {isMounted && currentTime ? currentTime.toLocaleTimeString() : '--:--:--'}
            </div>
          </div>
        </div>

        {/* Orders - Auto Scrolling */}
        <div
          ref={ordersScrollRef}
          className="flex-1 overflow-y-auto scrollbar-hide p-6"
          style={{ scrollBehavior: 'auto' }}
        >
          {allOrders.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <ClockIcon className="w-24 h-24 mx-auto mb-4 text-gray-600" />
                <h2 className="text-2xl font-bold text-gray-400 mb-2">No Orders</h2>
                <p className="text-gray-500">Waiting for new orders...</p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {allOrders.map((order: KitchenOrder & { displayStatus: string }) => {
                const statusConfig = getStatusConfig(order.displayStatus);
                const orderId = order.id || (order as any)._id;
                const receivedAt = (order as any).receivedAt || order.createdAt;

                return (
                  <div
                    key={orderId}
                    className={`bg-gray-800 rounded-lg border-2 ${statusConfig.borderColor} p-4 ${
                      (order as any).isUrgent ? 'ring-2 ring-red-500 ring-opacity-50 animate-pulse' : ''
                    }`}
                  >
                    {/* Order Header */}
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <h3 className="text-xl font-bold text-white">Order #{order.orderNumber}</h3>
                        {order.tableNumber && (
                          <p className="text-sm text-gray-400">Table: {order.tableNumber}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        {(order as any).isUrgent && (
                          <div className="bg-red-500 text-white px-2 py-1 rounded-md flex items-center gap-1">
                            <FireIcon className="w-4 h-4" />
                            <span className="text-xs font-bold">URGENT</span>
                          </div>
                        )}
                        <div className={`${statusConfig.bgColor} text-white px-3 py-1 rounded-md font-semibold text-sm`}>
                          {statusConfig.label}
                        </div>
                      </div>
                    </div>

                    {/* Order Items */}
                    <div className="grid grid-cols-4 gap-3">
                      {order.items?.map((item: any, idx: number) => {
                        // Get menu item ID (could be string or object)
                        const menuItemId = typeof item.menuItemId === 'string' 
                          ? item.menuItemId 
                          : (item.menuItemId?._id || item.menuItemId?.id);
                        
                        // Look up menu item from map if we have the ID
                        const menuItem = menuItemId ? menuItemsMap.get(menuItemId) : null;
                        
                        // Try multiple possible image paths
                        const itemImage = item.image 
                          || item.imageUrl 
                          || menuItem?.imageUrl
                          || menuItem?.image
                          || item.menuItemId?.image 
                          || item.menuItemId?.imageUrl 
                          || (item.menuItemId as any)?.image
                          || (item.menuItemId as any)?.imageUrl;
                        const itemName = item.name 
                          || menuItem?.name
                          || item.menuItemId?.name 
                          || (item.menuItemId as any)?.name 
                          || 'Unknown Item';
                        
                        return (
                          <div
                            key={item.id || item._id || item.itemId || idx}
                            className="bg-gray-700 rounded-lg overflow-hidden"
                          >
                            {/* Item Image */}
                            <div className="relative aspect-square bg-gray-600">
                              {itemImage ? (
                                <Image
                                  src={itemImage}
                                  alt={itemName}
                                  fill
                                  className="object-cover"
                                  unoptimized
                                  onError={(e) => {
                                    (e.target as HTMLImageElement).style.display = 'none';
                                    (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden');
                                  }}
                                />
                              ) : null}
                              <div className={`w-full h-full flex items-center justify-center ${itemImage ? 'hidden' : ''}`}>
                                <div className="text-2xl">🍽️</div>
                              </div>
                              
                              {/* Quantity Badge */}
                              {item.quantity > 1 && (
                                <div className="absolute top-1 left-1 bg-black/70 text-white px-1.5 py-0.5 rounded text-xs font-bold">
                                  {item.quantity}x
                                </div>
                              )}
                            </div>

                            {/* Item Name */}
                            <div className="p-2">
                              <p className="text-xs text-white truncate" title={itemName}>
                                {itemName}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Order Footer */}
                    <div className="mt-3 pt-3 border-t border-gray-700 flex items-center justify-between">
                      <div className="text-xs text-gray-400">
                        <ElapsedTime startTime={receivedAt} className="font-mono" />
                      </div>
                      <div className="text-xs text-gray-400">
                        {order.orderType?.toUpperCase() || 'DINE-IN'}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Duplicate orders for seamless loop */}
          {allOrders.length > 0 && (
            <div className="space-y-4 mt-4">
              {allOrders.slice(0, 2).map((order: KitchenOrder & { displayStatus: string }) => {
                const statusConfig = getStatusConfig(order.displayStatus);
                const orderId = order.id || (order as any)._id;

                return (
                  <div
                    key={`dup-${orderId}`}
                    className={`bg-gray-800 rounded-lg border-2 ${statusConfig.borderColor} p-4 opacity-50`}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-xl font-bold text-white">Order #{order.orderNumber}</h3>
                      <div className={`${statusConfig.bgColor} text-white px-3 py-1 rounded-md font-semibold text-sm`}>
                        {statusConfig.label}
                      </div>
                    </div>
                    <div className="grid grid-cols-4 gap-3">
                      {order.items?.slice(0, 4).map((item: any, idx: number) => {
                        const itemImage = item.image || item.menuItemId?.image || (item.menuItemId as any)?.imageUrl;
                        const itemName = item.name || (item.menuItemId as any)?.name || 'Unknown Item';
                        
                        return (
                          <div key={`dup-${item.id || item._id || item.itemId || idx}`} className="bg-gray-700 rounded-lg overflow-hidden">
                            <div className="relative aspect-square bg-gray-600">
                              {itemImage ? (
                                <Image
                                  src={itemImage}
                                  alt={itemName}
                                  fill
                                  className="object-cover"
                                  unoptimized
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                  <div className="text-2xl">🍽️</div>
                                </div>
                              )}
                            </div>
                            <div className="p-2">
                              <p className="text-xs text-white truncate">{itemName}</p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <style jsx global>{`
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </div>
  );
}
