'use client';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Calculator } from '@/components/ui/Calculator';
import { Card, CardContent } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { OfflineBanner } from '@/components/ui/OfflineBanner';
import { useFeatureAccess } from '@/hooks/useFeatureRedirect';
import { useFormatCurrency } from '@/hooks/useFormatCurrency';
import { Booking, useCreateBookingMutation, useGetBookingsQuery } from '@/lib/api/endpoints/bookingsApi';
import { useGetCategoriesQuery } from '@/lib/api/endpoints/categoriesApi';
import { useGetCustomerByIdQuery, useLazySearchCustomersQuery } from '@/lib/api/endpoints/customersApi';
import { useGetDeliveryZonesByBranchQuery } from '@/lib/api/endpoints/deliveryZonesApi';
import { useGetPaymentMethodsByBranchQuery } from '@/lib/api/endpoints/paymentMethodsApi';
import type { CreatePOSOrderRequest } from '@/lib/api/endpoints/posApi';
import {
  posApi,
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
  useGetWaiterActiveOrdersCountQuery,
  usePrintReceiptMutation,
  usePrintReceiptPDFMutation,
  useProcessPaymentMutation,
  useRefundOrderMutation,
  useUpdatePOSOrderMutation
} from '@/lib/api/endpoints/posApi';
import { useGetRoomsQuery } from '@/lib/api/endpoints/roomsApi';
import { useGetStaffQuery } from '@/lib/api/endpoints/staffApi';
import { useUpdateTableStatusMutation } from '@/lib/api/endpoints/tablesApi';
import { useGetCurrentWorkPeriodQuery } from '@/lib/api/endpoints/workPeriodsApi';
import { useOfflineSyncManager } from '@/lib/hooks/useOfflineSyncManager';
import { usePOSOfflinePrefetcher } from '@/lib/hooks/usePOSOfflinePrefetcher';
import { useSocket } from '@/lib/hooks/useSocket';
import { useAppDispatch, useAppSelector } from '@/lib/store';
import { cn, formatDateTime } from '@/lib/utils';
import { getEncryptedItemWithTTL, removeEncryptedItem, setEncryptedItemWithTTL } from '@/lib/utils/storage-encryption';
import {
  ArrowPathIcon,
  BuildingOfficeIcon,
  CheckIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ClipboardDocumentListIcon,
  ClockIcon,
  Cog6ToothIcon,
  ComputerDesktopIcon,
  CreditCardIcon,
  CurrencyDollarIcon,
  DocumentArrowDownIcon,
  FunnelIcon,
  HomeModernIcon,
  InformationCircleIcon,
  LockClosedIcon,
  MagnifyingGlassIcon,
  MinusIcon,
  PencilSquareIcon,
  PlusIcon,
  PrinterIcon,
  ShoppingBagIcon,
  ShoppingCartIcon,
  TableCellsIcon,
  TagIcon,
  TrashIcon,
  TruckIcon,
  UserIcon,
  UserCircleIcon,
  UserGroupIcon,
  ClipboardDocumentIcon,
} from '@heroicons/react/24/outline';
import Image from 'next/image';
import { useSearchParams } from 'next/navigation';
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
  serviceChargeAmount: number;
  total: number;
  itemCount: number;
  deliveryFee: number;
  discount: number;
}
type OrderType = 'dine-in' | 'delivery' | 'takeaway' | 'room-booking' | 'room-service';
// Order type options - room booking will be conditionally added based on feature access
const BASE_ORDER_TYPE_OPTIONS = [
  { value: 'dine-in', label: 'Dine-In', icon: HomeModernIcon },
  { value: 'delivery', label: 'Delivery', icon: TruckIcon },
  { value: 'takeaway', label: 'Takeaway', icon: ShoppingBagIcon },
] as const;
const ROOM_BOOKING_OPTION = { value: 'room-booking', label: 'Room Booking', icon: BuildingOfficeIcon } as const;
const ROOM_SERVICE_OPTION = { value: 'room-service', label: 'Room Service', icon: BuildingOfficeIcon } as const;
// Order type labels - will be used dynamically
const getOrderTypeLabel = (orderType: OrderType): string => {
  const labels: Record<OrderType, string> = {
    'dine-in': 'Dine-In',
    delivery: 'Delivery',
    takeaway: 'Takeaway',
    'room-booking': 'Room Booking',
    'room-service': 'Room Service',
  };
  return labels[orderType] || orderType;
};
const ORDER_STATUS_LABELS: Record<string, string> = {
  pending: 'Pending',
  confirmed: 'Confirmed',
  preparing: 'Preparing',
  ready: 'Ready',
  served: 'Served',
  paid: 'Paid',
  completed: 'Completed',
  cancelled: 'Cancelled',
};
const ORDER_STATUS_STYLES: Record<string, string> = {
  pending: 'bg-amber-500/10 text-amber-700 dark:text-amber-200 border border-amber-500/30',
  confirmed: 'bg-sky-500/10 text-sky-700 dark:text-sky-200 border border-sky-500/30',
  preparing: 'bg-blue-500/10 text-blue-700 dark:text-blue-200 border border-blue-500/30',
  ready: 'bg-purple-500/10 text-purple-700 dark:text-purple-200 border border-purple-500/30',
  served: 'bg-indigo-500/10 text-indigo-700 dark:text-indigo-200 border border-indigo-500/30',
  paid: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-200 border border-emerald-500/30',
  completed: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-200 border border-emerald-500/30',
  cancelled: 'bg-rose-500/10 text-rose-700 dark:text-rose-200 border border-rose-500/30',
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
  method: string; // Payment method code from API
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
  const dispatch = useAppDispatch();
  const { user, companyContext } = useAppSelector((state) => state.auth);
  const { isOnline, pendingCount, syncOrders } = useOfflineSyncManager();
  // Enterprise offline prefetcher — downloads all POS data to IndexedDB when online
  const {
    isOfflineReady,
    isSyncing: isPrefetchSyncing,
    lastSyncedAt,
    syncErrors,
    syncNow,
  } = usePOSOfflinePrefetcher();
  const formatCurrency = useFormatCurrency(); // Use hook to get reactive currency formatting
  const isOwnerOrManager =
    user?.role === 'owner' || user?.role === 'super_admin' || user?.role === 'manager';
  // Check if user has access to booking management feature (for room booking / room service)
  const { hasAccess: hasBookingAccess } = useFeatureAccess('booking-management');
  // Build order type options based on feature access
  const ORDER_TYPE_OPTIONS = useMemo(() => {
    if (hasBookingAccess) {
      return [...BASE_ORDER_TYPE_OPTIONS, ROOM_BOOKING_OPTION, ROOM_SERVICE_OPTION];
    }
    return BASE_ORDER_TYPE_OPTIONS;
  }, [hasBookingAccess]);
  const {
    data: activeWorkPeriod,
    isLoading: workPeriodLoading,
  } = useGetCurrentWorkPeriodQuery(undefined, {
    skip: isOwnerOrManager,
  });
  // Load from localStorage on mount
  const [orderType, setOrderType] = useState<OrderType>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('pos_orderType') as OrderType | null;
      if (
        saved === 'delivery' ||
        saved === 'takeaway' ||
        saved === 'dine-in' ||
        saved === 'room-booking' ||
        saved === 'room-service'
      ) {
        return saved;
      }
    }
    return 'dine-in';
  });
  // Reset orderType to 'dine-in' if user loses access to hotel features and it's currently selected
  useEffect(() => {
    if ((orderType === 'room-booking' || orderType === 'room-service') && hasBookingAccess === false) {
      setOrderType('dine-in');
      if (typeof window !== 'undefined') {
        localStorage.setItem('pos_orderType', 'dine-in');
      }
    }
  }, [orderType, hasBookingAccess]);
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
  const [isCalculatorOpen, setIsCalculatorOpen] = useState(false);
  const [customerInfo, setCustomerInfo] = useState(() => {
    if (typeof window !== 'undefined') {
      // Use encrypted storage with 24-hour TTL for customer PII
      const saved = getEncryptedItemWithTTL<{ name: string; phone: string; email: string }>('pos_customerInfo');
      return saved || { name: '', phone: '', email: '' };
    }
    return { name: '', phone: '', email: '' };
  });
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('pos_customerId') || '';
    }
    return '';
  });
  // Fetch customer details for loyalty points
  const { data: selectedCustomer } = useGetCustomerByIdQuery(selectedCustomerId, {
    skip: !selectedCustomerId,
  });
  // Calculate cart subtotal (before discounts) for loyalty redemption
  const cartSubtotal = useMemo(() => {
    return cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  }, [cart]);
  // Calculate loyalty redemption based on cart subtotal
  const loyaltyRedemption = useMemo(() => {
    if (!selectedCustomer || !selectedCustomerId) {
      return { pointsRedeemed: 0, discount: 0 };
    }
    const MIN_ORDER_AMOUNT = 1000; // Minimum order amount in TK
    const POINTS_PER_DISCOUNT = 2000; // 2000 points = 20 TK discount
    const DISCOUNT_AMOUNT = 20; // 20 TK discount per 2000 points
    const availablePoints = selectedCustomer.loyaltyPoints || 0;
    // Check if order meets minimum amount requirement
    if (cartSubtotal < MIN_ORDER_AMOUNT) {
      return { pointsRedeemed: 0, discount: 0 };
    }
    // Calculate how many discount blocks can be applied
    const discountBlocks = Math.floor(availablePoints / POINTS_PER_DISCOUNT);
    if (discountBlocks > 0) {
      // Apply maximum discount blocks (can be limited by order total)
      const maxDiscount = discountBlocks * DISCOUNT_AMOUNT;
      // Discount cannot exceed cart subtotal
      const discount = Math.min(maxDiscount, cartSubtotal);
      // Calculate points to redeem (in full blocks of 2000)
      const blocksToRedeem = Math.floor(discount / DISCOUNT_AMOUNT);
      const pointsRedeemed = blocksToRedeem * POINTS_PER_DISCOUNT;
      return { pointsRedeemed, discount };
    }
    return { pointsRedeemed: 0, discount: 0 };
  }, [selectedCustomer, selectedCustomerId, cartSubtotal]);
  const [deliveryDetails, setDeliveryDetails] = useState<DeliveryDetailsState>(() => {
    if (typeof window !== 'undefined') {
      // Use encrypted storage with 24-hour TTL for delivery PII
      const saved = getEncryptedItemWithTTL<DeliveryDetailsState>('pos_deliveryDetails');
      if (saved) {
        return { ...createDefaultDeliveryDetails(), ...saved };
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
  const [roomServiceBookingId, setRoomServiceBookingId] = useState<string>('');
  const [selectedPrinter, setSelectedPrinter] = useState<string>('');
  const [hasStartedOrder, setHasStartedOrder] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('pos_orderStarted') === 'true';
    }
    return false;
  });
  const [isQueueModalOpen, setIsQueueModalOpen] = useState(false);
  const [isCartSidebarCollapsed, setIsCartSidebarCollapsed] = useState(false);
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
  const [cartActiveTab, setCartActiveTab] = useState<'items' | 'settings' | 'customer'>('items');
  const [customerSearchTerm, setCustomerSearchTerm] = useState('');
  
  // Inline Quantity Editing State
  const [editingQuantityItemId, setEditingQuantityItemId] = useState<string | null>(null);
  const [editingQuantityValue, setEditingQuantityValue] = useState<string>('');

  const [modifierEditor, setModifierEditor] = useState<{
    item: any;
    quantity: number;
    variantSelections: Record<string, string>;
    selectionChoices: Record<string, string[]>;
    addonSelections: Record<string, boolean>;
  } | null>(null);
  // Room booking state
  const [selectedRoomId, setSelectedRoomId] = useState<string>('');
  const [checkInDate, setCheckInDate] = useState<string>(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  });
  const [checkOutDate, setCheckOutDate] = useState<string>(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split('T')[0];
  });
  const [numberOfGuests, setNumberOfGuests] = useState<number>(1);
  const [specialRequests, setSpecialRequests] = useState<string>('');
  const [paymentTab, setPaymentTab] = useState<'full' | 'multi'>('full');
  const [fullPaymentMethod, setFullPaymentMethod] = useState<string>('cash'); // Payment method code
  const [fullPaymentReceived, setFullPaymentReceived] = useState<string>('0');
  const [multiPayments, setMultiPayments] = useState<SplitPaymentRow[]>([]);
  const [paymentSuccessOrder, setPaymentSuccessOrder] = useState<PaymentSuccessState | null>(null);
  const [queueTab, setQueueTab] = useState<'active' | 'history'>('active');
  const [queueStatusFilter, setQueueStatusFilter] = useState<'all' | 'pending' | 'paid' | 'cancelled'>('pending');
  const [queueOrderTypeFilter, setQueueOrderTypeFilter] = useState<'all' | 'dine-in' | 'delivery' | 'takeaway'>('all');
  const [queueSearchInput, setQueueSearchInput] = useState('');
  const [queueSearchTerm, setQueueSearchTerm] = useState('');
  const [queueDetailId, setQueueDetailId] = useState<string | null>(null);
  const [queueActionOrderId, setQueueActionOrderId] = useState<string | null>(null);
  // Payment modal for pending orders
  const [isPendingOrderPaymentModalOpen, setIsPendingOrderPaymentModalOpen] = useState(false);
  const [pendingOrderPaymentMethod, setPendingOrderPaymentMethod] = useState<string>('cash');
  const [pendingOrderPaymentReceived, setPendingOrderPaymentReceived] = useState<string>('0');
  // Refund modal states
  const [isRefundModalOpen, setIsRefundModalOpen] = useState(false);
  const [refundReason, setRefundReason] = useState('');
  const [refundAmount, setRefundAmount] = useState('');
  const [refundOrderId, setRefundOrderId] = useState('');
  const [refundIsDamage, setRefundIsDamage] = useState(false);
  const [reservedTableModal, setReservedTableModal] = useState<{ tableId: string; reservation: any } | null>(null);

  const searchParams = useSearchParams();

  // Handle auto-opening order from URL (e.g. from notifications)
  useEffect(() => {
    const urlOrderId = searchParams.get('orderId');
    if (urlOrderId) {
      setQueueDetailId(urlOrderId);
      setIsQueueModalOpen(true); // Open the queue modal to show details
      setQueueTab('history'); // Usually these are confirmed/past orders
    }
  }, [searchParams]);

  // Delivery zones for POS (branch-based)
  // Use same branch resolution logic as Bookings page so POS + Bookings see the same branch
  const currentBranchId =
    (user as any)?.branchId
    || (companyContext as any)?.branchId
    || (companyContext as any)?.branches?.[0]?._id
    || (companyContext as any)?.branches?.[0]?.id
    || (user as any)?.company?.branches?.[0]?._id
    || (user as any)?.company?.branches?.[0]?.id
    || '';
  const currentCompanyId =
    (user as any)?.companyId
    || (companyContext as any)?.companyId
    || (user as any)?.company?._id
    || (user as any)?.company?.id
    || '';
  const { data: deliveryZones = [], isLoading: zonesLoading } = useGetDeliveryZonesByBranchQuery(
    { branchId: currentBranchId },
    { skip: !currentBranchId }
  );
  // Payment methods for POS (branch-based, includes system + company + branch methods)
  const { data: paymentMethods = [], isLoading: paymentMethodsLoading } = useGetPaymentMethodsByBranchQuery(
    { companyId: currentCompanyId, branchId: currentBranchId },
    { skip: !currentCompanyId || !currentBranchId }
  );
  const resetDeliveryDetails = useCallback(() => {
    const defaults = createDefaultDeliveryDetails();
    setDeliveryDetails(defaults);
    setDeliveryFee('0');
    if (typeof window !== 'undefined') {
      removeEncryptedItem('pos_deliveryDetails');
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
  const requiresRoomBooking = orderType === 'room-booking';
  const requiresRoomService = orderType === 'room-service';
  const orderTypeLabel = ORDER_TYPE_OPTIONS.find(option => option.value === orderType)?.label ?? 'Dine-In';
  const activeOrderTypeOption = useMemo(() => ORDER_TYPE_OPTIONS.find(option => option.value === orderType), [orderType, ORDER_TYPE_OPTIONS]);
  const ActiveOrderIcon = activeOrderTypeOption?.icon ?? HomeModernIcon;
  // Room booking queries
  const { data: roomsData, isLoading: roomsLoading } = useGetRoomsQuery(
    { branchId: currentBranchId, status: 'available' },
    { skip: !currentBranchId || !requiresRoomBooking }
  );
  const [createBooking] = useCreateBookingMutation();
  const rooms = useMemo(() => {
    if (!roomsData) return [];
    const response = roomsData as any;
    if (Array.isArray(response)) return response;
    if (response.rooms) return response.rooms;
    if (response.data) return Array.isArray(response.data) ? response.data : response.data.rooms || [];
    return [];
  }, [roomsData]);
  // Room service bookings - confirmed or checked-in bookings for current branch
  const {
    data: roomServiceBookingsResponse,
    isLoading: roomServiceBookingsLoading,
  } = useGetBookingsQuery(
    { branchId: currentBranchId },
    { skip: !currentBranchId || !requiresRoomService },
  );
  const roomServiceBookings: Booking[] = useMemo(() => {
    if (!roomServiceBookingsResponse) return [];
    const response = roomServiceBookingsResponse as any;
    let items: Booking[] = [];
    if (Array.isArray(response.bookings)) items = response.bookings;
    else if (Array.isArray(response)) items = response;
    else if (response.data && Array.isArray(response.data.bookings)) {
      items = response.data.bookings;
    }
    // Only allow room service for confirmed or checked-in bookings
    return items.filter(
      (b: Booking) => b.status === 'confirmed' || b.status === 'checked_in',
    );
  }, [roomServiceBookingsResponse]);
  const selectedRoomServiceBooking = useMemo(
    () => roomServiceBookings.find((b) => b.id === roomServiceBookingId) || null,
    [roomServiceBookings, roomServiceBookingId],
  );
  // Auto-select the first available booking for room service when none is selected
  useEffect(() => {
    if (orderType === 'room-service' && !roomServiceBookingId && roomServiceBookings.length > 0) {
      setRoomServiceBookingId(roomServiceBookings[0].id);
    }
  }, [orderType, roomServiceBookingId, roomServiceBookings]);
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
  // Takeaway details (Name/Phone) are optional, so it is always valid
  const takeawayIsValid = true;
  const roomBookingIsValid = !requiresRoomBooking || (
    selectedRoomId !== '' &&
    checkInDate !== '' &&
    checkOutDate !== '' &&
    new Date(checkOutDate) > new Date(checkInDate) &&
    numberOfGuests > 0
  );
  const roomServiceIsValid = !requiresRoomService || roomServiceBookingId !== '';
  const checkoutBlocked = (requiresTable && !selectedTable)
    || (requiresDeliveryDetails && !deliveryIsValid)
    || (requiresTakeawayDetails && !takeawayIsValid)
    || (requiresRoomBooking && !roomBookingIsValid)
    || (requiresRoomService && !roomServiceIsValid);
  const missingDeliveryFields = useMemo(() => {
    if (!requiresDeliveryDetails) return [] as string[];
    const missing: string[] = [];
    if (!deliveryDetails.contactName.trim()) missing.push('contact name');
    if (!deliveryDetails.contactPhone.trim()) missing.push('contact phone');
    if (!deliveryDetails.addressLine1.trim()) missing.push('address line 1');
    if (!deliveryDetails.city.trim()) missing.push('city');
    if (!(deliveryDetails as any).zoneId) missing.push('delivery zone');
    return missing;
  }, [requiresDeliveryDetails, deliveryDetails]);
  const missingTakeawayFields = useMemo(() => {
    if (!requiresTakeawayDetails) return [] as string[];
    const missing: string[] = [];
    // Takeaway details (Name/Phone) are completely optional, so we don't strictly require them
    // to unlock the Pay button.
    return missing;
  }, [requiresTakeawayDetails, takeawayDetails]);
  // Socket.IO for real-time updates
  const { socket, isConnected } = useSocket();
  // API calls
  // Pass currentBranchId to ensure correct context even when pre-fetching or offline
  const { data: tablesData, isLoading: tablesLoading, error: _tablesError, refetch: refetchTables } = useGetAvailableTablesQuery(currentBranchId);
  // Listen for table status changes via Socket.IO
  useEffect(() => {
    if (!socket || !isConnected) {
      return;
    }
    const handleTableStatusChanged = (_data: any) => {
      // Just refetch tables to get latest status
      refetchTables();
    };
    socket.on('table:status-changed', handleTableStatusChanged);
    socket.on('table:available', handleTableStatusChanged);
    socket.on('table:occupied', handleTableStatusChanged);
    return () => {
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
  const serviceChargeRate = posSettings?.serviceCharge ?? 0;
  // Payment mode: 'pay-first' = pay before creating order, 'pay-later' = create order then pay
  const [paymentMode, setPaymentMode] = useState<'pay-first' | 'pay-later'>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('pos_paymentMode');
      if (saved === 'pay-first' || saved === 'pay-later') {
        return saved;
      }
    }
    return (posSettings?.defaultPaymentMode as 'pay-first' | 'pay-later') || 'pay-later';
  });
  // Sync payment mode with settings when they load (only if user hasn't set a preference)
  useEffect(() => {
    if (posSettings?.defaultPaymentMode && typeof window !== 'undefined') {
      const saved = localStorage.getItem('pos_paymentMode');
      if (!saved) {
        const defaultMode = posSettings.defaultPaymentMode as 'pay-first' | 'pay-later';
        setPaymentMode(defaultMode);
        localStorage.setItem('pos_paymentMode', defaultMode);
      }
    }
  }, [posSettings?.defaultPaymentMode]);
  // Save payment mode preference when user changes it
  useEffect(() => {
    if (typeof window !== 'undefined' && paymentMode) {
      localStorage.setItem('pos_paymentMode', paymentMode);
    }
  }, [paymentMode]);
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
  const [refundOrder] = useRefundOrderMutation();
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
      orderType?: 'dine-in' | 'delivery' | 'takeaway';
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
  const companyId = (user as any)?.companyId || (companyContext as any)?.companyId;
  const { data: staffData, isLoading: staffLoading, error: staffError } = useGetStaffQuery(
    { 
      companyId: companyId || undefined,
      branchId: branchId || undefined,
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
  // Fetch waiter active orders count for busy indicator
  const { data: waiterActiveOrdersCount = {} } = useGetWaiterActiveOrdersCountQuery(undefined, {
    skip: !branchId,
    pollingInterval: 60000, // Refresh every 60 seconds (reduced from 30s to reduce load)
  });
  const waiterOptions = useMemo<Array<{ id: string; name: string; activeOrdersCount: number; isGlobal: boolean }>>(() => {
    const staffList = staffData?.staff || [];
    const currentBranchId = branchId || user?.branchId;
    
    return staffList
      .filter((staffMember: any) => {
        // Broaden role check to include anyone who might serve tables
        const role = (staffMember.role || '').toLowerCase();
        const potentialWaiterRoles = ['waiter', 'server', 'steward', 'staff', 'employee', 'captain', 'manager', 'cashier', 'owner'];
        const isPotentialWaiter = potentialWaiterRoles.includes(role);
        
        if (!isPotentialWaiter) {
          return false;
        }

        // Less strict branch filtering: 
        // 1. If staff has no branch assignment, they might be company-wide staff
        // 2. Or match the current branch exactly
        const staffBranchId = staffMember.branchId;
        const isAssignedToBranch = !currentBranchId || !staffBranchId || 
          staffBranchId.toString() === currentBranchId.toString();
          
        return isAssignedToBranch;
      })
      .map((staffMember: any) => {
        const waiterId = staffMember.id;
        const activeOrdersCount = waiterActiveOrdersCount[waiterId] || 0;
        const isGlobal = !staffMember.branchId;
        
        return {
          id: waiterId,
          name:
            `${staffMember.firstName || ''} ${staffMember.lastName || ''}`.trim() ||
            staffMember.email ||
            staffMember.id,
          activeOrdersCount,
          isGlobal,
        };
      })
      .sort((a, b) => {
        // Prioritize branch-specific staff at the top
        if (a.isGlobal && !b.isGlobal) return 1;
        if (!a.isGlobal && b.isGlobal) return -1;
        return a.name.localeCompare(b.name);
      });
  }, [staffData, user?.branchId, branchId, waiterActiveOrdersCount]);
  const selectedWaiterName = useMemo(() => {
    const waiter = waiterOptions.find((option) => option.id === selectedWaiterId);
    if (!waiter) return '';
    return `${waiter.name}${waiter.isGlobal ? ' (Global)' : ''}`;
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
  // Calculate room booking total if room booking is selected
  const roomBookingTotal = useMemo(() => {
    if (orderType !== 'room-booking' || !selectedRoomId || !checkInDate || !checkOutDate) {
      return 0;
    }
    const selectedRoom = rooms.find((r: any) => r.id === selectedRoomId);
    if (!selectedRoom) return 0;
    const checkIn = new Date(checkInDate);
    const checkOut = new Date(checkOutDate);
    const nights = Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24));
    const roomRate = selectedRoom.basePrice || 0;
    return roomRate * nights;
  }, [orderType, selectedRoomId, checkInDate, checkOutDate, rooms]);
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
    // Add room booking total to subtotal if it's a room booking
    const baseSubtotal = base.subtotal + (orderType === 'room-booking' ? roomBookingTotal : 0);
    let discountAmount = 0;
    if (discountMode === 'full') {
      const parsed = parseFloat(discountValue || '0');
      if (Number.isFinite(parsed) && parsed > 0) {
        discountAmount =
          discountType === 'percent'
            ? Math.min(baseSubtotal, (baseSubtotal * parsed) / 100)
            : Math.min(baseSubtotal, parsed);
      }
    } else {
      // Item-wise discounts (only apply to cart items, not room booking)
      discountAmount = cart.reduce((sum, item) => sum + getItemDiscountAmount(item), 0);
      discountAmount = Math.min(discountAmount, base.subtotal);
    }
    // Add loyalty discount
    const loyaltyDiscount = loyaltyRedemption.discount || 0;
    const totalDiscount = discountAmount + loyaltyDiscount;
    const taxableSubtotal = Math.max(baseSubtotal - totalDiscount, 0);
    const taxAmount = (taxableSubtotal * taxRate) / 100;
    const serviceChargeAmount = (taxableSubtotal * serviceChargeRate) / 100;
    const total = taxableSubtotal + taxAmount + serviceChargeAmount + deliveryFeeValue;
    return {
      subtotal: baseSubtotal,
      discount: totalDiscount,
      tax: taxAmount,
      serviceChargeAmount,
      total,
      itemCount: base.itemCount,
      deliveryFee: deliveryFeeValue,
    };
  }, [
    cart,
    taxRate,
    serviceChargeRate,
    deliveryFeeValue,
    discountMode,
    discountType,
    discountValue,
    getItemDiscountAmount,
    loyaltyRedemption.discount,
    orderType,
    roomBookingTotal,
  ]);
  // Initialize payment method when payment methods load
  useEffect(() => {
    if (paymentMethods.length > 0 && !fullPaymentMethod) {
      const firstMethod = paymentMethods.find(m => m.code === 'cash')?.code || paymentMethods[0]?.code || 'cash';
      setFullPaymentMethod(firstMethod);
    }
  }, [paymentMethods, fullPaymentMethod]);
  useEffect(() => {
    const formattedTotal = orderSummary.total.toFixed(2);
    setFullPaymentReceived(formattedTotal);
    setMultiPayments((prev) => {
      if (prev.length === 0) {
        const firstMethod = paymentMethods.find(m => m.allowsPartialPayment !== false)?.code || paymentMethods[0]?.code || 'cash';
        return [{ id: generateClientId(), method: firstMethod, amount: formattedTotal }];
      }
      return prev;
    });
  }, [orderSummary.total, paymentMethods]);
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
        // Encrypt customer PII with 24-hour TTL
        const CUSTOMER_DATA_TTL = 24 * 60 * 60 * 1000; // 24 hours
        setEncryptedItemWithTTL('pos_customerInfo', customerInfo, CUSTOMER_DATA_TTL);
      } else {
        removeEncryptedItem('pos_customerInfo');
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
  // Save delivery details to encrypted storage
  useEffect(() => {
    if (typeof window !== 'undefined' && orderType === 'delivery') {
      const hasDeliveryDetails = Object.values(deliveryDetails).some(v => v.trim() !== '') || deliveryFee !== '0';
      if (hasDeliveryDetails) {
        // Encrypt delivery PII with 24-hour TTL
        const DELIVERY_DATA_TTL = 24 * 60 * 60 * 1000; // 24 hours
        setEncryptedItemWithTTL('pos_deliveryDetails', deliveryDetails, DELIVERY_DATA_TTL);
      } else {
        removeEncryptedItem('pos_deliveryDetails');
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
      // Encrypt delivery PII with 24-hour TTL
      const DELIVERY_DATA_TTL = 24 * 60 * 60 * 1000; // 24 hours
      setEncryptedItemWithTTL('pos_deliveryDetails', deliveryDetails, DELIVERY_DATA_TTL);
    } else {
      removeEncryptedItem('pos_deliveryDetails');
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
  }, [customerSearchTerm, isCustomerLookupOpen, triggerCustomerSearch, user, companyContext]);
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
  }, [getDefaultModifierConfig, formatCurrency]);
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
    setHasStartedOrder(true);
  }, [areModifiersEqual]);
  const addMultiPaymentRow = useCallback(() => {
    const firstMethod = paymentMethods.find(m => m.allowsPartialPayment !== false)?.code || paymentMethods[0]?.code || 'cash';
    setMultiPayments((prev) => [...prev, { id: generateClientId(), method: firstMethod, amount: '0' }]);
  }, [paymentMethods]);
  const updateMultiPaymentRow = useCallback((id: string, patch: Partial<{ method: string; amount: string }>) => {
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

  const handleQuantitySubmit = (itemId: string) => {
    const qty = parseInt(editingQuantityValue);
    if (!isNaN(qty) && qty > 0) {
      updateQuantity(itemId, qty);
    } else if (qty === 0) {
      removeFromCart(itemId);
    }
    setEditingQuantityItemId(null);
    setEditingQuantityValue('');
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
  const clearCart = useCallback(() => {
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
      removeEncryptedItem('pos_customerInfo');
    }
    toast.success('Cart cleared');
  }, []);

  
  const resetFilters = () => {
    setSelectedCategory('all');
    setSearchQuery('');
    toast.success('Filters reset');
  };
  const handleResetOrder = useCallback(() => {
    clearCart();
    resetFilters();
    setSelectedTable('');
    setRoomServiceBookingId('');
    toast.success('Order and filters cleared');
  }, [clearCart, resetFilters, setSelectedTable, setRoomServiceBookingId]);

  const handleOrderTypeChange = useCallback(
    (type: OrderType) => {
      setOrderType(type);
      if (type === 'dine-in') {
        setHasStartedOrder(Boolean(selectedTable));
      } else if (type === 'room-booking') {
        setHasStartedOrder(Boolean(selectedRoomId));
      } else {
        setHasStartedOrder(false);
      }
    },
    [selectedTable, selectedRoomId]
  );
  const [occupiedTableModal, setOccupiedTableModal] = useState<{ tableId: string; orderDetails: any } | null>(null);
  // Context menu state for table quick actions
  const [contextMenu, setContextMenu] = useState<{ tableId: string; x: number; y: number } | null>(null);
  const [notifiedTables, setNotifiedTables] = useState<Set<string>>(new Set()); // Track tables we've already notified
  const [updateTableStatus] = useUpdateTableStatusMutation();
  // Show notification for tables paid > 15 minutes using Socket.IO events
  // Instead of polling with setInterval, we listen for payment events and set timeouts
  useEffect(() => {
    if (!socket || !isConnected) return;
    // Store active timeouts to clean them up
    const activeTimeouts = new Map<string, NodeJS.Timeout>();
    const showReleaseNotification = (tableId: string, tableNumber: string) => {
      if (notifiedTables.has(tableId)) return; // Already notified
      toast(
        (t) => (
          <div className="flex items-center gap-3">
            <div className="flex-1">
              <p className="font-semibold text-sm">Table {tableNumber} - Ready to Release</p>
              <p className="text-xs text-gray-600 dark:text-gray-400">
                Payment received 15 minutes ago
              </p>
            </div>
            <button
              onClick={async () => {
                try {
                  await updateTableStatus({
                    id: tableId,
                    status: 'available'
                  }).unwrap();
                  toast.dismiss(t.id);
                  toast.success('Table released successfully');
                  setNotifiedTables(prev => {
                    const newSet = new Set(prev);
                    newSet.delete(tableId);
                    return newSet;
                  });
                  // Clear timeout if exists
                  const timeout = activeTimeouts.get(tableId);
                  if (timeout) {
                    clearTimeout(timeout);
                    activeTimeouts.delete(tableId);
                  }
                  refetchTables();
                } catch (error: any) {
                  toast.error(error?.data?.message || 'Failed to release table');
                }
              }}
              className="px-3 py-1.5 bg-green-600 hover:bg-green-500 text-white text-xs font-medium rounded-lg transition-colors"
            >
              Release
            </button>
          </div>
        ),
        {
          duration: 10000, // Show for 10 seconds
          icon: '🔔',
        }
      );
      setNotifiedTables(prev => new Set(prev).add(tableId));
    };
    // Listen for payment received events
    const handlePaymentReceived = (data: any) => {
      const order = data.order || data;
      const tableId = order.tableId?.toString() || order.tableId;
      if (!tableId) return;
      // Find table number from current tables data
      const table = tables?.find((t: any) => t.id === tableId);
      if (!table) return;
      // Clear any existing timeout for this table
      const existingTimeout = activeTimeouts.get(tableId);
      if (existingTimeout) {
        clearTimeout(existingTimeout);
      }
      // Set timeout to show notification after 15 minutes
      const timeout = setTimeout(() => {
        showReleaseNotification(tableId, table.number || table.tableNumber || 'Unknown');
        activeTimeouts.delete(tableId);
      }, 15 * 60 * 1000); // 15 minutes
      activeTimeouts.set(tableId, timeout);
      };
    // Also check existing paid tables on mount (one-time check for tables already paid)
    const checkExistingPaidTables = () => {
      if (!tables || tables.length === 0) return;
      const now = new Date();
      const fifteenMinutesAgo = new Date(now.getTime() - 15 * 60 * 1000);
      tables.forEach((table: any) => {
        if (table.status !== 'occupied' || !table.orderDetails) return;
        const orderStatus = table.orderDetails.orderStatus 
          || table.orderDetails.status 
          || table.orderDetails.allOrders?.[0]?.status 
          || 'pending';
        if (orderStatus === 'paid') {
          const paymentTime = table.orderDetails.completedAt 
            || table.orderDetails.allOrders?.[0]?.completedAt
            || table.orderDetails.paidAt;
          if (paymentTime) {
            const paidAt = new Date(paymentTime);
            const timeSincePayment = now.getTime() - paidAt.getTime();
            if (paidAt < fifteenMinutesAgo && !notifiedTables.has(table.id)) {
              // Already past 15 minutes, show immediately
              showReleaseNotification(table.id, table.number || table.tableNumber || 'Unknown');
            } else if (timeSincePayment > 0 && timeSincePayment < 15 * 60 * 1000) {
              // Paid less than 15 minutes ago, schedule notification
              const remainingTime = 15 * 60 * 1000 - timeSincePayment;
              const timeout = setTimeout(() => {
                showReleaseNotification(table.id, table.number || table.tableNumber || 'Unknown');
                activeTimeouts.delete(table.id);
              }, remainingTime);
              activeTimeouts.set(table.id, timeout);
            }
          }
        }
      });
    };
    // Listen to Socket.IO events
    socket.on('order:payment-received', handlePaymentReceived);
    socket.on('table:payment-received', handlePaymentReceived);
    socket.on('order:status-changed', (data: any) => {
      // If order status changed to 'paid', treat it as payment received
      if (data.status === 'paid' && data.order) {
        handlePaymentReceived(data.order);
      }
    });
    // Check existing paid tables on mount
    checkExistingPaidTables();
    // Cleanup
    return () => {
      socket.off('order:payment-received', handlePaymentReceived);
      socket.off('table:payment-received', handlePaymentReceived);
      socket.off('order:status-changed', handlePaymentReceived);
      // Clear all active timeouts
      activeTimeouts.forEach(timeout => clearTimeout(timeout));
      activeTimeouts.clear();
    };
  }, [socket, isConnected, tables, notifiedTables, updateTableStatus, refetchTables]);
  // Close context menu when clicking outside
  useEffect(() => {
    const handleClickOutside = () => setContextMenu(null);
    if (contextMenu) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [contextMenu]);
  const handleTableSelection = useCallback(
    (tableId: string) => {
      if (!tableId) {
        setSelectedTable('');
        setHasStartedOrder(false);
        return;
      }
      const table = tables.find((entry: any) => entry.id === tableId);
      // If table has an order (pending or paid), show modal with options
      if (table?.orderDetails) {
        setOccupiedTableModal({ tableId, orderDetails: table.orderDetails });
        return;
      }
      // If table is reserved, show reservation check-in modal
      if (table?.status === 'reserved') {
        setReservedTableModal({ tableId, reservation: table });
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
      // Fetch order using RTK Query - this ensures tokens are handled correctly
      const orderData = await dispatch(posApi.endpoints.getPOSOrder.initiate(orderId)).unwrap();
      const order = (orderData as any).data || orderData;
      
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
      setIsCartSidebarCollapsed(false);
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
      setIsCartSidebarCollapsed(false);
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

  const handleCheckInReservation = useCallback(() => {
    if (!reservedTableModal) return;
    const { tableId, reservation } = reservedTableModal;
    
    // Set customer from reservation
    if (reservation.reservedBy) {
      setCustomerInfo({
        name: reservation.reservedBy.name || '',
        phone: reservation.reservedBy.phone || '',
        email: reservation.reservedBy.email || '',
      });
      if (reservation.reservedBy.customerId) {
        setSelectedCustomerId(reservation.reservedBy.customerId);
      }
    }

    // Set guest count if available
    if (reservation.reservedBy?.partySize) {
      setGuestCount(reservation.reservedBy.partySize);
      if (typeof window !== 'undefined') {
        localStorage.setItem('pos_guestCount', reservation.reservedBy.partySize.toString());
      }
    }

    // Load pre-order items
    if (reservation.preOrderItems && Array.isArray(reservation.preOrderItems) && reservation.preOrderItems.length > 0) {
      // Clear existing cart if any
      setCart([]);
      
      const cartItems: CartItem[] = [];
      reservation.preOrderItems.forEach((item: any) => {
        const menuItem = menuItemsData?.find((mi: any) => mi.id === item.menuItemId);
        if (menuItem) {
          const cartItem = buildCartItemFromMenuItem(menuItem, {
            quantity: item.quantity || 1,
            // You can add more overrides here if you save modifiers in pre-orders
          });
          cartItems.push(cartItem);
        }
      });
      if (cartItems.length > 0) {
        setCart(cartItems);
        toast.success(`${cartItems.length} pre-ordered items loaded into cart`);
      }
    }

    setSelectedTable(tableId);
    setHasStartedOrder(true);
    setIsCartSidebarCollapsed(false);
    setReservedTableModal(null);
    toast.success('Reservation checked in successfully');
  }, [reservedTableModal, menuItemsData, buildCartItemFromMenuItem]);
  // Order functions
  const handleCreateOrder = useCallback(async () => {
    // In pay-first mode, orders cannot be created without payment
    if (paymentMode === 'pay-first') {
      toast.error('Pay-first mode is enabled. Please use "Checkout" to process payment before creating the order.');
      setIsPaymentModalOpen(true); // Open payment modal instead
      return;
    }
    const requiresTable = orderType === 'dine-in';
    const isDelivery = orderType === 'delivery';
    const isTakeaway = orderType === 'takeaway';
    const isRoomBooking = orderType === 'room-booking';
    const isRoomService = orderType === 'room-service';
    // For room bookings we only go through the dedicated booking flow
    if (isRoomBooking) {
      toast.error('For room bookings, please use the Room Booking flow instead of Create Order.');
      return;
    }
    // For room service pending charges we require a linked booking
    let roomServiceBookingIdToUse = roomServiceBookingId;
    if (isRoomService && !roomServiceBookingIdToUse && roomServiceBookings.length > 0) {
      roomServiceBookingIdToUse = roomServiceBookings[0].id;
      setRoomServiceBookingId(roomServiceBookingIdToUse);
    }
    if (isRoomService && !roomServiceBookingIdToUse) {
      toast.error('Please select a checked-in booking / room before creating a room service order.');
      return;
    }
    const roomServiceBookingForOrder = isRoomService
      ? roomServiceBookings.find((b) => b.id === roomServiceBookingIdToUse) || roomServiceBookings[0]
      : null;
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
            `Discount applied: ${discountType === 'percent' ? `${discountValue}%` : formatCurrency(Number(discountValue || '0'))} on full order`,
          );
        } else {
          noteSegments.push('Item-wise discounts applied.');
        }
      }
      const orderTypeForBackend: CreatePOSOrderRequest['orderType'] =
        isRoomService ? 'room_service' : (orderType as 'dine-in' | 'delivery' | 'takeaway');
      const orderData: CreatePOSOrderRequest = {
        orderType: orderTypeForBackend,
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
        ...(isRoomService && roomServiceBookingIdToUse
          ? {
              bookingId: roomServiceBookingIdToUse,
              roomId: roomServiceBookingForOrder?.roomId,
              roomNumber: roomServiceBookingForOrder?.roomNumber,
            }
          : {}),
        subtotal: orderSummary.subtotal,
        taxRate: taxRate,
        taxAmount: orderSummary.tax,
        serviceChargeRate: serviceChargeRate,
        serviceChargeAmount: (orderSummary as any).serviceChargeAmount || 0,
        totalAmount: Number(orderSummary.total.toFixed(2)),
        items: cart.map((item) => ({
          menuItemId: item.menuItemId,
          quantity: item.quantity,
          price: item.price,
          notes: buildItemNotes(item),
        })),
        customerInfo: customerInfo,
        status: 'pending' as const,
        notes: noteSegments.length > 0 ? noteSegments.join('\n') : undefined,
        ...(selectedCustomerId && loyaltyRedemption.pointsRedeemed > 0
          ? {
              customerId: selectedCustomerId,
              loyaltyPointsRedeemed: loyaltyRedemption.pointsRedeemed,
              loyaltyDiscount: loyaltyRedemption.discount,
            }
          : selectedCustomerId
          ? { customerId: selectedCustomerId }
          : {}),
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
        removeEncryptedItem('pos_customerInfo');
      }
      setCustomerInfo({ name: '', phone: '', email: '' });
      setHasStartedOrder(false);

    } catch (error: any) {
      toast.error(error?.data?.message || 'Failed to create order');
    }
  }, [
    orderType,
    selectedTable,
    takeawayDetails,
    cart,
    customerInfo,
    orderSummary.total,
    orderSummary.discount,
    orderSummary.tax,
    orderSummary.subtotal,
    orderSummary.deliveryFee,
    createOrderWithRetry,
    resetDeliveryDetails,
    resetTakeawayDetails,
    orderNotes,
    selectedWaiterName,
    deliveryFeeValue,
    discountMode,
    discountValue,
    loyaltyRedemption,
    selectedCustomerId,
    refetchQueue,
    refetchTables,
    clearCart,
    buildItemNotes,
    deliveryDetails,
    discountType,
    formatCurrency,
    guestCount,
    paymentMode,
    roomServiceBookingId,
    roomServiceBookings,
  ]);
  const handlePayment = async () => {
    const requiresTable = orderType === 'dine-in';
    const isDelivery = orderType === 'delivery';
    const isTakeaway = orderType === 'takeaway';
    const isRoomBooking = orderType === 'room-booking';
    const isRoomService = orderType === 'room-service';
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
      // Takeaway details are completely optional
    }
    if (isRoomBooking) {
      if (!selectedRoomId) {
        toast.error('Please select a room for booking');
        return;
      }
      if (!checkInDate || !checkOutDate) {
        toast.error('Please select check-in and check-out dates');
        return;
      }
      if (new Date(checkOutDate) <= new Date(checkInDate)) {
        toast.error('Check-out date must be after check-in date');
        return;
      }
      if (numberOfGuests < 1) {
        toast.error('Number of guests must be at least 1');
        return;
      }
      if (!customerInfo.name || !customerInfo.name.trim()) {
        toast.error('Please enter guest name');
        return;
      }
      if (!customerInfo.phone || !customerInfo.phone.trim()) {
        toast.error('Please enter phone number');
        return;
      }
    }
    if (!isRoomBooking && cart.length === 0) {
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
      let paymentMethodForBackend: string = 'cash';
      let transactionReference: string | undefined;
      let changeDue = 0;
      let paymentBreakdown: Array<{ method: string; amount: number }> = [];
      // For room service in pay-later mode, we don't take payment now.
      const skipFullPaymentValidation = isRoomService && paymentMode === 'pay-later';
      if (paymentTab === 'full' && !skipFullPaymentValidation) {
        const received = parseFloat(fullPaymentReceived || '0');
        if (!Number.isFinite(received) || received <= 0) {
          toast.error('Enter the amount received before completing payment');
          return;
        }
        const selectedMethod = paymentMethods.find(m => m.code === fullPaymentMethod);
        const allowsChange = selectedMethod?.allowsChangeDue ?? (fullPaymentMethod === 'cash');
        if (allowsChange && received + 0.009 < totalDue) {
          toast.error('Received amount is less than the total due');
          return;
        }
        paymentMethodForBackend = fullPaymentMethod as any; // Pass the actual method code (bkash, nagad, cash, card, etc.)
        paymentBreakdown = [{ method: fullPaymentMethod, amount: totalDue }];
        const methodName = selectedMethod?.displayName || selectedMethod?.name || fullPaymentMethod;
        const amountReceivedForBackend = received;
        if (allowsChange) {
          changeDue = Math.max(0, received - totalDue);
          paymentNotes.push(
            `${methodName} payment received ${formatCurrency(received)} • Change ${formatCurrency(changeDue)}`
          );
          transactionReference = `${fullPaymentMethod}:${received.toFixed(2)}|change:${changeDue.toFixed(2)}`;
        } else {
          paymentNotes.push(`${methodName} payment processed for ${formatCurrency(totalDue)}`);
        }
      } else if (!skipFullPaymentValidation) {
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
        
        const totalReceived = activeRows.reduce((sum, row) => sum + (parseFloat(row.amount || '0') || 0), 0);
        const amountReceivedForBackend = totalReceived;
        
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
      // Handle room booking separately
      if (isRoomBooking) {
        const selectedRoom = rooms.find((r: any) => r.id === selectedRoomId);
        if (!selectedRoom) {
          toast.error('Selected room not found');
          return;
        }
        const checkIn = new Date(checkInDate);
        const checkOut = new Date(checkOutDate);
        const nights = Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24));
        const roomRate = selectedRoom.basePrice || 0;
        const totalRoomCharges = roomRate * nights;
        // Calculate booking total (room charges + tax/service if applicable)
        const bookingTotal = totalRoomCharges; // You can add tax/service charge here if needed
        // Calculate actual payment received
        let actualDepositAmount = 0;
        if (paymentMode === 'pay-first') {
          if (paymentTab === 'full') {
            // For full payment, use the amount received (may be partial)
            const received = parseFloat(fullPaymentReceived || '0');
            actualDepositAmount = Number.isFinite(received) && received > 0 ? received : bookingTotal;
          } else {
            // For split payment, sum all payment rows
            const totalReceived = multiPayments.reduce(
              (sum, row) => sum + (parseFloat(row.amount || '0') || 0),
              0
            );
            actualDepositAmount = totalReceived > 0 ? totalReceived : bookingTotal;
          }
        } else {
          // Pay-later mode: no deposit
          actualDepositAmount = 0;
        }
        // Determine payment status
        let paymentStatus: 'paid' | 'partial' | 'pending' = 'pending';
        if (paymentMode === 'pay-first') {
          if (actualDepositAmount >= bookingTotal) {
            paymentStatus = 'paid';
          } else if (actualDepositAmount > 0) {
            paymentStatus = 'partial';
          } else {
            paymentStatus = 'pending';
          }
        }
        try {
          const bookingData = {
            branchId: currentBranchId,
            roomId: selectedRoomId,
            guestId: selectedCustomerId || undefined,
            guestName: customerInfo.name || 'Guest',
            guestEmail: customerInfo.email || undefined,
            guestPhone: customerInfo.phone || '',
            numberOfGuests: numberOfGuests,
            checkInDate: checkInDate,
            checkOutDate: checkOutDate,
            roomRate: roomRate,
            paymentStatus: paymentStatus,
            paymentMethod: paymentTab === 'full' ? fullPaymentMethod : 'split',
            depositAmount: actualDepositAmount > 0 ? actualDepositAmount : undefined,
            specialRequests: specialRequests || undefined,
            notes: noteSegments.length > 0 ? noteSegments.join('\n') : undefined,
          };
          const bookingResponse = await createBooking(bookingData).unwrap();
          const booking = (bookingResponse as any).data || bookingResponse;
          const bookingId = booking.id || booking._id;
          const bookingNumber = booking.bookingNumber || booking.booking_number || bookingId;
          setCurrentOrderId(bookingId);
          setPaymentSuccessOrder({
            orderId: bookingId,
            orderNumber: bookingNumber,
            totalPaid: actualDepositAmount,
            changeDue: changeDue > 0 ? changeDue : undefined,
            summary: `Room Booking: ${selectedRoom.roomNumber} | ${nights} night(s) | ${paymentNotes.join(' | ')}`,
            breakdown: paymentBreakdown,
          });
          if (paymentStatus === 'paid') {
            toast.success('Room booking created and fully paid');
          } else if (paymentStatus === 'partial') {
            toast.success(`Room booking created with partial payment of ${formatCurrency(actualDepositAmount)}`);
          } else {
            toast.success('Room booking created (payment pending)');
          }
          // Reset form
          setSelectedRoomId('');
          setCheckInDate(new Date().toISOString().split('T')[0]);
          const tomorrow = new Date();
          tomorrow.setDate(tomorrow.getDate() + 1);
          setCheckOutDate(tomorrow.toISOString().split('T')[0]);
          setNumberOfGuests(1);
          setSpecialRequests('');
          setCustomerInfo({ name: '', phone: '', email: '' });
          setHasStartedOrder(false);
          setIsPaymentModalOpen(false);
    
          return;
        } catch (error: any) {
          toast.error(error?.data?.message || 'Failed to create booking');
          return;
        }
      }
      // At this point, isRoomBooking is false (we returned early if true)
      if (isRoomBooking) {
        return;
      }
      // Determine the actual payment method to store in order
      // For full payment, use the actual method code (bkash, nagad, etc.)
      // For split payment, use the primary method or 'split' with breakdown
      const actualPaymentMethod = paymentTab === 'full' 
        ? fullPaymentMethod  // Store actual method code (bkash, nagad, cash, etc.)
        : paymentMethodForBackend; // For split, keep as 'split'
      const orderTypeForBackend: CreatePOSOrderRequest['orderType'] =
        isRoomService ? 'room_service' : (orderType as 'dine-in' | 'delivery' | 'takeaway');
      const orderData: CreatePOSOrderRequest = {
        orderType: orderTypeForBackend,
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
        ...(isRoomService && roomServiceBookingId && selectedRoomServiceBooking
          ? {
              bookingId: roomServiceBookingId,
              roomId: selectedRoomServiceBooking.roomId,
              roomNumber: selectedRoomServiceBooking.roomNumber,
            }
          : {}),
        items: cart.map((item) => ({
          menuItemId: item.menuItemId,
          quantity: item.quantity,
          price: item.price,
          notes: buildItemNotes(item),
        })),
        subtotal: orderSummary.subtotal,
        taxRate: taxRate,
        taxAmount: orderSummary.tax,
        serviceChargeRate: serviceChargeRate,
        serviceChargeAmount: (orderSummary as any).serviceChargeAmount || 0,
        totalAmount: orderSummary.total,
        customerInfo: customerInfo,
        // In "pay-first" mode, create order as 'paid' (payment happens before order creation)
        // In "pay-later" mode, create order as 'pending' then process payment (except room service)
        status: paymentMode === 'pay-first' ? 'paid' as const : 'pending' as const,
        paymentMethod: actualPaymentMethod, // Store actual method code (bkash, nagad, etc.)
        transactionId: transactionReference, // Passed to backend for split payment breakdown parsing
        notes: noteSegments.length > 0 ? noteSegments.join('\n') : undefined,
        ...(selectedWaiterId ? { waiterId: selectedWaiterId } : {}),
        ...(selectedCustomerId && loyaltyRedemption.pointsRedeemed > 0
          ? {
              customerId: selectedCustomerId,
              loyaltyPointsRedeemed: loyaltyRedemption.pointsRedeemed,
              loyaltyDiscount: loyaltyRedemption.discount,
            }
          : selectedCustomerId
          ? { customerId: selectedCustomerId }
          : {}),
        amountReceived: paymentTab === 'full' ? parseFloat(fullPaymentReceived || '0') : multiPayments.reduce((sum, row) => sum + (parseFloat(row.amount || '0') || 0), 0),
        changeDue: changeDue > 0 ? changeDue : undefined,
      };
      const orderResponse = await createOrderWithRetry(orderData);
      const order = (orderResponse as any).data || orderResponse;
      const orderId = order.id || order._id;
      const orderNumber = order.orderNumber || order.order_number || orderId;
      // Only process payment separately if order was created as 'pending' (pay-later mode)
      // In pay-first mode, order is already created as 'paid', so we don't need to process payment again.
      // For room service in pay-later mode, we intentionally do NOT process payment here so that
      // charges remain pending on the booking and are settled at hotel checkout.
      if (paymentMode === 'pay-later' && !isRoomService) {
        await processPayment({
          orderId,
          amount: totalDue,
          method: paymentTab === 'full' ? fullPaymentMethod : paymentMethodForBackend,
          transactionId: transactionReference,
          amountReceived: paymentTab === 'full' ? parseFloat(fullPaymentReceived || '0') : multiPayments.reduce((sum, row) => sum + (parseFloat(row.amount || '0') || 0), 0),
          changeDue: changeDue > 0 ? changeDue : undefined,
        }).unwrap();
      }
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
      // Invalidate cache and refetch tables to update status after payment
      dispatch(posApi.util.invalidateTags(['Table', 'POS']));
      // Use a longer delay to ensure backend has fully processed the payment,
      // updated order status, and cleared table associations if needed
      // Increased from 300ms to 1000ms to avoid race conditions
      setTimeout(() => {
        refetchTables(); // Refetch tables to update status after payment
      }, 1000);
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
        removeEncryptedItem('pos_customerInfo');
      }
      setCustomerInfo({ name: '', phone: '', email: '' });
      setHasStartedOrder(false);
      setIsPaymentModalOpen(false);

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

  const handleOpenRefundModal = useCallback((orderId: string, total: number) => {
    setRefundOrderId(orderId);
    setRefundAmount(total.toString());
    setRefundReason('');
    setRefundIsDamage(false);
    setIsRefundModalOpen(true);
  }, []);

  const handleRefundSubmit = async () => {
    if (!refundOrderId || !refundAmount || Number(refundAmount) <= 0) {
      toast.error('Please enter a valid refund amount');
      return;
    }
    if (!refundReason.trim()) {
      toast.error('Please enter a refund reason');
      return;
    }

    try {
      await refundOrder({
        orderId: refundOrderId,
        amount: Number(refundAmount),
        reason: refundReason,
        isDamage: refundIsDamage,
      }).unwrap();

      toast.success('Refund processed successfully');
      setIsRefundModalOpen(false);
      refetchQueue();
      if (queueDetailId === refundOrderId) {
        setQueueDetailId(null);
      }
    } catch (error: any) {
      toast.error(error?.data?.message || 'Failed to process refund');
    }
  };
  const getTableStatus = (table: any) => {
    if (table.status === 'reserved') return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-200 border-2 border-yellow-500/50';
    if (table.status === 'available') return 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-200 border-2 border-green-500/50';
    // For occupied tables, check order status for visual indicators
    if (table.status === 'occupied' && table.orderDetails) {
      const orderStatus = table.orderDetails.orderStatus 
        || table.orderDetails.status 
        || table.orderDetails.allOrders?.[0]?.status 
        || 'pending';
      if (orderStatus === 'paid') {
        // In pay-first mode: Paid orders mean customer is still using table (orange/yellow)
        // In pay-later mode: Paid orders mean table is ready to release (green)
        return paymentMode === 'pay-first'
          ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200 border-2 border-amber-500/50'
          : 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-200 border-2 border-green-500/50';
      } else if (orderStatus === 'pending') {
        // Yellow badge: Pending Payment
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-200 border-2 border-yellow-500/50';
      } else {
        // Red badge: Needs Attention (cancelled or other status)
        return 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200 border-2 border-red-500/50';
      }
    }
    // Default for occupied without order details
    return 'bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-200 border-2 border-orange-500/50';
  };
  const getTableStatusText = (table: any) => {
    if (table.status === 'reserved') return 'Reserved';
    if (table.status === 'available') return 'Available';
    // For occupied tables, show payment status
    if (table.status === 'occupied' && table.orderDetails) {
      const orderStatus = table.orderDetails.orderStatus 
        || table.orderDetails.status 
        || table.orderDetails.allOrders?.[0]?.status 
        || 'pending';
      if (orderStatus === 'paid') {
        // In pay-first mode, paid orders mean customer is still using the table
        // In pay-later mode, paid orders mean table is ready to release
        return paymentMode === 'pay-first' 
          ? 'Paid - In Use' 
          : 'Paid - Ready to Release';
      } else if (orderStatus === 'pending') {
        return 'Pending Payment';
      } else {
        return 'Needs Attention';
      }
    }
    return 'Occupied';
  };
  const isOrderingActive = useMemo(() => {
    if (orderType === 'dine-in') {
      return hasStartedOrder && Boolean(selectedTable);
    }
    // For room-booking and room-service, show the ordering workspace immediately
    // (no gateway screen). Checkout is still blocked until required fields are valid.
    if (orderType === 'room-booking' || orderType === 'room-service') {
      return true;
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
  const renderPreOrderView = () => {
    if (orderType === 'dine-in') {
      return (
        <div className="flex-1 overflow-y-auto px-3 sm:px-4 md:px-6 py-4 sm:py-6 md:py-10 min-h-0">
          <div className="mx-auto max-w-5xl space-y-4 sm:space-y-6 md:space-y-8">
            <div className="text-center space-y-2">
              <h2 className="text-lg sm:text-xl md:text-2xl font-semibold text-gray-900 dark:text-slate-100">Select a table to start a dine-in order</h2>
              <p className="text-sm sm:text-base text-gray-600 dark:text-slate-400">Tap an available table below to launch the ordering workspace.</p>
            </div>
            <div className="grid gap-3 sm:gap-4 grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {tablesLoading ? (
                [...Array(8)].map((_, index) => (
                  <div key={index} className="h-40 rounded-2xl border border-gray-200 dark:border-slate-800 bg-gray-100 dark:bg-slate-900/40 animate-pulse" />
                ))
              ) : tables.length > 0 ? (
                tables.map((table: any) => {
                  const statusClass = getTableStatus(table);
                  const isSelected = selectedTable === table.id;
                  const hasOrderDetails = table.orderDetails !== null && table.orderDetails !== undefined;
                  const orderStatus = table.orderDetails?.orderStatus 
                    || table.orderDetails?.status 
                    || table.orderDetails?.allOrders?.[0]?.status 
                    || 'pending';
                  const isPaid = orderStatus === 'paid' && table.status === 'occupied';
                  const handleContextMenu = (e: React.MouseEvent) => {
                    e.preventDefault();
                    if (isPaid) {
                      setContextMenu({ tableId: table.id, x: e.clientX, y: e.clientY });
                    }
                  };
                  const handleTouchStart = (e: React.TouchEvent) => {
                    if (!isPaid) return;
                    const touch = e.touches[0];
                    const timer = setTimeout(() => {
                      setContextMenu({ tableId: table.id, x: touch.clientX, y: touch.clientY });
                    }, 500);
                    const handleTouchEnd = () => {
                      clearTimeout(timer);
                      document.removeEventListener('touchend', handleTouchEnd);
                    };
                    document.addEventListener('touchend', handleTouchEnd, { once: true });
                  };
                  return (
                    <div key={table.id} className="relative">
                      <button
                        onClick={() => {
                          if (contextMenu?.tableId !== table.id) {
                            handleTableSelection(table.id);
                          }
                        }}
                        onContextMenu={handleContextMenu}
                        onTouchStart={handleTouchStart}
                        className={`rounded-2xl border-2 p-6 text-left transition-all w-full h-full flex flex-col justify-between ${
                          isSelected
                            ? 'border-sky-500 bg-sky-500/10 shadow-lg shadow-sky-500/20'
                            : hasOrderDetails || table.status === 'occupied'
                            ? 'border-orange-500/50 bg-orange-500/5 hover:border-orange-400/60'
                            : 'border-gray-300 dark:border-slate-900 bg-white dark:bg-slate-950/60 hover:border-sky-600/60 hover:shadow-lg hover:shadow-sky-900/20'
                        }`}
                      >
                      <div className="space-y-4">
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="text-xs uppercase tracking-[0.3em] text-gray-500 dark:text-slate-500">Table No.</p>
                            <p className="text-xl font-semibold text-gray-900 dark:text-slate-100 truncate">
                              {table.number || table.tableNumber || table.name || table.id}
                            </p>
                          </div>
                          {table.location && (
                            <Badge variant="secondary" className="text-xs bg-slate-800 text-slate-300">
                              {table.location}
                            </Badge>
                          )}
                        </div>
                        <Badge className={`${statusClass} border border-white/10`}>
                          {getTableStatusText(table)}
                        </Badge>
                        {/* Always show capacity */}
                        <div className="flex items-center justify-between text-xs pt-1">
                          <span className="text-slate-400">Capacity:</span>
                          <span className="font-semibold text-slate-300">{table.capacity || 0} seats</span>
                        </div>
                        {hasOrderDetails ? (
                          <div className="space-y-2 text-xs pt-2 border-t border-slate-800">
                            {/* Order Status - Only show for pending orders (paid orders don't show orderDetails) */}
                            {table.orderDetails.orderStatus && table.orderDetails.orderStatus === 'pending' && (
                              <div className="flex items-center justify-between">
                                <span className="text-slate-400">Order Status:</span>
                                <Badge className="bg-amber-500/10 text-amber-600 dark:text-amber-200 border border-amber-500/30 text-xs">
                                  Pending Payment
                                </Badge>
                              </div>
                            )}
                            {/* Token/Order Number */}
                            <div className="flex items-center justify-between text-slate-300">
                              <span className="text-slate-400">Token:</span>
                              <span className="font-semibold">{table.orderDetails.tokenNumber || table.orderDetails.orderNumber}</span>
                            </div>
                            {/* Amount */}
                            <div className="flex items-center justify-between text-slate-300">
                              <span className="text-slate-400">Amount:</span>
                              <span className="font-semibold text-emerald-400">{formatCurrency(table.orderDetails.totalAmount || 0)}</span>
                            </div>
                            {/* Waiter - Always show if available */}
                            {table.orderDetails.waiterName && (
                              <div className="flex items-center justify-between text-slate-300">
                                <span className="text-slate-400">Waiter:</span>
                                <span className="font-semibold text-sky-300">{table.orderDetails.waiterName}</span>
                              </div>
                            )}
                            {/* Used Seats */}
                            {table.orderDetails.usedSeats !== undefined && (
                              <div className="flex items-center justify-between text-slate-300">
                                <span className="text-slate-400">Used Seats:</span>
                                <span className="font-semibold">{table.orderDetails.usedSeats} / {table.capacity || 0}</span>
                              </div>
                            )}
                            {/* Remaining Seats - Show prominently */}
                            {table.orderDetails.remainingSeats !== undefined && (
                              <div className={`flex items-center justify-between mt-2 pt-2 border-t ${
                                table.orderDetails.remainingSeats > 0 
                                  ? 'border-sky-800' 
                                  : 'border-slate-800'
                              }`}>
                                <span className={`font-medium ${
                                  table.orderDetails.remainingSeats > 0 
                                    ? 'text-sky-400' 
                                    : 'text-slate-400'
                                }`}>
                                  {table.orderDetails.remainingSeats > 0 ? 'Available Seats:' : 'Fully Occupied'}
                                </span>
                                <span className={`font-bold ${
                                  table.orderDetails.remainingSeats > 0 
                                    ? 'text-sky-300' 
                                    : 'text-orange-300'
                                }`}>
                                  {table.orderDetails.remainingSeats > 0 ? `${table.orderDetails.remainingSeats} seats` : '—'}
                                </span>
                              </div>
                            )}
                            {/* Hold Count */}
                            {table.orderDetails.holdCount > 0 && (
                              <div className="flex items-center justify-between text-orange-300 mt-1">
                                <span className="text-xs">Held:</span>
                                <span className="font-semibold text-xs">{table.orderDetails.holdCount}x</span>
                              </div>
                            )}
                          </div>
                        ) : (
                          /* Show status for tables without order details */
                          <div className="pt-2 border-t border-slate-800">
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-slate-400">Status:</span>
                              <span className={`font-semibold ${
                                table.status === 'available' 
                                  ? 'text-green-400' 
                                  : table.status === 'reserved'
                                  ? 'text-yellow-400'
                                  : 'text-orange-400'
                              }`}>
                                {table.status === 'available' 
                                  ? 'Available' 
                                  : table.status === 'reserved'
                                  ? 'Reserved'
                                  : 'Occupied'}
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                    </button>
                    {contextMenu && contextMenu.tableId === table.id && (
                      <div
                        className="fixed z-50 min-w-[200px] rounded-lg border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-xl py-2"
                        style={{
                          left: `${contextMenu.x}px`,
                          top: `${contextMenu.y}px`,
                        }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        {isPaid && (
                          <button
                            onClick={async () => {
                              try {
                                await updateTableStatus({
                                  id: table.id,
                                  status: 'available'
                                }).unwrap();
                                toast.success('Table released successfully');
                                setContextMenu(null);
                                refetchTables();
                              } catch (error: any) {
                                toast.error(error?.data?.message || 'Failed to release table');
                              }
                            }}
                            className="w-full px-4 py-2 text-left text-sm text-green-600 dark:text-green-400 hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors flex items-center gap-2"
                          >
                            <span>✓</span>
                            <span>Release Table</span>
                          </button>
                        )}
                        <button
                          onClick={() => {
                            handleTableSelection(table.id);
                            setContextMenu(null);
                          }}
                          className="w-full px-4 py-2 text-left text-sm text-gray-900 dark:text-slate-200 hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors flex items-center gap-2"
                        >
                          <span>👁️</span>
                          <span>View Details</span>
                        </button>
                      </div>
                    )}
                  </div>
                  );
                })
              ) : (
                <div className="col-span-full rounded-2xl border border-gray-200 dark:border-slate-900 bg-gray-50 dark:bg-slate-950/60 p-10 text-center">
                  <p className="text-gray-700 dark:text-slate-300 font-medium">No tables configured for this branch yet.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      );
    }
    // For room-booking and room-service, show the main ordering workspace directly
    // (no delivery/takeaway pre-order card). The UI for these modes already lives
    // inside renderOrderingWorkspace.
    if (orderType === 'room-booking' || orderType === 'room-service') {
      return null;
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
          className="w-full max-w-sm rounded-3xl border-2 border-sky-500/40 bg-gray-50 dark:bg-slate-950/60 p-10 text-center transition hover:border-sky-400 hover:bg-gray-100 dark:hover:bg-slate-900/70 shadow-xl shadow-sky-950/20 space-y-6"
        >
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-sky-500/15 text-sky-600 dark:text-sky-200">
            <IconComponent className="h-8 w-8" />
          </div>
          <div className="space-y-2">
            <p className="text-lg font-semibold text-gray-900 dark:text-slate-100">{label}</p>
            <p className="text-sm text-gray-600 dark:text-slate-400">{helper}</p>
          </div>
        </button>
      </div>
    );
  };
  const renderOrderingWorkspace = () => (
    <div className="flex-1 flex flex-col overflow-hidden min-h-0">
      {/* Mobile/Tablet Lockdown Banner */}
      <div className="lg:hidden fixed inset-0 z-[100] bg-slate-950 flex flex-col items-center justify-center p-8 text-center space-y-6">
        <div className="w-20 h-20 bg-rose-500/20 rounded-full flex items-center justify-center">
          <ComputerDesktopIcon className="h-10 w-10 text-rose-500" />
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-black text-white uppercase tracking-tight">Desktop Only Terminal</h2>
          <p className="text-slate-400 text-sm max-w-xs mx-auto leading-relaxed">
            This POS interface is optimized for high-speed desktop use only. Please access this terminal from a PC to process orders.
          </p>
        </div>
        <Button 
          variant="secondary" 
          onClick={() => window.location.href = '/dashboard'}
          className="bg-slate-900 border-slate-800 text-slate-300 hover:text-white"
        >
          Return to Dashboard
        </Button>
      </div>

      <div className="bg-white dark:bg-slate-950 border-b border-gray-200 dark:border-slate-800 px-4 py-2 z-20">
        <div className="flex items-center gap-3 overflow-x-auto no-scrollbar py-0.5">
          {/* Search Section */}
          <div className="flex-[2] min-w-[240px] relative group">
            <MagnifyingGlassIcon className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-sky-500 transition-colors" />
            <Input
              placeholder='Try "Pizza", "Latte" or scan...'
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-10 bg-gray-50 dark:bg-slate-900 border-none rounded-xl text-xs font-bold placeholder:text-slate-500 focus:ring-2 focus:ring-sky-500/20 transition-all"
            />
          </div>

          {/* Category Section */}
          <div className="flex items-center gap-2 bg-gray-50 dark:bg-slate-900 rounded-xl px-3 h-10 border border-transparent hover:border-gray-200 dark:hover:border-slate-800 transition-all">
            <UserGroupIcon className="h-4 w-4 text-slate-500" />
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="bg-transparent text-[10px] font-black uppercase tracking-widest text-slate-600 dark:text-slate-300 focus:outline-none cursor-pointer"
            >
              <option value="all" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">All Items</option>
              {categories.map((cat: any) => (
                <option key={cat.id} value={cat.id} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">{cat.name}</option>
              ))}
            </select>
          </div>

          {/* Reset & Calc */}
          <div className="flex items-center gap-1.5 border-l border-gray-100 dark:border-slate-900 pl-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={resetFilters}
              disabled={selectedCategory === 'all' && !searchQuery}
              className="h-10 w-10 p-0 rounded-xl bg-gray-50 dark:bg-slate-900 hover:text-rose-500 disabled:opacity-30"
              title="Reset Filters"
            >
              <FunnelIcon className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsCalculatorOpen(true)}
              className="h-10 w-10 p-0 rounded-xl bg-gray-50 dark:bg-slate-900 hover:text-sky-500"
              title="Calculator (F5)"
            >
              <CurrencyDollarIcon className="h-4 w-4" />
            </Button>
          </div>

          <div className="flex-1" />

          {/* Mode Toggle & Checkout */}
          <div className="flex items-center gap-2 border-l border-gray-100 dark:border-slate-900 pl-3">
            <div className="flex items-center gap-2 bg-gray-50 dark:bg-slate-900 rounded-xl px-2 h-10 border border-transparent">
              <span className="text-[10px] font-black uppercase tracking-tighter text-slate-500 hidden xl:inline">
                {paymentMode === 'pay-first' ? 'Pay First' : 'Pay Later'}
              </span>
              <button
                onClick={() => setPaymentMode(p => p === 'pay-first' ? 'pay-later' : 'pay-first')}
                title={`Switch to ${paymentMode === 'pay-first' ? 'Pay Later (Order first, pay at end)' : 'Pay First (Pay now before order creation)'}`}
                className="relative inline-flex h-5 w-9 items-center rounded-full bg-slate-300 dark:bg-slate-800 transition-all active:scale-90"
              >
                <span className={cn("h-3.5 w-3.5 rounded-full bg-white transition-all", paymentMode === 'pay-first' ? "translate-x-5 shadow-[0_0_10px_rgba(56,189,248,0.5)]" : "translate-x-0.5")} />
              </button>
            </div>

            <Button
              variant="primary"
              onClick={() => setIsPaymentModalOpen(true)}
              disabled={checkoutBlocked || cart.length === 0}
              className="h-10 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-[10px] font-black uppercase tracking-widest gap-2 shadow-lg shadow-emerald-600/10 transition-all active:scale-95 border-none"
            >
              <CreditCardIcon className="h-4 w-4" />
              Checkout
            </Button>
          </div>
        </div>
      </div>
          <div className="flex-1 overflow-y-auto p-2 sm:p-3 md:p-4 min-h-0">
        {/* Room service booking summary */}
        {requiresRoomService && selectedRoomServiceBooking && (
          <div className="mb-4 rounded-2xl border border-emerald-500/40 bg-emerald-500/5 px-4 py-3 sm:px-5 sm:py-4 shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2 text-sm sm:text-base">
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-600/10 px-2.5 py-1 text-emerald-700 dark:text-emerald-200 text-xs sm:text-sm font-semibold">
                  <BuildingOfficeIcon className="h-4 w-4" />
                  Room Service for Room {selectedRoomServiceBooking.roomNumber || '—'}
                </span>
                <span className="text-gray-800 dark:text-slate-100 font-medium">
                  {selectedRoomServiceBooking.guestName}
                </span>
                <span className="text-xs text-gray-500 dark:text-slate-400">
                  #{selectedRoomServiceBooking.bookingNumber}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-3 text-xs sm:text-sm text-gray-600 dark:text-slate-300">
                <span>
                  Stay:{' '}
                  {new Date(selectedRoomServiceBooking.checkInDate).toLocaleDateString()}
                  {' → '}
                  {new Date(selectedRoomServiceBooking.checkOutDate).toLocaleDateString()}
                  {' '}
                  ({selectedRoomServiceBooking.numberOfNights || 1} night
                  {selectedRoomServiceBooking.numberOfNights === 1 ? '' : 's'})
                </span>
                <span className="hidden sm:inline">•</span>
                <span>
                  Current total:{' '}
                  <span className="font-semibold text-emerald-600 dark:text-emerald-300">
                    {formatCurrency(selectedRoomServiceBooking.totalAmount || 0)}
                  </span>
                </span>
                {selectedRoomServiceBooking.additionalCharges &&
                  selectedRoomServiceBooking.additionalCharges.length > 0 && (
                    <span>
                      Room service charges so far:{' '}
                      <span className="font-semibold">
                        {formatCurrency(
                          selectedRoomServiceBooking.additionalCharges.reduce(
                            (sum, charge) => sum + (charge.amount || 0),
                            0,
                          ),
                        )}
                      </span>
                    </span>
                  )}
              </div>
            </div>
            <div className="text-xs sm:text-sm text-gray-600 dark:text-slate-300">
              <div>Status:&nbsp;
                <span className="inline-flex items-center rounded-full bg-emerald-600/15 px-2 py-0.5 text-emerald-700 dark:text-emerald-200 text-[11px] sm:text-xs font-semibold capitalize">
                  {selectedRoomServiceBooking.status.replace('_', ' ')}
                </span>
              </div>
              <div className="mt-1">
                Payment:&nbsp;
                <span className="capitalize">{selectedRoomServiceBooking.paymentStatus}</span>
              </div>
            </div>
          </div>
        )}
        {requiresRoomBooking ? (
          <div className="space-y-6">
            {/* Date Selection */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-slate-300">
                  Check-in Date
                </label>
                <Input
                  type="date"
                  value={checkInDate}
                  onChange={(e) => setCheckInDate(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                  className="w-full"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-slate-300">
                  Check-out Date
                </label>
                <Input
                  type="date"
                  value={checkOutDate}
                  onChange={(e) => setCheckOutDate(e.target.value)}
                  min={checkInDate || new Date().toISOString().split('T')[0]}
                  className="w-full"
                />
              </div>
            </div>
            {/* Number of Guests */}
            <div>
              <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-slate-300">
                Number of Guests
              </label>
              <Input
                type="number"
                value={numberOfGuests}
                onChange={(e) => setNumberOfGuests(Math.max(1, parseInt(e.target.value) || 1))}
                min="1"
                className="w-full max-w-xs"
              />
            </div>
            {/* Room Selection */}
            <div>
              <label className="block text-sm font-medium mb-3 text-gray-700 dark:text-slate-300">
                Select Room
              </label>
              {roomsLoading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {[...Array(6)].map((_, i) => (
                    <Card key={i} className="animate-pulse bg-gray-100 dark:bg-slate-900/40">
                      <CardContent className="p-4">
                        <div className="h-32 bg-gray-200 dark:bg-slate-800 rounded-lg mb-3"></div>
                        <div className="h-4 bg-gray-200 dark:bg-slate-800 rounded mb-2"></div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : rooms.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {rooms.map((room: any) => {
                    const isSelected = selectedRoomId === room.id;
                    const nights = checkInDate && checkOutDate 
                      ? Math.ceil((new Date(checkOutDate).getTime() - new Date(checkInDate).getTime()) / (1000 * 60 * 60 * 24))
                      : 1;
                    const totalPrice = (room.basePrice || 0) * nights;
                    return (
                      <Card
                        key={room.id}
                        className={`cursor-pointer transition-all ${
                          isSelected
                            ? 'border-2 border-sky-500 bg-sky-50 dark:bg-sky-900/20'
                            : 'border border-gray-200 dark:border-slate-800 hover:border-sky-300'
                        }`}
                        onClick={() => {
                          setSelectedRoomId(room.id);
                          setHasStartedOrder(true);
                        }}
                      >
                        <CardContent className="p-4">
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <h3 className="font-semibold text-lg text-gray-900 dark:text-slate-100">
                                Room {room.roomNumber}
                              </h3>
                              {isSelected && (
                                <Badge variant="success">Selected</Badge>
                              )}
                            </div>
                            <p className="text-sm text-gray-600 dark:text-slate-400 capitalize">
                              {room.roomType} • Max {room.maxOccupancy} guests
                            </p>
                            {room.floor && (
                              <p className="text-xs text-gray-500 dark:text-slate-500">
                                Floor {room.floor}
                              </p>
                            )}
                            <div className="pt-2 border-t border-gray-200 dark:border-slate-700">
                              <div className="flex items-center justify-between">
                                <span className="text-sm text-gray-600 dark:text-slate-400">
                                  {nights} night{nights !== 1 ? 's' : ''}
                                </span>
                                <span className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
                                  {formatCurrency(totalPrice)}
                                </span>
                              </div>
                              <p className="text-xs text-gray-500 dark:text-slate-500 mt-1">
                                {formatCurrency(room.basePrice)}/night
                              </p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-12 text-gray-600 dark:text-slate-400">
                  <p>No available rooms found</p>
                </div>
              )}
            </div>
            {/* Customer Information */}
            <div className="border-t border-gray-200 dark:border-slate-700 pt-6">
              <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-slate-100">
                Guest Information
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-slate-300">
                    Guest Name *
                  </label>
                  <Input
                    value={customerInfo.name}
                    onChange={(e) => setCustomerInfo({ ...customerInfo, name: e.target.value })}
                    placeholder="Enter guest name"
                    className="w-full"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-slate-300">
                    Phone Number *
                  </label>
                  <Input
                    value={customerInfo.phone}
                    onChange={(e) => setCustomerInfo({ ...customerInfo, phone: e.target.value })}
                    placeholder="Enter phone number"
                    className="w-full"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-slate-300">
                    Email Address
                  </label>
                  <Input
                    type="email"
                    value={customerInfo.email}
                    onChange={(e) => setCustomerInfo({ ...customerInfo, email: e.target.value })}
                    placeholder="Enter email (optional)"
                    className="w-full"
                  />
                </div>
              </div>
            </div>
            {/* Special Requests */}
            {selectedRoomId && (
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-slate-300">
                  Special Requests
                </label>
                <textarea
                  value={specialRequests}
                  onChange={(e) => setSpecialRequests(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-slate-700 rounded-md bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-100"
                  placeholder="Any special requests or notes..."
                />
              </div>
            )}
          </div>
        ) : menuItemsLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 gap-2 sm:gap-3 md:gap-4">
            {[...Array(8)].map((_, i) => (
              <Card key={i} className="animate-pulse bg-gray-100 dark:bg-slate-900/40 border border-gray-200 dark:border-slate-800">
                <CardContent className="p-4">
                  <div className="h-32 bg-gray-200 dark:bg-slate-800 rounded-lg mb-3"></div>
                  <div className="h-4 bg-gray-200 dark:bg-slate-800 rounded mb-2"></div>
                  <div className="h-4 bg-gray-200 dark:bg-slate-800 rounded w-2/3"></div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : filteredMenuItems.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 gap-2 sm:gap-3 md:gap-4">
            {filteredMenuItems.map((item) => (
              <Card
                key={item.id}
                className={cn(
                  'group relative overflow-hidden rounded-2xl sm:rounded-3xl border-gray-200/60 dark:border-slate-800/60 bg-white dark:bg-slate-900/60 transition-all duration-300 hover:shadow-2xl hover:shadow-sky-500/10 hover:-translate-y-1 cursor-pointer active:scale-95',
                  (item.isOutOfStock || item.isLowStock) && 'opacity-80'
                )}
                onClick={() => {
                  if (item.isOutOfStock || item.isLowStock) {
                    toast.error(item.isOutOfStock ? 'Item is out of stock' : 'Item is low on stock');
                    return;
                  }
                  addToCart(item);
                }}
              >
                <CardContent className="p-1 sm:p-1.5 space-y-0.5 sm:space-y-1">
                  <div className="relative aspect-square rounded-lg sm:rounded-xl bg-gray-100 dark:bg-slate-950/60 flex items-center justify-center border border-gray-200 dark:border-slate-800/80 overflow-hidden">
                    {item.image ? (
                      <Image
                        src={item.image}
                        alt={item.name}
                        width={240}
                        height={240}
                        className="h-full w-full rounded-xl object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <div className="text-4xl">🍽️</div>
                    )}
                    {/* Stock overlay in the middle of the image */}
                    {(item.isOutOfStock || item.isLowStock) && (
                      <div
                        className={cn(
                          'absolute inset-0 flex items-center justify-center backdrop-blur-[1px]',
                          item.isOutOfStock
                            ? 'bg-red-900/55'
                            : 'bg-amber-900/45',
                        )}
                      >
                        <div
                          className="px-3 py-1 rounded-full text-[10px] font-semibold uppercase tracking-wide border border-white/70 text-red-500 shadow-lg shadow-black/40 bg-white"
                        >
                          {item.isOutOfStock ? 'Out of stock' : 'Low stock'}
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="space-y-0.5 sm:space-y-1">
                    <div className="flex items-center justify-between gap-1 sm:gap-2">
                      <h3 className="font-bold text-xs sm:text-sm text-gray-900 dark:text-slate-100 truncate">
                        {item.name}
                      </h3>
                    </div>
                    {item.category?.name && (
                      <div className="flex">
                         <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 font-bold uppercase tracking-tighter">
                          {item.category.name}
                        </span>
                      </div>
                    )}
                    <p className="text-[10px] text-gray-600 dark:text-slate-500 line-clamp-2 min-h-[24px]">
                      {item.description || "Perfect for today's menu."}
                    </p>
                  </div>
                  <div className="flex items-center justify-between pt-1 gap-2">
                    <span className="text-sm sm:text-base font-black text-sky-500">
                      {formatCurrency(item.price)}
                    </span>
                    <Button
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (item.isOutOfStock) {
                          toast.error('This item is out of stock.');
                          return;
                        }
                        if (item.isLowStock) {
                          toast.error('This item is low on stock.');
                          return;
                        }
                        addToCart(item);
                      }}
                      disabled={item.isOutOfStock || item.isLowStock}
                      className="h-7 w-7 p-0 flex items-center justify-center rounded-lg bg-sky-600 hover:bg-sky-500 disabled:bg-gray-600 text-white shadow-lg shadow-sky-900/20"
                    >
                      <PlusIcon className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full min-h-[400px] text-center rounded-3xl border border-gray-200 dark:border-slate-800 bg-gray-50 dark:bg-slate-950/50 backdrop-blur-sm">
            <div className="text-6xl mb-4">🍽️</div>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-slate-100 mb-2">
              No menu items found
            </h3>
            <p className="text-gray-600 dark:text-slate-400 max-w-md">
              {searchQuery
                ? 'No results match your search. Try adjusting the keywords or filters.'
                : 'Menu items will show up here once they have been added for this branch.'}
            </p>
          </div>
        )}
      </div>
    </div>
  );

  const renderCartSidebar = () => {
    if (isCartSidebarCollapsed) {
      return (
        <aside className="hidden xl:flex xl:w-0 xl:overflow-hidden transition-all duration-300">
          {/* Empty aside to maintain layout structure if needed, or just return null */}
        </aside>
      );
    }
    return (
      <aside className={cn(
        "flex flex-col h-full bg-white dark:bg-slate-950/95 transition-all duration-300 ease-in-out overflow-hidden shadow-2xl z-40",
        "fixed inset-y-0 right-0 w-[90%] sm:w-[400px] xl:relative xl:w-[450px] xl:translate-x-0 border-l border-gray-200 dark:border-slate-800",
        isCartSidebarCollapsed ? "translate-x-full xl:hidden" : "translate-x-0"
      )}>
        {/* Add a close button for mobile when expanded */}
        <div className="xl:hidden absolute top-4 right-4 z-50">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setIsCartSidebarCollapsed(true)}
            className="h-8 w-8 rounded-full bg-slate-100 dark:bg-slate-800"
          >
            <ChevronRightIcon className="h-4 w-4" />
          </Button>
        </div>
        {/* Compact Header & Tab Navigation */}
        <div className="flex items-center gap-1 p-1.5 bg-white dark:bg-slate-950 border-b border-gray-200 dark:border-slate-800 z-10">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setIsCartSidebarCollapsed(true)}
            className="h-9 w-9 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 hidden xl:flex items-center justify-center flex-shrink-0"
            title="Collapse cart"
          >
            <ChevronRightIcon className="h-4 w-4 text-slate-400" />
          </Button>

          <div className="flex flex-1 gap-1 p-0.5 bg-gray-50 dark:bg-slate-900 rounded-lg border border-gray-100 dark:border-slate-800/50">
            {[
              { id: 'items', label: 'Items', icon: ShoppingBagIcon },
              { id: 'settings', label: 'Settings', icon: Cog6ToothIcon },
              { id: 'customer', label: 'Customer', icon: UserCircleIcon }
            ].map((tab) => {
              const isActive = cartActiveTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setCartActiveTab(tab.id as any)}
                  className={cn(
                    "flex-1 flex items-center justify-center gap-1.5 h-8 rounded-md text-[9px] font-black uppercase tracking-widest transition-all",
                    isActive 
                      ? "bg-white dark:bg-slate-800 text-sky-500 shadow-sm border border-gray-100 dark:border-slate-700" 
                      : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                  )}
                >
                  <tab.icon className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto min-h-0 custom-scrollbar p-3 sm:p-4 space-y-4 sm:space-y-6">
          {/* ITEMS TAB */}
          {cartActiveTab === 'items' && (
            <div className="space-y-4 sm:space-y-6 animate-in fade-in slide-in-from-top-2 duration-300">
              <div className="space-y-3 sm:space-y-4">
                <div className="flex items-center justify-between px-1">
                  <h3 className="text-[10px] sm:text-xs font-black text-gray-900 dark:text-white uppercase tracking-tight">Order Details</h3>
                  <Badge variant="success" className="text-[8px] sm:text-[9px] font-bold border-slate-200 dark:border-slate-800 uppercase px-1 sm:px-2">{cart.length} ITEMS</Badge>
                </div>
                <div className="space-y-2 sm:space-y-3">
                  {cart.length === 0 ? (
                    <div className="py-16 sm:py-24 flex flex-col items-center justify-center text-slate-500 border-2 border-dashed border-gray-200 dark:border-slate-800 rounded-[2rem] sm:rounded-[3rem] bg-gray-50/50 dark:bg-slate-900/20">
                      <ShoppingBagIcon className="h-12 w-12 sm:h-16 sm:w-16 mb-4 opacity-10" />
                      <p className="text-xs sm:text-sm font-black uppercase tracking-tight text-center">Your cart is empty</p>
                      <p className="text-[9px] sm:text-[10px] opacity-60 text-center">Add items from the menu to start</p>
                    </div>
                  ) : (
                    cart.map((item) => {
                      const itemDiscountAmount = discountMode === 'item' ? getItemDiscountAmount(item) : 0;
                      return (
                        <div key={item.id} className="group relative bg-white dark:bg-slate-900/40 border border-gray-200 dark:border-slate-800 rounded-xl p-3 transition-all hover:border-sky-500/50 hover:shadow-lg hover:shadow-sky-500/5 hover:-translate-y-0.5">
                          <div className="flex justify-between gap-4 mb-2">
                            <div className="flex-1 min-w-0">
                              <h4 className="text-sm font-bold text-gray-900 dark:text-white leading-tight mb-1 truncate">{item.name}</h4>
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-black text-sky-500">{formatCurrency(item.price)}</span>
                                {itemDiscountAmount > 0 && <Badge className="bg-emerald-500/10 text-emerald-500 border-none text-[9px] font-bold">SALE</Badge>}
                              </div>
                            </div>
                            <div className="flex items-center gap-1 bg-gray-100 dark:bg-slate-950 rounded-lg p-1 h-fit border border-gray-200 dark:border-slate-800">
                              <button onClick={() => updateQuantity(item.id, item.quantity - 1)} className="p-1 hover:bg-white dark:hover:bg-slate-800 rounded-md text-slate-400 hover:text-rose-500 transition-all">
                                <MinusIcon className="h-3.5 w-3.5" />
                              </button>
                              
                              {editingQuantityItemId === item.id ? (
                                <input
                                  type="number"
                                  min="0"
                                  autoFocus
                                  className="w-10 text-center text-xs font-black bg-white dark:bg-slate-800 border border-sky-500 rounded p-1 outline-none"
                                  value={editingQuantityValue}
                                  onChange={(e) => setEditingQuantityValue(e.target.value)}
                                  onBlur={() => handleQuantitySubmit(item.id)}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') handleQuantitySubmit(item.id);
                                    if (e.key === 'Escape') setEditingQuantityItemId(null);
                                  }}
                                />
                              ) : (
                                <span 
                                  className="text-xs font-black w-8 text-center cursor-pointer hover:text-sky-500 hover:bg-sky-50 dark:hover:bg-sky-500/10 rounded py-0.5 transition-colors"
                                  onClick={() => {
                                    setEditingQuantityItemId(item.id);
                                    setEditingQuantityValue(item.quantity.toString());
                                  }}
                                  title="Click to type quantity"
                                >
                                  {item.quantity}
                                </span>
                              )}

                              <button onClick={() => updateQuantity(item.id, item.quantity + 1)} className="p-1 hover:bg-white dark:hover:bg-slate-800 rounded-md text-slate-400 hover:text-emerald-500 transition-all">
                                <PlusIcon className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </div>
                          
                          {(item.modifiersNote || item.notes) && (
                            <div className="mb-2 p-2 bg-gray-50 dark:bg-slate-950/50 rounded-lg text-[10px] text-slate-500 dark:text-slate-400 italic border border-gray-200 dark:border-slate-900">
                              {item.modifiersNote && <div>{item.modifiersNote}</div>}
                              {item.notes && <div>{item.notes}</div>}
                            </div>
                          )}

                          <div className="flex items-center justify-between pt-2 border-t border-gray-100 dark:border-slate-800/50 mt-auto">
                            <div className="flex gap-2">
                              <button onClick={() => setNoteEditor({ itemId: item.id, value: item.notes || '' })} className="text-[10px] font-bold text-slate-500 bg-slate-100 hover:bg-sky-100 hover:text-sky-600 dark:bg-slate-800 dark:hover:bg-sky-900/50 px-2.5 py-1 rounded transition-colors uppercase tracking-wider">Note</button>
                              <button onClick={() => removeFromCart(item.id)} className="text-[10px] font-bold text-rose-500 bg-rose-50 hover:bg-rose-100 hover:text-rose-600 dark:bg-rose-500/10 dark:hover:bg-rose-500/20 px-2.5 py-1 rounded flex items-center gap-1 transition-colors uppercase tracking-wider"><TrashIcon className="w-3 h-3" /> Remove</button>
                            </div>
                            <span className="text-sm font-black text-gray-900 dark:text-white">{formatCurrency((item.price * item.quantity) - itemDiscountAmount)}</span>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Promotions */}
              <div className="rounded-2xl border border-gray-200 dark:border-slate-800 bg-emerald-50/30 dark:bg-emerald-500/5 p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <TagIcon className="h-4 w-4 text-emerald-500" />
                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Promotions</label>
                  </div>
                  <div className="flex bg-gray-200 dark:bg-slate-950 rounded-xl p-1 border border-gray-300 dark:border-slate-800">
                    <button onClick={() => setDiscountMode('full')} className={cn("px-3 py-1.5 text-[10px] font-bold rounded-lg transition-all", discountMode === 'full' ? "bg-sky-600 text-white shadow-md shadow-sky-900/30" : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300")}>Global</button>
                    <button onClick={() => setDiscountMode('item')} className={cn("px-3 py-1.5 text-[10px] font-bold rounded-lg transition-all", discountMode === 'item' ? "bg-sky-600 text-white shadow-md shadow-sky-900/30" : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300")}>Items</button>
                  </div>
                </div>
                {discountMode === 'full' ? (
                  <div className="flex gap-2">
                    <Input value={discountValue} onChange={(e) => setDiscountValue(e.target.value)} type="number" className="h-10 text-xs rounded-xl bg-white dark:bg-slate-950" placeholder="Discount Amount" />
                    <select value={discountType} onChange={(e) => setDiscountType(e.target.value as 'percent' | 'amount')} className="h-10 bg-white dark:bg-slate-950 text-xs border border-gray-200 dark:border-slate-800 rounded-xl px-3 outline-none focus:ring-2 focus:ring-sky-500/20 transition-all font-bold">
                      <option value="percent">%</option>
                      <option value="amount">Fixed</option>
                    </select>
                  </div>
                ) : (
                  <Button size="sm" variant="secondary" onClick={() => setIsItemDiscountModalOpen(true)} className="w-full h-10 text-xs rounded-xl border-dashed border-2 bg-white dark:bg-slate-900 hover:border-sky-500 hover:bg-sky-500/5 transition-all text-sky-500 font-bold uppercase tracking-widest">Manage Item Discounts</Button>
                )}
              </div>
            </div>
          )}

          {/* SETTINGS TAB */}
          {cartActiveTab === 'settings' && (
            <div className="space-y-6 animate-in fade-in slide-in-from-top-2 duration-300">
              <div className="grid gap-3">
                <div className="rounded-2xl border border-gray-200 dark:border-slate-800 bg-gray-50/50 dark:bg-slate-900/30 p-5 space-y-6">
                  {orderType === 'dine-in' ? (
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <TableCellsIcon className="h-4 w-4 text-sky-500" />
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Seating Assignment</label>
                      </div>
                      <select
                        value={selectedTable}
                        onChange={(event) => handleTableSelection(event.target.value)}
                        disabled={tablesLoading || tables.length === 0}
                        className="w-full rounded-xl border border-gray-300 dark:border-slate-800 bg-white dark:bg-slate-950 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-sky-500/20 transition-all"
                      >
                        <option value="">{tablesLoading ? 'Loading tables…' : 'Select table'}</option>
                        {tables.map((table: any) => (
                          <option key={table.id} value={table.id} disabled={table.status === 'occupied' || table.status === 'reserved'}>
                            {table.number || table.tableNumber || table.name || table.id} {table.status ? `(${getTableStatusText(table)})` : ''}
                          </option>
                        ))}
                      </select>
                      {selectedTable && (
                        <div className="space-y-2 pt-2">
                          <label className="text-[10px] font-black uppercase text-slate-500 px-1">Guest Count</label>
                          <Input
                            type="number"
                            min="1"
                            value={guestCount}
                            onChange={(e) => setGuestCount(Math.max(1, parseInt(e.target.value) || 1))}
                            className="rounded-xl border-gray-200 dark:border-slate-800 h-11"
                          />
                        </div>
                      )}
                    </div>
                  ) : requiresRoomService ? (
                    <div className="space-y-3">
                       <div className="flex items-center gap-2">
                        <HomeModernIcon className="h-4 w-4 text-sky-500" />
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Room Booking</label>
                      </div>
                      <select
                        value={roomServiceBookingId}
                        onChange={(event) => setRoomServiceBookingId(event.target.value)}
                        className="w-full rounded-xl border border-gray-300 dark:border-slate-800 bg-white dark:bg-slate-950 px-3 py-2.5 text-sm"
                      >
                        <option value="">Select Room</option>
                        {roomServiceBookings.map((b: Booking) => (
                          <option key={b.id} value={b.id}>Room {b.roomNumber} - {b.guestName}</option>
                        ))}
                      </select>
                    </div>
                  ) : requiresDeliveryDetails ? (
                    <div className="space-y-4">
                      <div className="flex items-center gap-2">
                        <TruckIcon className="h-4 w-4 text-sky-500" />
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Delivery Details</label>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <label className="text-[9px] font-black text-slate-400 px-1 uppercase tracking-tighter">Contact Name</label>
                          <Input
                            value={deliveryDetails.contactName}
                            onChange={(e) => setDeliveryDetails({...deliveryDetails, contactName: e.target.value})}
                            placeholder="Recipient name"
                            className="h-10 text-xs rounded-xl border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-950"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[9px] font-black text-slate-400 px-1 uppercase tracking-tighter">Contact Phone *</label>
                          <Input
                            value={deliveryDetails.contactPhone}
                            onChange={(e) => setDeliveryDetails({...deliveryDetails, contactPhone: e.target.value})}
                            placeholder="+880..."
                            className="h-10 text-xs rounded-xl border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-950"
                          />
                        </div>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] font-black text-slate-400 px-1 uppercase tracking-tighter">Address Line 1 *</label>
                        <Input
                          value={deliveryDetails.addressLine1}
                          onChange={(e) => setDeliveryDetails({...deliveryDetails, addressLine1: e.target.value})}
                          placeholder="Street address, area..."
                          className="h-10 text-xs rounded-xl border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-950"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] font-black text-slate-400 px-1 uppercase tracking-tighter">Address Line 2</label>
                        <Input
                          value={deliveryDetails.addressLine2}
                          onChange={(e) => setDeliveryDetails({...deliveryDetails, addressLine2: e.target.value})}
                          placeholder="Apt, suite, floor (optional)"
                          className="h-10 text-xs rounded-xl border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-950"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <label className="text-[9px] font-black text-slate-400 px-1 uppercase tracking-tighter">City *</label>
                          <Input
                            value={deliveryDetails.city}
                            onChange={(e) => setDeliveryDetails({...deliveryDetails, city: e.target.value})}
                            placeholder="City"
                            className="h-10 text-xs rounded-xl border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-950"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[9px] font-black text-slate-400 px-1 uppercase tracking-tighter">Postal Code</label>
                          <Input
                            value={deliveryDetails.postalCode}
                            onChange={(e) => setDeliveryDetails({...deliveryDetails, postalCode: e.target.value})}
                            placeholder="Postal code"
                            className="h-10 text-xs rounded-xl border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-950"
                          />
                        </div>
                      </div>
                      {deliveryZones.length > 0 && (
                        <div className="space-y-1">
                          <label className="text-[9px] font-black text-slate-400 px-1 uppercase tracking-tighter">Delivery Zone</label>
                          <select
                            value={(deliveryDetails as any).zoneId || ''}
                            onChange={(e) => {
                              const zone = deliveryZones.find((z: any) => (z.id || z._id) === e.target.value);
                              setDeliveryDetails({...deliveryDetails, zoneId: e.target.value} as any);
                              if (zone) {
                                setDeliveryFee(String((zone as any).deliveryCharge || 0));
                              }
                            }}
                            className="w-full rounded-xl border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-3 py-2.5 text-xs outline-none focus:ring-2 focus:ring-sky-500/20 transition-all"
                          >
                            <option value="">Select zone (optional)</option>
                            {deliveryZones.map((zone: any) => (
                              <option key={zone.id || zone._id} value={zone.id || zone._id}>
                                {zone.name} — {formatCurrency(zone.deliveryCharge || 0)}
                              </option>
                            ))}
                          </select>
                        </div>
                      )}
                      <div className="space-y-1">
                        <label className="text-[9px] font-black text-slate-400 px-1 uppercase tracking-tighter">Delivery Fee</label>
                        <Input
                          type="number"
                          min="0"
                          value={deliveryFee}
                          onChange={(e) => setDeliveryFee(e.target.value)}
                          placeholder="0"
                          className="h-10 text-xs rounded-xl border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-950"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] font-black text-slate-400 px-1 uppercase tracking-tighter">Instructions</label>
                        <textarea
                          value={deliveryDetails.instructions}
                          onChange={(e) => setDeliveryDetails({...deliveryDetails, instructions: e.target.value})}
                          placeholder="Delivery instructions, landmarks..."
                          className="w-full h-16 rounded-xl bg-white dark:bg-slate-950 border border-gray-200 dark:border-slate-800 p-3 text-xs outline-none focus:border-sky-500/50 placeholder:text-slate-400 focus:ring-2 focus:ring-sky-500/10 transition-all resize-none"
                        />
                      </div>
                    </div>
                  ) : requiresTakeawayDetails ? (
                    <div className="space-y-4">
                      <div className="flex items-center gap-2">
                        <ShoppingBagIcon className="h-4 w-4 text-sky-500" />
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Takeaway Details</label>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <label className="text-[9px] font-black text-slate-400 px-1 uppercase tracking-tighter">Contact Name</label>
                          <Input
                            value={takeawayDetails.contactName}
                            onChange={(e) => setTakeawayDetails({...takeawayDetails, contactName: e.target.value})}
                            placeholder="Customer name (optional)"
                            className="h-10 text-xs rounded-xl border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-950"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[9px] font-black text-slate-400 px-1 uppercase tracking-tighter">Contact Phone</label>
                          <Input
                            value={takeawayDetails.contactPhone}
                            onChange={(e) => setTakeawayDetails({...takeawayDetails, contactPhone: e.target.value})}
                            placeholder="+880... (optional)"
                            className="h-10 text-xs rounded-xl border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-950"
                          />
                        </div>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] font-black text-slate-400 px-1 uppercase tracking-tighter">Instructions</label>
                        <textarea
                          value={takeawayDetails.instructions}
                          onChange={(e) => setTakeawayDetails({...takeawayDetails, instructions: e.target.value})}
                          placeholder="Preparation instructions, pickup time..."
                          className="w-full h-16 rounded-xl bg-white dark:bg-slate-950 border border-gray-200 dark:border-slate-800 p-3 text-xs outline-none focus:border-sky-500/50 placeholder:text-slate-400 focus:ring-2 focus:ring-sky-500/10 transition-all resize-none"
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="py-4 text-center">
                      <p className="text-xs text-slate-400 italic font-medium">No seating requirements for {orderType}</p>
                    </div>
                  )}

                  <div className="space-y-3 border-t border-gray-100 dark:border-slate-800/50 pt-6">
                    <div className="flex items-center gap-2">
                      <UserIcon className="h-4 w-4 text-sky-500" />
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Service Staff</label>
                    </div>
                    <select
                      value={selectedWaiterId}
                      onChange={(event) => setSelectedWaiterId(event.target.value)}
                      className="w-full rounded-xl border border-gray-300 dark:border-slate-800 bg-white dark:bg-slate-950 px-3 py-2.5 text-sm outline-none"
                    >
                      <option value="">Assign Waiter</option>
                      {waiterOptions.map((w) => (
                        <option key={w.id} value={w.id}>{w.name} {w.activeOrdersCount > 0 ? `(${w.activeOrdersCount} active)` : ''}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="space-y-2 px-1">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Internal Instructions</label>
                  <textarea
                    value={orderNotes}
                    onChange={(e) => setOrderNotes(e.target.value)}
                    placeholder="Kitchen notes, allergy alerts, or special requests..."
                    className="w-full h-32 rounded-2xl bg-white dark:bg-slate-950 border border-gray-200 dark:border-slate-800 p-4 text-xs outline-none focus:border-sky-500/50 placeholder:text-slate-400 focus:ring-2 focus:ring-sky-500/10 transition-all resize-none"
                  />
                </div>
              </div>
            </div>
          )}

          {/* CUSTOMER TAB */}
          {cartActiveTab === 'customer' && (
            <div className="space-y-6 animate-in fade-in slide-in-from-top-2 duration-300">
              <div className="rounded-2xl border border-gray-200 dark:border-slate-800 bg-gray-50/50 dark:bg-slate-900/30 p-5 space-y-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <UserCircleIcon className="h-5 w-5 text-sky-500" />
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Guest Data</label>
                  </div>
                  <Button size="sm" variant="ghost" onClick={() => setIsCustomerLookupOpen(true)} className="h-8 px-4 text-[10px] font-black bg-sky-500/10 text-sky-500 hover:bg-sky-500/20 rounded-xl uppercase tracking-widest">Find Guest</Button>
                </div>
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-black text-slate-400 px-1 uppercase tracking-tighter">Full Name</label>
                    <Input
                      value={customerInfo.name}
                      onChange={(e) => setCustomerInfo({...customerInfo, name: e.target.value})}
                      placeholder="Start typing name..."
                      className="h-12 text-sm rounded-xl border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-950"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-black text-slate-400 px-1 uppercase tracking-tighter">Contact Number</label>
                    <Input
                      value={customerInfo.phone}
                      onChange={(e) => setCustomerInfo({...customerInfo, phone: e.target.value})}
                      placeholder="+880..."
                      className="h-12 text-sm rounded-xl border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-950"
                    />
                  </div>
                </div>
              </div>

              <div className="flex flex-col items-center justify-center py-20 opacity-20 text-slate-500 select-none">
                <UserGroupIcon className="h-20 w-20 mb-4" />
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-center">Loyalty status and<br/>history will load here</p>
              </div>
            </div>
          )}
        </div>

        {/* Footer Summary & Checkout */}
        <div className="mt-auto px-4 py-2 sm:py-3 bg-white dark:bg-slate-950 border-t border-gray-200 dark:border-slate-800 space-y-2 sm:space-y-3 shadow-[0_-10px_30px_-15px_rgba(0,0,0,0.1)] dark:shadow-[0_-20px_50px_-20px_rgba(0,0,0,0.8)] z-20">
          <div className="space-y-0.5">
            <div className="flex justify-between text-[9px] font-medium text-slate-500">
              <span>Subtotal</span>
              <span className="text-gray-900 dark:text-slate-300">{formatCurrency(orderSummary.subtotal)}</span>
            </div>
            {orderSummary.discount > 0 && (
              <div className="flex justify-between text-[9px] font-bold text-emerald-500">
                <span>Discount</span>
                <span>-{formatCurrency(orderSummary.discount)}</span>
              </div>
            )}
            <div className="flex justify-between text-[9px] font-medium text-slate-500">
              <span>Tax ({taxRate}%)</span>
              <span className="text-gray-900 dark:text-slate-300">{formatCurrency(orderSummary.tax)}</span>
            </div>
            <div className="flex justify-between items-center pt-1 border-t border-gray-100 dark:border-slate-800/50 mt-1">
              <span className="text-[11px] font-black text-gray-900 dark:text-white uppercase tracking-tighter">TOTAL</span>
              <span className="text-2xl font-black text-emerald-500 tracking-tighter">{formatCurrency(orderSummary.total)}</span>
            </div>
          </div>
          
          <div className="flex gap-2">
            {paymentMode === 'pay-later' && (
              <Button
                variant="secondary"
                onClick={handleCreateOrder}
                disabled={checkoutBlocked || (orderType !== 'room-booking' && cart.length === 0)}
                className="flex-1 h-10 rounded-lg bg-gray-100 dark:bg-slate-900 hover:bg-gray-200 dark:hover:bg-slate-800 border-none transition-all"
              >
                  <ClockIcon className="h-4 w-4 text-slate-500" />
              </Button>
            )}
            <Button
              variant="primary"
              onClick={() => setIsPaymentModalOpen(true)}
              disabled={checkoutBlocked || (orderType !== 'room-booking' && orderType !== 'room-service' && cart.length === 0)}
              className="flex-[4] h-10 rounded-lg bg-sky-600 hover:bg-sky-500 text-[10px] font-black gap-2 shadow-lg shadow-sky-600/10 active:scale-95 transition-all text-white border-none"
            >
              <CreditCardIcon className="h-4 w-4" />
              PAY (ENTER)
            </Button>
          </div>
        </div>
      </aside>
    );
  };

  const renderQueueModal = () => (
    <Modal
      isOpen={isQueueModalOpen}
      onClose={() => setIsQueueModalOpen(false)}
      title="Global Orders Queue"
      size="2xl"
    >
      <div className="flex flex-col h-[75vh] bg-gray-50 dark:bg-slate-950 rounded-b-3xl overflow-hidden">
        <div className="flex items-center justify-between border-b border-gray-200 dark:border-slate-900 px-8 py-5 bg-white dark:bg-slate-950 z-10">
          <div className="flex items-center gap-6">
            {(['active', 'history'] as const).map((tab) => {
              const isActive = queueTab === tab;
              return (
                <button
                  key={tab}
                  onClick={() => setQueueTab(tab)}
                  className={cn(
                    "relative py-2 text-sm font-black uppercase tracking-widest transition-all",
                    isActive ? "text-sky-500" : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                  )}
                >
                  {tab === 'active' ? 'Active' : 'History'}
                  {isActive && <div className="absolute -bottom-1 left-0 right-0 h-1 bg-sky-500 rounded-full shadow-lg shadow-sky-500/40" />}
                </button>
              );
            })}
          </div>
          <Button
            size="sm"
            variant="ghost"
            onClick={handleQueueRefresh}
            disabled={queueLoading}
            className="h-11 w-11 p-0 rounded-2xl bg-gray-100 dark:bg-slate-900 border border-gray-200 dark:border-slate-800 hover:bg-gray-200 dark:hover:bg-slate-800 transition-all shadow-sm"
          >
            <ArrowPathIcon className={cn("h-5 w-5 text-gray-700 dark:text-slate-300", queueLoading && "animate-spin")} />
          </Button>
        </div>

        <div className="p-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 bg-white/50 dark:bg-slate-950/50 border-b border-gray-200 dark:border-slate-900/50 backdrop-blur-md">
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 px-1">Channel Filter</label>
            <select
              value={queueOrderTypeFilter}
              onChange={(e) => setQueueOrderTypeFilter(e.target.value as any)}
              className="w-full bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-2xl px-4 py-3 text-xs font-bold focus:ring-4 focus:ring-sky-500/10 transition-all outline-none"
            >
              <option value="all">All Channels</option>
              {ORDER_TYPE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
          {queueTab === 'history' && (
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 px-1">Status Overview</label>
              <select
                value={queueStatusFilter}
                onChange={(e) => setQueueStatusFilter(e.target.value as any)}
                className="w-full bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-2xl px-4 py-3 text-xs font-bold focus:ring-4 focus:ring-sky-500/10 transition-all outline-none"
              >
                {ORDER_STATUS_FILTERS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
          )}
          <div className="space-y-2 relative">
            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 px-1">Quick Search</label>
            <div className="relative">
              <MagnifyingGlassIcon className="h-4 w-4 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
              <Input
                value={queueSearchInput}
                onChange={(e) => setQueueSearchInput(e.target.value)}
                placeholder="Order ID, Customer..."
                className="pl-11 h-12 rounded-2xl bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 text-xs font-bold"
              />
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-8 space-y-4 custom-scrollbar bg-gray-50 dark:bg-slate-950/20">
          {queueLoading ? (
            <div className="flex flex-col items-center justify-center py-24 gap-4">
              <div className="relative w-12 h-12">
                <div className="absolute inset-0 border-4 border-sky-500/10 rounded-full"></div>
                <div className="absolute inset-0 border-4 border-t-sky-500 rounded-full animate-spin"></div>
              </div>
              <p className="text-xs font-black uppercase tracking-widest text-slate-500 animate-pulse">Syncing Orders...</p>
            </div>
          ) : queueOrders.length === 0 ? (
            <div className="text-center py-32 flex flex-col items-center gap-4 border-2 border-dashed border-gray-200 dark:border-slate-900 rounded-[3rem]">
              <ClipboardDocumentIcon className="h-16 w-16 text-slate-200 dark:text-slate-800" />
              <div className="space-y-1">
                <p className="text-sm font-black dark:text-white uppercase">No records found</p>
                <p className="text-xs text-slate-500">Try adjusting your filters or search terms</p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {queueOrders.map((order: any) => {
                const orderId = resolveOrderId(order);
                const canAct = Boolean(orderId);
                const statusInfo = ORDER_STATUS_STYLES[order.status] || ORDER_STATUS_STYLES.pending;
                return (
                  <div key={orderId || Math.random()} className="bg-white dark:bg-slate-900/40 border border-gray-200 dark:border-slate-800/60 rounded-3xl p-6 hover:shadow-2xl hover:shadow-black/5 hover:-translate-y-1 transition-all duration-300 group">
                    <div className="flex justify-between items-start mb-5">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                           <span className="text-[10px] font-black uppercase text-sky-500 bg-sky-500/10 px-2 py-0.5 rounded-md">ID: {order.orderNumber || orderId?.slice(-6)}</span>
                           {order.isPublic && <Badge className="bg-amber-500/10 text-amber-500 border-none text-[8px]">ONLINE</Badge>}
                        </div>
                        <div className="text-[10px] font-bold text-slate-400 flex items-center gap-1.5"><ClockIcon className="h-3 w-3" /> {formatDateTime(order.createdAt)}</div>
                      </div>
                      <div className={cn("px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest border shadow-sm", statusInfo)}>
                        {ORDER_STATUS_LABELS[order.status] || order.status}
                      </div>
                    </div>
                    
                    <div className="flex flex-wrap gap-3 mb-6">
                      <div className="flex items-center gap-1.5 bg-gray-50 dark:bg-slate-950 px-3 py-1.5 rounded-xl border border-gray-200 dark:border-slate-800">
                        <UserIcon className="h-3 w-3 text-slate-400" />
                        <span className="text-[10px] font-black text-gray-700 dark:text-slate-300 truncate max-w-[120px]">{order.customerInfo?.name || 'Walk-in Guest'}</span>
                      </div>
                      <div className="flex items-center gap-1.5 bg-gray-50 dark:bg-slate-950 px-3 py-1.5 rounded-xl border border-gray-200 dark:border-slate-800">
                        <CurrencyDollarIcon className="h-3 w-3 text-emerald-500" />
                        <span className="text-[10px] font-black text-emerald-600 dark:text-emerald-400">{formatCurrency(order.totalAmount)}</span>
                      </div>
                    </div>

                    <div className="flex gap-3 pt-5 border-t border-gray-100 dark:border-slate-800/50">
                      <Button size="sm" variant="primary" onClick={() => handleQueueViewDetails(orderId)} className="flex-1 h-11 rounded-2xl bg-sky-600 hover:bg-sky-500 border-none text-[10px] font-black uppercase tracking-widest transition-all text-white shadow-lg shadow-sky-500/20">Full Details</Button>
                      <Button size="sm" variant="secondary" onClick={() => handlePrintReceipt(orderId, false)} className="h-11 w-11 p-0 rounded-2xl bg-slate-100 dark:bg-slate-800 border-none hover:bg-sky-500 hover:text-white transition-all text-slate-600 dark:text-slate-400"><PrinterIcon className="h-5 w-5" /></Button>
                      {order.status === 'pending' && (
                        <Button size="sm" className="bg-emerald-600 hover:bg-emerald-500 h-11 rounded-2xl flex-[0.8] text-[10px] font-black uppercase tracking-widest shadow-lg shadow-emerald-500/20 active:scale-95 transition-all text-white border-none" onClick={() => updateOrder({ id: orderId, data: { status: 'paid' }}).then(refetchQueue)}>Settle Payment</Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </Modal>
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
          setIsQueueModalOpen((prev) => !prev);
          break;
        case 'F2':
          event.preventDefault();
          // setIsPaymentModalOpen(true); replaced by direct cart interaction or repurposed
          break;
        case 'Escape':
          event.preventDefault();
          setIsPaymentModalOpen(false);
          setShowKeyboardShortcuts(false);
          setIsCalculatorOpen(false);
          setIsQueueModalOpen(false);
          break;
        case 'Enter':
          event.preventDefault();
          if (cart.length > 0 && !checkoutBlocked) {
             setIsPaymentModalOpen(true);
          }
          break;
      }
    };
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [cart.length, selectedTable, showKeyboardShortcuts, handleCreateOrder, requiresTable, checkoutBlocked, paymentMode, setIsPaymentModalOpen, clearCart]);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // Listen for sidebar state changes
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    // Check initial state if possible (though sidebar-toggle is the standard)
    const handleSidebarToggle = (event: CustomEvent) => {
      setSidebarCollapsed(event.detail.collapsed);
    };

    window.addEventListener('sidebar-toggle', handleSidebarToggle as EventListener);
    return () => {
      window.removeEventListener('sidebar-toggle', handleSidebarToggle as EventListener);
    };
  }, []);

  return (
    !isOwnerOrManager && !workPeriodLoading && !activeWorkPeriod ? (
      <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-slate-950">
        <Card className="max-w-md w-full mx-4">
          <CardContent className="p-8 text-center space-y-4">
            <LockClosedIcon className="w-16 h-16 text-red-500 mx-auto" />
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              POS Terminal Locked
            </h2>
            <p className="text-gray-600 dark:text-gray-400">
              No active work period found. Please ask an owner to start a work period
              from the Work Periods page before using the POS terminal.
            </p>
            <Button
              className="w-full"
              onClick={() => (window.location.href = '/dashboard/work-periods')}
            >
              Go to Work Periods
            </Button>
          </CardContent>
        </Card>
      </div>
    ) : (
    <div className={cn(
      "fixed inset-0 top-16 z-0 flex flex-col bg-white dark:bg-slate-950 text-gray-900 dark:text-slate-100 overflow-hidden transition-all duration-300",
      sidebarCollapsed ? "left-0 lg:left-16" : "left-0 lg:left-64"
    )}>
      {/* Offline Status Banner — Enterprise */}
      <OfflineBanner
        isOfflineReady={isOfflineReady}
        isSyncing={isPrefetchSyncing}
        lastSyncedAt={lastSyncedAt}
        pendingCount={pendingCount}
        syncErrors={syncErrors}
        onSyncNow={() => { syncNow(true); syncOrders(); }}
      />
      {/* Header */}
      <div className="bg-white dark:bg-slate-950 border-b border-gray-200 dark:border-slate-800 px-4 py-2 shadow-sm z-30">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            {/* Mode Selection Dropdown */}
            <div className="flex items-center gap-2 bg-gray-50 dark:bg-slate-900 rounded-lg px-2 h-9 border border-gray-200 dark:border-slate-800">
              <ActiveOrderIcon className="h-4 w-4 text-sky-500" />
              <select
                value={orderType}
                onChange={(e) => handleOrderTypeChange(e.target.value as OrderType)}
                className="bg-transparent text-[10px] font-black uppercase tracking-widest text-slate-600 dark:text-slate-300 focus:outline-none cursor-pointer"
              >
                <option value="dine-in" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">Dine-In</option>
                <option value="delivery" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">Delivery</option>
                <option value="takeaway" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">Takeaway</option>
                <option value="room-service" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">Room Service</option>
                <option value="room-booking" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">Room Booking</option>
              </select>
            </div>

            {/* Contextual Selectors */}
            {requiresTable && (
              <div className="flex items-center gap-2">
                <TableCellsIcon className="h-4 w-4 text-slate-400" />
                <select
                  value={selectedTable}
                  onChange={(event) => handleTableSelection(event.target.value)}
                  disabled={tablesLoading || tables.length === 0}
                  className="h-9 rounded-lg border border-gray-200 dark:border-slate-800 bg-gray-50 dark:bg-slate-900 px-3 text-xs font-bold focus:ring-2 focus:ring-sky-500/20 outline-none min-w-[140px]"
                >
                  <option value="" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-bold">{tablesLoading ? 'Loading...' : 'Select Table'}</option>
                  {tables.map((table: any) => (
                    <option key={table.id} value={table.id} disabled={table.status === 'occupied' || table.status === 'reserved'} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">
                      {table.number || table.name || table.id} {table.status ? `• ${getTableStatusText(table)}` : ''}
                    </option>
                  ))}
                </select>
                {selectedTable && activeTable && (
                  <Badge className={`${getTableStatus(activeTable)} text-[9px] h-5 px-2`}>
                    {getTableStatusText(activeTable)}
                  </Badge>
                )}
              </div>
            )}

            {requiresRoomService && (
              <div className="flex items-center gap-2">
                <HomeModernIcon className="h-4 w-4 text-slate-400" />
                <select
                  value={roomServiceBookingId}
                  onChange={(event) => setRoomServiceBookingId(event.target.value)}
                  disabled={roomServiceBookingsLoading || roomServiceBookings.length === 0}
                  className="h-9 rounded-lg border border-gray-200 dark:border-slate-800 bg-gray-50 dark:bg-slate-900 px-3 text-xs font-bold min-w-[140px]"
                >
                  <option value="" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">{roomServiceBookingsLoading ? 'Loading...' : 'Select Room'}</option>
                  {roomServiceBookings.map((b: Booking) => (
                    <option key={b.id} value={b.id} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">Room {b.roomNumber} • {b.guestName}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Compact Quick Status */}
            <div className="hidden md:flex items-center gap-3 ml-2 pl-4 border-l border-gray-100 dark:border-slate-800">
              <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400">
                <ClipboardDocumentListIcon className="h-3.5 w-3.5" />
                <span>{orderSummary.itemCount} Items</span>
              </div>
              <div className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-500">
                <CurrencyDollarIcon className="h-3.5 w-3.5" />
                <span>{formatCurrency(orderSummary.total)}</span>
              </div>
            </div>
          </div>

          {/* Right actions */}
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant={isQueueModalOpen ? 'primary' : 'secondary'}
              onClick={() => setIsQueueModalOpen(true)}
              className="h-9 gap-2 text-[10px] font-black uppercase tracking-widest px-4 rounded-lg border-none bg-sky-500/10 text-sky-500 hover:bg-sky-500/20 whitespace-nowrap"
            >
              <ClipboardDocumentListIcon className="h-4 w-4" />
              Orders (F1)
            </Button>

            <Button
              size="sm"
              variant="secondary"
              onClick={() => setIsCartSidebarCollapsed(false)}
              className={cn(
                "h-9 px-4 gap-2 text-[10px] font-black uppercase tracking-widest rounded-lg border-none bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 transition-all",
                !isCartSidebarCollapsed && "hidden"
              )}
            >
              <ShoppingCartIcon className="h-4 w-4" />
              Cart ({cart.length})
            </Button>

            <Button
              size="sm"
              variant="secondary"
              onClick={handleResetOrder}
              className="h-9 w-9 p-0 rounded-lg border-none bg-gray-50 dark:bg-slate-900 text-slate-500 hover:text-rose-500 transition-all border border-gray-200 dark:border-slate-800"
              title="Reset current order"
            >
              <ArrowPathIcon className="h-4 w-4" />
            </Button>

            <div className="h-6 w-px bg-gray-200 dark:border-slate-800 mx-1" />

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
      </div>

      <div className="flex flex-1 overflow-hidden flex-col xl:flex-row min-h-0">
        <div className="flex flex-1 flex-col min-w-0 min-h-0 overflow-hidden">
          {isOrderingActive ? renderOrderingWorkspace() : renderPreOrderView()}
        </div>
        {renderCartSidebar()}
      </div>
      {renderQueueModal()}
      {/* Order Cart Modal */}
      {/* Refund Modal */}
      <Modal
        isOpen={isRefundModalOpen}
        onClose={() => setIsRefundModalOpen(false)}
        title="Process Refund"
        size="md"
      >
        <div className="space-y-4">
          <div className="rounded-lg border border-orange-500/30 bg-orange-500/10 p-4 text-sm text-orange-200">
            <p className="font-semibold">Refund Warning</p>
            <p>Processing a refund will record a financial reversal. This action should only be taken when returning money to a customer.</p>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Refund Amount</label>
            <Input
              type="number"
              value={refundAmount}
              onChange={(e) => setRefundAmount(e.target.value)}
              placeholder="0.00"
              className="bg-slate-900 border-slate-800"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Reason for Refund</label>
            <textarea
              value={refundReason}
              onChange={(e) => setRefundReason(e.target.value)}
              placeholder="Enter reason..."
              className="w-full h-24 rounded-lg bg-slate-900 border border-slate-800 p-3 text-sm focus:ring-2 focus:ring-sky-500 focus:outline-none"
            />
          </div>
          <div className="flex items-center gap-2 py-2">
            <input
              type="checkbox"
              id="refundIsDamage"
              checked={refundIsDamage}
              onChange={(e) => setRefundIsDamage(e.target.checked)}
              className="h-4 w-4 rounded border-slate-800 bg-slate-900 text-emerald-600 focus:ring-emerald-500"
            />
            <label htmlFor="refundIsDamage" className="text-sm font-medium text-slate-200">
              Record items as Damages (Wastage)
            </label>
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="secondary" onClick={() => setIsRefundModalOpen(false)}>
              Cancel
            </Button>
            <Button
              className="bg-orange-600 hover:bg-orange-500 text-white"
              onClick={handleRefundSubmit}
            >
              Confirm Refund
            </Button>
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
                <div key={item.id} className="rounded-lg border border-gray-300 dark:border-slate-850 bg-gray-50 dark:bg-slate-950/70 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-semibold text-gray-900 dark:text-slate-100">{item.name}</h4>
                      <p className="text-xs text-gray-600 dark:text-slate-500">{formatCurrency(item.price)} • Qty {item.quantity}</p>
                    </div>
                <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => updateItemDiscountEntry(item.id, { type: 'percent', value: '0' })}
                      className="text-xs text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-slate-100"
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
                      className="rounded-lg border border-gray-300 dark:border-slate-800 bg-white dark:bg-slate-900/80 px-3 py-2 text-sm text-gray-900 dark:text-slate-100 focus:border-sky-500 focus:outline-none"
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
                      className="bg-white dark:bg-slate-950/60 border-gray-300 dark:border-slate-850 text-gray-900 dark:text-slate-100 placeholder:text-gray-400 dark:placeholder:text-slate-500"
                    />
                    <div className="rounded-lg border border-gray-300 dark:border-slate-800 bg-gray-50 dark:bg-slate-950/60 px-3 py-2 text-sm text-gray-700 dark:text-slate-300">
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
              className="w-full min-h-[120px] rounded-xl border border-gray-300 dark:border-slate-850 bg-white dark:bg-slate-950/60 px-3 py-2 text-sm text-gray-900 dark:text-slate-100 placeholder:text-gray-400 dark:placeholder:text-slate-500 focus:border-sky-600 focus:outline-none focus:ring-2 focus:ring-sky-600/40"
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
            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">Search customers</label>
            <Input
              value={customerSearchTerm}
              onChange={(event) => setCustomerSearchTerm(event.target.value)}
              placeholder="Search by name, phone, or email"
              className="bg-white dark:bg-slate-950/70 border-gray-300 dark:border-slate-850 text-gray-900 dark:text-slate-100"
            />
          </div>
          {customerSearchTerm.trim().length < 2 ? (
            <p className="text-sm text-gray-600 dark:text-slate-400">
              Enter at least two characters to search your customer list.
            </p>
          ) : isCustomerSearchLoading ? (
            <div className="space-y-3">
              {[...Array(3)].map((_, index) => (
                <div key={index} className="h-16 animate-pulse rounded-xl bg-gray-100 dark:bg-slate-900/60" />
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
                        ? 'border-emerald-500 bg-emerald-500/10 text-emerald-700 dark:text-emerald-100'
                        : 'border-gray-300 dark:border-slate-850 bg-white dark:bg-slate-950/70 text-gray-900 dark:text-slate-200 hover:bg-gray-100 dark:hover:bg-slate-900/70'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <p className="font-semibold">{fullName}</p>
                        {phone && <p className="text-xs text-slate-400">{phone}</p>}
                      </div>
                      <Badge className="bg-gray-100 dark:bg-slate-900/60 text-gray-700 dark:text-slate-300 border border-gray-300 dark:border-slate-800">
                        {customer.totalOrders ? `${customer.totalOrders} orders` : 'Customer'}
                      </Badge>
                    </div>
                  </button>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-gray-600 dark:text-slate-400">No customers found for that search.</p>
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
          <div className="flex items-center gap-2 rounded-2xl border border-gray-300 dark:border-slate-800 bg-gray-50 dark:bg-slate-950/60 p-1">
              <Button
              size="sm"
              variant={paymentTab === 'full' ? 'primary' : 'secondary'}
              onClick={() => setPaymentTab('full')}
              className={`flex-1 rounded-xl ${paymentTab === 'full' ? 'bg-emerald-600 hover:bg-emerald-500' : 'bg-transparent text-gray-700 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-900/70'}`}
              >
              Full Amount
              </Button>
              <Button
              size="sm"
              variant={paymentTab === 'multi' ? 'primary' : 'secondary'}
              onClick={() => setPaymentTab('multi')}
              className={`flex-1 rounded-xl ${paymentTab === 'multi' ? 'bg-sky-600 hover:bg-sky-500' : 'bg-transparent text-gray-700 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-900/70'}`}
            >
              Split Tender
              </Button>
          </div>
          {paymentTab === 'full' ? (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">Select Payment Method</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {paymentMethodsLoading ? (
                    <div className="col-span-full text-center text-gray-600 dark:text-slate-400 py-4">Loading payment methods...</div>
                  ) : paymentMethods.length > 0 ? (
                    paymentMethods.map((method) => {
                      const isSelected = fullPaymentMethod === method.code;
                      const getIcon = () => {
                        if (method.icon) return method.icon;
                        if (method.type === 'cash') return '💵';
                        if (method.type === 'card') return <CreditCardIcon className="h-4 w-4" />;
                        return <CurrencyDollarIcon className="h-4 w-4" />;
                      };
                      return (
                        <Button
                          key={method.id}
                          variant={isSelected ? 'primary' : 'secondary'}
                          onClick={() => setFullPaymentMethod(method.code)}
                          className={`flex items-center justify-center gap-2 ${
                            isSelected
                              ? method.color
                                ? `bg-[${method.color}] hover:opacity-90`
                                : 'bg-emerald-600 hover:bg-emerald-500'
                              : 'bg-gray-100 dark:bg-slate-900/80 text-gray-700 dark:text-slate-200 hover:bg-gray-200 dark:hover:bg-slate-800/80'
                          }`}
                        >
                          {typeof getIcon() === 'string' ? (
                            <span>{getIcon()}</span>
                          ) : (
                            getIcon()
                          )}
                          <span className="text-xs sm:text-sm">{method.displayName || method.name}</span>
                        </Button>
                      );
                    })
                  ) : (
                    <div className="col-span-full text-center text-gray-600 dark:text-slate-400 py-4">
                      No payment methods available. Please configure payment methods in settings.
                    </div>
                  )}
                </div>
              </div>
          <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">Amount received</label>
            <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={fullPaymentReceived}
                  onChange={(event) => setFullPaymentReceived(event.target.value)}
                  className="bg-white dark:bg-slate-950/70 border-gray-300 dark:border-slate-850 text-gray-900 dark:text-slate-100"
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
                      className="rounded-full bg-gray-100 dark:bg-slate-900/80 text-gray-700 dark:text-slate-200 hover:bg-gray-200 dark:hover:bg-slate-800/80"
                    >
                      {formatCurrency(suggestion)}
                    </Button>
                  ))}
                </div>
              )}
              {(() => {
                const selectedMethod = paymentMethods.find(m => m.code === fullPaymentMethod);
                const allowsChange = selectedMethod?.allowsChangeDue ?? (fullPaymentMethod === 'cash');
                return allowsChange && (
                  <div className="text-sm text-gray-700 dark:text-slate-300">
                    Change due:{' '}
                    <span className="font-semibold text-emerald-600 dark:text-emerald-300">{formatCurrency(fullPaymentChange)}</span>
                  </div>
                );
              })()}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="space-y-3">
                {multiPayments.map((row) => {
                  return (
                    <div
                      key={row.id}
                      className="grid gap-3 sm:grid-cols-[160px_1fr_auto] items-center rounded-xl border border-gray-300 dark:border-slate-850 bg-gray-50 dark:bg-slate-950/60 p-3"
                    >
                      <select
                        value={row.method}
                        onChange={(event) =>
                          updateMultiPaymentRow(row.id, { method: event.target.value })
                        }
                        className="rounded-lg border border-gray-300 dark:border-slate-800 bg-white dark:bg-slate-900/80 px-3 py-2 text-sm text-gray-900 dark:text-slate-100 focus:border-sky-500 focus:outline-none"
                        disabled={paymentMethodsLoading}
                      >
                        {paymentMethodsLoading ? (
                          <option>Loading...</option>
                        ) : paymentMethods.length > 0 ? (
                          paymentMethods
                            .filter(method => method.allowsPartialPayment !== false)
                            .map((method) => (
                              <option key={method.id} value={method.code} className="bg-slate-900">
                                {method.displayName || method.name}
                              </option>
                            ))
                        ) : (
                          <option value="">No methods available</option>
                        )}
                      </select>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={row.amount}
                        onChange={(event) => updateMultiPaymentRow(row.id, { amount: event.target.value })}
                        className="bg-white dark:bg-slate-950/70 border-gray-300 dark:border-slate-850 text-gray-900 dark:text-slate-100"
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
                className="w-full rounded-xl bg-gray-100 dark:bg-slate-900/80 text-gray-900 dark:text-slate-200 hover:bg-gray-200 dark:hover:bg-slate-800/80"
              >
                + Add another payment
              </Button>
              <div className="flex items-center justify-between rounded-xl border border-gray-300 dark:border-slate-850 bg-gray-50 dark:bg-slate-950/70 p-3 text-sm text-gray-700 dark:text-slate-300">
                <span>Applied</span>
                <span className="font-semibold text-gray-900 dark:text-slate-100">{formatCurrency(splitTotals.applied)}</span>
              </div>
              <div
                className={`text-sm ${
                  splitTotals.remaining > 0
                    ? 'text-amber-600 dark:text-amber-300'
                    : splitTotals.remaining < 0
                    ? 'text-emerald-600 dark:text-emerald-300'
                    : 'text-gray-700 dark:text-slate-300'
                }`}
              >
                {splitTotals.remaining > 0 && `${formatCurrency(Math.abs(splitTotals.remaining))} remaining`}
                {splitTotals.remaining < 0 && `${formatCurrency(Math.abs(splitTotals.remaining))} change expected`}
                {splitTotals.remaining === 0 && 'Ready to settle'}
              </div>
            </div>
          )}
          <div className="rounded-xl border border-gray-300 dark:border-slate-850 bg-gray-50 dark:bg-slate-950/70 p-4 space-y-2 text-sm">
            <div className="flex items-center justify-between text-gray-700 dark:text-slate-300">
              <span>Subtotal</span>
              <span className="text-gray-900 dark:text-slate-100">{formatCurrency(orderSummary.subtotal)}</span>
            </div>
            {orderSummary.discount > 0 && (
              <div className="flex items-center justify-between text-emerald-600 dark:text-emerald-300">
                <span>Discount</span>
                <span>-{formatCurrency(orderSummary.discount)}</span>
              </div>
            )}
            <div className="flex items-center justify-between text-gray-700 dark:text-slate-300">
              <span>Tax ({taxRate}%)</span>
              <span className="text-gray-900 dark:text-slate-100">{formatCurrency(orderSummary.tax)}</span>
            </div>
            {orderSummary.deliveryFee > 0 && (
              <div className="flex items-center justify-between text-gray-700 dark:text-slate-300">
                <span>Delivery Fee</span>
                <span className="text-gray-900 dark:text-slate-100">{formatCurrency(orderSummary.deliveryFee)}</span>
              </div>
            )}
            <div className="flex items-center justify-between border-t border-gray-300 dark:border-slate-800 pt-3 text-base font-semibold text-emerald-600 dark:text-emerald-400">
              <span>Total Due</span>
              <span>{formatCurrency(orderSummary.total)}</span>
            </div>
          </div>
          <div className="flex justify-between gap-2">
            <Button
              variant="secondary"
              onClick={() => setIsCalculatorOpen(true)}
              className="flex items-center gap-2 bg-gray-100 dark:bg-slate-900/80 text-gray-700 dark:text-slate-100 hover:bg-gray-200 dark:hover:bg-slate-800/80"
              title="Calculator (F5)"
            >
              <CurrencyDollarIcon className="h-4 w-4" />
              Calculator
            </Button>
            <div className="flex gap-2">
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
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100">
                      {queueDetail.orderNumber || (detailId ? `Order ${String(detailId).slice(-6)}` : 'Order')}
                    </h3>
                    <p className="text-xs text-gray-600 dark:text-slate-400">
                      {queueDetail.createdAt ? formatDateTime(queueDetail.createdAt) : 'N/A'}
                    </p>
                  </div>
                  <Badge className={ORDER_STATUS_STYLES[statusKey] || ORDER_STATUS_STYLES.pending}>
                    {ORDER_STATUS_LABELS[statusKey] || queueDetail.status}
                  </Badge>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-xl border border-gray-300 dark:border-slate-900 bg-gray-50 dark:bg-slate-950/70 px-4 py-3">
                    <p className="text-xs uppercase tracking-[0.3em] text-gray-600 dark:text-slate-500 mb-1">Order Type</p>
                    <p className="text-sm font-semibold text-gray-900 dark:text-slate-100">
                      {getOrderTypeLabel(queueDetail.orderType as OrderType)}
                    </p>
                  </div>
                  <div className="rounded-xl border border-gray-300 dark:border-slate-900 bg-gray-50 dark:bg-slate-950/70 px-4 py-3">
                    <p className="text-xs uppercase tracking-[0.3em] text-gray-600 dark:text-slate-500 mb-1">Payment</p>
                    <p className="text-sm font-semibold text-gray-900 dark:text-slate-100">
                      {queueDetail.paymentMethod ? queueDetail.paymentMethod : 'Not recorded'}
                    </p>
                  </div>
                  {queueDetail.customerInfo && (
                    <div className="rounded-xl border border-gray-300 dark:border-slate-900 bg-gray-50 dark:bg-slate-950/70 px-4 py-3 sm:col-span-2">
                      <p className="text-xs uppercase tracking-[0.3em] text-gray-600 dark:text-slate-500 mb-1">Customer</p>
                      <div className="space-y-1 text-sm text-gray-900 dark:text-slate-200">
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
                  <h4 className="text-sm font-semibold text-gray-900 dark:text-slate-200 uppercase tracking-[0.25em]">Items</h4>
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
                            className="rounded-xl border border-gray-300 dark:border-slate-900 bg-gray-50 dark:bg-slate-950/70 px-4 py-3 text-sm text-gray-900 dark:text-slate-200"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <p className="font-semibold text-gray-900 dark:text-slate-100">{itemLabel}</p>
                                <p className="text-xs text-gray-600 dark:text-slate-400">
                                  Qty {item.quantity || 0} • {formatCurrency(Number(item.price || 0))}
                                </p>
                                {item.notes && (
                                  <p className="mt-2 rounded-lg bg-gray-100 dark:bg-slate-900/60 px-3 py-2 text-xs text-gray-700 dark:text-slate-300 whitespace-pre-line">
                                    {item.notes}
                                  </p>
                                )}
                              </div>
                              <span className="text-sm font-semibold text-gray-900 dark:text-slate-100">
                                {formatCurrency(itemTotal)}
                              </span>
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <div className="rounded-xl border border-gray-300 dark:border-slate-900 bg-gray-50 dark:bg-slate-950/70 px-4 py-6 text-center text-xs text-gray-500 dark:text-slate-400">
                        No line items recorded for this order.
                      </div>
                    )}
                  </div>
                </div>
                {queueDetail.notes && (
                  <div className="rounded-xl border border-gray-300 dark:border-slate-900 bg-gray-50 dark:bg-slate-950/70 px-4 py-3 text-sm text-gray-800 dark:text-slate-200">
                    <p className="text-xs uppercase tracking-[0.3em] text-gray-600 dark:text-slate-500 mb-1">Order Notes</p>
                    <p className="whitespace-pre-line">{queueDetail.notes}</p>
                  </div>
                )}
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="space-y-1 text-sm text-gray-600 dark:text-slate-300">
                    <div className="flex items-center gap-2">
                      <CurrencyDollarIcon className="h-4 w-4 text-emerald-600 dark:text-emerald-300" />
                      <span className="font-semibold text-emerald-600 dark:text-emerald-300">
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
                      className="rounded-lg bg-gray-100 dark:bg-slate-900/80 text-gray-900 dark:text-slate-100 hover:bg-gray-200 dark:hover:bg-slate-800/80 disabled:opacity-40"
                    >
                      View Receipt
                    </Button>
                    <Button
                      variant="secondary"
                      onClick={() => canActOnOrder && handlePrintReceipt(detailId, false)}
                      disabled={!canActOnOrder}
                      className="rounded-lg bg-gray-100 dark:bg-slate-900/80 text-gray-900 dark:text-slate-100 hover:bg-gray-200 dark:hover:bg-slate-800/80 disabled:opacity-40"
                    >
                      Print
                    </Button>
                    {queueDetail.status === 'pending' && (
                      <>
                        {queueDetail.orderType !== 'dine-in' && queueDetail.isPublic && (
                          <Button
                            variant="secondary"
                            onClick={async () => {
                              if (!canActOnOrder) return;
                              try {
                                await updateOrder({
                                  id: detailId,
                                  data: { status: 'confirmed' }
                                }).unwrap();
                                toast.success('Order confirmed');
                                setQueueDetailId(null);
                                refetchQueue();
                              } catch (error: any) {
                                toast.error(error?.data?.message || 'Failed to update order status');
                              }
                            }}
                            className="rounded-lg bg-sky-500/15 text-sky-600 dark:text-sky-200 hover:bg-sky-500/25"
                          >
                            Confirm Order
                          </Button>
                        )}
                        <Button
                          variant="secondary"
                          onClick={() => canActOnOrder && handleQueueCancel(detailId)}
                          disabled={!canActOnOrder || queueActionOrderId === detailId}
                          className="rounded-lg bg-rose-500/15 text-rose-600 dark:text-rose-200 hover:bg-rose-500/25 disabled:opacity-60"
                        >
                          {queueActionOrderId === detailId ? 'Cancelling…' : 'Cancel Order'}
                        </Button>
                      </>
                    )}
                    {queueDetail.status === 'paid' && (
                      <div className="flex gap-2">
                        <Button
                          variant="secondary"
                          onClick={() => canActOnOrder && handleOpenRefundModal(detailId, queueDetail.totalAmount || queueDetail.total)}
                          disabled={!canActOnOrder}
                          className="rounded-lg bg-orange-500/15 text-orange-600 dark:text-orange-200 hover:bg-orange-500/25"
                        >
                          Refund
                        </Button>
                        <Button
                          variant="secondary"
                          onClick={async () => {
                            if (!canActOnOrder) return;
                            try {
                              await updateOrder({
                                id: detailId,
                                data: { status: 'pending' }
                              }).unwrap();
                              toast.success('Order marked as pending');
                              refetchQueue();
                              setQueueDetailId(null);
                            } catch (error: any) {
                              toast.error(error?.data?.message || 'Failed to update order status');
                            }
                          }}
                          disabled={!canActOnOrder}
                          className="rounded-lg bg-amber-500/15 text-amber-600 dark:text-amber-200 hover:bg-amber-500/25"
                        >
                          Mark Pending
                        </Button>
                      </div>
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
              {!!receiptErrorDetails && typeof receiptErrorDetails === 'object' && 'status' in (receiptErrorDetails as Record<string, unknown>) && (
                <p className="text-xs text-slate-500">
                  Error {String((receiptErrorDetails as any).status)}: {receiptErrorMessage || 'Unexpected error'}
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
                  color: '#000',
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
                                  : 'bg-gray-100 dark:bg-slate-900/80 text-gray-700 dark:text-slate-200 hover:bg-gray-200 dark:hover:bg-slate-800/80'
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
                                    : 'bg-gray-100 dark:bg-slate-900/80 text-gray-700 dark:text-slate-200 hover:bg-gray-200 dark:hover:bg-slate-800/80'
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
                              : 'bg-gray-100 dark:bg-slate-900/80 text-gray-700 dark:text-slate-200 hover:bg-gray-200 dark:hover:bg-slate-800/80'
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
            <div className="rounded-xl border border-orange-300 dark:border-orange-500/40 bg-orange-50 dark:bg-orange-500/10 p-4">
              <p className="text-sm text-orange-700 dark:text-orange-200">
                This table has an active order. Choose an action below:
              </p>
            </div>
            {occupiedTableModal.orderDetails && (
              <div className="space-y-3 rounded-xl border border-gray-300 dark:border-slate-800 bg-gray-50 dark:bg-slate-950/60 p-4">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-xs text-gray-500 dark:text-slate-400">Token Number</p>
                    <p className="font-semibold text-gray-900 dark:text-slate-100">{occupiedTableModal.orderDetails.tokenNumber || occupiedTableModal.orderDetails.orderNumber}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 dark:text-slate-400">Order Amount</p>
                    <p className="font-semibold text-emerald-600 dark:text-emerald-400">{formatCurrency(occupiedTableModal.orderDetails.totalAmount || 0)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 dark:text-slate-400">Order Status</p>
                    {(() => {
                      // Get order status from multiple possible locations
                      const orderDetails = occupiedTableModal.orderDetails;
                      const orderStatus = orderDetails?.orderStatus 
                        || orderDetails?.status 
                        || orderDetails?.allOrders?.[0]?.status 
                        || 'pending';
                      const statusLabel = orderStatus === 'paid' ? 'Paid' 
                        : orderStatus === 'pending' ? 'Pending' 
                        : orderStatus === 'cancelled' ? 'Cancelled'
                        : orderStatus || 'Unknown';
                      const badgeClass = orderStatus === 'paid' 
                        ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-200 border border-emerald-500/30'
                        : orderStatus === 'pending'
                        ? 'bg-amber-500/10 text-amber-600 dark:text-amber-200 border border-amber-500/30'
                        : orderStatus === 'cancelled'
                        ? 'bg-rose-500/10 text-rose-600 dark:text-rose-200 border border-rose-500/30'
                        : 'bg-slate-500/10 text-slate-600 dark:text-slate-200 border border-slate-500/30';
                      return (
                        <Badge className={badgeClass}>
                          {statusLabel}
                        </Badge>
                      );
                    })()}
                  </div>
                  {occupiedTableModal.orderDetails.waiterName && (
                    <div>
                      <p className="text-xs text-gray-500 dark:text-slate-400">Waiter</p>
                      <p className="font-semibold text-gray-900 dark:text-slate-100">{occupiedTableModal.orderDetails.waiterName}</p>
                    </div>
                  )}
                  {occupiedTableModal.orderDetails.holdCount > 0 && (
                    <div>
                      <p className="text-xs text-slate-400">Times Held</p>
                      <p className="font-semibold text-orange-400">{occupiedTableModal.orderDetails.holdCount}x</p>
                    </div>
                  )}
                  <div className="col-span-2">
                    <p className="text-xs text-gray-500 dark:text-slate-400">Used Seats</p>
                    <p className="font-semibold text-gray-900 dark:text-slate-100">
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
              {(() => {
                const orderDetails = occupiedTableModal.orderDetails;
                const currentStatus = orderDetails?.orderStatus 
                  || orderDetails?.status 
                  || orderDetails?.allOrders?.[0]?.status 
                  || 'pending';
                return (
                  <>
                    {currentStatus !== 'paid' && (
                      <Button
                        onClick={handleResumeOrder}
                        className="w-full bg-sky-600 hover:bg-sky-500"
                      >
                        Resume & Edit Order
                      </Button>
                    )}
                    {currentStatus === 'pending' && (
                      <Button
                        onClick={() => {
                          if (!occupiedTableModal.orderDetails?.currentOrderId) return;
                          const orderAmount = occupiedTableModal.orderDetails.totalAmount || 0;
                          setPendingOrderPaymentReceived(orderAmount.toFixed(2));
                          // Set default payment method
                          const defaultMethod = paymentMethods.find(m => m.code === 'cash')?.code || paymentMethods[0]?.code || 'cash';
                          setPendingOrderPaymentMethod(defaultMethod);
                          setIsPendingOrderPaymentModalOpen(true);
                        }}
                        disabled={paymentMode === 'pay-first'}
                        className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed"
                        title={paymentMode === 'pay-first' ? 'Pay-first mode is enabled. Pending orders cannot be created or processed.' : ''}
                      >
                        Process Payment
                      </Button>
                    )}
                    {currentStatus === 'paid' && (
                      <>
                        <Button
                          onClick={async () => {
                            if (!occupiedTableModal.tableId) return;
                            try {
                              await updateTableStatus({
                                id: occupiedTableModal.tableId,
                                status: 'available'
                              }).unwrap();
                              toast.success('Table released successfully');
                              setOccupiedTableModal(null);
                              refetchTables();
                            } catch (error: any) {
                              toast.error(error?.data?.message || 'Failed to release table');
                            }
                          }}
                          className="w-full bg-green-600 hover:bg-green-500"
                        >
                          Release Table
                        </Button>
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
                          disabled={true}
                          variant="secondary"
                          className="w-full disabled:opacity-50 disabled:cursor-not-allowed"
                          title="Cannot mark paid orders as pending. Use 'Release Table' to free the table."
                        >
                          Mark as Pending
                        </Button>
                      </>
                    )}
                  </>
                );
              })()}
              {occupiedTableModal.orderDetails?.remainingSeats > 0 && (
                <Button
                  onClick={handleStartNewOrderOnTable}
                  variant="secondary"
                  className="w-full"
                >
                  Start New Order ({occupiedTableModal.orderDetails.remainingSeats} seats)
                </Button>
              )}
              {(() => {
                const orderDetails = occupiedTableModal.orderDetails;
                const currentStatus = orderDetails?.orderStatus 
                  || orderDetails?.status 
                  || orderDetails?.allOrders?.[0]?.status 
                  || 'pending';
                return currentStatus !== 'paid' ? (
                  <Button
                    onClick={handleCancelOccupiedOrder}
                    variant="ghost"
                    className="w-full text-rose-400 hover:text-rose-300 hover:bg-rose-500/10"
                  >
                    Cancel Order & Free Table
                  </Button>
                ) : null;
              })()}
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
      {/* Reservation Check-in Modal */}
      <Modal
        isOpen={Boolean(reservedTableModal)}
        onClose={() => setReservedTableModal(null)}
        title="Check-in Reservation"
        size="md"
      >
        {reservedTableModal && (
          <div className="space-y-4">
            <div className="rounded-xl border border-yellow-500/40 bg-yellow-500/10 p-4">
              <p className="text-sm text-yellow-200">
                This table is reserved. Check-in the customer to start an order.
              </p>
            </div>
            
            <div className="space-y-3 rounded-xl border border-slate-800 bg-slate-950/60 p-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-xs text-slate-400">Customer Name</p>
                  <p className="font-semibold text-slate-100">{reservedTableModal.reservation.reservedBy?.name || 'Guest'}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-400">Phone</p>
                  <p className="font-semibold text-slate-100">{reservedTableModal.reservation.reservedBy?.phone || '—'}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-400">Reservation Time</p>
                  <p className="font-semibold text-sky-400">
                    {reservedTableModal.reservation.reservedFor ? new Date(reservedTableModal.reservation.reservedFor).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-400">Party Size</p>
                  <p className="font-semibold text-slate-100">{reservedTableModal.reservation.reservedBy?.partySize || '—'} guests</p>
                </div>
              </div>
            </div>

            {reservedTableModal.reservation.preOrderItems && reservedTableModal.reservation.preOrderItems.length > 0 && (
              <div className="space-y-2 rounded-xl border border-slate-800 bg-slate-950/60 p-4">
                <p className="text-sm font-semibold text-slate-100">Pre-ordered Items</p>
                <div className="space-y-1">
                  {reservedTableModal.reservation.preOrderItems.map((item: any, idx: number) => {
                    const menuItem = menuItemsData?.find((mi: any) => (mi.id || mi._id) === item.menuItemId);
                    return (
                      <div key={idx} className="flex justify-between text-xs text-slate-300">
                        <span>{item.quantity}x {menuItem?.name || item.name || 'Item'}</span>
                        <span>{menuItem ? formatCurrency(menuItem.price * item.quantity) : ''}</span>
                      </div>
                    );
                  })}
                </div>
                <div className="mt-2 pt-2 border-t border-slate-800 flex justify-between font-bold text-emerald-400 text-sm">
                  <span>Pre-order Total</span>
                  <span>
                    {formatCurrency(reservedTableModal.reservation.preOrderItems.reduce((sum: number, item: any) => {
                      const menuItem = menuItemsData?.find((mi: any) => (mi.id || mi._id) === item.menuItemId);
                      return sum + (menuItem?.price || 0) * (item.quantity || 1);
                    }, 0))}
                  </span>
                </div>
              </div>
            )}

            <div className="flex flex-col gap-2 pt-2">
              <Button
                onClick={handleCheckInReservation}
                className="w-full bg-emerald-600 hover:bg-emerald-500"
              >
                Check-in & Start Order
              </Button>
              <Button
                onClick={() => setReservedTableModal(null)}
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
            <div className="rounded-2xl border border-emerald-300 dark:border-emerald-600/40 bg-emerald-50 dark:bg-emerald-500/10 p-6 text-emerald-800 dark:text-emerald-100">
              <p className="text-sm uppercase tracking-[0.3em] text-emerald-600 dark:text-emerald-200">Order</p>
              <h3 className="text-2xl font-semibold text-emerald-800 dark:text-emerald-100">
                {paymentSuccessOrder.orderNumber ? `Order #${paymentSuccessOrder.orderNumber}` : paymentSuccessOrder.orderId}
              </h3>
              <p className="mt-2 text-sm text-emerald-600/80 dark:text-emerald-100/80">
                {paymentSuccessOrder.summary || 'Payment recorded successfully.'}
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-xl border border-gray-200 dark:border-slate-800 bg-gray-50 dark:bg-slate-950/70 p-4">
                <p className="text-xs uppercase tracking-[0.3em] text-gray-500 dark:text-slate-500">Total Paid</p>
                <p className="text-xl font-semibold text-emerald-600 dark:text-emerald-300">
                  {formatCurrency(paymentSuccessOrder.totalPaid)}
                </p>
              </div>
              {paymentSuccessOrder.changeDue !== undefined && (
                <div className="rounded-xl border border-gray-200 dark:border-slate-800 bg-gray-50 dark:bg-slate-950/70 p-4">
                  <p className="text-xs uppercase tracking-[0.3em] text-gray-500 dark:text-slate-500">Change Due</p>
                  <p className="text-xl font-semibold text-amber-600 dark:text-amber-300">
                    {formatCurrency(paymentSuccessOrder.changeDue)}
                  </p>
                </div>
              )}
            </div>
            {paymentSuccessOrder.breakdown && paymentSuccessOrder.breakdown.length > 0 && (
              <div className="rounded-xl border border-gray-200 dark:border-slate-800 bg-gray-50 dark:bg-slate-950/70 p-4 space-y-2">
                <p className="text-sm font-semibold text-gray-900 dark:text-slate-100">Payment Breakdown</p>
                <div className="space-y-1 text-sm text-gray-600 dark:text-slate-300">
                  {paymentSuccessOrder.breakdown.map((row) => (
                    <div key={`${row.method}-${row.amount}`} className="flex items-center justify-between">
                      <span className="capitalize">{row.method}</span>
                      <span className="font-semibold text-gray-900 dark:text-slate-100">{formatCurrency(row.amount)}</span>
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
      {/* Payment Modal for Pending Orders */}
      <Modal
        isOpen={isPendingOrderPaymentModalOpen}
        onClose={() => setIsPendingOrderPaymentModalOpen(false)}
        title="Process Payment"
        size="md"
      >
        {occupiedTableModal && occupiedTableModal.orderDetails && (
          <div className="space-y-4">
            <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-slate-400">Order Amount</span>
                <span className="text-xl font-bold text-emerald-400">
                  {formatCurrency(occupiedTableModal.orderDetails.totalAmount || 0)}
                </span>
              </div>
            </div>
            <div className="space-y-3">
              <label className="block text-sm font-semibold text-slate-200">Payment Method</label>
              <div className="grid grid-cols-2 gap-2">
                {paymentMethods.map((method) => (
                  <Button
                    key={method.code}
                    variant={pendingOrderPaymentMethod === method.code ? 'primary' : 'secondary'}
                    onClick={() => setPendingOrderPaymentMethod(method.code)}
                    className={`${
                      pendingOrderPaymentMethod === method.code
                        ? 'bg-emerald-600 hover:bg-emerald-500'
                        : 'bg-slate-900/80 text-slate-200 hover:bg-slate-800/80'
                    }`}
                  >
                    {method.icon && <span className="mr-2">{method.icon}</span>} {method.name}
                  </Button>
                ))}
              </div>
            </div>
            {pendingOrderPaymentMethod === 'cash' && (
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-slate-200">Amount Received</label>
                <Input
                  type="number"
                  value={pendingOrderPaymentReceived}
                  onChange={(e) => setPendingOrderPaymentReceived(e.target.value)}
                  placeholder="0.00"
                  min="0"
                  step="0.01"
                  className="bg-white dark:bg-slate-950/60 border-gray-300 dark:border-slate-850 text-gray-900 dark:text-slate-100"
                />
                {parseFloat(pendingOrderPaymentReceived || '0') > (occupiedTableModal.orderDetails.totalAmount || 0) && (
                  <p className="text-sm text-amber-400">
                    Change: {formatCurrency(parseFloat(pendingOrderPaymentReceived || '0') - (occupiedTableModal.orderDetails.totalAmount || 0))}
                  </p>
                )}
              </div>
            )}
            <div className="flex gap-2 pt-4">
              <Button
                variant="secondary"
                onClick={() => setIsPendingOrderPaymentModalOpen(false)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={async () => {
                  if (!occupiedTableModal.orderDetails?.currentOrderId) return;
                  try {
                    const orderAmount = occupiedTableModal.orderDetails.totalAmount || 0;
                    const received = parseFloat(pendingOrderPaymentReceived || '0');
                    if (pendingOrderPaymentMethod === 'cash' && received < orderAmount) {
                      toast.error('Amount received must be at least the order amount');
                      return;
                    }
                    // Map payment method code to backend expected format
                    const backendMethod = pendingOrderPaymentMethod === 'cash' ? 'cash' : 
                                         pendingOrderPaymentMethod === 'card' || pendingOrderPaymentMethod.includes('CARD') ? 'card' : 
                                         'split';
                    
                    const changeVal = pendingOrderPaymentMethod === 'cash' ? Math.max(0, received - orderAmount) : 0;
                    const amountReceivedValue = pendingOrderPaymentMethod === 'cash' ? received : orderAmount;

                    await processPayment({
                      orderId: occupiedTableModal.orderDetails.currentOrderId,
                      amount: orderAmount,
                      method: pendingOrderPaymentMethod, // Use the actual method code
                      transactionId: undefined,
                      amountReceived: amountReceivedValue,
                      changeDue: changeVal > 0 ? changeVal : undefined,
                    }).unwrap();

                    setPaymentSuccessOrder({
                      orderId: occupiedTableModal.orderDetails.currentOrderId,
                      orderNumber: occupiedTableModal.orderDetails.orderNumber || 'Order',
                      totalPaid: orderAmount,
                      changeDue: changeVal > 0 ? changeVal : undefined,
                      summary: `${pendingOrderPaymentMethod} payment for ${formatCurrency(orderAmount)}`,
                      breakdown: [{ method: pendingOrderPaymentMethod, amount: orderAmount }],
                    });

                    toast.success('Payment processed successfully');
                    setIsPendingOrderPaymentModalOpen(false);
                    setOccupiedTableModal(null);
                    refetchTables();
                    refetchQueue();
                  } catch (error: any) {
                    toast.error(error?.data?.message || 'Failed to process payment');
                  }
                }}
                className="flex-1 bg-emerald-600 hover:bg-emerald-500"
                disabled={pendingOrderPaymentMethod === 'cash' && parseFloat(pendingOrderPaymentReceived || '0') < (occupiedTableModal.orderDetails.totalAmount || 0)}
              >
                Process Payment
              </Button>
            </div>
          </div>
        )}
      </Modal>
      {/* Calculator Modal */}
      <Calculator
        isOpen={isCalculatorOpen}
        onClose={() => setIsCalculatorOpen(false)}
      />
    </div>
    )
  );
}
