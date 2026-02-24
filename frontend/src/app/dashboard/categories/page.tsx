'use client';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Combobox } from '@/components/ui/Combobox';
import { DataTable } from '@/components/ui/DataTable';
import { ImportButton } from '@/components/ui/ImportButton';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { useFeatureRedirect } from '@/hooks/useFeatureRedirect';
import {
    Category,
    CreateCategoryRequest,
    useCreateCategoryMutation,
    useDeleteCategoryMutation,
    useGetCategoriesQuery,
    useToggleCategoryStatusMutation,
    useUpdateCategoryMutation
} from '@/lib/api/endpoints/categoriesApi';
import { CATEGORY_TYPE_OPTIONS, DEFAULT_CATEGORY_TYPE } from '@/lib/constants/category-types.constant';
import { useAppSelector } from '@/lib/store';
import {
    EyeIcon,
    PencilIcon,
    PlusIcon,
    TagIcon,
    TrashIcon
} from '@heroicons/react/24/outline';
import { useCallback, useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
export default function CategoriesPage() {
  const [mounted, setMounted] = useState(false);
  const { user, companyContext } = useAppSelector((state) => state.auth);
  // Redirect if user doesn't have categories feature (auto-redirects to role-specific dashboard)
  useFeatureRedirect('categories');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState<Category | null>(null);
  const [formData, setFormData] = useState<CreateCategoryRequest & { isActive: boolean; type?: string }>({
    name: '',
    description: '',
    color: '#3B82F6',
    icon: 'tag',
    type: DEFAULT_CATEGORY_TYPE,
    isActive: true,
    sortOrder: 0,
  });
  useEffect(() => {
    setMounted(true);
  }, []);
  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);
  const companyId = useMemo(() => {
    if (!mounted) return undefined;
    return (user as any)?.companyId || 
           (companyContext as any)?.companyId ||
           (companyContext as any)?._id ||
           (companyContext as any)?.id;
  }, [user, companyContext, mounted]);
  const branchId = useMemo(() => {
    if (!mounted) return undefined;
    return (user as any)?.branchId || 
           (companyContext as any)?.branchId || 
           (companyContext as any)?.branches?.[0]?._id ||
           (companyContext as any)?.branches?.[0]?.id;
  }, [user, companyContext, mounted]);
  // API calls
  const { 
    data: categoriesResponse, 
    isLoading, 
    error, 
    refetch,
    isFetching 
  } = useGetCategoriesQuery({
    branchId,
    companyId,
  }, { 
    skip: !branchId && !companyId,
    refetchOnMountOrArgChange: true,
  });
  const [createCategory, { isLoading: isCreating }] = useCreateCategoryMutation();
  const [updateCategory, { isLoading: isUpdating }] = useUpdateCategoryMutation();
  const [deleteCategory, { isLoading: isDeleting }] = useDeleteCategoryMutation();
  const [toggleCategoryStatus] = useToggleCategoryStatusMutation();
  // Extract categories from API response (already transformed by API)
  const categories = useMemo(() => {
    if (!categoriesResponse) return [];
    // Handle different response structures
    const cats = categoriesResponse.categories || [];
    // Ensure all required fields are present
    return cats.map((cat: any) => ({
      ...cat,
      id: cat.id || cat._id,
      isActive: cat.isActive !== undefined ? cat.isActive : true,
      sortOrder: cat.sortOrder || 0,
      type: cat.type || DEFAULT_CATEGORY_TYPE,
      color: cat.color || '#3B82F6',
      icon: cat.icon || 'tag',
    }));
  }, [categoriesResponse]);
  // Get unique category types from existing categories for suggestions
  const existingCategoryTypes = useMemo(() => {
    const types = new Set<string>();
    categories.forEach((cat) => {
      if (cat.type) {
        types.add(cat.type);
      }
    });
    return Array.from(types).map((type) => ({
      value: type,
      label: type.charAt(0).toUpperCase() + type.slice(1).replace(/-/g, ' '),
    }));
  }, [categories]);
  // Combine predefined types with existing types from database
  const categoryTypeOptions = useMemo(() => {
    if (!CATEGORY_TYPE_OPTIONS || CATEGORY_TYPE_OPTIONS.length === 0) {
      // Fallback if constants aren't loaded
      return [
        { value: 'food', label: 'Food' },
        { value: 'beverage', label: 'Beverage' },
        { value: 'dessert', label: 'Dessert' },
        { value: 'special', label: 'Special' },
      ];
    }
    const predefinedMap = new Map(CATEGORY_TYPE_OPTIONS.map(opt => [opt.value, opt]));
    const combined = [...CATEGORY_TYPE_OPTIONS];
    // Add existing types that aren't in predefined list
    existingCategoryTypes.forEach((type) => {
      if (!predefinedMap.has(type.value)) {
        combined.push(type);
      }
    });
    return combined;
  }, [existingCategoryTypes]);
  // Filter categories
  const filteredCategories = useMemo(() => {
    // Create a copy of the array to avoid mutating read-only array
    let filtered = [...categories];
    // Search filter (using debounced query)
    if (debouncedSearchQuery) {
      filtered = filtered.filter(cat =>
        cat.name.toLowerCase().includes(debouncedSearchQuery.toLowerCase()) ||
        cat.description?.toLowerCase().includes(debouncedSearchQuery.toLowerCase())
      );
    }
    // Status filter
    if (statusFilter === 'active') {
      filtered = filtered.filter(cat => cat.isActive);
    } else if (statusFilter === 'inactive') {
      filtered = filtered.filter(cat => !cat.isActive);
    }
    // Sort by sortOrder (now safe since we have a copy)
    return filtered.sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
  }, [categories, debouncedSearchQuery, statusFilter]);
  const validateForm = useCallback((): boolean => {
    const errors: Record<string, string> = {};
    // Name validation
    if (!formData.name.trim()) {
      errors.name = 'Category name is required';
    } else if (formData.name.trim().length < 2) {
      errors.name = 'Category name must be at least 2 characters';
    } else if (formData.name.trim().length > 50) {
      errors.name = 'Category name must be less than 50 characters';
    }
    // Type validation - just check it's not empty (allow custom types)
    if (!formData.type || !formData.type.trim()) {
      errors.type = 'Category type is required';
    } else if (formData.type.trim().length > 50) {
      errors.type = 'Category type must be less than 50 characters';
    }
    // Description validation
    if (formData.description && formData.description.length > 200) {
      errors.description = 'Description must be less than 200 characters';
    }
    // Color validation
    if (formData.color && !/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(formData.color)) {
      errors.color = 'Invalid color format';
    }
    // Sort order validation
    if (formData.sortOrder !== undefined && formData.sortOrder !== null) {
      if (formData.sortOrder < 0) {
        errors.sortOrder = 'Sort order must be 0 or greater';
      } else if (formData.sortOrder > 9999) {
        errors.sortOrder = 'Sort order must be less than 10000';
      }
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  }, [formData]);
  const handleCreate = async () => {
    if (!validateForm()) {
      return;
    }
    if (!companyId) {
      toast.error('Company ID is missing');
      return;
    }
    try {
      // Build payload matching backend DTO structure
      const payload: any = {
        companyId: companyId.toString(),
        name: formData.name.trim(),
        type: formData.type, // Required field - validated in validateForm
      };
      // Optional fields
      if (formData.description?.trim()) {
        payload.description = formData.description.trim();
      }
      if (formData.color) {
        payload.color = formData.color;
      }
      if (formData.icon) {
        payload.icon = formData.icon;
      }
      if (formData.sortOrder !== undefined && formData.sortOrder !== null) {
        payload.sortOrder = formData.sortOrder;
      }
      // Add branchId if available (optional)
      if (branchId) {
        payload.branchId = branchId.toString();
      }
      const result = await createCategory(payload).unwrap();
      toast.success('Category created successfully');
      setIsModalOpen(false);
      resetForm();
      // Force refetch to ensure new category appears
      setTimeout(async () => {
        await refetch();
        }, 100);
    } catch (error: any) {
      const errorMessage = error?.data?.message || 
                          error?.data?.error || 
                          error?.message || 
                          'Failed to create category';
      toast.error(errorMessage);
    }
  };
  const handleEdit = async () => {
    if (!selectedCategory) return;
    if (!validateForm()) {
      return;
    }
    try {
      // Build payload matching backend DTO structure
      // Note: isActive is not in the DTO, so we can't update it through the API
      const payload: any = {
        id: selectedCategory.id,
        name: formData.name.trim(),
        type: formData.type, // Required field - validated in validateForm
      };
      // Optional fields - only include if they have values
      if (formData.description?.trim()) {
        payload.description = formData.description.trim();
      } else {
        payload.description = undefined; // Explicitly set to undefined to clear
      }
      if (formData.color) {
        payload.color = formData.color;
      }
      if (formData.icon) {
        payload.icon = formData.icon;
      }
      if (formData.sortOrder !== undefined && formData.sortOrder !== null) {
        payload.sortOrder = formData.sortOrder;
      }
      await updateCategory(payload).unwrap();
      toast.success('Category updated successfully');
      setIsEditModalOpen(false);
      setSelectedCategory(null);
      resetForm();
      await refetch();
    } catch (error: any) {
      const errorMessage = error?.data?.message || 
                          error?.data?.error || 
                          error?.message || 
                          'Failed to update category';
      toast.error(errorMessage);
    }
  };
  const handleDeleteClick = (category: Category) => {
    setCategoryToDelete(category);
    setIsDeleteModalOpen(true);
  };
  const handleDelete = async () => {
    if (!categoryToDelete) return;
    try {
      await deleteCategory(categoryToDelete.id).unwrap();
      toast.success('Category deleted successfully');
      setIsDeleteModalOpen(false);
      setCategoryToDelete(null);
      await refetch();
    } catch (error: any) {
      const errorMessage = error?.data?.message || 
                          error?.data?.error || 
                          error?.message || 
                          'Failed to delete category';
      toast.error(errorMessage);
      // If error is about menu items, show more helpful message
      if (errorMessage.includes('menu item')) {
        toast.error(errorMessage, { duration: 6000 });
      }
    }
  };
  const openViewModal = (category: Category) => {
    setSelectedCategory(category);
    setIsViewModalOpen(true);
  };
  const openEditModal = (category: Category) => {
    setSelectedCategory(category);
    // Use category's type or default
    const categoryType = (category as any).type;
    const type = categoryType && categoryType.trim() ? categoryType.trim() : DEFAULT_CATEGORY_TYPE;
    setFormData({
      name: category.name,
      description: category.description || '',
      color: category.color || '#3B82F6',
      icon: category.icon || 'tag',
      type: type,
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
      type: DEFAULT_CATEGORY_TYPE,
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
      render: (value: boolean, row: Category) => (
        <div className="flex items-center gap-2">
          {getStatusBadge(value)}
          <Button
            variant="ghost"
            size="sm"
            onClick={async () => {
              try {
                await toggleCategoryStatus(row.id).unwrap();
                toast.success(`Category ${value ? 'deactivated' : 'activated'} successfully`);
                await refetch();
              } catch (error: any) {
                toast.error(error?.data?.message || 'Failed to toggle category status');
              }
            }}
            title={value ? 'Deactivate' : 'Activate'}
            className="text-xs"
          >
            {value ? 'Deactivate' : 'Activate'}
          </Button>
        </div>
      ),
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
            onClick={() => handleDeleteClick(row)}
            className="text-red-600 hover:text-red-700"
            title="Delete"
            disabled={isDeleting}
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
  // Prevent hydration mismatch by not rendering until client-side mounted
  if (!mounted) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Categories
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Manage menu categories and organization
            </p>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/4"></div>
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/3"></div>
          </div>
        </div>
      </div>
    );
  }
  return (
    <div className="space-y-6" suppressHydrationWarning>
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Categories
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Manage menu categories and organization
          </p>
        </div>
        <div className="flex items-center gap-2">
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
                    type: item.type || item.Type || DEFAULT_CATEGORY_TYPE,
                    isActive: item.isActive !== false && item.Status !== 'Inactive',
                  };
                  if (branchId) {
                    payload.branchId = branchId.toString();
                  }
                  await createCategory(payload).unwrap();
                  successCount++;
                } catch (error: any) {
                  console.error('Failed to import category:', item, error);
                  errorCount++;
                }
              }
              if (successCount > 0) {
                toast.success(`Successfully imported ${successCount} categories`);
                await refetch();
              }
              if (errorCount > 0) {
                toast.error(`Failed to import ${errorCount} categories`);
              }
            }}
            columns={[
              { key: 'name', label: 'Name', required: true, type: 'string' },
              { key: 'type', label: 'Type', required: true, type: 'string' },
              { key: 'description', label: 'Description', type: 'string' },
              { key: 'isActive', label: 'Status', type: 'boolean' },
            ]}
            filename="categories-import-template"
            variant="secondary"
          />
          <Button onClick={() => setIsModalOpen(true)}>
            <PlusIcon className="w-5 h-5 mr-2" />
            Add Category
          </Button>
        </div>
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
      <Card>
        <CardHeader>
          <CardTitle>All Categories ({filteredCategories.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading || isFetching ? (
            <div className="text-center py-12">
              <div className="animate-pulse space-y-4">
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mx-auto"></div>
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2 mx-auto"></div>
              </div>
              <p className="text-gray-500 dark:text-gray-400 mt-4">Loading categories...</p>
            </div>
          ) : error ? (
            <div className="text-center py-12">
              <p className="text-red-600 dark:text-red-400 mb-4">
                {String(typeof error === 'object' && error !== null && 'data' in error 
                  ? (error.data as any)?.message || 'Error loading categories'
                  : 'Error loading categories')}
              </p>
              <Button onClick={() => refetch()} variant="secondary">
                Try Again
              </Button>
            </div>
          ) : filteredCategories.length === 0 ? (
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
              loading={isLoading || isFetching}
              searchable={false}
              emptyMessage="No categories found."
            />
          )}
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
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Type *
            </label>
            <Combobox
              value={formData.type || DEFAULT_CATEGORY_TYPE}
              onChange={(value: string) => setFormData({ ...formData, type: value.trim() })}
              options={categoryTypeOptions}
              placeholder="Select a type or enter custom type..."
              allowCustom={true}
              error={formErrors.type}
            />
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
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Type *
            </label>
            <Combobox
              value={formData.type || DEFAULT_CATEGORY_TYPE}
              onChange={(value: string) => setFormData({ ...formData, type: value.trim() })}
              options={categoryTypeOptions}
              placeholder="Select a type or enter custom type..."
              allowCustom={true}
              error={formErrors.type}
            />
          </div>
          {selectedCategory && (
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
              <p className="text-sm text-blue-800 dark:text-blue-200">
                <strong>Status:</strong> {selectedCategory.isActive ? 'Active' : 'Inactive'}
                <span className="block text-xs mt-1 text-blue-600 dark:text-blue-300">
                  Note: Status cannot be changed through the API at this time.
                </span>
              </p>
            </div>
          )}
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
      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setCategoryToDelete(null);
        }}
        title="Delete Category"
      >
        {categoryToDelete && (
          <div className="space-y-4">
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
              <p className="text-red-800 dark:text-red-200 font-medium">
                Are you sure you want to delete this category?
              </p>
              <p className="text-sm text-red-600 dark:text-red-300 mt-2">
                This action cannot be undone. If this category has menu items, you'll need to remove or reassign them first.
              </p>
            </div>
            <div className="space-y-2">
              <p className="font-medium text-gray-900 dark:text-white">
                Category: <span className="text-gray-600 dark:text-gray-400">{categoryToDelete.name}</span>
              </p>
              {(categoryToDelete as any).menuItemsCount > 0 && (
                <p className="text-sm text-amber-600 dark:text-amber-400">
                  ⚠️ This category has {(categoryToDelete as any).menuItemsCount} menu item(s).
                </p>
              )}
            </div>
            <div className="flex justify-end gap-3 pt-4">
              <Button
                variant="ghost"
                onClick={() => {
                  setIsDeleteModalOpen(false);
                  setCategoryToDelete(null);
                }}
                disabled={isDeleting}
              >
                Cancel
              </Button>
              <Button
                onClick={handleDelete}
                disabled={isDeleting}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                {isDeleting ? 'Deleting...' : 'Delete Category'}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
