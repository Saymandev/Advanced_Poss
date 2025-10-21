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
    PencilIcon,
    PlusIcon,
    TagIcon,
    TrashIcon
} from '@heroicons/react/24/outline';
import { useState } from 'react';
import toast from 'react-hot-toast';

export default function CategoriesPage() {
  const { user } = useAppSelector((state) => state.auth);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [formData, setFormData] = useState<CreateCategoryRequest & { isActive: boolean }>({
    name: '',
    description: '',
    color: '#3B82F6',
    icon: 'tag',
    isActive: true,
    sortOrder: 0,
  });

  // API calls
  const { data: categoriesData, isLoading, error } = useGetCategoriesQuery({
    branchId: user?.branchId || '',
    page: 1,
    limit: 100,
  });

  const [createCategory, { isLoading: isCreating }] = useCreateCategoryMutation();
  const [updateCategory, { isLoading: isUpdating }] = useUpdateCategoryMutation();
  const [deleteCategory, { isLoading: _isDeleting }] = useDeleteCategoryMutation();

  const categories = categoriesData?.categories || [];

  const handleCreate = async () => {
    try {
      await createCategory(formData).unwrap();
      toast.success('Category created successfully');
      setIsModalOpen(false);
      resetForm();
    } catch (error: any) {
      toast.error(error.data?.message || 'Failed to create category');
    }
  };

  const handleEdit = async () => {
    if (!selectedCategory) return;
    
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
      toast.error(error.data?.message || 'Failed to update category');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this category?')) return;
    
    try {
      await deleteCategory(id).unwrap();
      toast.success('Category deleted successfully');
    } catch (error: any) {
      toast.error(error.data?.message || 'Failed to delete category');
    }
  };

  const openEditModal = (category: Category) => {
    setSelectedCategory(category);
    setFormData({
      name: category.name,
      description: category.description || '',
      color: category.color,
      icon: category.icon || 'tag',
      isActive: category.isActive,
      sortOrder: category.sortOrder || 0,
    });
    setIsEditModalOpen(true);
  };

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
      header: 'Name',
      render: (category: Category) => (
        <div className="flex items-center gap-3">
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-medium"
            style={{ backgroundColor: category.color }}
          >
            {category.icon === 'tag' ? '🏷️' : '📁'}
          </div>
          <div>
            <p className="font-medium text-gray-900 dark:text-white">
              {category.name}
            </p>
            {category.description && (
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {category.description}
              </p>
            )}
          </div>
        </div>
      ),
    },
    {
      key: 'menuItemsCount',
      title: 'Menu Items',
      header: 'Menu Items',
      render: (category: Category) => (
        <span className="text-sm text-gray-600 dark:text-gray-400">
          {(category as any).menuItemsCount || 0}
        </span>
      ),
    },
    {
      key: 'sortOrder',
      title: 'Sort Order',
      header: 'Sort Order',
      render: (category: Category) => (
        <span className="text-sm text-gray-600 dark:text-gray-400">
          {category.sortOrder || 0}
        </span>
      ),
    },
    {
      key: 'isActive',
      title: 'Status',
      header: 'Status',
      render: (category: Category) => getStatusBadge(category.isActive),
    },
    {
      key: 'actions',
      title: 'Actions',
      header: 'Actions',
      render: (category: Category) => (
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => openEditModal(category)}
          >
            <PencilIcon className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleDelete(category.id)}
            className="text-red-600 hover:text-red-700"
          >
            <TrashIcon className="w-4 h-4" />
          </Button>
        </div>
      ),
    },
  ];

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="text-red-600 mb-4">Failed to load categories</p>
          <Button onClick={() => window.location.reload()}>
            Try Again
          </Button>
        </div>
      </div>
    );
  }

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
                  {isLoading ? '...' : categories.length}
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
                  {isLoading ? '...' : categories.filter(c => c.isActive).length}
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
                  {isLoading ? '...' : categories.reduce((sum, c) => sum + ((c as any).menuItemsCount || 0), 0)}
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
                  {isLoading ? '...' : categories.filter(c => !c.isActive).length}
                </p>
              </div>
              <TagIcon className="w-8 h-8 text-gray-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Categories Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Categories</CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable
            data={categories}
            columns={columns}
            loading={isLoading}
            searchable={true}
            searchPlaceholder="Search categories..."
          />
        </CardContent>
      </Card>

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
