'use client';

import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { DataTable } from '@/components/ui/DataTable';
import { ImportButton } from '@/components/ui/ImportButton';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Select } from '@/components/ui/Select';
import { useGetInventoryItemsQuery } from '@/lib/api/endpoints/inventoryApi';
import { CreatePurchaseOrderRequest, PurchaseOrder, useApprovePurchaseOrderMutation, useCancelPurchaseOrderMutation, useCreatePurchaseOrderMutation, useGetPurchaseOrdersQuery, useReceivePurchaseOrderMutation } from '@/lib/api/endpoints/purchaseOrdersApi';
import { useGetSuppliersQuery } from '@/lib/api/endpoints/suppliersApi';
import { useAppSelector } from '@/lib/store';
import { formatCurrency, formatDateTime } from '@/lib/utils';
import {
  CheckCircleIcon,
  ClipboardDocumentListIcon,
  ClockIcon,
  CurrencyDollarIcon,
  EyeIcon,
  PlusIcon,
  TruckIcon,
  XCircleIcon
} from '@heroicons/react/24/outline';
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';

export default function PurchaseOrdersPage() {
  const { user, companyContext } = useAppSelector((state) => state.auth);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isApproveModalOpen, setIsApproveModalOpen] = useState(false);
  const [isReceiveModalOpen, setIsReceiveModalOpen] = useState(false);
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<PurchaseOrder | null>(null);
  const [receivedQuantities, setReceivedQuantities] = useState<Record<string, number>>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [supplierFilter, setSupplierFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);

  const companyId =
    (user as any)?.companyId ||
    (companyContext as any)?.companyId ||
    (companyContext as any)?._id ||
    (companyContext as any)?.id;

  const branchId =
    (user as any)?.branchId ||
    (companyContext as any)?.branchId ||
    (companyContext as any)?.branches?.[0]?._id ||
    (companyContext as any)?.branches?.[0]?.id;

  const { data: ordersData, isLoading, refetch } = useGetPurchaseOrdersQuery({
    companyId: companyId || undefined,
    branchId: branchId || undefined,
    search: searchQuery || undefined,
    status: statusFilter === 'all' ? undefined : statusFilter,
    supplierId: supplierFilter === 'all' ? undefined : supplierFilter,
    page: currentPage,
    limit: itemsPerPage,
  }, { skip: !companyId });

  const { data: suppliers } = useGetSuppliersQuery({ companyId: companyId || undefined });
  const { data: ingredients } = useGetInventoryItemsQuery({
    companyId: companyId || undefined,
    branchId: branchId || undefined,
  }, { skip: !companyId });

  const [createOrder] = useCreatePurchaseOrderMutation();
  const [approveOrder] = useApprovePurchaseOrderMutation();
  const [receiveOrder] = useReceivePurchaseOrderMutation();
  const [cancelOrder] = useCancelPurchaseOrderMutation();

  const [formData, setFormData] = useState<CreatePurchaseOrderRequest>({
    companyId: companyId || '',
    branchId: branchId || undefined,
    supplierId: '',
    expectedDeliveryDate: '',
    notes: '',
    items: [],
  });

  const [newItem, setNewItem] = useState({
    ingredientId: '',
    quantity: 0,
    unitPrice: 0,
    notes: '',
  });

  useEffect(() => {
    setFormData((prev) => ({
      ...prev,
      companyId: companyId || prev.companyId,
      branchId: branchId || prev.branchId,
    }));
  }, [companyId, branchId]);

  const resetForm = () => {
    setFormData({
      companyId: companyId || '',
      branchId: branchId || undefined,
      supplierId: '',
      expectedDeliveryDate: '',
      notes: '',
      items: [],
    });
    setNewItem({
      ingredientId: '',
      quantity: 0,
      unitPrice: 0,
      notes: '',
    });
  };

  const addItem = () => {
    if (!newItem.ingredientId || newItem.quantity <= 0 || newItem.unitPrice <= 0) {
      toast.error('Please fill in all item fields');
      return;
    }

    setFormData({
      ...formData,
      items: [...formData.items, { ...newItem }],
    });

    setNewItem({
      ingredientId: '',
      quantity: 0,
      unitPrice: 0,
      notes: '',
    });
  };

  const removeItem = (index: number) => {
    setFormData({
      ...formData,
      items: formData.items.filter((_, i) => i !== index),
    });
  };

  const handleCreate = async () => {
    if (!formData.companyId) {
      toast.error('Company context is missing. Please refresh the page.');
      return;
    }

    if (!formData.supplierId || formData.items.length === 0) {
      toast.error('Please select a supplier and add at least one item');
      return;
    }

    try {
      await createOrder({
        ...formData,
        branchId: formData.branchId || branchId,
      }).unwrap();
      toast.success('Purchase order created successfully');
      setIsCreateModalOpen(false);
      resetForm();
      // Refetch will be triggered automatically by RTK Query cache invalidation
      // But we call it explicitly to ensure immediate update
      refetch();
    } catch (error: any) {
      toast.error(error.data?.message || 'Failed to create purchase order');
    }
  };

  const handleApprove = async (approvedBy: string, notes?: string) => {
    if (!selectedOrder) return;

    try {
      await approveOrder({
        id: selectedOrder.id,
        data: { approvedBy, notes },
      }).unwrap();
      toast.success('Purchase order approved successfully');
      setIsApproveModalOpen(false);
      setSelectedOrder(null);
      refetch();
    } catch (error: any) {
      toast.error(error.data?.message || 'Failed to approve purchase order');
    }
  };

  const handleReceive = async (receivedItems: Array<{ itemId: string; receivedQuantity: number }>) => {
    if (!selectedOrder) return;

    try {
      await receiveOrder({
        id: selectedOrder.id,
        data: { receivedItems },
      }).unwrap();
      toast.success('Purchase order received successfully');
      setIsReceiveModalOpen(false);
      setSelectedOrder(null);
      setReceivedQuantities({});
      refetch();
    } catch (error: any) {
      toast.error(error.data?.message || 'Failed to receive purchase order');
    }
  };

  const handleCancel = async (reason: string) => {
    if (!selectedOrder) return;

    try {
      await cancelOrder({
        id: selectedOrder.id,
        reason,
      }).unwrap();
      toast.success('Purchase order cancelled successfully');
      setIsCancelModalOpen(false);
      setSelectedOrder(null);
      refetch();
    } catch (error: any) {
      toast.error(error.data?.message || 'Failed to cancel purchase order');
    }
  };

  const openViewModal = (order: PurchaseOrder) => {
    setSelectedOrder(order);
    setIsViewModalOpen(true);
  };

  const getStatusBadge = (status: PurchaseOrder['status']) => {
    const variants = {
      draft: 'secondary',
      pending: 'warning',
      approved: 'info',
      ordered: 'info',
      received: 'success',
      cancelled: 'danger',
    } as const;

    return <Badge variant={variants[status]}>{status}</Badge>;
  };

  const columns = [
    {
      key: 'orderNumber',
      title: 'Order #',
      sortable: true,
      render: (value: string, row: PurchaseOrder) => (
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
            <ClipboardDocumentListIcon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <p className="font-medium text-gray-900 dark:text-white">{value}</p>
            <p className="text-sm text-gray-500 dark:text-gray-400">{row.supplier.name}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'status',
      title: 'Status',
      render: (value: PurchaseOrder['status']) => getStatusBadge(value),
    },
    {
      key: 'totalAmount',
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
      key: 'expectedDeliveryDate',
      title: 'Delivery Date',
      render: (value: string) => (
        <div className="flex items-center gap-2">
          <ClockIcon className="w-4 h-4 text-gray-400" />
          <span className="text-sm text-gray-600 dark:text-gray-400">
            {new Date(value).toLocaleDateString()}
          </span>
        </div>
      ),
    },
    {
      key: 'items',
      title: 'Items',
      render: (value: any, row: PurchaseOrder) => (
        <span className="text-sm text-gray-600 dark:text-gray-400">
          {row.items.length} items
        </span>
      ),
    },
    {
      key: 'createdAt',
      title: 'Created',
      render: (value: string) => (
        <span className="text-sm text-gray-600 dark:text-gray-400">
          {formatDateTime(value)}
        </span>
      ),
    },
    {
      key: 'actions',
      title: 'Actions',
      render: (value: any, row: PurchaseOrder) => (
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => openViewModal(row)}
          >
            <EyeIcon className="w-4 h-4" />
          </Button>
          {row.status === 'pending' && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSelectedOrder(row);
                setIsApproveModalOpen(true);
              }}
              className="text-green-600 hover:text-green-700"
            >
              <CheckCircleIcon className="w-4 h-4" />
            </Button>
          )}
          {row.status === 'approved' && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSelectedOrder(row);
                setReceivedQuantities({});
                setIsReceiveModalOpen(true);
              }}
              className="text-blue-600 hover:text-blue-700"
              title="Receive Order"
            >
              <TruckIcon className="w-4 h-4" />
            </Button>
          )}
          {row.status !== 'cancelled' && row.status !== 'received' && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSelectedOrder(row);
                setIsCancelModalOpen(true);
              }}
              className="text-red-600 hover:text-red-700"
              title="Cancel Order"
            >
              <XCircleIcon className="w-4 h-4" />
            </Button>
          )}
        </div>
      ),
    },
  ];

  const stats = {
    total: ordersData?.total || 0,
    pending: ordersData?.orders?.filter(o => o.status === 'pending').length || 0,
    approved: ordersData?.orders?.filter(o => o.status === 'approved').length || 0,
    received: ordersData?.orders?.filter(o => o.status === 'received').length || 0,
    totalValue: ordersData?.orders?.reduce((sum, order) => sum + order.totalAmount, 0) || 0,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Purchase Orders</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Manage purchase orders and supplier deliveries
          </p>
        </div>
        <div className="flex items-center gap-2">
          <ImportButton
            onImport={async (data, _result) => {
              let successCount = 0;
              let errorCount = 0;

              for (const item of data) {
                try {
                  if (!companyId) {
                    toast.error('Company context is missing. Please refresh the page.');
                    return;
                  }

                  // Parse items from CSV (format: "Ingredient Name:Quantity:Price" separated by semicolons)
                  const items: any[] = [];
                  if (item.items || item.Items) {
                    const itemsStr = item.items || item.Items;
                    const itemList = itemsStr.split(';').map((i: string) => i.trim()).filter(Boolean);
                    
                    for (const itemStr of itemList) {
                      const parts = itemStr.split(':');
                      if (parts.length >= 2) {
                        // Find ingredient by name
                        const ingredientName = parts[0].trim();
                        const ingredientList = (ingredients as any)?.data || (ingredients as any) || [];
                        const ingredient = ingredientList.find((ing: any) => 
                          ing.name.toLowerCase() === ingredientName.toLowerCase()
                        );
                        
                        if (ingredient) {
                          items.push({
                            ingredientId: ingredient.id || ingredient._id,
                            quantity: parseFloat(parts[1] || 0),
                            unitPrice: parseFloat(parts[2] || 0) || ingredient.unitCost || 0,
                            notes: parts[3] || undefined,
                          });
                        }
                      }
                    }
                  }

                  if (items.length === 0) {
                    errorCount++;
                    continue;
                  }

                  // Find supplier by name
                  let supplierId = item.supplierId || item['Supplier ID'];
                  if (!supplierId && (item.supplier || item.Supplier)) {
                    const supplierName = item.supplier || item.Supplier;
                    const supplierList = (suppliers as any)?.data || (suppliers as any) || [];
                    const supplier = supplierList.find((s: any) => 
                      s.name.toLowerCase() === supplierName.toLowerCase()
                    );
                    supplierId = supplier?.id || supplier?._id;
                  }

                  if (!supplierId) {
                    errorCount++;
                    continue;
                  }

                  const payload: CreatePurchaseOrderRequest = {
                    companyId,
                    branchId: branchId || undefined,
                    supplierId,
                    expectedDeliveryDate: item.expectedDeliveryDate || item['Expected Delivery Date'] || '',
                    notes: item.notes || item.Notes || undefined,
                    items,
                  };

                  await createOrder(payload).unwrap();
                  successCount++;
                } catch (error: any) {
                  console.error('Failed to import purchase order:', item, error);
                  errorCount++;
                }
              }

              if (successCount > 0) {
                toast.success(`Successfully imported ${successCount} purchase orders`);
                await refetch();
              }
              if (errorCount > 0) {
                toast.error(`Failed to import ${errorCount} purchase orders`);
              }
            }}
            columns={[
              { key: 'supplier', label: 'Supplier Name', required: true, type: 'string' },
              { key: 'items', label: 'Items (Format: Name:Qty:Price;Name:Qty:Price)', required: true, type: 'string' },
              { key: 'expectedDeliveryDate', label: 'Expected Delivery Date', type: 'date' },
              { key: 'notes', label: 'Notes', type: 'string' },
            ]}
            filename="purchase-orders-import-template"
            variant="secondary"
          />
          <Button onClick={() => setIsCreateModalOpen(true)}>
            <PlusIcon className="w-5 h-5 mr-2" />
            Create Order
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Total Orders</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white">{stats.total}</p>
              </div>
              <ClipboardDocumentListIcon className="w-8 h-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Pending Approval</p>
                <p className="text-3xl font-bold text-yellow-600">{stats.pending}</p>
              </div>
              <ClockIcon className="w-8 h-8 text-yellow-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Approved</p>
                <p className="text-3xl font-bold text-blue-600">{stats.approved}</p>
              </div>
              <CheckCircleIcon className="w-8 h-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Received</p>
                <p className="text-3xl font-bold text-green-600">{stats.received}</p>
              </div>
              <TruckIcon className="w-8 h-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Total Value</p>
                <p className="text-3xl font-bold text-purple-600">{formatCurrency(stats.totalValue)}</p>
              </div>
              <CurrencyDollarIcon className="w-8 h-8 text-purple-600" />
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
                placeholder="Search purchase orders..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="w-full sm:w-48">
              <Select
                options={[
                  { value: 'all', label: 'All Status' },
                  { value: 'draft', label: 'Draft' },
                  { value: 'pending', label: 'Pending' },
                  { value: 'approved', label: 'Approved' },
                  { value: 'ordered', label: 'Ordered' },
                  { value: 'received', label: 'Received' },
                  { value: 'cancelled', label: 'Cancelled' },
                ]}
                value={statusFilter}
                onChange={setStatusFilter}
                placeholder="Filter by status"
              />
            </div>
            <div className="w-full sm:w-48">
              <Select
                options={[
                  { value: 'all', label: 'All Suppliers' },
                  ...(suppliers?.suppliers?.map(s => ({ value: s.id, label: s.name })) || []),
                ]}
                value={supplierFilter}
                onChange={setSupplierFilter}
                placeholder="Filter by supplier"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Purchase Orders Table */}
      <DataTable
        data={ordersData?.orders || []}
        columns={columns}
        loading={isLoading}
        searchable={false}
        selectable={true}
        pagination={{
          currentPage,
          totalPages: Math.ceil((ordersData?.total || 0) / itemsPerPage),
          itemsPerPage,
          totalItems: ordersData?.total || 0,
          onPageChange: setCurrentPage,
          onItemsPerPageChange: setItemsPerPage,
        }}
        exportable={true}
        exportFilename="purchase-orders"
        onExport={(format, items) => {
          console.log(`Exporting ${items.length} purchase orders as ${format}`);
        }}
        emptyMessage="No purchase orders found."
      />

      {/* Create Purchase Order Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => {
          setIsCreateModalOpen(false);
          resetForm();
        }}
        title="Create Purchase Order"
        className="max-w-4xl"
      >
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Select
              label="Supplier"
              options={suppliers?.suppliers?.map(s => ({ value: s.id, label: s.name })) || []}
              value={formData.supplierId}
              onChange={(value) => setFormData({ ...formData, supplierId: value })}
              placeholder="Select supplier"
            />
            <Input
              label="Expected Delivery Date"
              type="date"
              value={formData.expectedDeliveryDate}
              onChange={(e) => setFormData({ ...formData, expectedDeliveryDate: e.target.value })}
            />
          </div>

          {/* Add Items Section */}
          <div>
            <h3 className="font-medium text-gray-900 dark:text-white mb-4">Order Items</h3>

            {/* Add New Item */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <Select
                options={ingredients?.items?.map(i => ({ value: i.id, label: i.name })) || []}
                value={newItem.ingredientId}
                onChange={(value) => setNewItem({ ...newItem, ingredientId: value })}
                placeholder="Select ingredient"
              />
              <Input
                type="number"
                placeholder="Quantity"
                value={newItem.quantity}
                onChange={(e) => setNewItem({ ...newItem, quantity: parseFloat(e.target.value) || 0 })}
              />
              <Input
                type="number"
                step="0.01"
                placeholder="Unit Price"
                value={newItem.unitPrice}
                onChange={(e) => setNewItem({ ...newItem, unitPrice: parseFloat(e.target.value) || 0 })}
              />
              <div className="flex gap-2">
                <Button onClick={addItem} className="flex-1">
                  Add
                </Button>
              </div>
            </div>

            {/* Items List */}
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {formData.items.map((item, index) => {
                const ingredient = ingredients?.items?.find(i => i.id === item.ingredientId);
                return (
                  <div key={index} className="flex items-center justify-between p-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg">
                    <div className="flex-1">
                      <p className="font-medium text-gray-900 dark:text-white">
                        {ingredient?.name || 'Unknown Ingredient'}
                      </p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {item.quantity} {ingredient?.unit} × {formatCurrency(item.unitPrice)}
                      </p>
                    </div>
                    <div className="text-right mr-3">
                      <p className="font-semibold text-gray-900 dark:text-white">
                        {formatCurrency(item.quantity * item.unitPrice)}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeItem(index)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <XCircleIcon className="w-4 h-4" />
                    </Button>
                  </div>
                );
              })}
            </div>

            {formData.items.length > 0 && (
              <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <div className="flex justify-between items-center">
                  <span className="font-medium text-gray-900 dark:text-white">Total Items:</span>
                  <span className="font-bold text-lg text-gray-900 dark:text-white">
                    {formData.items.length}
                  </span>
                </div>
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Notes (Optional)
            </label>
            <textarea
              rows={3}
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="input w-full"
              placeholder="Additional notes for this purchase order..."
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button
              variant="secondary"
              onClick={() => {
                setIsCreateModalOpen(false);
                resetForm();
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleCreate}>
              Create Purchase Order
            </Button>
          </div>
        </div>
      </Modal>

      {/* Order Details Modal */}
      <Modal
        isOpen={isViewModalOpen}
        onClose={() => {
          setIsViewModalOpen(false);
          setSelectedOrder(null);
        }}
        title={`Purchase Order - ${selectedOrder?.orderNumber}`}
        className="max-w-4xl"
      >
        {selectedOrder && (
          <div className="space-y-6">
            {/* Order Header */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <h3 className="font-medium text-gray-900 dark:text-white mb-2">Order Information</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Order #:</span>
                    <span className="font-medium text-gray-900 dark:text-white">{selectedOrder.orderNumber}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Status:</span>
                    {getStatusBadge(selectedOrder.status)}
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Order Date:</span>
                    <span className="font-medium text-gray-900 dark:text-white">
                      {formatDateTime(selectedOrder.orderDate)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Expected Delivery:</span>
                    <span className="font-medium text-gray-900 dark:text-white">
                      {formatDateTime(selectedOrder.expectedDeliveryDate)}
                    </span>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="font-medium text-gray-900 dark:text-white mb-2">Supplier Details</h3>
                <div className="space-y-2 text-sm">
                  <p className="font-medium text-gray-900 dark:text-white">{selectedOrder.supplier.name}</p>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Contact:</span>
                    <span className="font-medium text-gray-900 dark:text-white">
                      {selectedOrder.supplier.contactPerson}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Phone:</span>
                    <span className="font-medium text-gray-900 dark:text-white">
                      {selectedOrder.supplier.phoneNumber}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Email:</span>
                    <span className="font-medium text-gray-900 dark:text-white">
                      {selectedOrder.supplier.email}
                    </span>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="font-medium text-gray-900 dark:text-white mb-2">Order Summary</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Subtotal:</span>
                    <span className="font-medium text-gray-900 dark:text-white">
                      {formatCurrency(selectedOrder.totalAmount - selectedOrder.taxAmount)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Tax:</span>
                    <span className="font-medium text-gray-900 dark:text-white">
                      {formatCurrency(selectedOrder.taxAmount)}
                    </span>
                  </div>
                  {selectedOrder.discountAmount && (
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Discount:</span>
                      <span className="font-medium text-green-600">
                        -{formatCurrency(selectedOrder.discountAmount)}
                      </span>
                    </div>
                  )}
                  <div className="border-t border-gray-200 dark:border-gray-700 pt-2">
                    <div className="flex justify-between text-lg font-bold">
                      <span className="text-gray-900 dark:text-white">Total:</span>
                      <span className="text-gray-900 dark:text-white">
                        {formatCurrency(selectedOrder.totalAmount)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Order Items */}
            <div>
              <h3 className="font-medium text-gray-900 dark:text-white mb-4">Order Items</h3>
              <div className="space-y-3">
                {selectedOrder.items.map((item) => (
                  <div key={item.id} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <div className="flex-1">
                      <p className="font-medium text-gray-900 dark:text-white">
                        {item.ingredient.name}
                      </p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {item.quantity} {item.ingredient.unit} × {formatCurrency(item.unitPrice)}
                      </p>
                      {item.notes && (
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          Note: {item.notes}
                        </p>
                      )}
                    </div>
                    <div className="text-right mr-4">
                      <p className="font-semibold text-gray-900 dark:text-white">
                        {formatCurrency(item.totalPrice)}
                      </p>
                      {item.receivedQuantity !== undefined && (
                        <p className="text-sm text-green-600">
                          Received: {item.receivedQuantity}/{item.quantity}
                        </p>
                      )}
                    </div>
                    {getStatusBadge(item.receivedQuantity !== undefined ? 'received' : 'pending')}
                  </div>
                ))}
              </div>
            </div>

            {/* Notes */}
            {selectedOrder.notes && (
              <div>
                <h3 className="font-medium text-gray-900 dark:text-white mb-2">Notes</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-800 p-3 rounded-lg">
                  {selectedOrder.notes}
                </p>
              </div>
            )}

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
              <Button
                variant="secondary"
                onClick={() => {
                  setIsViewModalOpen(false);
                  setSelectedOrder(null);
                }}
              >
                Close
              </Button>
              {selectedOrder.status === 'pending' && (
                <Button
                  onClick={() => {
                    setIsViewModalOpen(false);
                    setIsApproveModalOpen(true);
                  }}
                  className="bg-green-600 hover:bg-green-700"
                >
                  Approve Order
                </Button>
              )}
              {selectedOrder.status === 'approved' && (
                <Button
                  onClick={() => {
                    setIsViewModalOpen(false);
                    setIsReceiveModalOpen(true);
                  }}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  Receive Order
                </Button>
              )}
            </div>
          </div>
        )}
      </Modal>

      {/* Approve Order Modal */}
      <Modal
        isOpen={isApproveModalOpen}
        onClose={() => {
          setIsApproveModalOpen(false);
          setSelectedOrder(null);
        }}
        title="Approve Purchase Order"
        className="max-w-md"
      >
        <div className="space-y-4">
          <p className="text-gray-600 dark:text-gray-400">
            Are you sure you want to approve this purchase order?
          </p>

          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
            <h4 className="font-medium text-blue-800 dark:text-blue-400 mb-2">Order Summary</h4>
            <div className="text-sm space-y-1">
              <div className="flex justify-between">
                <span>Order #:</span>
                <span className="font-medium">{selectedOrder?.orderNumber}</span>
              </div>
              <div className="flex justify-between">
                <span>Supplier:</span>
                <span className="font-medium">{selectedOrder?.supplier.name}</span>
              </div>
              <div className="flex justify-between">
                <span>Total Amount:</span>
                <span className="font-medium">{formatCurrency(selectedOrder?.totalAmount || 0)}</span>
              </div>
              <div className="flex justify-between">
                <span>Items:</span>
                <span className="font-medium">{selectedOrder?.items.length} items</span>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Approval Notes (Optional)
            </label>
            <textarea
              rows={3}
              className="input w-full"
              placeholder="Add any approval notes..."
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button
              variant="secondary"
              onClick={() => {
                setIsApproveModalOpen(false);
                setSelectedOrder(null);
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={() => handleApprove(user?.id || '', 'Approved via system')}
              className="bg-green-600 hover:bg-green-700"
            >
              Approve Order
            </Button>
          </div>
        </div>
      </Modal>

      {/* Receive Order Modal */}
      <Modal
        isOpen={isReceiveModalOpen}
        onClose={() => {
          setIsReceiveModalOpen(false);
          setSelectedOrder(null);
          setReceivedQuantities({});
        }}
        title="Receive Purchase Order"
        className="max-w-4xl"
      >
        <div className="space-y-6">
          <p className="text-gray-600 dark:text-gray-400">
            Update received quantities for each item in this purchase order.
          </p>

          <div className="space-y-4">
            {selectedOrder?.items.map((item) => (
              <div key={item.id} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <div className="flex-1">
                  <p className="font-medium text-gray-900 dark:text-white">
                    {item.ingredient.name}
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Ordered: {item.quantity} {item.ingredient.unit} × {formatCurrency(item.unitPrice)}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <Input
                    type="number"
                    placeholder="Received"
                    value={receivedQuantities[item.id] ?? (item.receivedQuantity || item.quantity)}
                    onChange={(e) => setReceivedQuantities({
                      ...receivedQuantities,
                      [item.id]: Math.max(0, Math.min(parseFloat(e.target.value) || 0, item.quantity)),
                    })}
                    className="w-32"
                  />
                  <span className="text-sm text-gray-600 dark:text-gray-400 min-w-[80px]">
                    / {item.quantity} {item.ingredient.unit}
                  </span>
                </div>
              </div>
            ))}
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button
              variant="secondary"
              onClick={() => {
                setIsReceiveModalOpen(false);
                setSelectedOrder(null);
                setReceivedQuantities({});
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                const receivedItems = selectedOrder?.items.map(item => ({
                  itemId: item.id,
                  receivedQuantity: receivedQuantities[item.id] ?? item.quantity,
                })) || [];
                handleReceive(receivedItems);
              }}
              className="bg-blue-600 hover:bg-blue-700"
            >
              Confirm Receipt
            </Button>
          </div>
        </div>
      </Modal>

      {/* Cancel Order Modal */}
      <Modal
        isOpen={isCancelModalOpen}
        onClose={() => {
          setIsCancelModalOpen(false);
          setSelectedOrder(null);
        }}
        title="Cancel Purchase Order"
        className="max-w-md"
      >
        <div className="space-y-4">
          <p className="text-gray-600 dark:text-gray-400">
            Are you sure you want to cancel this purchase order? This action cannot be undone.
          </p>

          <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-4">
            <h4 className="font-medium text-red-800 dark:text-red-400 mb-2">Order Details</h4>
            <div className="text-sm space-y-1">
              <div className="flex justify-between">
                <span>Order #:</span>
                <span className="font-medium">{selectedOrder?.orderNumber}</span>
              </div>
              <div className="flex justify-between">
                <span>Supplier:</span>
                <span className="font-medium">{selectedOrder?.supplier.name}</span>
              </div>
              <div className="flex justify-between">
                <span>Total Amount:</span>
                <span className="font-medium">{formatCurrency(selectedOrder?.totalAmount || 0)}</span>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Cancellation Reason (Required)
            </label>
            <textarea
              id="cancel-reason"
              rows={3}
              className="input w-full"
              placeholder="Please provide a reason for cancellation..."
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button
              variant="secondary"
              onClick={() => {
                setIsCancelModalOpen(false);
                setSelectedOrder(null);
              }}
            >
              Keep Order
            </Button>
            <Button
              onClick={() => {
                const reasonInput = document.getElementById('cancel-reason') as HTMLTextAreaElement;
                const reason = reasonInput?.value || 'No reason provided';
                if (reason.trim()) {
                  handleCancel(reason);
                } else {
                  toast.error('Please provide a cancellation reason');
                }
              }}
              className="bg-red-600 hover:bg-red-700"
            >
              Cancel Order
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
