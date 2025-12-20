'use client';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { DataTable } from '@/components/ui/DataTable';
import { ImportButton } from '@/components/ui/ImportButton';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Select } from '@/components/ui/Select';
import { useFeatureRedirect } from '@/hooks/useFeatureRedirect';
import { useGetCategoriesQuery } from '@/lib/api/endpoints/categoriesApi';
import { useGetInventoryItemsQuery } from '@/lib/api/endpoints/inventoryApi';
import { useCreateMenuItemMutation, useDeleteMenuItemMutation, useGetMenuItemsQuery, useToggleAvailabilityMutation, useUpdateMenuItemMutation, useUploadMenuImagesMutation } from '@/lib/api/endpoints/menuItemsApi';
import { useGetMenuItemsRatingsMutation } from '@/lib/api/endpoints/reviewsApi';
import { useAppSelector } from '@/lib/store';
import { formatCurrency, formatDateTime } from '@/lib/utils';
import {
  ClockIcon,
  EyeIcon,
  PencilIcon,
  PhotoIcon,
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
  // Redirect if user doesn't have menu-management feature (auto-redirects to role-specific dashboard)
  useFeatureRedirect('menu-management');
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
    trackInventory: false, // Enable inventory tracking if ingredients are added
    images: [] as string[],
    ingredients: [] as Array<{ ingredientId: string; quantity: number; unit: string }>,
    allergens: [] as string[],
    tags: [] as string[],
    selections: [] as Array<{
      name: string;
      type: 'single' | 'multi' | 'optional';
      options: Array<{ name: string; price: number }>;
    }>,
    variants: [] as Array<{
      name: string;
      options: Array<{ name: string; priceModifier: number }>;
    }>,
    nutritionalInfo: {
      calories: 0,
      protein: 0,
      carbs: 0,
      fat: 0,
    },
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  // Fetch real menu items from API - try multiple ways to get branchId
  const branchId = (user as any)?.branchId || 
                   (companyContext as any)?.branchId || 
                   (companyContext as any)?.branches?.[0]?._id ||
                   (companyContext as any)?.branches?.[0]?.id;
  // Get companyId for query (same as categories page)
  const companyId = (user as any)?.companyId || 
                   (companyContext as any)?.companyId || 
                   (companyContext as any)?._id ||
                   (companyContext as any)?.id;
  // Build API query parameters
  const queryParams = useMemo(() => {
    const params: any = {
      branchId,
      page: currentPage,
      limit: itemsPerPage,
    };
    // Always include companyId to ensure proper filtering
    if (companyId) {
      params.companyId = companyId;
    }
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
  }, [branchId, companyId, currentPage, itemsPerPage, committedSearch, categoryFilter, availabilityFilter]);
  const { data: menuItemsResponse, isLoading, error, refetch } = useGetMenuItemsQuery(
    queryParams,
    { skip: !branchId }
  );
  // Get stats - fetch all items for accurate stats (without filters)
  const { data: statsResponse } = useGetMenuItemsQuery(
    { branchId, companyId, limit: 1000 },
    { skip: !branchId }
  );
  // Fetch ratings for menu items - declare before stats calculation
  const [getMenuItemsRatings] = useGetMenuItemsRatingsMutation();
  const [menuItemsRatings, setMenuItemsRatings] = useState<Record<string, { averageRating: number; totalReviews: number }>>({});
  // Calculate stats from real API data
  const stats = useMemo(() => {
    const statsItems = (statsResponse as any)?.menuItems || [];
    const total = statsItems.length;
    const available = statsItems.filter((item: any) => item.isAvailable !== false).length;
    const unavailable = total - available;
    const avgPrepTime = total > 0 
      ? Math.round(statsItems.reduce((sum: number, item: any) => sum + (item.preparationTime || 0), 0) / total)
      : 0;
    // Calculate average rating from real review data
    let avgPopularity = 0;
    if (total > 0 && Object.keys(menuItemsRatings).length > 0) {
      const ratingsWithValues = statsItems
        .map((item: any) => {
          const rating = menuItemsRatings[item.id]?.averageRating || 0;
          return rating > 0 ? rating : null;
        })
        .filter((rating: number | null) => rating !== null) as number[];
      if (ratingsWithValues.length > 0) {
        avgPopularity = Number((ratingsWithValues.reduce((sum, rating) => sum + rating, 0) / ratingsWithValues.length).toFixed(1));
      }
    }
    return {
      total,
      available,
      unavailable,
      avgPrepTime,
      avgPopularity,
    };
  }, [statsResponse, menuItemsRatings]);
  // Use the same query as categories page to ensure consistency
  // This shows the same categories that appear on /dashboard/categories
  const { data: categoriesResponse, isLoading: isLoadingCategories, isFetching: isFetchingCategories } = useGetCategoriesQuery(
    { branchId, companyId },
    { skip: !branchId && !companyId, refetchOnMountOrArgChange: true }
  );
  // Fetch ingredients for the ingredient selector - ensure we have companyId or branchId
  const { data: ingredientsResponse, isLoading: isLoadingIngredients } = useGetInventoryItemsQuery(
    { companyId: companyId || undefined, branchId: branchId || undefined, limit: 1000 },
    { skip: !companyId && !branchId } // Don't skip if we have at least one
  );
  const availableIngredients = useMemo(() => {
    // During initial load, ingredientsResponse will be undefined - that's normal
    if (!ingredientsResponse) {
      return [];
    }
    const items = ingredientsResponse.items || (Array.isArray(ingredientsResponse) ? ingredientsResponse : []);
    if (!Array.isArray(items)) {
      console.warn('📦 Ingredients items is not an array:', items);
      return [];
    }
    const mapped = items.map((ing: any) => ({
      id: String(ing.id || ing._id || ''),
      name: String(ing.name || ''),
      unit: String(ing.unit || 'pcs'),
    })).filter((ing: any) => ing && ing.id && ing.name && ing.id !== 'undefined'); // Filter out invalid entries
    // Only log when ingredients are actually loaded (not during initial undefined state)
    if (mapped.length > 0) {
      }
    return mapped;
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
  const [uploadImages] = useUploadMenuImagesMutation();
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
  // Fetch ratings for menu items (including stats items)
  useEffect(() => {
    const statsItems = (statsResponse as any)?.menuItems || [];
    const allMenuItemIds = [
      ...menuItems.map((item: MenuItem) => item.id),
      ...statsItems.map((item: any) => item.id),
    ].filter(Boolean);
    const uniqueMenuItemIds = Array.from(new Set(allMenuItemIds));
    if (uniqueMenuItemIds.length > 0 && branchId) {
      getMenuItemsRatings({
        menuItemIds: uniqueMenuItemIds,
        branchId,
        companyId: (companyContext as any)?.companyId || (companyContext as any)?.id || (companyContext as any)?._id,
      })
        .unwrap()
        .then((ratings) => {
          setMenuItemsRatings(ratings);
        })
        .catch((error) => {
          console.error('Failed to fetch menu items ratings:', error);
        });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [menuItems, statsResponse, branchId, companyContext]);
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
        trackInventory: itemData.trackInventory || (ingredientsArray.length > 0),
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
        variants: itemData.variants || [],
        selections: itemData.selections || [],
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
        trackInventory: false,
        images: [],
        ingredients: [] as Array<{ ingredientId: string; quantity: number; unit: string }>,
        allergens: [],
        tags: [],
        selections: [],
        variants: [],
        nutritionalInfo: {
          calories: 0,
          protein: 0,
          carbs: 0,
          fat: 0,
        },
      });
    }
  }, [isCreateModalOpen, isEditModalOpen, categories]);
  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};
    if (!formData.name.trim()) {
      errors.name = 'Menu item name is required';
    } else if (formData.name.trim().length < 2) {
      errors.name = 'Menu item name must be at least 2 characters';
    } else if (formData.name.trim().length > 100) {
      errors.name = 'Menu item name must be less than 100 characters';
    }
    if (!formData.categoryId) {
      errors.categoryId = 'Please select a category';
    }
    if (!formData.price || formData.price <= 0) {
      errors.price = 'Price must be greater than 0';
    } else if (formData.price > 10000) {
      errors.price = 'Price cannot exceed 10,000';
    }
    if (formData.preparationTime < 0) {
      errors.preparationTime = 'Preparation time cannot be negative';
    } else if (formData.preparationTime > 480) {
      errors.preparationTime = 'Preparation time cannot exceed 480 minutes (8 hours)';
    }
    if (formData.description && formData.description.length > 500) {
      errors.description = 'Description must be less than 500 characters';
    }
    // Validate nutritional info if provided
    if (formData.nutritionalInfo.calories < 0) {
      errors.nutritionalInfo_calories = 'Calories cannot be negative';
    }
    if (formData.nutritionalInfo.protein < 0) {
      errors.nutritionalInfo_protein = 'Protein cannot be negative';
    }
    if (formData.nutritionalInfo.carbs < 0) {
      errors.nutritionalInfo_carbs = 'Carbs cannot be negative';
    }
    if (formData.nutritionalInfo.fat < 0) {
      errors.nutritionalInfo_fat = 'Fat cannot be negative';
    }
    // Validate ingredients
    formData.ingredients.forEach((ing, index) => {
      if (!ing.ingredientId) {
        errors[`ingredient_${index}_ingredientId`] = 'Please select an ingredient';
      }
      if (ing.quantity <= 0) {
        errors[`ingredient_${index}_quantity`] = 'Quantity must be greater than 0';
      }
      if (!ing.unit || ing.unit.trim() === '') {
        errors[`ingredient_${index}_unit`] = 'Unit is required';
      }
    });
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };
  const clearFormError = (field: string) => {
    setFormErrors((prev) => {
      const next = { ...prev };
      delete next[field];
      return next;
    });
  };
  const handleCreateMenuItem = async () => {
    if (!validateForm()) {
      toast.error('Please fix the errors in the form');
      return;
    }
    if (!branchId) {
      toast.error('Branch ID is missing');
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
        trackInventory: false, // Will be set based on ingredients below
        images: formData.images.filter(Boolean).length > 0 ? formData.images.filter(Boolean) : undefined,
        tags: formData.tags.length > 0 ? formData.tags : undefined,
      };
      // Handle ingredients - backend expects array of {ingredientId, quantity, unit}
      // Filter out ingredients without ingredientId
      const validIngredients = formData.ingredients.filter(ing => ing.ingredientId && ing.quantity > 0);
      if (validIngredients.length > 0) {
        payload.ingredients = validIngredients;
      } else {
        // Empty ingredients array - clear existing ingredients
        payload.ingredients = [];
      }
      // Use the trackInventory value from form (user can enable/disable manually)
      // If trackInventory is enabled but no ingredients, it will be ignored by backend
      payload.trackInventory = formData.trackInventory && validIngredients.length > 0;
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
      // Add variants if provided
      if (formData.variants.length > 0) {
        payload.variants = formData.variants.filter(v => v.name && v.options.length > 0);
      }
      // Add selections if provided
      if (formData.selections.length > 0) {
        payload.selections = formData.selections.filter(s => s.name && s.options.length > 0);
      }
      await createMenuItem(payload).unwrap();
      toast.success('Menu item created successfully');
      // Reset form to default state
      setFormData({
        name: '',
        description: '',
        price: 0,
        categoryId: categories[0]?.id || '',
        preparationTime: 0,
        isAvailable: true,
        trackInventory: false,
        images: [],
        ingredients: [],
        allergens: [],
        tags: [],
        selections: [],
        variants: [],
        nutritionalInfo: {
          calories: 0,
          protein: 0,
          carbs: 0,
          fat: 0,
        },
      });
      setFormErrors({});
      setIsCreateModalOpen(false);
      // Refetch menu items to show the new item
      await refetch();
    } catch (error: any) {
      const errorMessage = error?.data?.message || error?.message || 'Failed to create menu item';
      toast.error(errorMessage);
      // Set form-level error if it's a validation error
      if (error?.data?.errors) {
        const apiErrors: Record<string, string> = {};
        Object.keys(error.data.errors).forEach((key) => {
          apiErrors[key] = error.data.errors[key];
        });
        setFormErrors(apiErrors);
      }
    }
  };
  const handleUpdateMenuItem = async () => {
    if (!selectedMenuItem?.id) {
      toast.error('Menu item not selected');
      return;
    }
    if (!validateForm()) {
      toast.error('Please fix the errors in the form');
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
      // Use the trackInventory value from form (user can enable/disable manually)
      // If trackInventory is enabled but no ingredients, it will be ignored by backend
      payload.trackInventory = formData.trackInventory && validIngredients.length > 0;
      // Add variants if provided
      if (formData.variants.length > 0) {
        payload.variants = formData.variants.filter(v => v.name && v.options.length > 0);
      } else {
        payload.variants = []; // Clear variants if empty
      }
      // Add selections if provided
      if (formData.selections.length > 0) {
        payload.selections = formData.selections.filter(s => s.name && s.options.length > 0);
      } else {
        payload.selections = []; // Clear selections if empty
      }
      await updateMenuItem(payload).unwrap();
      toast.success('Menu item updated successfully');
      setIsEditModalOpen(false);
      setSelectedMenuItem(null);
      setFormErrors({});
      refetch();
    } catch (error: any) {
      const errorMessage = error?.data?.message || error?.message || 'Failed to update menu item';
      toast.error(errorMessage);
      // Set form-level error if it's a validation error
      if (error?.data?.errors) {
        const apiErrors: Record<string, string> = {};
        Object.keys(error.data.errors).forEach((key) => {
          apiErrors[key] = error.data.errors[key];
        });
        setFormErrors(apiErrors);
      }
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
      console.error(error);
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
    setFormData((prev) => {
      const newIngredients = [...prev.ingredients];
      if (!newIngredients[index]) {
        newIngredients[index] = { ingredientId: '', quantity: 0, unit: 'pcs' };
      }
      newIngredients[index] = {
        ...newIngredients[index],
        [field]: field === 'quantity' ? Number(value) : String(value),
      };
      return { ...prev, ingredients: newIngredients };
    });
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
  // Image upload handlers - Upload to Cloudinary
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const imageFiles = Array.from(files).filter((file) => file.type.startsWith('image/'));
    if (imageFiles.length === 0) {
      toast.error('Please upload only image files');
      e.target.value = '';
      return;
    }
    // Check file sizes (10MB limit per image)
    const maxSizeMB = 10;
    const oversizedFiles = imageFiles.filter((file) => file.size > maxSizeMB * 1024 * 1024);
    if (oversizedFiles.length > 0) {
      toast.error(`Some images are too large. Maximum size is ${maxSizeMB}MB per image.`);
      e.target.value = '';
      return;
    }
    try {
      // Create FormData for multipart upload
      const uploadFormData = new FormData();
      imageFiles.forEach((file) => {
        uploadFormData.append('images', file);
      });
      // Upload to Cloudinary via backend
      const result = await uploadImages(uploadFormData).unwrap();
      if (result.success && result.images && result.images.length > 0) {
        // Store Cloudinary URLs instead of base64
        const imageUrls = result.images.map((img) => img.url);
        setFormData((prev) => ({
          ...prev,
          images: [...prev.images, ...imageUrls],
        }));
        toast.success(`Successfully uploaded ${result.images.length} image(s) to Cloudinary`);
      } else {
        toast.error('Failed to upload images');
      }
    } catch (error: any) {
      console.error('Error uploading images:', error);
      toast.error(error?.data?.message || error?.message || 'Failed to upload images to Cloudinary');
    }
    // Reset input to allow uploading the same file again
    e.target.value = '';
  };
  const removeImage = (index: number) => {
    setFormData({
      ...formData,
      images: formData.images.filter((_, i) => i !== index),
    });
  };
  // Selections handlers (for customization options like Size, Toppings, etc.)
  const addSelection = () => {
    setFormData({
      ...formData,
      selections: [...formData.selections, {
        name: '',
        type: 'single',
        options: [],
      }],
    });
  };
  const updateSelection = (index: number, field: 'name' | 'type', value: string) => {
    const newSelections = [...formData.selections];
    newSelections[index] = {
      ...newSelections[index],
      [field]: value,
    };
    setFormData({ ...formData, selections: newSelections });
  };
  const removeSelection = (index: number) => {
    setFormData({
      ...formData,
      selections: formData.selections.filter((_, i) => i !== index),
    });
  };
  const addSelectionOption = (selectionIndex: number) => {
    const newSelections = [...formData.selections];
    newSelections[selectionIndex].options.push({ name: '', price: 0 });
    setFormData({ ...formData, selections: newSelections });
  };
  const updateSelectionOption = (selectionIndex: number, optionIndex: number, field: 'name' | 'price', value: string | number) => {
    const newSelections = [...formData.selections];
    newSelections[selectionIndex].options[optionIndex] = {
      ...newSelections[selectionIndex].options[optionIndex],
      [field]: field === 'price' ? Number(value) : value,
    };
    setFormData({ ...formData, selections: newSelections });
  };
  const removeSelectionOption = (selectionIndex: number, optionIndex: number) => {
    const newSelections = [...formData.selections];
    newSelections[selectionIndex].options = newSelections[selectionIndex].options.filter((_, i) => i !== optionIndex);
    setFormData({ ...formData, selections: newSelections });
  };
  // Variants handlers (for size variants like Small, Medium, Large)
  const addVariant = () => {
    setFormData({
      ...formData,
      variants: [...formData.variants, {
        name: '',
        options: [],
      }],
    });
  };
  const updateVariant = (index: number, field: 'name', value: string) => {
    const newVariants = [...formData.variants];
    newVariants[index] = {
      ...newVariants[index],
      [field]: value,
    };
    setFormData({ ...formData, variants: newVariants });
  };
  const removeVariant = (index: number) => {
    setFormData({
      ...formData,
      variants: formData.variants.filter((_, i) => i !== index),
    });
  };
  const addVariantOption = (variantIndex: number) => {
    const newVariants = [...formData.variants];
    newVariants[variantIndex].options.push({ name: '', priceModifier: 0 });
    setFormData({ ...formData, variants: newVariants });
  };
  const updateVariantOption = (variantIndex: number, optionIndex: number, field: 'name' | 'priceModifier', value: string | number) => {
    const newVariants = [...formData.variants];
    newVariants[variantIndex].options[optionIndex] = {
      ...newVariants[variantIndex].options[optionIndex],
      [field]: field === 'priceModifier' ? Number(value) : value,
    };
    setFormData({ ...formData, variants: newVariants });
  };
  const removeVariantOption = (variantIndex: number, optionIndex: number) => {
    const newVariants = [...formData.variants];
    newVariants[variantIndex].options = newVariants[variantIndex].options.filter((_, i) => i !== optionIndex);
    setFormData({ ...formData, variants: newVariants });
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
      render: (value: string, row: MenuItem) => {
        const imageSrc = row.imageUrl || (Array.isArray((row as any).images) ? (row as any).images[0] : undefined);
        return (
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gray-100 dark:bg-gray-800 rounded-lg flex items-center justify-center overflow-hidden">
              {imageSrc ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={imageSrc}
                  alt={value}
                  className="w-full h-full object-cover"
                />
              ) : (
                <ShoppingBagIcon className="w-6 h-6 text-gray-600 dark:text-gray-400" />
              )}
            </div>
            <div>
              <p className="font-medium text-gray-900 dark:text-white">{value}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">{row.category}</p>
            </div>
          </div>
        );
      },
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
      title: 'Rating',
      align: 'center' as const,
      render: (value: number, row: MenuItem) => {
        const rating = menuItemsRatings[row.id]?.averageRating || 0;
        const totalReviews = menuItemsRatings[row.id]?.totalReviews || 0;
        return (
          <div className="text-center">
            <div className="flex items-center justify-center gap-1">
              {renderStars(rating)}
              <span className="text-sm text-gray-600 dark:text-gray-400 ml-1">
                ({rating.toFixed(1)})
              </span>
            </div>
            {totalReviews > 0 && (
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {totalReviews} {totalReviews === 1 ? 'review' : 'reviews'}
              </span>
            )}
          </div>
        );
      },
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
  // Error state
  if (error) {
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
        <Card>
          <CardContent className="p-12 text-center">
            <div className="text-red-600 dark:text-red-400 mb-4">
              <ShoppingBagIcon className="w-12 h-12 mx-auto mb-4" />
              <h2 className="text-xl font-semibold">Error Loading Menu Items</h2>
              <p className="text-gray-600 dark:text-gray-400 mt-2">
                {(error as any)?.data?.message || (error as any)?.message || 'Failed to load menu items. Please try again.'}
              </p>
            </div>
            <Button onClick={() => refetch()} variant="primary">
              Try Again
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }
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
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-4"></div>
          <p className="text-gray-500 dark:text-gray-400">Loading menu items...</p>
        </div>
      </div>
    );
  }
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Menu Management</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Manage your restaurant menu items and pricing
          </p>
        </div>
        <div className="flex items-center gap-2">
          <ImportButton
            onImport={async (data, _result) => {
              // Bulk create menu items
              let successCount = 0;
              let errorCount = 0;
              for (const item of data) {
                try {
                  // Find category by name if categoryId is not provided
                  let categoryId = item.categoryId;
                  if (!categoryId && item.category) {
                    const category = categories.find(
                      (cat: any) => cat.name.toLowerCase() === item.category.toLowerCase()
                    );
                    categoryId = category?.id;
                  }
                  if (!categoryId && categories.length > 0) {
                    categoryId = categories[0].id; // Fallback to first category
                  }
                  const payload: any = {
                    companyId: companyId?.toString(),
                    name: item.name || item['Menu Item'],
                    description: item.description || '',
                    price: parseFloat(item.price || item.Price || 0),
                    categoryId: categoryId || categories[0]?.id,
                    preparationTime: parseInt(item.preparationTime || item['Prep Time (min)'] || 0),
                    isAvailable: item.isAvailable !== false && item.Status !== 'Unavailable',
                  };
                  if (branchId) {
                    payload.branchId = branchId.toString();
                  }
                  await createMenuItem(payload).unwrap();
                  successCount++;
                } catch (error: any) {
                  console.error('Failed to import menu item:', item, error);
                  errorCount++;
                }
              }
              if (successCount > 0) {
                toast.success(`Successfully imported ${successCount} menu items`);
                await refetch();
              }
              if (errorCount > 0) {
                toast.error(`Failed to import ${errorCount} menu items`);
              }
            }}
            columns={[
              { key: 'name', label: 'Menu Item', required: true, type: 'string' },
              { key: 'price', label: 'Price', required: true, type: 'number' },
              { key: 'category', label: 'Category', required: true, type: 'string' },
              { key: 'preparationTime', label: 'Prep Time (min)', type: 'number' },
              { key: 'description', label: 'Description', type: 'string' },
              { key: 'isAvailable', label: 'Status', type: 'boolean' },
            ]}
            filename="menu-items-import-template"
            variant="secondary"
          />
          <Button onClick={() => setIsCreateModalOpen(true)}>
            <PlusIcon className="w-5 h-5 mr-2" />
            Add Menu Item
          </Button>
        </div>
      </div>
      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 md:gap-6">
        <Card>
          <CardContent className="p-4 md:p-6">
            <div className="flex items-center justify-between gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-600 dark:text-gray-400">Total Items</p>
                <p className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">{stats.total}</p>
              </div>
              <ShoppingBagIcon className="w-7 h-7 md:w-8 md:h-8 text-blue-600 shrink-0" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 md:p-6">
            <div className="flex items-center justify-between gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-600 dark:text-gray-400">Available</p>
                <p className="text-2xl md:text-3xl font-bold text-green-600">{stats.available}</p>
              </div>
              <ShoppingBagIcon className="w-7 h-7 md:w-8 md:h-8 text-green-600 shrink-0" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 md:p-6">
            <div className="flex items-center justify-between gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-600 dark:text-gray-400">Unavailable</p>
                <p className="text-2xl md:text-3xl font-bold text-red-600">{stats.unavailable}</p>
              </div>
              <ShoppingBagIcon className="w-7 h-7 md:w-8 md:h-8 text-red-600 shrink-0" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 md:p-6">
            <div className="flex items-center justify-between gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-600 dark:text-gray-400">Avg Prep Time</p>
                <p className="text-2xl md:text-3xl font-bold text-purple-600">{stats.avgPrepTime.toFixed(0)} min</p>
              </div>
              <ClockIcon className="w-7 h-7 md:w-8 md:h-8 text-purple-600 shrink-0" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 md:p-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-600 dark:text-gray-400">Avg Rating</p>
                <p className="text-2xl md:text-3xl font-bold text-yellow-600">
                  {stats.avgPopularity > 0 ? stats.avgPopularity.toFixed(1) : '0.0'}
                </p>
                {stats.avgPopularity > 0 && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Based on reviews
                  </p>
                )}
              </div>
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
        exportOptions={{
          columns: [
            { key: 'name', label: 'Menu Item' },
            { key: 'price', label: 'Price', format: (value) => formatCurrency(value || 0) },
            { key: 'preparationTime', label: 'Prep Time (min)' },
            { key: 'category', label: 'Category', format: (value, row) => {
              if (typeof value === 'object' && value?.name) return value.name;
              if (typeof value === 'string') return value;
              return row.categoryId || 'N/A';
            }},
            { key: 'isAvailable', label: 'Status', format: (value) => value ? 'Available' : 'Unavailable' },
            { key: 'popularity', label: 'Rating', format: (value, row) => {
              const rating = menuItemsRatings[row.id]?.averageRating || 0;
              return rating > 0 ? rating.toFixed(1) : '0.0';
            }},
            { key: 'description', label: 'Description' },
            { key: 'createdAt', label: 'Created At', format: (value) => value ? formatDateTime(value) : '' },
          ],
          excludeColumns: ['actions', 'imageUrl', 'images'],
        }}
        onExport={(_format, _items) => {
          // Export is handled automatically by ExportButton component
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
                    {(() => {
                      const rating = menuItemsRatings[selectedMenuItem.id]?.averageRating || 0;
                      const totalReviews = menuItemsRatings[selectedMenuItem.id]?.totalReviews || 0;
                      return (
                        <>
                          {renderStars(rating)}
                          <span className="text-sm text-gray-600 dark:text-gray-400 ml-1">
                            ({rating.toFixed(1)})
                          </span>
                          {totalReviews > 0 && (
                            <span className="text-xs text-gray-500 dark:text-gray-400 ml-2">
                              {totalReviews} {totalReviews === 1 ? 'review' : 'reviews'}
                            </span>
                          )}
                        </>
                      );
                    })()}
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
                onChange={(e) => {
                  setFormData({ ...formData, name: e.target.value });
                  clearFormError('name');
                }}
                placeholder="Menu item name"
                className={formErrors.name ? 'border-red-500' : ''}
              />
              {formErrors.name && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">{formErrors.name}</p>
              )}
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
                <>
                  <Select
                    options={categories.map((cat: any) => ({ value: String(cat.id), label: cat.name }))}
                    value={formData.categoryId ? String(formData.categoryId) : ''}
                    onChange={(value) => {
                      setFormData({ ...formData, categoryId: value });
                      clearFormError('categoryId');
                    }}
                    placeholder="Select category"
                    className={formErrors.categoryId ? 'border-red-500' : ''}
                  />
                  {formErrors.categoryId && (
                    <p className="mt-1 text-sm text-red-600 dark:text-red-400">{formErrors.categoryId}</p>
                  )}
                </>
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
                onChange={(e) => {
                  setFormData({ ...formData, description: e.target.value });
                  clearFormError('description');
                }}
                placeholder="Menu item description"
                rows={3}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white ${
                  formErrors.description ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                }`}
              />
              {formErrors.description && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">{formErrors.description}</p>
              )}
            </div>
          {/* Image Upload Section */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Images
            </label>
            <div className="grid grid-cols-4 gap-4 mb-2">
              {formData.images.map((image, index) => (
                <div key={index} className="relative group">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={image}
                    alt={`Menu item ${index + 1}`}
                    className="w-full h-24 object-cover rounded-lg border border-gray-300 dark:border-gray-600"
                  />
                  <button
                    onClick={() => removeImage(index)}
                    className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <XMarkIcon className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
            <label className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors">
              <PhotoIcon className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Upload Images</span>
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={handleImageUpload}
                className="hidden"
              />
            </label>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Upload one or more images for this menu item</p>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Price *
              </label>
              <Input
                type="number"
                value={formData.price}
                onChange={(e) => {
                  setFormData({ ...formData, price: Number(e.target.value) });
                  clearFormError('price');
                }}
                placeholder="0.00"
                min="0"
                step="0.01"
                className={formErrors.price ? 'border-red-500' : ''}
              />
              {formErrors.price && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">{formErrors.price}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Prep Time (min)
              </label>
              <Input
                type="number"
                value={formData.preparationTime}
                onChange={(e) => {
                  setFormData({ ...formData, preparationTime: Number(e.target.value) });
                  clearFormError('preparationTime');
                }}
                placeholder="0"
                min="0"
                className={formErrors.preparationTime ? 'border-red-500' : ''}
              />
              {formErrors.preparationTime && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">{formErrors.preparationTime}</p>
              )}
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
            <div className="flex items-center pt-4">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.trackInventory}
                  onChange={(e) => setFormData({ ...formData, trackInventory: e.target.checked })}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Track Inventory</span>
              </label>
              <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">
                (Enable to automatically decrease ingredient stock when orders are created)
              </span>
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
                        options={availableIngredients.map((ing: any) => ({
                          value: String(ing.id),
                          label: `${ing.name} (${ing.unit || 'pcs'})`,
                        }))}
                        value={ingredient.ingredientId || ''}
                        onChange={(value) => {
                          if (!value || value === '') {
                            return; // Don't update if empty value
                          }
                          const selectedIng = availableIngredients.find((ing: any) => String(ing.id) === String(value));
                          // Update both ingredientId and unit in a single state update to avoid race conditions
                          setFormData((prev) => {
                            const newIngredients = [...prev.ingredients];
                            if (!newIngredients[index]) {
                              newIngredients[index] = { ingredientId: '', quantity: 0, unit: 'pcs' };
                            }
                            newIngredients[index] = {
                              ...newIngredients[index],
                              ingredientId: String(value),
                              unit: selectedIng ? (selectedIng.unit || 'pcs') : newIngredients[index].unit,
                            };
                            return { ...prev, ingredients: newIngredients };
                          });
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
          {/* Variants Section (Size variants like Small, Medium, Large) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Variants (e.g., Size: Small, Medium, Large)
            </label>
            <div className="space-y-4">
              {formData.variants.map((variant, variantIndex) => (
                <div key={variantIndex} className="border border-gray-300 dark:border-gray-600 rounded-lg p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <Input
                      value={variant.name}
                      onChange={(e) => updateVariant(variantIndex, 'name', e.target.value)}
                      placeholder="Variant name (e.g., Size)"
                      className="max-w-xs"
                    />
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => removeVariant(variantIndex)}
                    >
                      <TrashIcon className="w-4 h-4" />
                    </Button>
                  </div>
                  <div className="space-y-2 pl-4">
                    {variant.options.map((option, optionIndex) => (
                      <div key={optionIndex} className="grid grid-cols-12 gap-2 items-center">
                        <div className="col-span-5">
                          <Input
                            value={option.name}
                            onChange={(e) => updateVariantOption(variantIndex, optionIndex, 'name', e.target.value)}
                            placeholder="Option name (e.g., Small)"
                          />
                        </div>
                        <div className="col-span-5">
                          <Input
                            type="number"
                            value={option.priceModifier}
                            onChange={(e) => updateVariantOption(variantIndex, optionIndex, 'priceModifier', Number(e.target.value))}
                            placeholder="Price modifier"
                            step="0.01"
                          />
                        </div>
                        <div className="col-span-2">
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => removeVariantOption(variantIndex, optionIndex)}
                          >
                            <XMarkIcon className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => addVariantOption(variantIndex)}
                    >
                      + Add Option
                    </Button>
                  </div>
                </div>
              ))}
              <Button
                variant="secondary"
                size="sm"
                onClick={addVariant}
              >
                + Add Variant
              </Button>
            </div>
          </div>
          {/* Selections Section (Customization options like Toppings, Extras) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Selections (Customization options)
            </label>
            <div className="space-y-4">
              {formData.selections.map((selection, selectionIndex) => (
                <div key={selectionIndex} className="border border-gray-300 dark:border-gray-600 rounded-lg p-4 space-y-3">
                  <div className="grid grid-cols-12 gap-2 items-center">
                    <div className="col-span-4">
                      <Input
                        value={selection.name}
                        onChange={(e) => updateSelection(selectionIndex, 'name', e.target.value)}
                        placeholder="Selection name"
                      />
                    </div>
                    <div className="col-span-3">
                      <Select
                        options={[
                          { value: 'single', label: 'Single' },
                          { value: 'multi', label: 'Multi' },
                          { value: 'optional', label: 'Optional' },
                        ]}
                        value={selection.type}
                        onChange={(value) => updateSelection(selectionIndex, 'type', value as 'single' | 'multi' | 'optional')}
                        placeholder="Type"
                      />
                    </div>
                    <div className="col-span-4 flex items-center gap-2">
                      <label className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={selection.type === 'optional'}
                          onChange={(e) => updateSelection(selectionIndex, 'type', e.target.checked ? 'optional' : 'single')}
                          className="h-4 w-4"
                        />
                        <span>Optional</span>
                      </label>
                    </div>
                    <div className="col-span-1">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => removeSelection(selectionIndex)}
                      >
                        <TrashIcon className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                  <div className="space-y-2 pl-4">
                    <label className="block text-xs font-medium text-gray-600 dark:text-gray-400">Options</label>
                    {selection.options.map((option, optionIndex) => (
                      <div key={optionIndex} className="grid grid-cols-12 gap-2 items-center">
                        <div className="col-span-5">
                          <Input
                            value={option.name}
                            onChange={(e) => updateSelectionOption(selectionIndex, optionIndex, 'name', e.target.value)}
                            placeholder="Option name"
                          />
                        </div>
                        <div className="col-span-5">
                          <Input
                            type="number"
                            value={option.price}
                            onChange={(e) => updateSelectionOption(selectionIndex, optionIndex, 'price', Number(e.target.value))}
                            placeholder="Price"
                            step="0.01"
                            min="0"
                          />
                        </div>
                        <div className="col-span-2">
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => removeSelectionOption(selectionIndex, optionIndex)}
                          >
                            <XMarkIcon className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => addSelectionOption(selectionIndex)}
                    >
                      + Add Option
                    </Button>
                  </div>
                </div>
              ))}
              <Button
                variant="secondary"
                size="sm"
                onClick={addSelection}
              >
                + Add Selection
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