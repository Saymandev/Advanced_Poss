'use client';

import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { DataTable } from '@/components/ui/DataTable';
import { ImportButton } from '@/components/ui/ImportButton';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Select } from '@/components/ui/Select';
import { DigitalReceipt, useEmailDigitalReceiptMutation, useGenerateDigitalReceiptMutation, useGetDigitalReceiptsQuery } from '@/lib/api/endpoints/aiApi';
import { useGetPOSOrdersQuery } from '@/lib/api/endpoints/posApi';
import { useAppSelector } from '@/lib/store';
import { formatCurrency, formatDateTime } from '@/lib/utils';
import {
  DocumentTextIcon,
  EnvelopeIcon,
  EyeIcon,
  PrinterIcon,
  ReceiptRefundIcon,
  ShoppingCartIcon,
  UserIcon,
} from '@heroicons/react/24/outline';
import { useMemo, useState } from 'react';
import toast from 'react-hot-toast';

export default function DigitalReceiptsPage() {
  const { user, companyContext } = useAppSelector((state) => state.auth);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
  const [selectedReceipt, setSelectedReceipt] = useState<DigitalReceipt | null>(null);
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);
  const [isGenerateModalOpen, setIsGenerateModalOpen] = useState(false);

  // Extract companyId and branchId
  const companyId = (user as any)?.companyId || 
                   (companyContext as any)?.companyId;
  
  const branchId = (user as any)?.branchId || 
                   (companyContext as any)?.branchId || 
                   (companyContext as any)?.branches?.[0]?._id ||
                   (companyContext as any)?.branches?.[0]?.id;

  // Form error states
  const [formErrors, setFormErrors] = useState<{
    generate?: { orderId?: string; customerEmail?: string };
    email?: { email?: string };
  }>({});

  // Query parameters
  const queryParams = useMemo(() => {
    const params: any = {};
    if (branchId) params.branchId = branchId;
    if (dateRange.start) params.startDate = dateRange.start;
    if (dateRange.end) params.endDate = dateRange.end;
    if (searchQuery.trim()) params.customerId = searchQuery.trim();
    return params;
  }, [branchId, dateRange.start, dateRange.end, searchQuery]);

  const { data: receiptsData, isLoading, error, refetch } = useGetDigitalReceiptsQuery(queryParams, {
    skip: !branchId,
    refetchOnMountOrArgChange: true,
    refetchOnFocus: true,
    refetchOnReconnect: true,
  });

  // Get completed POS orders that don't have receipts yet
  const { data: completedOrders, isLoading: isLoadingOrders } = useGetPOSOrdersQuery({
    branchId: branchId || undefined,
    status: 'paid',
    limit: 100,
  }, {
    skip: !branchId,
    refetchOnMountOrArgChange: true,
  });

  const [generateReceipt, { isLoading: isGenerating }] = useGenerateDigitalReceiptMutation();
  const [emailReceipt, { isLoading: isEmailing }] = useEmailDigitalReceiptMutation();

  const [emailForm, setEmailForm] = useState({
    email: '',
  });

  const [generateForm, setGenerateForm] = useState({
    orderId: '',
    customerEmail: '',
  });

  const resetEmailForm = () => {
    setEmailForm({ email: '' });
    setFormErrors(prev => ({ ...prev, email: {} }));
  };

  const resetGenerateForm = () => {
    setGenerateForm({ orderId: '', customerEmail: '' });
    setFormErrors(prev => ({ ...prev, generate: {} }));
  };

  // Validation functions
  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validateGenerateForm = (): boolean => {
    const errors: { orderId?: string; customerEmail?: string } = {};

    if (!generateForm.orderId || !generateForm.orderId.trim()) {
      errors.orderId = 'Please select an order';
    }

    if (generateForm.customerEmail && generateForm.customerEmail.trim() && !validateEmail(generateForm.customerEmail)) {
      errors.customerEmail = 'Please enter a valid email address';
    }

    setFormErrors(prev => ({ ...prev, generate: errors }));
    return Object.keys(errors).length === 0;
  };

  const validateEmailForm = (): boolean => {
    const errors: { email?: string } = {};

    if (!emailForm.email.trim()) {
      errors.email = 'Email address is required';
    } else if (!validateEmail(emailForm.email)) {
      errors.email = 'Please enter a valid email address';
    }

    setFormErrors(prev => ({ ...prev, email: errors }));
    return Object.keys(errors).length === 0;
  };

  const handleGenerateReceipt = async () => {
    if (!validateGenerateForm()) {
      const firstError = Object.values(formErrors.generate || {})[0];
      if (firstError) {
        toast.error(firstError);
      }
      return;
    }

    try {
      // Find the order to get the proper ID format
      const selectedOrder = completedOrders?.orders?.find(
        (o: any) => 
          (o.id === generateForm.orderId) || 
          (o.id?.toString() === generateForm.orderId)
      );

      const orderId = selectedOrder 
        ? (selectedOrder.id || generateForm.orderId).toString()
        : generateForm.orderId.trim();

      await generateReceipt({
        orderId: orderId,
        customerEmail: generateForm.customerEmail.trim() || undefined,
      }).unwrap();

      toast.success('Digital receipt generated successfully');
      setIsGenerateModalOpen(false);
      resetGenerateForm();
      setTimeout(() => {
        refetch();
      }, 500);
    } catch (error: any) {
      const errorMessage = error?.data?.message || error?.message || 'Failed to generate digital receipt';
      toast.error(errorMessage);
      
      // Set field-specific errors if available
      if (error?.data?.errors) {
        setFormErrors(prev => ({
          ...prev,
          generate: error.data.errors,
        }));
      }
    }
  };

  const handleDownloadReceipt = (receipt: DigitalReceipt) => {
    try {
      // Generate receipt HTML and download as PDF
      const receiptWindow = window.open('', '_blank');
      if (receiptWindow) {
        receiptWindow.document.write(generateReceiptHTML(receipt));
        receiptWindow.document.close();
        receiptWindow.print();
      } else {
        toast.error('Please allow popups to print receipts');
      }
    } catch (error) {
      toast.error('Failed to open print dialog');
    }
  };

  const handleEmailReceipt = async () => {
    if (!selectedReceipt) {
      toast.error('No receipt selected');
      return;
    }

    if (!validateEmailForm()) {
      const firstError = Object.values(formErrors.email || {})[0];
      if (firstError) {
        toast.error(firstError);
      }
      return;
    }

    try {
      await emailReceipt({
        receiptId: selectedReceipt.id,
        email: emailForm.email.trim(),
      }).unwrap();

      toast.success('Receipt emailed successfully');
      setIsEmailModalOpen(false);
      resetEmailForm();
      setSelectedReceipt(null);
      setTimeout(() => {
        refetch();
      }, 500);
    } catch (error: any) {
      const errorMessage = error?.data?.message || error?.message || 'Failed to email receipt';
      toast.error(errorMessage);
      
      // Set field-specific errors if available
      if (error?.data?.errors) {
        setFormErrors(prev => ({
          ...prev,
          email: error.data.errors,
        }));
      }
    }
  };

  const openViewModal = (receipt: DigitalReceipt) => {
    setSelectedReceipt(receipt);
    setIsViewModalOpen(true);
  };

  const openEmailModal = (receipt: DigitalReceipt) => {
    setSelectedReceipt(receipt);
    setEmailForm({ email: receipt.customerEmail || '' });
    setIsEmailModalOpen(true);
  };

  const getPaymentMethodBadge = (method: string) => {
    const variants = {
      cash: 'secondary',
      card: 'info',
      digital_wallet: 'info',
    } as const;

    return <Badge variant={variants[method as keyof typeof variants] || 'secondary'}>{method}</Badge>;
  };

  const columns = [
    {
      key: 'receiptNumber',
      title: 'Receipt #',
      sortable: true,
      render: (value: string, row: DigitalReceipt) => {
        // Safely extract orderId as string
        const orderIdStr = typeof row.orderId === 'string' 
          ? row.orderId 
          : (row.orderId as any)?.toString() || String(row.orderId || '');
        const orderIdDisplay = orderIdStr.length >= 8 ? orderIdStr.slice(-8) : orderIdStr;
        
        return (
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
              <ReceiptRefundIcon className="w-5 h-5 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="font-medium text-gray-900 dark:text-white">{value}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">Order #{orderIdDisplay}</p>
            </div>
          </div>
        );
      },
    },
    {
      key: 'customerEmail',
      title: 'Customer',
      render: (value: string) => (
        <div className="flex items-center gap-2">
          <UserIcon className="w-4 h-4 text-gray-400" />
          <span className="text-sm text-gray-600 dark:text-gray-400">
            {value || 'Walk-in Customer'}
          </span>
        </div>
      ),
    },
    {
      key: 'total',
      title: 'Total',
      align: 'right' as const,
      render: (value: number) => (
        <div className="text-right">
          <p className="font-semibold text-gray-900 dark:text-white">
            {formatCurrency(value)}
          </p>
        </div>
      ),
    },
    {
      key: 'paymentMethod',
      title: 'Payment',
      render: (value: string) => getPaymentMethodBadge(value),
    },
    {
      key: 'loyaltyPointsEarned',
      title: 'Points Earned',
      align: 'center' as const,
      render: (value: number) => (
        <div className="text-center">
          {value ? (
            <Badge variant="success">+{value} pts</Badge>
          ) : (
            <span className="text-gray-500 dark:text-gray-400">-</span>
          )}
        </div>
      ),
    },
    {
      key: 'createdAt',
      title: 'Date',
      render: (value: string) => (
        <span className="text-sm text-gray-600 dark:text-gray-400">
          {formatDateTime(value)}
        </span>
      ),
    },
    {
      key: 'actions',
      title: 'Actions',
      render: (value: any, row: DigitalReceipt) => (
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => openViewModal(row)}
            title="View Receipt"
          >
            <EyeIcon className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleDownloadReceipt(row)}
            title="Print/Download"
          >
            <PrinterIcon className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => openEmailModal(row)}
            className="text-blue-600 hover:text-blue-700"
            title="Email Receipt"
          >
            <EnvelopeIcon className="w-4 h-4" />
          </Button>
        </div>
      ),
    },
  ];

  const receipts = useMemo(() => {
    if (!receiptsData) return [];
    return Array.isArray(receiptsData) ? receiptsData : [];
  }, [receiptsData]);
  
  const stats = useMemo(() => {
    return {
      total: receipts.length,
      totalRevenue: receipts.reduce((sum, receipt) => sum + (receipt.total || 0), 0),
      loyaltyPoints: receipts.reduce((sum, receipt) => sum + (receipt.loyaltyPointsEarned || 0), 0),
      avgOrderValue: receipts.length ? (receipts.reduce((sum, receipt) => sum + (receipt.total || 0), 0) / receipts.length) : 0,
    };
  }, [receipts]);

  // Generate receipt HTML for print/download
  const generateReceiptHTML = (receipt: DigitalReceipt) => {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Receipt ${receipt.receiptNumber}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; }
          .header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 10px; margin-bottom: 20px; }
          .receipt-info { margin: 20px 0; }
          table { width: 100%; border-collapse: collapse; margin: 20px 0; }
          th, td { padding: 8px; text-align: left; border-bottom: 1px solid #ddd; }
          .total { font-weight: bold; font-size: 1.2em; }
          .footer { margin-top: 30px; text-align: center; color: #666; }
        </style>
      </head>
      <body>
        <div class="header">
          <h2>Restaurant POS</h2>
          <p>Receipt #${receipt.receiptNumber}</p>
          <p>${formatDateTime(receipt.createdAt)}</p>
        </div>
        <div class="receipt-info">
          <p><strong>Customer:</strong> ${receipt.customerEmail || 'Walk-in Customer'}</p>
          <p><strong>Order ID:</strong> ${receipt.orderId}</p>
        </div>
        <table>
          <thead>
            <tr>
              <th>Item</th>
              <th>Qty</th>
              <th>Price</th>
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            ${receipt.items.map(item => `
              <tr>
                <td>${item.name}</td>
                <td>${item.quantity}</td>
                <td>${formatCurrency(item.price)}</td>
                <td>${formatCurrency(item.total)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        <div class="total">
          <p>Subtotal: ${formatCurrency(receipt.subtotal)}</p>
          <p>Tax: ${formatCurrency(receipt.tax)}</p>
          ${receipt.tip ? `<p>Tip: ${formatCurrency(receipt.tip)}</p>` : ''}
          <p style="font-size: 1.3em;">Total: ${formatCurrency(receipt.total)}</p>
        </div>
        <div class="footer">
          <p>Thank you for your visit!</p>
        </div>
      </body>
      </html>
    `;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Digital Receipts</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Manage digital receipts and customer communications
          </p>
        </div>
        <Button onClick={() => setIsGenerateModalOpen(true)}>
          <DocumentTextIcon className="w-5 h-5 mr-2" />
          Generate Receipt
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Total Receipts</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white">{stats.total}</p>
              </div>
              <DocumentTextIcon className="w-8 h-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Total Revenue</p>
                <p className="text-3xl font-bold text-green-600">{formatCurrency(stats.totalRevenue)}</p>
              </div>
              <ReceiptRefundIcon className="w-8 h-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Loyalty Points</p>
                <p className="text-3xl font-bold text-purple-600">{stats.loyaltyPoints}</p>
              </div>
              <ReceiptRefundIcon className="w-8 h-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Avg Order Value</p>
                <p className="text-3xl font-bold text-yellow-600">{formatCurrency(stats.avgOrderValue)}</p>
              </div>
              <ShoppingCartIcon className="w-8 h-8 text-yellow-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <Input
                placeholder="Search by customer ID or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="flex gap-2">
              <Input
                type="date"
                label="Start Date"
                value={dateRange.start}
                onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                className="w-40"
              />
              <Input
                type="date"
                label="End Date"
                value={dateRange.end}
                onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                className="w-40"
              />
              {(dateRange.start || dateRange.end || searchQuery) && (
                <Button
                  variant="secondary"
                  onClick={() => {
                    setDateRange({ start: '', end: '' });
                    setSearchQuery('');
                  }}
                >
                  Clear Filters
                </Button>
              )}
            </div>
          </div>
          {error && (
            <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <p className="text-sm text-red-600 dark:text-red-400">
                Error loading receipts: {(error as any)?.data?.message || 'Unknown error occurred'}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Digital Receipts Table */}
      <Card>
        <CardContent>
            <DataTable
            data={receipts}
            columns={columns}
            loading={isLoading}
            searchable={true}
            selectable={true}
            pagination={{
              currentPage,
              totalPages: Math.ceil(receipts.length / itemsPerPage),
              itemsPerPage,
              totalItems: receipts.length,
              onPageChange: setCurrentPage,
              onItemsPerPageChange: setItemsPerPage,
            }}
            exportable={true}
            exportFilename="digital-receipts"
            onExport={(_format, _items) => {
              // Export is handled automatically by ExportButton component
            }}
            emptyMessage="No digital receipts found."
          />
        </CardContent>
      </Card>

      {/* Receipt Details Modal */}
      <Modal
        isOpen={isViewModalOpen}
        onClose={() => {
          setIsViewModalOpen(false);
          setSelectedReceipt(null);
        }}
        title={`Digital Receipt - ${selectedReceipt?.receiptNumber}`}
        className="max-w-4xl"
      >
        {selectedReceipt && (
          <div className="space-y-6">
            {/* Receipt Header */}
            <div className="text-center border-b border-gray-200 dark:border-gray-700 pb-4">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Restaurant POS</h2>
              <p className="text-gray-600 dark:text-gray-400">123 Main Street, Anytown, ST 12345</p>
              <p className="text-gray-600 dark:text-gray-400">Phone: (555) 123-4567</p>
              <p className="text-sm text-gray-500 dark:text-gray-500 mt-2">
                Receipt #{selectedReceipt.receiptNumber}
              </p>
            </div>

            {/* Customer Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="font-medium text-gray-900 dark:text-white mb-2">Customer Information</h3>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Email:</span>
                    <span className="font-medium text-gray-900 dark:text-white">
                      {selectedReceipt.customerEmail || 'Walk-in Customer'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Date:</span>
                    <span className="font-medium text-gray-900 dark:text-white">
                      {formatDateTime(selectedReceipt.createdAt)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Payment Method:</span>
                    {getPaymentMethodBadge(selectedReceipt.paymentMethod)}
                  </div>
                </div>
              </div>

              <div>
                <h3 className="font-medium text-gray-900 dark:text-white mb-2">Order Summary</h3>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Subtotal:</span>
                    <span className="font-medium text-gray-900 dark:text-white">
                      {formatCurrency(selectedReceipt.subtotal)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Tax:</span>
                    <span className="font-medium text-gray-900 dark:text-white">
                      {formatCurrency(selectedReceipt.tax)}
                    </span>
                  </div>
                  {selectedReceipt.tip && (
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Tip:</span>
                      <span className="font-medium text-gray-900 dark:text-white">
                        {formatCurrency(selectedReceipt.tip)}
                      </span>
                    </div>
                  )}
                  <div className="border-t border-gray-200 dark:border-gray-700 pt-1">
                    <div className="flex justify-between text-lg font-bold">
                      <span className="text-gray-900 dark:text-white">Total:</span>
                      <span className="text-gray-900 dark:text-white">
                        {formatCurrency(selectedReceipt.total)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Order Items */}
            <div>
              <h3 className="font-medium text-gray-900 dark:text-white mb-4">Order Items</h3>
              <div className="space-y-2">
                {selectedReceipt.items.map((item, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <div className="flex-1">
                      <p className="font-medium text-gray-900 dark:text-white">{item.name}</p>
                    </div>
                    <div className="text-right mr-4">
                      <p className="font-medium text-gray-900 dark:text-white">
                        {item.quantity} × {formatCurrency(item.price)}
                      </p>
                    </div>
                    <p className="font-semibold text-gray-900 dark:text-white">
                      {formatCurrency(item.total)}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Loyalty Points */}
            {selectedReceipt.loyaltyPointsEarned && (
              <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium text-green-800 dark:text-green-400">Loyalty Points Earned</h4>
                    <p className="text-sm text-green-700 dark:text-green-300">
                      {selectedReceipt.loyaltyPointsEarned} points added to your account
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-green-600">+{selectedReceipt.loyaltyPointsEarned}</p>
                    <p className="text-sm text-green-700 dark:text-green-300">
                      New Balance: {selectedReceipt.loyaltyPointsBalance} pts
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Personalized Offers */}
            {selectedReceipt.personalizedOffers && selectedReceipt.personalizedOffers.length > 0 && (
              <div>
                <h3 className="font-medium text-gray-900 dark:text-white mb-4">Special Offers for You</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {selectedReceipt.personalizedOffers.map((offer, index) => (
                    <div key={index} className="border border-purple-200 dark:border-purple-800 rounded-lg p-4">
                      <h4 className="font-semibold text-purple-800 dark:text-purple-400 mb-1">
                        {offer.title}
                      </h4>
                      <p className="text-sm text-purple-700 dark:text-purple-300 mb-2">
                        {offer.description}
                      </p>
                      <div className="flex items-center justify-between">
                        <Badge variant="info" className="text-xs">
                          Code: {offer.code}
                        </Badge>
                        <span className="text-xs text-gray-600 dark:text-gray-400">
                          Expires: {new Date(offer.expiryDate).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
              <Button
                variant="secondary"
                onClick={() => {
                  setIsViewModalOpen(false);
                  setSelectedReceipt(null);
                }}
              >
                Close
              </Button>
              <Button
                variant="secondary"
                onClick={() => handleDownloadReceipt(selectedReceipt)}
              >
                <PrinterIcon className="w-4 h-4 mr-2" />
                Print/Download
              </Button>
              <Button
                onClick={() => {
                  setIsViewModalOpen(false);
                  openEmailModal(selectedReceipt);
                }}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <EnvelopeIcon className="w-4 h-4 mr-2" />
                Email Receipt
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Email Receipt Modal */}
      <Modal
        isOpen={isEmailModalOpen}
        onClose={() => {
          setIsEmailModalOpen(false);
          resetEmailForm();
          setSelectedReceipt(null);
        }}
        title="Email Digital Receipt"
        className="max-w-md"
      >
        <div className="space-y-4">
          <p className="text-gray-600 dark:text-gray-400">
            Send a copy of this receipt to the customer's email address.
          </p>

          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
            <h4 className="font-medium text-blue-800 dark:text-blue-400 mb-2">Receipt Summary</h4>
            <div className="text-sm space-y-1">
              <div className="flex justify-between">
                <span>Receipt #:</span>
                <span className="font-medium">{selectedReceipt?.receiptNumber}</span>
              </div>
              <div className="flex justify-between">
                <span>Total:</span>
                <span className="font-medium">{formatCurrency(selectedReceipt?.total || 0)}</span>
              </div>
              <div className="flex justify-between">
                <span>Date:</span>
                <span className="font-medium">{selectedReceipt ? formatDateTime(selectedReceipt.createdAt) : ''}</span>
              </div>
            </div>
          </div>

          <Input
            label="Customer Email Address"
            type="email"
            value={emailForm.email}
            onChange={(e) => {
              setEmailForm({ email: e.target.value });
              if (formErrors.email?.email) {
                setFormErrors(prev => ({
                  ...prev,
                  email: { ...prev.email, email: undefined },
                }));
              }
            }}
            placeholder="customer@example.com"
            required
            error={formErrors.email?.email}
          />

          <div className="flex justify-end gap-3 pt-4">
            <Button
              variant="secondary"
              onClick={() => {
                setIsEmailModalOpen(false);
                resetEmailForm();
                setSelectedReceipt(null);
              }}
              disabled={isEmailing}
            >
              Cancel
            </Button>
            <Button onClick={handleEmailReceipt} disabled={isEmailing}>
              {isEmailing ? 'Sending...' : 'Send Email'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Generate Receipt Modal */}
      <Modal
        isOpen={isGenerateModalOpen}
        onClose={() => {
          setIsGenerateModalOpen(false);
          resetGenerateForm();
        }}
        title="Generate Digital Receipt"
        className="max-w-md"
      >
        <div className="space-y-4">
          <p className="text-gray-600 dark:text-gray-400">
            Select a completed order to generate a digital receipt.
          </p>

          <Select
            label="Select Order *"
            value={generateForm.orderId}
            onChange={(value) => {
              // Don't process empty values or loading/error states
              if (!value || value === '' || isLoadingOrders) {
                return;
              }
              
              // Clear error when value changes
              if (formErrors.generate?.orderId) {
                setFormErrors(prev => ({
                  ...prev,
                  generate: { ...prev.generate, orderId: undefined },
                }));
              }
              
              // Find the selected order - try multiple ID formats
              const selectedOrder = completedOrders?.orders?.find(
                (o: any) => {
                  const oId = o.id?.toString() || o._id?.toString() || '';
                  const vId = value?.toString() || '';
                  return oId === vId || o.id === value || o._id === value || o._id?.toString() === value;
                }
              );
              
              if (selectedOrder) {
                // Extract the proper ID - try multiple formats
                const orderId = selectedOrder.id || selectedOrder._id || value;
                setGenerateForm({ 
                  ...generateForm, 
                  orderId: orderId?.toString() || value,
                  customerEmail: selectedOrder.customerInfo?.email || generateForm.customerEmail,
                });
              } else {
                // If order not found, still set the value (might be a valid ID)
                setGenerateForm({ ...generateForm, orderId: value });
              }
            }}
            options={
              isLoadingOrders
                ? []
                : completedOrders?.orders?.length
                ? completedOrders.orders
                    .filter((order: any) => {
                      // Filter out orders without valid IDs
                      const orderId = order.id || order._id;
                      return orderId !== undefined && orderId !== null && orderId !== '';
                    })
                    .map((order: any) => {
                      // Extract proper ID - try multiple formats
                      const orderId = order.id || order._id || '';
                      if (!orderId) return null;
                      
                      // Build customer info string
                      const customerInfo = order.customerInfo 
                        ? (order.customerInfo.name 
                            ? `${order.customerInfo.name}${order.customerInfo.email ? ` (${order.customerInfo.email})` : ''}`
                            : order.customerInfo.email || '')
                        : 'Walk-in Customer';
                      
                      return {
                        value: orderId.toString(),
                        label: `Order #${order.orderNumber || order.orderNumber || 'N/A'} - ${formatCurrency(order.totalAmount || 0)} - ${customerInfo} - ${order.createdAt ? new Date(order.createdAt).toLocaleDateString() : 'N/A'}`,
                      };
                    })
                    .filter((opt: any) => opt !== null) // Remove null entries
                : []
            }
            error={formErrors.generate?.orderId}
            disabled={isLoadingOrders || !completedOrders?.orders?.length}
            placeholder={
              isLoadingOrders 
                ? 'Loading orders...' 
                : !completedOrders?.orders?.length 
                ? 'No completed orders available' 
                : 'Select an order...'
            }
          />

          <Input
            label="Customer Email (Optional)"
            type="email"
            value={generateForm.customerEmail}
            onChange={(e) => {
              setGenerateForm({ ...generateForm, customerEmail: e.target.value });
              if (formErrors.generate?.customerEmail) {
                setFormErrors(prev => ({
                  ...prev,
                  generate: { ...prev.generate, customerEmail: undefined },
                }));
              }
            }}
            placeholder="customer@example.com"
            error={formErrors.generate?.customerEmail}
          />

          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
            <p className="text-sm text-blue-700 dark:text-blue-300">
              💡 A digital receipt will be generated and can be emailed to the customer or downloaded.
            </p>
          </div>

          {isLoadingOrders && (
            <div className="text-sm text-gray-500 dark:text-gray-400">
              Loading available orders...
            </div>
          )}

          {!isLoadingOrders && (!completedOrders?.orders || completedOrders.orders.length === 0) && (
            <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-4">
              <p className="text-sm text-yellow-700 dark:text-yellow-300">
                No completed orders available. Complete an order in the POS system first.
              </p>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4">
            <Button
              variant="secondary"
              onClick={() => {
                setIsGenerateModalOpen(false);
                resetGenerateForm();
              }}
              disabled={isGenerating}
            >
              Cancel
            </Button>
            <Button onClick={handleGenerateReceipt} disabled={isGenerating || isLoadingOrders}>
              {isGenerating ? 'Generating...' : 'Generate Receipt'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

