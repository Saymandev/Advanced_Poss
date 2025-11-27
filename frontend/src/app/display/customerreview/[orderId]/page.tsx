'use client';

import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { useGetPOSOrderQuery } from '@/lib/api/endpoints/posApi';
import { useCreateReviewMutation, useGetReviewByOrderQuery } from '@/lib/api/endpoints/reviewsApi';
import { formatCurrency, formatDateTime } from '@/lib/utils';
import { CheckCircleIcon, ShoppingBagIcon, StarIcon } from '@heroicons/react/24/outline';
import { useParams } from 'next/navigation';
import { useState } from 'react';
import toast from 'react-hot-toast';

export default function CustomerReviewPage() {
  const params = useParams();
  const orderId = params.orderId as string;

  const { data: order, isLoading: isLoadingOrder } = useGetPOSOrderQuery(orderId, {
    skip: !orderId,
  });

  // Check if review already exists
  const { data: existingReview } = useGetReviewByOrderQuery(orderId, {
    skip: !orderId,
  });

  const [createReview, { isLoading: isSubmittingReview }] = useCreateReviewMutation();

  // Review form state
  const [reviewForm, setReviewForm] = useState({
    customerName: '',
    customerEmail: '',
    waiterRating: 0,
    foodRating: 0,
    ambianceRating: 0,
    overallRating: 0,
    comment: '',
    itemRatings: {} as Record<string, { rating: number; comment: string }>,
  });

  const handleSubmitReview = async () => {
    if (!order || !orderId) return;

    // Validation
    if (!reviewForm.customerName.trim()) {
      toast.error('Please enter your name');
      return;
    }

    if (!reviewForm.customerEmail.trim()) {
      toast.error('Please enter your email');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(reviewForm.customerEmail)) {
      toast.error('Please enter a valid email address');
      return;
    }

    if (reviewForm.overallRating === 0) {
      toast.error('Please provide an overall rating');
      return;
    }

    if (reviewForm.foodRating === 0) {
      toast.error('Please provide a food rating');
      return;
    }

    try {
      const itemReviews = order.items?.map((item: any, idx: number) => {
        // Safely extract menuItemId - handle all possible formats
        let itemId: string = '';
        try {
          if (item.menuItemId) {
            if (typeof item.menuItemId === 'object' && item.menuItemId !== null) {
              // Handle populated menuItemId object
              const idValue = item.menuItemId._id || item.menuItemId.id;
              if (idValue !== undefined && idValue !== null) {
                if (typeof idValue === 'string') {
                  itemId = idValue;
                } else if (typeof idValue === 'object' && typeof idValue.toString === 'function') {
                  try {
                    itemId = idValue.toString();
                  } catch (e) {
                    itemId = String(idValue);
                  }
                } else {
                  itemId = String(idValue);
                }
              } else {
                itemId = String(item.menuItemId);
              }
            } else {
              itemId = String(item.menuItemId);
            }
          } else if (item.id) {
            itemId = String(item.id);
          } else {
            itemId = idx.toString();
          }
        } catch (error) {
          console.error('Error extracting menuItemId:', error, item);
          itemId = idx.toString();
        }
        
        // Skip if we couldn't get a valid itemId
        if (!itemId || itemId === 'undefined' || itemId === 'null' || itemId === '[object Object]') {
          console.warn('Invalid itemId extracted:', itemId, 'for item:', item);
          return null;
        }
        
        const itemRating = reviewForm.itemRatings[itemId] || { rating: 0, comment: '' };
        
        // Get item name - check item.name (stored), then populated menuItemId, then fallback
        let itemName = 'Unknown Item';
        if (item.name) {
          itemName = item.name;
        } else if (item.menuItemId) {
          if (typeof item.menuItemId === 'object' && item.menuItemId !== null) {
            itemName = item.menuItemId.name || 'Unknown Item';
          } else {
            itemName = `Item ${idx + 1}`;
          }
        } else {
          itemName = `Item ${idx + 1}`;
        }
        
        return {
          menuItemId: itemId,
          menuItemName: itemName,
          rating: itemRating.rating || reviewForm.foodRating,
          comment: itemRating.comment || '',
        };
      }).filter((item: any): item is NonNullable<typeof item> => item !== null && item.rating > 0 && item.menuItemId) || [];

      await createReview({
        orderId,
        customerName: reviewForm.customerName.trim(),
        customerEmail: reviewForm.customerEmail.trim(),
        waiterRating: reviewForm.waiterRating > 0 ? reviewForm.waiterRating : undefined,
        foodRating: reviewForm.foodRating,
        ambianceRating: reviewForm.ambianceRating > 0 ? reviewForm.ambianceRating : undefined,
        overallRating: reviewForm.overallRating,
        comment: reviewForm.comment.trim() || undefined,
        itemReviews: itemReviews.length > 0 ? itemReviews : undefined,
      }).unwrap();

      toast.success('Thank you for your review!');
      // Reset form
      setReviewForm({
        customerName: '',
        customerEmail: '',
        waiterRating: 0,
        foodRating: 0,
        ambianceRating: 0,
        overallRating: 0,
        comment: '',
        itemRatings: {},
      });
    } catch (error: any) {
      toast.error(error?.data?.message || 'Failed to submit review. Please try again.');
    }
  };

  const StarRating = ({ 
    rating, 
    onRatingChange, 
    size = 'md' 
  }: { 
    rating: number; 
    onRatingChange: (rating: number) => void;
    size?: 'sm' | 'md' | 'lg';
  }) => {
    const sizeClasses = {
      sm: 'w-5 h-5',
      md: 'w-6 h-6',
      lg: 'w-8 h-8',
    };

    return (
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => onRatingChange(star)}
            className={`${sizeClasses[size]} transition-colors ${
              star <= rating
                ? 'text-yellow-400 fill-yellow-400'
                : 'text-gray-300 fill-gray-300 hover:text-yellow-300 hover:fill-yellow-300'
            }`}
          >
            <StarIcon className="w-full h-full" />
          </button>
        ))}
      </div>
    );
  };

  if (isLoadingOrder) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary-500 via-primary-600 to-secondary-600 flex items-center justify-center p-6">
        <Card className="max-w-2xl w-full">
          <CardContent className="p-12 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
            <p className="text-gray-600 dark:text-gray-400">Loading order details...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary-500 via-primary-600 to-secondary-600 flex items-center justify-center p-6">
        <Card className="max-w-2xl w-full">
          <CardContent className="p-12 text-center">
            <ShoppingBagIcon className="w-20 h-20 text-gray-400 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              Order Not Found
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              The order you're looking for doesn't exist or has been removed.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // If review already submitted, show success message
  if (existingReview) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary-500 via-primary-600 to-secondary-600 p-6">
        <div className="max-w-4xl mx-auto">
          <Card className="shadow-2xl border-2 border-green-400">
            <CardContent className="p-12 text-center">
              <CheckCircleIcon className="w-20 h-20 text-green-500 mx-auto mb-4" />
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                Thank You for Your Review!
              </h1>
              <p className="text-lg text-gray-600 dark:text-gray-400 mb-6">
                We appreciate your feedback and look forward to serving you again.
              </p>
              <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-6 text-left">
                <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Order Details</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Order Number:</span>
                    <span className="font-medium text-gray-900 dark:text-white">{order.orderNumber}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Date:</span>
                    <span className="font-medium text-gray-900 dark:text-white">
                      {formatDateTime(order.createdAt)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Total:</span>
                    <span className="font-medium text-gray-900 dark:text-white">
                      {formatCurrency(order.totalAmount || 0)}
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Waiter name - userId may be populated from backend
  const waiterName = (order as any).userId?.name || 
                    ((order as any).userId?.firstName && (order as any).userId?.lastName 
                      ? `${(order as any).userId.firstName} ${(order as any).userId.lastName}` 
                      : (order as any).userId?.firstName) || 
                    'N/A';

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-500 via-primary-600 to-secondary-600 p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center text-white">
          <h1 className="text-4xl font-bold mb-2">🍽️ Review Your Order</h1>
          <p className="text-xl text-primary-100">
            Order #{order.orderNumber}
          </p>
          <p className="text-sm text-primary-200 mt-2">
            {formatDateTime(order.createdAt)}
          </p>
        </div>

        {/* Order Summary Card */}
        <Card className="shadow-2xl">
          <CardContent className="p-8">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
              Order Summary
            </h2>

            {/* Order Items */}
            <div className="space-y-3 mb-6">
              {order.items?.map((item: any, idx: number) => {
                // Safely extract menuItemId - handle all possible formats
                let itemId: string = '';
                try {
                  if (item.menuItemId) {
                    if (typeof item.menuItemId === 'object' && item.menuItemId !== null) {
                      // Handle populated menuItemId object
                      const idValue = item.menuItemId._id || item.menuItemId.id;
                      if (idValue !== undefined && idValue !== null) {
                        if (typeof idValue === 'string') {
                          itemId = idValue;
                        } else if (typeof idValue === 'object' && typeof idValue.toString === 'function') {
                          try {
                            itemId = idValue.toString();
                          } catch (e) {
                            itemId = String(idValue);
                          }
                        } else {
                          itemId = String(idValue);
                        }
                      } else {
                        itemId = String(item.menuItemId);
                      }
                    } else {
                      itemId = String(item.menuItemId);
                    }
                  } else if (item.id) {
                    itemId = String(item.id);
                  } else {
                    itemId = idx.toString();
                  }
                } catch (error) {
                  console.error('Error extracting menuItemId in display:', error, item);
                  itemId = idx.toString();
                }
                
                const itemPrice = item.price || 0;
                const itemQuantity = item.quantity || 1;

                // Get item name - check item.name (stored), then populated menuItemId, then fallback
                let itemName = 'Unknown Item';
                if (item.name) {
                  itemName = item.name;
                } else if (item.menuItemId) {
                  if (typeof item.menuItemId === 'object' && item.menuItemId !== null) {
                    itemName = item.menuItemId.name || 'Unknown Item';
                  } else {
                    itemName = `Item ${idx + 1}`;
                  }
                } else {
                  itemName = `Item ${idx + 1}`;
                }

                return (
                  <div
                    key={itemId}
                    className="flex justify-between items-center p-4 bg-gray-50 dark:bg-gray-800 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 font-bold">
                        {itemQuantity}
                      </span>
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">{itemName}</p>
                        {item.notes && (
                          <p className="text-sm text-gray-500 dark:text-gray-400">{item.notes}</p>
                        )}
                      </div>
                    </div>
                    <span className="font-semibold text-gray-900 dark:text-white">
                      {formatCurrency(itemPrice * itemQuantity)}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Total */}
            <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Subtotal</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Tax</p>
                  <p className="text-lg font-bold text-gray-900 dark:text-white mt-2">Total</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-900 dark:text-white">
                    {formatCurrency(order.totalAmount || 0)}
                  </p>
                  <p className="text-sm text-gray-900 dark:text-white">
                    {formatCurrency(0)}
                  </p>
                  <p className="text-2xl font-bold text-primary-600 dark:text-primary-400 mt-2">
                    {formatCurrency(order.totalAmount || 0)}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Review Form Card */}
        <Card className="shadow-2xl">
          <CardContent className="p-8">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
              Share Your Experience
            </h2>

            <div className="space-y-6">
              {/* Customer Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Your Information</h3>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Name *
                  </label>
                  <Input
                    type="text"
                    value={reviewForm.customerName}
                    onChange={(e) => setReviewForm({ ...reviewForm, customerName: e.target.value })}
                    placeholder="Enter your name"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Email *
                  </label>
                  <Input
                    type="email"
                    value={reviewForm.customerEmail}
                    onChange={(e) => setReviewForm({ ...reviewForm, customerEmail: e.target.value })}
                    placeholder="Enter your email"
                    required
                  />
                </div>
              </div>

              {/* Waiter Rating */}
              {waiterName !== 'N/A' && (
                <div className="space-y-3 border-t border-gray-200 dark:border-gray-700 pt-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Waiter Service</h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {waiterName}
                      </p>
                    </div>
                    <StarRating
                      rating={reviewForm.waiterRating}
                      onRatingChange={(rating) => setReviewForm({ ...reviewForm, waiterRating: rating })}
                    />
                  </div>
                </div>
              )}

              {/* Food Rating */}
              <div className="space-y-3 border-t border-gray-200 dark:border-gray-700 pt-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Food Quality *</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      How was the food?
                    </p>
                  </div>
                  <StarRating
                    rating={reviewForm.foodRating}
                    onRatingChange={(rating) => setReviewForm({ ...reviewForm, foodRating: rating })}
                  />
                </div>
              </div>

              {/* Individual Item Ratings */}
              {order.items && order.items.length > 0 && (
                <div className="space-y-4 border-t border-gray-200 dark:border-gray-700 pt-4">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Rate Your Items</h3>
                  <div className="space-y-3">
                    {order.items.map((item: any, idx: number) => {
                      // Safely extract menuItemId - handle all possible formats
                      let itemId: string = '';
                      try {
                        if (item.menuItemId) {
                          if (typeof item.menuItemId === 'object' && item.menuItemId !== null) {
                            // Handle populated menuItemId object
                            const idValue = item.menuItemId._id || item.menuItemId.id;
                            if (idValue !== undefined && idValue !== null) {
                              if (typeof idValue === 'string') {
                                itemId = idValue;
                              } else if (typeof idValue === 'object' && typeof idValue.toString === 'function') {
                                try {
                                  itemId = idValue.toString();
                                } catch (e) {
                                  itemId = String(idValue);
                                }
                              } else {
                                itemId = String(idValue);
                              }
                            } else {
                              itemId = String(item.menuItemId);
                            }
                          } else {
                            itemId = String(item.menuItemId);
                          }
                        } else if (item.id) {
                          itemId = String(item.id);
                        } else {
                          itemId = idx.toString();
                        }
                      } catch (error) {
                        console.error('Error extracting menuItemId in form:', error, item);
                        itemId = idx.toString();
                      }
                      
                      const itemRating = reviewForm.itemRatings[itemId] || { rating: 0, comment: '' };
                      
                      // Get item name - check item.name (stored), then populated menuItemId, then fallback
                      let itemName = 'Unknown Item';
                      if (item.name) {
                        itemName = item.name;
                      } else if (item.menuItemId) {
                        if (typeof item.menuItemId === 'object' && item.menuItemId !== null) {
                          itemName = item.menuItemId.name || 'Unknown Item';
                        } else {
                          itemName = `Item ${idx + 1}`;
                        }
                      } else {
                        itemName = `Item ${idx + 1}`;
                      }
                      
                      return (
                        <div key={itemId} className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex-1">
                              <p className="font-medium text-gray-900 dark:text-white">
                                {item.quantity}x {itemName}
                              </p>
                            </div>
                            <StarRating
                              rating={itemRating.rating}
                              onRatingChange={(rating) => {
                                setReviewForm({
                                  ...reviewForm,
                                  itemRatings: {
                                    ...reviewForm.itemRatings,
                                    [itemId]: { ...itemRating, rating },
                                  },
                                });
                              }}
                              size="sm"
                            />
                          </div>
                          <Input
                            type="text"
                            value={itemRating.comment}
                            onChange={(e) => {
                              setReviewForm({
                                ...reviewForm,
                                itemRatings: {
                                  ...reviewForm.itemRatings,
                                  [itemId]: { ...itemRating, comment: e.target.value },
                                },
                              });
                            }}
                            placeholder="Optional comment..."
                            className="mt-2"
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Ambiance Rating */}
              <div className="space-y-3 border-t border-gray-200 dark:border-gray-700 pt-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Ambiance</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      How was the atmosphere?
                    </p>
                  </div>
                  <StarRating
                    rating={reviewForm.ambianceRating}
                    onRatingChange={(rating) => setReviewForm({ ...reviewForm, ambianceRating: rating })}
                  />
                </div>
              </div>

              {/* Overall Rating */}
              <div className="space-y-3 border-t border-gray-200 dark:border-gray-700 pt-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Overall Experience *</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      How would you rate your overall experience?
                    </p>
                  </div>
                  <StarRating
                    rating={reviewForm.overallRating}
                    onRatingChange={(rating) => setReviewForm({ ...reviewForm, overallRating: rating })}
                    size="lg"
                  />
                </div>
              </div>

              {/* Comment */}
              <div className="space-y-2 border-t border-gray-200 dark:border-gray-700 pt-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Additional Comments (Optional)
                </label>
                <textarea
                  value={reviewForm.comment}
                  onChange={(e) => setReviewForm({ ...reviewForm, comment: e.target.value })}
                  placeholder="Tell us more about your experience..."
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>

              {/* Submit Button */}
              <div className="flex justify-end pt-4 border-t border-gray-200 dark:border-gray-700">
                <Button
                  onClick={handleSubmitReview}
                  disabled={isSubmittingReview}
                  className="bg-yellow-500 hover:bg-yellow-600 text-white px-8 py-2"
                >
                  {isSubmittingReview ? 'Submitting...' : 'Submit Review'}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

