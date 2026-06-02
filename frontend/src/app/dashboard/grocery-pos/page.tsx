'use client';

import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { useFormatCurrency } from '@/hooks/useFormatCurrency';
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
} from '@heroicons/react/24/outline';
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

export default function GroceryPOSPage() {
  const { user, companyContext } = useAppSelector((state) => state.auth);
  const formatCurrency = useFormatCurrency();

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
  const { data: productsData, isLoading: productsLoading } = useGetPOSMenuItemsQuery({
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
      barcode: p.barcode || p.sku || '',
      weightBased: p.weightBasedPricing || false,
      unitType: p.unitType || 'piece',
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
        const saved = localStorage.getItem('grocery_cart');
        return saved ? JSON.parse(saved) : [];
      } catch { return []; }
    }
    return [];
  });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('grocery_cart', JSON.stringify(cart));
    }
  }, [cart]);

  const addToCart = (product: any) => {
    setCart(prev => {
      const existing = prev.find(item => item.menuItemId === product.id);
      if (existing) {
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
    setCart(prev => prev.map(item => {
      if (item.id !== itemId) return item;
      const newQty = item.quantity + delta;
      return newQty <= 0 ? null : { ...item, quantity: newQty };
    }).filter(Boolean) as CartItem[]);
  };

  const cartSubtotal = useMemo(() => cart.reduce((sum, i) => sum + i.price * i.quantity, 0), [cart]);
  const cartTax = useMemo(() => (cartSubtotal * taxRate) / 100, [cartSubtotal, taxRate]);
  const cartServiceCharge = useMemo(() => (cartSubtotal * serviceChargeRate) / 100, [cartSubtotal, serviceChargeRate]);
  const cartTotal = useMemo(() => cartSubtotal + cartTax + cartServiceCharge, [cartSubtotal, cartTax, cartServiceCharge]);

  const clearCart = () => {
    setCart([]);
    setCustomerInfo({ name: '', phone: '', email: '' });
    setSelectedCustomerId('');
    if (typeof window !== 'undefined') localStorage.removeItem('grocery_cart');
  };

  // Customer
  const [customerInfo, setCustomerInfo] = useState({ name: '', phone: '', email: '' });
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [customerSearch, setCustomerSearch] = useState('');
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);

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

  const { data: receiptHTML, isFetching: receiptLoading } = useGetReceiptHTMLQuery(currentOrderId, {
    skip: !currentOrderId,
  });
  const [printReceipt] = usePrintReceiptMutation();

  const cashMethod = paymentMethods.find(m => m.code === 'cash');
  const isCash = paymentMethod === 'cash';

  const change = useMemo(() => {
    if (!isCash) return 0;
    const received = parseFloat(amountReceived || '0');
    return Math.max(0, received - cartTotal);
  }, [amountReceived, cartTotal, isCash]);

  const handleCheckout = async () => {
    if (cart.length === 0) return;
    if (isProcessing) return;
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
        status: paymentMethod === 'cash' && parseFloat(amountReceived) >= cartTotal ? 'paid' as const : 'pending' as const,
        paymentMethod: paymentMethod,
        ...(selectedCustomerId ? { customerId: selectedCustomerId } : {}),
        customerInfo,
      };

      const response: any = await createOrder(orderData as any).unwrap();
      const order = response?.data || response;
      const orderId = order?.id || order?._id;

      if (!orderId) throw new Error('Order creation failed');

      if (paymentMethod !== 'cash' || parseFloat(amountReceived || '0') < cartTotal) {
        await processPayment({
          orderId,
          amount: cartTotal,
          method: paymentMethod,
          amountReceived: parseFloat(amountReceived || '0'),
          changeDue: change,
        }).unwrap();
      }

      toast.success(`Order #${order.orderNumber || orderId} completed`);
      setSaleSuccess({ orderId, orderNumber: order.orderNumber || orderId, total: cartTotal, change });
      setCurrentOrderId(orderId);
      clearCart();
      setIsPaymentOpen(false);
      refetchQueue();
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
      "fixed inset-0 top-16 z-0 flex bg-gray-50 dark:bg-slate-950 text-gray-900 dark:text-slate-100 overflow-hidden transition-all duration-300",
      sidebarCollapsed ? "left-0 lg:left-16" : "left-0 lg:left-64"
    )}>
      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
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

          <span className="text-xs text-gray-400 ml-auto">
            {products.length} products
          </span>
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
              {filteredProducts.map(product => (
                <button
                  key={product.id}
                  onClick={() => addToCart(product)}
                  className="group bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-800 p-3 text-left hover:shadow-lg hover:border-blue-300 dark:hover:border-blue-700 transition-all active:scale-95"
                >
                  <div className="aspect-square bg-gray-50 dark:bg-slate-800 rounded-xl mb-2 flex items-center justify-center text-3xl group-hover:scale-105 transition-transform">
                    🛒
                  </div>
                  <div className="text-sm font-bold truncate group-hover:text-blue-600 dark:group-hover:text-blue-400">
                    {product.name}
                  </div>
                  <div className="text-xs text-gray-500 truncate">{product.category}</div>
                  <div className="text-sm font-black text-blue-600 dark:text-blue-400 mt-1">
                    {formatCurrency(product.price)}
                    {product.weightBased && <span className="text-xs text-gray-400 ml-1">/{product.unitType}</span>}
                  </div>
                  {product.barcode && (
                    <div className="text-[10px] text-gray-400 mt-0.5 font-mono">{product.barcode}</div>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Cart sidebar */}
      <div className="w-[380px] border-l border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-950 flex flex-col">
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
            onClick={() => { setIsPaymentOpen(true); setAmountReceived(cartTotal.toFixed(2)); }}
            disabled={cart.length === 0}
            className="w-full h-12 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-base"
          >
            <CreditCardIcon className="h-5 w-5 mr-2" />
            Checkout
          </Button>

          {/* Queue */}
          <Button
            variant="secondary"
            onClick={() => setIsQueueOpen(true)}
            className="w-full h-10 rounded-xl text-xs font-bold uppercase"
          >
            Orders ({queueOrders.length})
          </Button>
        </div>
      </div>

      {/* Sale Receipt */}
      <Modal isOpen={!!saleSuccess} onClose={() => setSaleSuccess(null)} title="Receipt" size="md">
        {saleSuccess && (
          <div className="space-y-4">
            <div className="text-center py-2 border-b">
              <div className="text-sm text-gray-500">Order</div>
              <div className="text-2xl font-black">#{saleSuccess.orderNumber}</div>
              <div className="text-3xl font-black text-green-600 dark:text-green-400 mt-2">
                {formatCurrency(saleSuccess.total)}
              </div>
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
      <Modal isOpen={isPaymentOpen} onClose={() => setIsPaymentOpen(false)} title="Payment" size="sm">
        <div className="space-y-4">
          <div className="text-center py-2">
            <div className="text-3xl font-black">{formatCurrency(cartTotal)}</div>
            <div className="text-xs text-gray-500">{cart.length} items in cart</div>
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
            </div>
          )}

          <div className="flex gap-3 pt-3">
            <Button variant="ghost" onClick={() => setIsPaymentOpen(false)} className="flex-1">
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleCheckout}
              disabled={isProcessing || (!isCash && cart.length === 0)}
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
            <div className="text-center text-gray-400 py-8">No pending orders</div>
          ) : (
            queueOrders.map((order: any) => (
              <div key={order.id || order._id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-slate-900 rounded-xl">
                <div>
                  <div className="font-bold text-sm">#{order.orderNumber}</div>
                  <div className="text-xs text-gray-500">{formatDateTime(order.createdAt)}</div>
                  <div className="text-xs text-gray-500">{order.items?.length || 0} items</div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="font-bold text-sm">{formatCurrency(order.totalAmount || order.total || 0)}</div>
                  <Badge className={order.status === 'paid' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}>
                    {order.status}
                  </Badge>
                  <button
                    onClick={() => handleCancelOrder(order.id || order._id)}
                    className="text-red-500 hover:text-red-700"
                    title="Cancel"
                  >
                    <XMarkIcon className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </Modal>

      {renderCustomerModal()}
    </div>
  );
}
