'use client';

import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { DataTable } from '@/components/ui/DataTable';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Select } from '@/components/ui/Select';
import { InventoryItem, useAddStockMutation, useCreateInventoryItemMutation, useDeleteInventoryItemMutation, useGetInventoryItemsQuery, useRemoveStockMutation, useUpdateInventoryItemMutation } from '@/lib/api/endpoints/inventoryApi';
import { useAppSelector } from '@/lib/store';
import { formatCurrency } from '@/lib/utils';
import {
  ArchiveBoxIcon,
  BeakerIcon,
  ExclamationTriangleIcon,
  EyeIcon,
  PencilIcon,
  PlusIcon,
  TrashIcon
} from '@heroicons/react/24/outline';
import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';

export default function IngredientsPage() {
  const { user, companyContext } = useAppSelector((state) => state.auth);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isAdjustStockModalOpen, setIsAdjustStockModalOpen] = useState(false);
  const [selectedIngredient, setSelectedIngredient] = useState<InventoryItem | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [stockFilter, setStockFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);

  const branchId = (user as any)?.branchId || 
                   (companyContext as any)?.branchId || 
                   (companyContext as any)?.branches?.[0]?._id ||
                   (companyContext as any)?.branches?.[0]?.id;

  const companyId = (user as any)?.companyId || 
                    (companyContext as any)?.companyId;

  const { data: ingredientsResponse, isLoading } = useGetInventoryItemsQuery({
    branchId,
    search: searchQuery || undefined,
    category: categoryFilter === 'all' ? undefined : categoryFilter,
    page: currentPage,
    limit: itemsPerPage,
  }, { skip: !branchId });

  const [createIngredient, { isLoading: isCreating }] = useCreateInventoryItemMutation();
  const [updateIngredient, { isLoading: isUpdating }] = useUpdateInventoryItemMutation();
  const [deleteIngredient] = useDeleteInventoryItemMutation();
  const [addStock] = useAddStockMutation();
  const [removeStock] = useRemoveStockMutation();

  // Extract ingredients from API response
  const ingredients = useMemo(() => {
    if (!ingredientsResponse) return [];
    return ingredientsResponse.items || [];
  }, [ingredientsResponse]);

  const totalIngredients = useMemo(() => {
    return ingredientsResponse?.total || 0;
  }, [ingredientsResponse]);

  // Filter ingredients by stock level
  const filteredIngredients = useMemo(() => {
    if (stockFilter === 'all') return ingredients;
    if (stockFilter === 'low') return ingredients.filter(i => i.isLowStock);
    if (stockFilter === 'out') return ingredients.filter(i => i.isOutOfStock);
    return ingredients;
  }, [ingredients, stockFilter]);

  const [formData, setFormData] = useState<any>({
    name: '',
    description: '',
    currentStock: 0,
    minimumStock: 10,
    maximumStock: 100,
    unit: 'pcs',
    unitCost: 0,
    category: 'food',
    preferredSupplierId: '',
    storageLocation: '',
    storageTemperature: '',
    shelfLife: '',
    sku: '',
    barcode: '',
    notes: '',
  });

  const [stockAdjustment, setStockAdjustment] = useState({
    change: 0,
    reason: '',
  });

  useEffect(() => {
    if (!isCreateModalOpen && !isEditModalOpen) {
      resetForm();
    }
  }, [isCreateModalOpen, isEditModalOpen]);

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      currentStock: 0,
      minimumStock: 10,
      maximumStock: 100,
      unit: 'pcs',
      unitCost: 0,
      category: 'food',
      preferredSupplierId: '',
      storageLocation: '',
      storageTemperature: '',
      shelfLife: '',
      sku: '',
      barcode: '',
      notes: '',
    });
    setSelectedIngredient(null);
  };

  const resetStockAdjustment = () => {
    setStockAdjustment({
      change: 0,
      reason: '',
    });
  };

  const handleCreate = async () => {
    if (!formData.name || !formData.category || !formData.unit || formData.unitCost <= 0) {
      toast.error('Please fill in all required fields');
      return;
    }

    if (!companyId) {
      toast.error('Company ID is missing');
      return;
    }

    try {
      await createIngredient({
        companyId,
        branchId,
        name: formData.name,
        description: formData.description,
        category: formData.category,
        unit: formData.unit,
        currentStock: formData.currentStock || 0,
        minimumStock: formData.minimumStock || 0,
        maximumStock: formData.maximumStock,
        unitCost: formData.unitCost,
        preferredSupplierId: formData.preferredSupplierId || undefined,
        storageLocation: formData.storageLocation || undefined,
        storageTemperature: formData.storageTemperature || undefined,
        shelfLife: formData.shelfLife ? parseInt(formData.shelfLife) : undefined,
        sku: formData.sku || undefined,
        barcode: formData.barcode || undefined,
        notes: formData.notes || undefined,
      } as any).unwrap();
      toast.success('Ingredient created successfully');
      setIsCreateModalOpen(false);
      resetForm();
    } catch (error: any) {
      toast.error(error?.data?.message || error?.message || 'Failed to create ingredient');
    }
  };

  const handleEdit = async () => {
    if (!selectedIngredient) return;
    if (!formData.name || !formData.category || !formData.unit || formData.unitCost <= 0) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      await updateIngredient({
        id: selectedIngredient.id,
        name: formData.name,
        description: formData.description,
        category: formData.category,
        unit: formData.unit,
        currentStock: formData.currentStock,
        minStock: formData.minimumStock,
        maxStock: formData.maximumStock,
        unitPrice: formData.unitCost,
        preferredSupplierId: formData.preferredSupplierId || undefined,
        storageLocation: formData.storageLocation || undefined,
        storageTemperature: formData.storageTemperature || undefined,
        shelfLife: formData.shelfLife ? parseInt(formData.shelfLife) : undefined,
        sku: formData.sku || undefined,
        barcode: formData.barcode || undefined,
        notes: formData.notes || undefined,
      } as any).unwrap();
      toast.success('Ingredient updated successfully');
      setIsEditModalOpen(false);
      resetForm();
    } catch (error: any) {
      toast.error(error?.data?.message || error?.message || 'Failed to update ingredient');
    }
  };

  const handleDelete = async (ingredient: InventoryItem) => {
    if (!confirm(`Are you sure you want to delete "${ingredient.name}"? This action cannot be undone.`)) return;

    try {
      await deleteIngredient(ingredient.id).unwrap();
      toast.success('Ingredient deleted successfully');
    } catch (error: any) {
      toast.error(error?.data?.message || error?.message || 'Failed to delete ingredient');
    }
  };

  const handleAdjustStock = async () => {
    if (!selectedIngredient) return;
    if (!stockAdjustment.change || stockAdjustment.change === 0) {
      toast.error('Please enter a valid quantity');
      return;
    }

    try {
      const adjustmentType = stockAdjustment.change >= 0 ? 'add' : 'remove';
      const quantity = Math.abs(stockAdjustment.change);
      
      if (adjustmentType === 'add') {
        await addStock({
          id: selectedIngredient.id,
          quantity,
        }).unwrap();
      } else {
        await removeStock({
          id: selectedIngredient.id,
          quantity,
        }).unwrap();
      }

      toast.success('Stock adjusted successfully');
      setIsAdjustStockModalOpen(false);
      resetStockAdjustment();
    } catch (error: any) {
      toast.error(error?.data?.message || error?.message || 'Failed to adjust stock');
    }
  };

  const openViewModal = (ingredient: InventoryItem) => {
    setSelectedIngredient(ingredient);
    setIsViewModalOpen(true);
  };

  const openEditModal = (ingredient: InventoryItem) => {
    setSelectedIngredient(ingredient);
    setFormData({
      name: ingredient.name,
      description: ingredient.description || '',
      currentStock: ingredient.currentStock,
      minimumStock: ingredient.minimumStock || ingredient.minStock,
      maximumStock: ingredient.maximumStock || ingredient.maxStock,
      unit: ingredient.unit,
      unitCost: ingredient.unitCost || ingredient.unitPrice,
      category: ingredient.category,
      preferredSupplierId: ingredient.preferredSupplierId || '',
      storageLocation: ingredient.storageLocation || '',
      storageTemperature: ingredient.storageTemperature || '',
      shelfLife: ingredient.shelfLife || '',
      sku: ingredient.sku || '',
      barcode: ingredient.barcode || '',
      notes: ingredient.notes || '',
    });
    setIsEditModalOpen(true);
  };

  const openAdjustStockModal = (ingredient: InventoryItem) => {
    setSelectedIngredient(ingredient);
    setIsAdjustStockModalOpen(true);
  };

  const getStockStatus = (ingredient: any) => {
    const stock = ingredient.currentStock || ingredient.quantity || 0;
    const minLevel = ingredient.minStock || ingredient.minStockLevel || 10;
    
    if (stock <= 0) {
      return { status: 'out', label: 'Out of Stock', variant: 'danger' as const };
    } else if (stock <= minLevel) {
      return { status: 'low', label: 'Low Stock', variant: 'warning' as const };
    } else {
      return { status: 'good', label: 'In Stock', variant: 'success' as const };
    }
  };

  const columns = [
    {
      key: 'name',
      title: 'Ingredient',
      sortable: true,
      render: (value: string, row: InventoryItem) => (
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary-100 dark:bg-primary-900/30 rounded-lg flex items-center justify-center">
            <BeakerIcon className="w-5 h-5 text-primary-600 dark:text-primary-400" />
          </div>
          <div>
            <p className="font-medium text-gray-900 dark:text-white">{value}</p>
            <p className="text-sm text-gray-500 dark:text-gray-400">{row.description}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'currentStock',
      title: 'Stock',
      align: 'right' as const,
      render: (value: number, row: any) => (
        <div className="text-right">
          <p className="font-semibold text-gray-900 dark:text-white">
            {value || 0} {row.unit}
          </p>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Min: {row.minimumStock || row.minStock || 0} {row.unit}
          </p>
        </div>
      ),
    },
    {
      key: 'unitPrice',
      title: 'Cost',
      align: 'right' as const,
      render: (value: number, row: any) => {
        const unitCost = row.unitCost || value || 0;
        const stock = row.currentStock || 0;
        return (
          <div className="text-right">
            <p className="font-semibold text-gray-900 dark:text-white">
              {formatCurrency(unitCost)}/{row.unit}
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Total: {formatCurrency(unitCost * stock)}
            </p>
          </div>
        );
      },
    },
    {
      key: 'category',
      title: 'Category',
      render: (value: string) => (
        <Badge variant="secondary" className="capitalize">
          {value}
        </Badge>
      ),
    },
    {
      key: 'expiryDate',
      title: 'Expiry',
      render: (value: string) => {
        if (!value) return <span className="text-gray-500 dark:text-gray-400">No expiry</span>;

        const expiryDate = new Date(value);
        const now = new Date();
        const isExpired = expiryDate < now;
        const isExpiringSoon = expiryDate < new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days

        return (
          <div className={`text-sm ${isExpired ? 'text-red-600' : isExpiringSoon ? 'text-yellow-600' : 'text-gray-600 dark:text-gray-400'}`}>
            {expiryDate.toLocaleDateString()}
            {isExpired && <span className="ml-1">(Expired)</span>}
            {isExpiringSoon && !isExpired && <span className="ml-1">(Expiring Soon)</span>}
          </div>
        );
      },
    },
    {
      key: 'status',
      title: 'Status',
      render: (value: any, row: InventoryItem) => {
        const stockStatus = getStockStatus(row);
        return (
          <Badge variant={stockStatus.variant}>
            {stockStatus.label}
          </Badge>
        );
      },
    },
    {
      key: 'actions',
      title: 'Actions',
      render: (value: any, row: InventoryItem) => (
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => openViewModal(row)}
            title="View Details"
          >
            <EyeIcon className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => openAdjustStockModal(row)}
            className="text-blue-600 hover:text-blue-700"
            title="Adjust Stock"
          >
            <ArchiveBoxIcon className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => openEditModal(row)}
            title="Edit"
          >
            <PencilIcon className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleDelete(row)}
            className="text-red-600 hover:text-red-700"
            title="Delete"
          >
            <TrashIcon className="w-4 h-4" />
          </Button>
        </div>
      ),
    },
  ];

  const stats = useMemo(() => {
    return {
      total: totalIngredients,
      inStock: ingredients.filter(i => !i.isLowStock && !i.isOutOfStock).length,
      lowStock: ingredients.filter(i => i.isLowStock && !i.isOutOfStock).length,
      outOfStock: ingredients.filter(i => i.isOutOfStock).length,
      totalValue: ingredients.reduce((sum, item) => sum + ((item.unitCost || item.unitPrice || 0) * (item.currentStock || 0)), 0),
    };
  }, [ingredients, totalIngredients]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Inventory Management</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Manage your restaurant ingredients and stock levels
          </p>
        </div>
        <Button onClick={() => setIsCreateModalOpen(true)}>
          <PlusIcon className="w-5 h-5 mr-2" />
          Add Ingredient
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Total Items</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white">{stats.total}</p>
              </div>
              <BeakerIcon className="w-8 h-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">In Stock</p>
                <p className="text-3xl font-bold text-green-600">{stats.inStock}</p>
              </div>
              <ArchiveBoxIcon className="w-8 h-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Low Stock</p>
                <p className="text-3xl font-bold text-yellow-600">{stats.lowStock}</p>
              </div>
              <ExclamationTriangleIcon className="w-8 h-8 text-yellow-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Out of Stock</p>
                <p className="text-3xl font-bold text-red-600">{stats.outOfStock}</p>
              </div>
              <ExclamationTriangleIcon className="w-8 h-8 text-red-600" />
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
              <ArchiveBoxIcon className="w-8 h-8 text-purple-600" />
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
                placeholder="Search ingredients..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="w-full sm:w-48">
              <Select
                options={[
                  { value: 'all', label: 'All Categories' },
                  { value: 'food', label: 'Food' },
                  { value: 'beverage', label: 'Beverage' },
                  { value: 'packaging', label: 'Packaging' },
                  { value: 'cleaning', label: 'Cleaning' },
                  { value: 'other', label: 'Other' },
                ]}
                value={categoryFilter}
                onChange={setCategoryFilter}
                placeholder="Filter by category"
              />
            </div>
            <div className="w-full sm:w-48">
              <Select
                options={[
                  { value: 'all', label: 'All Stock Levels' },
                  { value: 'low', label: 'Low Stock' },
                  { value: 'out', label: 'Out of Stock' },
                ]}
                value={stockFilter}
                onChange={setStockFilter}
                placeholder="Filter by stock"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Ingredients Table */}
      {isLoading ? (
        <Card>
          <CardContent className="p-6">
            <div className="text-center py-12">
              <p className="text-gray-500 dark:text-gray-400">Loading ingredients...</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <DataTable
          data={filteredIngredients}
          columns={columns}
          loading={isLoading}
          searchable={false}
          selectable={true}
          pagination={{
            currentPage,
            totalPages: Math.ceil(totalIngredients / itemsPerPage),
            itemsPerPage,
            totalItems: totalIngredients,
            onPageChange: setCurrentPage,
            onItemsPerPageChange: setItemsPerPage,
          }}
          exportable={true}
          exportFilename="ingredients"
          onExport={(format, items) => {
            console.log(`Exporting ${items.length} ingredients as ${format}`);
            toast.success(`Exporting ${items.length} ingredients as ${format.toUpperCase()}`);
          }}
          emptyMessage="No ingredients found. Add your first ingredient to get started."
        />
      )}

      {/* Create Ingredient Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => {
          setIsCreateModalOpen(false);
          resetForm();
        }}
        title="Add New Ingredient"
        className="max-w-2xl"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Ingredient Name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
            <Select
              label="Category"
              options={[
                { value: 'food', label: 'Food' },
                { value: 'beverage', label: 'Beverage' },
                { value: 'packaging', label: 'Packaging' },
                { value: 'cleaning', label: 'Cleaning' },
                { value: 'other', label: 'Other' },
              ]}
              value={formData.category}
              onChange={(value) => setFormData({ ...formData, category: value })}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Description (Optional)
            </label>
            <textarea
              rows={2}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="input w-full"
              placeholder="Brief description of the ingredient..."
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Input
              label="Current Stock"
              type="number"
              value={formData.currentStock}
              onChange={(e) => setFormData({ ...formData, currentStock: parseFloat(e.target.value) || 0 })}
              required
            />
            <Select
              label="Unit"
              options={[
                { value: 'pcs', label: 'Pieces' },
                { value: 'kg', label: 'Kilograms' },
                { value: 'g', label: 'Grams' },
                { value: 'l', label: 'Liters' },
                { value: 'ml', label: 'Milliliters' },
                { value: 'box', label: 'Box' },
                { value: 'pack', label: 'Pack' },
                { value: 'bottle', label: 'Bottle' },
                { value: 'can', label: 'Can' },
              ]}
              value={formData.unit}
              onChange={(value) => setFormData({ ...formData, unit: value })}
            />
            <Input
              label="Minimum Stock"
              type="number"
              value={formData.minimumStock}
              onChange={(e) => setFormData({ ...formData, minimumStock: parseFloat(e.target.value) || 0 })}
              required
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Input
              label="Maximum Stock (Optional)"
              type="number"
              value={formData.maximumStock}
              onChange={(e) => setFormData({ ...formData, maximumStock: parseFloat(e.target.value) || undefined })}
            />
            <Input
              label="Cost per Unit"
              type="number"
              step="0.01"
              value={formData.unitCost}
              onChange={(e) => setFormData({ ...formData, unitCost: parseFloat(e.target.value) || 0 })}
              required
            />
            <Input
              label="Shelf Life (days, Optional)"
              type="number"
              value={formData.shelfLife}
              onChange={(e) => setFormData({ ...formData, shelfLife: parseInt(e.target.value) || undefined })}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="SKU (Optional)"
              value={formData.sku}
              onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
            />
            <Input
              label="Barcode (Optional)"
              value={formData.barcode}
              onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Storage Location (Optional)"
              value={formData.storageLocation}
              onChange={(e) => setFormData({ ...formData, storageLocation: e.target.value })}
            />
            <Input
              label="Storage Temperature (Optional)"
              value={formData.storageTemperature}
              onChange={(e) => setFormData({ ...formData, storageTemperature: e.target.value })}
              placeholder="e.g., 2-8°C"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Notes (Optional)
            </label>
            <textarea
              rows={2}
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="input w-full"
              placeholder="Additional notes about this ingredient..."
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
            <Button onClick={handleCreate} disabled={isCreating}>
              {isCreating ? 'Creating...' : 'Add Ingredient'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Edit Ingredient Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          resetForm();
        }}
        title="Edit Ingredient"
        className="max-w-2xl"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Ingredient Name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
            <Select
              label="Category"
              options={[
                { value: 'food', label: 'Food' },
                { value: 'beverage', label: 'Beverage' },
                { value: 'packaging', label: 'Packaging' },
                { value: 'cleaning', label: 'Cleaning' },
                { value: 'other', label: 'Other' },
              ]}
              value={formData.category}
              onChange={(value) => setFormData({ ...formData, category: value })}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Description (Optional)
            </label>
            <textarea
              rows={2}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="input w-full"
              placeholder="Brief description of the ingredient..."
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Input
              label="Current Stock"
              type="number"
              value={formData.currentStock}
              onChange={(e) => setFormData({ ...formData, currentStock: parseFloat(e.target.value) || 0 })}
              required
            />
            <Select
              label="Unit"
              options={[
                { value: 'pcs', label: 'Pieces' },
                { value: 'kg', label: 'Kilograms' },
                { value: 'g', label: 'Grams' },
                { value: 'l', label: 'Liters' },
                { value: 'ml', label: 'Milliliters' },
                { value: 'box', label: 'Box' },
                { value: 'pack', label: 'Pack' },
                { value: 'bottle', label: 'Bottle' },
                { value: 'can', label: 'Can' },
              ]}
              value={formData.unit}
              onChange={(value) => setFormData({ ...formData, unit: value })}
            />
            <Input
              label="Minimum Stock"
              type="number"
              value={formData.minimumStock}
              onChange={(e) => setFormData({ ...formData, minimumStock: parseFloat(e.target.value) || 0 })}
              required
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Input
              label="Maximum Stock (Optional)"
              type="number"
              value={formData.maximumStock}
              onChange={(e) => setFormData({ ...formData, maximumStock: parseFloat(e.target.value) || undefined })}
            />
            <Input
              label="Cost per Unit"
              type="number"
              step="0.01"
              value={formData.unitCost}
              onChange={(e) => setFormData({ ...formData, unitCost: parseFloat(e.target.value) || 0 })}
              required
            />
            <Input
              label="Shelf Life (days, Optional)"
              type="number"
              value={formData.shelfLife}
              onChange={(e) => setFormData({ ...formData, shelfLife: parseInt(e.target.value) || undefined })}
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="SKU (Optional)"
              value={formData.sku}
              onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
            />
            <Input
              label="Barcode (Optional)"
              value={formData.barcode}
              onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Storage Location (Optional)"
              value={formData.storageLocation}
              onChange={(e) => setFormData({ ...formData, storageLocation: e.target.value })}
            />
            <Input
              label="Storage Temperature (Optional)"
              value={formData.storageTemperature}
              onChange={(e) => setFormData({ ...formData, storageTemperature: e.target.value })}
              placeholder="e.g., 2-8°C"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Notes (Optional)
            </label>
            <textarea
              rows={2}
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="input w-full"
              placeholder="Additional notes about this ingredient..."
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button
              variant="secondary"
              onClick={() => {
                setIsEditModalOpen(false);
                resetForm();
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleEdit} disabled={isUpdating}>
              {isUpdating ? 'Updating...' : 'Update Ingredient'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* View Ingredient Modal */}
      <Modal
        isOpen={isViewModalOpen}
        onClose={() => {
          setIsViewModalOpen(false);
          setSelectedIngredient(null);
        }}
        title="Ingredient Details"
        className="max-w-2xl"
      >
        {selectedIngredient && (
          <div className="space-y-6">
            <div className="flex items-start gap-4">
              <div className="w-16 h-16 bg-primary-100 dark:bg-primary-900/30 rounded-lg flex items-center justify-center flex-shrink-0">
                <BeakerIcon className="w-8 h-8 text-primary-600 dark:text-primary-400" />
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-1">
                  {selectedIngredient.name}
                </h3>
                <Badge variant="secondary" className="capitalize mb-2">
                  {selectedIngredient.category}
                </Badge>
                {selectedIngredient.description && (
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {selectedIngredient.description}
                  </p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 pt-4 border-t border-gray-200 dark:border-gray-700">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Current Stock</p>
                <p className="text-lg font-semibold text-gray-900 dark:text-white">
                  {selectedIngredient.currentStock} {selectedIngredient.unit}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Minimum Stock</p>
                <p className="text-lg font-semibold text-gray-900 dark:text-white">
                  {selectedIngredient.minimumStock || selectedIngredient.minStock} {selectedIngredient.unit}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Unit Cost</p>
                <p className="text-lg font-semibold text-gray-900 dark:text-white">
                  {formatCurrency(selectedIngredient.unitCost || selectedIngredient.unitPrice)}/{selectedIngredient.unit}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Total Value</p>
                <p className="text-lg font-semibold text-gray-900 dark:text-white">
                  {formatCurrency((selectedIngredient.unitCost || selectedIngredient.unitPrice || 0) * (selectedIngredient.currentStock || 0))}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Status</p>
                <Badge variant={selectedIngredient.isOutOfStock ? 'danger' : selectedIngredient.isLowStock ? 'warning' : 'success'}>
                  {selectedIngredient.isOutOfStock ? 'Out of Stock' : selectedIngredient.isLowStock ? 'Low Stock' : 'In Stock'}
                </Badge>
              </div>
              {selectedIngredient.maximumStock && (
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Maximum Stock</p>
                  <p className="text-lg font-semibold text-gray-900 dark:text-white">
                    {selectedIngredient.maximumStock} {selectedIngredient.unit}
                  </p>
                </div>
              )}
            </div>

            {(selectedIngredient.sku || selectedIngredient.barcode || selectedIngredient.storageLocation || selectedIngredient.storageTemperature || selectedIngredient.shelfLife) && (
              <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">Additional Information</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  {selectedIngredient.sku && (
                    <div>
                      <span className="text-gray-600 dark:text-gray-400">SKU:</span>
                      <span className="ml-2 text-gray-900 dark:text-white font-medium">{selectedIngredient.sku}</span>
                    </div>
                  )}
                  {selectedIngredient.barcode && (
                    <div>
                      <span className="text-gray-600 dark:text-gray-400">Barcode:</span>
                      <span className="ml-2 text-gray-900 dark:text-white font-medium">{selectedIngredient.barcode}</span>
                    </div>
                  )}
                  {selectedIngredient.storageLocation && (
                    <div>
                      <span className="text-gray-600 dark:text-gray-400">Storage Location:</span>
                      <span className="ml-2 text-gray-900 dark:text-white font-medium">{selectedIngredient.storageLocation}</span>
                    </div>
                  )}
                  {selectedIngredient.storageTemperature && (
                    <div>
                      <span className="text-gray-600 dark:text-gray-400">Storage Temperature:</span>
                      <span className="ml-2 text-gray-900 dark:text-white font-medium">{selectedIngredient.storageTemperature}</span>
                    </div>
                  )}
                  {selectedIngredient.shelfLife && (
                    <div>
                      <span className="text-gray-600 dark:text-gray-400">Shelf Life:</span>
                      <span className="ml-2 text-gray-900 dark:text-white font-medium">{selectedIngredient.shelfLife} days</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {selectedIngredient.notes && (
              <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">Notes</h4>
                <p className="text-sm text-gray-600 dark:text-gray-400">{selectedIngredient.notes}</p>
              </div>
            )}

            <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
              <Button
                variant="secondary"
                onClick={() => setIsViewModalOpen(false)}
              >
                Close
              </Button>
              <Button
                onClick={() => {
                  setIsViewModalOpen(false);
                  openEditModal(selectedIngredient);
                }}
              >
                Edit Ingredient
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Adjust Stock Modal */}
      <Modal
        isOpen={isAdjustStockModalOpen}
        onClose={() => {
          setIsAdjustStockModalOpen(false);
          resetStockAdjustment();
        }}
        title="Adjust Stock Level"
        className="max-w-md"
      >
        {selectedIngredient && (
          <div className="space-y-6">
            <div className="text-center">
              <div className="w-16 h-16 bg-primary-100 dark:bg-primary-900/30 rounded-full mx-auto mb-3 flex items-center justify-center">
                <BeakerIcon className="w-8 h-8 text-primary-600 dark:text-primary-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                {selectedIngredient.name}
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Current stock: {selectedIngredient.currentStock} {selectedIngredient.unit}
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Stock Change
              </label>
              <div className="flex gap-2">
                <Button
                  variant={stockAdjustment.change > 0 ? 'primary' : 'secondary'}
                  onClick={() => setStockAdjustment({ ...stockAdjustment, change: Math.abs(stockAdjustment.change) })}
                  className="flex-1"
                >
                  + Add Stock
                </Button>
                <Button
                  variant={stockAdjustment.change < 0 ? 'primary' : 'secondary'}
                  onClick={() => setStockAdjustment({ ...stockAdjustment, change: -Math.abs(stockAdjustment.change) })}
                  className="flex-1"
                >
                  - Remove Stock
                </Button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Quantity
              </label>
              <Input
                type="number"
                value={Math.abs(stockAdjustment.change)}
                onChange={(e) => {
                  const value = parseFloat(e.target.value) || 0;
                  setStockAdjustment({
                    ...stockAdjustment,
                    change: stockAdjustment.change < 0 ? -value : value,
                  });
                }}
                placeholder="Enter quantity"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Reason (Optional)
              </label>
              <textarea
                rows={2}
                value={stockAdjustment.reason}
                onChange={(e) => setStockAdjustment({ ...stockAdjustment, reason: e.target.value })}
                className="input w-full"
                placeholder="Enter reason for stock adjustment..."
              />
            </div>

            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
              <p className="text-sm text-blue-800 dark:text-blue-400 text-center">
                New stock level will be: {Math.max(0, selectedIngredient.currentStock + stockAdjustment.change)} {selectedIngredient.unit}
              </p>
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button
                variant="secondary"
                onClick={() => {
                  setIsAdjustStockModalOpen(false);
                  resetStockAdjustment();
                }}
              >
                Cancel
              </Button>
              <Button onClick={handleAdjustStock}>
                Adjust Stock
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
