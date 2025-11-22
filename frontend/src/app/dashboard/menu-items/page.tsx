'use client';

import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { DataTable } from '@/components/ui/DataTable';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Select } from '@/components/ui/Select';
import { useGetCategoriesQuery } from '@/lib/api/endpoints/categoriesApi';
import { useGetInventoryItemsQuery } from '@/lib/api/endpoints/inventoryApi';
import { useCreateMenuItemMutation, useDeleteMenuItemMutation, useGetMenuItemsQuery, useToggleAvailabilityMutation, useUpdateMenuItemMutation } from '@/lib/api/endpoints/menuItemsApi';
import { useAppSelector } from '@/lib/store';
import { formatCurrency, formatDateTime } from '@/lib/utils';
import {
  ClockIcon,
  EyeIcon,
  PencilIcon,
  PlusIcon,
  ShoppingBagIcon,
  TrashIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';
import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';

interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  categoryId?: string;
  subcategory?: string;
  imageUrl?: string;
  isAvailable: boolean;
  preparationTime?: number; // in minutes
  ingredients?: string[];
  allergens?: string[];
  nutritionalInfo?: {
    calories?: number;
    protein?: number;
    carbs?: number;
    fat?: number;
  };
  tags?: string[];
  popularity?: number; // 1-5 stars based on orders
  createdAt: string;
  updatedAt: string;
}



export default function MenuItemsPage() {
  const { companyContext, user } = useAppSelector((state) => state.auth);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedMenuItem, setSelectedMenuItem] = useState<MenuItem | null>(null);
  const [itemToDelete, setItemToDelete] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [committedSearch, setCommittedSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [availabilityFilter, setAvailabilityFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setCommittedSearch(searchQuery);
      setCurrentPage(1); // Reset to first page on search
    }, 500);

    return () => clearTimeout(timer);
  }, [searchQuery]);
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: 0,
    categoryId: '',
    preparationTime: 0,
    isAvailable: true,
    images: [] as string[],
    ingredients: [] as Array<{ ingredientId: string; quantity: number; unit: string }>,
    allergens: [] as string[],
    tags: [] as string[],
    nutritionalInfo: {
      calories: 0,
      protein: 0,
      carbs: 0,
      fat: 0,
    },
  });

  // Fetch real menu items from API - try multiple ways to get branchId
  const branchId = (user as any)?.branchId || 
                   (companyContext as any)?.branchId || 
                   (companyContext as any)?.branches?.[0]?._id ||
                   (companyContext as any)?.branches?.[0]?.id;
  

  // Build API query parameters
  const queryParams = useMemo(() => {
    const params: any = {
      branchId,
      page: currentPage,
      limit: itemsPerPage,
    };
    
    // Add search if provided
    if (committedSearch) {
      params.search = committedSearch;
    }
    
    // Add category filter if not 'all'
    if (categoryFilter !== 'all') {
      params.categoryId = categoryFilter;
    }
    
    // Add availability filter if not 'all'
    if (availabilityFilter !== 'all') {
      params.isAvailable = availabilityFilter === 'available';
    }
    
    return params;
  }, [branchId, currentPage, itemsPerPage, committedSearch, categoryFilter, availabilityFilter]);

  const { data: menuItemsResponse, isLoading, error, refetch } = useGetMenuItemsQuery(
    queryParams,
    { skip: !branchId }
  );
  
  // Get stats - fetch all items for accurate stats (without filters)
  const { data: statsResponse } = useGetMenuItemsQuery(
    { branchId, limit: 1000 },
    { skip: !branchId }
  );

  // Calculate stats from real API data
  const stats = useMemo(() => {
    const statsItems = (statsResponse as any)?.menuItems || [];
    const total = statsItems.length;
    const available = statsItems.filter((item: any) => item.isAvailable !== false).length;
    const unavailable = total - available;
    const avgPrepTime = total > 0 
      ? Math.round(statsItems.reduce((sum: number, item: any) => sum + (item.preparationTime || 0), 0) / total)
      : 0;
    const avgPopularity = total > 0
      ? Number((statsItems.reduce((sum: number, item: any) => sum + (item.popularity || 4.0), 0) / total).toFixed(1))
      : 0;
    
    return {
      total,
      available,
      unavailable,
      avgPrepTime,
      avgPopularity,
    };
  }, [statsResponse]);
  
  // Get companyId for query (same as categories page)
  const companyId = (user as any)?.companyId || 
                   (companyContext as any)?.companyId || 
                   (companyContext as any)?._id ||
                   (companyContext as any)?.id;
  
  // Use the same query as categories page to ensure consistency
  // This shows the same categories that appear on /dashboard/categories
  const { data: categoriesResponse, isLoading: isLoadingCategories, isFetching: isFetchingCategories } = useGetCategoriesQuery(
    { branchId, companyId },
    { skip: !branchId && !companyId, refetchOnMountOrArgChange: true }
  );
  
  // Fetch ingredients for the ingredient selector
  const { data: ingredientsResponse, isLoading: isLoadingIngredients } = useGetInventoryItemsQuery(
    { companyId, branchId, limit: 1000 },
    { skip: !companyId }
  );
  
  const availableIngredients = useMemo(() => {
    if (!ingredientsResponse) {
      console.log('📦 No ingredients response');
      return [];
    }
    
    const items = ingredientsResponse.items || [];
    console.log('📦 Available ingredients:', items.length, items);
    return items.filter((ing: any) => ing && ing.id && ing.name); // Filter out invalid entries
  }, [ingredientsResponse]);
  
  const categories = useMemo(() => {
    // useGetCategoriesQuery returns { categories: Category[], total: number }
    if (!categoriesResponse) {
      return [];
    }
    
    // Extract categories array from response (same structure as categories page)
    const cats = categoriesResponse.categories || [];
    
    return cats
      .filter((cat: any) => cat && cat.id && cat.name) // Filter out invalid entries
      .map((cat: any) => ({
        id: String(cat.id || cat._id),
        name: String(cat.name),
      }));
  }, [categoriesResponse]);
  

  const [toggleAvailability] = useToggleAvailabilityMutation();
  const [createMenuItem, { isLoading: isCreating }] = useCreateMenuItemMutation();
  const [updateMenuItem, { isLoading: isUpdating }] = useUpdateMenuItemMutation();
  const [deleteMenuItem, { isLoading: isDeleting }] = useDeleteMenuItemMutation();

  // Transform API response to local format (already transformed by API)
  const menuItems = useMemo(() => {
    if (!menuItemsResponse) return [];
    
    // Response is already transformed by API transformResponse to { menuItems: [], total, page, limit }
    const items = (menuItemsResponse as any)?.menuItems || [];
    
    if (!Array.isArray(items)) {
      console.warn('⚠️ Menu items is not an array:', items);
      return [];
    }
    
    return items.map((item: any) => {
      // Extract category name - API should provide it as a string, but handle both formats as fallback
      let categoryName = 'Uncategorized';
      if (item.category) {
        if (typeof item.category === 'string') {
          categoryName = item.category;
        } else if (item.category && typeof item.category === 'object') {
          // Fallback: if category is still an object, extract the name
          categoryName = item.category.name || item.categoryId?.name || 'Uncategorized';
        }
      }
      
      // Extract subcategory name - handle both object and string formats
      let subcategoryName = undefined;
      if (item.subcategory) {
        if (typeof item.subcategory === 'string') {
          subcategoryName = item.subcategory;
        } else if (item.subcategory && typeof item.subcategory === 'object' && item.subcategory.name) {
          subcategoryName = item.subcategory.name;
        }
      }
      
      // Extract categoryId - prefer string ID, fallback to extracting from object
      let categoryIdValue = item.categoryId;
      if (!categoryIdValue) {
        // Try to extract from category object
        if (item.category && typeof item.category === 'object' && item.category !== null) {
          categoryIdValue = item.category._id || item.category.id;
        } else if (item.categoryObject && typeof item.categoryObject === 'object' && item.categoryObject !== null) {
          categoryIdValue = item.categoryObject._id || item.categoryObject.id;
        }
      }
      // Ensure categoryId is always a string
      if (categoryIdValue && typeof categoryIdValue === 'object' && categoryIdValue !== null) {
        categoryIdValue = categoryIdValue._id || categoryIdValue.id;
      }
      categoryIdValue = categoryIdValue ? String(categoryIdValue) : '';
      
      // Handle ingredients - convert objects to display format if needed
      let ingredientsArray: any[] = [];
      if (item.ingredients && Array.isArray(item.ingredients)) {
        ingredientsArray = item.ingredients;
      }
      
      return {
        id: item.id,
        name: item.name,
        description: item.description || '',
        price: item.price,
        category: categoryName, // Always a string
        subcategory: subcategoryName,
        categoryId: categoryIdValue, // Always a string
        imageUrl: item.imageUrl,
        images: item.images || [],
        isAvailable: item.isAvailable !== false,
        preparationTime: item.preparationTime,
        ingredients: ingredientsArray,
        allergens: item.allergens || item.nutrition?.allergens || [],
        nutritionalInfo: item.nutrition || item.nutritionalInfo || {
          calories: 0,
          protein: 0,
          carbs: 0,
          fat: 0,
        },
        tags: item.tags || [],
        popularity: item.popularity || 4.0,
        createdAt: item.createdAt || new Date().toISOString(),
        updatedAt: item.updatedAt || new Date().toISOString(),
      };
    });
  }, [menuItemsResponse]);
  
  // Extract total from API response (already transformed)
  const totalItems = useMemo(() => {
    return (menuItemsResponse as any)?.total || menuItems.length;
  }, [menuItemsResponse, menuItems.length]);

  // Populate form when editing
  useEffect(() => {
    if (isEditModalOpen && selectedMenuItem) {
      const itemData = selectedMenuItem as any;
      
      // Extract categoryId - handle both string and object formats
      let categoryIdValue = itemData.categoryId || '';
      
      // Ensure categoryId is a string
      if (categoryIdValue && typeof categoryIdValue !== 'string') {
        categoryIdValue = String(categoryIdValue);
      }
      
      // If categoryId is still not available or doesn't match any category, try to find it from categories array
      if (!categoryIdValue || !categories.find((cat: any) => String(cat.id) === String(categoryIdValue))) {
        // Try to find by category name
        const matchingCategory = categories.find((cat: any) => {
          const catId = String(cat.id);
          const catName = cat.name;
          return (
            catId === String(itemData.categoryId) ||
            catName === itemData.category ||
            catId === String(itemData.category)
          );
        });
        categoryIdValue = matchingCategory ? String(matchingCategory.id) : (categories[0] ? String(categories[0].id) : '');
      }
      
      // Final fallback: ensure we have a valid categoryId
      if (!categoryIdValue && categories.length > 0 && categories[0]) {
        categoryIdValue = String(categories[0].id);
      }
      
      // Convert ingredients from objects to structured format
      let ingredientsArray: Array<{ ingredientId: string; quantity: number; unit: string }> = [];
      if (itemData.ingredients && Array.isArray(itemData.ingredients)) {
        ingredientsArray = itemData.ingredients.map((ing: any) => {
          if (ing && typeof ing === 'object') {
            // Handle object format: { ingredientId: {...} or string, quantity: number, unit: string }
            let ingredientId = '';
            if (ing.ingredientId) {
              if (typeof ing.ingredientId === 'object' && ing.ingredientId !== null) {
                // Populated ingredient object
                ingredientId = ing.ingredientId._id || ing.ingredientId.id || '';
              } else if (typeof ing.ingredientId === 'string') {
                // Already a string ID
                ingredientId = ing.ingredientId;
              }
            }
            
            // Only return if we have a valid ingredientId
            if (ingredientId) {
              return {
                ingredientId: String(ingredientId),
                quantity: Number(ing.quantity || 0),
                unit: String(ing.unit || 'pcs'),
              };
            }
          }
          // Skip invalid ingredients
          return null;
        }).filter((ing: any) => ing !== null && ing.ingredientId) as Array<{ ingredientId: string; quantity: number; unit: string }>;
      }
      
      setFormData({
        name: itemData.name || '',
        description: itemData.description || '',
        price: itemData.price || 0,
        categoryId: categoryIdValue,
        preparationTime: itemData.preparationTime || 0,
        isAvailable: itemData.isAvailable !== false,
        images: itemData.images || (itemData.imageUrl ? [itemData.imageUrl] : []),
        ingredients: ingredientsArray,
        allergens: itemData.allergens || [],
        tags: itemData.tags || [],
        nutritionalInfo: itemData.nutritionalInfo || {
          calories: 0,
          protein: 0,
          carbs: 0,
          fat: 0,
        },
      });
    }
  }, [isEditModalOpen, selectedMenuItem, categories]);

  // Reset form when modal closes
  useEffect(() => {
    if (!isCreateModalOpen && !isEditModalOpen) {
      setFormData({
        name: '',
        description: '',
        price: 0,
        categoryId: categories[0]?.id || '',
        preparationTime: 0,
        isAvailable: true,
        images: [],
        ingredients: [] as Array<{ ingredientId: string; quantity: number; unit: string }>,
        allergens: [],
        tags: [],
        nutritionalInfo: {
          calories: 0,
          protein: 0,
          carbs: 0,
          fat: 0,
        },
      });
    }
  }, [isCreateModalOpen, isEditModalOpen, categories]);

  const handleCreateMenuItem = async () => {
    if (!formData.name || !formData.price || !formData.categoryId) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      const companyId = (companyContext as any)?.companyId || (user as any)?.companyId;
      
      // Map form data to backend DTO structure
      const payload: any = {
        companyId,
        branchId,
        categoryId: formData.categoryId,
        name: formData.name,
        description: formData.description || undefined,
        price: formData.price,
        preparationTime: formData.preparationTime || undefined,
        isAvailable: formData.isAvailable !== false,
        images: formData.images.filter(Boolean).length > 0 ? formData.images.filter(Boolean) : undefined,
        tags: formData.tags.length > 0 ? formData.tags : undefined,
      };

      // Add nutrition object if any nutritional info is provided
      if (formData.nutritionalInfo && (
        formData.nutritionalInfo.calories > 0 ||
        formData.nutritionalInfo.protein > 0 ||
        formData.nutritionalInfo.carbs > 0 ||
        formData.nutritionalInfo.fat > 0
      )) {
        payload.nutrition = {
          calories: formData.nutritionalInfo.calories || undefined,
          protein: formData.nutritionalInfo.protein || undefined,
          carbs: formData.nutritionalInfo.carbs || undefined,
          fat: formData.nutritionalInfo.fat || undefined,
          allergens: formData.allergens.length > 0 ? formData.allergens : undefined,
        };
      } else if (formData.allergens.length > 0) {
        // If only allergens are provided, still include nutrition object
        payload.nutrition = {
          allergens: formData.allergens,
        };
      }

      // Handle ingredients - backend expects array of {ingredientId, quantity, unit}
      // Filter out ingredients without ingredientId
      const validIngredients = formData.ingredients.filter(ing => ing.ingredientId && ing.quantity > 0);
      if (validIngredients.length > 0) {
        payload.ingredients = validIngredients;
      } else {
        // Empty ingredients array - clear existing ingredients
        payload.ingredients = [];
      }

      await createMenuItem(payload).unwrap();
      toast.success('Menu item created successfully');
      setIsCreateModalOpen(false);
      refetch();
    } catch (error: any) {
      toast.error(error?.data?.message || 'Failed to create menu item');
    }
  };

  const handleUpdateMenuItem = async () => {
    if (!selectedMenuItem?.id || !formData.name || !formData.price) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      // Map form data to backend DTO structure
      const payload: any = {
        id: selectedMenuItem.id,
        categoryId: formData.categoryId,
        name: formData.name,
        description: formData.description || undefined,
        price: formData.price,
        preparationTime: formData.preparationTime || undefined,
        isAvailable: formData.isAvailable !== false,
        images: formData.images.filter(Boolean).length > 0 ? formData.images.filter(Boolean) : undefined,
        tags: formData.tags.length > 0 ? formData.tags : undefined,
      };

      // Add nutrition object if any nutritional info is provided
      if (formData.nutritionalInfo && (
        formData.nutritionalInfo.calories > 0 ||
        formData.nutritionalInfo.protein > 0 ||
        formData.nutritionalInfo.carbs > 0 ||
        formData.nutritionalInfo.fat > 0
      )) {
        payload.nutrition = {
          calories: formData.nutritionalInfo.calories || undefined,
          protein: formData.nutritionalInfo.protein || undefined,
          carbs: formData.nutritionalInfo.carbs || undefined,
          fat: formData.nutritionalInfo.fat || undefined,
          allergens: formData.allergens.length > 0 ? formData.allergens : undefined,
        };
      } else if (formData.allergens.length > 0) {
        payload.nutrition = {
          allergens: formData.allergens,
        };
      }

      // Handle ingredients - backend expects array of {ingredientId, quantity, unit}
      // Filter out ingredients without ingredientId
      const validIngredients = formData.ingredients.filter(ing => ing.ingredientId && ing.quantity > 0);
      if (validIngredients.length > 0) {
        payload.ingredients = validIngredients;
      } else {
        // Empty ingredients array - clear existing ingredients
        payload.ingredients = [];
      }

      await updateMenuItem(payload).unwrap();
      toast.success('Menu item updated successfully');
      setIsEditModalOpen(false);
      setSelectedMenuItem(null);
      refetch();
    } catch (error: any) {
      toast.error(error?.data?.message || 'Failed to update menu item');
    }
  };

  const handleDeleteMenuItem = async () => {
    if (!itemToDelete) return;

    try {
      await deleteMenuItem(itemToDelete).unwrap();
      toast.success('Menu item deleted successfully');
      setIsDeleteModalOpen(false);
      setItemToDelete('');
      refetch();
    } catch (error: any) {
      toast.error(error?.data?.message || 'Failed to delete menu item');
    }
  };

  const handleDeleteClick = (itemId: string) => {
    setItemToDelete(itemId);
    setIsDeleteModalOpen(true);
  };

  const handleAvailabilityToggle = async (itemId: string) => {
    const item = menuItems.find((i: MenuItem) => i.id === itemId);
    if (!item) return;
    
    try {
      await toggleAvailability({ id: itemId, isAvailable: !item.isAvailable }).unwrap();
      toast.success('Menu item availability updated');
      refetch();
    } catch (error) {
      toast.error('Failed to update availability');
    }
  };

  const openEditModal = (item: MenuItem) => {
    setSelectedMenuItem(item);
    setIsEditModalOpen(true);
  };

  const openViewModal = (item: MenuItem) => {
    setSelectedMenuItem(item);
    setIsViewModalOpen(true);
  };
  
  const addIngredient = () => {
    setFormData({
      ...formData,
      ingredients: [...formData.ingredients, { ingredientId: '', quantity: 0, unit: 'pcs' }],
    });
  };
  
  const updateIngredient = (index: number, field: 'ingredientId' | 'quantity' | 'unit', value: string | number) => {
    const newIngredients = [...formData.ingredients];
    newIngredients[index] = {
      ...newIngredients[index],
      [field]: field === 'quantity' ? Number(value) : value,
    };
    setFormData({ ...formData, ingredients: newIngredients });
  };
  
  const removeIngredient = (index: number) => {
    setFormData({
      ...formData,
      ingredients: formData.ingredients.filter((_, i) => i !== index),
    });
  };
  
  const addTag = (tag: string) => {
    if (tag && !formData.tags.includes(tag)) {
      setFormData({ ...formData, tags: [...formData.tags, tag] });
    }
  };
  
  const removeTag = (tag: string) => {
    setFormData({ ...formData, tags: formData.tags.filter(t => t !== tag) });
  };
  
  const addAllergen = (allergen: string) => {
    if (allergen && !formData.allergens.includes(allergen)) {
      setFormData({ ...formData, allergens: [...formData.allergens, allergen] });
    }
  };
  
  const removeAllergen = (allergen: string) => {
    setFormData({ ...formData, allergens: formData.allergens.filter(a => a !== allergen) });
  };

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <span
        key={i}
        className={`text-sm ${i < Math.floor(rating) ? 'text-yellow-400' : 'text-gray-300'}`}
      >
        ★
      </span>
    ));
  };

  const columns = [
    {
      key: 'name',
      title: 'Menu Item',
      sortable: true,
      render: (value: string, row: MenuItem) => (
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-gray-100 dark:bg-gray-800 rounded-lg flex items-center justify-center">
            <ShoppingBagIcon className="w-6 h-6 text-gray-600 dark:text-gray-400" />
          </div>
          <div>
            <p className="font-medium text-gray-900 dark:text-white">{value}</p>
            <p className="text-sm text-gray-500 dark:text-gray-400">{row.category}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'price',
      title: 'Price',
      align: 'right' as const,
      render: (value: number) => (
        <div className="text-right">
          <p className="font-semibold text-gray-900 dark:text-white">
            {formatCurrency(value)}
          </p>
        </div>
      ),
    },
    {
      key: 'preparationTime',
      title: 'Prep Time',
      align: 'center' as const,
      render: (value: number) => (
        <div className="text-center">
          <div className="flex items-center justify-center gap-1">
            <ClockIcon className="w-4 h-4 text-gray-400" />
            <span className="text-sm text-gray-600 dark:text-gray-400">{value} min</span>
          </div>
        </div>
      ),
    },
    {
      key: 'popularity',
      title: 'Popularity',
      align: 'center' as const,
      render: (value: number) => (
        <div className="text-center">
          <div className="flex items-center justify-center gap-1">
            {renderStars(value || 0)}
            <span className="text-sm text-gray-600 dark:text-gray-400 ml-1">
              ({value?.toFixed(1) || '0.0'})
            </span>
          </div>
        </div>
      ),
    },
    {
      key: 'isAvailable',
      title: 'Status',
      render: (value: boolean) => (
        <Badge variant={value ? 'success' : 'danger'}>
          {value ? 'Available' : 'Unavailable'}
        </Badge>
      ),
    },
    {
      key: 'actions',
      title: 'Actions',
      render: (value: any, row: MenuItem) => (
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => openViewModal(row)}
          >
            <EyeIcon className="w-4 h-4" />
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
            onClick={() => handleDeleteClick(row.id)}
          >
            <TrashIcon className="w-4 h-4 text-red-600" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleAvailabilityToggle(row.id)}
            className={row.isAvailable ? 'text-red-600 hover:text-red-700' : 'text-green-600 hover:text-green-700'}
          >
            {row.isAvailable ? 'Disable' : 'Enable'}
          </Button>
        </div>
      ),
    },
  ];

  // Filter menu items based on client-side filters (for display)
  const filteredMenuItems = useMemo(() => {
    let filtered = menuItems;

    // Category filter is handled by API, but we can add client-side filtering as fallback
    if (categoryFilter !== 'all') {
      filtered = filtered.filter((item: MenuItem) => item.categoryId === categoryFilter);
    }

    // Availability filter is handled by API, but we can add client-side filtering as fallback
    if (availabilityFilter !== 'all') {
      filtered = filtered.filter((item: MenuItem) => 
        availabilityFilter === 'available' ? item.isAvailable : !item.isAvailable
      );
    }

    return filtered;
  }, [menuItems, categoryFilter, availabilityFilter]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Menu Management</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Manage your restaurant menu items and pricing
            </p>
          </div>
        </div>
        <div className="text-center py-12">
          <p className="text-gray-500 dark:text-gray-400">Loading menu items...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Menu Management</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Manage your restaurant menu items and pricing
          </p>
        </div>
        <Button onClick={() => setIsCreateModalOpen(true)}>
          <PlusIcon className="w-5 h-5 mr-2" />
          Add Menu Item
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
              <ShoppingBagIcon className="w-8 h-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Available</p>
                <p className="text-3xl font-bold text-green-600">{stats.available}</p>
              </div>
              <ShoppingBagIcon className="w-8 h-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Unavailable</p>
                <p className="text-3xl font-bold text-red-600">{stats.unavailable}</p>
              </div>
              <ShoppingBagIcon className="w-8 h-8 text-red-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Avg Prep Time</p>
                <p className="text-3xl font-bold text-purple-600">{stats.avgPrepTime.toFixed(0)} min</p>
              </div>
              <ClockIcon className="w-8 h-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Avg Popularity</p>
                <p className="text-3xl font-bold text-yellow-600">{typeof stats.avgPopularity === 'number' ? stats.avgPopularity.toFixed(1) : stats.avgPopularity}⭐</p>
              </div>
              <ShoppingBagIcon className="w-8 h-8 text-yellow-600" />
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
                placeholder="Search menu items..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    setCommittedSearch(searchQuery);
                    setCurrentPage(1);
                  }
                }}
              />
            </div>
            <div className="w-full sm:w-48">
              <Select
                options={[
                  { value: 'all', label: 'All Categories' },
                  ...categories.map((cat: any) => ({ value: cat.id, label: cat.name })),
                ]}
                value={categoryFilter}
                onChange={setCategoryFilter}
                placeholder="Filter by category"
              />
            </div>
            <div className="w-full sm:w-48">
              <Select
                options={[
                  { value: 'all', label: 'All Items' },
                  { value: 'available', label: 'Available' },
                  { value: 'unavailable', label: 'Unavailable' },
                ]}
                value={availabilityFilter}
                onChange={setAvailabilityFilter}
                placeholder="Filter by availability"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Menu Items Table */}
      <DataTable
        data={filteredMenuItems}
        columns={columns}
        loading={isLoading}
        searchable={false}
        selectable={true}
        pagination={{
          currentPage,
          totalPages: Math.ceil(totalItems / itemsPerPage),
          itemsPerPage,
          totalItems: totalItems,
          onPageChange: setCurrentPage,
          onItemsPerPageChange: setItemsPerPage,
        }}
        exportable={true}
        exportFilename="menu-items"
        onExport={(format, items) => {
          console.log(`Exporting ${items.length} menu items as ${format}`);
          toast.success(`Exporting ${items.length} menu items as ${format.toUpperCase()}`);
        }}
        emptyMessage={isLoading ? 'Loading menu items...' : error ? 'Error loading menu items. Please try again.' : 'No menu items found.'}
      />

      {/* Menu Item Details Modal */}
      <Modal
        isOpen={isViewModalOpen}
        onClose={() => {
          setIsViewModalOpen(false);
          setSelectedMenuItem(null);
        }}
        title="Menu Item Details"
        className="max-w-4xl"
      >
        {selectedMenuItem && (
          <div className="space-y-6">
            {/* Header */}
            <div className="flex items-start gap-6">
              <div className="w-24 h-24 bg-gray-100 dark:bg-gray-800 rounded-lg flex items-center justify-center">
                <ShoppingBagIcon className="w-12 h-12 text-gray-600 dark:text-gray-400" />
              </div>
              <div className="flex-1">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                      {selectedMenuItem.name}
                    </h3>
                    <p className="text-gray-600 dark:text-gray-400 mt-1">
                      {selectedMenuItem.description}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-primary-600">
                      {formatCurrency(selectedMenuItem.price)}
                    </p>
                    <Badge variant={selectedMenuItem.isAvailable ? 'success' : 'danger'} className="mt-2">
                      {selectedMenuItem.isAvailable ? 'Available' : 'Unavailable'}
                    </Badge>
                  </div>
                </div>

                <div className="flex items-center gap-4 mt-4">
                  <div className="flex items-center gap-1">
                    <ClockIcon className="w-4 h-4 text-gray-400" />
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      {selectedMenuItem.preparationTime} min prep
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    {renderStars(selectedMenuItem.popularity || 0)}
                    <span className="text-sm text-gray-600 dark:text-gray-400 ml-1">
                      ({selectedMenuItem.popularity?.toFixed(1) || '0.0'})
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Details Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Ingredients */}
              {selectedMenuItem.ingredients && selectedMenuItem.ingredients.length > 0 && (
                <div>
                  <h4 className="font-medium text-gray-900 dark:text-white mb-3">Ingredients</h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedMenuItem.ingredients.map((ingredient: any, index: number) => {
                      // Ensure ingredient is a string
                      let ingredientName: string;
                      if (typeof ingredient === 'string') {
                        ingredientName = ingredient;
                      } else if (ingredient?.ingredientId?.name) {
                        ingredientName = ingredient.ingredientId.name;
                      } else if (ingredient?.name) {
                        ingredientName = ingredient.name;
                      } else if (ingredient?.quantity && ingredient?.unit) {
                        ingredientName = `${ingredient.quantity} ${ingredient.unit}`;
                      } else {
                        ingredientName = 'Unknown';
                      }
                      
                      return (
                        <Badge key={index} variant="secondary">
                          {ingredientName}
                        </Badge>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Allergens */}
              {selectedMenuItem.allergens && (
                <div>
                  <h4 className="font-medium text-gray-900 dark:text-white mb-3">Allergens</h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedMenuItem.allergens.map((allergen, index) => (
                      <Badge key={index} variant="warning">
                        {allergen}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Nutritional Info */}
              {(() => {
                const nutrition = selectedMenuItem.nutritionalInfo;
                if (!nutrition) return null;
                const hasNutrition = (nutrition.calories || 0) > 0 || (nutrition.protein || 0) > 0 || (nutrition.carbs || 0) > 0 || (nutrition.fat || 0) > 0;
                if (!hasNutrition) return null;
                
                return (
                  <div>
                    <h4 className="font-medium text-gray-900 dark:text-white mb-3">Nutritional Information</h4>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      {(nutrition.calories || 0) > 0 && (
                        <div className="flex justify-between">
                          <span className="text-gray-600 dark:text-gray-400">Calories:</span>
                          <span className="font-medium text-gray-900 dark:text-white">
                            {nutrition.calories}
                          </span>
                        </div>
                      )}
                      {(nutrition.protein || 0) > 0 && (
                        <div className="flex justify-between">
                          <span className="text-gray-600 dark:text-gray-400">Protein:</span>
                          <span className="font-medium text-gray-900 dark:text-white">
                            {nutrition.protein}g
                          </span>
                        </div>
                      )}
                      {(nutrition.carbs || 0) > 0 && (
                        <div className="flex justify-between">
                          <span className="text-gray-600 dark:text-gray-400">Carbs:</span>
                          <span className="font-medium text-gray-900 dark:text-white">
                            {nutrition.carbs}g
                          </span>
                        </div>
                      )}
                      {(nutrition.fat || 0) > 0 && (
                        <div className="flex justify-between">
                          <span className="text-gray-600 dark:text-gray-400">Fat:</span>
                          <span className="font-medium text-gray-900 dark:text-white">
                            {nutrition.fat}g
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })()}

              {/* Tags */}
              {selectedMenuItem.tags && (
                <div>
                  <h4 className="font-medium text-gray-900 dark:text-white mb-3">Tags</h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedMenuItem.tags.map((tag, index) => (
                      <Badge key={index} variant="info">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Timestamps */}
            <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
              <div className="text-sm text-gray-500 dark:text-gray-400">
                Created: {formatDateTime(selectedMenuItem.createdAt)}
                <br />
                Last updated: {formatDateTime(selectedMenuItem.updatedAt)}
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
              <Button
                variant="secondary"
                onClick={() => {
                  setIsViewModalOpen(false);
                  setSelectedMenuItem(null);
                }}
              >
                Close
              </Button>
              <Button onClick={() => openEditModal(selectedMenuItem)}>
                Edit Item
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Create/Edit Menu Item Modal */}
      <Modal
        isOpen={isCreateModalOpen || isEditModalOpen}
        onClose={() => {
          setIsCreateModalOpen(false);
          setIsEditModalOpen(false);
          setSelectedMenuItem(null);
        }}
        title={isEditModalOpen ? 'Edit Menu Item' : 'Create Menu Item'}
        className="max-w-3xl max-h-[90vh] overflow-y-auto"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Name *
              </label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Menu item name"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Category *
              </label>
              {isLoadingCategories || isFetchingCategories ? (
                <div className="px-3 py-2 border border-gray-300 rounded-md bg-gray-50 dark:bg-gray-800 dark:border-gray-600 text-sm text-gray-500 dark:text-gray-400">
                  Loading categories...
                </div>
              ) : !branchId ? (
                <div className="px-3 py-2 border border-yellow-300 rounded-md bg-yellow-50 dark:bg-yellow-900/20 dark:border-yellow-800 text-sm text-yellow-600 dark:text-yellow-400">
                  No branch selected. Please select a branch first.
                </div>
              ) : categories.length > 0 ? (
                <Select
                  options={categories.map((cat: any) => ({ value: String(cat.id), label: cat.name }))}
                  value={formData.categoryId ? String(formData.categoryId) : ''}
                  onChange={(value) => setFormData({ ...formData, categoryId: value })}
                  placeholder="Select category"
                />
              ) : (
                <div className="px-3 py-2 border border-red-300 rounded-md bg-red-50 dark:bg-red-900/20 dark:border-red-800 text-sm text-red-600 dark:text-red-400">
                  No categories available. Please create a category first. (Branch ID: {branchId || 'none'})
                </div>
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Menu item description"
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Price *
              </label>
              <Input
                type="number"
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: Number(e.target.value) })}
                placeholder="0.00"
                min="0"
                step="0.01"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Prep Time (min)
              </label>
              <Input
                type="number"
                value={formData.preparationTime}
                onChange={(e) => setFormData({ ...formData, preparationTime: Number(e.target.value) })}
                placeholder="0"
                min="0"
              />
            </div>
            <div className="flex items-center pt-6">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.isAvailable}
                  onChange={(e) => setFormData({ ...formData, isAvailable: e.target.checked })}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Available</span>
              </label>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Ingredients
            </label>
            <div className="space-y-3">
              {formData.ingredients.map((ingredient, index) => (
                <div key={index} className="grid grid-cols-12 gap-2 items-end">
                  <div className="col-span-5">
                    {isLoadingIngredients ? (
                      <div className="px-3 py-2 border border-gray-300 rounded-md bg-gray-50 dark:bg-gray-800 dark:border-gray-600 text-sm text-gray-500 dark:text-gray-400">
                        Loading ingredients...
                      </div>
                    ) : availableIngredients.length > 0 ? (
                      <Select
                        options={[
                          { value: '', label: 'Select ingredient' },
                          ...availableIngredients.map((ing: any) => ({
                            value: String(ing.id),
                            label: `${ing.name} (${ing.unit || 'pcs'})`,
                          })),
                        ]}
                        value={ingredient.ingredientId}
                        onChange={(value) => {
                          const selectedIng = availableIngredients.find((ing: any) => String(ing.id) === String(value));
                          updateIngredient(index, 'ingredientId', value);
                          if (selectedIng) {
                            updateIngredient(index, 'unit', selectedIng.unit || 'pcs');
                          }
                        }}
                        placeholder="Select ingredient"
                      />
                    ) : (
                      <div className="px-3 py-2 border border-yellow-300 rounded-md bg-yellow-50 dark:bg-yellow-900/20 dark:border-yellow-800 text-sm text-yellow-600 dark:text-yellow-400">
                        No ingredients available. Please create ingredients first.
                      </div>
                    )}
                  </div>
                  <div className="col-span-3">
                    <Input
                      type="number"
                      value={ingredient.quantity}
                      onChange={(e) => updateIngredient(index, 'quantity', Number(e.target.value))}
                      placeholder="Quantity"
                      min="0"
                      step="0.01"
                    />
                  </div>
                  <div className="col-span-3">
                    <Select
                      options={[
                        { value: 'pcs', label: 'pcs' },
                        { value: 'kg', label: 'kg' },
                        { value: 'g', label: 'g' },
                        { value: 'l', label: 'l' },
                        { value: 'ml', label: 'ml' },
                        { value: 'box', label: 'box' },
                        { value: 'pack', label: 'pack' },
                        { value: 'bottle', label: 'bottle' },
                        { value: 'can', label: 'can' },
                      ]}
                      value={ingredient.unit}
                      onChange={(value) => updateIngredient(index, 'unit', value)}
                      placeholder="Unit"
                    />
                  </div>
                  <div className="col-span-1">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => removeIngredient(index)}
                    >
                      <XMarkIcon className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
              <Button
                variant="secondary"
                size="sm"
                onClick={addIngredient}
              >
                + Add Ingredient
              </Button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Allergens
            </label>
            <div className="flex flex-wrap gap-2">
              {formData.allergens.map((allergen) => (
                <Badge key={allergen} variant="warning" className="flex items-center gap-1">
                  {allergen}
                  <button onClick={() => removeAllergen(allergen)}>
                    <XMarkIcon className="w-3 h-3" />
                  </button>
                </Badge>
              ))}
            </div>
            <Input
              placeholder="Add allergen and press Enter"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  const value = (e.target as HTMLInputElement).value.trim();
                  if (value) {
                    addAllergen(value);
                    (e.target as HTMLInputElement).value = '';
                  }
                }
              }}
              className="mt-2"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Tags
            </label>
            <div className="flex flex-wrap gap-2">
              {formData.tags.map((tag) => (
                <Badge key={tag} variant="info" className="flex items-center gap-1">
                  {tag}
                  <button onClick={() => removeTag(tag)}>
                    <XMarkIcon className="w-3 h-3" />
                  </button>
                </Badge>
              ))}
            </div>
            <Input
              placeholder="Add tag and press Enter"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  const value = (e.target as HTMLInputElement).value.trim();
                  if (value) {
                    addTag(value);
                    (e.target as HTMLInputElement).value = '';
                  }
                }
              }}
              className="mt-2"
            />
          </div>

          <div className="grid grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Calories
              </label>
              <Input
                type="number"
                value={formData.nutritionalInfo.calories}
                onChange={(e) => setFormData({
                  ...formData,
                  nutritionalInfo: { ...formData.nutritionalInfo, calories: Number(e.target.value) }
                })}
                min="0"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Protein (g)
              </label>
              <Input
                type="number"
                value={formData.nutritionalInfo.protein}
                onChange={(e) => setFormData({
                  ...formData,
                  nutritionalInfo: { ...formData.nutritionalInfo, protein: Number(e.target.value) }
                })}
                min="0"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Carbs (g)
              </label>
              <Input
                type="number"
                value={formData.nutritionalInfo.carbs}
                onChange={(e) => setFormData({
                  ...formData,
                  nutritionalInfo: { ...formData.nutritionalInfo, carbs: Number(e.target.value) }
                })}
                min="0"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Fat (g)
              </label>
              <Input
                type="number"
                value={formData.nutritionalInfo.fat}
                onChange={(e) => setFormData({
                  ...formData,
                  nutritionalInfo: { ...formData.nutritionalInfo, fat: Number(e.target.value) }
                })}
                min="0"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button
              variant="secondary"
              onClick={() => {
                setIsCreateModalOpen(false);
                setIsEditModalOpen(false);
                setSelectedMenuItem(null);
              }}
              disabled={isCreating || isUpdating}
            >
              Cancel
            </Button>
            <Button
              onClick={isEditModalOpen ? handleUpdateMenuItem : handleCreateMenuItem}
              disabled={isCreating || isUpdating || !formData.name || !formData.price || !formData.categoryId}
            >
              {isCreating || isUpdating ? 'Saving...' : isEditModalOpen ? 'Update Menu Item' : 'Create Menu Item'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setItemToDelete('');
        }}
        title="Delete Menu Item"
      >
        <div className="space-y-4">
          <p className="text-gray-600 dark:text-gray-400">
            Are you sure you want to delete this menu item? This action cannot be undone.
          </p>
          <div className="flex justify-end gap-2">
            <Button
              variant="secondary"
              onClick={() => {
                setIsDeleteModalOpen(false);
                setItemToDelete('');
              }}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              onClick={handleDeleteMenuItem}
              className="bg-red-600 hover:bg-red-700"
              disabled={isDeleting}
            >
              {isDeleting ? 'Deleting...' : 'Delete'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
