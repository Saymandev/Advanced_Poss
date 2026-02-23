'use client';

import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { DataTable } from '@/components/ui/DataTable';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Select } from '@/components/ui/Select';
import { useFeatureRedirect } from '@/hooks/useFeatureRedirect';
import { useGetInventoryItemsQuery } from '@/lib/api/endpoints/inventoryApi';
import { useGetMenuItemsQuery } from '@/lib/api/endpoints/menuItemsApi';
import {
  Wastage,
  WastageReason,
  useCreateWastageMutation,
  useDeleteWastageMutation,
  useGetWastagesQuery,
  useUpdateWastageMutation,
} from '@/lib/api/endpoints/wastageApi';
import { useAppSelector } from '@/lib/store';
import { formatCurrency } from '@/lib/utils';
import {
  CheckCircleIcon,
  ExclamationTriangleIcon,
  EyeIcon,
  PencilIcon,
  PlusIcon,
  TrashIcon,
  XCircleIcon
} from '@heroicons/react/24/outline';
import { useCallback, useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';

const REASON_LABELS: Record<WastageReason, string> = {
  [WastageReason.EXPIRED]: 'Expired',
  [WastageReason.DAMAGED]: 'Damaged',
  [WastageReason.SPOILAGE]: 'Spoilage',
  [WastageReason.OVER_PRODUCTION]: 'Over Production',
  [WastageReason.PREPARATION_ERROR]: 'Preparation Error',
  [WastageReason.STORAGE_ISSUE]: 'Storage Issue',
  [WastageReason.CONTAMINATION]: 'Contamination',
  [WastageReason.OTHER]: 'Other',
};

const REASON_COLORS: Record<WastageReason, string> = {
  [WastageReason.EXPIRED]: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  [WastageReason.DAMAGED]: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
  [WastageReason.SPOILAGE]: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  [WastageReason.OVER_PRODUCTION]: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  [WastageReason.PREPARATION_ERROR]: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
  [WastageReason.STORAGE_ISSUE]: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400',
  [WastageReason.CONTAMINATION]: 'bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-400',
  [WastageReason.OTHER]: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400',
};

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  approved: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  rejected: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
};

export default function WastagePage() {
  // Redirect if user doesn't have wastage-management feature
  useFeatureRedirect('wastage-management');

  const { user, companyContext } = useAppSelector((state) => state.auth);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [selectedWastage, setSelectedWastage] = useState<Wastage | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [reasonFilter, setReasonFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(20);
  const [startDateFilter, setStartDateFilter] = useState('');
  const [endDateFilter, setEndDateFilter] = useState('');

  const branchId = (user as any)?.branchId || 
                   (companyContext as any)?.branchId || 
                   (companyContext as any)?.branches?.[0]?._id ||
                   (companyContext as any)?.branches?.[0]?.id;

  const companyId = (user as any)?.companyId || 
                    (companyContext as any)?.companyId ||
                    (companyContext as any)?._id ||
                    (companyContext as any)?.id;

  const queryParams = useMemo(() => {
    if (!companyId) return null;
    
    const params: any = {
      page: currentPage,
      limit: itemsPerPage,
    };

    if (branchId) {
      params.branchId = branchId;
    }

    if (reasonFilter !== 'all') {
      params.reason = reasonFilter;
    }

    if (statusFilter !== 'all') {
      params.status = statusFilter;
    }

    if (startDateFilter) {
      params.startDate = startDateFilter;
    }

    if (endDateFilter) {
      params.endDate = endDateFilter;
    }

    return params;
  }, [companyId, branchId, reasonFilter, statusFilter, startDateFilter, endDateFilter, currentPage, itemsPerPage]);

  const { data: wastageResponse, isLoading, refetch } = useGetWastagesQuery(
    queryParams || {},
    { skip: !queryParams }
  );

  const { data: ingredientsResponse } = useGetInventoryItemsQuery(
    { companyId, branchId },
    { skip: !companyId }
  );

  const { data: menuItemsResponse } = useGetMenuItemsQuery(
    { companyId, branchId },
    { skip: !companyId }
  );

  const [createWastage, { isLoading: isCreating }] = useCreateWastageMutation();
  const [updateWastage, { isLoading: isUpdating }] = useUpdateWastageMutation();
  const [deleteWastage, { isLoading: isDeleting }] = useDeleteWastageMutation();

  const wastages = useMemo(() => {
    if (!wastageResponse) return [];
    return wastageResponse.wastages || [];
  }, [wastageResponse]);

  const totalWastages = useMemo(() => {
    return wastageResponse?.total || 0;
  }, [wastageResponse]);

  const ingredients = useMemo(() => {
    if (!ingredientsResponse) return [];
    return ingredientsResponse.items || [];
  }, [ingredientsResponse]);

  const ingredientOptions = useMemo(
    () =>
      ingredients.map((ingredient: any) => ({
        value: ingredient.id || ingredient._id,
        label: `${ingredient.name} (${ingredient.currentStock || 0} ${ingredient.unit || ''})`,
        unit: ingredient.unit,
        unitCost: ingredient.unitCost,
        currentStock: ingredient.currentStock,
      })),
    [ingredients],
  );

  const menuItems = useMemo(() => {
    if (!menuItemsResponse) return [];
    return (menuItemsResponse as any).menuItems || (menuItemsResponse as any).items || [];
  }, [menuItemsResponse]);

  const menuItemOptions = useMemo(
    () =>
      menuItems.map((item: any) => ({
        value: item.id || item._id,
        label: `${item.name} (${formatCurrency(item.price || item.cost || 0)})`,
        unit: 'item',
        unitCost: item.cost || item.price || 0,
      })),
    [menuItems],
  );

  const reasonOptions = useMemo(
    () =>
      Object.entries(REASON_LABELS).map(([value, label]) => ({
        value,
        label,
      })),
    [],
  );

  const statusOptions = useMemo(
    () => [
      { value: 'all', label: 'All Status' },
      { value: 'pending', label: 'Pending' },
      { value: 'approved', label: 'Approved' },
      { value: 'rejected', label: 'Rejected' },
    ],
    [],
  );

  const reasonFilterOptions = useMemo(
    () => [
      { value: 'all', label: 'All Reasons' },
      ...Object.entries(REASON_LABELS).map(([value, label]) => ({
        value,
        label,
      })),
    ],
    [],
  );

  // Filter wastages by search query
  const filteredWastages = useMemo(() => {
    if (!searchQuery.trim()) return wastages;
    const query = searchQuery.toLowerCase();
    return wastages.filter((w: Wastage) => {
      const ingredientName = typeof w.ingredientId === 'object' 
        ? w.ingredientId.name?.toLowerCase() || ''
        : '';
      const menuItemName = typeof w.menuItemId === 'object' 
        ? w.menuItemId.name?.toLowerCase() || ''
        : '';
      const notes = w.notes?.toLowerCase() || '';
      return ingredientName.includes(query) || menuItemName.includes(query) || notes.includes(query);
    });
  }, [wastages, searchQuery]);

  const [formData, setFormData] = useState<any>({
    type: 'ingredient',
    ingredientId: '',
    menuItemId: '',
    quantity: 0,
    unit: '',
    reason: WastageReason.OTHER,
    unitCost: 0,
    wastageDate: new Date().toISOString().split('T')[0],
    notes: '',
    batchNumber: '',
    expiryDate: '',
  });

  useEffect(() => {
    if (!isCreateModalOpen && !isEditModalOpen) {
      resetForm();
    }
  }, [isCreateModalOpen, isEditModalOpen]);

  const resetForm = () => {
    setFormData({
      type: 'ingredient',
      ingredientId: '',
      menuItemId: '',
      quantity: 0,
      unit: '',
      reason: WastageReason.OTHER,
      unitCost: 0,
      wastageDate: new Date().toISOString().split('T')[0],
      notes: '',
      batchNumber: '',
      expiryDate: '',
    });
    setSelectedWastage(null);
  };

  const handleCreate = async () => {
    try {
      if ((formData.type === 'ingredient' && !formData.ingredientId) || 
          (formData.type === 'menuItem' && !formData.menuItemId) || 
          formData.quantity <= 0) {
        toast.error('Please fill in all required fields');
        return;
      }

      const payload = { ...formData };
      
      if (formData.type === 'ingredient') {
        const selectedIngredient = ingredients.find(
          (i: any) => i.id === formData.ingredientId || i._id === formData.ingredientId,
        );
        if (!selectedIngredient) {
          toast.error('Ingredient not found');
          return;
        }
        payload.unit = selectedIngredient.unit;
        payload.unitCost = formData.unitCost || selectedIngredient.unitCost || 0;
        delete payload.menuItemId;
      } else {
        const selectedMenuItem = menuItems.find(
          (i: any) => i.id === formData.menuItemId || i._id === formData.menuItemId,
        );
        if (!selectedMenuItem) {
          toast.error('Menu Item not found');
          return;
        }
        payload.unit = 'item';
        payload.unitCost = formData.unitCost || selectedMenuItem.cost || selectedMenuItem.price || 0;
        delete payload.ingredientId;
      }
      delete payload.type;

      await createWastage(payload).unwrap();

      toast.success('Wastage record created successfully');
      setIsCreateModalOpen(false);
      resetForm();
      refetch();
    } catch (error: any) {
      toast.error(error?.data?.message || 'Failed to create wastage record');
    }
  };

  const handleEdit = async () => {
    if (!selectedWastage) return;

    try {
      const payload = { ...formData };
      if (payload.type === 'ingredient') {
        delete payload.menuItemId;
      } else {
        delete payload.ingredientId;
      }
      delete payload.type;

      await updateWastage({
        id: selectedWastage._id || selectedWastage.id || '',
        data: payload,
      }).unwrap();

      toast.success('Wastage record updated successfully');
      setIsEditModalOpen(false);
      resetForm();
      refetch();
    } catch (error: any) {
      toast.error(error?.data?.message || 'Failed to update wastage record');
    }
  };

  const handleDelete = useCallback(async (id: string) => {
    if (!confirm('Are you sure you want to delete this wastage record? This will restore the stock.')) {
      return;
    }

    try {
      await deleteWastage(id).unwrap();
      toast.success('Wastage record deleted successfully');
      refetch();
    } catch (error: any) {
      toast.error(error?.data?.message || 'Failed to delete wastage record');
    }
  }, [deleteWastage, refetch]);

  const handleApprove = useCallback(async (id: string) => {
    try {
      await updateWastage({
        id,
        data: { status: 'approved' },
      }).unwrap();
      toast.success('Wastage record approved successfully');
      refetch();
    } catch (error: any) {
      toast.error(error?.data?.message || 'Failed to approve wastage record');
    }
  }, [updateWastage, refetch]);

  const handleReject = useCallback(async (id: string) => {
    if (!confirm('Are you sure you want to reject this wastage record?')) {
      return;
    }

    try {
      await updateWastage({
        id,
        data: { status: 'rejected' },
      }).unwrap();
      toast.success('Wastage record rejected');
      refetch();
    } catch (error: any) {
      toast.error(error?.data?.message || 'Failed to reject wastage record');
    }
  }, [updateWastage, refetch]);

  const openEditModal = useCallback((wastage: Wastage) => {
    const isMenuItem = !!wastage.menuItemId;
    const ingredientId = wastage.ingredientId 
      ? (typeof wastage.ingredientId === 'object' ? wastage.ingredientId._id : wastage.ingredientId)
      : '';
    const menuItemId = wastage.menuItemId 
      ? (typeof wastage.menuItemId === 'object' ? wastage.menuItemId._id : wastage.menuItemId)
      : '';

    setFormData({
      type: isMenuItem ? 'menuItem' : 'ingredient',
      ingredientId,
      menuItemId,
      quantity: wastage.quantity,
      unit: wastage.unit,
      reason: wastage.reason,
      unitCost: wastage.unitCost,
      wastageDate: wastage.wastageDate.split('T')[0],
      notes: wastage.notes || '',
      batchNumber: wastage.batchNumber || '',
      expiryDate: wastage.expiryDate ? wastage.expiryDate.split('T')[0] : '',
    });
    setSelectedWastage(wastage);
    setIsEditModalOpen(true);
  }, []);

  const openViewModal = useCallback((wastage: Wastage) => {
    setSelectedWastage(wastage);
    setIsViewModalOpen(true);
  }, []);

  const columns = useMemo(() => [
    {
      key: 'itemWasted',
      title: 'Item Wasted',
      render: (_: any, w: Wastage) => {
        if (w.menuItemId) {
          const menuItem = typeof w.menuItemId === 'object' ? w.menuItemId : null;
          return <span className="font-medium text-blue-600 dark:text-blue-400">{menuItem?.name || 'Unknown Menu Item'} (Menu Item)</span>;
        }
        const ingredient = typeof w.ingredientId === 'object' ? w.ingredientId : null;
        return ingredient?.name || 'Unknown Ingredient';
      },
    },
    {
      key: 'quantity',
      title: 'Quantity',
      render: (_: any, w: Wastage) => `${w.quantity} ${w.unit}`,
    },
    {
      key: 'reason',
      title: 'Reason',
      render: (_: any, w: Wastage) => (
        <Badge className={REASON_COLORS[w.reason]}>
          {REASON_LABELS[w.reason]}
        </Badge>
      ),
    },
    {
      key: 'cost',
      title: 'Cost',
      render: (_: any, w: Wastage) => formatCurrency(w.totalCost),
    },
    {
      key: 'date',
      title: 'Date',
      render: (_: any, w: Wastage) => new Date(w.wastageDate).toLocaleDateString(),
    },
    {
      key: 'status',
      title: 'Status',
      render: (_: any, w: Wastage) => (
        <Badge className={STATUS_COLORS[w.status] || STATUS_COLORS.pending}>
          {w.status.charAt(0).toUpperCase() + w.status.slice(1)}
        </Badge>
      ),
    },
    {
      key: 'actions',
      title: 'Actions',
      render: (_: any, w: Wastage) => (
        <div className="flex items-center gap-2">
          {w.status === 'pending' && (
            <>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleApprove(w._id || w.id || '')}
                disabled={isUpdating}
                title="Approve"
                className="text-green-600 hover:text-green-700 hover:bg-green-50 dark:hover:bg-green-900/20"
              >
                <CheckCircleIcon className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleReject(w._id || w.id || '')}
                disabled={isUpdating}
                title="Reject"
                className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
              >
                <XCircleIcon className="w-4 h-4" />
              </Button>
            </>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => openViewModal(w)}
            title="View"
          >
            <EyeIcon className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => openEditModal(w)}
            title="Edit"
          >
            <PencilIcon className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleDelete(w._id || w.id || '')}
            disabled={isDeleting}
            title="Delete"
          >
            <TrashIcon className="w-4 h-4 text-red-600" />
          </Button>
        </div>
      ),
    },
  ], [isDeleting, isUpdating, handleDelete, handleApprove, handleReject, openViewModal, openEditModal]);

  const totalCost = useMemo(() => {
    return filteredWastages.reduce((sum, w) => sum + (w.totalCost || 0), 0);
  }, [filteredWastages]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">Wastage Management</h1>
          <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mt-1">
            Track and manage inventory losses, expired items, and waste
          </p>
        </div>
        <Button onClick={() => setIsCreateModalOpen(true)} className="w-full sm:w-auto text-sm sm:text-base">
          <PlusIcon className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
          Record Wastage
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        <Card>
          <CardContent className="p-3 sm:p-4">
            <div className="min-w-0">
              <p className="text-xs text-gray-600 dark:text-gray-400 truncate">Total Records</p>
              <p className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900 dark:text-white truncate" title={totalWastages.toString()}>
                {totalWastages.toLocaleString()}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 sm:p-4">
            <div className="min-w-0">
              <p className="text-xs text-gray-600 dark:text-gray-400 truncate">Total Cost</p>
              <p className="text-sm sm:text-base md:text-lg font-bold text-red-600 truncate" title={formatCurrency(totalCost)}>
                {formatCurrency(totalCost)}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 sm:p-4">
            <div className="min-w-0">
              <p className="text-xs text-gray-600 dark:text-gray-400 truncate">Pending Approval</p>
              <p className="text-lg sm:text-xl md:text-2xl font-bold text-yellow-600 truncate" title={filteredWastages.filter((w: Wastage) => w.status === 'pending').length.toString()}>
                {filteredWastages.filter((w: Wastage) => w.status === 'pending').length.toLocaleString()}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 sm:p-4">
            <div className="min-w-0">
              <p className="text-xs text-gray-600 dark:text-gray-400 truncate">This Month</p>
              <p className="text-lg sm:text-xl md:text-2xl font-bold text-blue-600 truncate" title={filteredWastages.filter((w: Wastage) => {
                const wastageDate = new Date(w.wastageDate);
                const now = new Date();
                return wastageDate.getMonth() === now.getMonth() && 
                       wastageDate.getFullYear() === now.getFullYear();
              }).length.toString()}>
                {filteredWastages.filter((w: Wastage) => {
                  const wastageDate = new Date(w.wastageDate);
                  const now = new Date();
                  return wastageDate.getMonth() === now.getMonth() && 
                         wastageDate.getFullYear() === now.getFullYear();
                }).length.toLocaleString()}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-3 sm:p-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3 sm:gap-4">
            <Input
              placeholder="Search ingredients..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <Select
              options={reasonFilterOptions}
              value={reasonFilter}
              onChange={(val) => setReasonFilter(val)}
              placeholder="All Reasons"
            />
            <Select
              options={statusOptions}
              value={statusFilter}
              onChange={(val) => setStatusFilter(val)}
              placeholder="All Status"
            />
            <Input
              type="date"
              placeholder="Start Date"
              value={startDateFilter}
              onChange={(e) => setStartDateFilter(e.target.value)}
            />
            <Input
              type="date"
              placeholder="End Date"
              value={endDateFilter}
              onChange={(e) => setEndDateFilter(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Wastage Table */}
      <Card>
        <CardHeader>
          <CardTitle>Wastage Records</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600 mx-auto mb-4"></div>
              <p className="text-gray-600 dark:text-gray-400">Loading wastage records...</p>
            </div>
          ) : filteredWastages.length === 0 ? (
            <div className="text-center py-12">
              <ExclamationTriangleIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 dark:text-gray-400">No wastage records found</p>
            </div>
          ) : (
            <>
              <DataTable
                data={filteredWastages}
                columns={columns}
                searchable={false}
              />
              <div className="flex items-center justify-between mt-4">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, totalWastages)} of {totalWastages} records
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setCurrentPage(p => p + 1)}
                    disabled={currentPage * itemsPerPage >= totalWastages}
                  >
                    Next
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Create Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Record Wastage"
        size="lg"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Wastage Type *
            </label>
            <Select
              options={[
                { value: 'ingredient', label: 'Raw Ingredient' },
                { value: 'menuItem', label: 'Menu Item' },
              ]}
              value={formData.type}
              onChange={(val) => setFormData({ ...formData, type: val })}
            />
          </div>

          {formData.type === 'ingredient' ? (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Ingredient *
              </label>
              <Select
                options={ingredientOptions.map((ing: any) => ({
                  value: ing.value,
                  label: ing.label,
                }))}
                value={formData.ingredientId}
                onChange={(val) => {
                  const ingredient = ingredientOptions.find((i) => i.value === val);
                  setFormData({
                    ...formData,
                    ingredientId: val,
                    unit: (ingredient as any)?.unit || '',
                    unitCost: (ingredient as any)?.unitCost || 0,
                  });
                }}
                placeholder="Select ingredient"
              />
            </div>
          ) : (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Menu Item *
              </label>
              <Select
                options={menuItemOptions.map((item: any) => ({
                  value: item.value,
                  label: item.label,
                }))}
                value={formData.menuItemId}
                onChange={(val) => {
                  const menuItem = menuItemOptions.find((i: any) => i.value === val);
                  setFormData({
                    ...formData,
                    menuItemId: val,
                    unit: 'item',
                    unitCost: (menuItem as any)?.unitCost || 0,
                  });
                }}
                placeholder="Select menu item"
              />
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Quantity *
              </label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={formData.quantity}
                onChange={(e) => setFormData({ ...formData, quantity: parseFloat(e.target.value) || 0 })}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Unit Cost *
              </label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={formData.unitCost}
                onChange={(e) => setFormData({ ...formData, unitCost: parseFloat(e.target.value) || 0 })}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Reason *
            </label>
            <Select
              options={reasonOptions}
              value={formData.reason}
              onChange={(val) => setFormData({ ...formData, reason: val as WastageReason })}
              placeholder="Select reason"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Wastage Date *
            </label>
            <Input
              type="date"
              value={formData.wastageDate}
              onChange={(e) => setFormData({ ...formData, wastageDate: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Batch Number
              </label>
              <Input
                value={formData.batchNumber}
                onChange={(e) => setFormData({ ...formData, batchNumber: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Expiry Date
              </label>
              <Input
                type="date"
                value={formData.expiryDate}
                onChange={(e) => setFormData({ ...formData, expiryDate: e.target.value })}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Notes
            </label>
            <textarea
              className="w-full px-3 py-2 border border-gray-300 rounded-md dark:bg-gray-800 dark:border-gray-600 dark:text-white"
              rows={3}
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            />
          </div>

          <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 pt-4">
            <Button variant="secondary" onClick={() => setIsCreateModalOpen(false)} className="w-full sm:w-auto text-sm sm:text-base">
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={isCreating} className="w-full sm:w-auto text-sm sm:text-base">
              {isCreating ? 'Creating...' : 'Create Wastage'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Edit Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title="Edit Wastage Record"
        size="lg"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Wastage Type *
            </label>
            <Select
              options={[
                { value: 'ingredient', label: 'Raw Ingredient' },
                { value: 'menuItem', label: 'Menu Item' },
              ]}
              value={formData.type}
              onChange={() => {}}
              disabled
            />
          </div>

          {formData.type === 'ingredient' ? (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Ingredient
              </label>
              <Select
                options={ingredientOptions}
                value={formData.ingredientId}
                onChange={() => {}}
                placeholder="Select ingredient"
                disabled
              />
            </div>
          ) : (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Menu Item
              </label>
              <Select
                options={menuItemOptions}
                value={formData.menuItemId}
                onChange={() => {}}
                placeholder="Select menu item"
                disabled
              />
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Quantity *
              </label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={formData.quantity}
                onChange={(e) => setFormData({ ...formData, quantity: parseFloat(e.target.value) || 0 })}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Unit Cost *
              </label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={formData.unitCost}
                onChange={(e) => setFormData({ ...formData, unitCost: parseFloat(e.target.value) || 0 })}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Reason *
            </label>
            <Select
              options={reasonOptions}
              value={formData.reason}
              onChange={(val) => setFormData({ ...formData, reason: val as WastageReason })}
              placeholder="Select reason"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Status
            </label>
            <Select
              options={statusOptions.filter(s => s.value !== 'all')}
              value={selectedWastage?.status || 'pending'}
              onChange={(val) => {
                if (selectedWastage) {
                  setSelectedWastage({ ...selectedWastage, status: val as any });
                }
              }}
              placeholder="Select status"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Wastage Date *
            </label>
            <Input
              type="date"
              value={formData.wastageDate}
              onChange={(e) => setFormData({ ...formData, wastageDate: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Batch Number
              </label>
              <Input
                value={formData.batchNumber}
                onChange={(e) => setFormData({ ...formData, batchNumber: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Expiry Date
              </label>
              <Input
                type="date"
                value={formData.expiryDate}
                onChange={(e) => setFormData({ ...formData, expiryDate: e.target.value })}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Notes
            </label>
            <textarea
              className="w-full px-3 py-2 border border-gray-300 rounded-md dark:bg-gray-800 dark:border-gray-600 dark:text-white"
              rows={3}
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            />
          </div>

          <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 pt-4">
            <Button variant="secondary" onClick={() => setIsEditModalOpen(false)} className="w-full sm:w-auto text-sm sm:text-base">
              Cancel
            </Button>
            <Button onClick={handleEdit} disabled={isUpdating} className="w-full sm:w-auto text-sm sm:text-base">
              {isUpdating ? 'Updating...' : 'Update Wastage'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* View Modal */}
      <Modal
        isOpen={isViewModalOpen}
        onClose={() => setIsViewModalOpen(false)}
        title="Wastage Details"
        size="lg"
      >
        {selectedWastage && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Wasted Item</p>
                <p className="text-gray-900 dark:text-white">
                  {selectedWastage.menuItemId 
                    ? (typeof selectedWastage.menuItemId === 'object' ? selectedWastage.menuItemId.name : 'Menu Item')
                    : (typeof selectedWastage.ingredientId === 'object' ? selectedWastage.ingredientId.name : 'Ingredient')}
                  {selectedWastage.menuItemId && <span className="ml-2 text-xs text-blue-500">(Menu Item)</span>}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Quantity</p>
                <p className="text-gray-900 dark:text-white">
                  {selectedWastage.quantity} {selectedWastage.unit}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Reason</p>
                <Badge className={REASON_COLORS[selectedWastage.reason]}>
                  {REASON_LABELS[selectedWastage.reason]}
                </Badge>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Total Cost</p>
                <p className="text-gray-900 dark:text-white">{formatCurrency(selectedWastage.totalCost)}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Wastage Date</p>
                <p className="text-gray-900 dark:text-white">
                  {new Date(selectedWastage.wastageDate).toLocaleDateString()}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Status</p>
                <Badge className={STATUS_COLORS[selectedWastage.status] || STATUS_COLORS.pending}>
                  {selectedWastage.status.charAt(0).toUpperCase() + selectedWastage.status.slice(1)}
                </Badge>
              </div>
              {selectedWastage.batchNumber && (
                <div>
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Batch Number</p>
                  <p className="text-gray-900 dark:text-white">{selectedWastage.batchNumber}</p>
                </div>
              )}
              {selectedWastage.expiryDate && (
                <div>
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Expiry Date</p>
                  <p className="text-gray-900 dark:text-white">
                    {new Date(selectedWastage.expiryDate).toLocaleDateString()}
                  </p>
                </div>
              )}
            </div>
            {selectedWastage.notes && (
              <div>
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Notes</p>
                <p className="text-gray-900 dark:text-white">{selectedWastage.notes}</p>
              </div>
            )}
            <div>
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Reported By</p>
              <p className="text-gray-900 dark:text-white">
                {typeof selectedWastage.reportedBy === 'object'
                  ? `${selectedWastage.reportedBy.firstName || ''} ${selectedWastage.reportedBy.lastName || ''}`.trim() || selectedWastage.reportedBy.name || 'Unknown'
                  : 'Unknown'}
              </p>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

