'use client';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Calculator } from '@/components/ui/Calculator';
import { Card, CardContent } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
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
  useUpdatePOSOrderMutation
} from '@/lib/api/endpoints/posApi';
import { useGetRoomsQuery } from '@/lib/api/endpoints/roomsApi';
import { useGetStaffQuery } from '@/lib/api/endpoints/staffApi';
import { useUpdateTableStatusMutation } from '@/lib/api/endpoints/tablesApi';
import { useGetCurrentWorkPeriodQuery } from '@/lib/api/endpoints/workPeriodsApi';
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
  const formatCurrency = useFormatCurrency(); // Use hook to get reactive currency formatting
  const isOwnerOrManager =
    user?.role === 'owner' || user?.role === 'super_admin';
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
  const [isCartModalOpen, setIsCartModalOpen] = useState(false);
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
  const [isQueueCollapsed, setIsQueueCollapsed] = useState(true);
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
  // Delivery zones for POS (branch-based)
  // Use same branch resolution logic as Bookings page so POS + Bookings see the same branch
  const currentBranchId =
    (user as any)?.branchId
    || (companyContext as any)?.branchId
    || (companyContext as any)?.branches?.[0]?._id
    || (companyContext as any)?.branches?.[0]?.id
    || '';
  const currentCompanyId =
    (user as any)?.companyId
    || (companyContext as any)?.companyId
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
  const takeawayIsValid = !requiresTakeawayDetails
    || (
      takeawayDetails.contactName.trim() !== ''
      && takeawayDetails.contactPhone.trim() !== ''
    );
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
      return;
    }
    const handleTableStatusChanged = (data: any) => {
      // Refetch tables when status changes
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
  const waiterOptions = useMemo<Array<{ id: string; name: string; activeOrdersCount: number }>>(() => {
    const staffList = staffData?.staff || [];
    const currentBranchId = user?.branchId || branchId;
    return staffList
      .filter((staffMember: any) => {
        // CRITICAL: Only show employees with "waiter" role (or "server" as alias)
        const role = (staffMember.role || '').toLowerCase();
        const isWaiter = role === 'waiter' || role === 'server';
        if (!isWaiter) {
          return false; // Only waiter/server roles allowed
        }
        // CRITICAL: Filter by branch assignment - only show waiters assigned to current branch
        const staffBranchId = staffMember.branchId || (staffMember.branch as any)?.id;
        const isAssignedToBranch = currentBranchId && staffBranchId && 
          (staffBranchId.toString() === currentBranchId.toString() || 
           staffBranchId === currentBranchId);
        return isAssignedToBranch;
      })
      .map((staffMember: any) => {
        const waiterId = staffMember.id;
        const activeOrdersCount = waiterActiveOrdersCount[waiterId] || 0;
        return {
          id: waiterId,
          name:
            `${staffMember.firstName || ''} ${staffMember.lastName || ''}`.trim() ||
            staffMember.email ||
            staffMember.id,
          activeOrdersCount,
        };
      });
  }, [staffData, user?.branchId, branchId, waiterActiveOrdersCount]);
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
    const total = taxableSubtotal + taxAmount + deliveryFeeValue;
    return {
      subtotal: baseSubtotal,
      discount: totalDiscount,
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
        items: cart.map((item) => ({
          menuItemId: item.menuItemId,
          quantity: item.quantity,
          price: item.price,
          notes: buildItemNotes(item),
        })),
        customerInfo: customerInfo,
        totalAmount: Number(orderSummary.total.toFixed(2)),
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
    loyaltyRedemption.pointsRedeemed,
    loyaltyRedemption.discount,
    refetchQueue,
    guestCount,
    refetchTables,
    formatCurrency,
    paymentMode,
    clearCart,
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
      const hasContact = takeawayDetails.contactName.trim() && takeawayDetails.contactPhone.trim();
      if (!hasContact) {
        toast.error('Please provide contact name and phone for takeaway orders');
        return;
      }
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
      let paymentMethodForBackend: 'cash' | 'card' | 'split' = 'cash';
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
        paymentMethodForBackend = 'cash'; // Backend expects 'cash', 'card', or 'split' - we'll use paymentBreakdown for actual method
        paymentBreakdown = [{ method: fullPaymentMethod, amount: totalDue }];
        const methodName = selectedMethod?.displayName || selectedMethod?.name || fullPaymentMethod;
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
          setIsCartModalOpen(false);
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
        customerInfo: customerInfo,
        totalAmount: totalDue,
        // In "pay-first" mode, create order as 'paid' (payment happens before order creation)
        // In "pay-later" mode, create order as 'pending' then process payment (except room service)
        status: paymentMode === 'pay-first' ? 'paid' as const : 'pending' as const,
        paymentMethod: actualPaymentMethod, // Store actual method code (bkash, nagad, etc.)
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
          method: paymentMethodForBackend,
          transactionId: transactionReference,
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
        <div className="flex-1 overflow-y-auto px-6 py-10 min-h-0">
          <div className="mx-auto max-w-5xl space-y-8">
            <div className="text-center space-y-2">
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-slate-100">Select a table to start a dine-in order</h2>
              <p className="text-gray-600 dark:text-slate-400">Tap an available table below to launch the ordering workspace.</p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
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
                                <Badge className="bg-amber-500/10 text-amber-200 border border-amber-500/30 text-xs">
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
                        className="fixed z-50 min-w-[200px] rounded-lg border border-slate-700 bg-slate-900 shadow-xl py-2"
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
                            className="w-full px-4 py-2 text-left text-sm text-green-400 hover:bg-slate-800 transition-colors flex items-center gap-2"
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
                          className="w-full px-4 py-2 text-left text-sm text-slate-200 hover:bg-slate-800 transition-colors flex items-center gap-2"
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
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-sky-500/15 text-sky-200">
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
      <div className="bg-gray-50 dark:bg-slate-900/80 backdrop-blur border-b border-gray-200 dark:border-slate-800 px-3 sm:px-4 lg:px-6 py-3 sm:py-4">
        <div className="flex flex-col gap-3 sm:gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="flex-1 min-w-0">
            <label className="text-xs font-semibold uppercase text-slate-400 tracking-[0.2em] block mb-2">
              Search menu items
            </label>
            <div className="relative">
              <MagnifyingGlassIcon className="h-5 w-5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <Input
                placeholder='Try "salmon", "latte", or scan a barcode'
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-11 h-10 sm:h-11 bg-white dark:bg-slate-950/90 border border-gray-300 dark:border-slate-800 text-gray-900 dark:text-slate-100 placeholder:text-gray-400 dark:placeholder:text-slate-500 focus:border-sky-600 focus:ring-sky-600/40 text-sm sm:text-base"
              />
            </div>
          </div>
          <div className="flex flex-col gap-2 sm:gap-3 items-stretch lg:items-end">
            <div className="flex flex-wrap items-center gap-2 sm:gap-3 justify-between sm:justify-end">
              <div className="flex items-center gap-2 rounded-xl border border-gray-300 dark:border-slate-800 bg-white dark:bg-slate-950/80 px-4 py-2">
                <UserGroupIcon className="h-4 w-4 text-gray-500 dark:text-slate-400" />
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="bg-transparent text-sm text-gray-900 dark:text-slate-100 focus:outline-none"
                >
                  <option value="all" className="bg-white dark:bg-slate-900">All Categories</option>
                  {categories.map((category: any) => (
                    <option key={category.id} value={category.id} className="bg-white dark:bg-slate-900">
                      {category.name}
                    </option>
                  ))}
                </select>
              </div>
              <Button
                variant="secondary"
                className="flex items-center gap-2 rounded-xl bg-gray-100 dark:bg-slate-900/80 text-gray-700 dark:text-slate-100 hover:bg-gray-200 dark:hover:bg-slate-800/80 disabled:opacity-40"
                onClick={resetFilters}
                disabled={selectedCategory === 'all' && !searchQuery}
              >
                <FunnelIcon className="h-4 w-4" />
                Reset Filters
              </Button>
              <Button
                variant="secondary"
                onClick={() => setIsCalculatorOpen(true)}
                className="flex items-center gap-2 rounded-xl bg-gray-100 dark:bg-slate-900/80 text-gray-700 dark:text-slate-100 hover:bg-gray-200 dark:hover:bg-slate-800/80"
                title="Calculator (F5)"
              >
                <CurrencyDollarIcon className="h-4 w-4" />
                Calculator
              </Button>
            </div>
            <div className="flex flex-wrap items-center gap-2 justify-between sm:justify-end relative w-full sm:w-auto">
              <Button
                variant="secondary"
                onClick={() => setIsCartModalOpen(true)}
                className="flex items-center gap-1 sm:gap-2 rounded-xl bg-slate-900/80 text-slate-100 hover:bg-slate-800/80 relative z-10 text-xs sm:text-sm px-2 sm:px-3 py-1.5 sm:py-2"
              >
                <ShoppingCartIcon className="h-4 w-4" />
                <span className="hidden sm:inline">Open Order Cart</span>
                <span className="sm:hidden">Cart</span>
              </Button>
              {/* Payment Mode Toggle - In the middle */}
              <div className="flex items-center gap-1 sm:gap-2 rounded-xl border border-gray-300 dark:border-slate-800 bg-white dark:bg-slate-950/80 px-2 sm:px-3 py-1.5 sm:py-2 relative overflow-visible">
                <span className="text-xs font-medium text-gray-600 dark:text-slate-400 whitespace-nowrap hidden sm:inline">
                  {paymentMode === 'pay-first' ? 'Pay First' : 'Pay Later'}
                </span>
                <span className="text-xs font-medium text-gray-600 dark:text-slate-400 whitespace-nowrap sm:hidden">
                  {paymentMode === 'pay-first' ? 'Pay 1st' : 'Pay Later'}
                </span>
                <button
                  onClick={() => setPaymentMode(prev => prev === 'pay-first' ? 'pay-later' : 'pay-first')}
                  className="relative inline-flex h-5 w-10 items-center rounded-full bg-gray-300 dark:bg-slate-700 transition-colors focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2"
                  title={`Switch to ${paymentMode === 'pay-first' ? 'Pay Later' : 'Pay First'} mode`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      paymentMode === 'pay-first' ? 'translate-x-5' : 'translate-x-0.5'
                    }`}
                  />
                </button>
                <div className="relative group" style={{ zIndex: 99999 }}>
                  <InformationCircleIcon className="h-4 w-4 text-gray-400 dark:text-slate-500 cursor-help" />
                  <div className="absolute right-0 top-6 w-72 p-3 bg-slate-900 dark:bg-slate-800 text-white text-xs rounded-lg shadow-2xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 border border-slate-700 pointer-events-none group-hover:pointer-events-auto whitespace-normal" style={{ zIndex: 999999 }}>
                    <div className="space-y-2">
                      <p className="font-semibold text-sky-300">Payment Mode Info:</p>
                      <div className="space-y-1.5">
                        <p className="leading-relaxed">
                          <strong className="text-emerald-300">Pay First:</strong> Customer pays before sitting. Tables with paid orders remain occupied until customer leaves.
                        </p>
                        <p className="leading-relaxed">
                          <strong className="text-amber-300">Pay Later:</strong> Customer orders first, pays after. Only pending orders keep tables occupied.
                        </p>
                      </div>
                    </div>
                    <div className="absolute -top-1 right-4 w-2 h-2 bg-slate-900 dark:bg-slate-800 border-l border-t border-slate-700 transform rotate-45"></div>
                  </div>
                </div>
              </div>
              <Button
                variant="primary"
                onClick={() => setIsPaymentModalOpen(true)}
                disabled={
                  (orderType !== 'room-booking' && orderType !== 'room-service' && cart.length === 0) 
                  || (orderType === 'room-booking' && checkoutBlocked)
                  || (orderType !== 'room-booking' && checkoutBlocked)
                }
                className="flex items-center gap-1 sm:gap-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-xs sm:text-sm px-2 sm:px-3 py-1.5 sm:py-2 flex-1 sm:flex-initial"
              >
                <CreditCardIcon className="h-4 w-4" />
                <span>
                  {requiresRoomBooking
                    ? 'Book Room'
                    : requiresRoomService
                    ? 'Charge to Room'
                    : 'Checkout'}
                </span>
              </Button>
            </div>
          </div>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-2 sm:p-4 min-h-0">
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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2 sm:gap-4">
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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2 sm:gap-4">
            {filteredMenuItems.map((item) => (
              <Card
                key={item.id}
                className="group relative overflow-hidden border border-gray-200 dark:border-slate-800/80 bg-white dark:bg-slate-900/60 backdrop-blur-sm transition-all duration-200 hover:-translate-y-1 hover:border-sky-500/50 hover:shadow-lg hover:shadow-sky-700/20"
              >
                <CardContent className="p-4 space-y-3">
                  <div className="relative aspect-square rounded-xl bg-gray-100 dark:bg-slate-950/60 flex items-center justify-center border border-gray-200 dark:border-slate-800/80 overflow-hidden">
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
                          className="px-4 py-1 rounded-full text-xs font-semibold uppercase tracking-wide border border-white/70 text-red-500 shadow-lg shadow-black/40 bg-white"
                        >
                          {item.isOutOfStock ? 'Out of stock' : 'Low stock'}
                        </div>
                      </div>
                    )}
                  </div>
                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="font-semibold text-gray-900 dark:text-slate-100 truncate">
                        {item.name}
                      </h3>
                      {item.category?.name && (
                        <Badge className="bg-sky-500/10 dark:text-sky-200 text-gray-900 border border-sky-500/20">
                          {item.category.name}
                        </Badge>
                      )}
                    </div>
                    <p className="mt-1 text-xs text-gray-600 dark:text-slate-400 line-clamp-2 min-h-[32px]">
                      {item.description || "Perfect for today's menu."}
                    </p>
                  </div>
                  <div className="flex items-center justify-between pt-2">
                    <span className="text-xl font-bold text-emerald-400">
                      {formatCurrency(item.price)}
                    </span>
                    <Button
                      size="sm"
                      onClick={() => {
                        if (item.isOutOfStock) {
                          toast.error('This item is out of stock. Please restock before selling.');
                          return;
                        }
                        if (item.isLowStock) {
                          toast.error('This item is low on stock and cannot be sold for safety.');
                          return;
                        }
                        addToCart(item);
                      }}
                      disabled={item.isOutOfStock || item.isLowStock}
                      className="flex items-center gap-1 rounded-full bg-sky-600 hover:bg-sky-500 disabled:bg-gray-600 disabled:text-gray-200 disabled:cursor-not-allowed disabled:hover:bg-gray-600"
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
  const renderQueuePanel = () => {
    if (isQueueCollapsed) {
      return (
        <>
          {/* Mobile: Floating button to open queue */}
          <button
            onClick={() => setIsQueueCollapsed(false)}
            className="fixed bottom-4 right-4 z-50 md:hidden flex items-center justify-center w-14 h-14 rounded-full bg-sky-600 hover:bg-sky-500 text-white shadow-lg shadow-sky-600/50 transition-all"
            aria-label="Open Orders Queue"
          >
            <ClipboardDocumentListIcon className="h-6 w-6" />
          </button>
          {/* Desktop: Side collapsed panel */}
          <aside className="hidden md:flex md:w-16 md:flex-col md:items-center md:justify-center border-l border-gray-200 dark:border-slate-900/50 bg-white dark:bg-slate-950/60">
            <Button
              variant="ghost"
              onClick={() => setIsQueueCollapsed(false)}
              className="flex flex-col items-center gap-2 text-gray-600 dark:text-slate-300 hover:text-gray-900 dark:hover:text-white"
            >
              <ChevronLeftIcon className="h-5 w-5" />
              <span className="text-xs font-medium">Queue</span>
            </Button>
          </aside>
        </>
      );
    }
    return (
      <>
        <div
          className="fixed inset-0 z-30 bg-black/50 dark:bg-slate-950/70 backdrop-blur-sm md:hidden"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setIsQueueCollapsed(true);
          }}
        />
        <aside className="fixed inset-y-0 right-0 z-40 flex h-full w-full max-w-md flex-col border-l border-gray-200 dark:border-slate-900 bg-white dark:bg-slate-950/95 shadow-xl md:static md:z-auto md:max-w-xs md:bg-white md:dark:bg-slate-950/80 min-h-0">
          <div className="flex items-center justify-between border-b border-gray-200 dark:border-slate-900/70 px-4 py-3">
            <div>
              <p className="text-sm font-semibold text-gray-900 dark:text-slate-100">Orders</p>
              <p className="text-xs text-gray-600 dark:text-slate-400">
                {queueTab === 'active' ? 'Active queue' : 'Completed orders'}
              </p>
            </div>
            <div className="flex items-center gap-1">
              <Button
                size="sm"
                variant="ghost"
                onClick={handleQueueRefresh}
                disabled={queueLoading}
                className="h-9 w-9 rounded-full border border-gray-300 dark:border-slate-800 bg-gray-100 dark:bg-slate-900/80 text-gray-700 dark:text-slate-200 hover:bg-gray-200 dark:hover:bg-slate-800/80 disabled:opacity-40"
                title="Refresh"
              >
                <ArrowPathIcon className={`h-4 w-4 ${queueLoading ? 'animate-spin' : ''}`} />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setIsQueueCollapsed(true);
                }}
                className="h-9 w-9 rounded-full border border-slate-800 bg-slate-900/80 text-slate-200 hover:bg-slate-800/80"
                title="Collapse queue"
                type="button"
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
                        : 'bg-gray-100 dark:bg-slate-900/70 text-gray-700 dark:text-slate-300 hover:bg-gray-200 dark:hover:bg-slate-800/70'
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
                  className="flex-1 rounded-lg border border-gray-300 dark:border-slate-800 bg-white dark:bg-slate-950/70 px-3 py-2 text-sm text-gray-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-500/40"
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
                    className="flex-1 rounded-lg border border-gray-300 dark:border-slate-800 bg-white dark:bg-slate-950/70 px-3 py-2 text-sm text-gray-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-500/40"
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
                      {getOrderTypeLabel(order.orderType as OrderType)}
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
        case 'F5':
          event.preventDefault();
          setIsCalculatorOpen(true);
          break;
        case 'Escape':
          event.preventDefault();
          setIsPaymentModalOpen(false);
          setShowKeyboardShortcuts(false);
          setIsCalculatorOpen(false);
          setIsQueueCollapsed(true);
          break;
        case 'Enter':
          event.preventDefault();
          if (cart.length > 0 && !checkoutBlocked) {
            // In pay-first mode, Enter should open payment modal instead of creating pending order
            if (paymentMode === 'pay-first') {
              setIsPaymentModalOpen(true);
            } else {
              handleCreateOrder();
            }
          }
          break;
      }
    };
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [cart.length, selectedTable, showKeyboardShortcuts, handleCreateOrder, requiresTable, checkoutBlocked, paymentMode, setIsPaymentModalOpen, clearCart]);
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
    <div className="h-screen flex flex-col bg-white dark:bg-slate-950 text-gray-900 dark:text-slate-100">
      {/* Header */}
      <div className="bg-gradient-to-b from-gray-50 via-white to-gray-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 border-b border-gray-200 dark:border-slate-800 px-6 py-5 shadow-lg">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">POS System</h1>
              <Badge className="bg-sky-500/15 text-sky-700 dark:text-sky-200 border border-sky-500/30 dark:border-sky-500/50">
              {orderTypeLabel}
            </Badge>
            </div>
            <div className="flex items-center gap-3 flex-wrap text-sm text-gray-600 dark:text-slate-300">
              <TableCellsIcon className="h-4 w-4 text-slate-400" />
              {requiresTable ? (
                <div className="flex items-center gap-2">
                  <select
                    value={selectedTable}
                    onChange={(event) => handleTableSelection(event.target.value)}
                    disabled={tablesLoading || tables.length === 0}
                    className="rounded-lg border border-gray-300 dark:border-slate-800 bg-white dark:bg-slate-950/80 px-3 py-1.5 text-sm text-gray-900 dark:text-slate-100 focus:border-sky-500 focus:outline-none disabled:opacity-60 disabled:cursor-not-allowed"
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
              ) : requiresRoomService ? (
                <div className="flex items-center gap-2">
                  <select
                    value={roomServiceBookingId}
                    onChange={(event) => setRoomServiceBookingId(event.target.value)}
                    disabled={roomServiceBookingsLoading || roomServiceBookings.length === 0}
                    className="rounded-lg border border-gray-300 dark:border-slate-800 bg-white dark:bg-slate-950/80 px-3 py-1.5 text-sm text-gray-900 dark:text-slate-100 focus:border-sky-500 focus:outline-none disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    <option value="">
                      {roomServiceBookingsLoading
                        ? 'Loading room bookings…'
                        : roomServiceBookings.length === 0
                        ? 'No confirmed or checked-in bookings'
                        : 'Select booking / room'}
                    </option>
                    {roomServiceBookings.map((booking: Booking) => (
                      <option key={booking.id} value={booking.id}>
                        {booking.roomNumber
                          ? `Room ${booking.roomNumber}`
                          : 'Room'}{' '}
                        • {booking.guestName} • {booking.bookingNumber}
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <span className="text-gray-600 dark:text-slate-200">
                  Table not required for this order
                </span>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-2 text-xs text-gray-700 dark:text-slate-200">
              <div className="flex items-center gap-2 rounded-full border border-gray-300 dark:border-slate-800 bg-gray-50 dark:bg-slate-900/70 px-3 py-1.5 shadow-sm">
                <ActiveOrderIcon className="h-4 w-4 text-sky-600 dark:text-sky-300" />
                <span className="font-medium tracking-wide text-gray-900 dark:text-slate-100">{orderTypeLabel} mode</span>
          </div>
              <div className="flex items-center gap-1 sm:gap-2 rounded-full border border-gray-300 dark:border-slate-800 bg-gray-50 dark:bg-slate-900/70 px-2 sm:px-3 py-1 sm:py-1.5">
                <ClipboardDocumentListIcon className="h-3 w-3 sm:h-4 sm:w-4 text-emerald-600 dark:text-emerald-300 flex-shrink-0" />
                <span className="text-xs sm:text-sm text-gray-900 dark:text-slate-100 whitespace-nowrap">{orderSummary.itemCount} item{orderSummary.itemCount === 1 ? '' : 's'} in cart</span>
              </div>
              <div className="flex items-center gap-1 sm:gap-2 rounded-full border border-gray-300 dark:border-slate-800 bg-gray-50 dark:bg-slate-900/70 px-2 sm:px-3 py-1 sm:py-1.5">
                <CurrencyDollarIcon className="h-3 w-3 sm:h-4 sm:w-4 text-amber-600 dark:text-amber-300 flex-shrink-0" />
                <span className="text-xs sm:text-sm text-gray-900 dark:text-slate-100 whitespace-nowrap">Total {formatCurrency(orderSummary.total)}</span>
              </div>
              {requiresDeliveryDetails && (
                <div className={`flex items-center gap-1 sm:gap-2 rounded-full px-2 sm:px-3 py-1 sm:py-1.5 border text-xs sm:text-sm ${deliveryIsValid ? 'border-emerald-500/40 bg-emerald-500/10 dark:text-emerald-200 text-gray-900' : 'border-amber-500/40 bg-amber-500/10 dark:text-amber-100 text-gray-900'}`}>
                  <TruckIcon className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
                  <span className="whitespace-nowrap">{deliveryIsValid ? 'Delivery details complete' : `Missing ${missingDeliveryFields.length} field${missingDeliveryFields.length === 1 ? '' : 's'}`}</span>
                </div>
              )}
              {requiresTakeawayDetails && (
                <div className={`flex items-center gap-1 sm:gap-2 rounded-full px-2 sm:px-3 py-1 sm:py-1.5 border text-xs sm:text-sm ${takeawayIsValid ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-200' : 'border-amber-500/40 bg-amber-500/10 text-amber-100'}`}>
                  <ShoppingBagIcon className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
                  <span className="whitespace-nowrap">{takeawayIsValid ? 'Takeaway ready' : `Missing ${missingTakeawayFields.length} detail${missingTakeawayFields.length === 1 ? '' : 's'}`}</span>
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
                    className={`flex items-center gap-1 rounded-full px-2 sm:px-3 py-1 sm:py-1.5 text-xs sm:text-sm transition ${isActive ? 'bg-sky-600 hover:bg-sky-500 text-white shadow-lg shadow-sky-600/25' : 'bg-gray-100 dark:bg-slate-900/80 text-gray-700 dark:text-slate-200 hover:bg-gray-200 dark:hover:bg-slate-800/80'}`}
                    >
                      <Icon className="h-3 w-3 sm:h-4 sm:w-4" />
                      <span className="hidden sm:inline">{label}</span>
                    </Button>
                  );
                })}
              </div>
            <div className="flex items-center gap-1 sm:gap-2 flex-wrap justify-end w-full sm:w-auto">
              <Button
                variant={isQueueCollapsed ? 'secondary' : 'primary'}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setIsQueueCollapsed((prev) => !prev);
                }}
                className={`flex items-center gap-1 sm:gap-2 rounded-xl text-xs sm:text-sm px-2 sm:px-3 py-1.5 sm:py-2 ${
                  isQueueCollapsed
                    ? 'bg-gray-100 dark:bg-slate-900/80 text-gray-700 dark:text-slate-100 hover:bg-gray-200 dark:hover:bg-slate-800/80'
                    : 'bg-sky-600 hover:bg-sky-500 text-white shadow-lg shadow-sky-600/25'
                }`}
                type="button"
              >
                <ClipboardDocumentListIcon className="h-3 w-3 sm:h-4 sm:w-4" />
                <span className="hidden sm:inline">Orders Queue (F1)</span>
                <span className="sm:hidden">Queue</span>
              </Button>
              <Button
                variant="secondary"
                onClick={clearCart}
                disabled={cart.length === 0}
                className="flex items-center gap-1 sm:gap-2 rounded-xl bg-gray-100 dark:bg-slate-900/80 text-gray-700 dark:text-slate-100 hover:bg-gray-200 dark:hover:bg-slate-800/80 disabled:opacity-40 text-xs sm:text-sm px-2 sm:px-3 py-1.5 sm:py-2"
              >
                <TrashIcon className="h-3 w-3 sm:h-4 sm:w-4" />
                <span className="hidden sm:inline">Clear Cart (F3)</span>
                <span className="sm:hidden">Clear</span>
              </Button>
              <Button
                variant="secondary"
                onClick={() => setShowKeyboardShortcuts(true)}
                className="flex items-center gap-1 sm:gap-2 rounded-xl bg-slate-900/80 text-slate-100 hover:bg-slate-800/80 text-xs sm:text-sm px-2 sm:px-3 py-1.5 sm:py-2"
              >
                <span className="hidden sm:inline">⌨️ Shortcuts (F4)</span>
                <span className="sm:hidden">⌨️</span>
              </Button>
            </div>
          </div>
        </div>
      </div>
      <div className="flex flex-1 overflow-hidden flex-col lg:flex-row min-h-0">
        <div className="flex flex-1 flex-col min-w-0 min-h-0 overflow-hidden">
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
                          max={activeTable.orderDetails?.remainingSeats !== undefined 
                            ? activeTable.orderDetails.remainingSeats 
                            : (activeTable.capacity || 99)}
                          value={guestCount}
                          onChange={(e) => {
                            // Calculate max seats correctly: use remaining seats if table has orders, otherwise use full capacity
                            const maxSeats = activeTable.orderDetails?.remainingSeats !== undefined
                              ? activeTable.orderDetails.remainingSeats // Don't add guestCount - remainingSeats already accounts for existing orders
                              : (activeTable.capacity || 99);
                            const inputValue = parseInt(e.target.value) || 0;
                            const value = Math.max(1, Math.min(maxSeats, inputValue));
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
                        {waiter.activeOrdersCount > 0 ? ` (${waiter.activeOrdersCount} active order${waiter.activeOrdersCount > 1 ? 's' : ''})` : ''}
                      </option>
                    ))
                  )}
                </select>
                {(() => {
                  const selectedWaiter = waiterOptions.find(w => w.id === selectedWaiterId);
                  return selectedWaiter && selectedWaiter.activeOrdersCount > 0 ? (
                    <div className="mt-2 flex items-center gap-2 text-xs">
                      <div className="flex items-center gap-1">
                        <div className="h-2 w-2 rounded-full bg-amber-500 animate-pulse"></div>
                        <span className="text-amber-400">
                          Waiter has {selectedWaiter.activeOrdersCount} active order{selectedWaiter.activeOrdersCount > 1 ? 's' : ''}
                        </span>
                      </div>
                    </div>
                  ) : null;
                })()}
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
                  {selectedCustomer && (
                    <Badge className="bg-amber-500/10 text-amber-200 border border-amber-500/30">
                      {selectedCustomer.loyaltyPoints || 0} Points
                    </Badge>
                  )}
                  {loyaltyRedemption.pointsRedeemed > 0 && (
                    <Badge className="bg-purple-500/10 text-purple-200 border border-purple-500/30">
                      -{formatCurrency(loyaltyRedemption.discount)} Discount
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
              {selectedCustomer && (
                <div className="mt-3 p-3 rounded-lg bg-amber-500/10 border border-amber-500/30">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-amber-200">Available Points:</span>
                    <span className="font-semibold text-amber-100">{selectedCustomer.loyaltyPoints || 0}</span>
                  </div>
                  {loyaltyRedemption.pointsRedeemed > 0 && (
                    <div className="mt-2 pt-2 border-t border-amber-500/30">
                      <div className="flex items-center justify-between text-xs text-amber-300">
                        <span>Redeeming:</span>
                        <span>{loyaltyRedemption.pointsRedeemed} points</span>
                      </div>
                      <div className="flex items-center justify-between text-xs text-amber-200 mt-1">
                        <span>Discount Applied:</span>
                        <span className="font-semibold">-{formatCurrency(loyaltyRedemption.discount)}</span>
                      </div>
                    </div>
                  )}
                  {cartSubtotal >= 1000 && loyaltyRedemption.pointsRedeemed === 0 && (selectedCustomer.loyaltyPoints || 0) >= 2000 && (
                    <div className="mt-2 text-xs text-amber-300">
                      💡 You can redeem {Math.floor((selectedCustomer.loyaltyPoints || 0) / 2000) * 2000} points for {formatCurrency(Math.floor((selectedCustomer.loyaltyPoints || 0) / 2000) * 20)} discount
                    </div>
                  )}
                  {cartSubtotal < 1000 && (selectedCustomer.loyaltyPoints || 0) >= 2000 && (
                    <div className="mt-2 text-xs text-amber-400">
                      ⚠️ Minimum order amount {formatCurrency(1000)} required for loyalty redemption
                    </div>
                  )}
                </div>
              )}
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
                {/* Delivery Zone & Fee */}
                <div className="sm:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Delivery Zone</label>
                    <select
                      className="w-full rounded-md bg-slate-950/60 border border-slate-850 text-slate-100 text-sm px-3 py-2"
                      value={(deliveryDetails as any).zoneId || ''}
                      onChange={(e) => {
                        const zoneId = e.target.value;
                        const selectedZone = deliveryZones.find((z) => z.id === zoneId);
                        setDeliveryDetails({
                          ...deliveryDetails,
                          ...(zoneId ? { zoneId } : {}),
                        } as any);
                        if (selectedZone) {
                          const fee = selectedZone.deliveryCharge ?? 0;
                          const feeStr = fee.toString();
                          setDeliveryFee(feeStr);
                          if (typeof window !== 'undefined') {
                            localStorage.setItem('pos_deliveryFee', feeStr);
                          }
                        }
                      }}
                      disabled={zonesLoading || deliveryZones.length === 0}
                    >
                      <option value="">
                        {zonesLoading
                          ? 'Loading zones...'
                          : deliveryZones.length === 0
                            ? 'No delivery zones configured'
                            : 'Select delivery zone'}
                      </option>
                      {deliveryZones.map((zone) => (
                        <option key={zone.id} value={zone.id}>
                          {zone.name} ({formatCurrency(zone.deliveryCharge)})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
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
          {/* Payment Method Selection - Quick Access */}
          <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-sm font-semibold text-slate-200">Payment Method</label>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setIsPaymentModalOpen(true)}
                className="text-xs text-sky-400 hover:text-sky-300"
              >
                Change
              </Button>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {paymentMethodsLoading ? (
                <div className="col-span-full text-center text-slate-400 py-2 text-xs">Loading payment methods...</div>
              ) : paymentMethods.length > 0 ? (
                paymentMethods.slice(0, 6).map((method) => {
                  const isSelected = fullPaymentMethod === method.code;
                  return (
                    <Button
                      key={method.id}
                      size="sm"
                      variant={isSelected ? 'primary' : 'secondary'}
                      onClick={() => setFullPaymentMethod(method.code)}
                      className={`flex items-center justify-center gap-2 text-xs ${
                        isSelected
                          ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                          : 'bg-slate-900/80 text-slate-200 hover:bg-slate-800/80'
                      }`}
                    >
                      {method.icon ? (
                        <span>{method.icon}</span>
                      ) : method.type === 'cash' ? (
                        '💵'
                      ) : (
                        <CreditCardIcon className="h-3 w-3" />
                      )}
                      <span className="truncate">{method.displayName || method.name}</span>
                    </Button>
                  );
                })
              ) : (
                <div className="col-span-full text-center text-slate-400 py-2 text-xs">
                  No payment methods available
                </div>
              )}
            </div>
            {fullPaymentMethod && (
              <div className="text-xs text-slate-400">
                Selected: <span className="font-semibold text-slate-200">
                  {paymentMethods.find(m => m.code === fullPaymentMethod)?.displayName || fullPaymentMethod}
                </span>
              </div>
            )}
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
                  onClick={() => setIsCalculatorOpen(true)}
                  className="flex items-center gap-2 bg-gray-100 dark:bg-slate-900/80 text-gray-700 dark:text-slate-100 hover:bg-gray-200 dark:hover:bg-slate-800/80"
                  title="Calculator (F5)"
                >
                  <CurrencyDollarIcon className="h-4 w-4" />
                  Calculator
                </Button>
                {paymentMode === 'pay-later' && (
                  <Button 
                    variant="secondary" 
                    onClick={handleCreateOrder} 
                    disabled={
                      checkoutBlocked 
                      || (orderType !== 'room-booking' && cart.length === 0)
                      || (orderType === 'room-booking' && !roomBookingIsValid)
                    }
                    title={
                      checkoutBlocked 
                        ? (requiresTable && !selectedTable ? 'Select a table first' 
                          : requiresDeliveryDetails && !deliveryIsValid ? `Complete delivery details: ${missingDeliveryFields.join(', ')}` 
                          : requiresTakeawayDetails && !takeawayIsValid ? `Complete takeaway details: ${missingTakeawayFields.join(', ')}` 
                          : requiresRoomService && !roomServiceIsValid ? 'Select a booking/room for room service' 
                          : requiresRoomBooking && !roomBookingIsValid ? 'Complete room booking details (select room, dates, and guest info)' 
                          : '') 
                        : (orderType === 'room-booking' && !roomBookingIsValid) 
                          ? 'Complete room booking details' 
                          : (orderType !== 'room-booking' && cart.length === 0) 
                            ? 'Add items to cart first' 
                            : ''
                    }
                  >
                    <ClockIcon className="mr-2 h-4 w-4" />
                    Create Order
                  </Button>
                )}
                <Button
                  variant="primary"
                  onClick={() => {
                    // If payment method is selected and it's not cash, open payment modal for amount entry
                    const selectedMethod = paymentMethods.find(m => m.code === fullPaymentMethod);
                    const needsAmountEntry = selectedMethod?.code !== 'cash' || paymentMode === 'pay-first';
                    if (needsAmountEntry) {
                      setIsPaymentModalOpen(true);
                    } else {
                      handlePayment();
                    }
                  }}
                  disabled={
                    (orderType !== 'room-booking' && orderType !== 'room-service' && cart.length === 0) 
                    || (orderType === 'room-booking' && checkoutBlocked)
                    || (orderType === 'room-service' && checkoutBlocked)
                    || (orderType !== 'room-booking' && orderType !== 'room-service' && checkoutBlocked)
                  }
                  className="bg-emerald-600 hover:bg-emerald-500"
                  title={checkoutBlocked ? (requiresTable && !selectedTable ? 'Select a table first' : requiresDeliveryDetails && !deliveryIsValid ? `Complete delivery details: ${missingDeliveryFields.join(', ')}` : requiresTakeawayDetails && !takeawayIsValid ? `Complete takeaway details: ${missingTakeawayFields.join(', ')}` : requiresRoomService && !roomServiceIsValid ? 'Select a booking/room for room service' : requiresRoomBooking && !roomBookingIsValid ? 'Complete room booking details' : '') : (orderType === 'room-booking' || orderType === 'room-service') ? '' : cart.length === 0 ? 'Add items to cart first' : paymentMode === 'pay-first' ? 'Pay-first mode: Payment required before order creation' : ''}
                >
                  <CreditCardIcon className="mr-2 h-4 w-4" />
                  {paymentMode === 'pay-first' ? 'Checkout' : 'Checkout'}
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
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Select Payment Method</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {paymentMethodsLoading ? (
                    <div className="col-span-full text-center text-slate-400 py-4">Loading payment methods...</div>
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
                              : 'bg-slate-900/80 text-slate-200 hover:bg-slate-800/80'
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
                    <div className="col-span-full text-center text-slate-400 py-4">
                      No payment methods available. Please configure payment methods in settings.
                    </div>
                  )}
                </div>
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
              {(() => {
                const selectedMethod = paymentMethods.find(m => m.code === fullPaymentMethod);
                const allowsChange = selectedMethod?.allowsChangeDue ?? (fullPaymentMethod === 'cash');
                return allowsChange && (
                  <div className="text-sm text-slate-300">
                    Change due:{' '}
                    <span className="font-semibold text-emerald-300">{formatCurrency(fullPaymentChange)}</span>
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
                      className="grid gap-3 sm:grid-cols-[160px_1fr_auto] items-center rounded-xl border border-slate-850 bg-slate-950/60 p-3"
                    >
                      <select
                        value={row.method}
                        onChange={(event) =>
                          updateMultiPaymentRow(row.id, { method: event.target.value })
                        }
                        className="rounded-lg border border-slate-800 bg-slate-900/80 px-3 py-2 text-sm text-slate-100 focus:border-sky-500 focus:outline-none"
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
                      {getOrderTypeLabel(queueDetail.orderType as OrderType)}
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
                        ? 'bg-emerald-500/10 text-emerald-200 border border-emerald-500/30'
                        : orderStatus === 'pending'
                        ? 'bg-amber-500/10 text-amber-200 border border-amber-500/30'
                        : orderStatus === 'cancelled'
                        ? 'bg-rose-500/10 text-rose-200 border border-rose-500/30'
                        : 'bg-slate-500/10 text-slate-200 border border-slate-500/30';
                      return (
                        <Badge className={badgeClass}>
                          {statusLabel}
                        </Badge>
                      );
                    })()}
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
                  className="bg-slate-950/60 border-slate-850 text-slate-100"
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
                    // Backend accepts 'cash', 'card', or 'split', but we use paymentBreakdown for actual method
                    const backendMethod = pendingOrderPaymentMethod === 'cash' ? 'cash' : 
                                         pendingOrderPaymentMethod === 'card' || pendingOrderPaymentMethod.includes('CARD') ? 'card' : 
                                         'split';
                    await processPayment({
                      orderId: occupiedTableModal.orderDetails.currentOrderId,
                      amount: orderAmount,
                      method: backendMethod,
                      transactionId: undefined,
                    }).unwrap();
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