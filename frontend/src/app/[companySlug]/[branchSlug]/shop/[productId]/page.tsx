'use client';

/* eslint-disable @next/next/no-img-element */

import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { useGetProductQuery } from '@/lib/api/endpoints/publicApi';
import { formatCurrency } from '@/lib/utils';
import { ArrowLeftIcon, ExclamationTriangleIcon, MinusIcon, PlusIcon, ShoppingCartIcon } from '@heroicons/react/24/outline';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';

export default function ProductDetailPage() {
  const params = useParams();
  const router = useRouter();
  const companySlug = params.companySlug as string;
  const branchSlug = params.branchSlug as string;
  const productId = params.productId as string;

  const { 
    data: product, 
    isLoading,
    isError,
    error 
  } = useGetProductQuery(
    { companySlug, branchSlug, productId },
    { skip: !companySlug || !branchSlug || !productId }
  );
  
  const [quantity, setQuantity] = useState(1);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);

  useEffect(() => {
    if (isError) {
      const errorMessage = (error as any)?.data?.message || 'Failed to load product';
      toast.error(errorMessage);
    }
  }, [isError, error]);

  const addToCart = () => {
    if (!product) {
      toast.error('Product not available');
      return;
    }

    if (!product.isAvailable) {
      toast.error('This product is currently unavailable');
      return;
    }

    try {
      const cartKey = `cart_${companySlug}_${branchSlug}`;
      const existingCart = localStorage.getItem(cartKey);
      const cart = existingCart ? JSON.parse(existingCart) : [];

      const existingItem = cart.find((item: any) => item.id === product.id);
      
      if (existingItem) {
        existingItem.quantity += quantity;
      } else {
        cart.push({
          id: product.id,
          name: product.name,
          price: product.price,
          quantity,
          image: product.images?.[0],
        });
      }

      localStorage.setItem(cartKey, JSON.stringify(cart));
      toast.success(`${quantity} ${product.name} added to cart!`);
    } catch (error) {
      console.error('Failed to add to cart:', error);
      toast.error('Failed to add item to cart. Please try again.');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading product...</p>
        </div>
      </div>
    );
  }

  if (isError || !product) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4">
        <Card className="max-w-md w-full">
          <CardContent className="p-8 text-center">
            <ExclamationTriangleIcon className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Product Not Found</h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              This product doesn't exist or is no longer available.
            </p>
            <Link href={`/${companySlug}/${branchSlug}/shop`}>
              <Button>Back to Shop</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const images = product.images && product.images.length > 0 ? product.images : [];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-8">
        <Link href={`/${companySlug}/${branchSlug}/shop`}>
          <Button variant="ghost" className="mb-4 md:mb-6">
            <ArrowLeftIcon className="w-5 h-5 mr-2" />
            Back to Shop
          </Button>
        </Link>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 md:gap-12">
          {/* Product Images */}
          <div>
            <div className="aspect-square bg-gray-100 dark:bg-gray-800 rounded-lg mb-4 flex items-center justify-center overflow-hidden">
              {images.length > 0 ? (
                <img
                  src={images[selectedImageIndex]}
                  alt={product.name}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                    const parent = (e.target as HTMLImageElement).parentElement;
                    if (parent) {
                      parent.innerHTML = '<div class="text-6xl text-gray-400 dark:text-gray-500">🍽️</div>';
                    }
                  }}
                />
              ) : (
                <div className="text-6xl text-gray-400 dark:text-gray-500">🍽️</div>
              )}
              {!product.isAvailable && (
                <div className="absolute inset-0 bg-black bg-opacity-60 dark:bg-opacity-70 flex items-center justify-center rounded-lg">
                  <span className="text-white font-semibold text-lg">Unavailable</span>
                </div>
              )}
            </div>
            {images.length > 1 && (
              <div className="grid grid-cols-4 sm:grid-cols-5 gap-2">
                {images.map((img: string, idx: number) => (
                  <button
                    key={idx}
                    onClick={() => setSelectedImageIndex(idx)}
                    className={`aspect-square rounded-lg overflow-hidden border-2 transition-all ${
                      selectedImageIndex === idx 
                        ? 'border-gray-900 dark:border-gray-300 ring-2 ring-primary-500' 
                        : 'border-transparent hover:border-gray-300 dark:hover:border-gray-600'
                    }`}
                  >
                    <img 
                      src={img} 
                      alt={`${product.name} ${idx + 1}`} 
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                        const parent = (e.target as HTMLImageElement).parentElement;
                        if (parent) {
                          parent.innerHTML = '<div class="w-full h-full flex items-center justify-center text-gray-400 text-xl">📷</div>';
                        }
                      }}
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Product Details */}
          <div>
            <div className="mb-6">
              {product.category && (
                <span className="text-sm text-gray-600 dark:text-gray-400 mb-2 block">
                  {product.category.name || product.category}
                </span>
              )}
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4">
                {product.name}
              </h1>
              <div className="flex flex-wrap items-center gap-4 mb-6">
                <span className="text-2xl sm:text-3xl font-bold text-green-600 dark:text-green-400">
                  {formatCurrency(product.price)}
                </span>
                {!product.isAvailable && (
                  <span className="px-3 py-1 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded-full text-sm font-medium">
                    Unavailable
                  </span>
                )}
              </div>
              {product.description && (
                <p className="text-base sm:text-lg text-gray-700 dark:text-gray-300 mb-6 leading-relaxed">
                  {product.description}
                </p>
              )}
            </div>

            {/* Quantity Selector */}
            <div className="mb-6 md:mb-8">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Quantity
              </label>
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                <div className="flex items-center gap-2 border border-gray-300 dark:border-gray-600 rounded-lg">
                  <button
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                    disabled={quantity <= 1}
                    aria-label="Decrease quantity"
                  >
                    <MinusIcon className="w-5 h-5" />
                  </button>
                  <span className="px-4 py-2 font-semibold text-gray-900 dark:text-white min-w-[3rem] text-center">
                    {quantity}
                  </span>
                  <button
                    onClick={() => setQuantity(quantity + 1)}
                    className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                    aria-label="Increase quantity"
                  >
                    <PlusIcon className="w-5 h-5" />
                  </button>
                </div>
                <span className="text-sm sm:text-base text-gray-600 dark:text-gray-400">
                  Total: <span className="font-bold text-gray-900 dark:text-white">
                    {formatCurrency(product.price * quantity)}
                  </span>
                </span>
              </div>
            </div>

            {/* Add to Cart Button */}
            <Button
              className="w-full mb-4"
              size="lg"
              onClick={addToCart}
              disabled={!product.isAvailable}
            >
              <ShoppingCartIcon className="w-5 h-5 mr-2" />
              {product.isAvailable ? 'Add to Cart' : 'Currently Unavailable'}
            </Button>

            {/* Additional Info */}
            <Card className="mt-6">
              <CardContent className="p-4 md:p-6">
                <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Product Information</h3>
                <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                  <div className="flex justify-between">
                    <span>Status:</span>
                    <span className={`font-medium ${
                      product.isAvailable 
                        ? 'text-green-600 dark:text-green-400' 
                        : 'text-red-600 dark:text-red-400'
                    }`}>
                      {product.isAvailable ? 'In Stock' : 'Out of Stock'}
                    </span>
                  </div>
                  {product.category && (
                    <div className="flex justify-between">
                      <span>Category:</span>
                      <span className="font-medium">
                        {product.category.name || product.category}
                      </span>
                    </div>
                  )}
                  {product.preparationTime && (
                    <div className="flex justify-between">
                      <span>Prep Time:</span>
                      <span className="font-medium">{product.preparationTime} minutes</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

