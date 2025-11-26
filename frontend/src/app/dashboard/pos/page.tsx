'use client';

import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { useGetCategoriesQuery } from '@/lib/api/endpoints/categoriesApi';
import { useLazySearchCustomersQuery } from '@/lib/api/endpoints/customersApi';
import type { CreatePOSOrderRequest } from '@/lib/api/endpoints/posApi';
import {
  useCancelPOSOrderMutation,
  useCreatePOSOrderMutation,
  useDownloadReceiptPDFMutation,
  useGetAvailableTablesQuery,
  useGetPOSMenuItemsQuery,
  useGetPOSOrderQuery,
  useGetPOSOrdersQuery,
  useGetPOSSettingsQuery,
  useGetPrintersQuery,
  useGetReceiptHTMLQuery,
  usePrintReceiptMutation,
  usePrintReceiptPDFMutation,
  useProcessPaymentMutation,
  useUpdatePOSOrderMutation
} from '@/lib/api/endpoints/posApi';
import { useGetStaffQuery } from '@/lib/api/endpoints/staffApi';
import { useSocket } from '@/lib/hooks/useSocket';
import { useAppSelector } from '@/lib/store';
import { formatCurrency, formatDateTime } from '@/lib/utils';
import {
  ArrowPathIcon,
  CheckIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
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

interface ModifierSelection {
  group: string;
  option: string;
  priceModifier: number;
}

interface ModifierChoice {
  group: string;
  options: Array<{
    name: string;
    price: number;
  }>;
}

interface AddonSelection {
  name: string;
  price: number;
}

interface CartItem {
  id: string;
  menuItemId: string;
  name: string;
  basePrice: number;
  price: number;
  quantity: number;
  category: string;
  notes?: string;
  modifiersNote?: string;
  variantSelections?: ModifierSelection[];
  addonSelections?: AddonSelection[];
  selectionChoices?: ModifierChoice[];
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

const ORDER_TYPE_LABELS: Record<OrderType, string> = {
  'dine-in': 'Dine-In',
  delivery: 'Delivery',
  takeaway: 'Takeaway',
};

const ORDER_STATUS_LABELS: Record<'pending' | 'paid' | 'cancelled', string> = {
  pending: 'Pending',
  paid: 'Paid',
  cancelled: 'Cancelled',
};

const ORDER_STATUS_STYLES: Record<'pending' | 'paid' | 'cancelled', string> = {
  pending: 'bg-amber-500/10 text-amber-200 border border-amber-500/30',
  paid: 'bg-emerald-500/10 text-emerald-200 border border-emerald-500/30',
  cancelled: 'bg-rose-500/10 text-rose-200 border border-rose-500/30',
};

const ORDER_STATUS_FILTERS = [
  { value: 'all', label: 'All Statuses' },
  { value: 'pending', label: 'Pending' },
  { value: 'paid', label: 'Paid' },
  { value: 'cancelled', label: 'Cancelled' },
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

type ModifierConfig = {
  quantity: number;
  variantSelections: Record<string, string>;
  selectionChoices: Record<string, string[]>;
  addonSelections: Record<string, boolean>;
};

type SplitPaymentRow = {
  id: string;
  method: 'cash' | 'card' | 'wallet' | 'other';
  amount: string;
};

interface PaymentSuccessState {
  orderId: string;
  orderNumber?: string;
  totalPaid: number;
  changeDue?: number;
  summary: string;
  breakdown?: Array<{ method: string; amount: number }>;
};

const generateClientId = () => {
  const cryptoRef: any = (globalThis as any)?.crypto;
  if (cryptoRef && typeof cryptoRef.randomUUID === 'function') {
    return cryptoRef.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
};

export default function POSPage() {
  const { user, companyContext } = useAppSelector((state) => state.auth);
  
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
  const [customerInfo, setCustomerInfo] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('pos_customerInfo');
      return saved ? JSON.parse(saved) : { name: '', phone: '', email: '' };
    }
    return { name: '', phone: '', email: '' };
  });
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('pos_customerId') || '';
    }
    return '';
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
  const [hasAutoOpenedCart, setHasAutoOpenedCart] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('pos_orderStarted') === 'true';
    }
    return false;
  });
  const [orderNotes, setOrderNotes] = useState('');
  const [selectedWaiterId, setSelectedWaiterId] = useState<string>('');
  const [discountMode, setDiscountMode] = useState<'full' | 'item'>('full');
  const [discountType, setDiscountType] = useState<'percent' | 'amount'>('percent');
  const [discountValue, setDiscountValue] = useState('0');
  const [itemDiscounts, setItemDiscounts] = useState<Record<string, { type: 'percent' | 'amount'; value: string }>>({});
  const [isItemDiscountModalOpen, setIsItemDiscountModalOpen] = useState(false);
  const [noteEditor, setNoteEditor] = useState<{ itemId: string; value: string } | null>(null);
  const [guestCount, setGuestCount] = useState<number>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('pos_guestCount');
      return saved ? parseInt(saved, 10) || 1 : 1;
    }
    return 1;
  });
  const [isCustomerLookupOpen, setIsCustomerLookupOpen] = useState(false);
  const [customerSearchTerm, setCustomerSearchTerm] = useState('');
  const [modifierEditor, setModifierEditor] = useState<{
    item: any;
    quantity: number;
    variantSelections: Record<string, string>;
    selectionChoices: Record<string, string[]>;
    addonSelections: Record<string, boolean>;
  } | null>(null);
  const [paymentTab, setPaymentTab] = useState<'full' | 'multi'>('full');
  const [fullPaymentMethod, setFullPaymentMethod] = useState<'cash' | 'card'>('cash');
  const [fullPaymentReceived, setFullPaymentReceived] = useState<string>('0');
  const [multiPayments, setMultiPayments] = useState<SplitPaymentRow[]>([]);
  const [paymentSuccessOrder, setPaymentSuccessOrder] = useState<PaymentSuccessState | null>(null);
  const [isQueueCollapsed, setIsQueueCollapsed] = useState(true);
  const [queueTab, setQueueTab] = useState<'active' | 'history'>('active');
  const [queueStatusFilter, setQueueStatusFilter] = useState<'all' | 'pending' | 'paid' | 'cancelled'>('pending');
  const [queueOrderTypeFilter, setQueueOrderTypeFilter] = useState<'all' | OrderType>('all');
  const [queueSearchInput, setQueueSearchInput] = useState('');
  const [queueSearchTerm, setQueueSearchTerm] = useState('');
  const [queueDetailId, setQueueDetailId] = useState<string | null>(null);
  const [queueActionOrderId, setQueueActionOrderId] = useState<string | null>(null);

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

  // Socket.IO for real-time updates
  const { socket, isConnected } = useSocket();

  // API calls
  // Note: branchId is extracted from JWT token in backend, no need to pass it
  const { data: tablesData, isLoading: tablesLoading, error: _tablesError, refetch: refetchTables } = useGetAvailableTablesQuery();

  // Listen for table status changes via Socket.IO
  useEffect(() => {
    if (!socket || !isConnected) {
      console.log('🔌 Socket not ready:', { socket: !!socket, isConnected });
      return;
    }

    console.log('✅ Setting up table status listeners');

    const handleTableStatusChanged = (data: any) => {
      console.log('📢 Table status changed event received:', data);
      // Refetch tables when status changes
      refetchTables();
    };

    socket.on('table:status-changed', handleTableStatusChanged);
    socket.on('table:available', handleTableStatusChanged);
    socket.on('table:occupied', handleTableStatusChanged);

    return () => {
      console.log('🧹 Cleaning up table status listeners');
      socket.off('table:status-changed', handleTableStatusChanged);
      socket.off('table:available', handleTableStatusChanged);
      socket.off('table:occupied', handleTableStatusChanged);
    };
  }, [socket, isConnected, refetchTables]);

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
  
  // Use nullish coalescing (??) instead of || to allow 0 as a valid tax rate
  const taxRate = posSettings?.taxRate ?? 10; // Default 10% only if undefined/null
  
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
  const [updateOrder] = useUpdatePOSOrderMutation();
  const { data: printers } = useGetPrintersQuery();
  const {
    data: receiptHTML,
    isFetching: receiptLoading,
    isError: receiptError,
    refetch: refetchReceipt,
    error: receiptErrorDetails,
  } = useGetReceiptHTMLQuery(currentOrderId, {
    skip: !currentOrderId,
  });
  const queueQueryParams = useMemo(() => {
    const params: {
      branchId?: string;
      status?: string;
      orderType?: OrderType;
      limit: number;
      page: number;
      search?: string;
    } = {
      limit: queueTab === 'active' ? 25 : 50,
      page: 1,
    };

    if (user?.branchId) {
      params.branchId = user.branchId;
    }

    if (queueTab === 'active') {
      params.status = 'pending';
    } else if (queueStatusFilter !== 'all') {
      params.status = queueStatusFilter;
    }

    if (queueOrderTypeFilter !== 'all') {
      params.orderType = queueOrderTypeFilter;
    }

    if (queueSearchTerm) {
      params.search = queueSearchTerm;
    }

    return params;
  }, [queueTab, queueStatusFilter, queueOrderTypeFilter, queueSearchTerm, user?.branchId]);

  const {
    data: queueData,
    isFetching: queueLoading,
    refetch: refetchQueue,
  } = useGetPOSOrdersQuery(queueQueryParams, {
    skip: !user,
  });

  const { data: queueDetailData, isFetching: queueDetailLoading } = useGetPOSOrderQuery(queueDetailId as string, {
    skip: !queueDetailId,
  });

  const [cancelOrder] = useCancelPOSOrderMutation();
  const queueOrders = useMemo(() => {
    if (queueData?.orders && Array.isArray(queueData.orders)) {
      return queueData.orders;
    }
    return [] as any[];
  }, [queueData]);
  const queueDetail = queueDetailId
    ? queueDetailData ?? queueOrders.find((order: any) => order.id === queueDetailId)
    : null;
  const queueTotalAmount = useMemo(() => {
    return queueOrders.reduce((sum, order) => {
      const amount = Number(order?.totalAmount ?? 0);
      if (Number.isFinite(amount)) {
        return sum + amount;
      }
      return sum;
    }, 0);
  }, [queueOrders]);

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

  const branchId = (user as any)?.branchId || 
                   (user as any)?.branch?.id || 
                   (user as any)?.branch?._id;

  const { data: staffData, isLoading: staffLoading, error: staffError } = useGetStaffQuery(
    { 
      branchId,
      limit: 200, 
      isActive: true 
    },
    { 
      skip: !branchId,
      refetchOnMountOrArgChange: false 
    }
  );

  const [triggerCustomerSearch, { data: customerSearchResults, isFetching: isCustomerSearchLoading }]
    = useLazySearchCustomersQuery();
  const resolvedCustomerResults = useMemo(() => {
    if (Array.isArray(customerSearchResults)) return customerSearchResults;
    if (!customerSearchResults) return [] as any[];
    if (Array.isArray((customerSearchResults as any).customers)) {
      return (customerSearchResults as any).customers;
    }
    return [] as any[];
  }, [customerSearchResults]);

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

  const menuItemNameById = useMemo(() => {
    const map = new Map<string, { name?: string; price?: number }>();
    if (Array.isArray(menuItemsArray)) {
      menuItemsArray.forEach((item: any) => {
        if (item?.id) {
          map.set(item.id, { name: item.name, price: item.price });
        }
      });
    }
    return map;
  }, [menuItemsArray]);

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

  useEffect(() => {
    const formattedTotal = orderSummary.total.toFixed(2);
    setFullPaymentReceived(formattedTotal);
    setMultiPayments((prev) => {
      if (prev.length === 0) {
        return [{ id: generateClientId(), method: 'cash', amount: formattedTotal }];
      }
      return prev;
    });
  }, [orderSummary.total]);

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
      if (selectedCustomerId) {
        localStorage.setItem('pos_customerId', selectedCustomerId);
      } else {
        localStorage.removeItem('pos_customerId');
      }
    }
  }, [selectedCustomerId]);

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

  // Save delivery details to localStorage
  useEffect(() => {
    if (typeof window !== 'undefined' && orderType === 'delivery') {
      const hasDeliveryDetails = Object.values(deliveryDetails).some(v => v.trim() !== '') || deliveryFee !== '0';
      if (hasDeliveryDetails) {
        localStorage.setItem('pos_deliveryDetails', JSON.stringify(deliveryDetails));
      } else {
        localStorage.removeItem('pos_deliveryDetails');
      }
    }
  }, [deliveryDetails, deliveryFee, orderType]);

  // Save takeaway details to localStorage
  useEffect(() => {
    if (typeof window !== 'undefined' && orderType === 'takeaway') {
      const hasTakeawayDetails = Object.values(takeawayDetails).some(v => v.trim() !== '');
      if (hasTakeawayDetails) {
        localStorage.setItem('pos_takeawayDetails', JSON.stringify(takeawayDetails));
      } else {
        localStorage.removeItem('pos_takeawayDetails');
      }
    }
  }, [takeawayDetails, orderType]);

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

  useEffect(() => {
    if (!isCustomerLookupOpen) {
      return;
    }
    const term = customerSearchTerm.trim();
    if (term.length < 2) {
      return;
    }
    const handle = window.setTimeout(() => {
      const companyId = (user as any)?.companyId || (companyContext as any)?.companyId;
      triggerCustomerSearch({ 
        query: term, 
        branchId: user?.branchId || undefined,
        companyId: companyId || undefined
      });
    }, 250);
    return () => window.clearTimeout(handle);
  }, [customerSearchTerm, isCustomerLookupOpen, triggerCustomerSearch, user?.branchId]);

  useEffect(() => {
    const handle = window.setTimeout(() => {
      setQueueSearchTerm(queueSearchInput.trim());
    }, 300);

    return () => window.clearTimeout(handle);
  }, [queueSearchInput]);

  useEffect(() => {
    if (queueTab === 'active' && queueStatusFilter !== 'pending') {
      setQueueStatusFilter('pending');
    }

    if (queueTab === 'history' && queueStatusFilter === 'pending') {
      setQueueStatusFilter('all');
    }
  }, [queueTab, queueStatusFilter]);

  const buildItemNotes = useCallback((item: CartItem) => {
    const segments: string[] = [];
    if (item.modifiersNote) {
      segments.push(item.modifiersNote);
    }
    if (item.notes) {
      segments.push(item.notes);
    }
    return segments.length > 0 ? segments.join('\n') : undefined;
  }, []);

  const hasMenuItemModifiers = useCallback((menuItem: any) => {
    const hasVariants = Array.isArray(menuItem?.variants) && menuItem.variants.length > 0;
    const hasAddons = Array.isArray(menuItem?.addons) && menuItem.addons.some((addon: any) => addon?.isAvailable !== false);
    const hasSelections = Array.isArray(menuItem?.selections) && menuItem.selections.length > 0;
    return hasVariants || hasAddons || hasSelections;
  }, []);
    
  const getDefaultModifierConfig = useCallback((menuItem: any): ModifierConfig => {
    const variantSelections: Record<string, string> = {};
    const selectionChoices: Record<string, string[]> = {};
    const addonSelections: Record<string, boolean> = {};

    if (Array.isArray(menuItem?.variants)) {
      menuItem.variants.forEach((variant: any) => {
        if (!variant?.name || !Array.isArray(variant.options) || variant.options.length === 0) {
          return;
        }
        const defaultOption = variant.options[0];
        if (defaultOption?.name) {
          variantSelections[variant.name] = defaultOption.name;
        }
      });
    }

    if (Array.isArray(menuItem?.selections)) {
      menuItem.selections.forEach((selection: any) => {
        if (!selection?.name || !Array.isArray(selection.options) || selection.options.length === 0) {
          selectionChoices[selection?.name ?? ''] = [];
          return;
        }
        if (selection.type === 'single') {
          selectionChoices[selection.name] = [selection.options[0].name];
        } else {
          selectionChoices[selection.name] = [];
        }
      });
    }

    if (Array.isArray(menuItem?.addons)) {
      menuItem.addons.forEach((addon: any) => {
        if (!addon?.name) return;
        if (addon?.isAvailable === false) {
          addonSelections[addon.name] = false;
          return;
        }
        addonSelections[addon.name] = false;
      });
    }

    return {
      quantity: 1,
      variantSelections,
      selectionChoices,
      addonSelections,
    };
  }, []);

  const buildCartItemFromMenuItem = useCallback((menuItem: any, overrides?: Partial<ModifierConfig>): CartItem => {
    const defaults = getDefaultModifierConfig(menuItem);
    const config: ModifierConfig = {
      quantity: overrides?.quantity ?? defaults.quantity,
      variantSelections: { ...defaults.variantSelections, ...(overrides?.variantSelections ?? {}) },
      selectionChoices: { ...defaults.selectionChoices, ...(overrides?.selectionChoices ?? {}) },
      addonSelections: { ...defaults.addonSelections, ...(overrides?.addonSelections ?? {}) },
    };

    const basePrice = Number(menuItem?.price) || 0;
    let unitPrice = basePrice;

    const variantSelections: ModifierSelection[] = [];
    const addonSelections: AddonSelection[] = [];
    const selectionChoices: ModifierChoice[] = [];
    const summaryParts: string[] = [];

    if (Array.isArray(menuItem?.variants)) {
      menuItem.variants.forEach((variant: any) => {
        if (!variant?.name || !Array.isArray(variant.options) || variant.options.length === 0) {
          return;
        }
        const requestedOptionName = config.variantSelections[variant.name];
        const option = variant.options.find((opt: any) => opt?.name === requestedOptionName) || variant.options[0];
        if (!option) {
          return;
        }
        const modifierAmount = Number(option.priceModifier) || 0;
        unitPrice += modifierAmount;
        variantSelections.push({
          group: variant.name,
          option: option.name,
          priceModifier: modifierAmount,
        });
        const label = modifierAmount
          ? `${variant.name}: ${option.name} (+${formatCurrency(modifierAmount)})`
          : `${variant.name}: ${option.name}`;
        summaryParts.push(label);
      });
    }

    if (Array.isArray(menuItem?.selections)) {
      menuItem.selections.forEach((selection: any) => {
        if (!selection?.name || !Array.isArray(selection.options) || selection.options.length === 0) {
          return;
        }
        const chosen = config.selectionChoices[selection.name] ?? [];
        const normalized = Array.isArray(chosen) ? chosen : [chosen];
        const applied: ModifierChoice['options'] = [];

        normalized.forEach((choiceName) => {
          if (!choiceName) return;
          const option = selection.options.find((opt: any) => opt?.name === choiceName);
          if (!option) return;
          const priceToAdd = Number(option.price) || 0;
          unitPrice += priceToAdd;
          applied.push({ name: option.name, price: priceToAdd });
        });

        if (applied.length > 0) {
          selectionChoices.push({
            group: selection.name,
            options: applied,
          });
          const label = `${selection.name}: ${applied
            .map((opt) => (opt.price ? `${opt.name} (+${formatCurrency(opt.price)})` : opt.name))
            .join(', ')}`;
          summaryParts.push(label);
        }
      });
    }

    if (Array.isArray(menuItem?.addons)) {
      const chosenAddons = menuItem.addons.filter((addon: any) => {
        if (!addon?.name || addon?.isAvailable === false) return false;
        return Boolean(config.addonSelections[addon.name]);
      });
      if (chosenAddons.length > 0) {
        const addonLabels: string[] = [];
        chosenAddons.forEach((addon: any) => {
          const addonPrice = Number(addon.price) || 0;
          unitPrice += addonPrice;
          addonSelections.push({ name: addon.name, price: addonPrice });
          addonLabels.push(addonPrice ? `${addon.name} (+${formatCurrency(addonPrice)})` : addon.name);
        });
        summaryParts.push(`Add-ons: ${addonLabels.join(', ')}`);
      }
    }

    return {
      id: overrides && 'id' in overrides && overrides.id ? String((overrides as any).id) : generateClientId(),
            menuItemId: menuItem.id,
            name: menuItem.name,
      basePrice,
      price: Number(unitPrice.toFixed(2)),
      quantity: config.quantity,
            category: menuItem.category?.name || 'Uncategorized',
      modifiersNote: summaryParts.length > 0 ? summaryParts.join('; ') : undefined,
      variantSelections: variantSelections.length > 0 ? variantSelections : undefined,
      addonSelections: addonSelections.length > 0 ? addonSelections : undefined,
      selectionChoices: selectionChoices.length > 0 ? selectionChoices : undefined,
    };
  }, [getDefaultModifierConfig]);

  const areModifiersEqual = useCallback((first: CartItem, second: CartItem) => {
    if (first.menuItemId !== second.menuItemId) {
      return false;
    }

    const serializeVariants = (item: CartItem) =>
      JSON.stringify((item.variantSelections || [])
        .map((entry) => `${entry.group}:${entry.option}`)
        .sort());

    const serializeAddons = (item: CartItem) =>
      JSON.stringify((item.addonSelections || [])
        .map((entry) => entry.name)
        .sort());

    const serializeChoices = (item: CartItem) =>
      JSON.stringify((item.selectionChoices || [])
        .map((entry) => ({
          group: entry.group,
          options: entry.options.map((option) => option.name).sort(),
        }))
        .sort((a, b) => a.group.localeCompare(b.group)));

    return (
      serializeVariants(first) === serializeVariants(second) &&
      serializeAddons(first) === serializeAddons(second) &&
      serializeChoices(first) === serializeChoices(second) &&
      (first.modifiersNote || '') === (second.modifiersNote || '')
    );
  }, []);

  const appendCartItem = useCallback((newItem: CartItem, silent = false) => {
    setCart((prev) => {
      const existingIndex = prev.findIndex((item) => areModifiersEqual(item, newItem));
      if (existingIndex >= 0) {
        const next = [...prev];
        next[existingIndex] = {
          ...next[existingIndex],
          quantity: next[existingIndex].quantity + newItem.quantity,
        };
        return next;
      }
      return [...prev, newItem];
    });
    if (!silent) {
      toast.success(`${newItem.name} added to cart`);
    }
  }, [areModifiersEqual]);

  const addMultiPaymentRow = useCallback(() => {
    setMultiPayments((prev) => [...prev, { id: generateClientId(), method: 'cash', amount: '0' }]);
  }, []);

  const updateMultiPaymentRow = useCallback((id: string, patch: Partial<{ method: 'cash' | 'card' | 'wallet' | 'other'; amount: string }>) => {
    setMultiPayments((prev) => prev.map((payment) => (payment.id === id ? { ...payment, ...patch } : payment)));
  }, []);

  const removeMultiPaymentRow = useCallback((id: string) => {
    setMultiPayments((prev) => prev.filter((payment) => payment.id !== id));
  }, []);

  const applyCustomerSelection = useCallback((customer: any) => {
    if (!customer) {
      return;
    }
    const firstName = customer.firstName || customer.name || '';
    const lastName = customer.lastName || '';
    const composedName =
      `${firstName} ${lastName}`.trim() ||
      customer.email ||
      customer.phoneNumber ||
      customer.phone ||
      'Customer';
    const phone = customer.phoneNumber || customer.phone || '';
    const email = customer.email || '';

    setCustomerInfo({
      name: composedName,
      phone,
      email,
    });
    setSelectedCustomerId(customer.id || customer._id || '');
    setIsCustomerLookupOpen(false);
    toast.success(`Linked customer ${composedName}`);
  }, []);

  const clearCustomerSelection = useCallback(() => {
    setSelectedCustomerId('');
    setCustomerInfo({ name: '', phone: '', email: '' });
    toast.success('Customer cleared');
  }, []);

  const closeModifierEditor = useCallback(() => setModifierEditor(null), []);

  const handleModifierConfirm = useCallback(() => {
    if (!modifierEditor) {
      return;
    }
    const cartItem = buildCartItemFromMenuItem(modifierEditor.item, modifierEditor);
    appendCartItem(cartItem);
    setModifierEditor(null);
  }, [appendCartItem, buildCartItemFromMenuItem, modifierEditor]);

  // Cart functions
  const addToCart = useCallback((menuItem: any) => {
    if (hasMenuItemModifiers(menuItem)) {
      const defaults = getDefaultModifierConfig(menuItem);
      setModifierEditor({
        item: menuItem,
        quantity: defaults.quantity,
        variantSelections: defaults.variantSelections,
        selectionChoices: defaults.selectionChoices,
        addonSelections: defaults.addonSelections,
      });
      return;
    }

    const cartItem = buildCartItemFromMenuItem(menuItem, { quantity: 1 });
    appendCartItem(cartItem);
  }, [appendCartItem, buildCartItemFromMenuItem, getDefaultModifierConfig, hasMenuItemModifiers]);

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
    setSelectedCustomerId('');
    setCustomerInfo({ name: '', phone: '', email: '' });
    setPaymentTab('full');
    setFullPaymentMethod('cash');
    setFullPaymentReceived('0');
    setMultiPayments([]);
    if (typeof window !== 'undefined') {
      localStorage.removeItem('pos_cart');
      localStorage.removeItem('pos_customerId');
      localStorage.removeItem('pos_customerInfo');
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
        setHasStartedOrder(Boolean(selectedTable));
      } else {
        setHasStartedOrder(false);
      }
    },
    [selectedTable]
  );

  const [occupiedTableModal, setOccupiedTableModal] = useState<{ tableId: string; orderDetails: any } | null>(null);

  const handleTableSelection = useCallback(
    (tableId: string) => {
      if (!tableId) {
        setSelectedTable('');
        setHasStartedOrder(false);
        return;
      }

      const table = tables.find((entry: any) => entry.id === tableId);
      
      // If table is occupied, show modal with options
      if (table?.status === 'occupied' && table?.orderDetails) {
        setOccupiedTableModal({ tableId, orderDetails: table.orderDetails });
        return;
      }

      // If table is reserved, show error
      if (table?.status === 'reserved') {
        toast.error('This table is reserved. Please choose another table.');
        return;
      }

      setSelectedTable(tableId);
      setHasStartedOrder(true);
    },
    [tables]
  );

  const handleResumeOrder = useCallback(async () => {
    if (!occupiedTableModal) return;
    
    // Try to get orderId from multiple sources
    const orderId = occupiedTableModal.orderDetails?.currentOrderId 
      || occupiedTableModal.orderDetails?.allOrders?.[0]?.id
      || tables.find((t: any) => t.id === occupiedTableModal.tableId)?.orderDetails?.currentOrderId;
    
    if (!orderId) {
      toast.error('Order ID not found. Please try selecting the table again.');
      return;
    }

    try {
      // Fetch order using RTK Query - get the order data from the API
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
      const apiUrl = baseUrl.endsWith('/api/v1') ? baseUrl : `${baseUrl}/api/v1`;
      
      const orderResponse = await fetch(`${apiUrl}/pos/orders/${orderId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken') || localStorage.getItem('token')}`,
          'Content-Type': 'application/json',
        },
      });
      
      if (!orderResponse.ok) {
        const errorData = await orderResponse.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to fetch order');
      }

      const orderData = await orderResponse.json();
      const order = orderData.data || orderData;
      
      if (!order || !order.items) {
        throw new Error('Invalid order data received');
      }

      // Check if order is paid - don't allow editing paid orders
      if (order.status === 'paid') {
        toast.error('Cannot edit a paid order. Please create a new order or process a refund.');
        return;
      }

      // Load order items into cart
      if (order.items && Array.isArray(order.items)) {
        const cartItems: CartItem[] = [];
        for (const item of order.items) {
          const menuItemId = item.menuItemId?.toString() || item.menuItemId?._id?.toString() || '';
          const menuItem = menuItemsArray.find((mi: any) => 
            mi.id === menuItemId || 
            mi._id?.toString() === menuItemId ||
            mi.id === item.menuItemId ||
            mi._id === item.menuItemId
          );
          
          cartItems.push({
            id: generateClientId(),
            menuItemId: menuItemId,
            name: menuItem?.name || item.menuItemId?.name || 'Unknown Item',
            basePrice: item.price || 0,
            price: item.price || 0,
            quantity: item.quantity || 1,
            category: typeof menuItem?.category === 'string' ? menuItem.category : (menuItem?.category?.name || ''),
            notes: item.notes || '',
          });
        }
        setCart(cartItems);
      }

      // Set table and guest count
      setSelectedTable(occupiedTableModal.tableId);
      if (order.guestCount) {
        setGuestCount(order.guestCount);
        if (typeof window !== 'undefined') {
          localStorage.setItem('pos_guestCount', order.guestCount.toString());
        }
      }
      setHasStartedOrder(true);
      setIsCartModalOpen(true);
      setOccupiedTableModal(null);
      toast.success('Order loaded. You can now edit items.');
    } catch (error: any) {
      console.error('Error resuming order:', error);
      toast.error(error?.message || 'Failed to load order. Please try again.');
    }
  }, [occupiedTableModal, menuItemsArray, tables]);

  const handleStartNewOrderOnTable = useCallback(() => {
    if (!occupiedTableModal) return;
    const table = tables.find((t: any) => t.id === occupiedTableModal.tableId);
    if (table?.orderDetails?.remainingSeats && table.orderDetails.remainingSeats > 0) {
      setSelectedTable(occupiedTableModal.tableId);
      setGuestCount(Math.min(guestCount, table.orderDetails.remainingSeats));
      setHasStartedOrder(true);
      setIsCartModalOpen(true);
      setOccupiedTableModal(null);
      toast.success(`Starting new order for ${table.orderDetails.remainingSeats} remaining seats`);
    } else {
      toast.error('No remaining seats available on this table');
    }
  }, [occupiedTableModal, tables, guestCount]);

  const handleCancelOccupiedOrder = useCallback(async () => {
    if (!occupiedTableModal?.orderDetails?.currentOrderId) return;
    
    if (typeof window !== 'undefined') {
      const confirmed = window.confirm('Are you sure you want to cancel this order? This will free up the table.');
      if (!confirmed) {
        return;
      }
    }

    try {
      // Cancel order with reason
      const orderId = occupiedTableModal.orderDetails.currentOrderId;
      await cancelOrder({ 
        id: orderId,
        reason: 'Cancelled from POS terminal'
      }).unwrap();
      toast.success('Order cancelled successfully. Table is now available.');
      setOccupiedTableModal(null);
      refetchTables();
      refetchQueue();
    } catch (error: any) {
      console.error('Error cancelling order:', error);
      toast.error(error?.data?.message || 'Failed to cancel order');
    }
  }, [occupiedTableModal, cancelOrder, refetchTables, refetchQueue]);

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
      if (selectedCustomerId) {
        noteSegments.push(`Customer ID: ${selectedCustomerId}`);
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
        ...(requiresTable && selectedTable ? { guestCount: guestCount || 1 } : {}),
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
          notes: buildItemNotes(item),
        })),
        customerInfo: customerInfo,
        totalAmount: Number(orderSummary.total.toFixed(2)),
        status: 'pending' as const,
        notes: noteSegments.length > 0 ? noteSegments.join('\n') : undefined,
      };

      const orderResponse = await createOrderWithRetry(orderData);
      const order = (orderResponse as any).data || orderResponse;
      toast.success(`Order created successfully! Order #${order.orderNumber || order.id}`);
      refetchQueue();
      refetchTables(); // Refetch tables to update status
      clearCart();
      if (requiresTable) {
        setSelectedTable('');
        setGuestCount(1);
        if (typeof window !== 'undefined') {
          localStorage.removeItem('pos_selectedTable');
          localStorage.removeItem('pos_guestCount');
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
    buildItemNotes,
    selectedCustomerId,
    refetchQueue,
    guestCount,
    refetchTables,
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

    const totalDue = Number(orderSummary.total.toFixed(2));
    if (!Number.isFinite(totalDue) || totalDue <= 0) {
      toast.error('Total due must be greater than zero before processing payment');
      return;
    }
 
    try {
      const deliveryPayload = isDelivery
        ? (sanitizeDetails(deliveryDetails) as CreatePOSOrderRequest['deliveryDetails'])
        : undefined;
      const takeawayPayload = isTakeaway
        ? (sanitizeDetails(takeawayDetails) as CreatePOSOrderRequest['takeawayDetails'])
        : undefined;
 
      const paymentNotes: string[] = [];
      let paymentMethodForBackend: 'cash' | 'card' | 'split' = 'cash';
      let transactionReference: string | undefined;
      let changeDue = 0;
      let paymentBreakdown: Array<{ method: string; amount: number }> = [];
 
      if (paymentTab === 'full') {
        const received = parseFloat(fullPaymentReceived || '0');
        if (!Number.isFinite(received) || received <= 0) {
          toast.error('Enter the amount received before completing payment');
          return;
        }
        if (fullPaymentMethod === 'cash' && received + 0.009 < totalDue) {
          toast.error('Received cash is less than the total due');
          return;
        }
 
        paymentMethodForBackend = fullPaymentMethod;
        paymentBreakdown = [{ method: fullPaymentMethod, amount: totalDue }];
        if (fullPaymentMethod === 'cash') {
          changeDue = Math.max(0, received - totalDue);
          paymentNotes.push(
            `Cash payment received ${formatCurrency(received)} • Change ${formatCurrency(changeDue)}`
          );
          transactionReference = `cash:${received.toFixed(2)}|change:${changeDue.toFixed(2)}`;
        } else {
          paymentNotes.push(`Card payment processed for ${formatCurrency(totalDue)}`);
        }
      } else {
        const activeRows = multiPayments.filter((row) => parseFloat(row.amount || '0') > 0);
        if (activeRows.length === 0) {
          toast.error('Add at least one payment row with an amount to process a split payment');
          return;
        }
        const totalApplied = activeRows.reduce((sum, row) => sum + (parseFloat(row.amount || '0') || 0), 0);
        if (totalApplied + 0.009 < totalDue) {
          toast.error('The split payments do not cover the total due yet');
          return;
        }
 
        paymentMethodForBackend = 'split';
        paymentBreakdown = activeRows.map((row) => ({
          method: row.method,
          amount: parseFloat(row.amount || '0') || 0,
        }));
        const breakdownSummary = activeRows
          .map((row) => `${row.method}: ${formatCurrency(parseFloat(row.amount || '0') || 0)}`)
          .join(', ');
        paymentNotes.push(`Split payment applied — ${breakdownSummary}`);
        transactionReference = activeRows
          .map((row) => `${row.method}:${(parseFloat(row.amount || '0') || 0).toFixed(2)}`)
          .join('|');
 
        const cashPortion = activeRows
          .filter((row) => row.method === 'cash')
          .reduce((sum, row) => sum + (parseFloat(row.amount || '0') || 0), 0);
        if (cashPortion > 0 && totalApplied > totalDue) {
          changeDue = totalApplied - totalDue;
          paymentNotes.push(`Change due: ${formatCurrency(changeDue)}`);
        }
      }
 
      const noteSegments: string[] = [];
      if (orderNotes.trim()) {
        noteSegments.push(orderNotes.trim());
      }
      if (selectedWaiterName) {
        noteSegments.push(`Waiter: ${selectedWaiterName}`);
      }
      if (selectedCustomerId) {
        noteSegments.push(`Customer ID: ${selectedCustomerId}`);
      }
      if (orderSummary.discount > 0) {
        if (discountMode === 'full') {
          noteSegments.push(
            `Discount applied: ${
              discountType === 'percent'
                ? `${discountValue}%`
                : formatCurrency(Number(discountValue || '0'))
            } on full order`
          );
        } else {
          noteSegments.push('Item-wise discounts applied.');
        }
      }
      noteSegments.push(...paymentNotes);
 
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
        items: cart.map((item) => ({
          menuItemId: item.menuItemId,
          quantity: item.quantity,
          price: item.price,
          notes: buildItemNotes(item),
        })),
        customerInfo: customerInfo,
        totalAmount: totalDue,
        status: 'pending' as const,
        paymentMethod: paymentMethodForBackend,
        notes: noteSegments.length > 0 ? noteSegments.join('\n') : undefined,
      };

      const orderResponse = await createOrderWithRetry(orderData);
      const order = (orderResponse as any).data || orderResponse;
      const orderId = order.id || order._id;
      const orderNumber = order.orderNumber || order.order_number || orderId;
      
      await processPayment({
        orderId,
        amount: totalDue,
        method: paymentMethodForBackend,
        transactionId: transactionReference,
      }).unwrap();

      setCurrentOrderId(orderId);
      setPaymentSuccessOrder({
          orderId,
        orderNumber,
        totalPaid: totalDue,
        changeDue: changeDue > 0 ? changeDue : undefined,
        summary: paymentNotes.join(' | '),
        breakdown: paymentBreakdown,
      });
      toast.success('Payment completed successfully');
      refetchQueue();
 
      clearCart();
      if (requiresTable) {
        setSelectedTable('');
        setGuestCount(1);
        if (typeof window !== 'undefined') {
          localStorage.removeItem('pos_selectedTable');
          localStorage.removeItem('pos_guestCount');
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
      setIsPaymentModalOpen(false);
      setIsCartModalOpen(false);
    } catch (error: any) {
      console.error('Payment flow failed:', error);
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

  const handleViewReceipt = useCallback(
    (orderId: string) => {
      if (!orderId) {
        toast.error('Receipt is not available for this order yet.');
        return;
      }
      setQueueDetailId(null);
    setCurrentOrderId(orderId);
    setIsReceiptModalOpen(true);
    },
    []
  );

  useEffect(() => {
    if (isReceiptModalOpen && currentOrderId) {
      refetchReceipt();
    }
  }, [isReceiptModalOpen, currentOrderId, refetchReceipt]);

  const handleQueueRefresh = useCallback(() => {
    refetchQueue();
  }, [refetchQueue]);

  const handleQueueViewDetails = useCallback((orderId: string) => {
    setQueueDetailId(orderId);
  }, []);

  const resolveOrderId = useCallback((order: any) => {
    if (!order) return '';
    return order.id || order._id || '';
  }, []);

  const handleQueueCancel = useCallback(
    async (orderId: string) => {
      if (typeof window !== 'undefined') {
        const confirmed = window.confirm('Are you sure you want to cancel this order?');
        if (!confirmed) {
          return;
        }
      }

      try {
        setQueueActionOrderId(orderId);
        await cancelOrder({ id: orderId, reason: 'Cancelled from queue' }).unwrap();
        toast.success('Order cancelled successfully');
        if (queueDetailId === orderId) {
          setQueueDetailId(null);
        }
        refetchQueue();
      } catch (error: any) {
        console.error('Error cancelling order:', error);
        toast.error(error?.data?.message || 'Failed to cancel order');
      } finally {
        setQueueActionOrderId(null);
      }
    },
    [cancelOrder, queueDetailId, refetchQueue]
  );

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

  const modifierPreview = useMemo(() => {
    if (!modifierEditor) return null;
    const previewItem = buildCartItemFromMenuItem(modifierEditor.item, {
      ...modifierEditor,
      quantity: 1,
      id: 'preview',
    } as Partial<ModifierConfig> & { id: string });
    return previewItem;
  }, [buildCartItemFromMenuItem, modifierEditor]);

  const quickCashSuggestions = useMemo(() => {
    if (orderSummary.total <= 0) {
      return [] as number[];
    }
    const base = Number(orderSummary.total.toFixed(2));
    const suggestions = new Set<number>();
    suggestions.add(base);
    suggestions.add(Math.ceil(base / 5) * 5);
    suggestions.add(Math.ceil(base / 10) * 10);
    suggestions.add(base + 5);
    suggestions.add(base + 10);
    return Array.from(suggestions)
      .filter((value) => Number.isFinite(value) && value > 0)
      .map((value) => Number(value.toFixed(2)))
      .sort((a, b) => a - b);
  }, [orderSummary.total]);

  const fullPaymentChange = useMemo(() => {
    if (paymentTab !== 'full' || fullPaymentMethod !== 'cash') {
      return 0;
    }
    const received = parseFloat(fullPaymentReceived || '0');
    if (!Number.isFinite(received)) {
      return 0;
    }
    return Math.max(0, received - orderSummary.total);
  }, [fullPaymentMethod, fullPaymentReceived, orderSummary.total, paymentTab]);

  const splitTotals = useMemo(() => {
    const applied = multiPayments.reduce((sum, row) => sum + (parseFloat(row.amount || '0') || 0), 0);
    return {
      applied,
      remaining: Number((orderSummary.total - applied).toFixed(2)),
    };
  }, [multiPayments, orderSummary.total]);

  const receiptErrorMessage = useMemo(() => {
    if (!receiptErrorDetails || typeof receiptErrorDetails !== 'object') {
      return '';
    }
    const maybeData = (receiptErrorDetails as Record<string, unknown>)?.data as Record<string, unknown> | undefined;
    if (maybeData && typeof maybeData === 'object' && 'message' in maybeData) {
      return String(maybeData.message);
    }
    return '';
  }, [receiptErrorDetails]);

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
                  const hasOrderDetails = table.orderDetails && table.status === 'occupied';
                  return (
                    <button
                      key={table.id}
                      onClick={() => handleTableSelection(table.id)}
                      className={`rounded-2xl border-2 p-6 text-left transition-all ${
                        isSelected
                          ? 'border-sky-500 bg-sky-500/10 shadow-lg shadow-sky-500/20'
                          : table.status === 'occupied'
                          ? 'border-orange-500/50 bg-orange-500/5 hover:border-orange-400/60'
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
                        {hasOrderDetails ? (
                          <div className="space-y-2 text-xs">
                            <div className="flex items-center justify-between text-slate-300">
                              <span className="text-slate-400">Token:</span>
                              <span className="font-semibold">{table.orderDetails.tokenNumber || table.orderDetails.orderNumber}</span>
                            </div>
                            <div className="flex items-center justify-between text-slate-300">
                              <span className="text-slate-400">Amount:</span>
                              <span className="font-semibold text-emerald-400">{formatCurrency(table.orderDetails.totalAmount || 0)}</span>
                            </div>
                            {table.orderDetails.waiterName && (
                              <div className="flex items-center justify-between text-slate-300">
                                <span className="text-slate-400">Waiter:</span>
                                <span className="font-semibold">{table.orderDetails.waiterName}</span>
                              </div>
                            )}
                            {table.orderDetails.holdCount > 0 && (
                              <div className="flex items-center justify-between text-orange-300">
                                <span>Held:</span>
                                <span className="font-semibold">{table.orderDetails.holdCount}x</span>
                              </div>
                            )}
                            {table.orderDetails.remainingSeats > 0 && (
                              <div className="flex items-center justify-between text-sky-300 mt-2 pt-2 border-t border-slate-800">
                                <span>Remaining:</span>
                                <span className="font-semibold">{table.orderDetails.remainingSeats} seats</span>
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="text-xs text-slate-400 mt-1">
                            Capacity: {table.capacity || 0} seats
                          </div>
                        )}
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
          <div className="flex flex-col gap-3 items-stretch lg:items-end">
            <div className="flex flex-wrap items-center gap-3 justify-between sm:justify-end">
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
            <div className="flex flex-wrap items-center gap-2 justify-between sm:justify-end">
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
                className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40"
              >
                <CreditCardIcon className="h-4 w-4" />
                Checkout
              </Button>
            </div>
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

      
    </div>
  );

  const renderQueuePanel = () => {
    if (isQueueCollapsed) {
      return (
        <aside className="hidden md:flex md:w-16 md:flex-col md:items-center md:justify-center border-l border-slate-900/50 bg-slate-950/60">
          <Button
            variant="ghost"
            onClick={() => setIsQueueCollapsed(false)}
            className="flex flex-col items-center gap-2 text-slate-300 hover:text-white"
          >
            <ChevronLeftIcon className="h-5 w-5" />
            <span className="text-xs font-medium">Queue</span>
          </Button>
        </aside>
      );
    }

    return (
      <>
        <div
          className="fixed inset-0 z-30 bg-slate-950/70 backdrop-blur-sm md:hidden"
          onClick={() => setIsQueueCollapsed(true)}
        />
        <aside className="fixed inset-y-0 right-0 z-40 flex h-full w-full max-w-md flex-col border-l border-slate-900 bg-slate-950/95 shadow-xl md:static md:z-auto md:max-w-xs md:bg-slate-950/80">
          <div className="flex items-center justify-between border-b border-slate-900/70 px-4 py-3">
            <div>
              <p className="text-sm font-semibold text-slate-100">Orders</p>
              <p className="text-xs text-slate-400">
                {queueTab === 'active' ? 'Active queue' : 'Completed orders'}
              </p>
            </div>
            <div className="flex items-center gap-1">
              <Button
                size="sm"
                variant="ghost"
                onClick={handleQueueRefresh}
                disabled={queueLoading}
                className="h-9 w-9 rounded-full border border-slate-800 bg-slate-900/80 text-slate-200 hover:bg-slate-800/80 disabled:opacity-40"
                title="Refresh"
              >
                <ArrowPathIcon className={`h-4 w-4 ${queueLoading ? 'animate-spin' : ''}`} />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setIsQueueCollapsed(true)}
                className="h-9 w-9 rounded-full border border-slate-800 bg-slate-900/80 text-slate-200 hover:bg-slate-800/80"
                title="Collapse queue"
              >
                <ChevronRightIcon className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="border-b border-slate-900/70 px-4 py-3 space-y-3">
            <div className="flex items-center gap-2">
              {(['active', 'history'] as const).map((tab) => {
                const isActive = queueTab === tab;
                return (
                  <Button
                    key={tab}
                    variant={isActive ? 'primary' : 'secondary'}
                    size="sm"
                    onClick={() => setQueueTab(tab)}
                    className={`rounded-full px-4 py-1.5 text-xs uppercase tracking-wide ${
                      isActive
                        ? 'bg-sky-600 hover:bg-sky-500 text-white'
                        : 'bg-slate-900/70 text-slate-300 hover:bg-slate-800/70'
                    }`}
                  >
                    {tab === 'active' ? 'Active' : 'History'}
                  </Button>
                );
              })}
            </div>

            <div className="grid gap-2">
              <div className="flex items-center gap-2">
                <label className="text-xs uppercase tracking-[0.3em] text-slate-500">Type</label>
                <select
                  value={queueOrderTypeFilter}
                  onChange={(event) => setQueueOrderTypeFilter(event.target.value as typeof queueOrderTypeFilter)}
                  className="flex-1 rounded-lg border border-slate-800 bg-slate-950/70 px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-500/40"
                >
                  <option value="all">All Types</option>
                  {ORDER_TYPE_OPTIONS.map(({ value, label }) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>

              {queueTab === 'history' && (
                <div className="flex items-center gap-2">
                  <label className="text-xs uppercase tracking-[0.3em] text-slate-500">Status</label>
                  <select
                    value={queueStatusFilter}
                    onChange={(event) => setQueueStatusFilter(event.target.value as typeof queueStatusFilter)}
                    className="flex-1 rounded-lg border border-slate-800 bg-slate-950/70 px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-500/40"
                  >
                    {ORDER_STATUS_FILTERS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="relative">
                <MagnifyingGlassIcon className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <Input
                  value={queueSearchInput}
                  onChange={(event) => setQueueSearchInput(event.target.value)}
                  placeholder="Search order # or customer"
                  className="pl-9 pr-3 py-2 text-sm h-10 bg-slate-950/80 border border-slate-800 text-slate-100 placeholder:text-slate-500 focus:border-sky-600 focus:ring-sky-600/40"
                />
              </div>
              <div className="flex items-center justify-between rounded-lg border border-slate-900 bg-slate-950/70 px-3 py-2 text-xs text-slate-300">
                <span>{queueOrders.length} order{queueOrders.length === 1 ? '' : 's'} listed</span>
                <span className="font-semibold text-emerald-300">{formatCurrency(queueTotalAmount)}</span>
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
            {queueLoading ? (
              [...Array(5)].map((_, index) => (
                <div key={index} className="h-24 rounded-2xl border border-slate-900/60 bg-slate-900/40 animate-pulse" />
              ))
            ) : queueOrders.length === 0 ? (
              <div className="rounded-2xl border border-slate-900/60 bg-slate-950/70 p-6 text-center text-sm text-slate-400">
                No orders found with the selected filters.
              </div>
            ) : (
              queueOrders.map((order: any, index: number) => {
                const orderId = resolveOrderId(order);
                const derivedKey = orderId || order.orderNumber || `order-${index}`;
                const canAct = Boolean(orderId);
                return (
                <div
                  key={derivedKey}
                  className="rounded-2xl border border-slate-900/60 bg-slate-950/70 p-4 shadow-sm transition hover:border-sky-800/50 hover:shadow-sky-900/20"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-slate-100">
                        {order.orderNumber || (orderId ? `Order ${orderId?.slice(-6)}` : 'Order')}
                      </p>
                      <p className="text-xs text-slate-500">{order.createdAt ? formatDateTime(order.createdAt) : 'N/A'}</p>
                    </div>
                    <Badge className={ORDER_STATUS_STYLES[order.status as 'pending' | 'paid' | 'cancelled'] || ORDER_STATUS_STYLES.pending}>
                      {ORDER_STATUS_LABELS[order.status as 'pending' | 'paid' | 'cancelled'] || order.status}
                    </Badge>
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-300">
                    <span className="rounded-full border border-slate-800 bg-slate-900/70 px-3 py-1">
                      {ORDER_TYPE_LABELS[order.orderType as OrderType] || order.orderType}
                    </span>
                    <span className="rounded-full border border-slate-800 bg-slate-900/70 px-3 py-1">
                      {formatCurrency(Number(order.totalAmount || 0))}
                    </span>
                    {order.paymentMethod && (
                      <span className="rounded-full border border-slate-800 bg-slate-900/70 px-3 py-1">
                        Payment: {order.paymentMethod}
                      </span>
                    )}
                    {order?.customerInfo?.name && (
                      <span className="rounded-full border border-slate-800 bg-slate-900/70 px-3 py-1">
                        {order.customerInfo.name}
                      </span>
                    )}
                  </div>
                  {order.notes && (
                    <p className="mt-2 rounded-lg border border-slate-900 bg-slate-950/80 px-3 py-2 text-xs text-slate-400">
                      {order.notes}
                    </p>
                  )}
                  <div className="mt-4 flex flex-wrap items-center gap-2">
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => canAct && handleQueueViewDetails(orderId)}
                      disabled={!canAct}
                      className="rounded-lg bg-slate-900/80 text-slate-100 hover:bg-slate-800/80 disabled:opacity-40"
                    >
                      View
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => canAct && handleViewReceipt(orderId)}
                      disabled={!canAct}
                      className="rounded-lg bg-slate-900/80 text-slate-100 hover:bg-slate-800/80 disabled:opacity-40"
                    >
                      Receipt
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => canAct && handlePrintReceipt(orderId, false)}
                      disabled={!canAct}
                      className="rounded-lg bg-slate-900/80 text-slate-100 hover:bg-slate-800/80 disabled:opacity-40"
                    >
                      Print
                    </Button>
                    {order.status === 'pending' && (
                      <>
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={async () => {
                            if (!canAct) return;
                            try {
                              await updateOrder({
                                id: orderId,
                                data: { status: 'paid' }
                              }).unwrap();
                              toast.success('Order marked as paid');
                              refetchQueue();
                            } catch (error: any) {
                              toast.error(error?.data?.message || 'Failed to update order status');
                            }
                          }}
                          disabled={!canAct}
                          className="rounded-lg bg-emerald-500/15 text-emerald-200 hover:bg-emerald-500/25 disabled:opacity-60"
                        >
                          Mark Paid
                        </Button>
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => canAct && handleQueueCancel(orderId)}
                          disabled={!canAct || queueActionOrderId === orderId}
                          className="rounded-lg bg-rose-500/15 text-rose-200 hover:bg-rose-500/25 disabled:opacity-60"
                        >
                          {queueActionOrderId === orderId ? 'Cancelling...' : 'Cancel'}
                        </Button>
                      </>
                    )}
                    {order.status === 'paid' && (
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={async () => {
                          if (!canAct) return;
                          try {
                            await updateOrder({
                              id: orderId,
                              data: { status: 'pending' }
                            }).unwrap();
                            toast.success('Order marked as pending');
                            refetchQueue();
                          } catch (error: any) {
                            toast.error(error?.data?.message || 'Failed to update order status');
                          }
                        }}
                        disabled={!canAct}
                        className="rounded-lg bg-amber-500/15 text-amber-200 hover:bg-amber-500/25 disabled:opacity-60"
                      >
                        Mark Pending
                      </Button>
                    )}
                  </div>
                </div>
              );})
            )}
          </div>
        </aside>
      </>
    );
  };

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
          setIsQueueCollapsed((prev) => !prev);
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
          setShowKeyboardShortcuts(false);
          setIsQueueCollapsed(true);
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
              {requiresTable ? (
                <div className="flex items-center gap-2">
                  <select
                    value={selectedTable}
                    onChange={(event) => handleTableSelection(event.target.value)}
                    disabled={tablesLoading || tables.length === 0}
                    className="rounded-lg border border-slate-800 bg-slate-950/80 px-3 py-1.5 text-sm text-slate-100 focus:border-sky-500 focus:outline-none disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    <option value="">
                      {tablesLoading ? 'Loading tables…' : 'Select a table'}
                    </option>
                    {tables.map((table: any) => (
                      <option
                        key={table.id}
                        value={table.id}
                        disabled={table.status === 'occupied' || table.status === 'reserved'}
                      >
                        {table.number || table.tableNumber || table.name || table.id}
                        {table.status ? ` • ${getTableStatusText(table)}` : ''}
                      </option>
                    ))}
                  </select>
                  {selectedTable && activeTable ? (
                    <Badge className={`${getTableStatus(activeTable)} border border-white/10`}>
                      {getTableStatusText(activeTable)}
                    </Badge>
                  ) : null}
                </div>
              ) : (
                <span className="text-slate-200">Table not required for this order</span>
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
                variant={isQueueCollapsed ? 'secondary' : 'primary'}
                onClick={() => setIsQueueCollapsed((prev) => !prev)}
                className={`flex items-center gap-2 rounded-xl ${
                  isQueueCollapsed
                    ? 'bg-slate-900/80 text-slate-100 hover:bg-slate-800/80'
                    : 'bg-sky-600 hover:bg-sky-500 text-white shadow-lg shadow-sky-600/25'
                }`}
              >
                <ClipboardDocumentListIcon className="h-4 w-4" />
                Orders Queue (F1)
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

      <div className="flex flex-1 overflow-hidden">
        <div className="flex flex-1 flex-col">
          {isOrderingActive ? renderOrderingWorkspace() : renderPreOrderView()}
                </div>
        {renderQueuePanel()}
              </div>

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
                  <div className="space-y-3">
                    <select
                      value={selectedTable}
                      onChange={(event) => handleTableSelection(event.target.value)}
                      disabled={tablesLoading || tables.length === 0}
                      className="w-full rounded-lg border border-slate-800 bg-slate-900/80 px-3 py-2 text-sm text-slate-100 focus:border-sky-500 focus:outline-none disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      <option value="">
                        {tablesLoading ? 'Loading tables…' : 'Select a table'}
                      </option>
                      {tables.map((table: any) => {
                        const remainingSeats = table.orderDetails?.remainingSeats ?? table.capacity ?? 0;
                        const isFullyOccupied = remainingSeats === 0 && table.status === 'occupied';
                        const isReserved = table.status === 'reserved';
                        
                        return (
                          <option 
                            key={table.id} 
                            value={table.id} 
                            disabled={isFullyOccupied || isReserved}
                          >
                            {table.number || table.tableNumber || table.name || table.id}
                            {table.status ? ` • ${getTableStatusText(table)}` : ''}
                            {table.capacity ? ` • ${table.capacity} seats` : ''}
                            {table.orderDetails?.remainingSeats !== undefined && table.orderDetails.remainingSeats > 0 
                              ? ` • ${table.orderDetails.remainingSeats} remaining` 
                              : ''}
                          </option>
                        );
                      })}
                    </select>
                    {selectedTable && activeTable && (
                      <div className="space-y-2">
                        <label className="block text-xs text-slate-400">
                          Number of Guests
                        </label>
                        <input
                          type="number"
                          min="1"
                          max={activeTable.orderDetails?.remainingSeats ? activeTable.orderDetails.remainingSeats + guestCount : (activeTable.capacity || 99)}
                          value={guestCount}
                          onChange={(e) => {
                            const maxSeats = activeTable.orderDetails?.remainingSeats 
                              ? activeTable.orderDetails.remainingSeats + guestCount 
                              : (activeTable.capacity || 99);
                            const value = Math.max(1, Math.min(maxSeats, parseInt(e.target.value) || 1));
                            setGuestCount(value);
                            if (typeof window !== 'undefined') {
                              localStorage.setItem('pos_guestCount', value.toString());
                            }
                          }}
                          className="w-full rounded-lg border border-slate-800 bg-slate-900/80 px-3 py-2 text-sm text-slate-100 focus:border-sky-500 focus:outline-none"
                          placeholder="Enter guest count"
                        />
                        <p className="text-xs text-slate-500">
                          {activeTable.orderDetails?.remainingSeats 
                            ? `${activeTable.orderDetails.remainingSeats} seats available (${activeTable.orderDetails.usedSeats} already used)` 
                            : activeTable.capacity 
                              ? `${activeTable.capacity - guestCount} seats will remain available` 
                              : 'Enter guest count'}
                        </p>
                      </div>
                    )}
                    {tables.length === 0 && !tablesLoading ? (
                      <p className="text-xs text-slate-400">No tables available for this branch.</p>
                    ) : (
                      <div className="flex items-center justify-between text-xs text-slate-400">
                        <span>
                          {selectedTable
                            ? `Currently assigned to table ${activeTable?.number || activeTable?.tableNumber || selectedTable}`
                            : 'Select a table to continue with a dine-in order.'}
                        </span>
                        {selectedTable && activeTable && (
                          <Badge className={`${getTableStatus(activeTable)} border border-white/10`}>
                            {getTableStatusText(activeTable)}
                          </Badge>
                        )}
                      </div>
                    )}
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
                  disabled={staffLoading || !branchId}
                  className="w-full rounded-lg border border-slate-800 bg-slate-900/80 px-3 py-2 text-sm text-slate-100 focus:border-sky-500 focus:outline-none disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {staffLoading ? (
                    <option value="">Loading waiters...</option>
                  ) : staffError ? (
                    <option value="">Error loading waiters</option>
                  ) : waiterOptions.length === 0 ? (
                    <option value="">No waiters found for this branch</option>
                  ) : (
                    waiterOptions.map((waiter) => (
                      <option key={waiter.id} value={waiter.id} className="bg-slate-900">
                        {waiter.name}
                      </option>
                    ))
                  )}
                </select>
                {!branchId && (
                  <p className="text-xs text-slate-400 mt-1">Branch not selected</p>
                )}
              </div>
              </div>
            <div className="space-y-3 rounded-xl border border-slate-800 bg-slate-950/60 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="space-y-1">
                  <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Customer</p>
                  <div className="text-sm text-slate-200">
                    {customerInfo.name ? customerInfo.name : 'Guest customer'}
                  </div>
                  {customerInfo.phone && (
                    <div className="text-xs text-slate-400">{customerInfo.phone}</div>
                        )}
                      </div>
                <div className="flex flex-wrap items-center gap-2">
                  {selectedCustomerId && (
                    <Badge className="bg-emerald-500/10 text-emerald-200 border border-emerald-500/30">
                      Linked
                    </Badge>
                  )}
                        <Button
                          size="sm"
                    variant="secondary"
                    onClick={() => {
                      setCustomerSearchTerm('');
                      setIsCustomerLookupOpen(true);
                    }}
                    className="bg-slate-900/80 text-slate-100 hover:bg-slate-800/80"
                        >
                    Lookup
                        </Button>
                  {selectedCustomerId && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={clearCustomerSelection}
                      className="text-slate-400 hover:text-slate-100"
                    >
                      Clear
                    </Button>
                  )}
                      </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                <Input
                  value={customerInfo.name}
                  onChange={(event) => setCustomerInfo({ ...customerInfo, name: event.target.value })}
                  placeholder="Customer name"
                  className="bg-slate-950/60 border-slate-850 text-slate-100"
                />
                <Input
                  value={customerInfo.phone}
                  onChange={(event) => setCustomerInfo({ ...customerInfo, phone: event.target.value })}
                  placeholder="Phone"
                  className="bg-slate-950/60 border-slate-850 text-slate-100"
                />
                <Input
                  value={customerInfo.email}
                  onChange={(event) => setCustomerInfo({ ...customerInfo, email: event.target.value })}
                  placeholder="Email"
                  className="bg-slate-950/60 border-slate-850 text-slate-100"
                />
              </div>
          </div>

          {/* Delivery Details Section */}
          {orderType === 'delivery' && (
            <div className="space-y-3 rounded-xl border border-slate-800 bg-slate-950/60 p-4">
              <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Delivery Details</p>
              <div className="grid gap-3 sm:grid-cols-2">
                <Input
                  value={deliveryDetails.contactName}
                  onChange={(e) => setDeliveryDetails({ ...deliveryDetails, contactName: e.target.value })}
                  placeholder="Contact Name *"
                  className="bg-slate-950/60 border-slate-850 text-slate-100"
                  required
                />
                <Input
                  value={deliveryDetails.contactPhone}
                  onChange={(e) => setDeliveryDetails({ ...deliveryDetails, contactPhone: e.target.value })}
                  placeholder="Contact Phone *"
                  className="bg-slate-950/60 border-slate-850 text-slate-100"
                  required
                />
                <Input
                  value={deliveryDetails.addressLine1}
                  onChange={(e) => setDeliveryDetails({ ...deliveryDetails, addressLine1: e.target.value })}
                  placeholder="Address Line 1 *"
                  className="bg-slate-950/60 border-slate-850 text-slate-100 sm:col-span-2"
                  required
                />
                <Input
                  value={deliveryDetails.addressLine2}
                  onChange={(e) => setDeliveryDetails({ ...deliveryDetails, addressLine2: e.target.value })}
                  placeholder="Address Line 2"
                  className="bg-slate-950/60 border-slate-850 text-slate-100 sm:col-span-2"
                />
                <Input
                  value={deliveryDetails.city}
                  onChange={(e) => setDeliveryDetails({ ...deliveryDetails, city: e.target.value })}
                  placeholder="City *"
                  className="bg-slate-950/60 border-slate-850 text-slate-100"
                  required
                />
                <Input
                  value={deliveryDetails.state}
                  onChange={(e) => setDeliveryDetails({ ...deliveryDetails, state: e.target.value })}
                  placeholder="State/Province"
                  className="bg-slate-950/60 border-slate-850 text-slate-100"
                />
                <Input
                  value={deliveryDetails.postalCode}
                  onChange={(e) => setDeliveryDetails({ ...deliveryDetails, postalCode: e.target.value })}
                  placeholder="Postal Code"
                  className="bg-slate-950/60 border-slate-850 text-slate-100"
                />
                <div className="sm:col-span-2">
                  <label className="block text-xs text-slate-400 mb-1">Delivery Fee</label>
                  <Input
                    value={deliveryFee}
                    onChange={(e) => {
                      setDeliveryFee(e.target.value);
                      if (typeof window !== 'undefined') {
                        localStorage.setItem('pos_deliveryFee', e.target.value);
                      }
                    }}
                    placeholder="0.00"
                    type="number"
                    min="0"
                    step="0.01"
                    className="bg-slate-950/60 border-slate-850 text-slate-100"
                  />
                </div>
                <Input
                  value={deliveryDetails.instructions}
                  onChange={(e) => setDeliveryDetails({ ...deliveryDetails, instructions: e.target.value })}
                  placeholder="Delivery Instructions"
                  className="bg-slate-950/60 border-slate-850 text-slate-100 sm:col-span-2"
                />
                <Input
                  value={deliveryDetails.assignedDriver}
                  onChange={(e) => setDeliveryDetails({ ...deliveryDetails, assignedDriver: e.target.value })}
                  placeholder="Assigned Driver"
                  className="bg-slate-950/60 border-slate-850 text-slate-100 sm:col-span-2"
                />
              </div>
              {!deliveryIsValid && (
                <p className="text-xs text-amber-400 mt-2">
                  * Required fields: {missingDeliveryFields.join(', ')}
                </p>
              )}
            </div>
          )}

          {/* Takeaway Details Section */}
          {orderType === 'takeaway' && (
            <div className="space-y-3 rounded-xl border border-slate-800 bg-slate-950/60 p-4">
              <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Takeaway Details</p>
              <div className="grid gap-3 sm:grid-cols-2">
                <Input
                  value={takeawayDetails.contactName}
                  onChange={(e) => setTakeawayDetails({ ...takeawayDetails, contactName: e.target.value })}
                  placeholder="Contact Name *"
                  className="bg-slate-950/60 border-slate-850 text-slate-100"
                  required
                />
                <Input
                  value={takeawayDetails.contactPhone}
                  onChange={(e) => setTakeawayDetails({ ...takeawayDetails, contactPhone: e.target.value })}
                  placeholder="Contact Phone *"
                  className="bg-slate-950/60 border-slate-850 text-slate-100"
                  required
                />
                <Input
                  value={takeawayDetails.instructions}
                  onChange={(e) => setTakeawayDetails({ ...takeawayDetails, instructions: e.target.value })}
                  placeholder="Pickup Instructions"
                  className="bg-slate-950/60 border-slate-850 text-slate-100 sm:col-span-2"
                />
                <Input
                  value={takeawayDetails.assignedDriver}
                  onChange={(e) => setTakeawayDetails({ ...takeawayDetails, assignedDriver: e.target.value })}
                  placeholder="Assigned Staff"
                  className="bg-slate-950/60 border-slate-850 text-slate-100 sm:col-span-2"
                />
              </div>
              {!takeawayIsValid && (
                <p className="text-xs text-amber-400 mt-2">
                  * Required fields: {missingTakeawayFields.join(', ')}
                </p>
              )}
            </div>
          )}
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
                          {item.modifiersNote ? (
                            <p className="text-xs text-slate-400">{item.modifiersNote}</p>
                          ) : null}
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
            <div className="flex flex-col gap-2">
              {checkoutBlocked && (
                <div className="text-xs text-rose-400">
                  {requiresTable && !selectedTable && 'Please select a table'}
                  {requiresDeliveryDetails && !deliveryIsValid && `Missing: ${missingDeliveryFields.join(', ')}`}
                  {requiresTakeawayDetails && !takeawayIsValid && `Missing: ${missingTakeawayFields.join(', ')}`}
                </div>
              )}
              <div className="flex flex-wrap gap-2">
                <Button 
                  variant="secondary" 
                  onClick={handleCreateOrder} 
                  disabled={checkoutBlocked || cart.length === 0}
                  title={checkoutBlocked ? (requiresTable && !selectedTable ? 'Select a table first' : requiresDeliveryDetails && !deliveryIsValid ? `Complete delivery details: ${missingDeliveryFields.join(', ')}` : requiresTakeawayDetails && !takeawayIsValid ? `Complete takeaway details: ${missingTakeawayFields.join(', ')}` : '') : cart.length === 0 ? 'Add items to cart first' : ''}
                >
                  <ClockIcon className="mr-2 h-4 w-4" />
                  Create Order
                </Button>
                <Button
                  variant="primary"
                  onClick={handlePayment}
                  disabled={checkoutBlocked || cart.length === 0}
                  className="bg-emerald-600 hover:bg-emerald-500"
                  title={checkoutBlocked ? (requiresTable && !selectedTable ? 'Select a table first' : requiresDeliveryDetails && !deliveryIsValid ? `Complete delivery details: ${missingDeliveryFields.join(', ')}` : requiresTakeawayDetails && !takeawayIsValid ? `Complete takeaway details: ${missingTakeawayFields.join(', ')}` : '') : cart.length === 0 ? 'Add items to cart first' : ''}
                >
                  <CreditCardIcon className="mr-2 h-4 w-4" />
                  Process Payment
                </Button>
              </div>
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

      {/* Customer Lookup Modal */}
      <Modal
        isOpen={isCustomerLookupOpen}
        onClose={() => setIsCustomerLookupOpen(false)}
        title="Customer Lookup"
        size="lg"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Search customers</label>
            <Input
              value={customerSearchTerm}
              onChange={(event) => setCustomerSearchTerm(event.target.value)}
              placeholder="Search by name, phone, or email"
              className="bg-slate-950/70 border-slate-850 text-slate-100"
            />
          </div>

          {customerSearchTerm.trim().length < 2 ? (
            <p className="text-sm text-slate-400">
              Enter at least two characters to search your customer list.
            </p>
          ) : isCustomerSearchLoading ? (
            <div className="space-y-3">
              {[...Array(3)].map((_, index) => (
                <div key={index} className="h-16 animate-pulse rounded-xl bg-slate-900/60" />
              ))}
            </div>
          ) : resolvedCustomerResults.length > 0 ? (
            <div className="max-h-80 space-y-2 overflow-y-auto pr-1">
              {resolvedCustomerResults.map((customer: any) => {
                const fullName = `${customer.firstName || ''} ${customer.lastName || ''}`.trim() || customer.name || 'Unnamed Customer';
                const phone = customer.phoneNumber || customer.phone || '';
                const isActive = selectedCustomerId && (selectedCustomerId === customer.id || selectedCustomerId === customer._id);
                return (
                  <button
                    key={customer.id || customer._id}
                    onClick={() => applyCustomerSelection(customer)}
                    className={`w-full rounded-xl border px-4 py-3 text-left transition ${
                      isActive
                        ? 'border-emerald-500 bg-emerald-500/10 text-emerald-100'
                        : 'border-slate-850 bg-slate-950/70 text-slate-200 hover:bg-slate-900/70'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <p className="font-semibold">{fullName}</p>
                        {phone && <p className="text-xs text-slate-400">{phone}</p>}
                      </div>
                      <Badge className="bg-slate-900/60 text-slate-300 border border-slate-800">
                        {customer.totalOrders ? `${customer.totalOrders} orders` : 'Customer'}
                      </Badge>
                    </div>
                  </button>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-slate-400">No customers found for that search.</p>
          )}
        </div>
      </Modal>

      {/* Payment Modal */}
      <Modal
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        title="Checkout Payment"
        size="lg"
      >
        <div className="space-y-6">
          <div className="flex items-center gap-2 rounded-2xl border border-slate-800 bg-slate-950/60 p-1">
              <Button
              size="sm"
              variant={paymentTab === 'full' ? 'primary' : 'secondary'}
              onClick={() => setPaymentTab('full')}
              className={`flex-1 rounded-xl ${paymentTab === 'full' ? 'bg-emerald-600 hover:bg-emerald-500' : 'bg-transparent text-slate-300 hover:bg-slate-900/70'}`}
              >
              Full Amount
              </Button>
              <Button
              size="sm"
              variant={paymentTab === 'multi' ? 'primary' : 'secondary'}
              onClick={() => setPaymentTab('multi')}
              className={`flex-1 rounded-xl ${paymentTab === 'multi' ? 'bg-sky-600 hover:bg-sky-500' : 'bg-transparent text-slate-300 hover:bg-slate-900/70'}`}
            >
              Split Tender
              </Button>
          </div>

          {paymentTab === 'full' ? (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
              <Button
                  variant={fullPaymentMethod === 'cash' ? 'primary' : 'secondary'}
                  onClick={() => setFullPaymentMethod('cash')}
                  className={`flex-1 ${fullPaymentMethod === 'cash' ? 'bg-emerald-600 hover:bg-emerald-500' : 'bg-slate-900/80 text-slate-200 hover:bg-slate-800/80'}`}
                >
                  💵 Cash
                </Button>
                <Button
                  variant={fullPaymentMethod === 'card' ? 'primary' : 'secondary'}
                  onClick={() => setFullPaymentMethod('card')}
                  className={`flex-1 ${fullPaymentMethod === 'card' ? 'bg-sky-600 hover:bg-sky-500' : 'bg-slate-900/80 text-slate-200 hover:bg-slate-800/80'}`}
              >
                  <CreditCardIcon className="h-4 w-4" /> Card
              </Button>
            </div>
          <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Amount received</label>
            <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={fullPaymentReceived}
                  onChange={(event) => setFullPaymentReceived(event.target.value)}
                  className="bg-slate-950/70 border-slate-850 text-slate-100"
                  placeholder="0.00"
            />
          </div>
              {quickCashSuggestions.length > 0 && (
                <div className="flex flex-wrap items-center gap-2">
                  {quickCashSuggestions.map((suggestion) => (
                    <Button
                      key={suggestion}
                      size="sm"
                      variant="secondary"
                      onClick={() => setFullPaymentReceived(suggestion.toFixed(2))}
                      className="rounded-full bg-slate-900/80 text-slate-200 hover:bg-slate-800/80"
                    >
                      {formatCurrency(suggestion)}
                    </Button>
                  ))}
                </div>
              )}
              {fullPaymentMethod === 'cash' && (
                <div className="text-sm text-slate-300">
                  Change due:{' '}
                  <span className="font-semibold text-emerald-300">{formatCurrency(fullPaymentChange)}</span>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="space-y-3">
                {multiPayments.map((row) => {
                  const methodLabel: Record<SplitPaymentRow['method'], string> = {
                    cash: 'Cash',
                    card: 'Card',
                    wallet: 'Wallet',
                    other: 'Other',
                  };
                  return (
                    <div
                      key={row.id}
                      className="grid gap-3 sm:grid-cols-[160px_1fr_auto] items-center rounded-xl border border-slate-850 bg-slate-950/60 p-3"
                    >
                      <select
                        value={row.method}
                        onChange={(event) =>
                          updateMultiPaymentRow(row.id, { method: event.target.value as SplitPaymentRow['method'] })
                        }
                        className="rounded-lg border border-slate-800 bg-slate-900/80 px-3 py-2 text-sm text-slate-100 focus:border-sky-500 focus:outline-none"
                      >
                        {(Object.keys(methodLabel) as SplitPaymentRow['method'][]).map((method) => (
                          <option key={method} value={method} className="bg-slate-900">
                            {methodLabel[method]}
                          </option>
                        ))}
                      </select>
            <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={row.amount}
                        onChange={(event) => updateMultiPaymentRow(row.id, { amount: event.target.value })}
                        className="bg-slate-950/70 border-slate-850 text-slate-100"
                        placeholder="0.00"
                      />
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => removeMultiPaymentRow(row.id)}
                        disabled={multiPayments.length === 1}
                        className="text-rose-400 hover:text-rose-200 disabled:opacity-40"
                        title={multiPayments.length === 1 ? 'At least one payment row is required' : 'Remove row'}
                      >
                        <TrashIcon className="h-4 w-4" />
                      </Button>
          </div>
                  );
                })}
            </div>
            <Button
              variant="secondary"
                onClick={addMultiPaymentRow}
                className="w-full rounded-xl bg-slate-900/80 text-slate-200 hover:bg-slate-800/80"
              >
                + Add another payment
              </Button>
              <div className="flex items-center justify-between rounded-xl border border-slate-850 bg-slate-950/70 p-3 text-sm text-slate-300">
                <span>Applied</span>
                <span className="font-semibold text-slate-100">{formatCurrency(splitTotals.applied)}</span>
              </div>
              <div
                className={`text-sm ${
                  splitTotals.remaining > 0
                    ? 'text-amber-300'
                    : splitTotals.remaining < 0
                    ? 'text-emerald-300'
                    : 'text-slate-300'
                }`}
              >
                {splitTotals.remaining > 0 && `${formatCurrency(Math.abs(splitTotals.remaining))} remaining`}
                {splitTotals.remaining < 0 && `${formatCurrency(Math.abs(splitTotals.remaining))} change expected`}
                {splitTotals.remaining === 0 && 'Ready to settle'}
              </div>
            </div>
          )}

          <div className="rounded-xl border border-slate-850 bg-slate-950/70 p-4 space-y-2 text-sm">
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

          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setIsPaymentModalOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handlePayment}
              className="bg-emerald-600 hover:bg-emerald-500"
              disabled={checkoutBlocked || cart.length === 0}
            >
              <CheckIcon className="h-4 w-4 mr-2" />
              Complete Payment
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
                  <span>Toggle Orders Queue</span>
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

      {/* Order Detail Modal */}
      <Modal
        isOpen={Boolean(queueDetailId)}
        onClose={() => setQueueDetailId(null)}
        title="Order Details"
        size="lg"
      >
        {queueDetailLoading ? (
          <div className="py-10 text-center text-slate-400">Loading order details…</div>
        ) : queueDetail ? (
          (() => {
            const detailId = resolveOrderId(queueDetail);
            const statusKey = (queueDetail.status as 'pending' | 'paid' | 'cancelled') || 'pending';
            const canActOnOrder = Boolean(detailId);

            return (
              <div className="space-y-6">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-semibold text-slate-100">
                      {queueDetail.orderNumber || (detailId ? `Order ${String(detailId).slice(-6)}` : 'Order')}
                    </h3>
                    <p className="text-xs text-slate-400">
                      {queueDetail.createdAt ? formatDateTime(queueDetail.createdAt) : 'N/A'}
                    </p>
                  </div>
                  <Badge className={ORDER_STATUS_STYLES[statusKey] || ORDER_STATUS_STYLES.pending}>
                    {ORDER_STATUS_LABELS[statusKey] || queueDetail.status}
                  </Badge>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-xl border border-slate-900 bg-slate-950/70 px-4 py-3">
                    <p className="text-xs uppercase tracking-[0.3em] text-slate-500 mb-1">Order Type</p>
                    <p className="text-sm font-semibold text-slate-100">
                      {ORDER_TYPE_LABELS[queueDetail.orderType as OrderType] || queueDetail.orderType}
                    </p>
                  </div>
                  <div className="rounded-xl border border-slate-900 bg-slate-950/70 px-4 py-3">
                    <p className="text-xs uppercase tracking-[0.3em] text-slate-500 mb-1">Payment</p>
                    <p className="text-sm font-semibold text-slate-100">
                      {queueDetail.paymentMethod ? queueDetail.paymentMethod : 'Not recorded'}
                    </p>
                  </div>
                  {queueDetail.customerInfo && (
                    <div className="rounded-xl border border-slate-900 bg-slate-950/70 px-4 py-3 sm:col-span-2">
                      <p className="text-xs uppercase tracking-[0.3em] text-slate-500 mb-1">Customer</p>
                      <div className="space-y-1 text-sm text-slate-200">
                        {queueDetail.customerInfo.name && <p>{queueDetail.customerInfo.name}</p>}
                        {queueDetail.customerInfo.phone && <p>{queueDetail.customerInfo.phone}</p>}
                        {queueDetail.customerInfo.email && <p>{queueDetail.customerInfo.email}</p>}
                        {!queueDetail.customerInfo.name &&
                          !queueDetail.customerInfo.phone &&
                          !queueDetail.customerInfo.email && <p>No customer details captured.</p>}
                      </div>
                    </div>
                  )}
                </div>

                <div>
                  <h4 className="text-sm font-semibold text-slate-200 uppercase tracking-[0.25em]">Items</h4>
                  <div className="mt-3 space-y-3">
                    {Array.isArray(queueDetail.items) && queueDetail.items.length > 0 ? (
                      queueDetail.items.map((item: any, index: number) => {
                        const lookup = menuItemNameById.get(item.menuItemId);
                        const itemLabel =
                          lookup?.name ||
                          item.name ||
                          item.menuItemName ||
                          `Item ${index + 1}`;
                        const itemTotal = Number(item.price || 0) * Number(item.quantity || 0);
                        return (
                          <div
                            key={`${item.menuItemId || index}-${index}`}
                            className="rounded-xl border border-slate-900 bg-slate-950/70 px-4 py-3 text-sm text-slate-200"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <p className="font-semibold text-slate-100">{itemLabel}</p>
                                <p className="text-xs text-slate-400">
                                  Qty {item.quantity || 0} • {formatCurrency(Number(item.price || 0))}
                                </p>
                                {item.notes && (
                                  <p className="mt-2 rounded-lg bg-slate-900/60 px-3 py-2 text-xs text-slate-300 whitespace-pre-line">
                                    {item.notes}
                                  </p>
                                )}
                              </div>
                              <span className="text-sm font-semibold text-slate-100">
                                {formatCurrency(itemTotal)}
                              </span>
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <div className="rounded-xl border border-slate-900 bg-slate-950/70 px-4 py-6 text-center text-xs text-slate-400">
                        No line items recorded for this order.
                      </div>
                    )}
                  </div>
                </div>

                {queueDetail.notes && (
                  <div className="rounded-xl border border-slate-900 bg-slate-950/70 px-4 py-3 text-sm text-slate-200">
                    <p className="text-xs uppercase tracking-[0.3em] text-slate-500 mb-1">Order Notes</p>
                    <p className="whitespace-pre-line">{queueDetail.notes}</p>
                  </div>
                )}

                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="space-y-1 text-sm text-slate-300">
                    <div className="flex items-center gap-2">
                      <CurrencyDollarIcon className="h-4 w-4 text-emerald-300" />
                      <span className="font-semibold text-emerald-300">
                        {formatCurrency(Number(queueDetail.totalAmount || 0))}
                      </span>
                    </div>
                    {queueDetail.deliveryFee ? (
                      <p className="text-xs text-slate-400">
                        Includes delivery fee of {formatCurrency(Number(queueDetail.deliveryFee || 0))}
                      </p>
                    ) : null}
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      variant="secondary"
                      onClick={() => canActOnOrder && handleViewReceipt(detailId)}
                      disabled={!canActOnOrder}
                      className="rounded-lg bg-slate-900/80 text-slate-100 hover:bg-slate-800/80 disabled:opacity-40"
                    >
                      View Receipt
                    </Button>
                    <Button
                      variant="secondary"
                      onClick={() => canActOnOrder && handlePrintReceipt(detailId, false)}
                      disabled={!canActOnOrder}
                      className="rounded-lg bg-slate-900/80 text-slate-100 hover:bg-slate-800/80 disabled:opacity-40"
                    >
                      Print
                    </Button>
                    {queueDetail.status === 'pending' && (
                      <Button
                        variant="secondary"
                        onClick={() => canActOnOrder && handleQueueCancel(detailId)}
                        disabled={!canActOnOrder || queueActionOrderId === detailId}
                        className="rounded-lg bg-rose-500/15 text-rose-200 hover:bg-rose-500/25 disabled:opacity-60"
                      >
                        {queueActionOrderId === detailId ? 'Cancelling…' : 'Cancel Order'}
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            );
          })()
        ) : (
          <div className="py-10 text-center text-slate-400">Order details unavailable.</div>
        )}
      </Modal>

      {/* Receipt Modal - Higher z-index to appear above payment success modal */}
      <Modal
        isOpen={isReceiptModalOpen}
        onClose={() => setIsReceiptModalOpen(false)}
        title="Receipt Preview"
        size="lg"
        className="z-[100]"
      >
        <div className="space-y-4">
          {receiptLoading ? (
            <div className="text-center py-8 text-gray-500">
              <ClockIcon className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>Loading receipt...</p>
            </div>
          ) : receiptError ? (
            <div className="rounded-xl border border-slate-800 bg-slate-950/70 px-6 py-5 text-center text-sm text-slate-300 space-y-3">
              <p>We couldn't load the receipt for this order.</p>
              {receiptErrorDetails && 'status' in (receiptErrorDetails as Record<string, unknown>) && (
                <p className="text-xs text-slate-500">
                  Error {(receiptErrorDetails as any).status}: {receiptErrorMessage || 'Unexpected error'}
                </p>
              )}
              <Button
                variant="secondary"
                onClick={() => currentOrderId && refetchReceipt()}
                className="rounded-full bg-slate-900/80 text-slate-100 hover:bg-slate-800/80"
              >
                Try Again
              </Button>
            </div>
          ) : receiptHTML?.html ? (
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
              <p>No receipt content available for this order.</p>
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

      {/* Modifier Modal */}
      <Modal
        isOpen={Boolean(modifierEditor)}
        onClose={closeModifierEditor}
        title={modifierEditor ? `Customize ${modifierEditor.item?.name ?? ''}` : 'Customize Item'}
        size="lg"
      >
        {modifierEditor && modifierPreview && (
          <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-850 bg-slate-950/70 p-4">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Unit price</p>
                <p className="text-2xl font-semibold text-emerald-300">{formatCurrency(modifierPreview.price)}</p>
                {modifierPreview.modifiersNote && (
                  <p className="mt-1 text-xs text-slate-400">{modifierPreview.modifiersNote}</p>
                )}
    </div>
              <div className="flex items-center gap-3">
                <label className="text-sm font-medium text-slate-300">Quantity</label>
                <Input
                  type="number"
                  min="1"
                  value={modifierEditor.quantity}
                  onChange={(event) => {
                    const next = Math.max(1, Number(event.target.value) || 1);
                    setModifierEditor((prev) => (prev ? { ...prev, quantity: next } : prev));
                  }}
                  className="w-20 bg-slate-950/70 border-slate-850 text-slate-100"
                />
              </div>
            </div>

            {Array.isArray(modifierEditor.item?.variants) && modifierEditor.item.variants.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-slate-100">Variants</h3>
                {modifierEditor.item.variants.map((variant: any) => (
                  <div key={variant.name} className="space-y-2">
                    <p className="text-xs uppercase tracking-[0.3em] text-slate-500">{variant.name}</p>
                    <div className="flex flex-wrap gap-2">
                      {Array.isArray(variant.options) && variant.options.length > 0 ? (
                        variant.options.map((option: any) => {
                          const isActive = modifierEditor.variantSelections[variant.name] === option.name;
                          const priceLabel = Number(option.priceModifier || 0);
                          return (
                            <Button
                              key={option.name}
                              size="sm"
                              variant={isActive ? 'primary' : 'secondary'}
                              onClick={() =>
                                setModifierEditor((prev) =>
                                  prev
                                    ? {
                                        ...prev,
                                        variantSelections: {
                                          ...prev.variantSelections,
                                          [variant.name]: option.name,
                                        },
                                      }
                                    : prev
                                )
                              }
                              className={`rounded-full ${
                                isActive
                                  ? 'bg-sky-600 hover:bg-sky-500'
                                  : 'bg-slate-900/80 text-slate-200 hover:bg-slate-800/80'
                              }`}
                            >
                              {option.name}
                              {priceLabel ? ` (+${formatCurrency(priceLabel)})` : ''}
                            </Button>
                          );
                        })
                      ) : (
                        <p className="text-sm text-slate-400">No options configured</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {Array.isArray(modifierEditor.item?.selections) && modifierEditor.item.selections.length > 0 && (
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-slate-100">Selections</h3>
                {modifierEditor.item.selections.map((selection: any) => {
                  const currentChoices = modifierEditor.selectionChoices[selection.name] || [];
                  const selectionType = selection.type || 'single';
                  return (
                    <div key={selection.name} className="space-y-2">
                      <div className="flex items-center gap-2 text-xs uppercase tracking-[0.3em] text-slate-500">
                        <span>{selection.name}</span>
                        <Badge className="bg-slate-900/70 text-slate-300 border border-slate-800">
                          {selectionType === 'multi' ? 'Multiple' : selectionType === 'optional' ? 'Optional' : 'Single'}
                        </Badge>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {Array.isArray(selection.options) && selection.options.length > 0 ? (
                          selection.options.map((option: any) => {
                            const isActive = currentChoices.includes(option.name);
                            const priceLabel = Number(option.price || 0);
                            return (
                              <Button
                                key={option.name}
                                size="sm"
                                variant={isActive ? 'primary' : 'secondary'}
                                onClick={() =>
                                  setModifierEditor((prev) => {
                                    if (!prev) return prev;
                                    const previous = prev.selectionChoices[selection.name] || [];
                                    let nextChoices: string[] = [];
                                    if (selectionType === 'single') {
                                      nextChoices = [option.name];
                                    } else {
                                      const buffer = new Set(previous);
                                      if (buffer.has(option.name)) {
                                        buffer.delete(option.name);
                                      } else {
                                        buffer.add(option.name);
                                      }
                                      nextChoices = Array.from(buffer);
                                    }
                                    return {
                                      ...prev,
                                      selectionChoices: {
                                        ...prev.selectionChoices,
                                        [selection.name]: nextChoices,
                                      },
                                    };
                                  })
                                }
                                className={`rounded-full ${
                                  isActive
                                    ? 'bg-amber-500 hover:bg-amber-400'
                                    : 'bg-slate-900/80 text-slate-200 hover:bg-slate-800/80'
                                }`}
                              >
                                {option.name}
                                {priceLabel ? ` (+${formatCurrency(priceLabel)})` : ''}
                              </Button>
                            );
                          })
                        ) : (
                          <p className="text-sm text-slate-400">No options configured</p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {Array.isArray(modifierEditor.item?.addons) && modifierEditor.item.addons.some((addon: any) => addon?.isAvailable !== false) && (
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-slate-100">Add-ons</h3>
                <div className="flex flex-wrap gap-2">
                  {modifierEditor.item.addons
                    .filter((addon: any) => addon?.isAvailable !== false)
                    .map((addon: any) => {
                      const isActive = Boolean(modifierEditor.addonSelections[addon.name]);
                      const addonPrice = Number(addon.price || 0);
                      return (
                        <Button
                          key={addon.name}
                          size="sm"
                          variant={isActive ? 'primary' : 'secondary'}
                          onClick={() =>
                            setModifierEditor((prev) =>
                              prev
                                ? {
                                    ...prev,
                                    addonSelections: {
                                      ...prev.addonSelections,
                                      [addon.name]: !prev.addonSelections[addon.name],
                                    },
                                  }
                                : prev
                            )
                          }
                          className={`rounded-full ${
                            isActive
                              ? 'bg-emerald-600 hover:bg-emerald-500'
                              : 'bg-slate-900/80 text-slate-200 hover:bg-slate-800/80'
                          }`}
                        >
                          {addon.name}
                          {addonPrice ? ` (+${formatCurrency(addonPrice)})` : ''}
                        </Button>
                      );
                    })}
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={closeModifierEditor}>
                Cancel
              </Button>
              <Button onClick={handleModifierConfirm} className="bg-sky-600 hover:bg-sky-500">
                Add to Cart
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Occupied Table Modal */}
      <Modal
        isOpen={Boolean(occupiedTableModal)}
        onClose={() => setOccupiedTableModal(null)}
        title="Table is Occupied"
        size="md"
      >
        {occupiedTableModal && (
          <div className="space-y-4">
            <div className="rounded-xl border border-orange-500/40 bg-orange-500/10 p-4">
              <p className="text-sm text-orange-200">
                This table has an active order. Choose an action below:
              </p>
            </div>
            
            {occupiedTableModal.orderDetails && (
              <div className="space-y-3 rounded-xl border border-slate-800 bg-slate-950/60 p-4">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-xs text-slate-400">Token Number</p>
                    <p className="font-semibold text-slate-100">{occupiedTableModal.orderDetails.tokenNumber || occupiedTableModal.orderDetails.orderNumber}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400">Order Amount</p>
                    <p className="font-semibold text-emerald-400">{formatCurrency(occupiedTableModal.orderDetails.totalAmount || 0)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400">Order Status</p>
                    <Badge className={
                      occupiedTableModal.orderDetails.orderStatus === 'paid' 
                        ? 'bg-emerald-500/10 text-emerald-200 border border-emerald-500/30'
                        : occupiedTableModal.orderDetails.orderStatus === 'pending'
                        ? 'bg-amber-500/10 text-amber-200 border border-amber-500/30'
                        : 'bg-slate-500/10 text-slate-200 border border-slate-500/30'
                    }>
                      {occupiedTableModal.orderDetails.orderStatus === 'paid' ? 'Paid' : occupiedTableModal.orderDetails.orderStatus === 'pending' ? 'Pending' : occupiedTableModal.orderDetails.orderStatus || 'Unknown'}
                    </Badge>
                  </div>
                  {occupiedTableModal.orderDetails.waiterName && (
                    <div>
                      <p className="text-xs text-slate-400">Waiter</p>
                      <p className="font-semibold text-slate-100">{occupiedTableModal.orderDetails.waiterName}</p>
                    </div>
                  )}
                  {occupiedTableModal.orderDetails.holdCount > 0 && (
                    <div>
                      <p className="text-xs text-slate-400">Times Held</p>
                      <p className="font-semibold text-orange-400">{occupiedTableModal.orderDetails.holdCount}x</p>
                    </div>
                  )}
                  <div className="col-span-2">
                    <p className="text-xs text-slate-400">Used Seats</p>
                    <p className="font-semibold text-slate-100">
                      {occupiedTableModal.orderDetails.usedSeats || 0} / {tables.find((t: any) => t.id === occupiedTableModal.tableId)?.capacity || 0}
                    </p>
                  </div>
                  {occupiedTableModal.orderDetails.remainingSeats > 0 && (
                    <div className="col-span-2">
                      <p className="text-xs text-sky-400">Remaining Seats</p>
                      <p className="font-semibold text-sky-300">{occupiedTableModal.orderDetails.remainingSeats} seats available</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="flex flex-col gap-2">
              {occupiedTableModal.orderDetails?.orderStatus !== 'paid' && (
                <Button
                  onClick={handleResumeOrder}
                  className="w-full bg-sky-600 hover:bg-sky-500"
                >
                  Resume & Edit Order
                </Button>
              )}
              {occupiedTableModal.orderDetails?.orderStatus === 'pending' && (
                <Button
                  onClick={async () => {
                    if (!occupiedTableModal.orderDetails?.currentOrderId) return;
                    try {
                      await updateOrder({
                        id: occupiedTableModal.orderDetails.currentOrderId,
                        data: { status: 'paid' }
                      }).unwrap();
                      toast.success('Order marked as paid');
                      setOccupiedTableModal(null);
                      refetchTables();
                      refetchQueue();
                    } catch (error: any) {
                      toast.error(error?.data?.message || 'Failed to update order status');
                    }
                  }}
                  className="w-full bg-emerald-600 hover:bg-emerald-500"
                >
                  Mark as Paid
                </Button>
              )}
              {occupiedTableModal.orderDetails?.orderStatus === 'paid' && (
                <Button
                  onClick={async () => {
                    if (!occupiedTableModal.orderDetails?.currentOrderId) return;
                    try {
                      await updateOrder({
                        id: occupiedTableModal.orderDetails.currentOrderId,
                        data: { status: 'pending' }
                      }).unwrap();
                      toast.success('Order marked as pending');
                      setOccupiedTableModal(null);
                      refetchTables();
                      refetchQueue();
                    } catch (error: any) {
                      toast.error(error?.data?.message || 'Failed to update order status');
                    }
                  }}
                  variant="secondary"
                  className="w-full"
                >
                  Mark as Pending
                </Button>
              )}
              {occupiedTableModal.orderDetails?.remainingSeats > 0 && (
                <Button
                  onClick={handleStartNewOrderOnTable}
                  variant="secondary"
                  className="w-full"
                >
                  Start New Order ({occupiedTableModal.orderDetails.remainingSeats} seats)
                </Button>
              )}
              {occupiedTableModal.orderDetails?.orderStatus !== 'paid' && (
                <Button
                  onClick={handleCancelOccupiedOrder}
                  variant="ghost"
                  className="w-full text-rose-400 hover:text-rose-300 hover:bg-rose-500/10"
                >
                  Cancel Order & Free Table
                </Button>
              )}
              <Button
                onClick={() => setOccupiedTableModal(null)}
                variant="secondary"
                className="w-full"
              >
                Close
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Payment Success Modal */}
      <Modal
        isOpen={Boolean(paymentSuccessOrder)}
        onClose={() => setPaymentSuccessOrder(null)}
        title="Payment Completed"
        size="lg"
      >
        {paymentSuccessOrder && (
          <div className="space-y-5">
            <div className="rounded-2xl border border-emerald-600/40 bg-emerald-500/10 p-6 text-emerald-100">
              <p className="text-sm uppercase tracking-[0.3em] text-emerald-200">Order</p>
              <h3 className="text-2xl font-semibold">
                {paymentSuccessOrder.orderNumber ? `Order #${paymentSuccessOrder.orderNumber}` : paymentSuccessOrder.orderId}
              </h3>
              <p className="mt-2 text-sm text-emerald-100/80">
                {paymentSuccessOrder.summary || 'Payment recorded successfully.'}
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-xl border border-slate-850 bg-slate-950/70 p-4">
                <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Total Paid</p>
                <p className="text-xl font-semibold text-emerald-300">
                  {formatCurrency(paymentSuccessOrder.totalPaid)}
                </p>
              </div>
              {paymentSuccessOrder.changeDue !== undefined && (
                <div className="rounded-xl border border-slate-850 bg-slate-950/70 p-4">
                  <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Change Due</p>
                  <p className="text-xl font-semibold text-amber-300">
                    {formatCurrency(paymentSuccessOrder.changeDue)}
                  </p>
                </div>
              )}
            </div>

            {paymentSuccessOrder.breakdown && paymentSuccessOrder.breakdown.length > 0 && (
              <div className="rounded-xl border border-slate-850 bg-slate-950/70 p-4 space-y-2">
                <p className="text-sm font-semibold text-slate-100">Payment Breakdown</p>
                <div className="space-y-1 text-sm text-slate-300">
                  {paymentSuccessOrder.breakdown.map((row) => (
                    <div key={`${row.method}-${row.amount}`} className="flex items-center justify-between">
                      <span className="capitalize">{row.method}</span>
                      <span className="font-semibold text-slate-100">{formatCurrency(row.amount)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex flex-wrap justify-end gap-2">
              <Button
                variant="secondary"
                onClick={() => handleViewReceipt(paymentSuccessOrder.orderId)}
                className="flex items-center gap-2"
              >
                <ClipboardDocumentListIcon className="h-4 w-4" />
                View Receipt
              </Button>
              <Button
                variant="secondary"
                onClick={() => handlePrintReceipt(paymentSuccessOrder.orderId, false)}
                className="flex items-center gap-2"
              >
                <PrinterIcon className="h-4 w-4" />
                Print Receipt
              </Button>
              <Button
                variant="secondary"
                onClick={() => handlePrintReceipt(paymentSuccessOrder.orderId, true)}
                className="flex items-center gap-2"
              >
                <PrinterIcon className="h-4 w-4" />
                Print PDF
              </Button>
              <Button
                variant="secondary"
                onClick={() => handleDownloadReceiptPDF(paymentSuccessOrder.orderId)}
                className="flex items-center gap-2"
              >
                <DocumentArrowDownIcon className="h-4 w-4" />
                Download PDF
              </Button>
              <Button
                onClick={() => setPaymentSuccessOrder(null)}
                className="bg-emerald-600 hover:bg-emerald-500"
              >
                Done
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
