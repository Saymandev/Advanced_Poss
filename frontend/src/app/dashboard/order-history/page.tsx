'use client';

import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { DataTable } from '@/components/ui/DataTable';
import { ImportButton } from '@/components/ui/ImportButton';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Select } from '@/components/ui/Select';
import { useRolePermissions } from '@/hooks/useRolePermissions';
import { useCancelPOSOrderMutation, useGetPOSOrderQuery, useGetPOSOrdersQuery, useGetPOSSettingsQuery, useProcessPaymentMutation, useRefundOrderMutation, useRefundItemsMutation, useExchangeOrderMutation, useUpdatePOSOrderMutation, usePrintReceiptPDFMutation, usePrintReceiptMutation, useGetPOSMenuItemsQuery } from '@/lib/api/endpoints/posApi';
import { useGetReviewByOrderQuery } from '@/lib/api/endpoints/reviewsApi';
import { useAppSelector } from '@/lib/store';
import { formatCurrency, formatDateTime } from '@/lib/utils';
import {
  ArrowPathIcon,
  ComputerDesktopIcon,
  CreditCardIcon,
  DocumentTextIcon,
  EyeIcon,
  MagnifyingGlassIcon,
  PlusIcon,
  PrinterIcon,
  QrCodeIcon,
  ShoppingCartIcon,
  StarIcon,
  UserIcon,
  XCircleIcon,
  ArrowsRightLeftIcon,
  PlusCircleIcon,
  MinusCircleIcon
} from '@heroicons/react/24/outline';
import { useRouter, useSearchParams } from 'next/navigation';
import { QRCodeSVG } from 'qrcode.react';
import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';

interface Order {
  id: string;
  orderNumber: string;
  customerName?: string;
  customerPhone?: string;
  tableNumber: number | string;
  status: string;
  orderType?: 'dine-in' | 'takeaway' | 'delivery' | string;
  waiterName?: string;
  items: Array<{
    id: string;
    name: string;
    quantity: number;
    
    price: number;
    basePrice?: number;
    notes?: string;
    variantSelections?: any[];
    addonSelections?: any[];
  }>;
  total: number;
  tax: number;
  serviceCharge?: number;
  tip?: number;
  discount?: number;
  taxRate?: number;
  serviceChargeRate?: number;
  paymentMethod?: 'cash' | 'card' | 'digital_wallet';
  paymentStatus: string;
  createdAt: string;
  updatedAt: string;
  servedAt?: string;
  completedAt?: string;
  paidAmount?: number;
  remainingAmount?: number;
}

type QuickRange = 'last7' | 'today' | 'yesterday' | 'thisMonth' | 'custom';

const formatDateInput = (date: Date) => {
  const tzOffsetMs = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - tzOffsetMs).toISOString().split('T')[0];
};

const computeDateRange = (range: QuickRange): { start: string; end: string } => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const end = new Date(today);

  switch (range) {
    case 'today':
      return { start: formatDateInput(today), end: formatDateInput(end) };
    case 'yesterday': {
      const start = new Date(today);
      start.setDate(start.getDate() - 1);
      return { start: formatDateInput(start), end: formatDateInput(start) };
    }
    case 'thisMonth': {
      const start = new Date(today.getFullYear(), today.getMonth(), 1);
      return { start: formatDateInput(start), end: formatDateInput(end) };
    }
    case 'last7':
    default: {
      const start = new Date(today);
      start.setDate(start.getDate() - 6);
      return { start: formatDateInput(start), end: formatDateInput(end) };
    }
  }
};

// Component to display rating for a specific menu item in an order
function OrderItemRating({ orderId, menuItemId }: { orderId: string; menuItemId: string }) {
  const { data: review } = useGetReviewByOrderQuery(orderId, { skip: !orderId });
  
  if (!review || !review.itemReviews || review.itemReviews.length === 0) {
    return (
      <div className="flex items-center justify-center gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <StarIcon key={star} className="w-4 h-4 text-gray-300 dark:text-gray-600" />
        ))}
      </div>
    );
  }

  const itemReview = review.itemReviews.find((ir: any) => {
    const id = ir.menuItemId?.toString() || ir.menuItemId;
    return id === menuItemId;
  });

  if (!itemReview || !itemReview.rating) {
    return (
      <div className="flex items-center justify-center gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <StarIcon key={star} className="w-4 h-4 text-gray-300 dark:text-gray-600" />
        ))}
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <StarIcon
          key={star}
          className={`w-4 h-4 ${
            star <= itemReview.rating
              ? 'text-yellow-400 fill-yellow-400'
              : 'text-gray-300 dark:text-gray-600'
          }`}
        />
      ))}
      <span className="text-xs text-gray-600 dark:text-gray-400 ml-1">
        {itemReview.rating.toFixed(1)}
      </span>
    </div>
  );
}

// Component to display overall review for an order
function OrderReview({ orderId }: { orderId: string }) {
  const { data: review } = useGetReviewByOrderQuery(orderId, { skip: !orderId });
  
  if (!review) {
    return <span className="text-gray-600 dark:text-gray-400">—</span>;
  }

  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2">
        <span className="text-xs text-gray-600 dark:text-gray-400">Overall:</span>
        <div className="flex items-center gap-0.5">
          {[1, 2, 3, 4, 5].map((star) => (
            <StarIcon
              key={star}
              className={`w-3 h-3 ${
                star <= review.overallRating
                  ? 'text-yellow-400 fill-yellow-400'
                  : 'text-gray-300 dark:text-gray-600'
              }`}
            />
          ))}
          <span className="text-xs text-gray-600 dark:text-gray-400 ml-1">
            {review.overallRating.toFixed(1)}
          </span>
        </div>
      </div>
      {review.waiterRating && (
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-600 dark:text-gray-400">Waiter:</span>
          <div className="flex items-center gap-0.5">
            {[1, 2, 3, 4, 5].map((star) => (
              <StarIcon
                key={star}
                className={`w-3 h-3 ${
                  star <= review.waiterRating!
                    ? 'text-yellow-400 fill-yellow-400'
                    : 'text-gray-300 dark:text-gray-600'
                }`}
              />
            ))}
            <span className="text-xs text-gray-600 dark:text-gray-400 ml-1">
              {review.waiterRating.toFixed(1)}
            </span>
          </div>
        </div>
      )}
      {review.foodRating && (
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-600 dark:text-gray-400">Food:</span>
          <div className="flex items-center gap-0.5">
            {[1, 2, 3, 4, 5].map((star) => (
              <StarIcon
                key={star}
                className={`w-3 h-3 ${
                  star <= review.foodRating
                    ? 'text-yellow-400 fill-yellow-400'
                    : 'text-gray-300 dark:text-gray-600'
                }`}
              />
            ))}
            <span className="text-xs text-gray-600 dark:text-gray-400 ml-1">
              {review.foodRating.toFixed(1)}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

export default function OrdersPage() {
  const { user, companyContext } = useAppSelector((state) => state.auth);
  const searchParams = useSearchParams();
  const router = useRouter();
  const { hasFeature } = useRolePermissions();
  const canAccessPOS = hasFeature('order-management');
  const urlSearch = searchParams.get('search') || '';
  
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isQRModalOpen, setIsQRModalOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [selectedOrderId, setSelectedOrderId] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState(urlSearch);
  const [committedSearch, setCommittedSearch] = useState(urlSearch);
  const [statusFilter, setStatusFilter] = useState('all');
  const [orderTypeFilter, setOrderTypeFilter] = useState<'all' | 'dine-in' | 'takeaway' | 'delivery'>('all');
  const [activeQuickRange, setActiveQuickRange] = useState<QuickRange>('last7');
  const [dateRange, setDateRange] = useState(() => computeDateRange('last7'));
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);
  
  const branchId = (user as any)?.branchId || 
                   (companyContext as any)?.branchId || 
                   (companyContext as any)?.branches?.[0]?._id ||
                   (companyContext as any)?.branches?.[0]?.id;
  
  const { data: ordersResponse, isLoading, error, refetch } = useGetPOSOrdersQuery({
    branchId,
    search: committedSearch || undefined,
    status: statusFilter !== 'all' ? statusFilter : undefined,
    orderType: orderTypeFilter !== 'all' ? orderTypeFilter : undefined,
    startDate: dateRange.start,
    endDate: dateRange.end,
    page: currentPage,
    limit: itemsPerPage,
  }, { skip: !branchId });
  
  const { data: selectedOrderData } = useGetPOSOrderQuery(selectedOrderId, {
    skip: !selectedOrderId || !isViewModalOpen,
  });
  
  // Get POS settings for tax rate and service charge
  const { data: posSettings } = useGetPOSSettingsQuery({
    branchId: branchId || undefined,
  }, { skip: !branchId });
  
  const [updatePOSOrder, { isLoading: isUpdating }] = useUpdatePOSOrderMutation();
  const [cancelPOSOrder, { isLoading: isCancelling }] = useCancelPOSOrderMutation();
  const [processPayment, { isLoading: isProcessingPayment }] = useProcessPaymentMutation();
  const [refundOrder, { isLoading: isRefunding }] = useRefundOrderMutation();
  const [refundItemsMutation, { isLoading: isRefundingItems }] = useRefundItemsMutation();
  const [printReceiptPDF] = usePrintReceiptPDFMutation();
  const [printReceipt] = usePrintReceiptMutation();

  const [isRefundModalOpen, setIsRefundModalOpen] = useState(false);
  const [isCollectModalOpen, setIsCollectModalOpen] = useState(false);
  const [collectOrder, setCollectOrder] = useState<any>(null);
  const [collectAmount, setCollectAmount] = useState('');
  
  const { data: menuItemsData } = useGetPOSMenuItemsQuery({ branchId: branchId || undefined }, { skip: !branchId });
  const menuItems = menuItemsData || [];
  
  // Exchange States
  const [isExchangeModalOpen, setIsExchangeModalOpen] = useState(false);
  const [exchangeOrderMutation, { isLoading: isExchanging }] = useExchangeOrderMutation();
  const [exchangeReturnedItems, setExchangeReturnedItems] = useState<Array<{ menuItemId: string; name: string; quantity: number; maxQuantity: number; price: number; isWastage: boolean }>>([]);
  const [exchangeNewItems, setExchangeNewItems] = useState<Array<{ menuItemId: string; name: string; quantity: number; price: number }>>([]);
  const [exchangeReason, setExchangeReason] = useState('');
  const [exchangePaymentMethod, setExchangePaymentMethod] = useState('cash');
  const [exchangeSearchTerm, setExchangeSearchTerm] = useState('');
  
  // Refund States
  const [refundMode, setRefundMode] = useState<'full' | 'itemized'>('full');
  const [refundReason, setRefundReason] = useState('');
  const [refundAmount, setRefundAmount] = useState<number | ''>('');
  const [selectedRefundItems, setSelectedRefundItems] = useState<Array<{ menuItemId: string; name: string; quantity: number; maxQuantity: number; price: number; isWastage: boolean }>>([]);

  // Update search when URL param changes
  useEffect(() => {
    if (urlSearch && urlSearch !== committedSearch) {
      setSearchTerm(urlSearch);
      setCommittedSearch(urlSearch);
    }
  }, [urlSearch, committedSearch]);

  // Debounce search term changes so users don't have to manually click search/clear
  useEffect(() => {
    const timer = setTimeout(() => {
      const trimmed = searchTerm.trim();
      if (trimmed !== committedSearch) {
        setCommittedSearch(trimmed);
        setCurrentPage(1);
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [searchTerm, committedSearch]);

  const handleStatusUpdate = async (orderId: string, newStatus: string) => {
    try {
      await updatePOSOrder({ 
        id: orderId, 
        data: { status: newStatus as any } 
      }).unwrap();
      toast.success(`Order status updated to ${newStatus}`);
      refetch();
    } catch (error: any) {
      toast.error(error?.data?.message || 'Failed to update order status');
    }
  };

  const handleQuickRange = (range: QuickRange) => {
    setActiveQuickRange(range);
    setDateRange(computeDateRange(range));
    setCurrentPage(1);
  };

  const handleDateInputChange = (field: 'start' | 'end', value: string) => {
    if (!value) {
      return;
    }
    setDateRange((prev) => {
      const next = { ...prev, [field]: value } as { start: string; end: string };
      if (field === 'start' && new Date(value) > new Date(next.end)) {
        next.end = value;
      }
      if (field === 'end' && new Date(value) < new Date(next.start)) {
        next.start = value;
      }
      return next;
    });
    setActiveQuickRange('custom');
    setCurrentPage(1);
  };

  const handleStatusFilterChange = (value: string) => {
    setStatusFilter(value);
    setCurrentPage(1);
  };

  const handleOrderTypeFilterChange = (value: 'all' | 'dine-in' | 'takeaway' | 'delivery') => {
    setOrderTypeFilter(value);
    setCurrentPage(1);
  };

  const handleSearchSubmit = () => {
    const trimmed = searchTerm.trim();
    if (trimmed === committedSearch) return;
    setCommittedSearch(trimmed);
    setCurrentPage(1);
  };

  const handleClearSearch = () => {
    if (!committedSearch && !searchTerm) return;
    setSearchTerm('');
    setCommittedSearch('');
    setCurrentPage(1);
  };

  const handleRefresh = () => {
    refetch();
    toast.success('Orders refreshed');
  };
  
  // Extract orders from API response
  const orders = useMemo(() => {
    const items = ordersResponse?.orders ?? [];
    return items.map((order: any) => {
      const rawType = order.orderType || order.order_type || order.type || 'dine-in';
      const normalizedType = typeof rawType === 'string' ? rawType.replace('_', '-') : 'dine-in';

      return {
        id: order._id || order.id,
        orderNumber: order.orderNumber,
        customerName: order.customerInfo?.name || order.customerName || (order.customerId?.firstName ? `${order.customerId.firstName} ${order.customerId.lastName || ''}`.trim() : null) || 'Walk-in',
        customerPhone: order.customerInfo?.phone || order.customerPhone || order.customerId?.phone,
        tableNumber:
          order.tableId?.tableNumber ||
          order.tableId?.number ||
          order.tableNumber ||
          '—',
        status: order.status || 'pending',
        orderType: normalizedType,
        items:
          order.items?.map((item: any) => ({
            id: item._id || item.id || item.menuItemId?._id || item.menuItemId,
            name: item.menuItemId?.name || item.name || 'Unknown Item',
            quantity: item.quantity,
            price: item.price, // Actual price used in order (may include modifications)
            basePrice: item.basePrice || item.menuItemId?.price || item.price, // Use stored basePrice, fallback to populated menuItem price, then item price
            notes: item.notes,
          })) || [],
        total: order.totalAmount ?? order.total ?? 0,
        tax: order.taxAmount ?? order.tax ?? 0,
        serviceCharge: order.serviceChargeAmount ?? order.serviceCharge ?? 0,
        tip: order.tipAmount ?? order.tip,
        discount: order.loyaltyDiscount ?? order.discountAmount ?? order.discount ?? 0,
        taxRate: order.taxRate ?? posSettings?.taxRate ?? 0,
        serviceChargeRate: order.serviceChargeRate ?? posSettings?.serviceCharge ?? 0,
        paymentMethod: order.paymentMethod,
        paymentStatus: order.paymentStatus || (order.status === 'paid' ? 'paid' : 'pending'),
        createdAt: order.createdAt || new Date().toISOString(),
        updatedAt: order.updatedAt || new Date().toISOString(),
        servedAt: order.servedAt,
        completedAt: order.completedAt,
        waiterName:
          order.userId?.name ||
          [order.userId?.firstName, order.userId?.lastName]
            .filter(Boolean)
            .join(' ') ||
          order.waiterName,
        paidAmount: order.paidAmount ?? 0,
        remainingAmount: order.remainingAmount ?? Math.max(0, (order.totalAmount || order.total || 0) - (order.paidAmount || 0)),
      };
    });
  }, [ordersResponse, posSettings]);
  
  const totalOrders = useMemo(() => {
    if (typeof ordersResponse?.total === 'number') {
      return ordersResponse.total;
    }
    return orders.length;
  }, [ordersResponse, orders.length]);

  const getOrderReviewURL = (order: Order): string => {
    // Link to customer review page using order ID
    // Check if company has custom domain
    const company = (companyContext as any)?.company;
    if (company?.customDomain && company?.domainVerified) {
      return `https://${company.customDomain}/display/customerreview/${order.id}`;
    }
    // Fallback to base URL
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';
    return `${baseUrl}/display/customerreview/${order.id}`;
  };

  const handleReceiptPrint = async (orderId: string, usePDF: boolean = false) => {
    try {
      if (usePDF) {
        const result = await printReceiptPDF({
          orderId,
          printerId: undefined,
        }).unwrap();
        toast.success(result.message || 'Receipt sent to printer');
      } else {
        const result = await printReceipt({
          orderId,
          printerId: undefined,
        }).unwrap();
        toast.success(result.message || 'Receipt sent to printer');
      }
    } catch (error: any) {
      console.error('Error printing receipt:', error);
      toast.error(error?.data?.message || 'Failed to print receipt. Please try again.');
    }
  };

  const handleKOTPrint = (order: Order) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast.error('Please allow popups to print KOT');
      return;
    }

    const kotHTML = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>KOT - ${order.orderNumber}</title>
          <style>
            @media print {
              @page { margin: 0.5cm; }
            }
            body {
              font-family: 'Courier New', monospace;
              font-size: 12px;
              margin: 0;
              padding: 10px;
              max-width: 80mm;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              min-height: 100vh;
            }
            .container {
              width: 100%;
              max-width: 80mm;
            }
            .header {
              text-align: center;
              border-bottom: 2px dashed #000;
              padding-bottom: 10px;
              margin-bottom: 10px;
            }
            .header h1 {
              margin: 0;
              font-size: 18px;
              font-weight: bold;
            }
            .header h2 {
              margin: 5px 0;
              font-size: 14px;
            }
            .info {
              margin: 10px 0;
              padding: 5px 0;
              border-bottom: 1px dashed #ccc;
            }
            .info-row {
              display: flex;
              justify-content: space-between;
              margin: 3px 0;
            }
            .items {
              margin: 10px 0;
            }
            .item {
              margin: 8px 0;
              padding: 5px 0;
              border-bottom: 1px dotted #ccc;
            }
            .item-header {
              display: flex;
              justify-content: space-between;
              font-weight: bold;
            }
            .item-notes {
              font-size: 10px;
              color: #444;
              margin-top: 2px;
              margin-left: 10px;
            }
            .item-warning {
              margin-top: 4px;
              color: #000;
              font-weight: bold;
              background: #eee;
              padding: 2px 4px;
              font-size: 0.9em;
            }
            .total {
              margin-top: 10px;
              padding-top: 10px;
              border-top: 2px dashed #000;
              text-align: right;
            }
            .total-row {
              display: flex;
              justify-content: space-between;
              margin: 5px 0;
            }
            .total-final {
              font-weight: bold;
              font-size: 14px;
              margin-top: 5px;
            }
            .footer {
              text-align: center;
              margin-top: 15px;
              padding-top: 10px;
              border-top: 1px dashed #000;
              font-size: 10px;
            }
          </style>
        </head>
        <body>
          <div class="container">
          <div class="header">
            <h1>KITCHEN ORDER TICKET</h1>
            <h2>Token #${order.orderNumber.split('-').pop() || order.orderNumber}</h2>
          </div>
          
          <div class="info">
            <div class="info-row">
              <span>Order #:</span>
              <span>${order.orderNumber}</span>
            </div>
            <div class="info-row">
              <span>Table:</span>
              <span>${order.tableNumber === '—' ? 'N/A' : order.tableNumber}</span>
            </div>
            <div class="info-row">
              <span>Type:</span>
              <span>${(order.orderType || 'Dine-In').toUpperCase()}</span>
            </div>
            <div class="info-row">
              <span>Waiter:</span>
              <span>${order.waiterName || 'N/A'}</span>
            </div>
            <div class="info-row">
              <span>Time:</span>
              <span>${new Date(order.createdAt).toLocaleTimeString()}</span>
            </div>
            ${order.customerName ? `
            <div class="info-row">
              <span>Customer:</span>
              <span>${order.customerName}</span>
            </div>
            ` : ''}
          </div>

          <div class="items">
            <h3 style="margin: 10px 0 5px 0; font-size: 14px;">ITEMS:</h3>
            ${order.items.map(item => {
              const variantNotes = item.variantSelections && item.variantSelections.length > 0 
                ? `<div class="item-notes">- ${item.variantSelections.map(v => v.variantName || v.name).join(', ')}</div>` : '';
              const addonNotes = item.addonSelections && item.addonSelections.length > 0
                ? `<div class="item-notes">+ ${item.addonSelections.map(a => a.addonName || a.name).join(', ')}</div>` : '';
              const specialNotes = item.notes ? `<div class="item-warning">⚠️ ${item.notes}</div>` : '';
              
              return `
              <div class="item">
                <div class="item-header">
                  <span>${item.quantity}x ${item.name}</span>
                </div>
                ${variantNotes}
                ${addonNotes}
                ${specialNotes}
              </div>
            `}).join('')}
          </div></div>

          <div class="total">
            ${(() => {
              // Calculate subtotal from items
              const subtotal = order.items.reduce((sum: number, item: any) => sum + (item.price * item.quantity), 0);
              // Calculate service charge backwards: Total = Subtotal + ServiceCharge + Tax
              // So: ServiceCharge = Total - Subtotal - Tax
              const serviceCharge = Math.max(0, order.total - subtotal - (order.tax || 0));
              // Calculate service charge rate for display
              const serviceChargeRate = subtotal > 0 ? Math.round((serviceCharge / subtotal) * 100) : 0;
              // Tax is already provided in order.tax
              return `
                <div class="total-row">
                  <span>Subtotal:</span>
                  <span>${formatCurrency(subtotal)}</span>
                </div>
                ${serviceCharge > 0 ? `
                <div class="total-row">
                  <span>SC (${serviceChargeRate}%):</span>
                  <span>${formatCurrency(serviceCharge)}</span>
                </div>
                ` : ''}
                ${(order.tax || 0) > 0 ? `
                <div class="total-row">
                  <span>Tax:</span>
                  <span>${formatCurrency(order.tax)}</span>
                </div>
                ` : ''}
              `;
            })()}
            ${order.tip ? `
            <div class="total-row">
              <span>Tip:</span>
              <span>${formatCurrency(order.tip)}</span>
            </div>
            ` : ''}
            ${order.discount ? `
            <div class="total-row">
              <span>Discount:</span>
              <span>-${formatCurrency(order.discount)}</span>
            </div>
            ` : ''}
            <div class="total-row total-final">
              <span>TOTAL:</span>
              <span>${formatCurrency(order.total + (order.tip || 0) - (order.discount || 0))}</span>
            </div>
          </div>

          <div class="footer">
            <div>${new Date(order.createdAt).toLocaleString()}</div>
            <div style="margin-top: 5px;">Thank you!</div>
          </div>
          </div>
        </body>
      </html>
    `;

    printWindow.document.write(kotHTML);
    printWindow.document.close();
    
    setTimeout(() => {
      printWindow.print();
      printWindow.onafterprint = () => printWindow.close();
    }, 250);
    
    toast.success('KOT sent to printer');
  };

  const handleDeleteOrder = async (orderId: string) => {
    if (!confirm('Are you sure you want to cancel this order? This action cannot be undone.')) {
      return;
    }
    
    try {
      await cancelPOSOrder({ 
        id: orderId, 
        reason: 'Cancelled from order history page' 
      }).unwrap();
      toast.success('Order cancelled successfully. Table has been freed if applicable.');
      refetch();
      if (selectedOrderId === orderId) {
        setIsViewModalOpen(false);
        setSelectedOrderId('');
      }
    } catch (error: any) {
      toast.error(error?.data?.message || 'Failed to cancel order');
    }
  };

  const handleRefundSubmit = async () => {
    if (!selectedOrder) return;
    
    if (refundMode === 'full') {
      if (!refundAmount || Number(refundAmount) <= 0) {
        toast.error('Please enter a valid refund amount');
        return;
      }
      if (Number(refundAmount) > selectedOrder.total) {
        toast.error('Refund amount cannot exceed order total');
        return;
      }
      if (!refundReason.trim()) {
        toast.error('Please enter a refund reason');
        return;
      }

      try {
        await refundOrder({
          orderId: selectedOrder.id,
          amount: Number(refundAmount),
          reason: refundReason,
        }).unwrap();
        
        toast.success('Refund processed successfully');
        setIsRefundModalOpen(false);
        setRefundReason('');
        setRefundAmount('');
        refetch();
        if (selectedOrderId === selectedOrder.id) {
          setIsViewModalOpen(false);
          setSelectedOrderId('');
        }
      } catch (error: any) {
        toast.error(error?.data?.message || error?.message || 'Failed to process refund');
      }
    } else {
      // Itemized refund
      const itemsToRefund = selectedRefundItems.filter(i => i.quantity > 0);
      if (itemsToRefund.length === 0) {
        toast.error('Please select at least one item to refund');
        return;
      }
      
      try {
        await refundItemsMutation({
          orderId: selectedOrder.id,
          items: itemsToRefund.map(i => ({
            menuItemId: i.menuItemId,
            quantity: i.quantity,
            isWastage: i.isWastage
          })),
          reason: refundReason || 'Itemized refund',
        }).unwrap();
        
        toast.success('Itemized refund processed successfully');
        setIsRefundModalOpen(false);
        setRefundReason('');
        refetch();
        if (selectedOrderId === selectedOrder.id) {
          setIsViewModalOpen(false);
          setSelectedOrderId('');
        }
      } catch (error: any) {
        toast.error(error?.data?.message || error?.message || 'Failed to process itemized refund');
      }
    }
  };

  const openRefundModal = (order: Order) => {
    setSelectedOrder(order);
    setSelectedOrderId(order.id);
    setRefundAmount(order.total);
    setRefundReason('');
    setRefundMode('full');
    
    if (order.items && order.items.length > 0) {
      setSelectedRefundItems(order.items.map((item: any) => ({
        menuItemId: item.id || item.menuItemId,
        name: item.name,
        quantity: 0,
        maxQuantity: item.quantity,
        price: item.price,
        isWastage: false
      })));
    } else {
      setSelectedRefundItems([]);
    }
    
    setIsRefundModalOpen(true);
  };

  const openExchangeModal = (order: Order) => {
    setSelectedOrder(order);
    setSelectedOrderId(order.id);
    setExchangeReason('');
    setExchangeNewItems([]);
    setExchangeSearchTerm('');
    setExchangePaymentMethod('cash');
    
    if (order.items && order.items.length > 0) {
      setExchangeReturnedItems(order.items.map((item: any) => ({
        menuItemId: item.id || item.menuItemId,
        name: item.name,
        quantity: 0,
        maxQuantity: item.quantity,
        price: item.price,
        isWastage: false
      })));
    } else {
      setExchangeReturnedItems([]);
    }
    
    setIsExchangeModalOpen(true);
  };

  const handleExchangeSubmit = async () => {
    if (!selectedOrder) return;
    
    const returnedItemsToProcess = exchangeReturnedItems.filter(i => i.quantity > 0);
    if (returnedItemsToProcess.length === 0) {
      toast.error('Please select at least one item to return');
      return;
    }
    if (exchangeNewItems.length === 0) {
      toast.error('Please add at least one new item to exchange');
      return;
    }
    
    try {
      await exchangeOrderMutation({
        orderId: selectedOrder.id,
        returnedItems: returnedItemsToProcess.map(i => ({
          menuItemId: i.menuItemId,
          quantity: i.quantity,
          isWastage: i.isWastage
        })),
        newItems: exchangeNewItems.map(i => ({
          menuItemId: i.menuItemId,
          quantity: i.quantity
        })),
        paymentMethod: exchangePaymentMethod,
        reason: exchangeReason || 'Hybrid Exchange'
      }).unwrap();
      
      toast.success('Exchange processed successfully');
      setIsExchangeModalOpen(false);
      refetch();
      if (selectedOrderId === selectedOrder.id) {
        setIsViewModalOpen(false);
        setSelectedOrderId('');
      }
    } catch (error: any) {
      toast.error(error?.data?.message || error?.message || 'Failed to process exchange');
    }
  };

  const handleCollectPayment = async () => {
    if (!collectOrder || !collectAmount) return;
    try {
      await processPayment({
        orderId: collectOrder.id,
        amount: parseFloat(collectAmount),
        method: 'cash',
        amountReceived: parseFloat(collectAmount),
        changeDue: 0,
      }).unwrap();
      toast.success('Payment collected');
      setIsCollectModalOpen(false);
      setCollectOrder(null);
      refetch();
    } catch (e: any) {
      toast.error(e?.data?.message || 'Collection failed');
    }
  };

  const openViewModal = (order: Order) => {
    setSelectedOrder(order);
    setSelectedOrderId(order.id);
    setIsViewModalOpen(true);
  };
  
  // Update selected order when data loads
  useEffect(() => {
    if (selectedOrderData && selectedOrderId) {
      const orderData = selectedOrderData as any;
      const rawType = orderData.orderType || orderData.order_type || orderData.type || 'dine-in';
      const normalizedType = typeof rawType === 'string' ? rawType.replace('_', '-') : 'dine-in';

      setSelectedOrder({
        id: orderData._id || orderData.id,
        orderNumber: orderData.orderNumber,
        customerName: orderData.customerInfo?.name || orderData.customerName || 'Walk-in',
        customerPhone: orderData.customerInfo?.phone || orderData.customerPhone,
        tableNumber:
          orderData.tableId?.tableNumber ||
          orderData.tableId?.number ||
          orderData.tableNumber ||
          '—',
        status: orderData.status || 'pending',
        orderType: normalizedType,
        items:
          orderData.items?.map((item: any) => ({
            id: item._id || item.id || item.menuItemId?._id || item.menuItemId,
            name: item.menuItemId?.name || item.name || 'Unknown Item',
            quantity: item.quantity,
            price: item.price, // Actual price used in order (may include modifications)
            basePrice: item.basePrice || item.menuItemId?.price || item.price, // Use stored basePrice, fallback to populated menuItem price, then item price
            notes: item.notes,
            variantSelections: item.variantSelections || [],
            addonSelections: item.addonSelections || [],
          })) || [],
        total: orderData.totalAmount ?? orderData.total ?? 0,
        tax: orderData.taxAmount ?? orderData.tax ?? 0,
        serviceCharge: orderData.serviceChargeAmount ?? orderData.serviceCharge ?? 0,
        tip: orderData.tipAmount ?? orderData.tip,
        discount: orderData.loyaltyDiscount ?? orderData.discountAmount ?? orderData.discount ?? 0,
        taxRate: orderData.taxRate ?? posSettings?.taxRate ?? 0,
        serviceChargeRate: orderData.serviceChargeRate ?? posSettings?.serviceCharge ?? 0,
        paymentMethod: orderData.paymentMethod,
        paymentStatus: orderData.paymentStatus || (orderData.status === 'paid' ? 'paid' : 'pending'),
        createdAt: orderData.createdAt || new Date().toISOString(),
        updatedAt: orderData.updatedAt || new Date().toISOString(),
        servedAt: orderData.servedAt,
        completedAt: orderData.completedAt,
        waiterName:
          orderData.userId?.name ||
          [orderData.userId?.firstName, orderData.userId?.lastName]
            .filter(Boolean)
            .join(' ') ||
          orderData.waiterName,
        paidAmount: orderData.paidAmount ?? 0,
        remainingAmount: orderData.remainingAmount ?? Math.max(0, (orderData.totalAmount || orderData.total || 0) - (orderData.paidAmount || 0)),
      });
    }
  }, [selectedOrderData, selectedOrderId, posSettings]);

  const getStatusBadge = (status: Order['status']) => {
    const variants: Record<string, 'warning' | 'info' | 'success' | 'secondary' | 'danger'> = {
      pending: 'warning',
      paid: 'success',
      confirmed: 'info',
      preparing: 'info',
      ready: 'success',
      served: 'success',
      completed: 'secondary',
      cancelled: 'danger',
    };

    return <Badge variant={variants[status] || 'secondary'}>{status}</Badge>;
  };

  const getPaymentStatusBadge = (status: Order['paymentStatus']) => {
    const variants: Record<string, 'warning' | 'success' | 'danger' | 'secondary'> = {
      pending: 'warning',
      unpaid: 'warning',
      partial: 'warning',
      paid: 'success',
      refunded: 'danger',
      cancelled: 'danger',
    };

    const labelMap: Record<string, string> = {
      pending: 'Unpaid',
      unpaid: 'Unpaid',
      partial: 'Partial',
      paid: 'Paid',
      refunded: 'Refunded',
      cancelled: 'Cancelled',
    };

    const label = labelMap[status as string] || (typeof status === 'string' ? status.charAt(0).toUpperCase() + status.slice(1) : 'Unknown');
    const variant = variants[status as string] || 'secondary';
    return <Badge variant={variant}>{label}</Badge>;
  };

  const getOrderTypeBadge = (type?: Order['orderType']) => {
    const config: Record<string, { label: string; variant: 'secondary' | 'info' | 'success' }> = {
      'dine-in': { label: 'Dine-In', variant: 'info' },
      takeaway: { label: 'Takeaway', variant: 'secondary' },
      delivery: { label: 'Delivery', variant: 'success' },
    };

    const fallback = { label: type || 'Unknown', variant: 'secondary' as const };
    const entry = (type && config[type]) || fallback;
    return <Badge variant={entry.variant}>{entry.label}</Badge>;
  };

  const columns = [
    {
      key: 'orderNumber',
      title: 'Order #',
      sortable: true,
      render: (value: string, row: Order) => (
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
            <ShoppingCartIcon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <p className="font-medium text-gray-900 dark:text-white">{value}</p>
              {(row as any).isExchanged && (
                <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 border border-purple-200 dark:border-purple-800">
                  Exchanged {((row as any).exchangeCount || 0) > 1 ? `(${(row as any).exchangeCount}x)` : ''}
                </span>
              )}
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {typeof row.tableNumber === 'number' ? `Table ${row.tableNumber}` : row.tableNumber}
            </p>
          </div>
        </div>
      ),
    },
    {
      key: 'customerName',
      title: 'Customer',
      render: (value: string) => (
        <div className="flex items-center gap-2">
          <UserIcon className="w-4 h-4 text-gray-400" />
          <span className="text-sm text-gray-600 dark:text-gray-400">
            {value || 'Walk-in'}
          </span>
        </div>
      ),
    },
    {
      key: 'items',
      title: 'Items',
      render: (value: any, row: Order) => (
        <div className="text-sm text-gray-600 dark:text-gray-400">
          {row.items.length} items
          <br />
          <span className="font-medium text-gray-900 dark:text-white">
            {formatCurrency(row.total)}
          </span>
        </div>
      ),
    },
    {
      key: 'status',
      title: 'Status',
      render: (value: Order['status']) => getStatusBadge(value),
    },
    {
      key: 'orderType',
      title: 'Type',
      render: (value: Order['orderType']) => getOrderTypeBadge(value),
    },
    
    {
      key: 'createdAt',
      title: 'Time',
      render: (value: string) => (
        <span className="text-sm text-gray-600 dark:text-gray-400">
          {new Date(value).toLocaleTimeString()}
        </span>
      ),
    },
    {
      key: 'actions',
      title: 'Actions',
      render: (value: any, row: Order) => (
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => openViewModal(row)}
          >
            <EyeIcon className="w-4 h-4" />
          </Button>
          {canAccessPOS && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                const rawType = (row as any).orderType || (row as any).order_type || (row as any).type || '';
                const isCounterSale = rawType === 'counter_sale' || rawType === 'counter-sale';
                const posPath = isCounterSale ? '/dashboard/retail-pos' : '/dashboard/pos';
                router.push(`${posPath}?orderId=${row.id}`);
              }}
              title="View in POS"
            >
              <ComputerDesktopIcon className="w-4 h-4" />
            </Button>
          )}
        </div>
      ),
    },
  ];

  const filteredOrders = useMemo(() => {
    let filtered = orders;

    if (statusFilter !== 'all') {
      filtered = filtered.filter((order) => order.status === statusFilter);
    }

    if (orderTypeFilter !== 'all') {
      filtered = filtered.filter((order) => (order.orderType || 'dine-in') === orderTypeFilter);
    }

    if (committedSearch) {
      const query = committedSearch.toLowerCase();
      filtered = filtered.filter((order) =>
        order.orderNumber.toLowerCase().includes(query) ||
        (order.customerName && order.customerName.toLowerCase().includes(query)) ||
        (order.customerPhone && order.customerPhone.includes(query))
      );
    }

    return filtered;
  }, [orders, statusFilter, orderTypeFilter, committedSearch]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">Orders Management</h1>
          <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 mt-1">
            Manage {companyContext?.businessType === 'retail' ? 'business' : 'restaurant'} orders and transactions
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <ImportButton
            onImport={async (_data, _result) => {
              toast.success('Orders are typically created through the POS system. Import functionality is for reference only.');
            }}
            columns={[
              { key: 'orderNumber', label: 'Order Number', type: 'string' },
              { key: 'customerName', label: 'Customer Name', type: 'string' },
              { key: 'total', label: 'Total Amount', type: 'number' },
              { key: 'status', label: 'Status', type: 'string' },
            ]}
            filename="order-history-import-template"
            variant="secondary"
          />
          <Button onClick={() => {
            const posPath = companyContext?.businessType === 'retail' ? '/dashboard/retail-pos' : '/dashboard/pos';
            window.open(posPath, '_blank');
          }} className="w-full sm:w-auto">
            <PlusIcon className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
            <span className="text-sm sm:text-base">New Order</span>
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-6 space-y-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Input
                placeholder="Search by Invoice, Name, or Phone..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault();
                    handleSearchSubmit();
                  }
                }}
                className="pl-10 text-sm sm:text-base"
              />
              <MagnifyingGlassIcon className="h-4 w-4 sm:h-5 sm:w-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            </div>
            <div className="flex gap-2">
              <Button variant="primary" onClick={handleSearchSubmit} disabled={searchTerm.trim() === committedSearch.trim()} className="flex-1 sm:flex-initial text-sm sm:text-base">
                Search
              </Button>
              {(searchTerm || committedSearch) && (
                <Button variant="secondary" onClick={handleClearSearch} className="flex-1 sm:flex-initial text-sm sm:text-base">
                  Clear
                </Button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            <Select
              options={[
                { value: 'all', label: 'All Status' },
                { value: 'pending', label: 'Pending' },
                { value: 'paid', label: 'Paid' },
                { value: 'cancelled', label: 'Cancelled' },
              ]}
              value={statusFilter}
              onChange={handleStatusFilterChange}
              placeholder="Filter by status"
            />
            <Select
              options={[
                { value: 'all', label: 'All Types' },
                { value: 'dine-in', label: 'Dine-In' },
                { value: 'takeaway', label: 'Takeaway' },
                { value: 'delivery', label: 'Delivery' },
              ]}
              value={orderTypeFilter}
              onChange={(value) => handleOrderTypeFilterChange(value as 'all' | 'dine-in' | 'takeaway' | 'delivery')}
              placeholder="Filter by type"
            />
            <div className="flex items-center sm:col-span-2 md:col-span-1">
              <Button
                variant="secondary"
                onClick={handleRefresh}
                className="flex items-center gap-2 w-full sm:w-auto text-sm sm:text-base"
              >
                <ArrowPathIcon className="h-4 w-4" />
                <span>Refresh</span>
              </Button>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              {([
                { label: 'Last 7 Days', value: 'last7' },
                { label: 'Today', value: 'today' },
                { label: 'Yesterday', value: 'yesterday' },
                { label: 'This Month', value: 'thisMonth' },
              ] as Array<{ label: string; value: QuickRange }>).map(({ label, value }) => (
                <Button
                  key={value}
                  variant={activeQuickRange === value ? 'primary' : 'secondary'}
                  onClick={() => handleQuickRange(value)}
                  className={`text-xs sm:text-sm ${activeQuickRange === value ? '' : 'bg-slate-900/80 text-slate-100 hover:bg-slate-800/80'}`}
                >
                  {label}
                </Button>
              ))}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Start Date</label>
                <Input
                  type="date"
                  value={dateRange.start}
                  max={dateRange.end}
                  onChange={(event) => handleDateInputChange('start', event.target.value)}
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">End Date</label>
                <Input
                  type="date"
                  value={dateRange.end}
                  min={dateRange.start}
                  onChange={(event) => handleDateInputChange('end', event.target.value)}
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Orders Table */}
      {isLoading ? (
        <Card>
          <CardContent className="p-6">
            <div className="text-center py-12">
              <p className="text-gray-500 dark:text-gray-400">Loading orders...</p>
            </div>
          </CardContent>
        </Card>
      ) : error ? (
        <Card>
          <CardContent className="p-6">
            <div className="text-center py-12">
              <p className="text-red-600">Error loading orders. Please try again.</p>
              <Button onClick={() => refetch()} className="mt-4">
                Retry
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <DataTable
          data={filteredOrders}
          columns={columns}
          loading={isLoading}
          searchable={false}
          selectable={true}
          pagination={{
            currentPage,
            totalPages: Math.ceil(totalOrders / itemsPerPage),
            itemsPerPage,
            totalItems: totalOrders,
            onPageChange: setCurrentPage,
            onItemsPerPageChange: setItemsPerPage,
          }}
          exportable={true}
          exportFilename="orders"
          onExport={(_format, _items) => {
            // Export is handled automatically by ExportButton component
          }}
          emptyMessage="No orders found."
        />
      )}

      {/* Order Details Modal */}
      <Modal
        isOpen={isViewModalOpen}
        onClose={() => {
          setIsViewModalOpen(false);
          setSelectedOrder(null);
          setSelectedOrderId('');
        }}
        title=""
        className="max-w-6xl"
      >
        {selectedOrder && (
          <div className="space-y-6">
            {/* Modal Header with Actions */}
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 border-b border-gray-200 dark:border-gray-700 pb-4">
              <div className="flex items-center gap-3">
                <DocumentTextIcon className="w-5 h-5 sm:w-6 sm:h-6 text-gray-600 dark:text-gray-400 flex-shrink-0" />
                <div>
                  <h2 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white">Order Details</h2>
                  <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mt-1">
                    Token #{selectedOrder?.orderNumber?.split('-')?.pop() || selectedOrder?.orderNumber}
                  </p>
                </div>
              </div>
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                {selectedOrder?.status === 'pending' && (
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => handleStatusUpdate(selectedOrder.id, 'confirmed')}
                    disabled={isUpdating}
                    className="flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white w-full sm:w-auto"
                  >
                    <ArrowPathIcon className={`w-4 h-4 ${isUpdating ? 'animate-spin' : ''}`} />
                    <span className="text-sm">{isUpdating ? 'Confirming...' : 'Confirm Order'}</span>
                  </Button>
                )}
                {selectedOrder?.paymentStatus === 'paid' && (
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      setIsViewModalOpen(false);
                      openRefundModal(selectedOrder);
                    }}
                    className="flex items-center justify-center gap-2 bg-orange-100 hover:bg-orange-200 text-orange-700 w-full sm:w-auto"
                  >
                    Refund
                  </Button>
                )}
                {selectedOrder?.paymentStatus === 'paid' && (
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      setIsViewModalOpen(false);
                      openExchangeModal(selectedOrder);
                    }}
                    className="flex items-center justify-center gap-2 bg-purple-100 hover:bg-purple-200 text-purple-700 w-full sm:w-auto"
                  >
                    <ArrowsRightLeftIcon className="w-4 h-4" />
                    Exchange
                  </Button>
                )}
                {selectedOrder?.paymentStatus === 'partial' && (
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => {
                      setIsViewModalOpen(false);
                      const due = (selectedOrder as any).remainingAmount || (selectedOrder.total - ((selectedOrder as any).paidAmount || 0));
                      setCollectOrder(selectedOrder);
                      setCollectAmount(due > 0 ? due.toFixed(2) : selectedOrder.total.toFixed(2));
                      setIsCollectModalOpen(true);
                    }}
                    className="flex items-center justify-center gap-2 bg-amber-100 hover:bg-amber-200 text-amber-700 w-full sm:w-auto"
                  >
                    <CreditCardIcon className="w-4 h-4" />
                    Collect Payment
                  </Button>
                )}
                {canAccessPOS && (
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => {
                      const posPath = companyContext?.businessType === 'retail' ? '/dashboard/retail-pos' : '/dashboard/pos';
                      router.push(`${posPath}?orderId=${selectedOrder.id}`);
                    }}
                    className="flex items-center justify-center gap-2 w-full sm:w-auto"
                  >
                    <ComputerDesktopIcon className="w-4 h-4" />
                    Open in POS
                  </Button>
                )}
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setIsQRModalOpen(true)}
                  className="flex items-center justify-center gap-2 w-full sm:w-auto"
                >
                  <QrCodeIcon className="w-4 h-4" />
                  <span className="text-sm">Review QR</span>
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => handleReceiptPrint(selectedOrder.id, false)}
                  className="flex items-center justify-center gap-2 w-full sm:w-auto"
                >
                  <PrinterIcon className="w-4 h-4" />
                  <span className="text-sm">Print Receipt</span>
                </Button>
                {companyContext?.businessType !== 'retail' && (
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => handleKOTPrint(selectedOrder)}
                    className="flex items-center justify-center gap-2 w-full sm:w-auto"
                  >
                    <PrinterIcon className="w-4 h-4" />
                    <span className="text-sm">KOT Print</span>
                  </Button>
                )}
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => handleDeleteOrder(selectedOrder?.id)}
                  disabled={isCancelling}
                  className="flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 text-white w-full sm:w-auto"
                >
                  <XCircleIcon className="w-4 h-4" />
                  <span className="text-sm">{isCancelling ? 'Cancelling...' : 'Cancel Order'}</span>
                </Button>
              </div>
            </div>

            {/* Overview and Summary Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
              {/* Overview Section (Left) */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Overview</h3>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600 dark:text-gray-400">Invoice Number:</span>
                    <span className="font-medium text-gray-900 dark:text-white">{selectedOrder?.orderNumber?.replace(/[^0-9]/g, '').slice(-6) || selectedOrder?.orderNumber}</span>
                  </div>
                  {companyContext?.businessType !== 'retail' && (
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600 dark:text-gray-400">Table:</span>
                      <span className="font-medium text-gray-900 dark:text-white">{selectedOrder?.tableNumber === '—' ? '—' : selectedOrder?.tableNumber}</span>
                    </div>
                  )}
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600 dark:text-gray-400">Order Status:</span>
                    {getStatusBadge(selectedOrder?.status)}
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600 dark:text-gray-400">Payment Status:</span>
                    {getPaymentStatusBadge(selectedOrder?.paymentStatus)}
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600 dark:text-gray-400">Payment At:</span>
                    <span className="font-medium text-gray-900 dark:text-white">
                      {selectedOrder?.paymentStatus === 'paid' && selectedOrder?.completedAt
                        ? formatDateTime(selectedOrder?.completedAt)
                        : '—'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600 dark:text-gray-400">Order Type:</span>
                    <span className="font-medium text-gray-900 dark:text-white capitalize">
                      {selectedOrder?.orderType || 'Dine-In'}
                    </span>
                  </div>
                  {companyContext?.businessType !== 'retail' && (
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600 dark:text-gray-400">Waiter Name:</span>
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
                          <UserIcon className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                        </div>
                        <span className="font-medium text-gray-900 dark:text-white">
                          {selectedOrder?.waiterName || 'Default Waiter'}
                        </span>
                      </div>
                    </div>
                  )}
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600 dark:text-gray-400">Customer Name:</span>
                    <span className="font-medium text-gray-900 dark:text-white">
                      {selectedOrder?.customerName || '—'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600 dark:text-gray-400">Branch Name:</span>
                    <span className="font-medium text-gray-900 dark:text-white">
                      {(companyContext as any)?.branches?.[0]?.name || (companyContext as any)?.branchName || '—'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600 dark:text-gray-400">Order Date:</span>
                    <span className="font-medium text-gray-900 dark:text-white">
                      {selectedOrder?.createdAt ? formatDateTime(selectedOrder?.createdAt) : '—'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600 dark:text-gray-400">Customer Phone:</span>
                    <span className="font-medium text-gray-900 dark:text-white">
                      {selectedOrder?.customerPhone || '—'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600 dark:text-gray-400">Payment Method:</span>
                    <span className="font-medium text-gray-900 dark:text-white capitalize">
                      {selectedOrder?.paymentMethod || '—'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600 dark:text-gray-400">Payment Ref:</span>
                    <span className="font-medium text-gray-900 dark:text-white">—</span>
                  </div>
                </div>
              </div>

              {/* Summary Section (Right) */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Summary</h3>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600 dark:text-gray-400">Subtotal:</span>
                    <span className="font-medium text-gray-900 dark:text-white">
                      {formatCurrency(selectedOrder?.items?.reduce((sum: number, item: any) => sum + (item.price * item.quantity), 0) || 0)}
                    </span>
                  </div>
                  {(() => {
                    // Calculate subtotal from items
                    const subtotal = selectedOrder?.items?.reduce((sum: number, item: any) => sum + (item.price * item.quantity), 0) || 0;
                    
                    // Get discount amount from order (loyaltyDiscount or discountAmount)
                    const storedDiscount = selectedOrder?.discount || 0;
                    
                    // Get tax rate and service charge rate from order or settings
                    const taxRate = selectedOrder?.taxRate ?? posSettings?.taxRate ?? 0;
                    const serviceChargeRate = selectedOrder?.serviceChargeRate ?? posSettings?.serviceCharge ?? 0;
                    
                    const actualTotal = selectedOrder?.total || 0;
                    
                    // Reverse-engineer the discount and tax/SC from the actual total
                    // Based on POS payment screen logic (from pos/page.tsx line 877-879):
                    // taxableSubtotal = Math.max(base.subtotal - totalDiscount, 0);
                    // taxAmount = (taxableSubtotal * taxRate) / 100;
                    // total = taxableSubtotal + taxAmount + deliveryFeeValue;
                    //
                    // So the formula is:
                    // Total = (subtotal - discount) + (subtotal - discount) * taxRate/100
                    // Total = (subtotal - discount) * (1 + taxRate/100)
                    // (subtotal - discount) = Total / (1 + taxRate/100)
                    // discount = subtotal - Total / (1 + taxRate/100)
                    
                    let discount = storedDiscount;
                    let taxAmount = 0;
                    let serviceChargeAmount = 0;
                    
                    // First, try with stored discount
                    if (storedDiscount > 0 && storedDiscount <= subtotal) {
                      discount = storedDiscount;
                      const baseForTaxAndSC = subtotal - discount;
                      taxAmount = Math.round(baseForTaxAndSC * (taxRate / 100) * 100) / 100;
                      serviceChargeAmount = Math.round(baseForTaxAndSC * (serviceChargeRate / 100) * 100) / 100;
                      
                      // Verify calculation matches
                      const calculatedTotal = baseForTaxAndSC + taxAmount + serviceChargeAmount;
                      if (Math.abs(calculatedTotal - actualTotal) > 0.01) {
                        // Stored discount doesn't match, need to recalculate
                        discount = 0;
                      }
                    }
                    
                    // If no stored discount or it doesn't match, calculate it
                    if (discount === 0) {
                      const totalRate = taxRate + serviceChargeRate;
                      
                      if (totalRate > 0) {
                        // Calculate what the discounted subtotal should be based on the actual total
                        // Total = (subtotal - discount) * (1 + totalRate/100)
                        // (subtotal - discount) = Total / (1 + totalRate/100)
                        const discountedSubtotal = actualTotal / (1 + totalRate / 100);
                        discount = Math.max(0, subtotal - discountedSubtotal);
                        discount = Math.round(discount * 100) / 100;
                        
                        // Calculate tax and service charge on the discounted subtotal
                        const baseForTaxAndSC = subtotal - discount;
                        taxAmount = Math.round(baseForTaxAndSC * (taxRate / 100) * 100) / 100;
                        serviceChargeAmount = Math.round(baseForTaxAndSC * (serviceChargeRate / 100) * 100) / 100;
                        
                        // Verify: (subtotal - discount) + tax + sc should equal actualTotal
                        const calculatedTotal = baseForTaxAndSC + taxAmount + serviceChargeAmount;
                        const difference = Math.abs(calculatedTotal - actualTotal);
                        
                        // If there's a rounding difference, adjust tax to match
                        if (difference > 0.01 && difference < 1) {
                          // Small rounding difference, adjust tax to make total match
                          taxAmount = actualTotal - baseForTaxAndSC - serviceChargeAmount;
                          taxAmount = Math.round(taxAmount * 100) / 100;
                        }
                      } else {
                        // No tax or service charge, discount is just the difference
                        discount = Math.max(0, subtotal - actualTotal);
                        discount = Math.round(discount * 100) / 100;
                      }
                    }
                    
                    // Calculate discount percentage
                    const discountPercentage = discount > 0 && subtotal > 0
                      ? Math.round((discount / subtotal) * 100 * 100) / 100
                      : 0;
                    
                    return (
                      <>
                        {discount > 0 && (
                          <div className="flex justify-between items-center">
                            <span className="text-gray-600 dark:text-gray-400">
                              Discount{discountPercentage > 0 ? ` (${discountPercentage}%)` : ''}:
                            </span>
                            <span className="font-medium text-red-600 dark:text-red-400">
                              -{formatCurrency(discount)}
                            </span>
                          </div>
                        )}
                        {serviceChargeAmount > 0 && (
                          <div className="flex justify-between items-center">
                            <span className="text-gray-600 dark:text-gray-400">SC ({serviceChargeRate}%):</span>
                            <span className="font-medium text-gray-900 dark:text-white">
                              {formatCurrency(serviceChargeAmount)}
                            </span>
                          </div>
                        )}
                        {taxAmount > 0 && (
                          <div className="flex justify-between items-center">
                            <span className="text-gray-600 dark:text-gray-400">Tax ({taxRate}%):</span>
                            <span className="font-medium text-gray-900 dark:text-white">
                              {formatCurrency(taxAmount)}
                            </span>
                          </div>
                        )}
                        <div className="border-t border-gray-200 dark:border-gray-700 pt-3 mt-3">
                          <div className="flex justify-between items-center">
                            <span className="text-lg font-bold text-gray-900 dark:text-white">Total:</span>
                            <span className="text-xl font-bold text-gray-900 dark:text-white">
                              {formatCurrency(selectedOrder?.total || 0)}
                            </span>
                          </div>
                        </div>
                      </>
                    );
                  })()}
                </div>
              </div>
            </div>

            {/* Order Items Table */}
            <div className="space-y-4">
              <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white">Order Items</h3>
              <div className="overflow-x-auto -mx-4 sm:mx-0">
                <div className="inline-block min-w-full align-middle px-4 sm:px-0">
                  <table className="w-full border-collapse min-w-[800px]">
                  <thead>
                    <tr className="border-b border-gray-200 dark:border-gray-700">
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-700 dark:text-gray-300">Items</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-700 dark:text-gray-300">Order Status</th>
                      <th className="text-right py-3 px-4 text-sm font-medium text-gray-700 dark:text-gray-300">Base Price</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-700 dark:text-gray-300">Selections</th>
                      <th className="text-right py-3 px-4 text-sm font-medium text-gray-700 dark:text-gray-300">Price</th>
                      <th className="text-right py-3 px-4 text-sm font-medium text-gray-700 dark:text-gray-300">Total Price</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-700 dark:text-gray-300">Note</th>
                      <th className="text-center py-3 px-4 text-sm font-medium text-gray-700 dark:text-gray-300">Ratings</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-700 dark:text-gray-300">Reviews</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedOrder?.items?.map((item: any) => (
                      <tr key={item.id} className="border-b border-gray-100 dark:border-gray-800">
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
                              <ShoppingCartIcon className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                            </div>
                            <div>
                              <p className="font-medium text-gray-900 dark:text-white">{item.name}</p>
                              <p className="text-xs text-gray-500 dark:text-gray-400">Qty: {item.quantity}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          {getStatusBadge(selectedOrder?.status || 'pending')}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <span className="text-gray-900 dark:text-white">
                            {formatCurrency(item.basePrice ?? item.price)}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          {item.price !== (item.basePrice ?? item.price) ? (
                            <span className="text-xs text-gray-600 dark:text-gray-400">
                              Modified
                            </span>
                          ) : (
                            <span className="text-gray-600 dark:text-gray-400">—</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <span className="text-gray-900 dark:text-white">{formatCurrency(item.price)}</span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <span className="font-medium text-gray-900 dark:text-white">
                            {formatCurrency(item.quantity * item.price)}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <span className="text-gray-600 dark:text-gray-400">{item.notes || '—'}</span>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <OrderItemRating orderId={selectedOrder?.id || ''} menuItemId={item.id} />
                        </td>
                        <td className="py-3 px-4">
                          <OrderReview orderId={selectedOrder?.id || ''} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    {(() => {
                      // Calculate subtotal from items
                      const subtotal = selectedOrder?.items?.reduce((sum, item) => sum + (item.price * item.quantity), 0) || 0;
                      
                      // Get discount amount from order (loyaltyDiscount or discountAmount)
                      const storedDiscount = selectedOrder?.discount || 0;
                      
                      // Get tax rate and service charge rate from order or settings
                      const taxRate = selectedOrder?.taxRate ?? posSettings?.taxRate ?? 0;
                      const serviceChargeRate = selectedOrder?.serviceChargeRate ?? posSettings?.serviceCharge ?? 0;
                      
                      const actualTotal = selectedOrder?.total || 0;
                      
                      // Reverse-engineer the discount and tax/SC from the actual total
                      let discount = storedDiscount;
                      let taxAmount = 0;
                      let serviceChargeAmount = 0;
                      
                      // First, try with stored discount
                      if (storedDiscount > 0 && storedDiscount <= subtotal) {
                        discount = storedDiscount;
                        const baseForTaxAndSC = subtotal - discount;
                        taxAmount = Math.round(baseForTaxAndSC * (taxRate / 100) * 100) / 100;
                        serviceChargeAmount = Math.round(baseForTaxAndSC * (serviceChargeRate / 100) * 100) / 100;
                        
                        // Verify calculation matches
                        const calculatedTotal = baseForTaxAndSC + taxAmount + serviceChargeAmount;
                        if (Math.abs(calculatedTotal - actualTotal) > 0.01) {
                          // Stored discount doesn't match, need to recalculate
                          discount = 0;
                        }
                      }
                      
                      // If no stored discount or it doesn't match, calculate it
                      if (discount === 0) {
                        const totalRate = taxRate + serviceChargeRate;
                        
                        if (totalRate > 0) {
                          // Calculate what the discounted subtotal should be based on the actual total
                          const discountedSubtotal = actualTotal / (1 + totalRate / 100);
                          discount = Math.max(0, subtotal - discountedSubtotal);
                          discount = Math.round(discount * 100) / 100;
                          
                          // Calculate tax and service charge on the discounted subtotal
                          const baseForTaxAndSC = subtotal - discount;
                          taxAmount = Math.round(baseForTaxAndSC * (taxRate / 100) * 100) / 100;
                          serviceChargeAmount = Math.round(baseForTaxAndSC * (serviceChargeRate / 100) * 100) / 100;
                          
                          // Verify: (subtotal - discount) + tax + sc should equal actualTotal
                          const calculatedTotal = baseForTaxAndSC + taxAmount + serviceChargeAmount;
                          const difference = Math.abs(calculatedTotal - actualTotal);
                          
                          // If there's a rounding difference, adjust tax to match
                          if (difference > 0.01 && difference < 1) {
                            // Small rounding difference, adjust tax to make total match
                            taxAmount = actualTotal - baseForTaxAndSC - serviceChargeAmount;
                            taxAmount = Math.round(taxAmount * 100) / 100;
                          }
                        } else {
                          // No tax or service charge, discount is just the difference
                          discount = Math.max(0, subtotal - actualTotal);
                          discount = Math.round(discount * 100) / 100;
                        }
                      }
                      
                      return (
                        <>
                          <tr className="border-t-2 border-gray-300 dark:border-gray-600">
                            <td colSpan={5} className="py-3 px-4 text-right font-medium text-gray-700 dark:text-gray-300">
                              Subtotal:
                            </td>
                            <td className="py-3 px-4 text-right font-medium text-gray-900 dark:text-white">
                              {formatCurrency(subtotal)}
                            </td>
                            <td colSpan={3}></td>
                          </tr>
                          {discount > 0 && (
                            <tr>
                              <td colSpan={5} className="py-2 px-4 text-right text-gray-600 dark:text-gray-400">
                                Discount:
                              </td>
                              <td className="py-2 px-4 text-right font-medium text-red-600 dark:text-red-400">
                                -{formatCurrency(discount)}
                              </td>
                              <td colSpan={3}></td>
                            </tr>
                          )}
                          {serviceChargeAmount > 0 && (
                            <tr>
                              <td colSpan={5} className="py-2 px-4 text-right text-gray-600 dark:text-gray-400">
                                SC ({serviceChargeRate}%):
                              </td>
                              <td className="py-2 px-4 text-right font-medium text-gray-900 dark:text-white">
                                {formatCurrency(serviceChargeAmount)}
                              </td>
                              <td colSpan={3}></td>
                            </tr>
                          )}
                          {taxAmount > 0 && (
                            <tr>
                              <td colSpan={5} className="py-2 px-4 text-right text-gray-600 dark:text-gray-400">
                                Tax ({taxRate}%):
                              </td>
                              <td className="py-2 px-4 text-right font-medium text-gray-900 dark:text-white">
                                {formatCurrency(taxAmount)}
                              </td>
                              <td colSpan={3}></td>
                            </tr>
                          )}
                          <tr className="border-t-2 border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800/50">
                            <td colSpan={5} className="py-3 px-4 text-right text-lg font-bold text-gray-900 dark:text-white">
                              TOTAL:
                            </td>
                            <td className="py-3 px-4 text-right text-lg font-bold text-gray-900 dark:text-white">
                              {formatCurrency(selectedOrder?.total || 0)}
                            </td>
                            <td colSpan={3}></td>
                          </tr>
                        </>
                      );
                    })()}
                  </tfoot>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* Collect Payment Modal */}
      <Modal isOpen={isCollectModalOpen} onClose={() => setIsCollectModalOpen(false)} title="Collect Payment" size="sm">
        {collectOrder && (
          <div className="space-y-4">
            <div className="text-center">
              <div className="text-sm text-gray-500">Order #{collectOrder.orderNumber}</div>
              <div className="text-2xl font-black">{formatCurrency(collectOrder.total)}</div>
              <div className="text-xs text-amber-600">Paid: {formatCurrency((collectOrder as any).paidAmount || 0)}</div>
            </div>
            <div>
              <label className="block text-xs font-bold mb-1">Amount to Collect</label>
              <Input
                type="number"
                value={collectAmount}
                onChange={(e) => setCollectAmount(e.target.value)}
                className="text-lg font-bold"
              />
            </div>
            <div className="flex gap-3">
              <Button variant="ghost" onClick={() => setIsCollectModalOpen(false)} className="flex-1">Cancel</Button>
              <Button
                variant="primary"
                onClick={handleCollectPayment}
                disabled={isProcessingPayment || !collectAmount}
                className="flex-1 bg-emerald-600"
              >
                {isProcessingPayment ? 'Processing...' : `Collect ${formatCurrency(parseFloat(collectAmount || '0'))}`}
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Refund Modal */}
      <Modal
        isOpen={isRefundModalOpen}
        onClose={() => {
          setIsRefundModalOpen(false);
          setRefundReason('');
          setRefundAmount('');
        }}
        title="Refund Order"
        className={refundMode === 'itemized' ? 'max-w-2xl' : 'max-w-md'}
      >
        <div className="space-y-4">
          <div className="bg-orange-50 dark:bg-orange-900/20 rounded-lg p-4">
            <h4 className="font-medium text-orange-800 dark:text-orange-400 mb-2">Refund Information</h4>
            <div className="text-sm space-y-1 text-orange-700 dark:text-orange-300">
              <div className="flex justify-between">
                <span>Order Total:</span>
                <span className="font-medium">{selectedOrder ? formatCurrency(selectedOrder.total) : '—'}</span>
              </div>
              <div className="flex justify-between">
                <span>Order Number:</span>
                <span className="font-medium">{selectedOrder?.orderNumber}</span>
              </div>
            </div>
          </div>

          <div className="flex space-x-1 border-b border-gray-200 dark:border-gray-700 mb-4">
            <button
              className={`py-2 px-4 text-sm font-medium border-b-2 \${
                refundMode === 'full' 
                  ? 'border-primary-500 text-primary-600 dark:text-primary-400' 
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
              onClick={() => setRefundMode('full')}
            >
              Amount / Full Refund
            </button>
            <button
              className={`py-2 px-4 text-sm font-medium border-b-2 \${
                refundMode === 'itemized' 
                  ? 'border-primary-500 text-primary-600 dark:text-primary-400' 
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
              onClick={() => setRefundMode('itemized')}
            >
              Itemized Refund
            </button>
          </div>

          {refundMode === 'full' ? (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Refund Amount <span className="text-red-500">*</span>
                </label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  max={selectedOrder?.total || 0}
                  value={refundAmount}
                  onChange={(e) => setRefundAmount(e.target.value ? Number(e.target.value) : '')}
                  placeholder="0.00"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">
                  Enter the amount to refund. Maximum: {selectedOrder ? formatCurrency(selectedOrder.total) : '—'}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Refund Reason <span className="text-red-500">*</span>
                </label>
                <textarea
                  className="w-full min-h-[100px] p-3 text-sm rounded-lg border border-gray-300 focus:border-primary-500 focus:ring-1 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                  placeholder="Please provide a detailed reason for this refund..."
                  value={refundReason}
                  onChange={(e) => setRefundReason(e.target.value)}
                  required
                />
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="max-h-[300px] overflow-y-auto pr-2">
                <table className="w-full text-sm text-left">
                  <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400 sticky top-0">
                    <tr>
                      <th className="px-3 py-2">Item</th>
                      <th className="px-3 py-2">Price</th>
                      <th className="px-3 py-2">Qty</th>
                      <th className="px-3 py-2 text-center">Wastage?</th>
                      <th className="px-3 py-2 text-right">Refund Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedRefundItems.map((item, index) => (
                      <tr key={item.menuItemId} className="border-b dark:border-gray-700">
                        <td className="px-3 py-2">{item.name}</td>
                        <td className="px-3 py-2">{formatCurrency(item.price)}</td>
                        <td className="px-3 py-2">
                          <input 
                            type="number" 
                            min="0" 
                            max={item.maxQuantity} 
                            value={item.quantity}
                            onChange={(e) => {
                              const newQty = Math.min(Math.max(0, parseInt(e.target.value) || 0), item.maxQuantity);
                              const newItems = [...selectedRefundItems];
                              newItems[index].quantity = newQty;
                              setSelectedRefundItems(newItems);
                            }}
                            className="w-16 px-2 py-1 text-sm border rounded dark:bg-gray-800 dark:border-gray-600"
                          />
                          <span className="text-xs text-gray-500 ml-1">/ {item.maxQuantity}</span>
                        </td>
                        <td className="px-3 py-2 text-center">
                          <input 
                            type="checkbox" 
                            checked={item.isWastage}
                            onChange={(e) => {
                              const newItems = [...selectedRefundItems];
                              newItems[index].isWastage = e.target.checked;
                              setSelectedRefundItems(newItems);
                            }}
                            className="rounded text-primary-600 focus:ring-primary-500"
                          />
                        </td>
                        <td className="px-3 py-2 text-right font-medium">
                          {formatCurrency(item.price * item.quantity)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="flex justify-between items-center pt-2 border-t dark:border-gray-700">
                <span className="font-semibold">Total Itemized Refund:</span>
                <span className="font-bold text-lg text-primary-600">
                  {formatCurrency(selectedRefundItems.reduce((acc, item) => acc + (item.price * item.quantity), 0))}
                </span>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Refund Reason <span className="text-red-500">*</span>
                </label>
                <textarea
                  className="w-full min-h-[80px] p-3 text-sm rounded-lg border border-gray-300 focus:border-primary-500 focus:ring-1 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                  placeholder="Reason for itemized refund..."
                  value={refundReason}
                  onChange={(e) => setRefundReason(e.target.value)}
                  required
                />
              </div>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <Button
              variant="secondary"
              onClick={() => {
                setIsRefundModalOpen(false);
                setRefundReason('');
                setRefundAmount('');
              }}
              disabled={isRefunding || isRefundingItems}
            >
              Cancel
            </Button>
            <Button
              onClick={handleRefundSubmit}
              disabled={
                isRefunding || isRefundingItems || !refundReason.trim() || 
                (refundMode === 'full' && (!refundAmount || Number(refundAmount) <= 0 || Number(refundAmount) > (selectedOrder?.total || 0))) ||
                (refundMode === 'itemized' && selectedRefundItems.every(i => i.quantity === 0))
              }
              className="bg-orange-600 hover:bg-orange-700 text-white"
            >
              {isRefunding || isRefundingItems ? 'Processing...' : 'Process Refund'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Exchange Modal */}
      <Modal
        isOpen={isExchangeModalOpen}
        onClose={() => {
          setIsExchangeModalOpen(false);
          setExchangeReason('');
          setExchangeNewItems([]);
          setExchangeSearchTerm('');
        }}
        title="Exchange Order Items"
        className="max-w-4xl"
      >
        <div className="space-y-6">
          <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-4">
            <h4 className="font-medium text-purple-800 dark:text-purple-400 mb-2">Exchange Information</h4>
            <div className="text-sm space-y-1 text-purple-700 dark:text-purple-300">
              <div className="flex justify-between">
                <span>Order Number:</span>
                <span className="font-medium">{selectedOrder?.orderNumber}</span>
              </div>
              <p className="text-xs mt-2 text-purple-600 dark:text-purple-400">
                Select items to return and add new items to exchange. Price differences will be calculated automatically.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Left Side: Return Items */}
            <div className="space-y-4">
              <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <MinusCircleIcon className="w-5 h-5 text-red-500" />
                Items to Return
              </h3>
              <div className="max-h-[300px] overflow-y-auto pr-2 border rounded-lg dark:border-gray-700">
                <table className="w-full text-sm text-left">
                  <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-800 dark:text-gray-400 sticky top-0">
                    <tr>
                      <th className="px-3 py-2">Item</th>
                      <th className="px-3 py-2">Qty</th>
                      <th className="px-3 py-2 text-center" title="Mark as damaged/wastage">Wastage</th>
                      <th className="px-3 py-2 text-right">Value</th>
                    </tr>
                  </thead>
                  <tbody>
                    {exchangeReturnedItems.map((item, index) => (
                      <tr key={item.menuItemId} className="border-b dark:border-gray-700">
                        <td className="px-3 py-2">
                          <div className="font-medium">{item.name}</div>
                          <div className="text-xs text-gray-500">{formatCurrency(item.price)} each</div>
                        </td>
                        <td className="px-3 py-2">
                          <input 
                            type="number" 
                            min="0" 
                            max={item.maxQuantity} 
                            value={item.quantity}
                            onChange={(e) => {
                              const newQty = Math.min(Math.max(0, parseInt(e.target.value) || 0), item.maxQuantity);
                              const newItems = [...exchangeReturnedItems];
                              newItems[index].quantity = newQty;
                              setExchangeReturnedItems(newItems);
                            }}
                            className="w-16 px-2 py-1 text-sm border rounded dark:bg-gray-800 dark:border-gray-600"
                          />
                          <span className="text-xs text-gray-500 ml-1">/ {item.maxQuantity}</span>
                        </td>
                        <td className="px-3 py-2 text-center">
                          <input 
                            type="checkbox" 
                            checked={item.isWastage}
                            onChange={(e) => {
                              const newItems = [...exchangeReturnedItems];
                              newItems[index].isWastage = e.target.checked;
                              setExchangeReturnedItems(newItems);
                            }}
                            className="rounded text-primary-600 focus:ring-primary-500"
                          />
                        </td>
                        <td className="px-3 py-2 text-right font-medium text-red-600 dark:text-red-400">
                          {formatCurrency(item.price * item.quantity)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="flex justify-between items-center px-2">
                <span className="font-semibold text-sm">Return Value:</span>
                <span className="font-bold text-red-600 dark:text-red-400">
                  {formatCurrency(exchangeReturnedItems.reduce((acc, item) => acc + (item.price * item.quantity), 0))}
                </span>
              </div>
            </div>

            {/* Right Side: New Items */}
            <div className="space-y-4">
              <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <PlusCircleIcon className="w-5 h-5 text-green-500" />
                New Items
              </h3>
              
              <div className="flex flex-col gap-2 relative">
                <Input
                  placeholder="Search item and press Enter to add..."
                  value={exchangeSearchTerm}
                  onChange={(e) => setExchangeSearchTerm(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && exchangeSearchTerm.trim().length > 0) {
                      e.preventDefault();
                      const filtered = menuItems.filter((item: any) => item.name.toLowerCase().includes(exchangeSearchTerm.toLowerCase()));
                      if (filtered.length > 0) {
                        const item = filtered[0];
                        const value = item.id || (item as any)._id;
                        const existingIndex = exchangeNewItems.findIndex(i => i.menuItemId === value);
                        if (existingIndex >= 0) {
                          const newItems = [...exchangeNewItems];
                          newItems[existingIndex].quantity += 1;
                          setExchangeNewItems(newItems);
                        } else {
                          setExchangeNewItems([
                            ...exchangeNewItems,
                            {
                              menuItemId: value,
                              name: item.name,
                              quantity: 1,
                              price: item.price
                            }
                          ]);
                        }
                        setExchangeSearchTerm('');
                      }
                    }
                  }}
                  className="w-full"
                />
                {exchangeSearchTerm.trim().length > 0 && (
                  <div className="absolute z-10 w-full mt-11 max-h-60 overflow-y-auto bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg">
                    {(() => {
                      const filtered = menuItems.filter((item: any) => item.name.toLowerCase().includes(exchangeSearchTerm.toLowerCase()));
                      if (filtered.length === 0) {
                        return <div className="px-4 py-3 text-sm text-gray-500 text-center">No matching items</div>;
                      }
                      return filtered.map((item: any) => (
                        <button
                          key={item.id || (item as any)._id}
                          className="w-full flex justify-between items-center px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none focus:bg-gray-100 dark:focus:bg-gray-700 border-b last:border-b-0 border-gray-100 dark:border-gray-700"
                          onClick={() => {
                            const value = item.id || (item as any)._id;
                            const existingIndex = exchangeNewItems.findIndex(i => i.menuItemId === value);
                            if (existingIndex >= 0) {
                              const newItems = [...exchangeNewItems];
                              newItems[existingIndex].quantity += 1;
                              setExchangeNewItems(newItems);
                            } else {
                              setExchangeNewItems([
                                ...exchangeNewItems,
                                {
                                  menuItemId: value,
                                  name: item.name,
                                  quantity: 1,
                                  price: item.price
                                }
                              ]);
                            }
                            setExchangeSearchTerm('');
                          }}
                        >
                          <span className="font-medium text-gray-900 dark:text-white">{item.name}</span>
                          <span className="text-gray-500 dark:text-gray-400 font-semibold">{formatCurrency(item.price)}</span>
                        </button>
                      ));
                    })()}
                  </div>
                )}
              </div>

              <div className="max-h-[250px] overflow-y-auto border rounded-lg dark:border-gray-700">
                {exchangeNewItems.length === 0 ? (
                  <div className="p-4 text-center text-sm text-gray-500">
                    No new items selected
                  </div>
                ) : (
                  <table className="w-full text-sm text-left">
                    <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-800 dark:text-gray-400 sticky top-0">
                      <tr>
                        <th className="px-3 py-2">Item</th>
                        <th className="px-3 py-2">Qty</th>
                        <th className="px-3 py-2 text-right">Price</th>
                        <th className="px-3 py-2"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {exchangeNewItems.map((item, index) => (
                        <tr key={item.menuItemId} className="border-b dark:border-gray-700">
                          <td className="px-3 py-2 font-medium">{item.name}</td>
                          <td className="px-3 py-2">
                            <input 
                              type="number" 
                              min="1" 
                              value={item.quantity}
                              onChange={(e) => {
                                const newQty = Math.max(1, parseInt(e.target.value) || 1);
                                const newItems = [...exchangeNewItems];
                                newItems[index].quantity = newQty;
                                setExchangeNewItems(newItems);
                              }}
                              className="w-16 px-2 py-1 text-sm border rounded dark:bg-gray-800 dark:border-gray-600"
                            />
                          </td>
                          <td className="px-3 py-2 text-right font-medium text-green-600 dark:text-green-400">
                            {formatCurrency(item.price * item.quantity)}
                          </td>
                          <td className="px-3 py-2 text-right">
                            <button 
                              onClick={() => {
                                setExchangeNewItems(exchangeNewItems.filter((_, i) => i !== index));
                              }}
                              className="text-red-500 hover:text-red-700"
                            >
                              <XCircleIcon className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
              <div className="flex justify-between items-center px-2">
                <span className="font-semibold text-sm">New Items Value:</span>
                <span className="font-bold text-green-600 dark:text-green-400">
                  {formatCurrency(exchangeNewItems.reduce((acc, item) => acc + (item.price * item.quantity), 0))}
                </span>
              </div>
            </div>
          </div>

          <div className="bg-gray-50 dark:bg-gray-800/50 p-4 rounded-lg border dark:border-gray-700 flex justify-between items-center">
            {(() => {
              const returnTotal = exchangeReturnedItems.reduce((acc, item) => acc + (item.price * item.quantity), 0);
              const newTotal = exchangeNewItems.reduce((acc, item) => acc + (item.price * item.quantity), 0);
              const diff = newTotal - returnTotal;
              return (
                <>
                  <div className="space-y-1">
                    <span className="font-semibold text-gray-900 dark:text-white">Net Difference:</span>
                    <p className="text-xs text-gray-500">
                      {diff > 0 
                        ? 'Customer owes additional payment' 
                        : diff < 0 
                          ? 'Customer is owed a refund' 
                          : 'Even exchange, no payment required'}
                    </p>
                  </div>
                  <div className={`text-xl font-bold ${diff > 0 ? 'text-green-600' : diff < 0 ? 'text-red-600' : 'text-gray-600'}`}>
                    {diff > 0 ? '+' : diff < 0 ? '-' : ''}{formatCurrency(Math.abs(diff))}
                  </div>
                </>
              );
            })()}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Payment Method (if applicable) <span className="text-red-500">*</span>
              </label>
              <Select
                options={[
                  { value: 'cash', label: 'Cash' },
                  { value: 'card', label: 'Card' },
                  { value: 'digital_wallet', label: 'Digital Wallet' }
                ]}
                value={exchangePaymentMethod}
                onChange={(val) => setExchangePaymentMethod(val)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Exchange Reason <span className="text-red-500">*</span>
              </label>
              <Input
                type="text"
                placeholder="Reason for exchange..."
                value={exchangeReason}
                onChange={(e) => setExchangeReason(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <Button
              variant="secondary"
              onClick={() => {
                setIsExchangeModalOpen(false);
                setExchangeReason('');
                setExchangeNewItems([]);
                setExchangeSearchTerm('');
              }}
              disabled={isExchanging}
            >
              Cancel
            </Button>
            <Button
              onClick={handleExchangeSubmit}
              disabled={
                isExchanging || 
                exchangeReturnedItems.every(i => i.quantity === 0) || 
                exchangeNewItems.length === 0 || 
                !exchangeReason.trim()
              }
              className="bg-purple-600 hover:bg-purple-700 text-white"
            >
              {isExchanging ? 'Processing...' : 'Process Exchange'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* QR Code Review Modal */}
      <Modal
        isOpen={isQRModalOpen}
        onClose={() => setIsQRModalOpen(false)}
        title="Order QR Code"
        className="max-w-md"
      >
        {selectedOrder && (
          <div className="space-y-6">
            <div className="text-center">
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                Customers can scan this QR code to review their order details
              </p>
              {getOrderReviewURL(selectedOrder) ? (
                <>
                  <div className="flex justify-center p-4 bg-white rounded-lg border-2 border-gray-200 dark:border-gray-700">
                    <QRCodeSVG
                      value={getOrderReviewURL(selectedOrder)}
                      size={256}
                      level="H"
                      includeMargin={true}
                    />
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-4 break-all">
                    {getOrderReviewURL(selectedOrder)}
                  </p>
                </>
              ) : (
                <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-4 text-center">
                  <p className="text-sm text-yellow-800 dark:text-yellow-300">
                    Unable to generate QR code: Table information not available for this order.
                  </p>
                </div>
              )}
            </div>

            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
              <h4 className="font-medium text-blue-800 dark:text-blue-400 mb-2">Order Information</h4>
              <div className="text-sm space-y-1 text-blue-700 dark:text-blue-300">
                <div className="flex justify-between">
                  <span>Order Number:</span>
                  <span className="font-medium">{selectedOrder?.orderNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span>Token:</span>
                  <span className="font-medium">#{selectedOrder?.orderNumber?.split('-').pop() || selectedOrder?.orderNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span>Table:</span>
                  <span className="font-medium">{selectedOrder?.tableNumber === '—' ? 'N/A' : selectedOrder?.tableNumber}</span>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3">
              {getOrderReviewURL(selectedOrder) && (
                <Button
                  variant="secondary"
                  onClick={() => {
                    navigator.clipboard.writeText(getOrderReviewURL(selectedOrder));
                    toast.success('Review URL copied to clipboard');
                  }}
                >
                  Copy URL
                </Button>
              )}
              {getOrderReviewURL(selectedOrder) && (
                <Button
                  onClick={() => {
                    // Find QR code SVG within the modal
                    const modal = document.querySelector('[role="dialog"]');
                    const qrElement = modal?.querySelector('svg');
                    if (qrElement) {
                      const svgData = new XMLSerializer().serializeToString(qrElement);
                      const canvas = document.createElement('canvas');
                      const ctx = canvas.getContext('2d');
                      const img = new Image();
                      img.onload = () => {
                        canvas.width = img.width;
                        canvas.height = img.height;
                        ctx?.drawImage(img, 0, 0);
                        canvas.toBlob((blob) => {
                          if (blob) {
                            const url = URL.createObjectURL(blob);
                            const link = document.createElement('a');
                            link.href = url;
                            link.download = `order-qr-${selectedOrder?.orderNumber || 'order'}.png`;
                            link.click();
                            URL.revokeObjectURL(url);
                            toast.success('QR code downloaded');
                          }
                        });
                      };
                      img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
                    } else {
                      toast.error('QR code not found');
                    }
                  }}
                >
                  Download QR
                </Button>
              )}
            </div>
          </div>
        )}
      </Modal>

    </div>
  );
}