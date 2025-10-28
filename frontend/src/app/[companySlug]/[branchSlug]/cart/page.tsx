'use client';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { useGetCompanyBySlugQuery } from '@/lib/api/endpoints/publicApi';
import { formatCurrency } from '@/lib/utils';
import { ArrowLeftIcon, MinusIcon, PlusIcon, TrashIcon } from '@heroicons/react/24/outline';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';

interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  image?: string;
}

export default function CartPage() {
  const params = useParams();
  const router = useRouter();
  const companySlug = params.companySlug as string;
  const branchSlug = params.branchSlug as string;

  const { data: company } = useGetCompanyBySlugQuery(companySlug);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(`cart_${companySlug}_${branchSlug}`);
      setCart(saved ? JSON.parse(saved) : []);
      setLoading(false);
    }
  }, [companySlug, branchSlug]);

  const updateQuantity = (itemId: string, delta: number) => {
    setCart((prevCart) => {
      const updated = prevCart.map((item) => {
        if (item.id === itemId) {
          const newQuantity = item.quantity + delta;
          if (newQuantity <= 0) return null;
          return { ...item, quantity: newQuantity };
        }
        return item;
      }).filter(Boolean) as CartItem[];

      // Save to localStorage
      localStorage.setItem(`cart_${companySlug}_${branchSlug}`, JSON.stringify(updated));
      return updated;
    });
  };

  const removeItem = (itemId: string) => {
    setCart((prevCart) => {
      const updated = prevCart.filter((item) => item.id !== itemId);
      localStorage.setItem(`cart_${companySlug}_${branchSlug}`, JSON.stringify(updated));
      toast.success('Item removed from cart');
      return updated;
    });
  };

  const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const tax = subtotal * 0.1; // 10% tax (adjust as needed)
  const deliveryFee = 50; // Fixed delivery fee (adjust as needed)
  const total = subtotal + tax + deliveryFee;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (cart.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <Card>
            <div className="p-12 text-center">
              <div className="text-6xl mb-4">🛒</div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Your cart is empty</h2>
              <p className="text-gray-600 mb-6">Add some delicious items to get started!</p>
              <Link href={`/${companySlug}/${branchSlug}/shop`}>
                <Button>
                  <ArrowLeftIcon className="w-5 h-5 mr-2" />
                  Continue Shopping
                </Button>
              </Link>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Link href={`/${companySlug}/${branchSlug}/shop`}>
          <Button variant="ghost" className="mb-6">
            <ArrowLeftIcon className="w-5 h-5 mr-2" />
            Continue Shopping
          </Button>
        </Link>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Cart Items */}
          <div className="lg:col-span-2">
            <Card>
              <div className="p-6">
                <h1 className="text-2xl font-bold text-gray-900 mb-6">Shopping Cart</h1>
                <div className="space-y-4">
                  {cart.map((item) => (
                    <div key={item.id} className="flex items-center gap-4 p-4 border rounded-lg">
                      <div className="w-20 h-20 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                        {item.image ? (
                          <img src={item.image} alt={item.name} className="w-full h-full object-cover rounded-lg" />
                        ) : (
                          <span className="text-2xl">🍽️</span>
                        )}
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900">{item.name}</h3>
                        <p className="text-gray-600">{formatCurrency(item.price)} each</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => updateQuantity(item.id, -1)}
                          className="p-1 rounded-full bg-gray-200 hover:bg-gray-300"
                        >
                          <MinusIcon className="w-4 h-4" />
                        </button>
                        <span className="font-semibold w-8 text-center">{item.quantity}</span>
                        <button
                          onClick={() => updateQuantity(item.id, 1)}
                          className="p-1 rounded-full bg-gray-200 hover:bg-gray-300"
                        >
                          <PlusIcon className="w-4 h-4" />
                        </button>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-gray-900">{formatCurrency(item.price * item.quantity)}</p>
                        <button
                          onClick={() => removeItem(item.id)}
                          className="text-red-600 hover:text-red-700 text-sm mt-1"
                        >
                          <TrashIcon className="w-4 h-4 inline mr-1" />
                          Remove
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </Card>
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-1">
            <Card className="sticky top-4">
              <div className="p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4">Order Summary</h2>
                <div className="space-y-3 mb-6">
                  <div className="flex justify-between text-gray-600">
                    <span>Subtotal</span>
                    <span>{formatCurrency(subtotal)}</span>
                  </div>
                  <div className="flex justify-between text-gray-600">
                    <span>Tax (10%)</span>
                    <span>{formatCurrency(tax)}</span>
                  </div>
                  <div className="flex justify-between text-gray-600">
                    <span>Delivery Fee</span>
                    <span>{formatCurrency(deliveryFee)}</span>
                  </div>
                  <div className="border-t pt-3 flex justify-between text-lg font-bold text-gray-900">
                    <span>Total</span>
                    <span>{formatCurrency(total)}</span>
                  </div>
                </div>
                <Button
                  className="w-full"
                  onClick={() => router.push(`/${companySlug}/${branchSlug}/checkout`)}
                >
                  Proceed to Checkout
                </Button>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

