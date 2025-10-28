'use client';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import {
  DeliveryZone,
  useCreatePublicOrderMutation,
  useFindDeliveryZoneMutation,
  useGetBranchZonesQuery,
  useGetCompanyBySlugQuery
} from '@/lib/api/endpoints/publicApi';
import { formatCurrency } from '@/lib/utils';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';

interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  image?: string;
}

export default function CheckoutPage() {
  const params = useParams();
  const router = useRouter();
  const companySlug = params.companySlug as string;
  const branchSlug = params.branchSlug as string;

  useGetCompanyBySlugQuery(companySlug);
  const { data: zones } = useGetBranchZonesQuery({ companySlug, branchSlug });
  const [createOrder, { isLoading: isSubmitting }] = useCreatePublicOrderMutation();
  const [findZone] = useFindDeliveryZoneMutation();
  
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedZone, setSelectedZone] = useState<DeliveryZone | null>(null);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    zipCode: '',
    deliveryType: 'delivery', // delivery or pickup
    paymentMethod: 'cash', // cash or card
    specialInstructions: '',
  });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(`cart_${companySlug}_${branchSlug}`);
      const cartData = saved ? JSON.parse(saved) : [];
      setCart(cartData);
      
      if (cartData.length === 0) {
        toast.error('Your cart is empty');
        router.push(`/${companySlug}/${branchSlug}/shop`);
      }
    }
  }, [companySlug, branchSlug, router]);

  // Auto-detect zone when address changes
  useEffect(() => {
    const detectZone = async () => {
      if (formData.deliveryType === 'delivery' && (formData.zipCode || formData.city)) {
        try {
          const zone = await findZone({
            companySlug,
            branchSlug,
            address: {
              zipCode: formData.zipCode,
              city: formData.city,
            },
          }).unwrap();
          
          if (zone) {
            setSelectedZone(zone);
          }
        } catch (error) {
          console.error('Zone detection failed:', error);
        }
      } else {
        setSelectedZone(null);
      }
    };

    const timeoutId = setTimeout(detectZone, 500);
    return () => clearTimeout(timeoutId);
  }, [formData.zipCode, formData.city, formData.deliveryType, companySlug, branchSlug, findZone]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!formData.firstName || !formData.lastName || !formData.phone) {
      toast.error('Please fill in all required fields');
      return;
    }

    if (formData.deliveryType === 'delivery' && !formData.address) {
      toast.error('Please provide delivery address');
      return;
    }

    // Check minimum order amount for selected zone
    if (formData.deliveryType === 'delivery' && selectedZone && selectedZone.minimumOrderAmount) {
      const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
      if (subtotal < selectedZone.minimumOrderAmount) {
        toast.error(`Minimum order amount for ${selectedZone.name} is ${formatCurrency(selectedZone.minimumOrderAmount)}`);
        return;
      }
    }

    try {
      const orderData = {
        items: cart.map((item) => ({
          menuItemId: item.id,
          quantity: item.quantity,
          price: item.price,
          name: item.name,
        })),
        customer: {
          firstName: formData.firstName,
          lastName: formData.lastName,
          email: formData.email || undefined,
          phone: formData.phone,
        },
        deliveryAddress: formData.deliveryType === 'delivery' ? {
          street: formData.address,
          city: formData.city,
          zipCode: formData.zipCode,
        } : undefined,
        deliveryType: formData.deliveryType,
        paymentMethod: formData.paymentMethod,
        specialInstructions: formData.specialInstructions || undefined,
      };

      const result = await createOrder({
        companySlug,
        branchSlug,
        orderData,
      }).unwrap();

      // Clear cart
      localStorage.removeItem(`cart_${companySlug}_${branchSlug}`);

      // Redirect to confirmation
      router.push(`/${companySlug}/${branchSlug}/order-confirmation?orderId=${result.data?.orderId || result.data?.orderNumber || 'pending'}`);
    } catch (error: any) {
      toast.error(error?.data?.message || 'Failed to place order. Please try again.');
      console.error('Order creation error:', error);
    }
  };

  const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const tax = subtotal * 0.1;
  
  // Calculate delivery fee based on zone
  let deliveryFee = 0;
  if (formData.deliveryType === 'delivery' && selectedZone) {
    deliveryFee = selectedZone.deliveryCharge || 0;
    
    // Check if free delivery applies
    if (selectedZone.freeDeliveryAbove && subtotal >= selectedZone.freeDeliveryAbove) {
      deliveryFee = 0;
    }
  } else if (formData.deliveryType === 'delivery' && !selectedZone) {
    // Fallback fee if no zone detected
    deliveryFee = 50;
  }
  
  const total = subtotal + tax + deliveryFee;

  if (cart.length === 0) {
    return null; // Will redirect in useEffect
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Link href={`/${companySlug}/${branchSlug}/cart`}>
          <Button variant="ghost" className="mb-6">
            <ArrowLeftIcon className="w-5 h-5 mr-2" />
            Back to Cart
          </Button>
        </Link>

        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Checkout Form */}
            <div className="lg:col-span-2 space-y-6">
              {/* Customer Info */}
              <Card>
                <div className="p-6">
                  <h2 className="text-xl font-bold text-gray-900 mb-4">Customer Information</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        First Name *
                      </label>
                      <Input
                        value={formData.firstName}
                        onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Last Name *
                      </label>
                      <Input
                        value={formData.lastName}
                        onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Phone *
                      </label>
                      <Input
                        type="tel"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Email
                      </label>
                      <Input
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      />
                    </div>
                  </div>
                </div>
              </Card>

              {/* Delivery Type */}
              <Card>
                <div className="p-6">
                  <h2 className="text-xl font-bold text-gray-900 mb-4">Delivery Type</h2>
                  <div className="space-y-3">
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="radio"
                        value="delivery"
                        checked={formData.deliveryType === 'delivery'}
                        onChange={(e) => setFormData({ ...formData, deliveryType: e.target.value })}
                        className="w-4 h-4"
                      />
                      <span>Delivery</span>
                    </label>
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="radio"
                        value="pickup"
                        checked={formData.deliveryType === 'pickup'}
                        onChange={(e) => setFormData({ ...formData, deliveryType: e.target.value })}
                        className="w-4 h-4"
                      />
                      <span>Pickup</span>
                    </label>
                  </div>
                </div>
              </Card>

              {/* Delivery Address */}
              {formData.deliveryType === 'delivery' && (
                <Card>
                  <div className="p-6">
                    <h2 className="text-xl font-bold text-gray-900 mb-4">Delivery Address</h2>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Address *
                        </label>
                        <Input
                          value={formData.address}
                          onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                          required={formData.deliveryType === 'delivery'}
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            City
                          </label>
                          <Input
                            value={formData.city}
                            onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                            placeholder="Enter city to detect zone"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            ZIP Code
                          </label>
                          <Input
                            value={formData.zipCode}
                            onChange={(e) => setFormData({ ...formData, zipCode: e.target.value })}
                            placeholder="Enter ZIP to detect zone"
                          />
                        </div>
                      </div>
                      
                      {/* Zone Selection/Display */}
                      {zones && zones.length > 0 && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Delivery Zone
                          </label>
                          <select
                            value={selectedZone?.id || ''}
                            onChange={(e) => {
                              const zone = zones.find(z => z.id === e.target.value);
                              setSelectedZone(zone || null);
                            }}
                            className="w-full px-3 py-2 border rounded-lg"
                          >
                            <option value="">Select or auto-detect zone</option>
                            {zones.map((zone) => (
                              <option key={zone.id} value={zone.id}>
                                {zone.name} - {formatCurrency(zone.deliveryCharge)}
                                {zone.freeDeliveryAbove && ` (Free delivery above ${formatCurrency(zone.freeDeliveryAbove)})`}
                              </option>
                            ))}
                          </select>
                          {selectedZone && (
                            <div className="mt-2 text-sm text-gray-600">
                              <p><strong>{selectedZone.name}</strong></p>
                              {selectedZone.minimumOrderAmount && (
                                <p className="text-amber-600">
                                  Minimum order: {formatCurrency(selectedZone.minimumOrderAmount)}
                                </p>
                              )}
                              {selectedZone.freeDeliveryAbove && (
                                <p className="text-green-600">
                                  Free delivery on orders above {formatCurrency(selectedZone.freeDeliveryAbove)}
                                </p>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </Card>
              )}

              {/* Payment Method */}
              <Card>
                <div className="p-6">
                  <h2 className="text-xl font-bold text-gray-900 mb-4">Payment Method</h2>
                  <div className="space-y-3">
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="radio"
                        value="cash"
                        checked={formData.paymentMethod === 'cash'}
                        onChange={(e) => setFormData({ ...formData, paymentMethod: e.target.value })}
                        className="w-4 h-4"
                      />
                      <span>Cash on Delivery</span>
                    </label>
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="radio"
                        value="card"
                        checked={formData.paymentMethod === 'card'}
                        onChange={(e) => setFormData({ ...formData, paymentMethod: e.target.value })}
                        className="w-4 h-4"
                      />
                      <span>Card Payment</span>
                    </label>
                  </div>
                </div>
              </Card>

              {/* Special Instructions */}
              <Card>
                <div className="p-6">
                  <h2 className="text-xl font-bold text-gray-900 mb-4">Special Instructions</h2>
                  <textarea
                    value={formData.specialInstructions}
                    onChange={(e) => setFormData({ ...formData, specialInstructions: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg"
                    rows={3}
                    placeholder="Any special requests or instructions..."
                  />
                </div>
              </Card>
            </div>

            {/* Order Summary */}
            <div className="lg:col-span-1">
              <Card className="sticky top-4">
                <div className="p-6">
                  <h2 className="text-xl font-bold text-gray-900 mb-4">Order Summary</h2>
                  <div className="space-y-2 mb-4 max-h-60 overflow-y-auto">
                    {cart.map((item) => (
                      <div key={item.id} className="flex justify-between text-sm">
                        <span className="text-gray-600">
                          {item.name} × {item.quantity}
                        </span>
                        <span className="text-gray-900">{formatCurrency(item.price * item.quantity)}</span>
                      </div>
                    ))}
                  </div>
                  <div className="border-t pt-3 space-y-2">
                    <div className="flex justify-between text-gray-600">
                      <span>Subtotal</span>
                      <span>{formatCurrency(subtotal)}</span>
                    </div>
                    <div className="flex justify-between text-gray-600">
                      <span>Tax (10%)</span>
                      <span>{formatCurrency(tax)}</span>
                    </div>
                    {deliveryFee > 0 && (
                      <div className="flex justify-between text-gray-600">
                        <span>
                          Delivery Fee
                          {selectedZone && ` (${selectedZone.name})`}
                        </span>
                        <span>{formatCurrency(deliveryFee)}</span>
                      </div>
                    )}
                    {formData.deliveryType === 'delivery' && selectedZone && deliveryFee === 0 && (
                      <div className="flex justify-between text-green-600 text-sm">
                        <span>Free Delivery</span>
                        <span>✓</span>
                      </div>
                    )}
                    <div className="border-t pt-3 flex justify-between text-lg font-bold text-gray-900">
                      <span>Total</span>
                      <span>{formatCurrency(total)}</span>
                    </div>
                  </div>
                  <Button
                    type="submit"
                    className="w-full mt-6"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? 'Placing Order...' : 'Place Order'}
                  </Button>
                </div>
              </Card>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

