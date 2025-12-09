'use client';

export const dynamic = 'force-dynamic';

import { Card, CardContent } from '@/components/ui/Card';
import { useGetBranchMenuByIdQuery } from '@/lib/api/endpoints/publicApi';
import { formatCurrency } from '@/lib/utils';
import {
  FireIcon,
  QrCodeIcon,
  ShoppingBagIcon,
  SparklesIcon,
  TableCellsIcon
} from '@heroicons/react/24/outline';
import Image from 'next/image';
import { useSearchParams } from 'next/navigation';
import { Suspense, useMemo, useState } from 'react';

const MENU_TYPE_LABELS: Record<string, string> = {
  full: 'Full Menu',
  food: 'Food Menu',
  drinks: 'Drinks Menu',
  desserts: 'Desserts Menu',
};

function DisplayMenuContent() {
  const searchParams = useSearchParams();
  const branchId = searchParams.get('branchId');
  const tableNumber = searchParams.get('table');
  const menuType = searchParams.get('type') || 'full';

  // All hooks must be called unconditionally at the top level
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const { data: menuData, isLoading, error } = useGetBranchMenuByIdQuery(
    { branchId: branchId || '', menuType },
    { skip: !branchId }
  );

  const menuItems = useMemo(() => {
    if (!menuData?.menuItems) return [];
    let items = Array.isArray(menuData.menuItems) 
      ? menuData.menuItems 
      : (menuData.menuItems as any).menuItems || [];
    
    if (selectedCategory) {
      items = items.filter((item: any) => {
        const itemCategoryId = (item as any).categoryId?.id || 
                              (item as any).categoryId?._id?.toString() ||
                              (item as any).categoryId;
        return itemCategoryId === selectedCategory;
      });
    }
    
    return items;
  }, [menuData?.menuItems, selectedCategory]);

  // During build/SSR, return a simple fallback (after all hooks are called)
  if (typeof window === 'undefined' && !branchId) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-500 via-purple-600 to-pink-600 flex items-center justify-center p-6">
        <Card className="max-w-md w-full">
          <CardContent className="p-8 text-center">
            <QrCodeIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              Menu Display
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Please scan a QR code to view the menu.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!branchId) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-500 via-purple-600 to-pink-600 flex items-center justify-center p-6">
        <Card className="max-w-md w-full">
          <CardContent className="p-8 text-center">
            <QrCodeIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              Invalid QR Code
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Please scan a valid QR code from your table.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-500 via-purple-600 to-pink-600 flex items-center justify-center p-6">
        <Card className="max-w-md w-full">
          <CardContent className="p-8 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600 dark:text-gray-400">Loading menu...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error || !menuData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-500 via-purple-600 to-pink-600 flex items-center justify-center p-6">
        <Card className="max-w-md w-full">
          <CardContent className="p-8 text-center">
            <FireIcon className="w-16 h-16 text-red-400 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              Menu Not Available
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Unable to load the menu. Please try again later or contact staff.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const branch = menuData.branch;
  const allCategories = menuData.categories || [];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-500 via-purple-600 to-pink-600">
      {/* Header */}
      <div className="bg-white/10 backdrop-blur-sm border-b border-white/20 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-white">
                {branch?.name || 'Restaurant Menu'}
              </h1>
              {tableNumber && (
                <p className="text-white/80 text-sm mt-1 flex items-center gap-1">
                  <TableCellsIcon className="w-4 h-4" />
                  Table {tableNumber}
                </p>
              )}
            </div>
            <div className="bg-white/20 backdrop-blur-sm rounded-lg px-4 py-2">
              <p className="text-white text-sm font-medium">
                {MENU_TYPE_LABELS[menuType] || 'Menu'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Category Filter */}
        {allCategories.length > 0 && (
          <div className="mb-6 overflow-x-auto">
            <div className="flex gap-2 pb-2">
              <button
                onClick={() => setSelectedCategory(null)}
                className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-all ${
                  selectedCategory === null
                    ? 'bg-white text-blue-600 shadow-lg'
                    : 'bg-white/20 text-white hover:bg-white/30'
                }`}
              >
                All Items
              </button>
              {allCategories.map((category: any) => {
                const catId = (category as any).id || (category as any)._id?.toString();
                return (
                  <button
                    key={catId}
                    onClick={() => setSelectedCategory(catId)}
                    className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-all ${
                      selectedCategory === catId
                        ? 'bg-white text-blue-600 shadow-lg'
                        : 'bg-white/20 text-white hover:bg-white/30'
                    }`}
                  >
                    {category.name}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Menu Items */}
        {menuItems.length === 0 ? (
          <Card className="bg-white/95 backdrop-blur-sm">
            <CardContent className="p-12 text-center">
              <ShoppingBagIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                No Items Available
              </h2>
              <p className="text-gray-600 dark:text-gray-400">
                {selectedCategory 
                  ? 'No items found in this category.'
                  : 'No menu items available at the moment.'}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {menuItems.map((item: any) => {
              const itemId = (item as any).id || (item as any)._id?.toString();
              const itemImage = (item as any).image || (item as any).images?.[0];
              const itemPrice = (item as any).price || 0;
              const itemName = (item as any).name || 'Unnamed Item';
              const itemDescription = (item as any).description || '';
              const isPopular = (item as any).tags?.includes('popular') || 
                               (item as any).isPopular;

              return (
                <Card 
                  key={itemId} 
                  className="bg-white/95 backdrop-blur-sm hover:shadow-xl transition-all duration-300 overflow-hidden group"
                >
                  <div className="relative h-48 bg-gray-200 dark:bg-gray-700 overflow-hidden">
                    {itemImage ? (
                      <Image
                        src={itemImage}
                        alt={itemName}
                        fill
                        className="object-cover group-hover:scale-110 transition-transform duration-300"
                        unoptimized
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <ShoppingBagIcon className="w-16 h-16 text-gray-400" />
                      </div>
                    )}
                    {isPopular && (
                      <div className="absolute top-2 right-2 bg-yellow-400 text-yellow-900 px-2 py-1 rounded-full text-xs font-bold flex items-center gap-1">
                        <SparklesIcon className="w-3 h-3" />
                        Popular
                      </div>
                    )}
                  </div>
                  <CardContent className="p-4">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">
                      {itemName}
                    </h3>
                    {itemDescription && (
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-3 line-clamp-2">
                        {itemDescription}
                      </p>
                    )}
                    <div className="flex items-center justify-between">
                      <span className="text-xl font-bold text-blue-600 dark:text-blue-400">
                        {formatCurrency(itemPrice)}
                      </span>
                      {item.variants && item.variants.length > 0 && (
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {item.variants.length} variant{item.variants.length > 1 ? 's' : ''}
                        </span>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Footer */}
        <div className="mt-12 text-center text-white/80 text-sm">
          <p>Thank you for dining with us!</p>
          {branch?.address && (
            <p className="mt-1 text-xs text-white/60">
              {branch.address.street}, {branch.address.city}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export default function DisplayMenuPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gradient-to-br from-blue-500 via-purple-600 to-pink-600 flex items-center justify-center p-6">
          <Card className="max-w-md w-full">
            <CardContent className="p-8 text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600 dark:text-gray-400">Loading menu...</p>
            </CardContent>
          </Card>
        </div>
      }
    >
      <DisplayMenuContent />
    </Suspense>
  );
}
