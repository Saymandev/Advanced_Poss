'use client';

import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { Combobox } from '@/components/ui/Combobox';
import { DataTable } from '@/components/ui/DataTable';
import { ImportButton } from '@/components/ui/ImportButton';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Select } from '@/components/ui/Select';
import {
  InventoryItem,
  useAddStockMutation,
  useCreateInventoryItemMutation,
  useDeleteInventoryItemMutation,
  useGetInventoryItemsQuery,
  useRemoveStockMutation,
  useUpdateInventoryItemMutation,
} from '@/lib/api/endpoints/inventoryApi';
import { useAppSelector } from '@/lib/store';
import { formatCurrency } from '@/lib/utils';
import {
  ArchiveBoxIcon,
  BeakerIcon,
  ExclamationTriangleIcon,
  EyeIcon,
  PencilIcon,
  PlusIcon,
  TrashIcon,
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

  // Notifications are handled automatically via WebSocket in useSocket hook

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
    
    const params: Record<string, any> = {
      companyId,
      page: currentPage,
      limit: itemsPerPage,
    };

    if (branchId) {
      params.branchId = branchId;
    }

    const trimmedSearch = searchQuery.trim();
    if (trimmedSearch) {
      params.search = trimmedSearch;
    }

    if (categoryFilter !== 'all') {
      params.category = categoryFilter;
    }

    return params;
  }, [companyId, branchId, categoryFilter, searchQuery, currentPage, itemsPerPage]);

  const { data: ingredientsResponse, isLoading, refetch } = useGetInventoryItemsQuery(queryParams!, {
    skip: !queryParams,
  });

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

  // Get unique ingredient categories from existing ingredients for suggestions
  const existingIngredientCategories = useMemo(() => {
    const categories = new Set<string>();
    ingredients.forEach((ing: any) => {
      if (ing.category) {
        categories.add(ing.category);
      }
    });
    return Array.from(categories).map((cat) => ({
      value: cat,
      label: cat.charAt(0).toUpperCase() + cat.slice(1).replace(/-/g, ' '),
    }));
  }, [ingredients]);

  // Combine predefined categories with existing categories from database
  const ingredientCategoryOptions = useMemo(() => {
    const predefined = [
      { value: 'food', label: 'Food' },
      { value: 'beverage', label: 'Beverage' },
      { value: 'packaging', label: 'Packaging' },
      { value: 'cleaning', label: 'Cleaning' },
      { value: 'other', label: 'Other' },
    ];
    
    const predefinedMap = new Map(predefined.map(opt => [opt.value, opt]));
    const combined = [...predefined];
    
    // Add existing categories that aren't in predefined list
    existingIngredientCategories.forEach((cat) => {
      if (!predefinedMap.has(cat.value)) {
        combined.push(cat);
      }
    });
    
    return combined;
  }, [existingIngredientCategories]);

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

  // Notifications for low/out-of-stock ingredients are handled automatically via WebSocket
  // in the useSocket hook (inventory:low-stock and inventory:out-of-stock events)

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
      await refetch();
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
        minimumStock: formData.minimumStock,
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
      toast.success('Ingredient updated successfully');
      setIsEditModalOpen(false);
      resetForm();
      await refetch();
    } catch (error: any) {
      toast.error(error?.data?.message || error?.message || 'Failed to update ingredient');
    }
  };

  const handleDelete = async (ingredient: InventoryItem) => {
    if (!confirm(`Are you sure you want to delete "${ingredient.name}"? This action cannot be undone.`)) return;

    try {
      await deleteIngredient(ingredient.id).unwrap();
      toast.success('Ingredient deleted successfully');
      await refetch();
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
      await refetch();
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
      minimumStock: ingredient.minimumStock,
      maximumStock: ingredient.maximumStock,
      unit: ingredient.unit,
      unitCost: ingredient.unitCost,
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
    const minLevel = ingredient.minimumStock || 10;
    
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
      render: (value: number, row: any) => {
        const stockValue = typeof value === 'number' ? value : (typeof value === 'string' ? parseFloat(value) : 0);
        const minValue = typeof (row.minimumStock || 0) === 'number' 
          ? (row.minimumStock || 0) 
          : (typeof (row.minimumStock || 0) === 'string' ? parseFloat(row.minimumStock || '0') : 0);
        const formattedStock = isNaN(stockValue) ? '0.00' : stockValue.toFixed(2);
        const formattedMin = isNaN(minValue) ? '0.00' : minValue.toFixed(2);
        return (
          <div className="text-right">
            <p className="font-semibold text-gray-900 dark:text-white">
              {formattedStock} {row.unit}
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Min: {formattedMin} {row.unit}
            </p>
          </div>
        );
      },
    },
    {
      key: 'unitCost',
      title: 'Cost',
      align: 'right' as const,
      render: (value: number, row: any) => {
        const unitCost = value || 0;
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
      inStock: ingredients.filter((i) => getStockStatus(i).status === 'good').length,
      lowStock: ingredients.filter((i) => getStockStatus(i).status === 'low').length,
      outOfStock: ingredients.filter((i) => getStockStatus(i).status === 'out').length,
      totalValue: ingredients.reduce(
        (sum, item) =>
          sum + (item.unitCost * (item.currentStock || 0)),
        0,
      ),
    };
  }, [ingredients, totalIngredients]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">Inventory Management</h1>
          <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mt-1">
            Manage your restaurant ingredients and stock levels
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          <ImportButton
            onImport={async (data, _result) => {
              let successCount = 0;
              let errorCount = 0;

              for (const item of data) {
                try {
                  const payload: any = {
                    companyId: companyId?.toString(),
                    name: item.name || item.Name,
                    description: item.description || item.Description || '',
                    category: item.category || item.Category || 'food',
                    unit: item.unit || item.Unit || 'pcs',
                    currentStock: parseFloat(item.currentStock || item['Current Stock'] || 0),
                    minimumStock: parseFloat(item.minimumStock || item['Minimum Stock'] || 10),
                    maximumStock: parseFloat(item.maximumStock || item['Maximum Stock'] || 100),
                    unitCost: parseFloat(item.unitCost || item['Unit Cost'] || item.price || item.Price || 0),
                    preferredSupplierId: item.preferredSupplierId || item['Preferred Supplier'] || undefined,
                    storageLocation: item.storageLocation || item['Storage Location'] || undefined,
                    storageTemperature: item.storageTemperature || item['Storage Temperature'] || undefined,
                    shelfLife: item.shelfLife || item['Shelf Life'] || undefined,
                    sku: item.sku || item.SKU || undefined,
                    barcode: item.barcode || item.Barcode || undefined,
                    notes: item.notes || item.Notes || undefined,
                  };

                  if (branchId) {
                    payload.branchId = branchId.toString();
                  }

                  await createIngredient(payload as any).unwrap();
                  successCount++;
                } catch (error: any) {
                  console.error('Failed to import ingredient:', item, error);
                  errorCount++;
                }
              }

              if (successCount > 0) {
                toast.success(`Successfully imported ${successCount} ingredients`);
                await refetch();
              }
              if (errorCount > 0) {
                toast.error(`Failed to import ${errorCount} ingredients`);
              }
            }}
            columns={[
              { key: 'name', label: 'Name', required: true, type: 'string' },
              { key: 'category', label: 'Category', required: true, type: 'string' },
              { key: 'unit', label: 'Unit', required: true, type: 'string' },
              { key: 'unitCost', label: 'Unit Cost', required: true, type: 'number' },
              { key: 'currentStock', label: 'Current Stock', type: 'number' },
              { key: 'minimumStock', label: 'Minimum Stock', type: 'number' },
              { key: 'maximumStock', label: 'Maximum Stock', type: 'number' },
              { key: 'description', label: 'Description', type: 'string' },
              { key: 'storageLocation', label: 'Storage Location', type: 'string' },
              { key: 'sku', label: 'SKU', type: 'string' },
            ]}
            filename="ingredients-import-template"
            variant="secondary"
          />
          <Button onClick={() => setIsCreateModalOpen(true)} className="w-full sm:w-auto text-sm sm:text-base">
            <PlusIcon className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
            Add Ingredient
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 sm:gap-4">
        <Card>
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0 flex-1">
                <p className="text-xs text-gray-600 dark:text-gray-400 truncate">Total Items</p>
                <p className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900 dark:text-white truncate" title={stats.total.toString()}>
                  {stats.total.toLocaleString()}
                </p>
              </div>
              <BeakerIcon className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600 flex-shrink-0" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0 flex-1">
                <p className="text-xs text-gray-600 dark:text-gray-400 truncate">In Stock</p>
                <p className="text-lg sm:text-xl md:text-2xl font-bold text-green-600 truncate" title={stats.inStock.toString()}>
                  {stats.inStock.toLocaleString()}
                </p>
              </div>
              <ArchiveBoxIcon className="w-5 h-5 sm:w-6 sm:h-6 text-green-600 flex-shrink-0" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0 flex-1">
                <p className="text-xs text-gray-600 dark:text-gray-400 truncate">Low Stock</p>
                <p className="text-lg sm:text-xl md:text-2xl font-bold text-yellow-600 truncate" title={stats.lowStock.toString()}>
                  {stats.lowStock.toLocaleString()}
                </p>
              </div>
              <ExclamationTriangleIcon className="w-5 h-5 sm:w-6 sm:h-6 text-yellow-600 flex-shrink-0" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0 flex-1">
                <p className="text-xs text-gray-600 dark:text-gray-400 truncate">Out of Stock</p>
                <p className="text-lg sm:text-xl md:text-2xl font-bold text-red-600 truncate" title={stats.outOfStock.toString()}>
                  {stats.outOfStock.toLocaleString()}
                </p>
              </div>
              <ExclamationTriangleIcon className="w-5 h-5 sm:w-6 sm:h-6 text-red-600 flex-shrink-0" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0 flex-1">
                <p className="text-xs text-gray-600 dark:text-gray-400 truncate">Total Value</p>
                <p className="text-sm sm:text-base md:text-lg font-bold text-purple-600 truncate" title={formatCurrency(stats.totalValue)}>
                  {formatCurrency(stats.totalValue)}
                </p>
              </div>
              <ArchiveBoxIcon className="w-5 h-5 sm:w-6 sm:h-6 text-purple-600 flex-shrink-0" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-3 sm:p-4">
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
            <div className="flex-1">
              <Input
                placeholder="Search ingredients..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="text-sm sm:text-base"
              />
            </div>
            <div className="w-full sm:w-48">
              <Select
                options={[
                  { value: 'all', label: 'All Categories' },
                  ...ingredientCategoryOptions,
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
          onExport={(_format, _items) => {
            // Export is handled automatically by ExportButton component
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
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Ingredient Name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Category *
              </label>
              <Combobox
                value={formData.category || 'food'}
                onChange={(value: string) => setFormData({ ...formData, category: value.trim() })}
                options={ingredientCategoryOptions}
                placeholder="Select a category or enter custom category..."
                allowCustom={true}
              />
            </div>
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

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
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

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
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

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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

          <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 pt-4">
            <Button
              variant="secondary"
              onClick={() => {
                setIsCreateModalOpen(false);
                resetForm();
              }}
              className="w-full sm:w-auto text-sm sm:text-base"
            >
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={isCreating} className="w-full sm:w-auto text-sm sm:text-base">
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
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Ingredient Name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Category *
              </label>
              <Combobox
                value={formData.category || 'food'}
                onChange={(value: string) => setFormData({ ...formData, category: value.trim() })}
                options={ingredientCategoryOptions}
                placeholder="Select a category or enter custom category..."
                allowCustom={true}
              />
            </div>
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

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
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

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
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
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 pt-4 border-t border-gray-200 dark:border-gray-700">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Current Stock</p>
                <p className="text-lg font-semibold text-gray-900 dark:text-white">
                  {typeof selectedIngredient.currentStock === 'number' 
                    ? selectedIngredient.currentStock.toFixed(2) 
                    : selectedIngredient.currentStock} {selectedIngredient.unit}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Minimum Stock</p>
                <p className="text-lg font-semibold text-gray-900 dark:text-white">
                  {typeof selectedIngredient.minimumStock === 'number'
                    ? selectedIngredient.minimumStock.toFixed(2)
                    : selectedIngredient.minimumStock} {selectedIngredient.unit}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Unit Cost</p>
                <p className="text-lg font-semibold text-gray-900 dark:text-white">
                  {formatCurrency(selectedIngredient.unitCost)}/{selectedIngredient.unit}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Total Value</p>
                <p className="text-lg font-semibold text-gray-900 dark:text-white">
                  {formatCurrency(selectedIngredient.unitCost * (selectedIngredient.currentStock || 0))}
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
                    {typeof selectedIngredient.maximumStock === 'number'
                      ? selectedIngredient.maximumStock.toFixed(2)
                      : selectedIngredient.maximumStock} {selectedIngredient.unit}
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

            <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
              <Button
                variant="secondary"
                onClick={() => setIsViewModalOpen(false)}
                className="w-full sm:w-auto text-sm sm:text-base"
              >
                Close
              </Button>
              <Button
                onClick={() => {
                  setIsViewModalOpen(false);
                  openEditModal(selectedIngredient);
                }}
                className="w-full sm:w-auto text-sm sm:text-base"
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

            <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 pt-4">
              <Button
                variant="secondary"
                onClick={() => {
                  setIsAdjustStockModalOpen(false);
                  resetStockAdjustment();
                }}
                className="w-full sm:w-auto text-sm sm:text-base"
              >
                Cancel
              </Button>
              <Button onClick={handleAdjustStock} className="w-full sm:w-auto text-sm sm:text-base">
                Adjust Stock
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
