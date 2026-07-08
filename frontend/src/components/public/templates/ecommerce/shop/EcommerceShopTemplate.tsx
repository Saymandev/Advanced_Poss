 /* eslint-disable @next/next/no-img-element */
'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useGetBranchMenuQuery, useGetCompanyBySlugQuery } from '@/lib/api/endpoints/publicApi';
import { ShoppingCartIcon, MagnifyingGlassIcon, PlusIcon, MinusIcon, XMarkIcon, StarIcon, CheckBadgeIcon } from '@heroicons/react/24/outline';
import { StarIcon as StarIconSolid } from '@heroicons/react/24/solid';
import { formatCurrency } from '@/lib/utils';

import toast from 'react-hot-toast';

interface CartItem {
  id: string;
  uniqueId: string;
  name: string;
  price: number;
  quantity: number;
  image?: string;
}

export default function EcommerceShopTemplate() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const companySlug = params.companySlug as string;
  const branchSlug = params.branchSlug as string;
  const menuType = searchParams.get('type') || 'full';

  const { data: company, isLoading: companyLoading } = useGetCompanyBySlugQuery(companySlug, { skip: !companySlug });
  const { data: menuData, isLoading: menuLoading } = useGetBranchMenuQuery(
    { companySlug, branchSlug, menuType },
    { skip: !companySlug || !branchSlug }
  );

  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Cart State
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [cartLoaded, setCartLoaded] = useState(false);

  // Item Detail Modal State
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [productReviews, setProductReviews] = useState<any[]>([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);

  // Load cart from local storage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem(`cart_${companySlug}_${branchSlug}`);
        if (saved) setCart(JSON.parse(saved));
      } catch (error) {
        console.error('Failed to load cart', error);
      }
      setCartLoaded(true);
    }
  }, [companySlug, branchSlug]);

  // Save cart to local storage
  useEffect(() => {
    if (cartLoaded) {
      localStorage.setItem(`cart_${companySlug}_${branchSlug}`, JSON.stringify(cart));
    }
  }, [cart, cartLoaded, companySlug, branchSlug]);

  const categories = useMemo(() => {
    if (!menuData?.categories) return [];
    return [{ id: 'all', name: 'All Products' }, ...menuData.categories];
  }, [menuData]);

  const filteredProducts = useMemo(() => {
    if (!menuData?.menuItems) return [];
    let items = menuData.menuItems;

    if (activeCategory !== 'all') {
      items = items.filter((item: any) => {
        const catId = item.categoryId?._id || item.categoryId?.id || item.categoryId;
        return String(catId) === String(activeCategory);
      });
    }

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      items = items.filter((item: any) => 
        item.name.toLowerCase().includes(q) || item.description?.toLowerCase().includes(q)
      );
    }

    return items;
  }, [menuData, activeCategory, searchQuery]);

  const addToCart = (product: any) => {
    const uniqueId = `${product.id}`;
    setCart(prev => {
      const existing = prev.find(item => item.uniqueId === uniqueId);
      if (existing) {
        return prev.map(item => item.uniqueId === uniqueId ? { ...item, quantity: item.quantity + 1 } : item);
      }
      return [...prev, {
        id: product.id,
        uniqueId,
        name: product.name,
        price: product.price,
        quantity: 1,
        image: (product.images?.[0] || product.image)
      }];
    });
    toast.success(`Added ${product.name} to cart`);
  };

  const updateQuantity = (uniqueId: string, delta: number) => {
    setCart(prev => prev.map(item => {
      if (item.uniqueId === uniqueId) {
        const newQ = item.quantity + delta;
        return newQ > 0 ? { ...item, quantity: newQ } : item;
      }
      return item;
    }));
  };

  const removeFromCart = (uniqueId: string) => {
    setCart(prev => prev.filter(item => item.uniqueId !== uniqueId));
  };

  const cartTotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  const fetchReviews = async (productId: string) => {
    setReviewsLoading(true);
    try {
      // Use the newly added endpoint for reviews
      let baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1';
      baseUrl = baseUrl.replace(/\/api\/v1$/, '');
      const url = `${baseUrl}/api/v1/public/companies/${companySlug}/branches/${branchSlug}/products/${productId}/reviews`;
      
      const res = await fetch(url);
      if (res.ok) {
        const json = await res.json();
        setProductReviews(json.data || []);
      } else {
        setProductReviews([]);
      }
    } catch (e) {
      console.error(e);
      setProductReviews([]);
    } finally {
      setReviewsLoading(false);
    }
  };

  const openProductDetail = (product: any) => {
    setSelectedProduct(product);
    setProductReviews([]);
    fetchReviews(product.id);
  };

  if (companyLoading || menuLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 font-sans flex flex-col">
      {/* Sticky Top Nav */}
      <header className="sticky top-0 z-40 bg-white/90 dark:bg-gray-900/90 backdrop-blur-md border-b border-gray-200 dark:border-gray-800 shadow-sm">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <div className="flex items-center gap-4 cursor-pointer" onClick={() => router.push(`/${companySlug}`)}>
            {company?.logo ? (
              <img src={company.logo} alt={company?.name} className="h-10 w-10 object-contain rounded shadow-sm" />
            ) : (
              <div className="h-10 w-10 bg-indigo-600 rounded flex items-center justify-center text-white font-bold">
                {company?.name?.charAt(0)}
              </div>
            )}
            <h1 className="text-xl font-bold text-gray-900 dark:text-white hidden sm:block">{company?.name}</h1>
          </div>
          
          <div className="flex-1 max-w-xl mx-4 sm:mx-8">
            <div className="relative">
              <input
                type="text"
                placeholder="Search products..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-full border border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
              />
              <MagnifyingGlassIcon className="absolute left-3.5 top-3 h-5 w-5 text-gray-400" />
            </div>
          </div>

          <button
            onClick={() => setIsCartOpen(true)}
            className="relative p-2 text-gray-600 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
          >
            <ShoppingCartIcon className="h-7 w-7" />
            {cartCount > 0 && (
              <span className="absolute top-0 right-0 h-5 w-5 bg-indigo-600 text-white rounded-full flex items-center justify-center text-xs font-bold ring-2 ring-white dark:ring-gray-900 shadow-sm">
                {cartCount}
              </span>
            )}
          </button>
        </div>
      </header>

      <div className="flex-1 max-w-[1400px] w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col lg:flex-row gap-8">
        {/* Sidebar Categories */}
        <aside className="hidden lg:block w-64 flex-shrink-0">
          <div className="sticky top-28 bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-4">
            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4 px-3">Categories</h3>
            <ul className="space-y-1">
              {categories.map((cat: any) => (
                <li key={cat.id || cat._id}>
                  <button
                    onClick={() => setActiveCategory(cat.id || cat._id)}
                    className={`w-full text-left px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                      activeCategory === (cat.id || cat._id)
                        ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400'
                        : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50 hover:text-gray-900 dark:hover:text-white'
                    }`}
                  >
                    {cat.name}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </aside>

        {/* Mobile Categories (Horizontal Scroll) */}
        <div className="lg:hidden w-full overflow-x-auto pb-4 mb-4 hide-scrollbar -mx-4 px-4 sticky top-20 bg-gray-50 dark:bg-gray-900 z-30 pt-4">
          <div className="flex gap-2">
            {categories.map((cat: any) => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id || cat._id)}
                className={`whitespace-nowrap px-5 py-2 rounded-full text-sm font-medium transition-all ${
                  activeCategory === (cat.id || cat._id)
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700'
                }`}
              >
                {cat.name}
              </button>
            ))}
          </div>
        </div>

        {/* Product Grid */}
        <main className="flex-1">
          {filteredProducts.length === 0 ? (
            <div className="text-center py-20 bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">No products found</h3>
              <p className="mt-1 text-gray-500 dark:text-gray-400">Try adjusting your category or search.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
              {filteredProducts.map((product: any) => (
                <div key={product.id} className="bg-white dark:bg-gray-800 rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 border border-gray-100 dark:border-gray-700 flex flex-col group">
                  <div 
                    className="aspect-w-4 aspect-h-3 bg-gray-100 dark:bg-gray-700 cursor-pointer overflow-hidden"
                    onClick={() => router.push(`/${companySlug}/${branchSlug}/item/${product.id || product._id}`)}
                  >
                    {(product.images?.[0] || product.image) ? (
                      <img src={(product.images?.[0] || product.image)} alt={product.name} className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-500" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-400 bg-gray-50 dark:bg-gray-800 group-hover:scale-105 transition-transform duration-500">
                        No Image
                      </div>
                    )}
                  </div>
                  <div className="p-5 flex flex-col flex-1">
                    <div className="flex justify-between items-start mb-2">
                      <h3 
                        className="font-bold text-gray-900 dark:text-white text-lg line-clamp-1 cursor-pointer hover:text-indigo-600 dark:hover:text-indigo-400"
                        onClick={() => router.push(`/${companySlug}/${branchSlug}/item/${product.id || product._id}`)}
                      >
                        {product.name}
                      </h3>
                      <span className="font-extrabold text-indigo-600 dark:text-indigo-400 text-lg">
                        {formatCurrency(product.price, company?.settings?.currency)}
                      </span>
                    </div>
                    
                    {product.description && (
                      <p className="text-gray-500 dark:text-gray-400 text-sm line-clamp-2 mb-4 flex-1">
                        {product.description}
                      </p>
                    )}
                    
                    {/* View Details / Reviews Hook */}
                    <div className="flex items-center gap-2 mb-4 cursor-pointer" onClick={() => router.push(`/${companySlug}/${branchSlug}/item/${product.id || product._id}`)}>
                      <div className="flex items-center text-amber-500">
                        <StarIconSolid className="w-4 h-4" />
                        <span className="text-sm font-bold ml-1">{product.averageRating ? product.averageRating.toFixed(1) : 'New'}</span>
                      </div>
                      <span className="text-xs font-medium text-gray-400 hover:text-indigo-500 transition-colors">
                        ({product.reviewCount || 0} reviews) • View Details
                      </span>
                    </div>

                    <button
                      onClick={() => addToCart(product)}
                      className="w-full py-2.5 bg-gray-900 hover:bg-gray-800 dark:bg-white dark:hover:bg-gray-200 dark:text-gray-900 text-white rounded-xl font-semibold transition-colors mt-auto flex justify-center items-center gap-2"
                    >
                      <PlusIcon className="w-5 h-5" /> Add to Cart
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </main>
      </div>

      {/* Cart Drawer */}
      {isCartOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setIsCartOpen(false)}></div>
          <div className="relative w-full max-w-md bg-white dark:bg-gray-900 h-full shadow-2xl flex flex-col transform transition-transform animate-in slide-in-from-right duration-300 border-l border-gray-200 dark:border-gray-800">
            <div className="flex items-center justify-between p-6 border-b border-gray-100 dark:border-gray-800">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <ShoppingCartIcon className="w-6 h-6 text-indigo-600" /> Your Cart
              </h2>
              <button onClick={() => setIsCartOpen(false)} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 transition-colors">
                <XMarkIcon className="w-6 h-6" />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {cart.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-gray-500 space-y-4">
                  <ShoppingCartIcon className="w-16 h-16 text-gray-300 dark:text-gray-700" />
                  <p className="text-lg">Your cart is empty</p>
                </div>
              ) : (
                cart.map(item => (
                  <div key={item.uniqueId} className="flex gap-4 bg-gray-50 dark:bg-gray-800/50 p-4 rounded-2xl border border-gray-100 dark:border-gray-800">
                    {item.image ? (
                      <img src={item.image} alt={item.name} className="w-20 h-20 object-cover rounded-xl shadow-sm" />
                    ) : (
                      <div className="w-20 h-20 bg-gray-200 dark:bg-gray-700 rounded-xl flex items-center justify-center text-gray-400">
                        <ShoppingCartIcon className="w-8 h-8" />
                      </div>
                    )}
                    <div className="flex-1 flex flex-col justify-between">
                      <div>
                        <h4 className="font-bold text-gray-900 dark:text-white line-clamp-1">{item.name}</h4>
                        <div className="text-indigo-600 dark:text-indigo-400 font-semibold mt-1">
                          {formatCurrency(item.price * item.quantity, company?.settings?.currency)}
                        </div>
                      </div>
                      <div className="flex items-center justify-between mt-3">
                        <div className="flex items-center bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm">
                          <button onClick={() => item.quantity === 1 ? removeFromCart(item.uniqueId) : updateQuantity(item.uniqueId, -1)} className="p-1.5 text-gray-500 hover:text-indigo-600">
                            {item.quantity === 1 ? <XMarkIcon className="w-4 h-4" /> : <MinusIcon className="w-4 h-4" />}
                          </button>
                          <span className="w-8 text-center font-medium text-sm">{item.quantity}</span>
                          <button onClick={() => updateQuantity(item.uniqueId, 1)} className="p-1.5 text-gray-500 hover:text-indigo-600">
                            <PlusIcon className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {cart.length > 0 && (
              <div className="border-t border-gray-100 dark:border-gray-800 p-6 bg-gray-50 dark:bg-gray-900">
                <div className="flex justify-between items-center mb-6">
                  <span className="text-gray-600 dark:text-gray-400 font-medium">Subtotal</span>
                  <span className="text-2xl font-bold text-gray-900 dark:text-white">
                    {formatCurrency(cartTotal, company?.settings?.currency)}
                  </span>
                </div>
                <button
                  onClick={() => router.push(`/${companySlug}/${branchSlug}/checkout`)}
                  className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-lg transition-all shadow-[0_4px_14px_0_rgba(79,70,229,0.39)] hover:shadow-[0_6px_20px_rgba(79,70,229,0.23)] hover:-translate-y-0.5"
                >
                  Checkout
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      
    </div>
  );
}
