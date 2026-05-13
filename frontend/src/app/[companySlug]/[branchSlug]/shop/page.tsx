'use client';
/* eslint-disable @next/next/no-img-element */
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { useGetBranchMenuQuery, useGetCompanyBySlugQuery } from '@/lib/api/endpoints/publicApi';
import { formatCurrency } from '@/lib/utils';
import { ChevronLeftIcon, ChevronRightIcon, ClockIcon, ExclamationTriangleIcon, MagnifyingGlassIcon, MinusIcon, PlusIcon, ShoppingCartIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { Modal } from '@/components/ui/Modal';
import { RadioGroup, RadioGroupItem } from '@/components/ui/RadioGroup';
import { Checkbox } from '@/components/ui/Checkbox';
import { Label } from '@/components/ui/Label';
import { Badge } from '@/components/ui/Badge';
import Link from 'next/link';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';

interface CartItem {
  id: string;
  uniqueId: string;
  name: string;
  price: number;
  quantity: number;
  image?: string;
  selectedVariants?: Record<string, string>;
  selectedSelections?: Record<string, string | string[]>;
  variantDisplay?: string;
  selectionDisplay?: string;
}
export default function BranchShopPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const companySlug = params.companySlug as string;
  const branchSlug = params.branchSlug as string;
  const menuType = searchParams.get('type') || 'full';

  // Modal State
  const [customizingItem, setCustomizingItem] = useState<any>(null);
  const [selectedVariants, setSelectedVariants] = useState<Record<string, string>>({});
  const [selectedSelections, setSelectedSelections] = useState<Record<string, string | string[]>>({});
  const [modalQuantity, setModalQuantity] = useState(1);

  const { 
    data: company, 
    isLoading: companyLoading,
    isError: companyError,
    error: companyErrorData
  } = useGetCompanyBySlugQuery(companySlug, {
    skip: !companySlug,
  });
  const { 
    data: menuData, 
    isLoading: menuLoading,
    isError: menuError,
    error: menuErrorData 
  } = useGetBranchMenuQuery(
    { companySlug, branchSlug, menuType: menuType !== 'full' ? menuType : undefined },
    { skip: !companySlug || !branchSlug }
  );
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 12;
  const [cart, setCart] = useState<CartItem[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem(`cart_${companySlug}_${branchSlug}`);
        const parsed = saved ? JSON.parse(saved) : [];
        // Ensure items have uniqueId
        return parsed.map((item: any) => ({
          ...item,
          uniqueId: item.uniqueId || item.id
        }));
      } catch (error) {
        console.error('Failed to load cart from localStorage:', error);
        return [];
      }
    }
    return [];
  });

  // Capture table number from URL and store in sessionStorage
  const tableNumber = searchParams.get('table');
  useEffect(() => {
    if (tableNumber) {
      sessionStorage.setItem('qr_table_number', tableNumber);
      // Also clear any previous table status to ensure a fresh session
      sessionStorage.removeItem('lastOrderStatus');
    }
  }, [tableNumber]);

  // Show error toast if API errors occur
  useEffect(() => {
    if (companyError) {
      toast.error('Failed to load company information');
    }
    if (menuError) {
      const errorMessage = (menuErrorData as any)?.data?.message || 'Failed to load menu';
      toast.error(errorMessage);
    }
  }, [companyError, menuError, menuErrorData]);
  // Save cart to localStorage whenever it changes
  useEffect(() => {
    if (typeof window !== 'undefined' && cart.length >= 0) {
      try {
        localStorage.setItem(`cart_${companySlug}_${branchSlug}`, JSON.stringify(cart));
      } catch (error) {
        console.error('Failed to save cart to localStorage:', error);
        toast.error('Failed to save cart. Please try again.');
      }
    }
  }, [cart, companySlug, branchSlug]);
  const categories = useMemo(() => {
    const cats = menuData?.categories;
    if (!Array.isArray(cats)) return [];
    return cats.map((cat: any) => ({
      ...cat,
      id: cat.id || cat._id
    }));
  }, [menuData?.categories]);
  const menuItems = useMemo(() => {
    let items = menuData?.menuItems;
    // Extract items if they are nested
    if (items && typeof items === 'object' && !Array.isArray(items) && Array.isArray((items as any).menuItems)) {
      items = (items as any).menuItems;
    }
    if (!Array.isArray(items)) return [];
    
    // Normalize items: ensure they have 'id' and clean up category refs
    return items.map((item: any) => ({
      ...item,
      id: item.id || item._id,
      categoryIdString: (
        item.categoryId?._id || 
        item.categoryId?.id || 
        (typeof item.categoryId === 'string' ? item.categoryId : null) ||
        item.category?._id || 
        item.category?.id || 
        (typeof item.category === 'string' ? item.category : null)
      )?.toString()
    }));
  }, [menuData?.menuItems]);
  // Combined filtering: category + search + availability
  const filteredItems = useMemo(() => {
    if (!Array.isArray(menuItems)) {
      console.error('menuItems is not an array:', menuItems);
      return [];
    }
    let filtered = menuItems.filter((item: any) => item.isAvailable !== false);
    // Filter by category
    if (selectedCategory !== 'all') {
      filtered = filtered.filter((item: any) => item.categoryIdString === selectedCategory);
    }
    // Filter by search query (searches in name, description, and category name)
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter((item: any) => {
        const nameMatch = item.name?.toLowerCase().includes(query);
        const descriptionMatch = item.description?.toLowerCase().includes(query);
        const categoryName = typeof item.category === 'object' && item.category?.name
          ? item.category.name.toLowerCase()
          : categories.find((cat: any) => cat.id === item.categoryIdString)?.name?.toLowerCase();
        const categoryMatch = categoryName?.includes(query);
        return nameMatch || descriptionMatch || categoryMatch;
      });
    }
    return filtered;
  }, [menuItems, selectedCategory, searchQuery, categories]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedCategory, searchQuery]);

  // Pagination logic
  const totalPages = Math.ceil(filteredItems.length / itemsPerPage);
  const paginatedItems = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredItems.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredItems, currentPage, itemsPerPage]);

  const hasModifiers = (item: any) => {
    return (item.variants?.length > 0) || (item.selections?.length > 0);
  };

  const handleQuickCustomize = (item: any) => {
    setCustomizingItem(item);
    setModalQuantity(1);
    
    // Initial variants
    const initialVariants: Record<string, string> = {};
    item.variants?.forEach((v: any) => {
      if (v.options?.length > 0) initialVariants[v.name] = v.options[0].name;
    });
    setSelectedVariants(initialVariants);

    // Initial selections
    const initialSelections: Record<string, string | string[]> = {};
    item.selections?.forEach((s: any) => {
      if (s.type === 'single' && s.options?.length > 0) {
        initialSelections[s.name] = s.options[0].name;
      } else if (s.type === 'multi') {
        initialSelections[s.name] = [];
      }
    });
    setSelectedSelections(initialSelections);
  };

  const calculateItemPrice = (item: any, variants: Record<string, string>, selections: Record<string, string | string[]>) => {
    if (!item) return 0;
    let price = item.price || 0;
    // Variants
    Object.entries(variants).forEach(([vName, oName]) => {
      const variant = item.variants?.find((v: any) => v.name === vName);
      const option = variant?.options.find((o: any) => o.name === oName);
      if (option?.priceModifier) price += option.priceModifier;
    });
    // Selections
    Object.entries(selections).forEach(([sName, value]) => {
      const selection = item.selections?.find((s: any) => s.name === sName);
      if (Array.isArray(value)) {
        value.forEach(oName => {
          const option = selection?.options.find((o: any) => o.name === oName);
          if (option?.price) price += option.price;
        });
      } else {
        const option = selection?.options.find((o: any) => o.name === value);
        if (option?.price) price += option.price;
      }
    });
    return price;
  };

  const addToCart = (item: any, variants?: Record<string, string>, selections?: Record<string, string | string[]>, quantity: number = 1) => {
    if (!item.isAvailable) {
      toast.error('This item is currently unavailable');
      return;
    }

    const currentVariants = variants || {};
    const currentSelections = selections || {};
    const pricePerItem = calculateItemPrice(item, currentVariants, currentSelections);
    
    const uniqueId = `${item.id}-${JSON.stringify(currentVariants)}-${JSON.stringify(currentSelections)}`;

    setCart(prev => {
      const existing = prev.find(c => c.uniqueId === uniqueId);
      if (existing) {
        return prev.map(c => c.uniqueId === uniqueId ? { ...c, quantity: c.quantity + quantity } : c);
      }
      return [...prev, {
        id: item.id,
        uniqueId,
        name: item.name,
        price: pricePerItem,
        quantity,
        image: item.images?.[0],
        selectedVariants: currentVariants,
        selectedSelections: currentSelections,
        variantDisplay: Object.entries(currentVariants).map(([k, v]) => `${k}: ${v}`).join(', '),
        selectionDisplay: Object.entries(currentSelections)
          .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : v}`)
          .join(', '),
      }];
    });
    
    toast.success(`${item.name} added to cart`);
    setCustomizingItem(null);
  };

  const updateQuantity = (uniqueId: string, delta: number) => {
    setCart(prevCart => {
      const updated = prevCart.map(c => {
        if (c.uniqueId === uniqueId) {
          const newQuantity = c.quantity + delta;
          if (newQuantity <= 0) return null;
          return { ...c, quantity: newQuantity };
        }
        return c;
      }).filter(Boolean) as CartItem[];
      return updated;
    });
  };

  const cartTotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);
  // Get company name from menu data if company query fails
  const companyName = company?.name || (menuData?.branch as any)?.companyId?.name || 'Restaurant';
  // Update page title when company data is available
  useEffect(() => {
    if (company?.name) {
      document.title = `${company.name} - Order Online`;
    }
  }, [company?.name]);
  // Debug logging
  useEffect(() => {
    // Debug logging removed
  }, [companySlug, branchSlug, companyLoading, companyError, company, menuLoading, menuError, menuData, companyErrorData]);
  if (companyLoading || menuLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading menu...</p>
        </div>
      </div>
    );
  }
  // Only show error if menu query fails (menu is required)
  // Company query failure is not critical - we can use menu data for company name
  if (menuError || (!menuData && !menuLoading)) {
    const errorMessage = (menuErrorData as any)?.data?.message || 
                        (menuErrorData as any)?.message || 
                        'Menu not available';
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4">
        <Card className="max-w-md w-full">
          <CardContent className="p-8 text-center">
            <ExclamationTriangleIcon className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Menu Not Available</h1>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              {errorMessage}
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-500 mb-6">
              Unable to load the menu. Please try again later.
            </p>
            <div className="flex gap-3 justify-center">
              <Button onClick={() => window.location.reload()}>
                Retry
              </Button>
              <Button variant="secondary" onClick={() => router.push('/')}>
                Go to Homepage
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow-sm sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 md:py-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex-1 min-w-0">
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white truncate">
                {companyName}
              </h1>
              <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">
                Select items from our menu
              </p>
            </div>
            
            {tableNumber && (
              <div className="bg-primary-50 dark:bg-primary-900/20 border border-primary-200 dark:border-primary-800 px-4 py-2 rounded-lg flex items-center gap-2 animate-pulse">
                <span className="text-primary-600 dark:text-primary-400 font-bold text-sm sm:text-base">
                  📍 Table {tableNumber}
                </span>
              </div>
            )}

            <Link href={`/${companySlug}/${branchSlug}/cart`} className="w-full sm:w-auto">
              <Button className="relative w-full sm:w-auto">
                <ShoppingCartIcon className="w-5 h-5 mr-2" />
                Cart
                {cartCount > 0 && (
                  <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">
                    {cartCount}
                  </span>
                )}
              </Button>
            </Link>
          </div>
        </div>
      </header>
      {/* Search and Category Filter */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-[73px] sm:top-[81px] z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 md:py-5">
          {/* Search Bar */}
          <div className="mb-4 md:mb-5">
            <div className="relative max-w-md mx-auto">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 dark:text-gray-500" />
              <Input
                type="text"
                placeholder="Search menu items..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-10 w-full"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                  aria-label="Clear search"
                >
                  <XMarkIcon className="w-5 h-5" />
                </button>
              )}
            </div>
            {searchQuery && (
              <p className="text-sm text-gray-600 dark:text-gray-400 text-center mt-2">
                {filteredItems.length} {filteredItems.length === 1 ? 'item' : 'items'} found
              </p>
            )}
          </div>
          {/* Category Filter */}
          {categories.length > 0 && (
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
              <button
                onClick={() => {
                  setSelectedCategory('all');
                  setSearchQuery('');
                  setCurrentPage(1);
                }}
                className={`px-3 md:px-4 py-2 rounded-full whitespace-nowrap text-sm md:text-base transition-colors ${
                  selectedCategory === 'all'
                    ? 'bg-gray-900 dark:bg-gray-700 text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                All
              </button>
              {categories.map((category: any, index: number) => (
                <button
                  key={category.id || category._id || `category-${index}`}
                  onClick={() => {
                    setSelectedCategory(category.id || category._id);
                    setCurrentPage(1);
                  }}
                  className={`px-3 md:px-4 py-2 rounded-full whitespace-nowrap text-sm md:text-base transition-colors ${
                    selectedCategory === (category.id || category._id)
                      ? 'bg-gray-900 dark:bg-gray-700 text-white'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                >
                  {category.name}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
      {/* Menu Items */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-8">
        {filteredItems.length === 0 ? (
          <Card>
            <CardContent className="p-8 md:p-12 text-center">
              {searchQuery ? (
                <>
                  <MagnifyingGlassIcon className="w-12 h-12 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
                  <p className="text-gray-600 dark:text-gray-400 mb-2">
                    No items found for &quot;{searchQuery}&quot;
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-500 mb-4">
                    Try a different search term or clear your filters
                  </p>
                  <Button
                    variant="secondary"
                    onClick={() => {
                      setSearchQuery('');
                      setSelectedCategory('all');
                      setCurrentPage(1);
                    }}
                  >
                    Clear Filters
                  </Button>
                </>
              ) : (
                <p className="text-gray-600 dark:text-gray-400">
                  {selectedCategory === 'all' 
                    ? 'No items available at the moment.' 
                    : 'No items available in this category.'}
                </p>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
            {paginatedItems.map((item: any) => {
              const cartItem = cart.find(c => c.id === item.id);
              return (
                <Card 
                  key={item.id} 
                  className="hover:shadow-lg transition-all duration-200 hover:scale-[1.02] overflow-hidden flex flex-col"
                >
                  <Link href={`/${companySlug}/${branchSlug}/shop/${item.id}`}>
                    <div className="aspect-square bg-gray-100 dark:bg-gray-800 relative cursor-pointer overflow-hidden">
                      {item.images && item.images.length > 0 ? (
                        <img
                          src={item.images[0]}
                          alt={item.name}
                          className="w-full h-full object-cover transition-transform duration-200 hover:scale-110"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none';
                            const parent = (e.target as HTMLImageElement).parentElement;
                            if (parent) {
                              parent.innerHTML = '<div class="w-full h-full flex items-center justify-center text-gray-400 dark:text-gray-500 text-4xl">🍽️</div>';
                            }
                          }}
                          loading="lazy"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-400 dark:text-gray-500 text-4xl">
                          🍽️
                        </div>
                      )}
                      {!item.isAvailable && (
                        <div className="absolute inset-0 bg-black bg-opacity-60 dark:bg-opacity-70 flex items-center justify-center">
                          <span className="text-white font-semibold text-sm md:text-base">Unavailable</span>
                        </div>
                      )}
                    </div>
                  </Link>
                  <CardContent className="p-3 md:p-4 flex-1 flex flex-col">
                    <Link href={`/${companySlug}/${branchSlug}/shop/${item.id}`}>
                      <h3 className="font-semibold text-gray-900 dark:text-white mb-1 hover:text-primary-600 dark:hover:text-primary-400 cursor-pointer line-clamp-2">
                        {item.name}
                      </h3>
                    </Link>
                    {item.description && (
                      <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mb-2 line-clamp-2">
                        {item.description}
                      </p>
                    )}
                    <div className="flex flex-wrap gap-1.5 mb-3">
                      {item.preparationTime > 0 && (
                        <Badge variant="secondary" className="text-[10px] py-0 px-1.5 flex items-center gap-1">
                          <ClockIcon className="w-3 h-3" />
                          {item.preparationTime}m
                        </Badge>
                      )}
                      {item.allergens?.slice(0, 2).map((allergen: string) => (
                        <Badge key={allergen} variant="danger" className="text-[10px] py-0 px-1.5 bg-red-50 text-red-600 border-red-100 flex items-center gap-1">
                          <ExclamationTriangleIcon className="w-3 h-3" />
                          {allergen}
                        </Badge>
                      ))}
                      {item.allergens?.length > 2 && (
                        <span className="text-[10px] text-gray-400">+{item.allergens.length - 2} more</span>
                      )}
                    </div>
                    <div className="flex items-center justify-between mt-auto pt-2">
                      <span className="text-base sm:text-lg font-bold text-green-600 dark:text-green-400">
                        {formatCurrency(item.price)}
                      </span>
                      {hasModifiers(item) ? (
                        <Button
                          size="sm"
                          onClick={() => handleQuickCustomize(item)}
                          disabled={!item.isAvailable}
                          className="text-xs sm:text-sm bg-primary-600 hover:bg-primary-700"
                        >
                          Customize
                        </Button>
                      ) : (
                        <>
                          {cartItem ? (
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => updateQuantity(cartItem.uniqueId, -1)}
                                className="p-1.5 rounded-full bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                                aria-label="Decrease quantity"
                              >
                                <MinusIcon className="w-4 h-4" />
                              </button>
                              <span className="font-semibold w-6 sm:w-8 text-center text-sm sm:text-base">
                                {cart.filter(c => c.id === item.id).reduce((sum, c) => sum + c.quantity, 0)}
                              </span>
                              <button
                                onClick={() => updateQuantity(cartItem.uniqueId, 1)}
                                className="p-1.5 rounded-full bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                                aria-label="Increase quantity"
                              >
                                <PlusIcon className="w-4 h-4" />
                              </button>
                            </div>
                          ) : (
                            <Button
                              size="sm"
                              onClick={() => addToCart(item)}
                              disabled={!item.isAvailable}
                              className="text-xs sm:text-sm"
                            >
                              <PlusIcon className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
                              Add
                            </Button>
                          )}
                        </>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="mt-12 flex flex-col sm:flex-row items-center justify-center gap-4">
            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="h-10 w-10 p-0 rounded-full"
              >
                <ChevronLeftIcon className="w-5 h-5" />
              </Button>
              
              <div className="flex items-center gap-1">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
                  // Show current page, and up to 1 page around it, and first/last pages
                  if (
                    page === 1 || 
                    page === totalPages || 
                    (page >= currentPage - 1 && page <= currentPage + 1)
                  ) {
                    return (
                      <button
                        key={page}
                        onClick={() => setCurrentPage(page)}
                        className={`h-10 w-10 rounded-full text-sm font-medium transition-all ${
                          currentPage === page
                            ? 'bg-gray-900 dark:bg-gray-700 text-white shadow-md'
                            : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700'
                        }`}
                      >
                        {page}
                      </button>
                    );
                  } else if (
                    (page === 2 && currentPage > 3) || 
                    (page === totalPages - 1 && currentPage < totalPages - 2)
                  ) {
                    return <span key={page} className="px-1 text-gray-400">...</span>;
                  }
                  return null;
                })}
              </div>

              <Button
                variant="secondary"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                className="h-10 w-10 p-0 rounded-full"
              >
                <ChevronRightIcon className="w-5 h-5" />
              </Button>
            </div>
            
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, filteredItems.length)} of {filteredItems.length} items
            </p>
          </div>
        )}
      </main>
      {/* Floating Cart Button */}
      {cartCount > 0 && (
        <Link href={`/${companySlug}/${branchSlug}/cart`}>
          <div className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 bg-gray-900 dark:bg-gray-800 text-white px-4 py-3 sm:px-6 sm:py-3 rounded-full shadow-lg hover:bg-gray-800 dark:hover:bg-gray-700 transition-all duration-200 hover:scale-105 cursor-pointer flex items-center gap-2 z-30">
            <ShoppingCartIcon className="w-5 h-5" />
            <span className="font-semibold text-sm sm:text-base">{cartCount} {cartCount === 1 ? 'item' : 'items'}</span>
            <span className="font-bold">•</span>
            <span className="font-semibold text-sm sm:text-base">{formatCurrency(cartTotal)}</span>
          </div>
        </Link>
      )}
      {/* Quick Customize Modal */}
      <Modal 
        isOpen={!!customizingItem} 
        onClose={() => setCustomizingItem(null)}
        title={`Customize ${customizingItem?.name || ''}`}
        size="md"
      >
        {customizingItem && (
          <div className="space-y-6 py-2">
            {/* Info Badges */}
            <div className="flex flex-wrap gap-2">
              {customizingItem.preparationTime > 0 && (
                <Badge variant="secondary" className="flex items-center gap-1 py-1 px-2 text-[10px]">
                  <ClockIcon className="w-3 h-3" />
                  {customizingItem.preparationTime} mins
                </Badge>
              )}
              {customizingItem.allergens?.map((allergen: string) => (
                <Badge key={allergen} variant="danger" className="flex items-center gap-1 py-1 px-2 text-[10px] bg-red-50 text-red-700 border-red-100">
                  <ExclamationTriangleIcon className="w-3 h-3" />
                  {allergen}
                </Badge>
              ))}
            </div>

            {/* Variants */}
            {customizingItem?.variants?.map((variant: any) => (
              <div key={variant.name}>
                <Label className="text-base font-bold mb-3 block">{variant.name}</Label>
                <RadioGroup
                  value={selectedVariants[variant.name]}
                  onValueChange={(val: string) => setSelectedVariants(prev => ({ ...prev, [variant.name]: val }))}
                  className="flex flex-wrap gap-2"
                >
                  {variant.options.map((option: any) => (
                    <div key={option.name} className="flex items-center">
                      <RadioGroupItem
                        value={option.name}
                        id={`modal-variant-${variant.name}-${option.name}`}
                        className="peer sr-only"
                      />
                      <Label
                        htmlFor={`modal-variant-${variant.name}-${option.name}`}
                        className="px-3 py-1.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-full cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 peer-data-[state=checked]:bg-primary-600 peer-data-[state=checked]:text-white peer-data-[state=checked]:border-primary-600 transition-all text-sm font-medium"
                      >
                        {option.name}
                        {option.priceModifier > 0 && <span className="ml-1 text-xs opacity-80">(+{formatCurrency(option.priceModifier)})</span>}
                      </Label>
                    </div>
                  ))}
                </RadioGroup>
              </div>
            ))}

            {/* Selections */}
            {customizingItem?.selections?.map((selection: any) => (
              <div key={selection.name}>
                <div className="flex items-center justify-between mb-3">
                  <Label className="text-base font-bold">{selection.name}</Label>
                  {selection.type === 'multi' && <Badge variant="secondary" className="text-[10px] uppercase">Multi</Badge>}
                </div>
                
                <div className="grid grid-cols-1 gap-2">
                  {selection.options.map((option: any) => (
                    <div key={option.name} className="flex items-center justify-between p-3 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                      <div className="flex items-center gap-3">
                        {selection.type === 'multi' ? (
                          <Checkbox 
                            id={`modal-selection-${selection.name}-${option.name}`}
                            checked={(selectedSelections[selection.name] as string[] || []).includes(option.name)}
                            onChange={(e) => {
                              const checked = e.target.checked;
                              const current = (selectedSelections[selection.name] as string[] || []);
                              if (checked) {
                                setSelectedSelections(prev => ({ ...prev, [selection.name]: [...current, option.name] }));
                              } else {
                                setSelectedSelections(prev => ({ ...prev, [selection.name]: current.filter(n => n !== option.name) }));
                              }
                            }}
                          />
                        ) : (
                          <RadioGroup
                            value={selectedSelections[selection.name] as string}
                            onValueChange={(val: string) => setSelectedSelections(prev => ({ ...prev, [selection.name]: val }))}
                          >
                            <div className="flex items-center gap-3">
                              <RadioGroupItem value={option.name} id={`modal-selection-${selection.name}-${option.name}`} />
                            </div>
                          </RadioGroup>
                        )}
                        <Label htmlFor={`modal-selection-${selection.name}-${option.name}`} className="cursor-pointer">{option.name}</Label>
                      </div>
                      {option.price > 0 && <span className="text-sm font-medium">+{formatCurrency(option.price)}</span>}
                    </div>
                  ))}
                </div>
              </div>
            ))}

            {/* Quantity */}
            <div className="flex items-center justify-between pt-4 border-t border-gray-100 dark:border-gray-800">
              <div className="flex items-center gap-3">
                <Button 
                  variant="secondary" 
                  size="sm" 
                  onClick={() => setModalQuantity(Math.max(1, modalQuantity - 1))}
                  disabled={modalQuantity <= 1}
                >
                  <MinusIcon className="w-4 h-4" />
                </Button>
                <span className="font-bold text-lg w-8 text-center">{modalQuantity}</span>
                <Button 
                  variant="secondary" 
                  size="sm" 
                  onClick={() => setModalQuantity(modalQuantity + 1)}
                >
                  <PlusIcon className="w-4 h-4" />
                </Button>
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-500 uppercase font-bold tracking-wider">Total Price</p>
                <p className="text-xl font-bold text-primary-600 dark:text-primary-400">
                  {formatCurrency(calculateItemPrice(customizingItem, selectedVariants, selectedSelections) * modalQuantity)}
                </p>
              </div>
            </div>

            <Button 
              className="w-full" 
              size="lg"
              onClick={() => addToCart(customizingItem, selectedVariants, selectedSelections, modalQuantity)}
            >
              Add to Cart
            </Button>
          </div>
        )}
      </Modal>
    </div>
  );
}
