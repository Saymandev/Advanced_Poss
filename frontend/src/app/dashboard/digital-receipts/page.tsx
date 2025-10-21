'use client';

import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { DataTable } from '@/components/ui/DataTable';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { DigitalReceipt, useEmailDigitalReceiptMutation, useGenerateDigitalReceiptMutation, useGetDigitalReceiptsQuery } from '@/lib/api/endpoints/aiApi';
import { useAppSelector } from '@/lib/store';
import { formatCurrency, formatDateTime } from '@/lib/utils';
import {
    DocumentTextIcon,
    EnvelopeIcon,
    EyeIcon,
    ReceiptRefundIcon,
    ShoppingCartIcon,
    UserIcon,
} from '@heroicons/react/24/outline';
import { useState } from 'react';
import toast from 'react-hot-toast';

export default function DigitalReceiptsPage() {
  const { user } = useAppSelector((state) => state.auth);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
  const [selectedReceipt, setSelectedReceipt] = useState<DigitalReceipt | null>(null);
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);

  const { data: receiptsData, isLoading, refetch } = useGetDigitalReceiptsQuery({
    branchId: user?.branchId || undefined,
    startDate: dateRange.start || undefined,
    endDate: dateRange.end || undefined,
    customerId: searchQuery || undefined,
  });

  const [generateReceipt] = useGenerateDigitalReceiptMutation();
  const [emailReceipt] = useEmailDigitalReceiptMutation();

  const [emailForm, setEmailForm] = useState({
    email: '',
  });

  const resetEmailForm = () => {
    setEmailForm({ email: '' });
  };

  const handleGenerateReceipt = async (orderId: string, customerEmail?: string) => {
    try {
      await generateReceipt({
        orderId,
        customerEmail,
      }).unwrap();

      toast.success('Digital receipt generated successfully');
      refetch();
    } catch (error: any) {
      toast.error(error.data?.message || 'Failed to generate digital receipt');
    }
  };

  const handleEmailReceipt = async () => {
    if (!selectedReceipt || !emailForm.email) return;

    try {
      await emailReceipt({
        receiptId: selectedReceipt.id,
        email: emailForm.email,
      }).unwrap();

      toast.success('Receipt emailed successfully');
      setIsEmailModalOpen(false);
      resetEmailForm();
      setSelectedReceipt(null);
    } catch (error: any) {
      toast.error(error.data?.message || 'Failed to email receipt');
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
      render: (value: string, row: DigitalReceipt) => (
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
            <ReceiptRefundIcon className="w-5 h-5 text-green-600 dark:text-green-400" />
          </div>
          <div>
            <p className="font-medium text-gray-900 dark:text-white">{value}</p>
            <p className="text-sm text-gray-500 dark:text-gray-400">Order #{row.orderId.slice(-8)}</p>
          </div>
        </div>
      ),
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
          >
            <EyeIcon className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => openEmailModal(row)}
            className="text-blue-600 hover:text-blue-700"
          >
            <EnvelopeIcon className="w-4 h-4" />
          </Button>
        </div>
      ),
    },
  ];

  const stats = {
    total: receiptsData?.length || 0,
    totalRevenue: receiptsData?.reduce((sum, receipt) => sum + receipt.total, 0) || 0,
    loyaltyPoints: receiptsData?.reduce((sum, receipt) => sum + (receipt.loyaltyPointsEarned || 0), 0) || 0,
    avgOrderValue: receiptsData?.length ? (receiptsData.reduce((sum, receipt) => sum + receipt.total, 0) / receiptsData.length) : 0,
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
                placeholder="Search receipts..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="flex gap-2">
              <Input
                type="date"
                placeholder="Start Date"
                value={dateRange.start}
                onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                className="w-32"
              />
              <Input
                type="date"
                placeholder="End Date"
                value={dateRange.end}
                onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                className="w-32"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Digital Receipts Table */}
      <Card>
        <CardContent>
          <DataTable
            data={receiptsData || []}
            columns={columns}
            loading={isLoading}
            searchable={true}
            selectable={true}
            pagination={{
              currentPage,
              totalPages: Math.ceil((receiptsData?.length || 0) / itemsPerPage),
              itemsPerPage,
              totalItems: receiptsData?.length || 0,
              onPageChange: setCurrentPage,
              onItemsPerPageChange: setItemsPerPage,
            }}
            exportable={true}
            exportFilename="digital-receipts"
            onExport={(format, items) => {
              console.log(`Exporting ${items.length} digital receipts as ${format}`);
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
            onChange={(e) => setEmailForm({ email: e.target.value })}
            placeholder="customer@example.com"
            required
          />

          <div className="flex justify-end gap-3 pt-4">
            <Button
              variant="secondary"
              onClick={() => {
                setIsEmailModalOpen(false);
                resetEmailForm();
                setSelectedReceipt(null);
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleEmailReceipt}>
              Send Email
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
