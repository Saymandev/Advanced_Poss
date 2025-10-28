'use client';

import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { DataTable } from '@/components/ui/DataTable';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import {
  Category,
  CreateCategoryRequest,
  useCreateCategoryMutation,
  useDeleteCategoryMutation,
  useGetCategoriesQuery,
  useUpdateCategoryMutation
} from '@/lib/api/endpoints/categoriesApi';
import { useAppSelector } from '@/lib/store';
import {
  EyeIcon,
  PencilIcon,
  PlusIcon,
  TagIcon,
  TrashIcon
} from '@heroicons/react/24/outline';
import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';

export default function CategoriesPage() {
  const { user, companyContext } = useAppSelector((state) => state.auth);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [formData, setFormData] = useState<CreateCategoryRequest & { isActive: boolean }>({
    name: '',
    description: '',
    color: '#3B82F6',
    icon: 'tag',
    isActive: true,
    sortOrder: 0,
  });

  const branchId = (user as any)?.branchId || 
                   (companyContext as any)?.branchId || 
                   (companyContext as any)?.branches?.[0]?._id ||
                   (companyContext as any)?.branches?.[0]?.id;

  // API calls
  const { data: categoriesResponse, isLoading, error, refetch } = useGetCategoriesQuery({
    branchId,
    page: 1,
    limit: 100,
  }, { skip: !branchId });

  const [createCategory, { isLoading: isCreating }] = useCreateCategoryMutation();
  const [updateCategory, { isLoading: isUpdating }] = useUpdateCategoryMutation();
  const [deleteCategory] = useDeleteCategoryMutation();

  // Extract categories from API response
  const categories = useMemo(() => {
    if (!categoriesResponse) return [];
    
    const response = categoriesResponse as any;
    let items = [];
    
    if (response.data) {
      items = response.data.categories || response.data.items || [];
    } else if (Array.isArray(response)) {
      items = response;
    } else {
      items = response.categories || response.items || [];
    }
    
    if (!Array.isArray(items)) return [];
    
    return items.map((cat: any) => ({
      id: cat._id || cat.id,
      name: cat.name,
      description: cat.description,
      icon: cat.icon || 'tag',
      color: cat.color || '#3B82F6',
      sortOrder: cat.sortOrder || 0,
      isActive: cat.isActive !== undefined ? cat.isActive : true,
      companyId: cat.companyId || cat.company?.id || cat.company?._id,
      branchId: cat.branchId || cat.branch?.id || cat.branch?._id,
      createdAt: cat.createdAt || new Date().toISOString(),
      updatedAt: cat.updatedAt || new Date().toISOString(),
      menuItemsCount: cat.menuItemsCount || cat.itemsCount || 0,
    }));
  }, [categoriesResponse]);

  // Filter categories
  const filteredCategories = useMemo(() => {
    let filtered = categories;

    // Search filter
    if (searchQuery) {
      filtered = filtered.filter(cat =>
        cat.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        cat.description?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Status filter
    if (statusFilter === 'active') {
      filtered = filtered.filter(cat => cat.isActive);
    } else if (statusFilter === 'inactive') {
      filtered = filtered.filter(cat => !cat.isActive);
    }

    // Sort by sortOrder
    return filtered.sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
  }, [categories, searchQuery, statusFilter]);

  const handleCreate = async () => {
    if (!formData.name.trim()) {
      toast.error('Category name is required');
      return;
    }

    try {
      const payload = {
        ...formData,
        branchId,
      } as any;
      await createCategory(payload).unwrap();
      toast.success('Category created successfully');
      setIsModalOpen(false);
      resetForm();
    } catch (error: any) {
      toast.error(error?.data?.message || error?.message || 'Failed to create category');
    }
  };

  const handleEdit = async () => {
    if (!selectedCategory) return;
    if (!formData.name.trim()) {
      toast.error('Category name is required');
      return;
    }
    
    try {
      await updateCategory({
        id: selectedCategory.id,
        ...formData,
      }).unwrap();
      toast.success('Category updated successfully');
      setIsEditModalOpen(false);
      setSelectedCategory(null);
      resetForm();
    } catch (error: any) {
      toast.error(error?.data?.message || error?.message || 'Failed to update category');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this category? This action cannot be undone.')) return;
    
    try {
      await deleteCategory(id).unwrap();
      toast.success('Category deleted successfully');
    } catch (error: any) {
      toast.error(error?.data?.message || error?.message || 'Failed to delete category');
    }
  };

  const openViewModal = (category: Category) => {
    setSelectedCategory(category);
    setIsViewModalOpen(true);
  };

  const openEditModal = (category: Category) => {
    setSelectedCategory(category);
    setFormData({
      name: category.name,
      description: category.description || '',
      color: category.color || '#3B82F6',
      icon: category.icon || 'tag',
      isActive: category.isActive,
      sortOrder: category.sortOrder || 0,
    });
    setIsEditModalOpen(true);
  };

  useEffect(() => {
    if (!isModalOpen && !isEditModalOpen) {
      resetForm();
    }
  }, [isModalOpen, isEditModalOpen]);

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      color: '#3B82F6',
      icon: 'tag',
      isActive: true,
      sortOrder: 0,
    });
  };

  const getStatusBadge = (isActive: boolean) => (
    <Badge variant={isActive ? 'success' : 'secondary'}>
      {isActive ? 'Active' : 'Inactive'}
    </Badge>
  );

  const columns = [
    {
      key: 'name',
      title: 'Name',
      sortable: true,
      render: (value: string, row: Category) => (
        <div className="flex items-center gap-3">
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-medium"
            style={{ backgroundColor: row.color }}
          >
            {row.icon === 'tag' ? '🏷️' : '📁'}
          </div>
          <div>
            <p className="font-medium text-gray-900 dark:text-white">
              {row.name}
            </p>
            {row.description && (
              <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-1">
                {row.description}
              </p>
            )}
          </div>
        </div>
      ),
    },
    {
      key: 'menuItemsCount',
      title: 'Menu Items',
      render: (value: number, row: Category) => (
        <Badge variant="secondary">
          {(row as any).menuItemsCount || 0}
        </Badge>
      ),
    },
    {
      key: 'sortOrder',
      title: 'Sort Order',
      sortable: true,
      render: (value: number) => (
        <span className="text-sm text-gray-600 dark:text-gray-400">
          {value || 0}
        </span>
      ),
    },
    {
      key: 'isActive',
      title: 'Status',
      render: (value: boolean) => getStatusBadge(value),
    },
    {
      key: 'actions',
      title: 'Actions',
      render: (value: any, row: Category) => (
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
            onClick={() => openEditModal(row)}
            title="Edit"
          >
            <PencilIcon className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleDelete(row.id)}
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
      total: categories.length,
      active: categories.filter(c => c.isActive).length,
      inactive: categories.filter(c => !c.isActive).length,
      totalMenuItems: categories.reduce((sum, c) => sum + ((c as any).menuItemsCount || 0), 0),
    };
  }, [categories]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Categories
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Manage menu categories and organization
          </p>
        </div>
        <Button onClick={() => setIsModalOpen(true)}>
          <PlusIcon className="w-5 h-5 mr-2" />
          Add Category
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Total Categories</p>
                <p className="text-3xl font-bold text-blue-600">
                  {isLoading ? '...' : stats.total}
                </p>
              </div>
              <TagIcon className="w-8 h-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Active Categories</p>
                <p className="text-3xl font-bold text-green-600">
                  {isLoading ? '...' : stats.active}
                </p>
              </div>
              <TagIcon className="w-8 h-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Total Menu Items</p>
                <p className="text-3xl font-bold text-purple-600">
                  {isLoading ? '...' : stats.totalMenuItems}
                </p>
              </div>
              <TagIcon className="w-8 h-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Inactive Categories</p>
                <p className="text-3xl font-bold text-gray-600">
                  {isLoading ? '...' : stats.inactive}
                </p>
              </div>
              <TagIcon className="w-8 h-8 text-gray-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Input
              placeholder="Search categories..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full"
            />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="px-3 py-2 border border-gray-300 rounded-lg dark:border-gray-600 dark:bg-gray-800 dark:text-white"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
            <Button
              variant="secondary"
              onClick={() => {
                setSearchQuery('');
                setStatusFilter('all');
              }}
            >
              Clear Filters
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Categories Table */}
      {isLoading ? (
        <Card>
          <CardContent className="p-6">
            <div className="text-center py-12">
              <p className="text-gray-500 dark:text-gray-400">Loading categories...</p>
            </div>
          </CardContent>
        </Card>
      ) : error ? (
        <Card>
          <CardContent className="p-6">
            <div className="text-center py-12">
              <p className="text-red-600 mb-4">Error loading categories</p>
              <Button onClick={() => refetch()}>Try Again</Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>All Categories ({filteredCategories.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {filteredCategories.length === 0 ? (
              <div className="text-center py-12">
                <TagIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500 dark:text-gray-400">
                  {searchQuery || statusFilter !== 'all' 
                    ? 'No categories match your filters' 
                    : 'No categories found. Create your first category!'}
                </p>
              </div>
            ) : (
              <DataTable
                data={filteredCategories}
                columns={columns}
                loading={isLoading}
                searchable={false}
                emptyMessage="No categories found."
              />
            )}
          </CardContent>
        </Card>
      )}

      {/* Create Category Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          resetForm();
        }}
        title="Create New Category"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Category Name *
            </label>
            <Input
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Enter category name"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Description
            </label>
            <Input
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Enter category description"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Color
              </label>
              <Input
                type="color"
                value={formData.color}
                onChange={(e) => setFormData({ ...formData, color: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Sort Order
              </label>
              <Input
                type="number"
                value={formData.sortOrder}
                onChange={(e) => setFormData({ ...formData, sortOrder: parseInt(e.target.value) || 0 })}
                placeholder="0"
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="isActive"
              checked={formData.isActive}
              onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <label htmlFor="isActive" className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Active
            </label>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button
              variant="ghost"
              onClick={() => {
                setIsModalOpen(false);
                resetForm();
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreate}
              disabled={isCreating || !formData.name}
            >
              {isCreating ? 'Creating...' : 'Create Category'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* View Category Modal */}
      <Modal
        isOpen={isViewModalOpen}
        onClose={() => {
          setIsViewModalOpen(false);
          setSelectedCategory(null);
        }}
        title="Category Details"
      >
        {selectedCategory && (
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <div
                className="w-16 h-16 rounded-full flex items-center justify-center text-white text-2xl font-medium"
                style={{ backgroundColor: selectedCategory.color }}
              >
                {selectedCategory.icon === 'tag' ? '🏷️' : '📁'}
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                  {selectedCategory.name}
                </h3>
                {getStatusBadge(selectedCategory.isActive)}
              </div>
            </div>

            <div className="space-y-3 pt-4 border-t border-gray-200 dark:border-gray-700">
              {selectedCategory.description && (
                <div>
                  <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
                    Description
                  </label>
                  <p className="text-gray-900 dark:text-white">{selectedCategory.description}</p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
                    Color
                  </label>
                  <div className="flex items-center gap-2">
                    <div
                      className="w-8 h-8 rounded"
                      style={{ backgroundColor: selectedCategory.color }}
                    />
                    <span className="text-gray-900 dark:text-white">{selectedCategory.color}</span>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
                    Sort Order
                  </label>
                  <p className="text-gray-900 dark:text-white">{selectedCategory.sortOrder || 0}</p>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
                  Menu Items Count
                </label>
                <Badge variant="secondary" className="text-lg">
                  {(selectedCategory as any).menuItemsCount || 0} items
                </Badge>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                <div>
                  <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
                    Created At
                  </label>
                  <p className="text-sm text-gray-900 dark:text-white">
                    {selectedCategory.createdAt ? new Date(selectedCategory.createdAt).toLocaleDateString() : 'N/A'}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
                    Updated At
                  </label>
                  <p className="text-sm text-gray-900 dark:text-white">
                    {selectedCategory.updatedAt ? new Date(selectedCategory.updatedAt).toLocaleDateString() : 'N/A'}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
              <Button
                variant="secondary"
                onClick={() => {
                  setIsViewModalOpen(false);
                  setSelectedCategory(null);
                }}
              >
                Close
              </Button>
              <Button
                onClick={() => {
                  setIsViewModalOpen(false);
                  openEditModal(selectedCategory);
                }}
              >
                Edit Category
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Edit Category Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setSelectedCategory(null);
          resetForm();
        }}
        title="Edit Category"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Category Name *
            </label>
            <Input
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Enter category name"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Description
            </label>
            <Input
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Enter category description"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Color
              </label>
              <Input
                type="color"
                value={formData.color}
                onChange={(e) => setFormData({ ...formData, color: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Sort Order
              </label>
              <Input
                type="number"
                value={formData.sortOrder}
                onChange={(e) => setFormData({ ...formData, sortOrder: parseInt(e.target.value) || 0 })}
                placeholder="0"
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="isActiveEdit"
              checked={formData.isActive}
              onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <label htmlFor="isActiveEdit" className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Active
            </label>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button
              variant="ghost"
              onClick={() => {
                setIsEditModalOpen(false);
                setSelectedCategory(null);
                resetForm();
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleEdit}
              disabled={isUpdating || !formData.name}
            >
              {isUpdating ? 'Updating...' : 'Update Category'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
