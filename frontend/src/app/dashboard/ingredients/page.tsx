'use client';

import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { DataTable } from '@/components/ui/DataTable';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Select } from '@/components/ui/Select';
import { InventoryItem, useAdjustStockMutation, useCreateInventoryItemMutation, useDeleteInventoryItemMutation, useGetInventoryItemsQuery, useUpdateInventoryItemMutation } from '@/lib/api/endpoints/inventoryApi';
import { useAppSelector } from '@/lib/store';
import { formatCurrency } from '@/lib/utils';
import {
  ArchiveBoxIcon,
  BeakerIcon,
  ExclamationTriangleIcon,
  PencilIcon,
  PlusIcon,
  TrashIcon
} from '@heroicons/react/24/outline';
import { useState } from 'react';
import toast from 'react-hot-toast';

export default function IngredientsPage() {
  const { user, companyContext } = useAppSelector((state) => state.auth);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isAdjustStockModalOpen, setIsAdjustStockModalOpen] = useState(false);
  const [selectedIngredient, setSelectedIngredient] = useState<InventoryItem | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [stockFilter, setStockFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);

  const { data, isLoading, refetch } = useGetInventoryItemsQuery({
    branchId: user?.branchId,
    search: searchQuery || undefined,
    category: categoryFilter === 'all' ? undefined : categoryFilter,
    lowStock: stockFilter === 'low',
    page: currentPage,
    limit: itemsPerPage,
  });

  const [createIngredient] = useCreateInventoryItemMutation();
  const [updateIngredient] = useUpdateInventoryItemMutation();
  const [deleteIngredient] = useDeleteInventoryItemMutation();
  const [adjustStock] = useAdjustStockMutation();

  const [formData, setFormData] = useState<any>({
    name: '',
    description: '',
    currentStock: 0,
    minStock: 10,
    maxStock: 100,
    unit: 'pieces',
    unitPrice: 0,
    category: 'food',
    supplierId: '',
    expiryDate: '',
  });

  const [stockAdjustment, setStockAdjustment] = useState({
    change: 0,
    reason: '',
  });

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      currentStock: 0,
      minStock: 10,
      maxStock: 100,
      unit: 'pieces',
      unitPrice: 0,
      category: 'food',
      supplierId: '',
      expiryDate: '',
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
    try {
      await createIngredient({
        companyId: user?.companyId || '',
        branchId: user?.branchId,
        name: formData.name,
        description: formData.description,
        category: formData.category,
        unit: formData.unit,
        currentStock: formData.currentStock,
        minimumStock: formData.minStock,
        maximumStock: formData.maxStock,
        unitCost: formData.unitPrice,
        preferredSupplierId: formData.supplierId || undefined,
      } as any).unwrap();
      toast.success('Ingredient created successfully');
      setIsCreateModalOpen(false);
      resetForm();
      refetch();
    } catch (error: any) {
      toast.error(error.data?.message || 'Failed to create ingredient');
    }
  };

  const handleEdit = async () => {
    if (!selectedIngredient) return;

    try {
      await updateIngredient({
        id: selectedIngredient.id,
        name: formData.name,
        description: formData.description,
        category: formData.category,
        unit: formData.unit,
        currentStock: formData.currentStock,
        minimumStock: formData.minStock,
        maximumStock: formData.maxStock,
        unitCost: formData.unitPrice,
        preferredSupplierId: formData.supplierId || undefined,
      } as any).unwrap();
      toast.success('Ingredient updated successfully');
      setIsEditModalOpen(false);
      resetForm();
      refetch();
    } catch (error: any) {
      toast.error(error.data?.message || 'Failed to update ingredient');
    }
  };

  const handleDelete = async (ingredient: InventoryItem) => {
    if (!confirm(`Are you sure you want to delete "${ingredient.name}"?`)) return;

    try {
      await deleteIngredient(ingredient.id).unwrap();
      toast.success('Ingredient deleted successfully');
      refetch();
    } catch (error: any) {
      toast.error(error.data?.message || 'Failed to delete ingredient');
    }
  };

  const handleAdjustStock = async () => {
    if (!selectedIngredient) return;

    try {
      await adjustStock({
        inventoryItemId: selectedIngredient.id,
        ...stockAdjustment,
      } as any).unwrap();
      toast.success('Stock adjusted successfully');
      setIsAdjustStockModalOpen(false);
      resetStockAdjustment();
      refetch();
    } catch (error: any) {
      toast.error(error.data?.message || 'Failed to adjust stock');
    }
  };

  const openEditModal = (ingredient: InventoryItem) => {
    setSelectedIngredient(ingredient);
    setFormData({
      name: ingredient.name,
      description: ingredient.description || '',
      currentStock: ingredient.currentStock,
      minStock: ingredient.minStock,
      maxStock: ingredient.maxStock,
      unit: ingredient.unit,
      unitPrice: ingredient.unitPrice,
      category: ingredient.category,
      supplierId: ingredient.supplier?.id || '',
      expiryDate: ingredient.expiryDate || '',
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
            {value} {row.unit}
          </p>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Min: {row.minStock} {row.unit}
          </p>
        </div>
      ),
    },
    {
      key: 'unitPrice',
      title: 'Cost',
      align: 'right' as const,
      render: (value: number, row: any) => (
        <div className="text-right">
          <p className="font-semibold text-gray-900 dark:text-white">
            {formatCurrency(value)}/{row.unit}
          </p>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Total: {formatCurrency(value * row.currentStock)}
          </p>
        </div>
      ),
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
            onClick={() => openAdjustStockModal(row)}
            className="text-blue-600 hover:text-blue-700"
          >
            <ArchiveBoxIcon className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => openEditModal(row)}
          >
            <PencilIcon className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleDelete(row)}
            className="text-red-600 hover:text-red-700"
          >
            <TrashIcon className="w-4 h-4" />
          </Button>
        </div>
      ),
    },
  ];

  const stats = {
    total: data?.total || 0,
    inStock: data?.items?.filter((i: any) => i.currentStock > i.minStock).length || 0,
    lowStock: data?.items?.filter((i: any) => i.currentStock > 0 && i.currentStock <= i.minStock).length || 0,
    outOfStock: data?.items?.filter((i: any) => i.currentStock <= 0).length || 0,
    totalValue: data?.items?.reduce((sum: number, item: any) => sum + (item.unitPrice * item.currentStock), 0) || 0,
  };

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
                  { value: 'alcohol', label: 'Alcohol' },
                  { value: 'supplies', label: 'Supplies' },
                  { value: 'cleaning', label: 'Cleaning' },
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
      <DataTable
        data={data?.items || []}
        columns={columns}
        loading={isLoading}
        searchable={false}
        selectable={true}
        pagination={{
          currentPage,
          totalPages: Math.ceil((data?.total || 0) / itemsPerPage),
          itemsPerPage,
          totalItems: data?.total || 0,
          onPageChange: setCurrentPage,
          onItemsPerPageChange: setItemsPerPage,
        }}
        exportable={true}
        exportFilename="inventory"
        onExport={(format, items) => {
          console.log(`Exporting ${items.length} ingredients as ${format}`);
        }}
        emptyMessage="No ingredients found. Add your first ingredient to get started."
      />

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
                { value: 'alcohol', label: 'Alcohol' },
                { value: 'supplies', label: 'Supplies' },
                { value: 'cleaning', label: 'Cleaning' },
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
              onChange={(e) => setFormData({ ...formData, quantity: parseFloat(e.target.value) || 0 })}
              required
            />
            <Select
              label="Unit"
              options={[
                { value: 'pieces', label: 'Pieces' },
                { value: 'kg', label: 'Kilograms' },
                { value: 'g', label: 'Grams' },
                { value: 'l', label: 'Liters' },
                { value: 'ml', label: 'Milliliters' },
                { value: 'cups', label: 'Cups' },
                { value: 'tbsp', label: 'Tablespoons' },
                { value: 'tsp', label: 'Teaspoons' },
                { value: 'boxes', label: 'Boxes' },
                { value: 'bottles', label: 'Bottles' },
              ]}
              value={formData.unit}
              onChange={(value) => setFormData({ ...formData, unit: value })}
            />
            <Input
              label="Min Stock Level"
              type="number"
              value={formData.minStock}
              onChange={(e) => setFormData({ ...formData, minStockLevel: parseInt(e.target.value) || 0 })}
              required
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Cost per Unit"
              type="number"
              step="0.01"
              value={formData.unitPrice}
              onChange={(e) => setFormData({ ...formData, costPerUnit: parseFloat(e.target.value) || 0 })}
              required
            />
            <Input
              label="Expiry Date (Optional)"
              type="date"
              value={formData.expiryDate}
              onChange={(e) => setFormData({ ...formData, expiryDate: e.target.value })}
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
              Add Ingredient
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
                { value: 'alcohol', label: 'Alcohol' },
                { value: 'supplies', label: 'Supplies' },
                { value: 'cleaning', label: 'Cleaning' },
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
              onChange={(e) => setFormData({ ...formData, quantity: parseFloat(e.target.value) || 0 })}
              required
            />
            <Select
              label="Unit"
              options={[
                { value: 'pieces', label: 'Pieces' },
                { value: 'kg', label: 'Kilograms' },
                { value: 'g', label: 'Grams' },
                { value: 'l', label: 'Liters' },
                { value: 'ml', label: 'Milliliters' },
                { value: 'cups', label: 'Cups' },
                { value: 'tbsp', label: 'Tablespoons' },
                { value: 'tsp', label: 'Teaspoons' },
                { value: 'boxes', label: 'Boxes' },
                { value: 'bottles', label: 'Bottles' },
              ]}
              value={formData.unit}
              onChange={(value) => setFormData({ ...formData, unit: value })}
            />
            <Input
              label="Min Stock Level"
              type="number"
              value={formData.minStock}
              onChange={(e) => setFormData({ ...formData, minStockLevel: parseInt(e.target.value) || 0 })}
              required
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Cost per Unit"
              type="number"
              step="0.01"
              value={formData.unitPrice}
              onChange={(e) => setFormData({ ...formData, costPerUnit: parseFloat(e.target.value) || 0 })}
              required
            />
            <Input
              label="Expiry Date (Optional)"
              type="date"
              value={formData.expiryDate}
              onChange={(e) => setFormData({ ...formData, expiryDate: e.target.value })}
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
            <Button onClick={handleEdit}>
              Update Ingredient
            </Button>
          </div>
        </div>
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
                Reason
              </label>
              <Select
                options={[
                  { value: 'purchase', label: 'Purchase/Delivery' },
                  { value: 'usage', label: 'Used in Production' },
                  { value: 'waste', label: 'Waste/Spoilage' },
                  { value: 'adjustment', label: 'Inventory Adjustment' },
                  { value: 'return', label: 'Return to Supplier' },
                  { value: 'other', label: 'Other' },
                ]}
                value={stockAdjustment.reason}
                onChange={(value) => setStockAdjustment({ ...stockAdjustment, reason: value })}
                placeholder="Select reason"
              />
            </div>

            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
              <p className="text-sm text-blue-800 dark:text-blue-400 text-center">
                New stock level will be: {selectedIngredient.currentStock + stockAdjustment.change} {selectedIngredient.unit}
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
