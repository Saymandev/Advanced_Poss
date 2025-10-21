'use client';

import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { DataTable } from '@/components/ui/DataTable';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Select } from '@/components/ui/Select';
import { useGetInventoryItemsQuery } from '@/lib/api/endpoints/inventoryApi';
import { useAppSelector } from '@/lib/store';
import { formatCurrency } from '@/lib/utils';
import {
    ArchiveBoxIcon,
    BeakerIcon,
    ExclamationTriangleIcon,
    EyeIcon
} from '@heroicons/react/24/outline';
import { useState } from 'react';

export default function StocksPage() {
  const { user } = useAppSelector((state) => state.auth);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [stockFilter, setStockFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [selectedIngredient, setSelectedIngredient] = useState<any>(null);

  const { data, isLoading, refetch } = useGetInventoryItemsQuery({
    branchId: user?.branchId,
    search: searchQuery || undefined,
    category: categoryFilter === 'all' ? undefined : categoryFilter,
    lowStock: stockFilter === 'low',
    page: currentPage,
    limit: itemsPerPage,
  });

  const openDetailsModal = (ingredient: any) => {
    setSelectedIngredient(ingredient);
    setIsDetailsModalOpen(true);
  };

  const getStockStatus = (ingredient: any) => {
    if (ingredient.currentStock <= 0) {
      return { status: 'out', label: 'Out of Stock', variant: 'danger' as const };
    } else if (ingredient.currentStock <= ingredient.minStock) {
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
      render: (value: number, row: any) => (
        <div className="text-right">
          <p className="font-semibold text-gray-900 dark:text-white">
            {row.currentStock} {row.unit}
          </p>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Min: {row.minStock} {row.unit}
          </p>
        </div>
      ),
    },
    {
      key: 'costPerUnit',
      title: 'Cost',
      align: 'right' as const,
      render: (value: number, row: any) => (
        <div className="text-right">
          <p className="font-semibold text-gray-900 dark:text-white">
            {formatCurrency(row.unitPrice)}/{row.unit}
          </p>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Total: {formatCurrency(row.unitPrice * row.currentStock)}
          </p>
        </div>
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
      render: (value: any, row: any) => {
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
      render: (value: any, row: any) => (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => openDetailsModal(row)}
        >
          <EyeIcon className="w-4 h-4" />
        </Button>
      ),
    },
  ];

  const stats = {
    total: data?.total || 0,
    inStock: data?.items?.filter(i => i.currentStock > i.minStock).length || 0,
    lowStock: data?.items?.filter(i => i.currentStock > 0 && i.currentStock <= i.minStock).length || 0,
    outOfStock: data?.items?.filter(i => i.currentStock <= 0).length || 0,
    totalValue: data?.items?.reduce((sum, item) => sum + (item.unitPrice * item.currentStock), 0) || 0,
  };

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

      {/* Stock Table */}
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
        exportFilename="stock-levels"
        onExport={(format, items) => {
          console.log(`Exporting ${items.length} stock items as ${format}`);
        }}
        emptyMessage="No ingredients found."
      />

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
                     {selectedIngredient.currentStock} {selectedIngredient.unit}
                   </p>
                   <p className="text-sm text-gray-600 dark:text-gray-400">
                     Min Stock: {selectedIngredient.minStock} {selectedIngredient.unit}
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
                      {selectedIngredient.currentStock} {selectedIngredient.unit}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Min Stock Level:</span>
                    <span className="font-medium text-gray-900 dark:text-white">
                      {selectedIngredient.minStock} {selectedIngredient.unit}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Stock Value:</span>
                    <span className="font-medium text-gray-900 dark:text-white">
                      {formatCurrency(selectedIngredient.unitPrice * selectedIngredient.currentStock)}
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
                       {formatCurrency(selectedIngredient.unitPrice)}
                     </span>
                   </div>
                   <div className="flex justify-between">
                     <span className="text-gray-600 dark:text-gray-400">Total Cost:</span>
                     <span className="font-medium text-gray-900 dark:text-white">
                       {formatCurrency(selectedIngredient.unitPrice * selectedIngredient.currentStock)}
                     </span>
                   </div>
                </div>
              </div>
            </div>

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
