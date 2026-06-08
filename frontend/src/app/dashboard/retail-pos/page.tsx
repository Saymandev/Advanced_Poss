/* eslint-disable @next/next/no-img-element */
'use client';

import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { OfflineBanner } from '@/components/ui/OfflineBanner';
import { useFormatCurrency } from '@/hooks/useFormatCurrency';
import { useOfflineSyncManager } from '@/lib/hooks/useOfflineSyncManager';
import { usePOSOfflinePrefetcher } from '@/lib/hooks/usePOSOfflinePrefetcher';
import {
  posApi,
  useCancelPOSOrderMutation,
  useCreatePOSOrderMutation,
  useGetPOSMenuItemsQuery,
  useGetPOSOrdersQuery,
  useGetPOSSettingsQuery,
  useGetReceiptHTMLQuery,
  usePrintReceiptMutation,
  useProcessPaymentMutation,
} from '@/lib/api/endpoints/posApi';
import { useGetCustomersQuery, useLazySearchCustomersQuery } from '@/lib/api/endpoints/customersApi';
import { useGetCurrentWorkPeriodQuery } from '@/lib/api/endpoints/workPeriodsApi';
import { useGetPaymentMethodsByBranchQuery } from '@/lib/api/endpoints/paymentMethodsApi';
import { useAppSelector } from '@/lib/store';
import { cn, formatDateTime } from '@/lib/utils';
import {
  ArrowPathIcon,
  CheckIcon,
  CreditCardIcon,
  CurrencyDollarIcon,
  FunnelIcon,
  LockClosedIcon,
  MagnifyingGlassIcon,
  MinusIcon,
  PlusIcon,
  ShoppingBagIcon,
  TrashIcon,
  UserCircleIcon,
  XMarkIcon,
  QrCodeIcon,
  CameraIcon,
  CommandLineIcon,
  GiftIcon,
} from '@heroicons/react/24/outline';
import { StarIcon, CheckCircleIcon } from '@heroicons/react/24/solid';
import { useGetCustomerByIdQuery } from '@/lib/api/endpoints/customersApi';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import toast from 'react-hot-toast';

interface CartItem {
  id: string;
  menuItemId: string;
  name: string;
  price: number;
  quantity: number;
  category: string;
  barcode?: string;
  weightBased?: boolean;
  unitType?: string;
}

interface PaymentState {
  method: string;
  received: string;
  change: number;
}

export default function RetailPOSPage() {
  const { user, companyContext } = useAppSelector((state) => state.auth);
  const formatCurrency = useFormatCurrency();

  const { isOnline, pendingCount, syncOrders } = useOfflineSyncManager();
  const {
    isOfflineReady,
    isSyncing: isPrefetchSyncing,
    lastSyncedAt,
    syncErrors,
    syncNow,
  } = usePOSOfflinePrefetcher();

  const isOwner = user?.role === 'owner' || user?.role === 'super_admin';

  const { data: activeWorkPeriod, isLoading: workPeriodLoading } = useGetCurrentWorkPeriodQuery(undefined, {
    skip: isOwner,
  });

  const branchId = (user as any)?.branchId || (companyContext as any)?.branchId || '';
  const companyId = (user as any)?.companyId || (companyContext as any)?.companyId || '';

  // POS Settings (tax, service charge)
  const { data: posSettings } = useGetPOSSettingsQuery(
    { branchId: user?.branchId || undefined },
    { skip: !branchId }
  );
  const taxRate = posSettings?.taxRate ?? 0;
  const serviceChargeRate = posSettings?.serviceCharge ?? 0;

  // Product data
  const { data: productsData, isLoading: productsLoading, refetch: refetchProducts } = useGetPOSMenuItemsQuery({
    branchId: user?.branchId || undefined,
    isAvailable: true,
  });

  // Customer data
  const { data: customersData } = useGetCustomersQuery(
    { companyId, limit: 100 },
    { skip: !companyId }
  );
  const [triggerSearch, { data: searchResults }] = useLazySearchCustomersQuery();

  // Payment methods
  const { data: paymentMethods = [] } = useGetPaymentMethodsByBranchQuery(
    { companyId, branchId },
    { skip: !companyId || !branchId }
  );

  // Queue
  const [isQueueOpen, setIsQueueOpen] = useState(false);
  const { data: queueData, refetch: refetchQueue } = useGetPOSOrdersQuery(
    { branchId, limit: 25, page: 1 },
    { skip: !branchId }
  );
  const queueOrders = useMemo(() => (queueData as any)?.orders || [], [queueData]);

  // API mutations
  const [createOrder] = useCreatePOSOrderMutation();
  const [processPayment] = useProcessPaymentMutation();
  const [cancelOrder] = useCancelPOSOrderMutation();

  // Product state
  const products = useMemo(() => {
    const items = Array.isArray(productsData) ? productsData : [];
    return items.map((p: any) => ({
      id: p.id || p._id,
      name: p.name,
      price: p.price || 0,
      category: p.category?.name || '',
      image: p.image,
      images: p.images || [],
      barcode: p.barcode || p.sku || '',
      weightBased: p.weightBasedPricing || false,
      unitType: p.unitType || 'piece',
      stock: p.stock ?? null,
      stockStatus: p.stockStatus || (p.isOutOfStock ? 'out' : p.isLowStock ? 'low' : 'ok'),
      trackInventory: p.trackInventory || false,
    }));
  }, [productsData]);

  const categories = useMemo(() => {
    const cats = new Set(products.map(p => p.category).filter(Boolean));
    return ['all', ...Array.from(cats)];
  }, [products]);

  const [searchQuery, setSearchQuery] = useState('');
  const [barcodeInput, setBarcodeInput] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const scanIntervalRef = useRef<any>(null);

  const startCameraScan = async () => {
    if (!('BarcodeDetector' in window)) {
      toast.error('Camera scanning not supported in this browser. Use a USB scanner instead.');
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setIsScanning(true);
        const detector = new (window as any).BarcodeDetector({ formats: ['ean_13', 'ean_8', 'code_128', 'code_39', 'upc_a', 'upc_e'] });
        scanIntervalRef.current = setInterval(async () => {
          if (!videoRef.current || !isScanning) return;
          try {
            const barcodes = await detector.detect(videoRef.current);
            if (barcodes.length > 0) {
              const code = barcodes[0].rawValue;
              setBarcodeInput(code);
              stopCameraScan();
            }
          } catch {}
        }, 300);
      }
    } catch {
      toast.error('Camera access denied. Use a USB scanner instead.');
    }
  };

  const stopCameraScan = () => {
    setIsScanning(false);
    if (scanIntervalRef.current) clearInterval(scanIntervalRef.current);
    if (videoRef.current?.srcObject) {
      (videoRef.current.srcObject as MediaStream).getTracks().forEach(t => t.stop());
      videoRef.current.srcObject = null;
    }
  };
  const [selectedCategory, setSelectedCategory] = useState('all');

  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const matchSearch = !searchQuery || p.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchBarcode = !barcodeInput || p.barcode === barcodeInput;
      const matchCategory = selectedCategory === 'all' || p.category === selectedCategory;
      return (matchSearch || matchBarcode) && matchCategory;
    });
  }, [products, searchQuery, selectedCategory, barcodeInput]);

  // Auto-add by barcode scan
  useEffect(() => {
    if (!barcodeInput || barcodeInput.length < 3) return;
    const timer = setTimeout(() => {
      const found = products.find(p => p.barcode === barcodeInput);
      if (found) {
        addToCart(found);
        setBarcodeInput('');
        toast.success(`Added: ${found.name}`);
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [barcodeInput]);

  // Cart with localStorage persistence
  const [cart, setCart] = useState<CartItem[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('retail_cart');
        return saved ? JSON.parse(saved) : [];
      } catch { return []; }
    }
    return [];
  });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('retail_cart', JSON.stringify(cart));
    }
  }, [cart]);

  const addToCart = (product: any) => {
    // Prevent adding to cart if item tracks inventory and stock is 0 or less
    if (product.trackInventory && (product.stock === undefined || product.stock <= 0)) {
      toast.error(`${product.name} is out of stock!`);
      return;
    }

    setCart(prev => {
      const existing = prev.find(item => item.menuItemId === product.id);
      if (existing) {
        // Prevent exceeding available stock when incrementing quantity
        if (product.trackInventory && existing.quantity >= (product.stock || 0)) {
          toast.error(`Only ${product.stock} available in stock!`);
          return prev;
        }

        return prev.map(item =>
          item.menuItemId === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [...prev, {
        id: Date.now().toString(),
        menuItemId: product.id,
        name: product.name,
        price: product.price,
        quantity: 1,
        category: product.category,
        barcode: product.barcode,
        weightBased: product.weightBased,
        unitType: product.unitType,
      }];
    });
  };

  const removeFromCart = (itemId: string) => {
    setCart(prev => prev.filter(item => item.id !== itemId));
  };

  const updateQuantity = (itemId: string, delta: number) => {
    setCart(prev => {
      const item = prev.find(i => i.id === itemId);
      if (!item) return prev;
      
      const newQty = item.quantity + delta;
      if (newQty <= 0) return prev.filter(i => i.id !== itemId);

      const product = products.find(p => p.id === item.menuItemId);
      if (product && product.trackInventory && delta > 0 && newQty > (product.stock || 0)) {
        toast.error(`Only ${product.stock} available in stock!`);
        return prev;
      }

      return prev.map(i => i.id === itemId ? { ...i, quantity: newQty } : i);
    });
  };

  const cartSubtotal = useMemo(() => cart.reduce((sum, i) => sum + i.price * i.quantity, 0), [cart]);
  const cartTax = useMemo(() => (cartSubtotal * taxRate) / 100, [cartSubtotal, taxRate]);
  const cartServiceCharge = useMemo(() => (cartSubtotal * serviceChargeRate) / 100, [cartSubtotal, serviceChargeRate]);

  // Discount state
  const [discountType, setDiscountType] = useState<'none' | 'percentage' | 'flat'>('none');
  const [discountValue, setDiscountValue] = useState<string>('');
  const [discountReason, setDiscountReason] = useState<string>('');

  // Customer State
  const [customerInfo, setCustomerInfo] = useState({ name: '', phone: '', email: '' });
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [customerSearch, setCustomerSearch] = useState('');
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);

  const [useLoyaltyPoints, setUseLoyaltyPoints] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('retail_useLoyaltyPoints') === 'true';
    }
    return false;
  });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('retail_useLoyaltyPoints', useLoyaltyPoints.toString());
    }
  }, [useLoyaltyPoints]);

  const { data: selectedCustomer } = useGetCustomerByIdQuery(selectedCustomerId, {
    skip: !selectedCustomerId,
  });

  const loyaltyRedemption = useMemo(() => {
    if (!selectedCustomer || !selectedCustomerId) {
      return { pointsRedeemed: 0, discount: 0 };
    }
    const MIN_ORDER_AMOUNT = 1000;
    const POINTS_PER_DISCOUNT = 2000;
    const DISCOUNT_AMOUNT = 20;
    const availablePoints = selectedCustomer.loyaltyPoints || 0;
    if (cartSubtotal < MIN_ORDER_AMOUNT) {
      return { pointsRedeemed: 0, discount: 0 };
    }
    const discountBlocks = Math.floor(availablePoints / POINTS_PER_DISCOUNT);
    if (discountBlocks > 0) {
      const maxDiscount = discountBlocks * DISCOUNT_AMOUNT;
      const discount = Math.min(maxDiscount, cartSubtotal);
      const blocksToRedeem = Math.floor(discount / DISCOUNT_AMOUNT);
      const pointsRedeemed = blocksToRedeem * POINTS_PER_DISCOUNT;
      return { pointsRedeemed, discount };
    }
    return { pointsRedeemed: 0, discount: 0 };
  }, [selectedCustomer, selectedCustomerId, cartSubtotal]);

  const loyaltyDiscount = useLoyaltyPoints ? (loyaltyRedemption.discount || 0) : 0;

  const discountAmount = useMemo(() => {
    const val = parseFloat(discountValue) || 0;
    if (discountType === 'percentage') return Math.min((cartSubtotal * val) / 100, cartSubtotal);
    if (discountType === 'flat') return Math.min(val, cartSubtotal);
    return 0;
  }, [discountType, discountValue, cartSubtotal]);

  const cartTotal = useMemo(
    () => Math.max(0, cartSubtotal + cartTax + cartServiceCharge - discountAmount - loyaltyDiscount),
    [cartSubtotal, cartTax, cartServiceCharge, discountAmount, loyaltyDiscount],
  );

  const clearCart = () => {
    setCart([]);
    setCustomerInfo({ name: '', phone: '', email: '' });
    setSelectedCustomerId('');
    setDiscountType('none');
    setDiscountValue('');
    setDiscountReason('');
    setUseLoyaltyPoints(false);
    if (typeof window !== 'undefined') {
      localStorage.removeItem('retail_cart');
      localStorage.removeItem('retail_useLoyaltyPoints');
    }
  };

  // Customer Data

  const customers = useMemo(() => {
    const list = (customersData as any)?.customers || customersData || [];
    return Array.isArray(list) ? list : [];
  }, [customersData]);

  const displayedCustomers = useMemo(() => {
    if (searchResults) {
      const r = (searchResults as any)?.customers || searchResults || [];
      return Array.isArray(r) ? r : [];
    }
    if (customerSearch) {
      return customers.filter((c: any) => {
        const name = `${c.firstName || ''} ${c.lastName || ''}`.toLowerCase();
        return name.includes(customerSearch.toLowerCase()) ||
          (c.phone || '').includes(customerSearch);
      });
    }
    return customers.slice(0, 20);
  }, [customers, customerSearch, searchResults]);

  useEffect(() => {
    if (customerSearch.length >= 2) {
      triggerSearch({ query: customerSearch, companyId });
    }
  }, [customerSearch]);

  // Payment
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [amountReceived, setAmountReceived] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [saleSuccess, setSaleSuccess] = useState<{ orderId: string; orderNumber: string; total: number; change: number } | null>(null);
  const [currentOrderId, setCurrentOrderId] = useState('');
  const [paymentMode, setPaymentMode] = useState<'checkout' | 'collect'>('checkout');
  const [collectOrderData, setCollectOrderData] = useState<any>(null);

  const { data: receiptHTML, isFetching: receiptLoading } = useGetReceiptHTMLQuery(currentOrderId, {
    skip: !currentOrderId,
  });
  const [printReceipt] = usePrintReceiptMutation();

  const cashMethod = paymentMethods.find(m => m.code === 'cash');
  const isCash = paymentMethod === 'cash';

  const received = parseFloat(amountReceived || '0');

  const due = useMemo(() => {
    if (!isCash) return 0;
    return Math.max(0, cartTotal - received);
  }, [cartTotal, received, isCash]);

  const change = useMemo(() => {
    if (!isCash) return 0;
    return Math.max(0, received - cartTotal);
  }, [received, cartTotal, isCash]);

  const handleCheckout = async () => {
    if (isProcessing) return;

    // Collect mode - collecting on existing order
    if (paymentMode === 'collect' && collectOrderData) {
      setIsProcessing(true);
      try {
        const amt = parseFloat(amountReceived || '0');
        await processPayment({
          orderId: collectOrderData.id || collectOrderData._id,
          amount: amt,
          method: paymentMethod,
          amountReceived: amt,
          changeDue: 0,
        }).unwrap();
        toast.success('Payment collected');
        setIsPaymentOpen(false);
        setPaymentMode('checkout');
        setCollectOrderData(null);
        refetchQueue();
      } catch (e: any) { toast.error(e?.data?.message || 'Failed'); }
      finally { setIsProcessing(false); }
      return;
    }

    // Checkout mode
    if (cart.length === 0) return;
    if (isCash && (!Number.isFinite(received) || received <= 0)) {
      toast.error('Enter the amount received');
      return;
    }

    const isFullPayment = !isCash || received >= cartTotal;

    setIsProcessing(true);

    try {
      const orderData = {
        orderType: 'counter_sale' as any,
        items: cart.map(item => ({
          menuItemId: item.menuItemId,
          quantity: item.quantity,
          price: item.price,
        })),
        subtotal: cartSubtotal,
        taxRate: taxRate,
        taxAmount: cartTax,
        serviceChargeRate: serviceChargeRate,
        serviceChargeAmount: cartServiceCharge,
        totalAmount: cartTotal,
        status: isFullPayment ? 'paid' as const : 'pending' as const,
        paymentMethod: paymentMethod,
        amountReceived: isCash ? received : cartTotal,
        changeDue: isCash ? change : 0,
        ...(selectedCustomerId ? { customerId: selectedCustomerId } : {}),
        customerInfo,
        // Discount data
        ...(discountAmount > 0 ? {
          discountType,
          discountValue: parseFloat(discountValue) || 0,
          discountAmount,
          discountReason: discountReason || undefined,
        } : {}),
        // Loyalty data
        ...(selectedCustomerId && useLoyaltyPoints && loyaltyRedemption.pointsRedeemed > 0
          ? {
              loyaltyPointsRedeemed: loyaltyRedemption.pointsRedeemed,
              loyaltyDiscount: loyaltyRedemption.discount,
            }
          : {}),
      };

      const response: any = await createOrder(orderData as any).unwrap();
      const order = response?.data || response;
      const orderId = order?.id || order?._id;

      if (!orderId) throw new Error('Order creation failed');

      if (!isFullPayment && received > 0) {
        await processPayment({
          orderId,
          amount: Math.min(received, cartTotal),
          method: paymentMethod,
          amountReceived: received,
          changeDue: change,
        }).unwrap();
      }

      toast.success(`Order #${order.orderNumber || orderId} completed`);
      setSaleSuccess({ orderId, orderNumber: order.orderNumber || orderId, total: cartTotal, change });
      setCurrentOrderId(orderId);
      clearCart();
      setIsPaymentOpen(false);
      refetchQueue();
      refetchProducts(); // Auto-refresh products to reflect updated inventory stock immediately
    } catch (error: any) {
      toast.error(error?.data?.message || 'Checkout failed');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCancelOrder = async (orderId: string) => {
    if (!confirm('Cancel this order?')) return;
    try {
      await cancelOrder({ id: orderId, reason: 'Cancelled' }).unwrap();
      refetchQueue();
    } catch (error: any) {
      toast.error(error?.data?.message || 'Cancel failed');
    }
  };

  // Cleanup camera on unmount
  useEffect(() => {
    return () => stopCameraScan();
  }, []);

  // Sidebar collapse
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  useEffect(() => {
    const handleToggle = (e: CustomEvent) => setSidebarCollapsed(e.detail.collapsed);
    window.addEventListener('sidebar-toggle', handleToggle as EventListener);
    return () => window.removeEventListener('sidebar-toggle', handleToggle as EventListener);
  }, []);

  // Mobile cart toggle
  const [showMobileCart, setShowMobileCart] = useState(false);

  // Keyboard shortcuts
  const [showKeyboardShortcuts, setShowKeyboardShortcuts] = useState(false);
  const DEFAULT_SHORTCUTS = {
    toggleQueue: 'F1',
    openPayment: 'F12',
    closeAll: 'Escape',
    showShortcuts: '?',
  };
  const [shortcuts, setShortcuts] = useState(() => {
    if (typeof window === 'undefined') return DEFAULT_SHORTCUTS;
    try {
      const saved = localStorage.getItem('retail_pos_shortcuts');
      return saved ? { ...DEFAULT_SHORTCUTS, ...JSON.parse(saved) } : DEFAULT_SHORTCUTS;
    } catch { return DEFAULT_SHORTCUTS; }
  });

  const saveShortcuts = (updated: typeof shortcuts) => {
    setShortcuts(updated);
    if (typeof window !== 'undefined') {
      localStorage.setItem('retail_pos_shortcuts', JSON.stringify(updated));
    }
  };

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes((event.target as HTMLElement).tagName)) {
        if (event.key === 'Escape') {
          (event.target as HTMLElement).blur();
        }
        return;
      }
      const key = event.key;
      if ((event.ctrlKey || event.metaKey) && key === '/') { event.preventDefault(); setShowKeyboardShortcuts(prev => !prev); return; }
      if (key === shortcuts.toggleQueue) { event.preventDefault(); setIsQueueOpen(prev => !prev); return; }
      if (key === shortcuts.closeAll) { event.preventDefault(); setIsPaymentOpen(false); setShowKeyboardShortcuts(false); setIsCustomerModalOpen(false); setIsQueueOpen(false); return; }
      if (key === shortcuts.openPayment && cart.length > 0) { event.preventDefault(); setPaymentMode('checkout'); setIsPaymentOpen(true); setAmountReceived(cartTotal.toFixed(2)); return; }
      if (key === shortcuts.showShortcuts) { event.preventDefault(); setShowKeyboardShortcuts(prev => !prev); return; }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [cart.length, shortcuts, cartTotal]);

  // Work period lock
  if (!isOwner && !workPeriodLoading && !activeWorkPeriod) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-slate-950">
        <Card className="max-w-md w-full mx-4">
          <CardContent className="p-8 text-center space-y-4">
            <LockClosedIcon className="w-16 h-16 text-red-500 mx-auto" />
            <h2 className="text-2xl font-bold">POS Terminal Locked</h2>
            <p className="text-gray-600 dark:text-gray-400">
              No active work period. Start one from Work Periods.
            </p>
            <Button className="w-full" onClick={() => window.location.href = '/dashboard/work-periods'}>
              Go to Work Periods
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Customer selection modal
  const renderCustomerModal = () => (
    <Modal isOpen={isCustomerModalOpen} onClose={() => setIsCustomerModalOpen(false)} title="Select Customer" size="md">
      <div className="space-y-3">
        <Input
          placeholder="Search customers..."
          value={customerSearch}
          onChange={(e) => setCustomerSearch(e.target.value)}
        />
        <div className="max-h-64 overflow-y-auto space-y-1">
          {displayedCustomers.map((c: any) => (
            <button
              key={c.id || c._id}
              onClick={() => {
                setSelectedCustomerId(c.id || c._id);
                setCustomerInfo({
                  name: `${c.firstName || ''} ${c.lastName || ''}`.trim(),
                  phone: c.phone || '',
                  email: c.email || '',
                });
                setIsCustomerModalOpen(false);
              }}
              className={cn(
                "w-full text-left px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 text-sm",
                selectedCustomerId === (c.id || c._id) && "bg-blue-50 dark:bg-blue-900/20"
              )}
            >
              <div className="font-medium">{c.firstName} {c.lastName}</div>
              {c.phone && <div className="text-xs text-gray-500">{c.phone}</div>}
            </button>
          ))}
        </div>
      </div>
    </Modal>
  );

  return (
    <div className={cn(
      "fixed inset-0 top-16 z-0 flex flex-col lg:flex-row bg-gray-50 dark:bg-slate-950 text-gray-900 dark:text-slate-100 transition-all duration-300",
      sidebarCollapsed ? "left-0 lg:left-16" : "left-0 lg:left-64"
    )}>
      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <OfflineBanner
          isOfflineReady={isOfflineReady}
          isSyncing={isPrefetchSyncing}
          lastSyncedAt={lastSyncedAt}
          pendingCount={pendingCount}
          syncErrors={syncErrors}
          onSyncNow={() => { syncNow(true); syncOrders(); }}
        />
        {/* Top bar */}
        <div className="relative bg-white dark:bg-slate-950 border-b border-gray-200 dark:border-slate-800 px-4 py-2 flex items-center gap-3 z-20">
          <div className="flex items-center gap-2 bg-amber-50 dark:bg-amber-900/20 rounded-lg px-3 h-9 border border-amber-200 dark:border-amber-800">
            <QrCodeIcon className="h-4 w-4 text-amber-600" />
            <Input
              value={barcodeInput}
              onChange={(e) => setBarcodeInput(e.target.value)}
              placeholder="Scan barcode..."
              className="h-8 w-48 text-sm font-mono bg-transparent border-none focus:ring-0"
              autoFocus
            />
            <button
              onClick={isScanning ? stopCameraScan : startCameraScan}
              className={isScanning ? 'text-red-500' : 'text-gray-400 hover:text-amber-600'}
              title={isScanning ? 'Stop camera' : 'Scan with camera'}
            >
              <CameraIcon className="h-4 w-4" />
            </button>
            {isScanning && (
              <span className="flex items-center gap-1 text-[10px] text-amber-600 font-bold animate-pulse">
                <span className="w-1.5 h-1.5 bg-amber-500 rounded-full" />
                Scanning
              </span>
            )}
          </div>
          {isScanning && (
            <video ref={videoRef} autoPlay playsInline className="absolute top-12 left-0 w-64 h-48 rounded-xl border-2 border-amber-400 object-cover z-50 shadow-2xl" />
          )}

          <div className="relative flex-1 max-w-md">
            <MagnifyingGlassIcon className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search products..."
              className="pl-9 h-9 bg-gray-50 dark:bg-slate-900 border-none rounded-xl text-sm"
            />
          </div>

          <div className="flex items-center gap-2 bg-gray-50 dark:bg-slate-900 rounded-xl px-3 h-9 border">
            <FunnelIcon className="h-3.5 w-3.5 text-gray-400" />
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="bg-transparent text-xs font-bold uppercase text-gray-600 dark:text-gray-300 focus:outline-none"
            >
              {categories.map(cat => (
                <option key={cat} value={cat}>{cat === 'all' ? 'All' : cat}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-3 ml-auto">
            <span className="text-xs text-gray-400">
              {products.length} products
            </span>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => { syncNow(true); syncOrders(); }}
              disabled={isPrefetchSyncing}
              className={cn(
                "h-9 w-9 p-0 rounded-lg border-none bg-gray-50 dark:bg-slate-900 text-slate-500 border border-gray-200 dark:border-slate-800",
                isPrefetchSyncing && "animate-spin text-sky-500"
              )}
              title="Sync Data"
            >
              <ArrowPathIcon className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Product grid */}
        <div className="flex-1 overflow-y-auto p-4">
          {productsLoading ? (
            <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
              {[...Array(12)].map((_, i) => (
                <div key={i} className="animate-pulse bg-gray-200 dark:bg-slate-800 rounded-2xl h-40" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
              {filteredProducts.map(product => {
                const cartQty = cart.find(item => item.menuItemId === product.id)?.quantity || 0;
                return (
                <button
                  key={product.id}
                  onClick={() => addToCart(product)}
                  className="group bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-800 p-3 text-left hover:shadow-lg hover:border-blue-300 dark:hover:border-blue-700 transition-all active:scale-95 relative"
                >
                  <div className="aspect-square bg-gray-50 dark:bg-slate-800 rounded-xl mb-2 flex items-center justify-center text-3xl group-hover:scale-105 transition-transform relative overflow-hidden">
                    {(product.image || (product.images && product.images.length > 0)) ? (
                      <img
                        src={product.image || product.images[0]}
                        alt={product.name}
                        className="w-full h-full object-cover rounded-xl"
                        loading="lazy"
                      />
                    ) : (
                      <span className="text-2xl font-black text-gray-300 dark:text-slate-600">
                        {product.name?.charAt(0)?.toUpperCase() || '?'}
                      </span>
                    )}
                    {cartQty > 0 && (
                      <span className="absolute -top-1 -right-1 bg-emerald-600 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center shadow">
                        {cartQty}
                      </span>
                    )}
                    {product.stock != null && product.stock <= 0 && product.trackInventory && (
                      <div className="absolute inset-0 bg-black/50 rounded-xl flex items-center justify-center">
                        <span className="text-xs font-bold text-white bg-red-600 px-2 py-1 rounded">OUT OF STOCK</span>
                      </div>
                    )}
                  </div>
                  <div className="text-sm font-bold truncate group-hover:text-blue-600 dark:group-hover:text-blue-400">
                    {product.name}
                  </div>
                  <div className="text-xs text-gray-500 truncate">{product.category}</div>
                  <div className="text-sm font-black text-blue-600 dark:text-blue-400 mt-1">
                    {formatCurrency(product.price)}
                    {product.weightBased && <span className="text-xs text-gray-400 ml-1">/{product.unitType}</span>}
                  </div>
                  {product.trackInventory && product.stock != null && (
                    <div className={`text-[10px] font-bold mt-0.5 ${
                      product.stockStatus === 'out' ? 'text-red-500' :
                      product.stockStatus === 'low' ? 'text-amber-500' :
                      'text-green-600'
                    }`}>
                      Stock: {product.stock} {product.stock === 0 ? '— Out' : product.stock < 5 ? '— Low' : ''}
                    </div>
                  )}
                  {product.barcode && (
                    <div className="text-[10px] text-gray-400 mt-0.5 font-mono">{product.barcode}</div>
                  )}
                </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Cart sidebar */}
      <div className={cn(
        "border-l border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-950 flex flex-col",
        "fixed inset-y-0 top-16 right-0 w-full sm:w-[400px] lg:relative lg:top-0 lg:w-[380px] z-30 lg:z-0 transition-transform lg:transition-none",
        showMobileCart ? "translate-x-0" : "translate-x-full lg:translate-x-0"
      )}>
        {/* Cart header */}
        <div className="px-4 py-3 border-b border-gray-200 dark:border-slate-800 flex items-center justify-between">
          <div>
            <h3 className="font-bold text-lg flex items-center gap-2">
              <ShoppingBagIcon className="h-5 w-5" />
              Cart ({cart.length})
            </h3>
            <div className="text-xs text-gray-500">{cart.reduce((s, i) => s + i.quantity, 0)} items</div>
          </div>
          {cart.length > 0 && (
            <button onClick={clearCart} className="text-xs text-red-500 hover:text-red-700 font-bold">
              Clear
            </button>
          )}
          <button onClick={() => setShowMobileCart(false)} className="lg:hidden text-gray-400 hover:text-gray-600">
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>

        {/* Cart items */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {cart.length === 0 ? (
            <div className="text-center text-gray-400 py-12">
              <ShoppingBagIcon className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p>Cart is empty</p>
            </div>
          ) : (
            cart.map(item => (
              <div key={item.id} className="flex items-center gap-3 bg-gray-50 dark:bg-slate-900 rounded-xl p-2.5">
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-bold truncate">{item.name}</div>
                  <div className="text-xs text-gray-500">
                    {formatCurrency(item.price)} × {item.quantity}
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={() => updateQuantity(item.id, -1)} className="p-1 hover:bg-gray-200 dark:hover:bg-slate-700 rounded">
                    <MinusIcon className="h-3.5 w-3.5" />
                  </button>
                  <span className="text-sm font-bold w-6 text-center">{item.quantity}</span>
                  <button onClick={() => updateQuantity(item.id, 1)} className="p-1 hover:bg-gray-200 dark:hover:bg-slate-700 rounded">
                    <PlusIcon className="h-3.5 w-3.5" />
                  </button>
                  <button onClick={() => removeFromCart(item.id)} className="p-1 hover:bg-red-100 dark:hover:bg-red-900/30 rounded ml-1">
                    <TrashIcon className="h-3.5 w-3.5 text-red-500" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Cart footer */}
        <div className="border-t border-gray-200 dark:border-slate-800 p-4 space-y-3">
          {/* Customer */}
          <button
            onClick={() => setIsCustomerModalOpen(true)}
            className="w-full flex items-center gap-2 px-3 py-2 bg-gray-50 dark:bg-slate-900 rounded-xl text-sm hover:bg-gray-100 dark:hover:bg-slate-800"
          >
            <UserCircleIcon className="h-4 w-4 text-gray-400" />
            {selectedCustomerId ? (
              <span className="font-medium">{customerInfo.name || 'Customer'}</span>
            ) : (
              <span className="text-gray-500">Add customer (optional)</span>
            )}
          </button>

          {/* Loyalty Section */}
          {selectedCustomer && (
            <div className="rounded-xl bg-gradient-to-br from-indigo-500 via-purple-500 to-fuchsia-500 p-3 text-white shadow-md relative overflow-hidden group">
              <div className="absolute -right-4 -top-4 h-16 w-16 rounded-full bg-white/10 blur-xl group-hover:bg-white/20 transition-all duration-500" />
              <div className="relative z-10">
                <div className="flex justify-between items-center mb-2">
                  <div className="flex items-center gap-1.5">
                    <StarIcon className={cn("h-4 w-4", 
                      selectedCustomer.tier === 'platinum' ? 'text-cyan-300' : 
                      selectedCustomer.tier === 'gold' ? 'text-yellow-300' : 
                      selectedCustomer.tier === 'silver' ? 'text-gray-300' : 'text-orange-300'
                    )} />
                    <span className="font-bold text-sm capitalize">{selectedCustomer.tier || 'Bronze'}</span>
                  </div>
                  <span className="text-xs font-black bg-black/20 px-2 py-0.5 rounded-full">
                    {selectedCustomer.loyaltyPoints?.toLocaleString() || 0} pts
                  </span>
                </div>
                {loyaltyRedemption.pointsRedeemed > 0 && (
                  <div className="flex justify-between items-center bg-black/20 rounded-lg p-2 mt-2 backdrop-blur-sm">
                    <div>
                      <p className="text-[10px] text-white/80">Redeem {loyaltyRedemption.pointsRedeemed} pts</p>
                      <p className="text-xs font-bold text-emerald-300">Save {formatCurrency(loyaltyRedemption.discount)}</p>
                    </div>
                    <button
                      onClick={() => setUseLoyaltyPoints(!useLoyaltyPoints)}
                      className={cn(
                        "relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none",
                        useLoyaltyPoints ? 'bg-emerald-400' : 'bg-white/20'
                      )}
                    >
                      <span className={cn("pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out", useLoyaltyPoints ? 'translate-x-4' : 'translate-x-0')} />
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Total */}
          <div className="space-y-1 text-sm">
            <div className="flex justify-between text-gray-500">
              <span>Subtotal</span>
              <span>{formatCurrency(cartSubtotal)}</span>
            </div>
            {(taxRate > 0 || cartTax > 0) && (
              <div className="flex justify-between text-gray-500">
                <span>Tax ({taxRate}%)</span>
                <span>{formatCurrency(cartTax)}</span>
              </div>
            )}
            {(serviceChargeRate > 0 || cartServiceCharge > 0) && (
              <div className="flex justify-between text-gray-500">
                <span>Service Charge ({serviceChargeRate}%)</span>
                <span>{formatCurrency(cartServiceCharge)}</span>
              </div>
            )}
            {/* Discount Section */}
            <div className="border-t border-dashed pt-2 mt-1 space-y-1.5">
              <div className="flex items-center gap-1.5">
                <select
                  value={discountType}
                  onChange={(e) => setDiscountType(e.target.value as any)}
                  className="text-xs bg-gray-100 dark:bg-slate-800 border-none rounded px-1.5 py-1 text-gray-700 dark:text-gray-300 flex-shrink-0"
                >
                  <option value="none">No Discount</option>
                  <option value="percentage">% Discount</option>
                  <option value="flat">Flat Discount</option>
                </select>
                {discountType !== 'none' && (
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={discountValue}
                    onChange={(e) => setDiscountValue(e.target.value)}
                    placeholder={discountType === 'percentage' ? '10' : '50'}
                    className="text-xs bg-gray-100 dark:bg-slate-800 border-none rounded px-1.5 py-1 w-16 text-right text-gray-700 dark:text-gray-300"
                  />
                )}
              </div>
              {discountType !== 'none' && (
                <input
                  type="text"
                  value={discountReason}
                  onChange={(e) => setDiscountReason(e.target.value)}
                  placeholder="Reason (optional)"
                  className="text-xs bg-gray-100 dark:bg-slate-800 border-none rounded px-1.5 py-1 w-full text-gray-700 dark:text-gray-300"
                />
              )}
              {discountAmount > 0 && (
                <div className="flex justify-between text-red-500 font-medium">
                  <span>Discount {discountType === 'percentage' ? `(${discountValue}%)` : ''}</span>
                  <span>-{formatCurrency(discountAmount)}</span>
                </div>
              )}
              {loyaltyDiscount > 0 && (
                <div className="flex justify-between text-emerald-500 font-medium">
                  <span>Loyalty Discount</span>
                  <span>-{formatCurrency(loyaltyDiscount)}</span>
                </div>
              )}
            </div>
            <div className="flex justify-between items-center text-lg font-bold border-t pt-1">
              <span>Total</span>
              <span className="font-black text-xl text-blue-600 dark:text-blue-400">
                {formatCurrency(cartTotal)}
              </span>
            </div>
          </div>

          {/* Checkout */}
          <Button
            variant="primary"
            onClick={() => {
              if (cart.length === 0) return;
              setPaymentMode('checkout');
              setIsPaymentOpen(true);
              setAmountReceived(cartTotal.toFixed(2));
            }}
            disabled={cart.length === 0}
            className="w-full h-12 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-base"
          >
            <CreditCardIcon className="h-5 w-5 mr-2" />
            Checkout
          </Button>

          {/* Queue and Shortcuts */}
          <div className="flex gap-2">
            <Button
              variant="secondary"
              onClick={() => setIsQueueOpen(true)}
              className="flex-1 h-10 rounded-xl text-xs font-bold uppercase"
            >
              Orders ({queueOrders.length})
              <span className="ml-2 px-1.5 py-0.5 bg-gray-200 dark:bg-slate-700 rounded text-[10px] text-gray-500 hidden sm:inline">{shortcuts.toggleQueue}</span>
            </Button>
            <Button
              variant="ghost"
              onClick={() => setShowKeyboardShortcuts(true)}
              className="h-10 px-3 rounded-xl border-gray-200 dark:border-slate-800"
              title="Keyboard Shortcuts (Ctrl+/)"
            >
              <CommandLineIcon className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </div>

      {/* Sale Receipt */}
      <Modal isOpen={!!saleSuccess} onClose={() => setSaleSuccess(null)} title="Receipt" size="md">
        {saleSuccess && (
          <div className="space-y-4">
            <div className="text-center py-2 border-b">
              <div className="text-sm text-gray-500">Order</div>
              <div className="text-2xl font-black">#{saleSuccess.orderNumber}</div>
              {saleSuccess.change > 0 && (
                <div className="text-sm font-bold text-emerald-600 mt-1">
                  Change: {formatCurrency(saleSuccess.change)}
                </div>
              )}
            </div>
            {receiptHTML?.html ? (
              <div dangerouslySetInnerHTML={{ __html: receiptHTML.html }} />
            ) : receiptLoading ? (
              <div className="text-center py-4 text-gray-400">Loading receipt...</div>
            ) : (
              <div className="text-center py-2 text-gray-500 text-sm">
                Receipt generation in progress...
              </div>
            )}
            <div className="flex gap-2">
              <Button variant="secondary" className="flex-1" onClick={async () => {
                try { await printReceipt({ orderId: saleSuccess.orderId }).unwrap(); toast.success('Receipt printed'); } catch {}
              }}>
                Print Receipt
              </Button>
              <Button className="flex-1" onClick={() => setSaleSuccess(null)}>Close</Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Payment Modal */}
      <Modal isOpen={isPaymentOpen} onClose={() => { setIsPaymentOpen(false); setPaymentMode('checkout'); }} title={paymentMode === 'collect' ? 'Collect Payment' : 'Payment'} size="sm">
        <div className="space-y-4">
          <div className="text-center py-2">
            {paymentMode === 'collect' && collectOrderData ? (
              <>
                <div className="text-sm text-gray-500">Order #{collectOrderData.orderNumber}</div>
                <div className="text-2xl font-black">{formatCurrency(collectOrderData.totalAmount || collectOrderData.total || 0)}</div>
                <div className="text-xs text-gray-500">Paid: {formatCurrency(collectOrderData.paidAmount || 0)}</div>
                <div className="text-sm font-bold text-amber-600">Due: {formatCurrency((collectOrderData.remainingAmount || (collectOrderData.totalAmount || collectOrderData.total || 0) - (collectOrderData.paidAmount || 0)))}</div>
              </>
            ) : (
              <>
                <div className="text-3xl font-black">{formatCurrency(cartTotal)}</div>
                <div className="text-xs text-gray-500">{cart.length} items in cart</div>
              </>
            )}
          </div>

          <div>
            <label className="block text-xs font-bold mb-2 text-gray-600">Payment Method</label>
            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
              className="w-full rounded-xl border p-2.5 text-sm"
            >
              {paymentMethods.map(m => (
                <option key={m.code} value={m.code}>{m.displayName || m.name}</option>
              ))}
            </select>
          </div>

          {isCash && (
            <div>
              <label className="block text-xs font-bold mb-2 text-gray-600">Amount Received</label>
              <Input
                type="number"
                value={amountReceived}
                onChange={(e) => setAmountReceived(e.target.value)}
                className="text-lg font-bold"
              />
              {change > 0 && (
                <div className="text-sm font-bold text-emerald-600 mt-1">
                  Change: {formatCurrency(change)}
                </div>
              )}
              {isCash && due > 0 && (
                <div className="text-sm font-bold text-amber-600 mt-1">
                  Due: {formatCurrency(due)}
                </div>
              )}
            </div>
          )}

          <div className="flex gap-3 pt-3">
            <Button variant="ghost" onClick={() => setIsPaymentOpen(false)} className="flex-1">
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleCheckout}
              disabled={isProcessing || (paymentMode === 'checkout' && (cart.length === 0 || cartTotal <= 0))}
              className="flex-1 bg-emerald-600 hover:bg-emerald-500"
            >
              {isProcessing ? 'Processing...' : isCash ? 'Complete Sale' : `Charge ${formatCurrency(cartTotal)}`}
            </Button>
        </div>
      </div>
      </Modal>

      {/* Queue Modal */}
      <Modal isOpen={isQueueOpen} onClose={() => setIsQueueOpen(false)} title="Orders Queue" size="lg">
        <div className="space-y-2">
          {queueOrders.length === 0 ? (
            <div className="text-center text-gray-400 py-8">No orders</div>
          ) : (
            queueOrders.map((order: any) => (
              <div key={order.id || order._id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-slate-900 rounded-xl">
                <div>
                  <div className="font-bold text-sm">#{order.orderNumber}</div>
                  <div className="text-xs text-gray-500">{formatDateTime(order.createdAt)}</div>
                  <div className="text-xs text-gray-500">
                    {order.items?.length || 0} lines, {order.items?.reduce((s: number, i: any) => s + (i.quantity || 1), 0) || 0} items
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div>
                    <div className="font-bold text-sm">{formatCurrency(order.totalAmount || order.total || 0)}</div>
                    {order.status === 'pending' && (
                      <div className="text-[10px] text-amber-600 font-bold">
                        Due: {formatCurrency(order.remainingAmount || (order.totalAmount - (order.paidAmount || 0)))}
                      </div>
                    )}
                  </div>
                  <Badge className={order.status === 'paid' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}>
                    {order.status}
                  </Badge>
                  {(order.paymentStatus === 'partial' || order.status === 'pending') && (
                    <button
                      onClick={() => {
                        const due = order.remainingAmount || ((order.totalAmount || order.total || 0) - (order.paidAmount || 0));
                        const orderTotal = order.totalAmount || order.total || 0;
                        setAmountReceived(due > 0 ? due.toFixed(2) : orderTotal.toFixed(2));
                        setPaymentMethod('cash');
                        setPaymentMode('collect');
                        setCollectOrderData(order);
                        setIsQueueOpen(false);
                        setIsPaymentOpen(true);
                      }}
                      className="text-[10px] font-bold bg-amber-100 dark:bg-amber-900/30 text-amber-700 px-2 py-1 rounded hover:bg-amber-200"
                    >
                      Collect
                    </button>
                  )}
                  <button onClick={() => handleCancelOrder(order.id || order._id)} className="text-red-500 hover:text-red-700" title="Cancel">
                    <XMarkIcon className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </Modal>

      {renderCustomerModal()}

      {/* Mobile floating cart button */}
      {!showMobileCart && (
        <button
          onClick={() => setShowMobileCart(true)}
          className="lg:hidden fixed bottom-4 right-4 z-50 bg-emerald-600 text-white rounded-full w-14 h-14 shadow-lg flex items-center justify-center hover:bg-emerald-500 active:scale-95"
        >
          <ShoppingBagIcon className="h-6 w-6" />
          {cart.length > 0 && (
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
              {cart.reduce((s, i) => s + i.quantity, 0)}
            </span>
          )}
        </button>
      )}

      {/* Keyboard Shortcuts Modal */}
      <Modal
        isOpen={showKeyboardShortcuts}
        onClose={() => setShowKeyboardShortcuts(false)}
        title="Keyboard Shortcuts"
        size="md"
      >
        <div className="space-y-4">
          <div className="bg-amber-50 dark:bg-amber-900/20 p-3 rounded-xl border border-amber-100 dark:border-amber-800 text-sm text-amber-800 dark:text-amber-200 mb-4">
            Click any key badge below, then press your desired key to reassign it.
          </div>
          <div className="space-y-3">
            {[
              { key: 'toggleQueue', label: 'Toggle Orders Queue', shortcut: shortcuts.toggleQueue },
              { key: 'openPayment', label: 'Open Payment', shortcut: shortcuts.openPayment },
              { key: 'closeAll', label: 'Close All Modals', shortcut: shortcuts.closeAll },
              { key: 'showShortcuts', label: 'Show This Help', shortcut: shortcuts.showShortcuts },
            ].map(({ key, label, shortcut }) => (
              <div key={key} className="flex justify-between items-center p-2 hover:bg-gray-50 dark:hover:bg-slate-800 rounded-lg">
                <span className="text-sm font-medium">{label}</span>
                <button
                  className="px-2 py-1 bg-gray-100 dark:bg-slate-700 hover:bg-amber-100 dark:hover:bg-amber-900/30 hover:border-amber-400 border border-transparent rounded text-xs font-mono font-bold transition-colors group relative"
                  onClick={() => {
                    const handleKey = (e: KeyboardEvent) => {
                      e.preventDefault();
                      const k = e.key;
                      saveShortcuts({ ...shortcuts, [key]: k });
                      window.removeEventListener('keydown', handleKey);
                      toast.success(`Shortcut mapped to ${k}`);
                    };
                    window.addEventListener('keydown', handleKey);
                  }}
                  title="Click to change shortcut"
                >
                  <span className="group-hover:hidden">{shortcuts[key as keyof typeof shortcuts]}</span>
                  <span className="hidden group-hover:inline text-amber-600">✎ Set</span>
                </button>
              </div>
            ))}
          </div>
          <div className="pt-4 border-t border-gray-100 dark:border-slate-800 mt-4 flex justify-between items-center">
            <span className="text-xs text-gray-500">Global: <kbd className="bg-gray-100 dark:bg-slate-800 px-1 rounded">Ctrl</kbd> + <kbd className="bg-gray-100 dark:bg-slate-800 px-1 rounded">/</kbd></span>
            <button
              className="text-xs text-blue-500 hover:text-blue-600"
              onClick={() => { saveShortcuts(DEFAULT_SHORTCUTS); toast.success('Shortcuts reset to defaults'); }}
            >
              Reset Defaults
            </button>
          </div>
        </div>
      </Modal>

    </div>
  );
}
