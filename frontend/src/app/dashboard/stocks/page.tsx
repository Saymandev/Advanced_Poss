'use client';

import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { DataTable } from '@/components/ui/DataTable';
import { ImportButton } from '@/components/ui/ImportButton';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Select } from '@/components/ui/Select';
import { InventoryItem, useAddStockMutation, useGetInventoryItemByIdQuery, useGetInventoryItemsQuery, useGetLowStockItemsQuery, useRemoveStockMutation } from '@/lib/api/endpoints/inventoryApi';
import { useAppSelector } from '@/lib/store';
import { formatCurrency } from '@/lib/utils';
import {
  ArchiveBoxIcon,
  BeakerIcon,
  ExclamationTriangleIcon,
  EyeIcon,
  MinusIcon,
  PlusIcon
} from '@heroicons/react/24/outline';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'react-hot-toast';

export default function StocksPage() {
  const { user, companyContext } = useAppSelector((state) => state.auth);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [stockFilter, setStockFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [isAdjustStockModalOpen, setIsAdjustStockModalOpen] = useState(false);
  const [selectedIngredient, setSelectedIngredient] = useState<InventoryItem | null>(null);
  const [adjustmentQuantity, setAdjustmentQuantity] = useState<number>(0);
  const [adjustmentType, setAdjustmentType] = useState<'add' | 'remove'>('add');
  const [adjustmentReason, setAdjustmentReason] = useState<string>('');

  const companyId = (user as any)?.companyId || 
                    (companyContext as any)?.companyId;

  const branchId = (user as any)?.branchId || 
                   (companyContext as any)?.branchId || 
                   (companyContext as any)?.branches?.[0]?._id ||
                   (companyContext as any)?.branches?.[0]?.id;

  const { data: ingredientsResponse, isLoading, refetch } = useGetInventoryItemsQuery({
    branchId,
    search: searchQuery || undefined,
    category: categoryFilter === 'all' ? undefined : categoryFilter,
    page: currentPage,
    limit: itemsPerPage,
  }, { skip: !branchId });

  const { data: lowStockData } = useGetLowStockItemsQuery({ companyId }, { skip: !companyId });

  const { data: selectedIngredientData } = useGetInventoryItemByIdQuery(selectedIngredient?.id || '', { 
    skip: !selectedIngredient?.id 
  });

  const [addStock, { isLoading: isAddingStock }] = useAddStockMutation();
  const [removeStock, { isLoading: isRemovingStock }] = useRemoveStockMutation();

  // Extract ingredients from API response
  const ingredients = useMemo(() => {
    if (!ingredientsResponse) return [];
    return ingredientsResponse.items || [];
  }, [ingredientsResponse]);

  const totalIngredients = useMemo(() => {
    return ingredientsResponse?.total || 0;
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

  const lowStockItems = useMemo(() => {
    return lowStockData || [];
  }, [lowStockData]);

  // Update selected ingredient when data is fetched
  useEffect(() => {
    if (selectedIngredientData && selectedIngredient) {
      setSelectedIngredient(selectedIngredientData as InventoryItem);
    }
  }, [selectedIngredientData, selectedIngredient]);

  // Filter ingredients by stock level
  const filteredIngredients = useMemo(() => {
    if (stockFilter === 'all') return ingredients;
    if (stockFilter === 'low') return ingredients.filter(i => i.isLowStock);
    if (stockFilter === 'out') return ingredients.filter(i => i.isOutOfStock);
    return ingredients;
  }, [ingredients, stockFilter]);

  const openDetailsModal = (ingredient: InventoryItem) => {
    setSelectedIngredient(ingredient);
    setIsDetailsModalOpen(true);
  };

  const openAdjustStockModal = (ingredient: InventoryItem, type: 'add' | 'remove') => {
    setSelectedIngredient(ingredient);
    setAdjustmentType(type);
    setAdjustmentQuantity(0);
    setAdjustmentReason('');
    setIsAdjustStockModalOpen(true);
  };

  const handleAdjustStock = async () => {
    if (!selectedIngredient) return;
    
    if (adjustmentQuantity <= 0) {
      toast.error('Quantity must be greater than 0');
      return;
    }

    if (adjustmentType === 'remove' && adjustmentQuantity > (selectedIngredient.currentStock || 0)) {
      toast.error('Cannot remove more stock than available');
      return;
    }

    try {
      if (adjustmentType === 'add') {
        await addStock({ 
          id: selectedIngredient.id, 
          quantity: adjustmentQuantity 
        }).unwrap();
        toast.success(`Added ${adjustmentQuantity} ${selectedIngredient.unit} successfully`);
      } else {
        await removeStock({ 
          id: selectedIngredient.id, 
          quantity: adjustmentQuantity 
        }).unwrap();
        toast.success(`Removed ${adjustmentQuantity} ${selectedIngredient.unit} successfully`);
      }
      setIsAdjustStockModalOpen(false);
      setAdjustmentQuantity(0);
      setAdjustmentReason('');
      refetch();
      if (isDetailsModalOpen) {
        refetch();
      }
    } catch (error: any) {
      toast.error(error?.data?.message || `Failed to ${adjustmentType} stock`);
    }
  };

  const getStockStatus = (ingredient: InventoryItem) => {
    if (ingredient.isOutOfStock) {
      return { status: 'out', label: 'Out of Stock', variant: 'danger' as const };
    } else if (ingredient.isLowStock) {
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
      render: (value: string, row: any) => (
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary-100 dark:bg-primary-900/30 rounded-lg flex items-center justify-center">
            <BeakerIcon className="w-5 h-5 text-primary-600 dark:text-primary-400" />
          </div>
          <div>
            <p className="font-medium text-gray-900 dark:text-white">{value}</p>
            <p className="text-sm text-gray-500 dark:text-gray-400">{row.category}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'quantity',
      title: 'Stock',
      align: 'right' as const,
      render: (value: number, row: InventoryItem) => (
        <div className="text-right">
          <p className="font-semibold text-gray-900 dark:text-white">
            {row.currentStock || 0} {row.unit}
          </p>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Min: {row.minimumStock || row.minStock || 0} {row.unit}
          </p>
        </div>
      ),
    },
    {
      key: 'costPerUnit',
      title: 'Cost',
      align: 'right' as const,
      render: (value: number, row: InventoryItem) => {
        const unitCost = row.unitCost || row.unitPrice || 0;
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
      key: 'expiryDate',
      title: 'Expiry',
      render: (value: string) => {
        if (!value) return <span className="text-gray-500 dark:text-gray-400">No expiry</span>;

        const expiryDate = new Date(value);
        const now = new Date();
        const isExpired = expiryDate < now;
        const isExpiringSoon = expiryDate < new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

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
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => openDetailsModal(row)}
            title="View Details"
          >
            <EyeIcon className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => openAdjustStockModal(row, 'add')}
            title="Add Stock"
            className="text-green-600 hover:text-green-700"
          >
            <PlusIcon className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => openAdjustStockModal(row, 'remove')}
            title="Remove Stock"
            className="text-red-600 hover:text-red-700"
            disabled={!row.currentStock || row.currentStock <= 0}
          >
            <MinusIcon className="w-4 h-4" />
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
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">Stock Management</h1>
          <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mt-1">
            Monitor inventory levels and stock alerts
          </p>
        </div>
        <div className="w-full sm:w-auto">
          <ImportButton
          onImport={async (data, _result) => {
            let successCount = 0;
            let errorCount = 0;

            for (const item of data) {
              try {
                // Find ingredient by name
                const ingredientName = item.ingredient || item.Ingredient || item.name || item.Name;
                const ingredient = ingredients.find((ing: any) => 
                  ing.name.toLowerCase() === ingredientName.toLowerCase()
                );

                if (!ingredient) {
                  errorCount++;
                  continue;
                }

                const quantity = parseFloat(item.quantity || item.Quantity || 0);
                const type = (item.type || item.Type || 'add').toLowerCase();

                if (quantity <= 0) {
                  errorCount++;
                  continue;
                }

                if (type === 'add' || type === 'increase') {
                  await addStock({ 
                    id: ingredient.id, 
                    quantity 
                  }).unwrap();
                  successCount++;
                } else if (type === 'remove' || type === 'decrease' || type === 'subtract') {
                  if (quantity > (ingredient.currentStock || 0)) {
                    errorCount++;
                    continue;
                  }
                  await removeStock({ 
                    id: ingredient.id, 
                    quantity 
                  }).unwrap();
                  successCount++;
                } else {
                  errorCount++;
                }
              } catch (error: any) {
                console.error('Failed to import stock adjustment:', item, error);
                errorCount++;
              }
            }

            if (successCount > 0) {
              toast.success(`Successfully imported ${successCount} stock adjustments`);
              await refetch();
            }
            if (errorCount > 0) {
              toast.error(`Failed to import ${errorCount} stock adjustments`);
            }
          }}
          columns={[
            { key: 'ingredient', label: 'Ingredient Name', required: true, type: 'string' },
            { key: 'quantity', label: 'Quantity', required: true, type: 'number' },
            { key: 'type', label: 'Type (add/remove)', required: true, type: 'string' },
          ]}
            filename="stock-adjustments-import-template"
            variant="secondary"
          />
        </div>
      </div>

      {/* Low Stock Alert Banner */}
      {lowStockItems.length > 0 && (
        <Card className="border-yellow-200 bg-yellow-50 dark:bg-yellow-900/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <ExclamationTriangleIcon className="w-6 h-6 text-yellow-600" />
                <div>
                  <p className="font-semibold text-yellow-900 dark:text-yellow-200">
                    Low Stock Alert: {lowStockItems.length} item{lowStockItems.length > 1 ? 's' : ''} need restocking
                  </p>
                  <p className="text-sm text-yellow-700 dark:text-yellow-300">
                    {lowStockItems.slice(0, 3).map(item => item.name).join(', ')}
                    {lowStockItems.length > 3 && ' and more...'}
                  </p>
                </div>
              </div>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setStockFilter('low')}
              >
                View Low Stock
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

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
              <ArchiveBoxIcon className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600 flex-shrink-0" />
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

      {/* Stock Table */}
      {isLoading ? (
        <Card>
          <CardContent className="p-6">
            <div className="text-center py-12">
              <p className="text-gray-500 dark:text-gray-400">Loading stock data...</p>
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
          exportFilename="stock-levels"
          onExport={(_format, _items) => {
            // Export is handled automatically by ExportButton component
          }}
          emptyMessage="No stock items found."
        />
      )}

      {/* Stock Details Modal */}
      <Modal
        isOpen={isDetailsModalOpen}
        onClose={() => {
          setIsDetailsModalOpen(false);
          setSelectedIngredient(null);
        }}
        title="Stock Details"
        className="max-w-2xl"
      >
        {selectedIngredient && (
          <div className="space-y-6">
            {/* Header */}
            <div className="flex items-start gap-6">
              <div className="w-16 h-16 bg-primary-100 dark:bg-primary-900/30 rounded-lg flex items-center justify-center">
                <BeakerIcon className="w-8 h-8 text-primary-600 dark:text-primary-400" />
              </div>
              <div className="flex-1">
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                   {selectedIngredient.name}
                 </h3>
                 <Badge variant="secondary" className="mt-2 capitalize">
                   {selectedIngredient.category}
                 </Badge>
                 <div className="mt-2">
                   <p className="text-2xl font-bold text-primary-600">
                     {selectedIngredient.currentStock || 0} {selectedIngredient.unit}
                   </p>
                   <p className="text-sm text-gray-600 dark:text-gray-400">
                     Min Stock: {selectedIngredient.minimumStock || selectedIngredient.minStock || 0} {selectedIngredient.unit}
                   </p>
                 </div>
              </div>
            </div>

            {/* Stock Information */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
              <div>
                <h4 className="font-medium text-gray-900 dark:text-white mb-3">Stock Information</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Current Stock:</span>
                    <span className="font-medium text-gray-900 dark:text-white">
                      {selectedIngredient.currentStock || 0} {selectedIngredient.unit}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Min Stock Level:</span>
                    <span className="font-medium text-gray-900 dark:text-white">
                      {selectedIngredient.minimumStock || selectedIngredient.minStock || 0} {selectedIngredient.unit}
                    </span>
                  </div>
                  {selectedIngredient.maximumStock && (
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Max Stock Level:</span>
                      <span className="font-medium text-gray-900 dark:text-white">
                        {selectedIngredient.maximumStock} {selectedIngredient.unit}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Stock Value:</span>
                    <span className="font-medium text-gray-900 dark:text-white">
                      {formatCurrency((selectedIngredient.unitCost || selectedIngredient.unitPrice || 0) * (selectedIngredient.currentStock || 0))}
                    </span>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="font-medium text-gray-900 dark:text-white mb-3">Cost Information</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Cost per Unit:</span>
                    <span className="font-medium text-gray-900 dark:text-white">
                       {formatCurrency(selectedIngredient.unitCost || selectedIngredient.unitPrice || 0)}
                     </span>
                   </div>
                   <div className="flex justify-between">
                     <span className="text-gray-600 dark:text-gray-400">Total Cost:</span>
                     <span className="font-medium text-gray-900 dark:text-white">
                       {formatCurrency((selectedIngredient.unitCost || selectedIngredient.unitPrice || 0) * (selectedIngredient.currentStock || 0))}
                     </span>
                   </div>
                   {selectedIngredient.storageLocation && (
                     <div className="flex justify-between">
                       <span className="text-gray-600 dark:text-gray-400">Storage Location:</span>
                       <span className="font-medium text-gray-900 dark:text-white">
                         {selectedIngredient.storageLocation}
                       </span>
                     </div>
                   )}
                </div>
              </div>
            </div>

            {/* Additional Information */}
            {(selectedIngredient.sku || selectedIngredient.barcode || selectedIngredient.storageTemperature || selectedIngredient.shelfLife) && (
              <div>
                <h4 className="font-medium text-gray-900 dark:text-white mb-3">Additional Information</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  {selectedIngredient.sku && (
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">SKU:</span>
                      <span className="font-medium text-gray-900 dark:text-white">{selectedIngredient.sku}</span>
                    </div>
                  )}
                  {selectedIngredient.barcode && (
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Barcode:</span>
                      <span className="font-medium text-gray-900 dark:text-white">{selectedIngredient.barcode}</span>
                    </div>
                  )}
                  {selectedIngredient.storageTemperature && (
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Storage Temperature:</span>
                      <span className="font-medium text-gray-900 dark:text-white">{selectedIngredient.storageTemperature}</span>
                    </div>
                  )}
                  {selectedIngredient.shelfLife && (
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Shelf Life:</span>
                      <span className="font-medium text-gray-900 dark:text-white">{selectedIngredient.shelfLife} days</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Expiry Information */}
            {selectedIngredient.expiryDate && (
              <div>
                <h4 className="font-medium text-gray-900 dark:text-white mb-3">Expiry Information</h4>
                <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Expiry Date:</span>
                    <span className="font-medium text-gray-900 dark:text-white">
                      {new Date(selectedIngredient.expiryDate).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="mt-2">
                    <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all duration-300 ${
                          new Date(selectedIngredient.expiryDate) < new Date() ? 'bg-red-500' :
                          new Date(selectedIngredient.expiryDate) < new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) ? 'bg-yellow-500' : 'bg-green-500'
                        }`}
                        style={{
                          width: `${Math.max(0, Math.min(100, ((new Date().getTime() - new Date(selectedIngredient.expiryDate).getTime()) / (7 * 24 * 60 * 60 * 1000)) * 100))}%`
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
              <Button
                variant="secondary"
                onClick={() => {
                  setIsDetailsModalOpen(false);
                  setSelectedIngredient(null);
                }}
                className="w-full sm:w-auto text-sm sm:text-base"
              >
                Close
              </Button>
              <Button
                onClick={() => {
                  setIsDetailsModalOpen(false);
                  openAdjustStockModal(selectedIngredient, 'add');
                }}
                className="bg-green-600 hover:bg-green-700 w-full sm:w-auto text-sm sm:text-base"
              >
                <PlusIcon className="w-4 h-4 mr-2" />
                Add Stock
              </Button>
              {selectedIngredient.currentStock > 0 && (
                <Button
                  onClick={() => {
                    setIsDetailsModalOpen(false);
                    openAdjustStockModal(selectedIngredient, 'remove');
                  }}
                  className="bg-red-600 hover:bg-red-700 w-full sm:w-auto text-sm sm:text-base"
                >
                  <MinusIcon className="w-4 h-4 mr-2" />
                  Remove Stock
                </Button>
              )}
            </div>
          </div>
        )}
      </Modal>

      {/* Adjust Stock Modal */}
      <Modal
        isOpen={isAdjustStockModalOpen}
        onClose={() => {
          setIsAdjustStockModalOpen(false);
          setAdjustmentQuantity(0);
          setAdjustmentReason('');
        }}
        title={adjustmentType === 'add' ? 'Add Stock' : 'Remove Stock'}
        className="max-w-md"
      >
        {selectedIngredient && (
          <div className="space-y-4">
            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Ingredient</p>
              <p className="font-semibold text-gray-900 dark:text-white">{selectedIngredient.name}</p>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                Current Stock: <span className="font-medium">{selectedIngredient.currentStock || 0} {selectedIngredient.unit}</span>
              </p>
              {selectedIngredient.minimumStock && (
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Minimum Stock: <span className="font-medium">{selectedIngredient.minimumStock} {selectedIngredient.unit}</span>
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Quantity ({selectedIngredient.unit})
              </label>
              <Input
                type="number"
                min="0.01"
                step="0.01"
                value={adjustmentQuantity || ''}
                onChange={(e) => setAdjustmentQuantity(parseFloat(e.target.value) || 0)}
                placeholder="Enter quantity"
                required
              />
              {adjustmentType === 'remove' && adjustmentQuantity > (selectedIngredient.currentStock || 0) && (
                <p className="text-red-600 text-sm mt-1">
                  Cannot remove more than {selectedIngredient.currentStock} {selectedIngredient.unit}
                </p>
              )}
              {adjustmentType === 'add' && (
                <p className="text-gray-500 text-sm mt-1">
                  New stock will be: {((selectedIngredient.currentStock || 0) + adjustmentQuantity).toFixed(2)} {selectedIngredient.unit}
                </p>
              )}
              {adjustmentType === 'remove' && (
                <p className="text-gray-500 text-sm mt-1">
                  New stock will be: {Math.max(0, (selectedIngredient.currentStock || 0) - adjustmentQuantity).toFixed(2)} {selectedIngredient.unit}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Reason (Optional)
              </label>
              <textarea
                rows={3}
                value={adjustmentReason}
                onChange={(e) => setAdjustmentReason(e.target.value)}
                className="input w-full"
                placeholder={`Reason for ${adjustmentType === 'add' ? 'adding' : 'removing'} stock...`}
              />
            </div>

            <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 pt-4">
              <Button
                variant="secondary"
                onClick={() => {
                  setIsAdjustStockModalOpen(false);
                  setAdjustmentQuantity(0);
                  setAdjustmentReason('');
                }}
                className="w-full sm:w-auto text-sm sm:text-base"
              >
                Cancel
              </Button>
              <Button
                onClick={handleAdjustStock}
                disabled={adjustmentQuantity <= 0 || isAddingStock || isRemovingStock || (adjustmentType === 'remove' && adjustmentQuantity > (selectedIngredient.currentStock || 0))}
                className={`w-full sm:w-auto text-sm sm:text-base ${adjustmentType === 'add' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}`}
              >
                {isAddingStock || isRemovingStock ? 'Processing...' : adjustmentType === 'add' ? 'Add Stock' : 'Remove Stock'}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
