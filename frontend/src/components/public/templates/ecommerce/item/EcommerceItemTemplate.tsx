/* eslint-disable @next/next/no-img-element */
'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useGetBranchMenuQuery, useGetCompanyBySlugQuery } from '@/lib/api/endpoints/publicApi';
import { ShoppingCartIcon, ArrowLeftIcon, PlusIcon, MinusIcon, CheckBadgeIcon } from '@heroicons/react/24/outline';
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

export default function EcommerceItemTemplate() {
  const params = useParams();
  const router = useRouter();
  const companySlug = params.companySlug as string;
  const branchSlug = params.branchSlug as string;
  const itemId = params.itemId as string;

  const { data: company, isLoading: companyLoading } = useGetCompanyBySlugQuery(companySlug, { skip: !companySlug });
  const { data: menuData, isLoading: menuLoading } = useGetBranchMenuQuery(
    { companySlug, branchSlug },
    { skip: !companySlug || !branchSlug }
  );

  const [productReviews, setProductReviews] = useState<any[]>([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [cartCount, setCartCount] = useState(0);
  const [cartLoaded, setCartLoaded] = useState(false);

  // Load cart count
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem(`cart_${companySlug}_${branchSlug}`);
        if (saved) {
          const cart = JSON.parse(saved);
          setCartCount(cart.reduce((sum: number, item: any) => sum + item.quantity, 0));
        }
      } catch (error) {}
      setCartLoaded(true);
    }
  }, [companySlug, branchSlug]);

  // Find product
  const product = menuData?.menuItems?.find((item: any) => {
    const id = item.id || item._id?.toString();
    return id === itemId;
  });

  // Fetch reviews
  useEffect(() => {
    if (!product) return;
    const fetchReviews = async () => {
      setReviewsLoading(true);
      try {
        let baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1';
        baseUrl = baseUrl.replace(/\/api\/v1$/, '');
        const url = `${baseUrl}/api/v1/public/companies/${companySlug}/branches/${branchSlug}/products/${itemId}/reviews`;
        
        const res = await fetch(url);
        if (res.ok) {
          const json = await res.json();
          setProductReviews(json.data || []);
        } else {
          setProductReviews([]);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setReviewsLoading(false);
      }
    };
    fetchReviews();
  }, [product, itemId, companySlug, branchSlug]);

  const addToCart = () => {
    if (!product) return;
    try {
      const saved = localStorage.getItem(`cart_${companySlug}_${branchSlug}`);
      let cart: CartItem[] = saved ? JSON.parse(saved) : [];
      const uniqueId = `${product.id || (product as any)._id}`;
      
      const existing = cart.find(item => item.uniqueId === uniqueId);
      if (existing) {
        cart = cart.map(item => item.uniqueId === uniqueId ? { ...item, quantity: item.quantity + quantity } : item);
      } else {
        cart.push({
          id: product.id || (product as any)._id,
          uniqueId,
          name: product.name,
          price: product.price,
          quantity: quantity,
          image: product.images?.[0] || product.image
        });
      }
      
      localStorage.setItem(`cart_${companySlug}_${branchSlug}`, JSON.stringify(cart));
      setCartCount(cart.reduce((sum, item) => sum + item.quantity, 0));
      toast.success(`Added ${product.name} to cart`);
    } catch (e) {
      toast.error('Failed to update cart');
    }
  };

  if (companyLoading || menuLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 font-sans flex flex-col items-center justify-center">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Product Not Found</h2>
        <button onClick={() => router.push(`/${companySlug}/${branchSlug}/shop`)} className="text-indigo-600 font-semibold hover:underline flex items-center gap-2">
          <ArrowLeftIcon className="w-4 h-4" /> Back to Shop
        </button>
      </div>
    );
  }

  const primaryImage = product.images?.[0] || product.image;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 font-sans flex flex-col">
      {/* Sticky Top Nav */}
      <header className="sticky top-0 z-40 bg-white/90 dark:bg-gray-900/90 backdrop-blur-md border-b border-gray-200 dark:border-gray-800 shadow-sm">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <div className="flex items-center gap-4 cursor-pointer" onClick={() => router.push(`/${companySlug}/${branchSlug}/shop`)}>
            <ArrowLeftIcon className="w-6 h-6 text-gray-600 dark:text-gray-300 hover:text-indigo-600 transition-colors" />
            <h1 className="text-xl font-bold text-gray-900 dark:text-white hidden sm:block">Back to Shop</h1>
          </div>
          
          <button
            onClick={() => router.push(`/${companySlug}/${branchSlug}/shop?cart=open`)}
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

      <div className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-xl overflow-hidden mb-12">
          <div className="flex flex-col md:flex-row">
            {/* Product Image Gallery */}
            <div className="md:w-1/2 p-8 lg:p-12 bg-gray-50 dark:bg-gray-900/50 flex items-center justify-center min-h-[400px]">
              {primaryImage ? (
                <img src={primaryImage} alt={product.name} className="max-w-full h-auto rounded-2xl shadow-2xl object-cover aspect-square" />
              ) : (
                <div className="w-full aspect-square flex items-center justify-center text-gray-400 bg-gray-100 dark:bg-gray-800 rounded-2xl shadow-inner">
                  No Image Available
                </div>
              )}
            </div>

            {/* Product Details */}
            <div className="md:w-1/2 p-8 lg:p-12 flex flex-col justify-center">
              {product.averageRating && (
                <div className="flex items-center gap-2 mb-4">
                  <div className="flex text-amber-500">
                    {[...Array(5)].map((_, i) => (
                      <StarIconSolid key={i} className={`w-5 h-5 ${i < Math.round(product.averageRating || 0) ? 'text-amber-500' : 'text-gray-200 dark:text-gray-700'}`} />
                    ))}
                  </div>
                  <span className="text-gray-600 dark:text-gray-400 font-medium">({product.reviewCount} reviews)</span>
                </div>
              )}
              
              <h1 className="text-4xl lg:text-5xl font-black text-gray-900 dark:text-white mb-4 tracking-tight">{product.name}</h1>
              <p className="text-3xl font-bold text-indigo-600 dark:text-indigo-400 mb-8">
                {formatCurrency(product.price, company?.settings?.currency)}
              </p>
              
              <p className="text-lg text-gray-600 dark:text-gray-300 mb-10 leading-relaxed">
                {product.description || 'Experience the premium quality and exceptional taste of this item, crafted specifically for you.'}
              </p>

              <div className="flex flex-col sm:flex-row gap-4 mt-auto">
                <div className="flex items-center bg-gray-100 dark:bg-gray-900 rounded-2xl p-2 shrink-0">
                  <button onClick={() => setQuantity(Math.max(1, quantity - 1))} className="p-3 text-gray-600 dark:text-gray-400 hover:text-indigo-600 transition-colors">
                    <MinusIcon className="w-5 h-5" />
                  </button>
                  <span className="w-12 text-center font-bold text-xl">{quantity}</span>
                  <button onClick={() => setQuantity(quantity + 1)} className="p-3 text-gray-600 dark:text-gray-400 hover:text-indigo-600 transition-colors">
                    <PlusIcon className="w-5 h-5" />
                  </button>
                </div>
                
                <button
                  onClick={addToCart}
                  className="flex-1 py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-bold text-lg transition-all shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-3 hover:-translate-y-1"
                >
                  <ShoppingCartIcon className="w-6 h-6" /> Add to Cart
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Reviews Section */}
        <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-lg p-8 lg:p-12">
          <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-8 flex items-center gap-3">
            <StarIconSolid className="w-8 h-8 text-amber-500" /> Customer Reviews
          </h3>
          
          {reviewsLoading ? (
            <div className="flex justify-center items-center h-48">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600"></div>
            </div>
          ) : productReviews.length === 0 ? (
            <div className="text-center py-16 bg-gray-50 dark:bg-gray-900/50 rounded-2xl">
              <StarIconSolid className="w-16 h-16 text-gray-300 dark:text-gray-700 mx-auto mb-4" />
              <p className="text-xl text-gray-500 dark:text-gray-400 font-medium">No reviews yet</p>
              <p className="text-gray-400 mt-2">Be the first to order and review this product!</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {productReviews.map((review, idx) => (
                <div key={idx} className="bg-gray-50 dark:bg-gray-900/50 p-6 rounded-2xl border border-gray-100 dark:border-gray-700">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-700 dark:text-indigo-400 font-bold text-lg">
                        {review.customerName?.charAt(0) || 'U'}
                      </div>
                      <div>
                        <span className="font-bold text-gray-900 dark:text-white flex items-center gap-1.5">
                          {review.customerName || 'Anonymous'}
                          <CheckBadgeIcon className="w-5 h-5 text-emerald-500" title="Verified Purchase" />
                        </span>
                        <div className="text-sm text-gray-500">{new Date(review.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}</div>
                      </div>
                    </div>
                    <div className="flex text-amber-500">
                      {[...Array(5)].map((_, i) => (
                        <StarIconSolid key={i} className={`w-5 h-5 ${i < review.rating ? 'text-amber-500' : 'text-gray-200 dark:text-gray-700'}`} />
                      ))}
                    </div>
                  </div>
                  {review.comment && (
                    <p className="text-gray-700 dark:text-gray-300 text-base leading-relaxed italic">
                      "{review.comment}"
                    </p>
                  )}
                  {review.response && (
                    <div className="mt-4 p-4 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
                      <div className="font-bold text-sm text-indigo-600 dark:text-indigo-400 mb-1 flex items-center gap-2">
                        Owner Response
                      </div>
                      <div className="text-gray-600 dark:text-gray-400 text-sm">{review.response}</div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
