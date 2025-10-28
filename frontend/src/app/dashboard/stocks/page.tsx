'use client';

import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { DataTable } from '@/components/ui/DataTable';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Select } from '@/components/ui/Select';
import { InventoryItem, useAddStockMutation, useGetInventoryItemsQuery, useGetInventoryItemByIdQuery, useGetLowStockItemsQuery, useRemoveStockMutation } from '@/lib/api/endpoints/inventoryApi';
import { useAppSelector } from '@/lib/store';
import { formatCurrency } from '@/lib/utils';
import {
  ArchiveBoxIcon,
  ArrowDownIcon,
  ArrowUpIcon,
  BeakerIcon,
  ExclamationTriangleIcon,
  EyeIcon,
  PlusIcon,
  MinusIcon
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

  const lowStockItems = useMemo(() => {
    return lowStockData || [];
  }, [lowStockData]);

  // Update selected ingredient when data is fetched
  useEffect(() => {
    if (selectedIngredientData && selectedIngredient) {
      setSelectedIngredient(selectedIngredientData as InventoryItem);
    }
  }, [selectedIngredientData]);

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

  const handleQuickAddStock = async (ingredient: InventoryItem) => {
    try {
      await addStock({ 
        id: ingredient.id, 
        quantity: 1 
      }).unwrap();
      toast.success('Stock added successfully');
      refetch();
    } catch (error: any) {
      toast.error(error?.data?.message || 'Failed to add stock');
    }
  };

  const handleQuickRemoveStock = async (ingredient: InventoryItem) => {
    if (ingredient.currentStock <= 0) {
      toast.error('Cannot remove stock from item with zero stock');
      return;
    }
    try {
      await removeStock({ 
        id: ingredient.id, 
        quantity: 1 
      }).unwrap();
      toast.success('Stock removed successfully');
      refetch();
    } catch (error: any) {
      toast.error(error?.data?.message || 'Failed to remove stock');
    }
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
        <Button
          variant="ghost"
          size="sm"
          onClick={() => openDetailsModal(row)}
          title="View Details"
        >
          <EyeIcon className="w-4 h-4" />
        </Button>
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
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Stock Management</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Monitor inventory levels and stock alerts
          </p>
        </div>
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
              <ArchiveBoxIcon className="w-8 h-8 text-blue-600" />
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
          onExport={(format, items) => {
            toast.success(`Exporting ${items.length} stock items as ${format.toUpperCase()}`);
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
            <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
              <Button
                variant="secondary"
                onClick={() => {
                  setIsDetailsModalOpen(false);
                  setSelectedIngredient(null);
                }}
              >
                Close
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
