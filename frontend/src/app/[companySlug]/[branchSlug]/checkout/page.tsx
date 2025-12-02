'use client';

import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import {
  DeliveryZone,
  useCreatePublicOrderMutation,
  useFindDeliveryZoneMutation,
  useGetBranchZonesQuery,
  useGetCompanyBySlugQuery
} from '@/lib/api/endpoints/publicApi';
import { formatCurrency } from '@/lib/utils';
import { ArrowLeftIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';
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

  const { 
    data: company,
    isLoading: companyLoading,
    isError: companyError 
  } = useGetCompanyBySlugQuery(companySlug, {
    skip: !companySlug,
  });
  
  const { 
    data: zones,
    isLoading: zonesLoading,
    isError: zonesError 
  } = useGetBranchZonesQuery(
    { companySlug, branchSlug },
    { skip: !companySlug || !branchSlug }
  );
  
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

  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [isLoadingCart, setIsLoadingCart] = useState(true);

  useEffect(() => {
    if (companyError) {
      toast.error('Failed to load company information');
    }
    if (zonesError) {
      console.error('Failed to load delivery zones');
    }
  }, [companyError, zonesError]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem(`cart_${companySlug}_${branchSlug}`);
        const cartData = saved ? JSON.parse(saved) : [];
        setCart(cartData);
        
        if (cartData.length === 0) {
          toast.error('Your cart is empty');
          router.push(`/${companySlug}/${branchSlug}/shop`);
        }
      } catch (error) {
        console.error('Failed to load cart:', error);
        toast.error('Failed to load cart');
        router.push(`/${companySlug}/${branchSlug}/shop`);
      } finally {
        setIsLoadingCart(false);
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
          } else {
            setSelectedZone(null);
          }
        } catch (error) {
          console.error('Zone detection failed:', error);
          setSelectedZone(null);
        }
      } else {
        setSelectedZone(null);
      }
    };

    const timeoutId = setTimeout(detectZone, 500);
    return () => clearTimeout(timeoutId);
  }, [formData.zipCode, formData.city, formData.deliveryType, companySlug, branchSlug, findZone]);

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!formData.firstName.trim()) {
      errors.firstName = 'First name is required';
    }

    if (!formData.lastName.trim()) {
      errors.lastName = 'Last name is required';
    }

    if (!formData.phone.trim()) {
      errors.phone = 'Phone number is required';
    } else if (!/^[\d\s\-\+\(\)]+$/.test(formData.phone)) {
      errors.phone = 'Please enter a valid phone number';
    }

    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = 'Please enter a valid email address';
    }

    if (formData.deliveryType === 'delivery') {
      if (!formData.address.trim()) {
        errors.address = 'Delivery address is required';
      }
    }

    // Check minimum order amount for selected zone
    if (formData.deliveryType === 'delivery' && selectedZone && selectedZone.minimumOrderAmount) {
      const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
      if (subtotal < selectedZone.minimumOrderAmount) {
        errors.deliveryZone = `Minimum order amount for ${selectedZone.name} is ${formatCurrency(selectedZone.minimumOrderAmount)}`;
      }
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      toast.error('Please fix the errors in the form');
      return;
    }

    if (cart.length === 0) {
      toast.error('Your cart is empty');
      router.push(`/${companySlug}/${branchSlug}/shop`);
      return;
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
          firstName: formData.firstName.trim(),
          lastName: formData.lastName.trim(),
          email: formData.email.trim() || undefined,
          phone: formData.phone.trim(),
        },
        deliveryAddress: formData.deliveryType === 'delivery' ? {
          street: formData.address.trim(),
          city: formData.city.trim() || undefined,
          zipCode: formData.zipCode.trim() || undefined,
        } : undefined,
        deliveryType: formData.deliveryType,
        paymentMethod: formData.paymentMethod,
        specialInstructions: formData.specialInstructions.trim() || undefined,
        ...(selectedZone && formData.deliveryType === 'delivery' ? { deliveryZoneId: selectedZone.id } : {}),
      };

      const result = await createOrder({
        companySlug,
        branchSlug,
        orderData,
      }).unwrap();

      // Clear cart
      try {
        localStorage.removeItem(`cart_${companySlug}_${branchSlug}`);
      } catch (error) {
        console.error('Failed to clear cart:', error);
      }

      // Get orderId (MongoDB _id) for tracking - this is what the tracking URL uses
      const orderId = result.data?.orderId || result.data?.orderNumber || result.orderId || result.orderNumber || 'pending';
      const orderNumber = result.data?.orderNumber || orderId; // Display orderNumber to user
      const trackingUrl = result.data?.trackingUrl; // Full tracking URL from backend
      
      // Store order info in sessionStorage for confirmation page
      try {
        if (typeof window !== 'undefined') {
          sessionStorage.setItem('lastOrderId', orderId);
          sessionStorage.setItem('lastOrderNumber', orderNumber);
          if (trackingUrl) {
            sessionStorage.setItem('lastTrackingUrl', trackingUrl);
          }
        }
      } catch (error) {
        console.error('Failed to store order info:', error);
      }
      
      // Redirect to confirmation page with orderId (MongoDB _id for tracking)
      router.push(`/${companySlug}/${branchSlug}/order-confirmation?orderId=${orderId}`);
    } catch (error: any) {
      const errorMessage = error?.data?.message || error?.message || 'Failed to place order. Please try again.';
      toast.error(errorMessage);
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
  } else if (formData.deliveryType === 'delivery' && !selectedZone && zonesLoading === false) {
    // Fallback fee if no zone detected (only if zones have finished loading)
    deliveryFee = 50;
  }
  
  const total = subtotal + tax + deliveryFee;

  if (isLoadingCart || companyLoading || zonesLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading checkout...</p>
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
              Unable to load company information. Please try again.
            </p>
            <div className="flex gap-3 justify-center">
              <Button onClick={() => router.push(`/${companySlug}`)} variant="secondary">
                Go Back
              </Button>
              <Button onClick={() => router.push('/')}>
                Go to Homepage
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (cart.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4">
        <Card className="max-w-md w-full">
          <CardContent className="p-8 text-center">
            <ExclamationTriangleIcon className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Cart is Empty</h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Your cart is empty. Please add items before checkout.
            </p>
            <Link href={`/${companySlug}/${branchSlug}/shop`}>
              <Button>Continue Shopping</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-8">
        <Link href={`/${companySlug}/${branchSlug}/cart`}>
          <Button variant="ghost" className="mb-4 md:mb-6">
            <ArrowLeftIcon className="w-5 h-5 mr-2" />
            Back to Cart
          </Button>
        </Link>

        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
            {/* Checkout Form */}
            <div className="lg:col-span-2 space-y-4 md:space-y-6">
              {/* Customer Info */}
              <Card>
                <CardContent className="p-4 md:p-6">
                  <h2 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white mb-4">
                    Customer Information
                  </h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        First Name *
                      </label>
                      <Input
                        value={formData.firstName}
                        onChange={(e) => {
                          setFormData({ ...formData, firstName: e.target.value });
                          if (formErrors.firstName) setFormErrors({ ...formErrors, firstName: '' });
                        }}
                        className={formErrors.firstName ? 'border-red-500' : ''}
                        required
                      />
                      {formErrors.firstName && (
                        <p className="mt-1 text-sm text-red-600 dark:text-red-400">{formErrors.firstName}</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Last Name *
                      </label>
                      <Input
                        value={formData.lastName}
                        onChange={(e) => {
                          setFormData({ ...formData, lastName: e.target.value });
                          if (formErrors.lastName) setFormErrors({ ...formErrors, lastName: '' });
                        }}
                        className={formErrors.lastName ? 'border-red-500' : ''}
                        required
                      />
                      {formErrors.lastName && (
                        <p className="mt-1 text-sm text-red-600 dark:text-red-400">{formErrors.lastName}</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Phone *
                      </label>
                      <Input
                        type="tel"
                        value={formData.phone}
                        onChange={(e) => {
                          setFormData({ ...formData, phone: e.target.value });
                          if (formErrors.phone) setFormErrors({ ...formErrors, phone: '' });
                        }}
                        className={formErrors.phone ? 'border-red-500' : ''}
                        required
                      />
                      {formErrors.phone && (
                        <p className="mt-1 text-sm text-red-600 dark:text-red-400">{formErrors.phone}</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Email
                      </label>
                      <Input
                        type="email"
                        value={formData.email}
                        onChange={(e) => {
                          setFormData({ ...formData, email: e.target.value });
                          if (formErrors.email) setFormErrors({ ...formErrors, email: '' });
                        }}
                        className={formErrors.email ? 'border-red-500' : ''}
                        placeholder="Optional"
                      />
                      {formErrors.email && (
                        <p className="mt-1 text-sm text-red-600 dark:text-red-400">{formErrors.email}</p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Delivery Type */}
              <Card>
                <CardContent className="p-4 md:p-6">
                  <h2 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white mb-4">
                    Delivery Type
                  </h2>
                  <div className="space-y-3">
                    <label className="flex items-center gap-3 cursor-pointer p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                      <input
                        type="radio"
                        value="delivery"
                        checked={formData.deliveryType === 'delivery'}
                        onChange={(e) => setFormData({ ...formData, deliveryType: e.target.value })}
                        className="w-4 h-4 text-primary-600"
                      />
                      <span className="text-gray-900 dark:text-white">Delivery</span>
                    </label>
                    <label className="flex items-center gap-3 cursor-pointer p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                      <input
                        type="radio"
                        value="pickup"
                        checked={formData.deliveryType === 'pickup'}
                        onChange={(e) => setFormData({ ...formData, deliveryType: e.target.value })}
                        className="w-4 h-4 text-primary-600"
                      />
                      <span className="text-gray-900 dark:text-white">Pickup</span>
                    </label>
                  </div>
                </CardContent>
              </Card>

              {/* Delivery Address */}
              {formData.deliveryType === 'delivery' && (
                <Card>
                  <CardContent className="p-4 md:p-6">
                    <h2 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white mb-4">
                      Delivery Address
                    </h2>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Address *
                        </label>
                        <Input
                          value={formData.address}
                          onChange={(e) => {
                            setFormData({ ...formData, address: e.target.value });
                            if (formErrors.address) setFormErrors({ ...formErrors, address: '' });
                          }}
                          className={formErrors.address ? 'border-red-500' : ''}
                          required={formData.deliveryType === 'delivery'}
                        />
                        {formErrors.address && (
                          <p className="mt-1 text-sm text-red-600 dark:text-red-400">{formErrors.address}</p>
                        )}
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            City
                          </label>
                          <Input
                            value={formData.city}
                            onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                            placeholder="Enter city to detect zone"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
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
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Delivery Zone
                          </label>
                          <select
                            value={selectedZone?.id || ''}
                            onChange={(e) => {
                              const zone = zones.find(z => z.id === e.target.value);
                              setSelectedZone(zone || null);
                              if (formErrors.deliveryZone) setFormErrors({ ...formErrors, deliveryZone: '' });
                            }}
                            className={`w-full px-3 py-2 border rounded-lg dark:bg-gray-800 dark:border-gray-700 dark:text-white ${
                              formErrors.deliveryZone ? 'border-red-500' : ''
                            }`}
                          >
                            <option value="">Select or auto-detect zone</option>
                            {zones.map((zone) => (
                              <option key={zone.id} value={zone.id}>
                                {zone.name} - {formatCurrency(zone.deliveryCharge)}
                                {zone.freeDeliveryAbove && ` (Free delivery above ${formatCurrency(zone.freeDeliveryAbove)})`}
                              </option>
                            ))}
                          </select>
                          {formErrors.deliveryZone && (
                            <p className="mt-1 text-sm text-red-600 dark:text-red-400">{formErrors.deliveryZone}</p>
                          )}
                          {selectedZone && (
                            <div className="mt-2 text-sm space-y-1">
                              <p className="font-medium text-gray-900 dark:text-white">
                                {selectedZone.name}
                              </p>
                              {selectedZone.minimumOrderAmount && (
                                <p className="text-amber-600 dark:text-amber-400">
                                  Minimum order: {formatCurrency(selectedZone.minimumOrderAmount)}
                                </p>
                              )}
                              {selectedZone.freeDeliveryAbove && subtotal >= selectedZone.freeDeliveryAbove && (
                                <p className="text-green-600 dark:text-green-400">
                                  ✓ Free delivery applied!
                                </p>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Payment Method */}
              <Card>
                <CardContent className="p-4 md:p-6">
                  <h2 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white mb-4">
                    Payment Method
                  </h2>
                  <div className="space-y-3">
                    <label className="flex items-center gap-3 cursor-pointer p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                      <input
                        type="radio"
                        value="cash"
                        checked={formData.paymentMethod === 'cash'}
                        onChange={(e) => setFormData({ ...formData, paymentMethod: e.target.value })}
                        className="w-4 h-4 text-primary-600"
                      />
                      <span className="text-gray-900 dark:text-white">Cash on Delivery</span>
                    </label>
                    <label className="flex items-center gap-3 cursor-pointer p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                      <input
                        type="radio"
                        value="card"
                        checked={formData.paymentMethod === 'card'}
                        onChange={(e) => setFormData({ ...formData, paymentMethod: e.target.value })}
                        className="w-4 h-4 text-primary-600"
                      />
                      <span className="text-gray-900 dark:text-white">Card Payment</span>
                    </label>
                  </div>
                </CardContent>
              </Card>

              {/* Special Instructions */}
              <Card>
                <CardContent className="p-4 md:p-6">
                  <h2 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white mb-4">
                    Special Instructions
                  </h2>
                  <textarea
                    value={formData.specialInstructions}
                    onChange={(e) => setFormData({ ...formData, specialInstructions: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg dark:bg-gray-800 dark:border-gray-700 dark:text-white"
                    rows={3}
                    placeholder="Any special requests or instructions..."
                  />
                </CardContent>
              </Card>
            </div>

            {/* Order Summary */}
            <div className="lg:col-span-1">
              <Card className="sticky top-4">
                <CardContent className="p-4 md:p-6">
                  <h2 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white mb-4">
                    Order Summary
                  </h2>
                  <div className="space-y-2 mb-4 max-h-60 overflow-y-auto">
                    {cart.map((item) => (
                      <div key={item.id} className="flex justify-between text-sm">
                        <span className="text-gray-600 dark:text-gray-400 truncate pr-2">
                          {item.name} × {item.quantity}
                        </span>
                        <span className="text-gray-900 dark:text-white font-medium flex-shrink-0">
                          {formatCurrency(item.price * item.quantity)}
                        </span>
                      </div>
                    ))}
                  </div>
                  <div className="border-t border-gray-200 dark:border-gray-700 pt-3 space-y-2">
                    <div className="flex justify-between text-sm sm:text-base text-gray-600 dark:text-gray-400">
                      <span>Subtotal</span>
                      <span>{formatCurrency(subtotal)}</span>
                    </div>
                    <div className="flex justify-between text-sm sm:text-base text-gray-600 dark:text-gray-400">
                      <span>Tax (10%)</span>
                      <span>{formatCurrency(tax)}</span>
                    </div>
                    {deliveryFee > 0 && (
                      <div className="flex justify-between text-sm sm:text-base text-gray-600 dark:text-gray-400">
                        <span className="truncate pr-2">
                          Delivery Fee
                          {selectedZone && ` (${selectedZone.name})`}
                        </span>
                        <span className="flex-shrink-0">{formatCurrency(deliveryFee)}</span>
                      </div>
                    )}
                    {formData.deliveryType === 'delivery' && selectedZone && deliveryFee === 0 && (
                      <div className="flex justify-between text-green-600 dark:text-green-400 text-sm">
                        <span>Free Delivery</span>
                        <span>✓</span>
                      </div>
                    )}
                    <div className="border-t border-gray-200 dark:border-gray-700 pt-3 flex justify-between text-base sm:text-lg font-bold text-gray-900 dark:text-white">
                      <span>Total</span>
                      <span>{formatCurrency(total)}</span>
                    </div>
                  </div>
                  <Button
                    type="submit"
                    className="w-full mt-4 md:mt-6"
                    disabled={isSubmitting || cart.length === 0}
                  >
                    {isSubmitting ? 'Placing Order...' : 'Place Order'}
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

