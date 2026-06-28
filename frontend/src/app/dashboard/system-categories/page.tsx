'use client';

import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { DataTable } from '@/components/ui/DataTable';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Select } from '@/components/ui/Select';
import {
  BusinessCategory,
  CreateBusinessCategoryRequest,
  useCreateBusinessCategoryMutation,
  useDeleteBusinessCategoryMutation,
  useGetBusinessCategoriesQuery,
  useUpdateBusinessCategoryMutation,
} from '@/lib/api/endpoints/businessCategoriesApi';
import { UserRole } from '@/lib/enums/user-role.enum';
import { useAppSelector } from '@/lib/store';
import { formatDateTime } from '@/lib/utils';
import {
  PencilIcon,
  PlusIcon,
  TagIcon,
  TrashIcon,
} from '@heroicons/react/24/outline';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';

export default function SystemCategoriesPage() {
  const { user } = useAppSelector((state) => state.auth);
  const router = useRouter();

  useEffect(() => {
    if (!user || user.role !== UserRole.SUPER_ADMIN) {
      router.replace('/dashboard/super-admin');
    }
  }, [user, router]);

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<BusinessCategory | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const { data: categoriesData, isLoading, refetch } = useGetBusinessCategoriesQuery();
  const [createCategory, { isLoading: isCreating }] = useCreateBusinessCategoryMutation();
  const [updateCategory, { isLoading: isUpdating }] = useUpdateBusinessCategoryMutation();
  const [deleteCategory, { isLoading: isDeleting }] = useDeleteBusinessCategoryMutation();

  const categories = useMemo(() => {
    if (!categoriesData) return [];
    if (Array.isArray(categoriesData)) return categoriesData;
    return [];
  }, [categoriesData]);

  const [formData, setFormData] = useState<Partial<CreateBusinessCategoryRequest>>({
    name: '',
    code: '',
    businessType: 'restaurant',
    isActive: true,
  });

  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const filteredCategories = useMemo(() => {
    let filtered = categories;

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (category: BusinessCategory) =>
          category.name.toLowerCase().includes(query) ||
          category.code.toLowerCase().includes(query)
      );
    }

    if (typeFilter !== 'all') {
      filtered = filtered.filter(
        (category: BusinessCategory) => category.businessType === typeFilter
      );
    }

    return filtered;
  }, [categories, searchQuery, typeFilter]);

  const totalCategories = filteredCategories.length;
  const paginatedCategories = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredCategories.slice(start, start + itemsPerPage);
  }, [filteredCategories, currentPage, itemsPerPage]);

  const resetForm = () => {
    setFormData({
      name: '',
      code: '',
      businessType: 'restaurant',
      isActive: true,
    });
    setFormErrors({});
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};
    if (!formData.name?.trim()) errors.name = 'Name is required';
    if (!formData.code?.trim()) errors.code = 'Code is required';
    if (!formData.businessType) errors.businessType = 'Business Type is required';

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleCreate = async () => {
    if (!validateForm()) {
      toast.error('Please fix the form errors');
      return;
    }

    try {
      await createCategory(formData as CreateBusinessCategoryRequest).unwrap();
      toast.success('Category created successfully');
      setIsCreateModalOpen(false);
      resetForm();
    } catch (error: any) {
      toast.error(error?.data?.message || 'Failed to create category');
    }
  };

  const handleEdit = async () => {
    if (!selectedCategory || !validateForm()) {
      toast.error('Please fix the form errors');
      return;
    }

    try {
      await updateCategory({
        id: selectedCategory.id,
        data: formData,
      }).unwrap();
      toast.success('Category updated successfully');
      setIsEditModalOpen(false);
      setSelectedCategory(null);
      resetForm();
    } catch (error: any) {
      toast.error(error?.data?.message || 'Failed to update category');
    }
  };

  const handleDelete = async (category: BusinessCategory) => {
    if (!confirm(`Are you sure you want to delete "${category.name}"?`)) {
      return;
    }

    try {
      await deleteCategory(category.id).unwrap();
      toast.success('Category deleted successfully');
    } catch (error: any) {
      toast.error(error?.data?.message || 'Failed to delete category');
    }
  };

  const openEditModal = (category: BusinessCategory) => {
    setSelectedCategory(category);
    setFormData({
      name: category.name,
      code: category.code,
      businessType: category.businessType,
      isActive: category.isActive,
    });
    setIsEditModalOpen(true);
  };

  const columns: { key: keyof BusinessCategory | string; title: string; render: (value: any, row: BusinessCategory) => React.ReactNode }[] = [
    {
      key: 'name',
      title: 'Name',
      render: (_value, category: BusinessCategory) => (
        <span className="font-medium text-gray-900 dark:text-white">{category.name}</span>
      ),
    },
    {
      key: 'code',
      title: 'Code',
      render: (_value, category: BusinessCategory) => (
        <span className="text-gray-500">{category.code}</span>
      ),
    },
    {
      key: 'businessType',
      title: 'Business Type',
      render: (_value, category: BusinessCategory) => (
        <Badge variant={category.businessType === 'restaurant' ? 'success' : 'info'} className="capitalize">
          {category.businessType}
        </Badge>
      ),
    },
    {
      key: 'isActive',
      title: 'Status',
      render: (_value, category: BusinessCategory) => (
        <Badge variant={category.isActive ? 'success' : 'danger'}>
          {category.isActive ? 'Active' : 'Inactive'}
        </Badge>
      ),
    },
    {
      key: 'createdAt',
      title: 'Created',
      render: (_value, category: BusinessCategory) => (
        <span className="text-sm text-gray-500">
          {category.createdAt ? formatDateTime(category.createdAt) : 'N/A'}
        </span>
      ),
    },
    {
      key: 'actions',
      title: 'Actions',
      render: (_value, category: BusinessCategory) => (
        <div className="flex items-center gap-2">
          <button
            onClick={() => openEditModal(category)}
            className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
            title="Edit"
          >
            <PencilIcon className="w-5 h-5" />
          </button>
          <button
            onClick={() => handleDelete(category)}
            className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
            title="Delete"
          >
            <TrashIcon className="w-5 h-5" />
          </button>
        </div>
      ),
    },
  ];

  if (!user || user.role !== UserRole.SUPER_ADMIN) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
            <TagIcon className="w-8 h-8 text-purple-600" />
            System Categories
          </h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            Manage global business categories for registration
          </p>
        </div>
        <Button
          onClick={() => setIsCreateModalOpen(true)}
          className="flex items-center gap-2"
        >
          <PlusIcon className="w-5 h-5" />
          Add Category
        </Button>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Input
              placeholder="Search categories..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full"
            />
            <Select
              value={typeFilter}
              onChange={(value) => {
                setTypeFilter(value);
                setCurrentPage(1);
              }}
              options={[
                { value: 'all', label: 'All Business Types' },
                { value: 'restaurant', label: 'Hospitality (Restaurant)' },
                { value: 'retail', label: 'Retail' },
              ]}
            />
            <div className="flex items-center justify-end">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {totalCategories} {totalCategories === 1 ? 'category' : 'categories'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <DataTable
        data={paginatedCategories}
        columns={columns}
        loading={isLoading}
        searchable={false}
        selectable={false}
        pagination={{
          currentPage,
          totalPages: Math.max(1, Math.ceil(totalCategories / itemsPerPage)),
          itemsPerPage,
          totalItems: totalCategories,
          onPageChange: setCurrentPage,
          onItemsPerPageChange: setItemsPerPage,
        }}
        emptyMessage="No system categories found. Create one to get started."
      />

      <Modal
        isOpen={isCreateModalOpen || isEditModalOpen}
        onClose={() => {
          setIsCreateModalOpen(false);
          setIsEditModalOpen(false);
          resetForm();
          setSelectedCategory(null);
        }}
        title={isEditModalOpen ? 'Edit Category' : 'Create Category'}
        className="max-w-md"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Name *</label>
            <Input
              value={formData.name || ''}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g. Food Truck"
              error={formErrors.name}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Code *</label>
            <Input
              value={formData.code || ''}
              onChange={(e) => setFormData({ ...formData, code: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '') })}
              placeholder="e.g. food_truck"
              error={formErrors.code}
            />
            <p className="text-xs text-gray-500 mt-1">Unique identifier (lowercase, alphanumeric, underscores)</p>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Business Type *</label>
            <Select
              value={formData.businessType || 'restaurant'}
              onChange={(value) => setFormData({ ...formData, businessType: value })}
              options={[
                { value: 'restaurant', label: 'Hospitality (Restaurant)' },
                { value: 'retail', label: 'Retail' },
              ]}
            />
            {formErrors.businessType && (
              <p className="text-sm text-red-500 mt-1">{formErrors.businessType}</p>
            )}
          </div>

          <div className="flex items-center gap-2 pt-2">
            <input
              type="checkbox"
              id="isActive"
              checked={formData.isActive}
              onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
              className="w-4 h-4 text-purple-600 rounded border-gray-300 focus:ring-purple-500"
            />
            <label htmlFor="isActive" className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Active (Visible on registration)
            </label>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t mt-6">
            <Button
              variant="secondary"
              onClick={() => {
                setIsCreateModalOpen(false);
                setIsEditModalOpen(false);
                resetForm();
                setSelectedCategory(null);
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={isEditModalOpen ? handleEdit : handleCreate}
              isLoading={isCreating || isUpdating}
            >
              {isEditModalOpen ? 'Save Changes' : 'Create Category'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
