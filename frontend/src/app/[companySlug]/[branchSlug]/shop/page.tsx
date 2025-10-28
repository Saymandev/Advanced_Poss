'use client';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { useGetBranchMenuQuery, useGetCompanyBySlugQuery } from '@/lib/api/endpoints/publicApi';
import { formatCurrency } from '@/lib/utils';
import { MinusIcon, PlusIcon, ShoppingCartIcon } from '@heroicons/react/24/outline';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';

interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  image?: string;
}

export default function BranchShopPage() {
  const params = useParams();
  const companySlug = params.companySlug as string;
  const branchSlug = params.branchSlug as string;

  const { data: company } = useGetCompanyBySlugQuery(companySlug);
  const { data: menuData, isLoading } = useGetBranchMenuQuery({ companySlug, branchSlug });
  
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [cart, setCart] = useState<CartItem[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(`cart_${companySlug}_${branchSlug}`);
      return saved ? JSON.parse(saved) : [];
    }
    return [];
  });

  // Save cart to localStorage whenever it changes
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(`cart_${companySlug}_${branchSlug}`, JSON.stringify(cart));
    }
  }, [cart, companySlug, branchSlug]);

  const categories = menuData?.categories || [];
  const menuItems = menuData?.menuItems || [];

  const filteredItems = selectedCategory === 'all'
    ? menuItems
    : menuItems.filter((item: any) => item.category?.id === selectedCategory || item.categoryId === selectedCategory);

  const addToCart = (item: any) => {
    const existingItem = cart.find(c => c.id === item.id);
    if (existingItem) {
      setCart(cart.map(c => 
        c.id === item.id ? { ...c, quantity: c.quantity + 1 } : c
      ));
    } else {
      setCart([...cart, {
        id: item.id,
        name: item.name,
        price: item.price,
        quantity: 1,
        image: item.images?.[0],
      }]);
    }
  };

  const updateQuantity = (itemId: string, delta: number) => {
    setCart(cart.map(c => {
      const newQuantity = c.quantity + delta;
      if (newQuantity <= 0) return null;
      return c.id === itemId ? { ...c, quantity: newQuantity } : c;
    }).filter(Boolean) as CartItem[]);
  };

  const cartTotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading menu...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{company?.name}</h1>
              <p className="text-sm text-gray-600">Select items from our menu</p>
            </div>
            <Link href={`/${companySlug}/${branchSlug}/cart`}>
              <Button className="relative">
                <ShoppingCartIcon className="w-5 h-5 mr-2" />
                Cart
                {cartCount > 0 && (
                  <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                    {cartCount}
                  </span>
                )}
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Category Filter */}
      {categories.length > 0 && (
        <div className="bg-white border-b sticky top-[73px] z-10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex gap-2 overflow-x-auto">
              <button
                onClick={() => setSelectedCategory('all')}
                className={`px-4 py-2 rounded-full whitespace-nowrap ${
                  selectedCategory === 'all'
                    ? 'bg-gray-900 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                All
              </button>
              {categories.map((category: any) => (
                <button
                  key={category.id}
                  onClick={() => setSelectedCategory(category.id)}
                  className={`px-4 py-2 rounded-full whitespace-nowrap ${
                    selectedCategory === category.id
                      ? 'bg-gray-900 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {category.name}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Menu Items */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {filteredItems.length === 0 ? (
          <Card>
            <div className="p-8 text-center">
              <p className="text-gray-600">No items available in this category.</p>
            </div>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredItems.map((item: any) => {
              const cartItem = cart.find(c => c.id === item.id);
              return (
                <Card key={item.id} className="hover:shadow-lg transition-shadow overflow-hidden">
                  <Link href={`/${companySlug}/${branchSlug}/shop/${item.id}`}>
                    <div className="aspect-square bg-gray-100 relative cursor-pointer">
                    {item.images && item.images.length > 0 ? (
                      <img
                        src={item.images[0]}
                        alt={item.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-400 text-4xl">
                        🍽️
                      </div>
                    )}
                    {!item.isAvailable && (
                      <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
                        <span className="text-white font-semibold">Unavailable</span>
                      </div>
                    )}
                  </div>
                  </Link>
                  <div className="p-4">
                    <Link href={`/${companySlug}/${branchSlug}/shop/${item.id}`}>
                      <h3 className="font-semibold text-gray-900 mb-1 hover:text-blue-600 cursor-pointer">{item.name}</h3>
                    </Link>
                    {item.description && (
                      <p className="text-sm text-gray-600 mb-2 line-clamp-2">{item.description}</p>
                    )}
                    <div className="flex items-center justify-between mt-4">
                      <span className="text-lg font-bold text-green-600">
                        {formatCurrency(item.price)}
                      </span>
                      {cartItem ? (
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => updateQuantity(item.id, -1)}
                            className="p-1 rounded-full bg-gray-200 hover:bg-gray-300"
                          >
                            <MinusIcon className="w-4 h-4" />
                          </button>
                          <span className="font-semibold w-8 text-center">{cartItem.quantity}</span>
                          <button
                            onClick={() => updateQuantity(item.id, 1)}
                            className="p-1 rounded-full bg-gray-200 hover:bg-gray-300"
                          >
                            <PlusIcon className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <Button
                          size="sm"
                          onClick={() => addToCart(item)}
                          disabled={!item.isAvailable}
                        >
                          <PlusIcon className="w-4 h-4 mr-1" />
                          Add
                        </Button>
                      )}
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </main>

      {/* Floating Cart Button */}
      {cartCount > 0 && (
        <Link href={`/${companySlug}/${branchSlug}/cart`}>
          <div className="fixed bottom-6 right-6 bg-gray-900 text-white px-6 py-3 rounded-full shadow-lg hover:bg-gray-800 transition-colors cursor-pointer flex items-center gap-2">
            <ShoppingCartIcon className="w-5 h-5" />
            <span className="font-semibold">{cartCount} items</span>
            <span className="font-bold">•</span>
            <span className="font-semibold">{formatCurrency(cartTotal)}</span>
          </div>
        </Link>
      )}
    </div>
  );
}

