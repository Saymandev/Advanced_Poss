'use client';

/* eslint-disable @next/next/no-img-element */

import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { useGetBranchMenuQuery, useGetCompanyBySlugQuery } from '@/lib/api/endpoints/publicApi';
import { formatCurrency } from '@/lib/utils';
import { ExclamationTriangleIcon, MagnifyingGlassIcon, MinusIcon, PlusIcon, ShoppingCartIcon, XMarkIcon } from '@heroicons/react/24/outline';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';

interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  image?: string;
}

export default function BranchShopPage() {
  const params = useParams();
  const router = useRouter();
  const companySlug = params.companySlug as string;
  const branchSlug = params.branchSlug as string;

  const { 
    data: company, 
    isLoading: companyLoading,
    isError: companyError 
  } = useGetCompanyBySlugQuery(companySlug, {
    skip: !companySlug,
  });
  
  const { 
    data: menuData, 
    isLoading: menuLoading,
    isError: menuError,
    error: menuErrorData 
  } = useGetBranchMenuQuery(
    { companySlug, branchSlug },
    { skip: !companySlug || !branchSlug }
  );
  
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [cart, setCart] = useState<CartItem[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem(`cart_${companySlug}_${branchSlug}`);
        return saved ? JSON.parse(saved) : [];
      } catch (error) {
        console.error('Failed to load cart from localStorage:', error);
        return [];
      }
    }
    return [];
  });

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
    return Array.isArray(cats) ? cats : [];
  }, [menuData?.categories]);
  
  const menuItems = useMemo(() => {
    const items = menuData?.menuItems;
    // Ensure we always have an array
    if (Array.isArray(items)) {
      return items;
    }
    // If it's an object with menuItems property, extract it
    if (items && typeof items === 'object' && Array.isArray((items as any).menuItems)) {
      return (items as any).menuItems;
    }
    return [];
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
      filtered = filtered.filter((item: any) => 
        item.category?.id === selectedCategory || item.categoryId === selectedCategory
      );
    }

    // Filter by search query (searches in name, description, and category name)
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter((item: any) => {
        const nameMatch = item.name?.toLowerCase().includes(query);
        const descriptionMatch = item.description?.toLowerCase().includes(query);
        const categoryName = typeof item.category === 'object' 
          ? item.category?.name?.toLowerCase()
          : categories.find((cat: any) => cat.id === item.categoryId)?.name?.toLowerCase();
        const categoryMatch = categoryName?.includes(query);
        
        return nameMatch || descriptionMatch || categoryMatch;
      });
    }

    return filtered;
  }, [menuItems, selectedCategory, searchQuery, categories]);

  const addToCart = (item: any) => {
    if (!item.isAvailable) {
      toast.error('This item is currently unavailable');
      return;
    }

    if (!item.id || !item.name || !item.price) {
      toast.error('Invalid item data');
      return;
    }

    const existingItem = cart.find(c => c.id === item.id);
    if (existingItem) {
      setCart(cart.map(c => 
        c.id === item.id ? { ...c, quantity: c.quantity + 1 } : c
      ));
      toast.success(`${item.name} added to cart`);
    } else {
      setCart([...cart, {
        id: item.id,
        name: item.name,
        price: item.price,
        quantity: 1,
        image: item.images?.[0],
      }]);
      toast.success(`${item.name} added to cart`);
    }
  };

  const updateQuantity = (itemId: string, delta: number) => {
    setCart(prevCart => {
      const updated = prevCart.map(c => {
        if (c.id === itemId) {
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

  if (companyError || !company) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4">
        <Card className="max-w-md w-full">
          <CardContent className="p-8 text-center">
            <ExclamationTriangleIcon className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Company Not Found</h1>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              The restaurant you're looking for doesn't exist.
            </p>
            <Button onClick={() => router.push('/')}>
              Go to Homepage
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (menuError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4">
        <Card className="max-w-md w-full">
          <CardContent className="p-8 text-center">
            <ExclamationTriangleIcon className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Menu Not Available</h1>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Unable to load the menu. Please try again later.
            </p>
            <Button onClick={() => window.location.reload()}>
              Retry
            </Button>
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
                {company?.name}
              </h1>
              <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">
                Select items from our menu
              </p>
            </div>
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
                }}
                className={`px-3 md:px-4 py-2 rounded-full whitespace-nowrap text-sm md:text-base transition-colors ${
                  selectedCategory === 'all'
                    ? 'bg-gray-900 dark:bg-gray-700 text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                All
              </button>
              {categories.map((category: any) => (
                <button
                  key={category.id}
                  onClick={() => setSelectedCategory(category.id)}
                  className={`px-3 md:px-4 py-2 rounded-full whitespace-nowrap text-sm md:text-base transition-colors ${
                    selectedCategory === category.id
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
            {filteredItems.map((item: any) => {
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
                      <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mb-3 line-clamp-2 flex-1">
                        {item.description}
                      </p>
                    )}
                    <div className="flex items-center justify-between mt-auto pt-2">
                      <span className="text-base sm:text-lg font-bold text-green-600 dark:text-green-400">
                        {formatCurrency(item.price)}
                      </span>
                      {cartItem ? (
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => updateQuantity(item.id, -1)}
                            className="p-1.5 rounded-full bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                            aria-label="Decrease quantity"
                          >
                            <MinusIcon className="w-4 h-4" />
                          </button>
                          <span className="font-semibold w-6 sm:w-8 text-center text-sm sm:text-base">
                            {cartItem.quantity}
                          </span>
                          <button
                            onClick={() => updateQuantity(item.id, 1)}
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
                    </div>
                  </CardContent>
                </Card>
              );
            })}
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
    </div>
  );
}

