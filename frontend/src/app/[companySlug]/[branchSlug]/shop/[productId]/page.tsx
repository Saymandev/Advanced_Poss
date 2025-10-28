'use client';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { useGetProductQuery } from '@/lib/api/endpoints/publicApi';
import { formatCurrency } from '@/lib/utils';
import { ArrowLeftIcon, MinusIcon, PlusIcon, ShoppingCartIcon } from '@heroicons/react/24/outline';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useState } from 'react';
import toast from 'react-hot-toast';

export default function ProductDetailPage() {
  const params = useParams();
  const companySlug = params.companySlug as string;
  const branchSlug = params.branchSlug as string;
  const productId = params.productId as string;

  const { data: product, isLoading } = useGetProductQuery({ companySlug, branchSlug, productId });
  
  const [quantity, setQuantity] = useState(1);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);

  const addToCart = () => {
    if (!product) return;

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
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card>
          <div className="p-8 text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Product Not Found</h2>
            <p className="text-gray-600 mb-4">This product doesn't exist or is no longer available.</p>
            <Link href={`/${companySlug}/${branchSlug}/shop`}>
              <Button>Back to Shop</Button>
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  const images = product.images && product.images.length > 0 ? product.images : [];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Link href={`/${companySlug}/${branchSlug}/shop`}>
          <Button variant="ghost" className="mb-6">
            <ArrowLeftIcon className="w-5 h-5 mr-2" />
            Back to Shop
          </Button>
        </Link>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* Product Images */}
          <div>
            <div className="aspect-square bg-gray-100 rounded-lg mb-4 flex items-center justify-center overflow-hidden">
              {images.length > 0 ? (
                <img
                  src={images[selectedImageIndex]}
                  alt={product.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="text-6xl">🍽️</div>
              )}
            </div>
            {images.length > 1 && (
              <div className="grid grid-cols-4 gap-2">
                {images.map((img: string, idx: number) => (
                  <button
                    key={idx}
                    onClick={() => setSelectedImageIndex(idx)}
                    className={`aspect-square rounded-lg overflow-hidden border-2 ${
                      selectedImageIndex === idx ? 'border-gray-900' : 'border-transparent'
                    }`}
                  >
                    <img src={img} alt={`${product.name} ${idx + 1}`} className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Product Details */}
          <div>
            <div className="mb-6">
              {product.category && (
                <span className="text-sm text-gray-600 mb-2 block">
                  {product.category.name || product.category}
                </span>
              )}
              <h1 className="text-4xl font-bold text-gray-900 mb-4">{product.name}</h1>
              <div className="flex items-center gap-4 mb-6">
                <span className="text-3xl font-bold text-green-600">
                  {formatCurrency(product.price)}
                </span>
                {!product.isAvailable && (
                  <span className="px-3 py-1 bg-red-100 text-red-700 rounded-full text-sm">
                    Unavailable
                  </span>
                )}
              </div>
              {product.description && (
                <p className="text-gray-700 text-lg mb-6">{product.description}</p>
              )}
            </div>

            {/* Quantity Selector */}
            <div className="mb-8">
              <label className="block text-sm font-medium text-gray-700 mb-2">Quantity</label>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 border rounded-lg">
                  <button
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="p-2 hover:bg-gray-100"
                  >
                    <MinusIcon className="w-5 h-5" />
                  </button>
                  <span className="px-4 py-2 font-semibold">{quantity}</span>
                  <button
                    onClick={() => setQuantity(quantity + 1)}
                    className="p-2 hover:bg-gray-100"
                  >
                    <PlusIcon className="w-5 h-5" />
                  </button>
                </div>
                <span className="text-gray-600">
                  Total: <span className="font-bold text-gray-900">{formatCurrency(product.price * quantity)}</span>
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
              Add to Cart
            </Button>

            {/* Additional Info */}
            <Card className="mt-6">
              <div className="p-6">
                <h3 className="font-semibold text-gray-900 mb-4">Product Information</h3>
                <div className="space-y-2 text-sm text-gray-600">
                  <div className="flex justify-between">
                    <span>Status:</span>
                    <span className={product.isAvailable ? 'text-green-600' : 'text-red-600'}>
                      {product.isAvailable ? 'In Stock' : 'Out of Stock'}
                    </span>
                  </div>
                  {product.category && (
                    <div className="flex justify-between">
                      <span>Category:</span>
                      <span>{product.category.name || product.category}</span>
                    </div>
                  )}
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

