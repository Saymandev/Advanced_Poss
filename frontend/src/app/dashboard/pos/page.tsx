'use client';

import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { useGetCategoriesQuery } from '@/lib/api/endpoints/categoriesApi';
import type { CreatePOSOrderRequest } from '@/lib/api/endpoints/posApi';
import {
  useCreatePOSOrderMutation,
  useDownloadReceiptPDFMutation,
  useGetAvailableTablesQuery,
  useGetPOSMenuItemsQuery,
  useGetPOSSettingsQuery,
  useGetPrintersQuery,
  useGetReceiptHTMLQuery,
  usePrintReceiptMutation,
  usePrintReceiptPDFMutation,
  useProcessPaymentMutation
} from '@/lib/api/endpoints/posApi';
import { useGetStaffQuery } from '@/lib/api/endpoints/staffApi';
import { useAppSelector } from '@/lib/store';
import { formatCurrency } from '@/lib/utils';
import {
  CheckIcon,
  ClipboardDocumentListIcon,
  ClockIcon,
  CreditCardIcon,
  CurrencyDollarIcon,
  DocumentArrowDownIcon,
  FunnelIcon,
  HomeModernIcon,
  MagnifyingGlassIcon,
  MinusIcon,
  PencilSquareIcon,
  PlusIcon,
  PrinterIcon,
  ShoppingBagIcon,
  ShoppingCartIcon,
  TableCellsIcon,
  TrashIcon,
  TruckIcon,
  UserGroupIcon,
} from '@heroicons/react/24/outline';
import Image from 'next/image';
import { useCallback, useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';

interface CartItem {
  id: string;
  menuItemId: string;
  name: string;
  price: number;
  quantity: number;
  notes?: string;
  category: string;
}

interface OrderSummary {
  subtotal: number;
  tax: number;
  total: number;
  itemCount: number;
  deliveryFee: number;
  discount: number;
}

type OrderType = 'dine-in' | 'delivery' | 'takeaway';

const ORDER_TYPE_OPTIONS = [
  { value: 'dine-in', label: 'Dine-In', icon: HomeModernIcon },
  { value: 'delivery', label: 'Delivery', icon: TruckIcon },
  { value: 'takeaway', label: 'Takeaway', icon: ShoppingBagIcon },
] as const;

interface DeliveryDetailsState {
  [key: string]: string;
  contactName: string;
  contactPhone: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  state: string;
  postalCode: string;
  instructions: string;
  assignedDriver: string;
}

interface TakeawayDetailsState {
  [key: string]: string;
  contactName: string;
  contactPhone: string;
  instructions: string;
  assignedDriver: string;
}

const createDefaultDeliveryDetails = (): DeliveryDetailsState => ({
  contactName: '',
  contactPhone: '',
  addressLine1: '',
  addressLine2: '',
  city: '',
  state: '',
  postalCode: '',
  instructions: '',
  assignedDriver: '',
});

const createDefaultTakeawayDetails = (): TakeawayDetailsState => ({
  contactName: '',
  contactPhone: '',
  instructions: '',
  assignedDriver: '',
});

const sanitizeDetails = <T extends Record<string, string>>(details: T): Partial<T> => {
  const sanitized: Partial<T> = {};
  Object.entries(details).forEach(([key, value]) => {
    if (typeof value === 'string') {
      const trimmed = value.trim();
      if (trimmed) {
        sanitized[key as keyof T] = trimmed as T[keyof T];
      }
    }
  });
  return sanitized;
};

export default function POSPage() {
  const { user } = useAppSelector((state) => state.auth);
  
  // Load from localStorage on mount
  const [orderType, setOrderType] = useState<OrderType>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('pos_orderType') as OrderType | null;
      if (saved === 'delivery' || saved === 'takeaway' || saved === 'dine-in') {
        return saved;
      }
    }
    return 'dine-in';
  });
  const [selectedTable, setSelectedTable] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('pos_selectedTable') || '';
    }
    return '';
  });
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [cart, setCart] = useState<CartItem[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('pos_cart');
      return saved ? JSON.parse(saved) : [];
    }
    return [];
  });
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isTableModalOpen, setIsTableModalOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | 'split'>('cash');
  const [customerInfo, setCustomerInfo] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('pos_customerInfo');
      return saved ? JSON.parse(saved) : { name: '', phone: '', email: '' };
    }
    return { name: '', phone: '', email: '' };
  });
  const [deliveryDetails, setDeliveryDetails] = useState<DeliveryDetailsState>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('pos_deliveryDetails');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          return { ...createDefaultDeliveryDetails(), ...parsed };
        } catch (error) {
          console.warn('Failed to parse saved delivery details:', error);
        }
      }
    }
    return createDefaultDeliveryDetails();
  });
  const [deliveryFee, setDeliveryFee] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('pos_deliveryFee');
      if (saved !== null) {
        return saved;
      }
    }
    return '0';
  });
  const [takeawayDetails, setTakeawayDetails] = useState<TakeawayDetailsState>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('pos_takeawayDetails');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          return { ...createDefaultTakeawayDetails(), ...parsed };
        } catch (error) {
          console.warn('Failed to parse saved takeaway details:', error);
        }
      }
    }
    return createDefaultTakeawayDetails();
  });
  const [showKeyboardShortcuts, setShowKeyboardShortcuts] = useState(false);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);
  const [currentOrderId, setCurrentOrderId] = useState<string>('');
  const [selectedPrinter, setSelectedPrinter] = useState<string>('');
  const [hasStartedOrder, setHasStartedOrder] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('pos_orderStarted') === 'true';
    }
    return false;
  });
  const [isCartModalOpen, setIsCartModalOpen] = useState(false);
  const [hasAutoOpenedCart, setHasAutoOpenedCart] = useState(false);
  const [orderNotes, setOrderNotes] = useState('');
  const [selectedWaiterId, setSelectedWaiterId] = useState<string>('');
  const [discountMode, setDiscountMode] = useState<'full' | 'item'>('full');
  const [discountType, setDiscountType] = useState<'percent' | 'amount'>('percent');
  const [discountValue, setDiscountValue] = useState('0');
  const [itemDiscounts, setItemDiscounts] = useState<Record<string, { type: 'percent' | 'amount'; value: string }>>({});
  const [isItemDiscountModalOpen, setIsItemDiscountModalOpen] = useState(false);
  const [noteEditor, setNoteEditor] = useState<{ itemId: string; value: string } | null>(null);

  const resetDeliveryDetails = useCallback(() => {
    const defaults = createDefaultDeliveryDetails();
    setDeliveryDetails(defaults);
    setDeliveryFee('0');
    if (typeof window !== 'undefined') {
      localStorage.removeItem('pos_deliveryDetails');
      localStorage.removeItem('pos_deliveryFee');
    }
  }, []);

  const resetTakeawayDetails = useCallback(() => {
    const defaults = createDefaultTakeawayDetails();
    setTakeawayDetails(defaults);
    if (typeof window !== 'undefined') {
      localStorage.removeItem('pos_takeawayDetails');
    }
  }, []);

  const requiresTable = orderType === 'dine-in';
  const requiresDeliveryDetails = orderType === 'delivery';
  const requiresTakeawayDetails = orderType === 'takeaway';
  const orderTypeLabel = ORDER_TYPE_OPTIONS.find(option => option.value === orderType)?.label ?? 'Dine-In';
  const activeOrderTypeOption = useMemo(() => ORDER_TYPE_OPTIONS.find(option => option.value === orderType), [orderType]);
  const ActiveOrderIcon = activeOrderTypeOption?.icon ?? HomeModernIcon;

  const deliveryFeeValue = useMemo(() => {
    if (!requiresDeliveryDetails) {
      return 0;
    }
    const parsed = parseFloat(deliveryFee);
    if (Number.isNaN(parsed) || parsed < 0) {
      return 0;
    }
    return parsed;
  }, [deliveryFee, requiresDeliveryDetails]);

  const deliveryIsValid = !requiresDeliveryDetails
    || (
      deliveryDetails.addressLine1.trim() !== ''
      && deliveryDetails.city.trim() !== ''
      && deliveryDetails.contactPhone.trim() !== ''
    );

  const takeawayIsValid = !requiresTakeawayDetails
    || (
      takeawayDetails.contactName.trim() !== ''
      && takeawayDetails.contactPhone.trim() !== ''
    );

  const checkoutBlocked = (requiresTable && !selectedTable)
    || (requiresDeliveryDetails && !deliveryIsValid)
    || (requiresTakeawayDetails && !takeawayIsValid);

  const missingDeliveryFields = useMemo(() => {
    if (!requiresDeliveryDetails) return [] as string[];
    const missing: string[] = [];
    if (!deliveryDetails.contactName.trim()) missing.push('contact name');
    if (!deliveryDetails.contactPhone.trim()) missing.push('contact phone');
    if (!deliveryDetails.addressLine1.trim()) missing.push('address line 1');
    if (!deliveryDetails.city.trim()) missing.push('city');
    return missing;
  }, [requiresDeliveryDetails, deliveryDetails]);

  const missingTakeawayFields = useMemo(() => {
    if (!requiresTakeawayDetails) return [] as string[];
    const missing: string[] = [];
    if (!takeawayDetails.contactName.trim()) missing.push('contact name');
    if (!takeawayDetails.contactPhone.trim()) missing.push('contact phone');
    return missing;
  }, [requiresTakeawayDetails, takeawayDetails]);

  // API calls
  // Note: branchId is extracted from JWT token in backend, no need to pass it
  const { data: tablesData, isLoading: tablesLoading, error: _tablesError } = useGetAvailableTablesQuery();

  const { data: categoriesData } = useGetCategoriesQuery({
    branchId: user?.branchId || undefined,
  });

  // Fetch all menu items (no category filter) so we can do client-side filtering
  // This provides better UX with instant filtering
  const { data: menuItemsData, isLoading: menuItemsLoading } = useGetPOSMenuItemsQuery({
    branchId: user?.branchId || undefined,
    categoryId: undefined, // Always fetch all, filter client-side
    search: undefined, // Search is done client-side for better UX
    isAvailable: true,
  });
  
  // Get POS settings for tax rate
  const { data: posSettings } = useGetPOSSettingsQuery({
    branchId: user?.branchId || undefined,
  });
  
  const taxRate = posSettings?.taxRate || 10; // Default 10%
  
  // Extract tables array from response (already transformed by API)
  const tables = useMemo(() => {
    if (!tablesData) return [];
    
    // Response is already transformed by API transformResponse
    // Format: Array<{id, number, capacity, status, ...}>
    return Array.isArray(tablesData) ? tablesData : [];
  }, [tablesData]);

  const activeTable = useMemo(() => {
    return tables.find((t: any) => t.id === selectedTable);
  }, [tables, selectedTable]);
  
  // Extract categories array from response (already transformed by API)
  const categories = useMemo(() => {
    return categoriesData?.categories || [];
  }, [categoriesData]);

  const [createOrder] = useCreatePOSOrderMutation();
  const [processPayment] = useProcessPaymentMutation();
  const [printReceipt] = usePrintReceiptMutation();
  const [printReceiptPDF] = usePrintReceiptPDFMutation();
  const [downloadReceiptPDF] = useDownloadReceiptPDFMutation();
  const { data: printers } = useGetPrintersQuery();
  const { data: receiptHTML } = useGetReceiptHTMLQuery(currentOrderId, {
    skip: !currentOrderId,
  });

  const createOrderWithRetry = useCallback(
    async (payload: CreatePOSOrderRequest, attempts = 2): Promise<any> => {
      try {
        return await createOrder(payload).unwrap();
      } catch (error: any) {
        const message = error?.data?.message || error?.message || '';
        if (attempts > 1 && typeof message === 'string' && message.includes('duplicate key')) {
          await new Promise((resolve) => setTimeout(resolve, 150));
          return createOrderWithRetry(payload, attempts - 1);
        }
        throw error;
      }
    },
    [createOrder]
  );

  const { data: staffData } = useGetStaffQuery(
    { limit: 200, status: 'active' },
    { refetchOnMountOrArgChange: false }
  );

  const waiterOptions = useMemo<Array<{ id: string; name: string }>>(() => {
    const staffList = staffData?.staff || [];
    return staffList
      .filter((staffMember: any) => {
        const role = (staffMember.role || '').toLowerCase();
        return ['waiter', 'server', 'cashier', 'manager'].includes(role);
      })
      .map((staffMember: any) => ({
        id: staffMember.id,
        name:
          `${staffMember.firstName || ''} ${staffMember.lastName || ''}`.trim() ||
          staffMember.email ||
          staffMember.id,
      }));
  }, [staffData]);

  const selectedWaiterName = useMemo(() => {
    return waiterOptions.find((option) => option.id === selectedWaiterId)?.name || '';
  }, [waiterOptions, selectedWaiterId]);

  useEffect(() => {
    if (!selectedWaiterId && waiterOptions.length > 0) {
      setSelectedWaiterId(waiterOptions[0].id);
    }
  }, [selectedWaiterId, waiterOptions]);

  // Extract menu items array from response (already transformed by API)
  const menuItemsArray = useMemo(() => {
    // Response is already transformed by API transformResponse
    return Array.isArray(menuItemsData) ? menuItemsData : [];
  }, [menuItemsData]);

  // Filter menu items based on search and category (client-side filter for better UX)
  const filteredMenuItems = useMemo(() => {
    if (!Array.isArray(menuItemsArray)) return [];
    
    let filtered = menuItemsArray;
    
    // Filter by category if not 'all'
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(item => {
        const categoryId = item.category?.id || item.category;
        return categoryId === selectedCategory || item.category?.name === selectedCategory;
      });
    }
    
    // Filter by search query
    if (searchQuery) {
      filtered = filtered.filter(item =>
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.description?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    
    return filtered;
  }, [menuItemsArray, searchQuery, selectedCategory]);

  const getItemDiscountAmount = useCallback(
    (item: CartItem) => {
      const entry = itemDiscounts[item.id];
      if (!entry) return 0;

      const lineSubtotal = item.price * item.quantity;
      const raw = parseFloat(entry.value || '0');
      if (!Number.isFinite(raw) || raw <= 0) {
        return 0;
      }

      if (entry.type === 'percent') {
        return Math.min(lineSubtotal, (lineSubtotal * raw) / 100);
      }

      return Math.min(lineSubtotal, raw);
    },
    [itemDiscounts]
  );

  const orderSummary: OrderSummary = useMemo(() => {
    const base = cart.reduce(
      (acc, item) => {
        const lineTotal = item.price * item.quantity;
        return {
          subtotal: acc.subtotal + lineTotal,
          itemCount: acc.itemCount + item.quantity,
        };
      },
      { subtotal: 0, itemCount: 0 }
    );

    let discountAmount = 0;
    if (discountMode === 'full') {
      const parsed = parseFloat(discountValue || '0');
      if (Number.isFinite(parsed) && parsed > 0) {
        discountAmount =
          discountType === 'percent'
            ? Math.min(base.subtotal, (base.subtotal * parsed) / 100)
            : Math.min(base.subtotal, parsed);
      }
    } else {
      discountAmount = cart.reduce((sum, item) => sum + getItemDiscountAmount(item), 0);
      discountAmount = Math.min(discountAmount, base.subtotal);
    }

    const taxableSubtotal = Math.max(base.subtotal - discountAmount, 0);
    const taxAmount = (taxableSubtotal * taxRate) / 100;
    const total = taxableSubtotal + taxAmount + deliveryFeeValue;

    return {
      subtotal: base.subtotal,
      discount: discountAmount,
      tax: taxAmount,
      total,
      itemCount: base.itemCount,
      deliveryFee: deliveryFeeValue,
    };
  }, [
    cart,
    taxRate,
    deliveryFeeValue,
    discountMode,
    discountType,
    discountValue,
    getItemDiscountAmount,
  ]);

  // Save to localStorage whenever cart, selectedTable, or customerInfo changes
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('pos_cart', JSON.stringify(cart));
    }
  }, [cart]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      if (selectedTable) {
        localStorage.setItem('pos_selectedTable', selectedTable);
      } else {
        localStorage.removeItem('pos_selectedTable');
      }
    }
  }, [selectedTable]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const hasCustomerInfo = customerInfo.name || customerInfo.phone || customerInfo.email;
      if (hasCustomerInfo) {
        localStorage.setItem('pos_customerInfo', JSON.stringify(customerInfo));
      } else {
        localStorage.removeItem('pos_customerInfo');
      }
    }
  }, [customerInfo]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('pos_orderType', orderType);
    }
  }, [orderType]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      if (hasStartedOrder) {
        localStorage.setItem('pos_orderStarted', 'true');
      } else {
        localStorage.removeItem('pos_orderStarted');
      }
    }
  }, [hasStartedOrder]);

  useEffect(() => {
    if (orderType === 'dine-in') {
      if (selectedTable) {
        setHasStartedOrder(true);
      } else {
        setHasStartedOrder(false);
      }
    }
  }, [orderType, selectedTable]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const hasDeliveryDetails = Object.values(deliveryDetails).some((value) => value.trim() !== '');
    if (hasDeliveryDetails) {
      localStorage.setItem('pos_deliveryDetails', JSON.stringify(deliveryDetails));
    } else {
      localStorage.removeItem('pos_deliveryDetails');
    }

    const parsedFee = parseFloat(deliveryFee);
    if (!Number.isNaN(parsedFee) && parsedFee > 0) {
      localStorage.setItem('pos_deliveryFee', deliveryFee);
    } else {
      localStorage.removeItem('pos_deliveryFee');
    }
  }, [deliveryDetails, deliveryFee]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const hasTakeawayDetails = Object.values(takeawayDetails).some((value) => value.trim() !== '');
    if (hasTakeawayDetails) {
      localStorage.setItem('pos_takeawayDetails', JSON.stringify(takeawayDetails));
    } else {
      localStorage.removeItem('pos_takeawayDetails');
    }
  }, [takeawayDetails]);

  // Cart functions
  const addToCart = (menuItem: any) => {
    const existingItem = cart.find(item => item.menuItemId === menuItem.id);
    
    const updatedCart = existingItem
      ? cart.map(item =>
          item.menuItemId === menuItem.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        )
      : [
          ...cart,
          {
            id: Date.now().toString(),
            menuItemId: menuItem.id,
            name: menuItem.name,
            price: menuItem.price,
            quantity: 1,
            category: menuItem.category?.name || 'Uncategorized',
          } as CartItem,
        ];
    
    setCart(updatedCart);
    toast.success(`${menuItem.name} added to cart`);
  };

  const updateQuantity = (itemId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(itemId);
    } else {
      setCart(cart.map(item =>
        item.id === itemId ? { ...item, quantity } : item
      ));
    }
  };

  const updateItemNote = useCallback((itemId: string, note: string) => {
    setCart((prev) =>
      prev.map((item) => (item.id === itemId ? { ...item, notes: note.trim() || undefined } : item))
    );
  }, []);

  const removeFromCart = (itemId: string) => {
    setCart(cart.filter(item => item.id !== itemId));
    setItemDiscounts((prev) => {
      if (!prev[itemId]) return prev;
      const next = { ...prev };
      delete next[itemId];
      return next;
    });
    toast.success('Item removed from cart');
  };

  const updateItemDiscountEntry = useCallback(
    (itemId: string, nextValue: { type: 'percent' | 'amount'; value: string }) => {
      setItemDiscounts((prev) => ({
        ...prev,
        [itemId]: nextValue,
      }));
    },
    []
  );

  const clearCart = () => {
    setCart([]);
    setItemDiscounts({});
    setDiscountValue('0');
    setDiscountMode('full');
    setOrderNotes('');
    if (typeof window !== 'undefined') {
      localStorage.removeItem('pos_cart');
    }
    toast.success('Cart cleared');
  };

  const resetFilters = () => {
    setSelectedCategory('all');
    setSearchQuery('');
    toast.success('Filters reset');
  };

  const handleOrderTypeChange = useCallback(
    (type: OrderType) => {
      setOrderType(type);
      if (type === 'dine-in') {
        if (!selectedTable) {
          setIsTableModalOpen(true);
          setHasStartedOrder(false);
        } else {
          setHasStartedOrder(true);
        }
      } else {
        setIsTableModalOpen(false);
        setHasStartedOrder(false);
      }
    },
    [selectedTable]
  );

  // Order functions
  const handleCreateOrder = useCallback(async () => {
    const requiresTable = orderType === 'dine-in';
    const isDelivery = orderType === 'delivery';
    const isTakeaway = orderType === 'takeaway';
 
    try {
      const deliveryPayload = isDelivery
        ? (sanitizeDetails(deliveryDetails) as CreatePOSOrderRequest['deliveryDetails'])
        : undefined;
      const takeawayPayload = isTakeaway
        ? (sanitizeDetails(takeawayDetails) as CreatePOSOrderRequest['takeawayDetails'])
        : undefined;
 
      const noteSegments: string[] = [];
      if (orderNotes.trim()) {
        noteSegments.push(orderNotes.trim());
      }
      if (selectedWaiterName) {
        noteSegments.push(`Waiter: ${selectedWaiterName}`);
      }
      if (orderSummary.discount > 0) {
        if (discountMode === 'full') {
          noteSegments.push(
            `Discount applied: ${discountType === 'percent' ? `${discountValue}%` : formatCurrency(Number(discountValue || '0'))} on full order`
          );
        } else {
          noteSegments.push('Item-wise discounts applied.');
        }
      }
 
      const orderData: CreatePOSOrderRequest = {
        orderType,
        ...(requiresTable && selectedTable ? { tableId: selectedTable } : {}),
        ...(isDelivery
          ? {
              deliveryFee: deliveryFeeValue,
              deliveryDetails: deliveryPayload,
            }
          : {}),
        ...(isTakeaway
          ? {
              takeawayDetails: takeawayPayload,
            }
          : {}),
        items: cart.map(item => ({
          menuItemId: item.menuItemId,
          quantity: item.quantity,
          price: item.price,
          notes: item.notes,
        })),
        customerInfo: customerInfo,
        totalAmount: Number(orderSummary.total.toFixed(2)),
        status: 'pending' as const,
        notes: noteSegments.length > 0 ? noteSegments.join('\n') : undefined,
      };
 
      const orderResponse = await createOrderWithRetry(orderData);
      const order = (orderResponse as any).data || orderResponse;
      toast.success(`Order created successfully! Order #${order.orderNumber || order.id}`);
      clearCart();
      if (requiresTable) {
        setSelectedTable('');
        if (typeof window !== 'undefined') {
          localStorage.removeItem('pos_selectedTable');
        }
      }
      if (isDelivery) {
        resetDeliveryDetails();
      }
      if (isTakeaway) {
        resetTakeawayDetails();
      }
      if (typeof window !== 'undefined') {
        localStorage.removeItem('pos_customerInfo');
      }
      setCustomerInfo({ name: '', phone: '', email: '' });
      setHasStartedOrder(false);
      setIsCartModalOpen(false);
    } catch (error: any) {
      toast.error(error?.data?.message || 'Failed to create order');
    }
  }, [
    orderType,
    selectedTable,
    deliveryDetails,
    takeawayDetails,
    cart,
    customerInfo,
    orderSummary.total,
    orderSummary.discount,
    createOrderWithRetry,
    resetDeliveryDetails,
    resetTakeawayDetails,
    orderNotes,
    selectedWaiterName,
    deliveryFeeValue,
    discountMode,
    discountType,
    discountValue,
  ]);

  const handlePayment = async () => {
     const requiresTable = orderType === 'dine-in';
    const isDelivery = orderType === 'delivery';
    const isTakeaway = orderType === 'takeaway';
 
     if (requiresTable && !selectedTable) {
       toast.error('Please select a table for dine-in orders');
       return;
     }
 
    if (isDelivery) {
      const hasAddress = deliveryDetails.addressLine1.trim() && deliveryDetails.city.trim();
      const hasPhone = deliveryDetails.contactPhone.trim();
      if (!hasAddress || !hasPhone) {
        toast.error('Please complete the delivery address and contact phone');
        return;
      }
    }

    if (isTakeaway) {
      const hasContact = takeawayDetails.contactName.trim() && takeawayDetails.contactPhone.trim();
      if (!hasContact) {
        toast.error('Please provide contact name and phone for takeaway orders');
        return;
      }
    }

    if (cart.length === 0) {
      toast.error('Cart is empty');
      return;
    }
 
     try {
       const deliveryPayload = isDelivery
         ? (sanitizeDetails(deliveryDetails) as CreatePOSOrderRequest['deliveryDetails'])
         : undefined;
       const takeawayPayload = isTakeaway
         ? (sanitizeDetails(takeawayDetails) as CreatePOSOrderRequest['takeawayDetails'])
         : undefined;
 
       const noteSegments: string[] = [];
       if (orderNotes.trim()) {
         noteSegments.push(orderNotes.trim());
       }
       if (selectedWaiterName) {
         noteSegments.push(`Waiter: ${selectedWaiterName}`);
       }
       if (orderSummary.discount > 0) {
         if (discountMode === 'full') {
           noteSegments.push(
             `Discount applied: ${discountType === 'percent' ? `${discountValue}%` : formatCurrency(Number(discountValue || '0'))} on full order`
           );
         } else {
           noteSegments.push('Item-wise discounts applied.');
         }
       }
 
       const orderData: CreatePOSOrderRequest = {
         orderType,
         ...(requiresTable && selectedTable ? { tableId: selectedTable } : {}),
         ...(isDelivery
           ? {
               deliveryFee: deliveryFeeValue,
               deliveryDetails: deliveryPayload,
             }
           : {}),
         ...(isTakeaway
           ? {
               takeawayDetails: takeawayPayload,
             }
           : {}),
         items: cart.map(item => ({
           menuItemId: item.menuItemId,
           quantity: item.quantity,
           price: item.price,
           notes: item.notes,
         })),
         customerInfo: customerInfo,
         totalAmount: orderSummary.total,
         status: 'paid' as const,
         paymentMethod,
         notes: noteSegments.length > 0 ? noteSegments.join('\n') : undefined,
       };
 
       const orderResponse = await createOrderWithRetry(orderData);
       const order = (orderResponse as any).data || orderResponse;
       const orderId = order.id || order._id;
       
       // Process payment
       await processPayment({
         orderId,
         amount: orderSummary.total,
         method: paymentMethod,
       }).unwrap();
 
       // Print receipt (optional - don't fail if it fails)
       try {
         await printReceipt({
           orderId,
         }).unwrap();
         toast.success('Receipt printed successfully');
       } catch (error) {
         console.warn('Receipt printing failed:', error);
         // Don't fail the entire transaction if receipt printing fails
       }
 
       // Set current order ID for receipt viewing
       setCurrentOrderId(orderId);
 
       toast.success('Order completed successfully');
       // Show receipt option after a short delay
       setTimeout(() => {
         if (confirm('Would you like to view the receipt?')) {
           handleViewReceipt(orderId);
         }
       }, 1000);
       clearCart();
       if (requiresTable) {
         setSelectedTable('');
         if (typeof window !== 'undefined') {
           localStorage.removeItem('pos_selectedTable');
         }
       }
       if (isDelivery) {
         resetDeliveryDetails();
       }
       if (isTakeaway) {
         resetTakeawayDetails();
       }
       if (typeof window !== 'undefined') {
         localStorage.removeItem('pos_customerInfo');
       }
       setCustomerInfo({ name: '', phone: '', email: '' });
       setIsPaymentModalOpen(false);
       setIsCartModalOpen(false);
+      setHasStartedOrder(false);
     } catch (error: any) {
       toast.error(error?.data?.message || 'Failed to process payment');
     }
   };

  const handlePrintReceipt = async (orderId: string, usePDF = false) => {
    try {
      if (usePDF) {
        const result = await printReceiptPDF({
          orderId,
          printerId: selectedPrinter || undefined,
        }).unwrap();
        toast.success(result.message);
      } else {
        const result = await printReceipt({
          orderId,
          printerId: selectedPrinter || undefined,
        }).unwrap();
        toast.success(result.message);
      }
    } catch (error) {
      console.error('Error printing receipt:', error);
      toast.error('Failed to print receipt. Please try again.');
    }
  };

  const handleDownloadReceiptPDF = async (orderId: string) => {
    try {
      const blob = await downloadReceiptPDF(orderId).unwrap();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `receipt-${orderId}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      toast.success('Receipt PDF downloaded successfully');
    } catch (error) {
      console.error('Error downloading receipt PDF:', error);
      toast.error('Failed to download receipt PDF. Please try again.');
    }
  };

  const handleViewReceipt = (orderId: string) => {
    setCurrentOrderId(orderId);
    setIsReceiptModalOpen(true);
  };

  const getTableStatus = (table: any) => {
    if (table.status === 'occupied') return 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200';
    if (table.status === 'reserved') return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-200';
    return 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-200';
  };

  const getTableStatusText = (table: any) => {
    if (table.status === 'occupied') return 'Occupied';
    if (table.status === 'reserved') return 'Reserved';
    return 'Available';
  };

  const isOrderingActive = useMemo(() => {
    if (orderType === 'dine-in') {
      return hasStartedOrder && Boolean(selectedTable);
    }
    return hasStartedOrder;
  }, [orderType, hasStartedOrder, selectedTable]);

  useEffect(() => {
    if (!isOrderingActive) {
      setHasAutoOpenedCart(false);
      return;
    }

    if (isOrderingActive && !hasAutoOpenedCart) {
      setIsCartModalOpen(true);
      setHasAutoOpenedCart(true);
    }
  }, [isOrderingActive, hasAutoOpenedCart]);
 
  const renderPreOrderView = () => {
    if (orderType === 'dine-in') {
      return (
        <div className="flex-1 overflow-y-auto px-6 py-10">
          <div className="mx-auto max-w-5xl space-y-8">
            <div className="text-center space-y-2">
              <h2 className="text-2xl font-semibold text-slate-100">Select a table to start a dine-in order</h2>
              <p className="text-slate-400">Tap an available table below to launch the ordering workspace.</p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {tablesLoading ? (
                [...Array(8)].map((_, index) => (
                  <div key={index} className="h-40 rounded-2xl border border-slate-900/60 bg-slate-900/40 animate-pulse" />
                ))
              ) : tables.length > 0 ? (
                tables.map((table: any) => {
                  const statusClass = getTableStatus(table);
                  const isSelected = selectedTable === table.id;
                  return (
                    <button
                      key={table.id}
                      onClick={() => {
                        setSelectedTable(table.id);
                        setHasStartedOrder(true);
                      }}
                      className={`rounded-2xl border-2 p-6 text-left transition-all ${
                        isSelected
                          ? 'border-sky-500 bg-sky-500/10 shadow-lg shadow-sky-500/20'
                          : 'border-slate-900 bg-slate-950/60 hover:border-sky-600/60 hover:shadow-lg hover:shadow-sky-900/20'
                      }`}
                    >
                      <div className="space-y-4">
                        <div>
                          <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Table No.</p>
                          <p className="text-xl font-semibold text-slate-100 truncate">
                            {table.number || table.tableNumber || table.name || table.id}
                          </p>
                        </div>
                        <Badge className={`${statusClass} border border-white/10`}>
                          {getTableStatusText(table)}
                        </Badge>
                      </div>
                    </button>
                  );
                })
              ) : (
                <div className="col-span-full rounded-2xl border border-slate-900 bg-slate-950/60 p-10 text-center">
                  <p className="text-slate-300 font-medium">No tables configured for this branch yet.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      );
    }

    const isDelivery = orderType === 'delivery';
    const IconComponent = isDelivery ? TruckIcon : ShoppingBagIcon;
    const label = isDelivery ? 'Create Delivery Order' : 'Create Takeaway Order';
    const helper =
      orderType === 'delivery'
        ? 'Capture customer address, driver assignment, and delivery fee details.'
        : 'Collect pickup contact info and prep instructions before adding items.';

    return (
      <div className="flex flex-1 items-center justify-center px-6 py-12">
        <button
          onClick={() => setHasStartedOrder(true)}
          className="w-full max-w-sm rounded-3xl border-2 border-sky-500/40 bg-slate-950/60 p-10 text-center transition hover:border-sky-400 hover:bg-slate-900/70 shadow-xl shadow-sky-950/20 space-y-6"
        >
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-sky-500/15 text-sky-200">
            <IconComponent className="h-8 w-8" />
          </div>
          <div className="space-y-2">
            <p className="text-lg font-semibold text-slate-100">{label}</p>
            <p className="text-sm text-slate-400">{helper}</p>
          </div>
        </button>
      </div>
    );
  };

  const renderOrderingWorkspace = () => (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="bg-slate-940/80 backdrop-blur border-b border-slate-900 px-6 py-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="flex-1">
            <label className="text-xs font-semibold uppercase text-slate-400 tracking-[0.2em] block mb-2">
              Search menu items
            </label>
            <div className="relative">
              <MagnifyingGlassIcon className="h-5 w-5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <Input
                placeholder='Try "salmon", "latte", or scan a barcode'
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-11 h-11 bg-slate-950/90 border border-slate-800 text-slate-100 placeholder:text-slate-500 focus:border-sky-600 focus:ring-sky-600/40"
              />
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-950/80 px-4 py-2">
              <UserGroupIcon className="h-4 w-4 text-slate-400" />
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="bg-transparent text-sm text-slate-100 focus:outline-none"
              >
                <option value="all" className="bg-slate-900">All Categories</option>
                {categories.map((category: any) => (
                  <option key={category.id} value={category.id} className="bg-slate-900">
                    {category.name}
                  </option>
                ))}
              </select>
            </div>
            <Button
              variant="secondary"
              className="flex items-center gap-2 rounded-xl bg-slate-900/80 text-slate-100 hover:bg-slate-800/80 disabled:opacity-40"
              onClick={resetFilters}
              disabled={selectedCategory === 'all' && !searchQuery}
            >
              <FunnelIcon className="h-4 w-4" />
              Reset Filters
            </Button>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {menuItemsLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {[...Array(8)].map((_, i) => (
              <Card key={i} className="animate-pulse bg-slate-900/40 border border-slate-800">
                <CardContent className="p-4">
                  <div className="h-32 bg-slate-800 rounded-lg mb-3"></div>
                  <div className="h-4 bg-slate-800 rounded mb-2"></div>
                  <div className="h-4 bg-slate-800 rounded w-2/3"></div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : filteredMenuItems.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredMenuItems.map((item) => (
              <Card
                key={item.id}
                className="group relative overflow-hidden border border-slate-800/80 bg-slate-900/60 backdrop-blur-sm transition-all duration-200 hover:-translate-y-1 hover:border-sky-500/50 hover:shadow-lg hover:shadow-sky-700/20"
              >
                <CardContent className="p-4 space-y-3">
                  <div className="aspect-square rounded-xl bg-slate-950/60 flex items-center justify-center border border-slate-800/80">
                    {item.image ? (
                      <Image
                        src={item.image}
                        alt={item.name}
                        width={240}
                        height={240}
                        className="h-full w-full rounded-xl object-cover"
                      />
                    ) : (
                      <div className="text-4xl">🍽️</div>
                    )}
                  </div>
                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="font-semibold text-slate-100 truncate">
                        {item.name}
                      </h3>
                      {item.category?.name && (
                        <Badge className="bg-sky-500/10 text-sky-200 border border-sky-500/20">
                          {item.category.name}
                        </Badge>
                      )}
                    </div>
                    <p className="mt-1 text-xs text-slate-400 line-clamp-2 min-h-[32px]">
                      {item.description || "Perfect for today's menu."}
                    </p>
                  </div>
                  <div className="flex items-center justify-between pt-2">
                    <span className="text-xl font-bold text-emerald-400">
                      {formatCurrency(item.price)}
                    </span>
                    <Button
                      size="sm"
                      onClick={() => addToCart(item)}
                      className="flex items-center gap-1 rounded-full bg-sky-600 hover:bg-sky-500"
                    >
                      <PlusIcon className="h-4 w-4" />
                      Add
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full min-h-[400px] text-center rounded-3xl border border-slate-800 bg-slate-950/50 backdrop-blur-sm">
            <div className="text-6xl mb-4">🍽️</div>
            <h3 className="text-xl font-semibold text-slate-100 mb-2">
              No menu items found
            </h3>
            <p className="text-slate-400 max-w-md">
              {searchQuery
                ? 'No results match your search. Try adjusting the keywords or filters.'
                : 'Menu items will show up here once they have been added for this branch.'}
            </p>
          </div>
        )}
      </div>

      <div className="border-t border-slate-900/70 bg-slate-950/70 px-6 py-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3 text-sm text-slate-200">
          <Badge className="bg-sky-500/10 text-sky-200 border border-sky-500/30">
            {cart.length} item{cart.length === 1 ? '' : 's'}
          </Badge>
          <span className="text-slate-400">Current total:</span>
          <span className="text-lg font-semibold text-emerald-400">{formatCurrency(orderSummary.total)}</span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="secondary"
            onClick={() => setIsCartModalOpen(true)}
            className="flex items-center gap-2 rounded-xl bg-slate-900/80 text-slate-100 hover:bg-slate-800/80"
          >
            <ShoppingCartIcon className="h-4 w-4" />
            Open Order Cart
          </Button>
          <Button
            variant="primary"
            onClick={() => setIsPaymentModalOpen(true)}
            disabled={cart.length === 0 || checkoutBlocked}
            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500"
          >
            <CreditCardIcon className="h-4 w-4" />
            Checkout
          </Button>
        </div>
      </div>
    </div>
  );

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      // Only handle shortcuts when not typing in input fields
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) {
        return;
      }

      switch (event.key) {
        case 'F1':
          event.preventDefault();
          if (requiresTable) {
            setIsTableModalOpen(true);
          } else {
            toast('Table selection is only required for dine-in orders');
          }
          break;
        case 'F2':
          event.preventDefault();
          if (cart.length > 0) {
            setIsPaymentModalOpen(true);
          }
          break;
        case 'F3':
          event.preventDefault();
          clearCart();
          break;
        case 'F4':
          event.preventDefault();
          setShowKeyboardShortcuts(!showKeyboardShortcuts);
          break;
        case 'Escape':
          event.preventDefault();
          setIsPaymentModalOpen(false);
          setIsTableModalOpen(false);
          setShowKeyboardShortcuts(false);
          break;
        case 'Enter':
          event.preventDefault();
          if (cart.length > 0 && !checkoutBlocked) {
            handleCreateOrder();
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [cart.length, selectedTable, showKeyboardShortcuts, handleCreateOrder, requiresTable, checkoutBlocked]);

  return (
    <div className="h-screen flex flex-col bg-slate-950 text-slate-100">
      {/* Header */}
      <div className="bg-gradient-to-b from-slate-950 via-slate-930 to-slate-950 border-b border-slate-900/60 px-6 py-5 shadow-lg">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl font-bold text-white tracking-tight">POS System</h1>
              <Badge className="bg-sky-500/15 text-sky-100 border border-sky-500/30">
                {orderTypeLabel}
              </Badge>
            </div>
            <div className="flex items-center gap-3 flex-wrap text-sm text-slate-300">
              <TableCellsIcon className="h-4 w-4 text-slate-400" />
              <span className="text-slate-200">
                {requiresTable
                  ? selectedTable
                    ? `Table ${activeTable?.number || activeTable?.tableNumber || selectedTable}`
                    : 'No table selected'
                  : 'Table not required for this order'}
              </span>
              {requiresTable && activeTable && (
                <Badge className={`${getTableStatus(activeTable)} border border-white/10` }>
                  {getTableStatusText(activeTable)}
                </Badge>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-200">
              <div className="flex items-center gap-2 rounded-full border border-slate-800 bg-slate-940/70 px-3 py-1.5 shadow-sm">
                <ActiveOrderIcon className="h-4 w-4 text-sky-300" />
                <span className="font-medium tracking-wide">{orderTypeLabel} mode</span>
              </div>
              <div className="flex items-center gap-2 rounded-full border border-slate-800 bg-slate-940/70 px-3 py-1.5">
                <ClipboardDocumentListIcon className="h-4 w-4 text-emerald-300" />
                <span>{orderSummary.itemCount} item{orderSummary.itemCount === 1 ? '' : 's'} in cart</span>
              </div>
              <div className="flex items-center gap-2 rounded-full border border-slate-800 bg-slate-940/70 px-3 py-1.5">
                <CurrencyDollarIcon className="h-4 w-4 text-amber-300" />
                <span>Total {formatCurrency(orderSummary.total)}</span>
              </div>
              {requiresDeliveryDetails && (
                <div className={`flex items-center gap-2 rounded-full px-3 py-1.5 border ${deliveryIsValid ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-200' : 'border-amber-500/40 bg-amber-500/10 text-amber-100'}`}>
                  <TruckIcon className="h-4 w-4" />
                  <span className="whitespace-nowrap">{deliveryIsValid ? 'Delivery details complete' : `Missing ${missingDeliveryFields.length} delivery field${missingDeliveryFields.length === 1 ? '' : 's'}`}</span>
                </div>
              )}
              {requiresTakeawayDetails && (
                <div className={`flex items-center gap-2 rounded-full px-3 py-1.5 border ${takeawayIsValid ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-200' : 'border-amber-500/40 bg-amber-500/10 text-amber-100'}`}>
                  <ShoppingBagIcon className="h-4 w-4" />
                  <span className="whitespace-nowrap">{takeawayIsValid ? 'Takeaway details ready' : `Missing ${missingTakeawayFields.length} contact detail${missingTakeawayFields.length === 1 ? '' : 's'}`}</span>
                </div>
              )}
            </div>
          </div>
          <div className="flex flex-col gap-3 lg:items-end">
            <div className="flex items-center gap-1 sm:gap-2 flex-wrap justify-end">
              {ORDER_TYPE_OPTIONS.map(({ value, label, icon: Icon }) => {
                const isActive = orderType === value;
                return (
                  <Button
                    key={value}
                    size="sm"
                    variant={isActive ? 'primary' : 'secondary'}
                    onClick={() => handleOrderTypeChange(value)}
                    className={`flex items-center gap-1 rounded-full px-3 py-1.5 text-sm transition ${isActive ? 'bg-sky-600 hover:bg-sky-500 text-white shadow-lg shadow-sky-600/25' : 'bg-slate-900/80 text-slate-200 hover:bg-slate-800/80'}`}
                  >
                    <Icon className="h-4 w-4" />
                    {label}
                  </Button>
                );
              })}
            </div>
            <div className="flex items-center gap-2 flex-wrap justify-end">
              <Button
                variant="secondary"
                onClick={() => setIsTableModalOpen(true)}
                disabled={!requiresTable}
                className="flex items-center gap-2 rounded-xl bg-slate-900/80 text-slate-100 hover:bg-slate-800/80 disabled:opacity-50 disabled:hover:bg-slate-900"
                title={requiresTable ? undefined : 'Table selection is only required for dine-in orders'}
              >
                <TableCellsIcon className="h-4 w-4" />
                Select Table (F1)
              </Button>
              <Button
                variant="secondary"
                onClick={clearCart}
                disabled={cart.length === 0}
                className="flex items-center gap-2 rounded-xl bg-slate-900/80 text-slate-100 hover:bg-slate-800/80 disabled:opacity-40"
              >
                <TrashIcon className="h-4 w-4" />
                Clear Cart (F3)
              </Button>
              <Button
                variant="secondary"
                onClick={() => setShowKeyboardShortcuts(true)}
                className="flex items-center gap-2 rounded-xl bg-slate-900/80 text-slate-100 hover:bg-slate-800/80"
              >
                ⌨️ Shortcuts (F4)
              </Button>
            </div>
          </div>
        </div>
      </div>

      {isOrderingActive ? renderOrderingWorkspace() : renderPreOrderView()}

      {/* Order Cart Modal */}
      <Modal
        isOpen={isCartModalOpen}
        onClose={() => setIsCartModalOpen(false)}
        title="Order Cart"
        size="xl"
      >
        <div className="space-y-6">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              {ORDER_TYPE_OPTIONS.map(({ value, label, icon: Icon }) => {
                const isActive = orderType === value;
                return (
                  <Button
                    key={value}
                    size="sm"
                    variant={isActive ? 'primary' : 'secondary'}
                    onClick={() => handleOrderTypeChange(value)}
                    className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm transition ${
                      isActive ? 'bg-sky-600 hover:bg-sky-500 text-white shadow shadow-sky-700/30' : 'bg-slate-900/80 text-slate-200 hover:bg-slate-800/70'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    {label}
                  </Button>
                );
              })}
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1 rounded-xl border border-slate-800 bg-slate-950/60 p-4">
                <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Table</p>
                {orderType === 'dine-in' ? (
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-sm font-semibold text-slate-100">
                      {selectedTable
                        ? `Table ${activeTable?.number || activeTable?.tableNumber || selectedTable}`
                        : 'No table selected'}
                    </span>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => setIsTableModalOpen(true)}
                      className="bg-slate-900/80 text-slate-100 hover:bg-slate-800/80"
                    >
                      Choose Table
                    </Button>
                  </div>
                ) : (
                  <p className="text-sm text-slate-300">Table not required for this order type.</p>
                )}
              </div>
              <div className="space-y-1 rounded-xl border border-slate-800 bg-slate-950/60 p-4">
                <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Assigned Waiter</p>
                <select
                  value={selectedWaiterId}
                  onChange={(event) => setSelectedWaiterId(event.target.value)}
                  className="w-full rounded-lg border border-slate-800 bg-slate-900/80 px-3 py-2 text-sm text-slate-100 focus:border-sky-500 focus:outline-none"
                >
                  {waiterOptions.length === 0 ? (
                    <option value="">No waiters found</option>
                  ) : (
                    waiterOptions.map((waiter) => (
                      <option key={waiter.id} value={waiter.id} className="bg-slate-900">
                        {waiter.name}
                      </option>
                    ))
                  )}
                </select>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-slate-100">Items in Cart</h3>
            <div className="max-h-72 overflow-y-auto rounded-xl border border-slate-850 bg-slate-950/70">
              {cart.length === 0 ? (
                <div className="py-12 text-center text-slate-500">
                  <ShoppingCartIcon className="mx-auto mb-3 h-10 w-10 opacity-40" />
                  <p>No items yet. Add menu items to begin.</p>
                </div>
              ) : (
                cart.map((item) => {
                  const itemDiscount = discountMode === 'item' ? itemDiscounts[item.id] : undefined;
                  const itemDiscountAmount = discountMode === 'item' ? getItemDiscountAmount(item) : 0;
                  return (
                    <div key={item.id} className="border-b border-slate-900 last:border-b-0 px-4 py-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 space-y-1">
                          <div className="flex items-center gap-2">
                            <h4 className="font-semibold text-slate-100">{item.name}</h4>
                            <Badge className="bg-slate-900/70 text-slate-300 border border-slate-800">
                              {formatCurrency(item.price)}
                            </Badge>
                          </div>
                          <p className="text-xs text-slate-500">{item.category}</p>
                          {item.notes ? (
                            <p className="text-xs text-slate-400">Note: {item.notes}</p>
                          ) : null}
                          {itemDiscountAmount > 0 && (
                            <p className="text-xs text-emerald-300">
                              Discount: {formatCurrency(itemDiscountAmount)}{' '}
                              {itemDiscount?.type === 'percent' ? `(${itemDiscount?.value}% )` : ''}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => updateQuantity(item.id, item.quantity - 1)}
                            className="h-8 w-8 p-0 text-slate-300 hover:text-slate-100"
                          >
                            <MinusIcon className="h-4 w-4" />
                          </Button>
                          <span className="w-8 text-center text-sm font-semibold text-slate-200">{item.quantity}</span>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => updateQuantity(item.id, item.quantity + 1)}
                            className="h-8 w-8 p-0 text-slate-300 hover:text-slate-100"
                          >
                            <PlusIcon className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setNoteEditor({ itemId: item.id, value: item.notes || '' })}
                            className="h-8 w-8 p-0 text-sky-300 hover:text-sky-100"
                            title="Add note"
                          >
                            <PencilSquareIcon className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => removeFromCart(item.id)}
                            className="h-8 w-8 p-0 text-rose-400 hover:text-rose-200"
                          >
                            <TrashIcon className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      <div className="mt-3 flex items-center justify-between text-sm text-slate-300">
                        <span>Line total</span>
                        <span className="font-semibold text-slate-100">
                          {formatCurrency(item.price * item.quantity - itemDiscountAmount)}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <div className="space-y-3 rounded-xl border border-slate-850 bg-slate-950/70 p-4">
            <div className="flex flex-wrap items-center gap-4 text-sm">
              <span className="font-semibold text-slate-100">Discount</span>
              <label className="flex items-center gap-2 text-slate-300">
                <input
                  type="radio"
                  name="discount-mode"
                  value="full"
                  checked={discountMode === 'full'}
                  onChange={() => setDiscountMode('full')}
                  className="h-4 w-4 text-sky-500"
                />
                Full order
              </label>
              <label className="flex items-center gap-2 text-slate-300">
                <input
                  type="radio"
                  name="discount-mode"
                  value="item"
                  checked={discountMode === 'item'}
                  onChange={() => setDiscountMode('item')}
                  className="h-4 w-4 text-sky-500"
                />
                Item wise
              </label>
            </div>
            {discountMode === 'full' ? (
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <Input
                  value={discountValue}
                  onChange={(event) => setDiscountValue(event.target.value)}
                  placeholder="0"
                  type="number"
                  min="0"
                  className="bg-slate-950/60 border-slate-850 text-slate-100"
                />
                <select
                  value={discountType}
                  onChange={(event) => setDiscountType(event.target.value as 'percent' | 'amount')}
                  className="rounded-lg border border-slate-800 bg-slate-900/80 px-3 py-2 text-sm text-slate-100 focus:border-sky-500 focus:outline-none"
                >
                  <option value="percent">Percent</option>
                  <option value="amount">Amount</option>
                </select>
              </div>
            ) : (
              <div className="flex flex-wrap items-center gap-3">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setIsItemDiscountModalOpen(true)}
                  className="bg-slate-900/80 text-slate-100 hover:bg-slate-800/80"
                >
                  Manage item discounts
                </Button>
                <span className="text-xs text-slate-400">
                  Discounts apply per item; open the editor to adjust amounts.
                </span>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-100">Order Notes</label>
            <textarea
              value={orderNotes}
              onChange={(event) => setOrderNotes(event.target.value)}
              placeholder="Kitchen or cashier notes, customer requests, etc."
              className="w-full min-h-[100px] rounded-xl border border-slate-850 bg-slate-950/70 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-sky-600 focus:outline-none focus:ring-2 focus:ring-sky-600/40"
            />
          </div>

          <div className="rounded-xl border border-slate-850 bg-slate-950/75 p-4 space-y-2 text-sm">
            <div className="flex items-center justify-between text-slate-300">
              <span>Subtotal</span>
              <span className="text-slate-100">{formatCurrency(orderSummary.subtotal)}</span>
            </div>
            {orderSummary.discount > 0 && (
              <div className="flex items-center justify-between text-emerald-300">
                <span>Discount</span>
                <span>-{formatCurrency(orderSummary.discount)}</span>
              </div>
            )}
            <div className="flex items-center justify-between text-slate-300">
              <span>Tax ({taxRate}%)</span>
              <span className="text-slate-100">{formatCurrency(orderSummary.tax)}</span>
            </div>
            {orderSummary.deliveryFee > 0 && (
              <div className="flex items-center justify-between text-slate-300">
                <span>Delivery Fee</span>
                <span className="text-slate-100">{formatCurrency(orderSummary.deliveryFee)}</span>
              </div>
            )}
            <div className="flex items-center justify-between border-t border-slate-800 pt-3 text-base font-semibold text-emerald-400">
              <span>Total Due</span>
              <span>{formatCurrency(orderSummary.total)}</span>
            </div>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-xs text-slate-500">
              {selectedWaiterName ? `Assigned waiter: ${selectedWaiterName}` : 'Waiter not set'}
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="secondary" onClick={handleCreateOrder} disabled={checkoutBlocked || cart.length === 0}>
                <ClockIcon className="mr-2 h-4 w-4" />
                Create Order
              </Button>
              <Button
                variant="primary"
                onClick={handlePayment}
                disabled={checkoutBlocked || cart.length === 0}
                className="bg-emerald-600 hover:bg-emerald-500"
              >
                <CreditCardIcon className="mr-2 h-4 w-4" />
                Process Payment
              </Button>
            </div>
          </div>
        </div>
      </Modal>

      {/* Item Discount Modal */}
      <Modal
        isOpen={isItemDiscountModalOpen}
        onClose={() => setIsItemDiscountModalOpen(false)}
        title="Item Discounts"
      >
        <div className="space-y-4">
          {cart.length === 0 ? (
            <p className="text-sm text-slate-400">Add items to the cart to configure item-level discounts.</p>
          ) : (
            cart.map((item) => {
              const entry = itemDiscounts[item.id] || { type: 'percent', value: '0' };
              return (
                <div key={item.id} className="rounded-lg border border-slate-850 bg-slate-950/70 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-semibold text-slate-100">{item.name}</h4>
                      <p className="text-xs text-slate-500">{formatCurrency(item.price)} • Qty {item.quantity}</p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => updateItemDiscountEntry(item.id, { type: 'percent', value: '0' })}
                      className="text-xs text-slate-400 hover:text-slate-100"
                    >
                      Reset
                    </Button>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <select
                      value={entry.type}
                      onChange={(event) =>
                        updateItemDiscountEntry(item.id, { type: event.target.value as 'percent' | 'amount', value: entry.value })
                      }
                      className="rounded-lg border border-slate-800 bg-slate-900/80 px-3 py-2 text-sm text-slate-100 focus:border-sky-500 focus:outline-none"
                    >
                      <option value="percent">Percent</option>
                      <option value="amount">Amount</option>
                    </select>
                    <Input
                      value={entry.value}
                      onChange={(event) =>
                        updateItemDiscountEntry(item.id, { type: entry.type, value: event.target.value })
                      }
                      placeholder="0"
                      type="number"
                      min="0"
                      className="bg-slate-950/60 border-slate-850 text-slate-100 placeholder:text-slate-500"
                    />
                    <div className="rounded-lg border border-slate-800 bg-slate-950/60 px-3 py-2 text-sm text-slate-300">
                      Savings: {formatCurrency(getItemDiscountAmount(item))}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </Modal>

      {/* Item Note Modal */}
      <Modal
        isOpen={Boolean(noteEditor)}
        onClose={() => setNoteEditor(null)}
        title="Edit Item Note"
      >
        {noteEditor && (
          <div className="space-y-4">
            <textarea
              value={noteEditor.value}
              onChange={(event) => setNoteEditor({ ...noteEditor, value: event.target.value })}
              placeholder="Add special instructions for this item"
              className="w-full min-h-[120px] rounded-xl border border-slate-850 bg-slate-950/60 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-sky-600 focus:outline-none focus:ring-2 focus:ring-sky-600/40"
            />
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setNoteEditor(null)}>
                Cancel
              </Button>
              <Button
                onClick={() => {
                  updateItemNote(noteEditor.itemId, noteEditor.value);
                  setNoteEditor(null);
                }}
                className="bg-sky-600 hover:bg-sky-500"
              >
                Save Note
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Table Selection Modal */}
      <Modal
        isOpen={isTableModalOpen}
        onClose={() => setIsTableModalOpen(false)}
        title="Select Table"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {tablesLoading ? (
              [...Array(8)].map((_, i) => (
                <div key={i} className="h-16 bg-gray-200 rounded-lg animate-pulse"></div>
              ))
            ) : tables.length > 0 ? (
              tables.map((table: any) => (
                <button
                  key={table.id}
                  onClick={() => {
                    setSelectedTable(table.id);
                    setHasStartedOrder(true);
                    setIsTableModalOpen(false);
                  }}
                  className={`p-3 rounded-lg border-2 transition-colors ${
                    selectedTable === table.id
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                      : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                  }`}
                >
                  <div className="text-center">
                    <div className="font-semibold text-gray-900 dark:text-white">
                      Table {table.number || table.tableNumber || table.id}
                    </div>
                    <Badge className={`mt-1 ${getTableStatus(table)}`}>
                      {getTableStatusText(table)}
                    </Badge>
                  </div>
                </button>
              ))
            ) : (
              <div className="col-span-full text-center text-gray-500 dark:text-gray-400 py-8">
                No tables available
              </div>
            )}
          </div>
        </div>
      </Modal>

      {/* Payment Modal */}
      <Modal
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        title="Payment Details"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Payment Method
            </label>
            <div className="grid grid-cols-3 gap-2">
              <Button
                variant={paymentMethod === 'cash' ? 'primary' : 'secondary'}
                onClick={() => setPaymentMethod('cash')}
                className="flex items-center gap-2"
              >
                💵 Cash
              </Button>
              <Button
                variant={paymentMethod === 'card' ? 'primary' : 'secondary'}
                onClick={() => setPaymentMethod('card')}
                className="flex items-center gap-2"
              >
                <CreditCardIcon className="h-4 w-4" />
                Card
              </Button>
              <Button
                variant={paymentMethod === 'split' ? 'primary' : 'secondary'}
                onClick={() => setPaymentMethod('split')}
                className="flex items-center gap-2"
              >
                <UserGroupIcon className="h-4 w-4" />
                Split
              </Button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Customer Name (Optional)
            </label>
            <Input
              value={customerInfo.name}
              onChange={(e) => setCustomerInfo({ ...customerInfo, name: e.target.value })}
              placeholder="Enter customer name"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Phone Number (Optional)
            </label>
            <Input
              value={customerInfo.phone}
              onChange={(e) => setCustomerInfo({ ...customerInfo, phone: e.target.value })}
              placeholder="Enter phone number"
            />
          </div>

          <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
            <div className="flex justify-between text-lg font-bold">
              <span>Total Amount:</span>
              <span className="text-green-600">{formatCurrency(orderSummary.total)}</span>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button
              variant="secondary"
              onClick={() => setIsPaymentModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handlePayment}
              className="bg-green-600 hover:bg-green-700"
            >
              <CheckIcon className="h-4 w-4 mr-2" />
              Process Payment
            </Button>
          </div>
        </div>
      </Modal>

      {/* Keyboard Shortcuts Modal */}
      <Modal
        isOpen={showKeyboardShortcuts}
        onClose={() => setShowKeyboardShortcuts(false)}
        title="Keyboard Shortcuts"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <h3 className="font-semibold text-gray-900 dark:text-white">Navigation</h3>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span>Select Table</span>
                  <kbd className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-xs">F1</kbd>
                </div>
                <div className="flex justify-between">
                  <span>Payment Modal</span>
                  <kbd className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-xs">F2</kbd>
                </div>
                <div className="flex justify-between">
                  <span>Clear Cart</span>
                  <kbd className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-xs">F3</kbd>
                </div>
                <div className="flex justify-between">
                  <span>Show Shortcuts</span>
                  <kbd className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-xs">F4</kbd>
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <h3 className="font-semibold text-gray-900 dark:text-white">Actions</h3>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span>Create Order</span>
                  <kbd className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-xs">Enter</kbd>
                </div>
                <div className="flex justify-between">
                  <span>Close Modals</span>
                  <kbd className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-xs">Esc</kbd>
                </div>
                <div className="flex justify-between">
                  <span>Search Menu</span>
                  <kbd className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-xs">Ctrl+F</kbd>
                </div>
                <div className="flex justify-between">
                  <span>Quick Add</span>
                  <kbd className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-xs">Space</kbd>
                </div>
              </div>
            </div>
          </div>
          <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              💡 <strong>Tip:</strong> Use keyboard shortcuts to speed up order processing. 
              Focus on menu items and press Space to quickly add to cart.
            </p>
          </div>
        </div>
      </Modal>

      {/* Receipt Modal */}
      <Modal
        isOpen={isReceiptModalOpen}
        onClose={() => setIsReceiptModalOpen(false)}
        title="Receipt Preview"
        size="lg"
      >
        <div className="space-y-4">
          {receiptHTML?.html ? (
            <div className="border rounded-lg p-4 bg-white">
              <div 
                dangerouslySetInnerHTML={{ __html: receiptHTML.html }}
                className="receipt-preview"
                style={{
                  fontFamily: 'Courier New, monospace',
                  fontSize: '12px',
                  lineHeight: '1.3',
                  maxWidth: '300px',
                  margin: '0 auto',
                }}
              />
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <ClockIcon className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>Loading receipt...</p>
            </div>
          )}

          <div className="flex flex-wrap gap-2 justify-center">
            <Button
              onClick={() => handlePrintReceipt(currentOrderId, false)}
              variant="secondary"
              className="flex items-center gap-2"
            >
              <PrinterIcon className="w-4 h-4" />
              Print Receipt
            </Button>
            <Button
              onClick={() => handlePrintReceipt(currentOrderId, true)}
              variant="secondary"
              className="flex items-center gap-2"
            >
              <PrinterIcon className="w-4 h-4" />
              Print PDF
            </Button>
            <Button
              onClick={() => handleDownloadReceiptPDF(currentOrderId)}
              variant="secondary"
              className="flex items-center gap-2"
            >
              <DocumentArrowDownIcon className="w-4 h-4" />
              Download PDF
            </Button>
          </div>

          {printers && Array.isArray(printers) && printers.length > 0 && (
            <div className="border-t pt-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Select Printer (Optional)
              </label>
              <select
                value={selectedPrinter}
                onChange={(e) => setSelectedPrinter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Default Printer</option>
                {printers.map((printer) => (
                  <option key={printer.name} value={printer.name}>
                    {printer.name} ({printer.type}) - {printer.isOnline ? 'Online' : 'Offline'}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}
