'use client';

import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { useCreateReviewMutation, useGetReviewByOrderQuery } from '@/lib/api/endpoints/reviewsApi';
import { useGetOrdersQuery } from '@/lib/api/endpoints/ordersApi';
import { useGetTableByIdQuery } from '@/lib/api/endpoints/tablesApi';
import { formatCurrency, formatDateTime } from '@/lib/utils';
import { CheckCircleIcon, ClockIcon, FireIcon, ShoppingBagIcon, StarIcon } from '@heroicons/react/24/outline';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';

export default function CustomerDisplayPage() {
  const params = useParams();
  const tableId = params.tableId as string;

  const { data: tableData } = useGetTableByIdQuery(tableId);
  const { data: ordersData, refetch } = useGetOrdersQuery({ 
    tableId,
    status: 'pending,preparing,ready,paid',
  });

  const currentOrder = ordersData?.orders?.[0];
  const orderId = currentOrder?.id || currentOrder?._id;

  // Check if review already exists
  const { data: existingReview } = useGetReviewByOrderQuery(orderId || '', {
    skip: !orderId,
  });

  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
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

  // Optimized polling - increased interval to reduce API calls
  // WebSocket would be ideal but this is a public page, so using longer polling interval
  useEffect(() => {
    if (!orderId) return; // Don't poll if no order
    
    const interval = setInterval(() => {
      refetch();
    }, 30000); // Changed from 3s to 30s - much more efficient
    
    return () => clearInterval(interval);
  }, [refetch, orderId]);

  // Show review button when order is ready or paid
  const canReview = currentOrder && (currentOrder.status === 'ready' || currentOrder.status === 'paid') && !existingReview;

  const handleSubmitReview = async () => {
    if (!currentOrder || !orderId) return;

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
      const itemReviews = currentOrder.items?.map((item: any) => {
        const itemId = item.menuItemId?._id?.toString() || item.menuItemId?.toString() || item.menuItemId || item.id;
        const itemRating = reviewForm.itemRatings[itemId] || { rating: 0, comment: '' };
        return {
          menuItemId: itemId,
          menuItemName: item.name,
          rating: itemRating.rating || reviewForm.foodRating, // Fallback to food rating
          comment: itemRating.comment,
        };
      }).filter((item: any) => item.rating > 0) || [];

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
      setIsReviewModalOpen(false);
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

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'pending':
        return {
          icon: ShoppingBagIcon,
          color: 'text-yellow-600 dark:text-yellow-400',
          bgColor: 'bg-yellow-100 dark:bg-yellow-900/30',
          label: 'Order Received',
          description: 'Your order has been placed and is being prepared',
          progress: 33,
        };
      case 'preparing':
        return {
          icon: FireIcon,
          color: 'text-blue-600 dark:text-blue-400',
          bgColor: 'bg-blue-100 dark:bg-blue-900/30',
          label: 'Preparing',
          description: 'Our chefs are working on your order',
          progress: 66,
        };
      case 'ready':
        return {
          icon: CheckCircleIcon,
          color: 'text-green-600 dark:text-green-400',
          bgColor: 'bg-green-100 dark:bg-green-900/30',
          label: 'Ready to Serve',
          description: 'Your order is ready and will be served shortly',
          progress: 100,
        };
      default:
        return {
          icon: ClockIcon,
          color: 'text-gray-600 dark:text-gray-400',
          bgColor: 'bg-gray-100 dark:bg-gray-900/30',
          label: 'Pending',
          description: 'Waiting for updates',
          progress: 0,
        };
    }
  };

  if (!currentOrder) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary-500 via-primary-600 to-secondary-600 flex items-center justify-center p-6">
        <Card className="max-w-2xl w-full">
          <CardContent className="p-12 text-center">
            <div className="flex flex-col items-center gap-6">
              <div className="p-6 bg-primary-100 dark:bg-primary-900/30 rounded-full">
                <ShoppingBagIcon className="w-20 h-20 text-primary-600 dark:text-primary-400" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                  Welcome to Table {tableData?.number}
                </h1>
                <p className="text-gray-600 dark:text-gray-400 text-lg">
                  No active orders at the moment
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-500 mt-4">
                  Scan the QR code on your table to place an order
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const statusConfig = getStatusConfig(currentOrder.status);
  const StatusIcon = statusConfig.icon;

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-500 via-primary-600 to-secondary-600 p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center text-white">
          <h1 className="text-4xl font-bold mb-2">🍽️ Advanced POS</h1>
          <p className="text-xl text-primary-100">
            Table {tableData?.number} • Order #{currentOrder.orderNumber}
          </p>
          <p className="text-sm text-primary-200 mt-2">
            {formatDateTime(currentOrder.createdAt)}
          </p>
        </div>

        {/* Status Card */}
        <Card className="shadow-2xl">
          <CardContent className="p-8">
            <div className="flex flex-col items-center text-center mb-8">
              <div className={`p-6 rounded-full ${statusConfig.bgColor} mb-4 animate-pulse`}>
                <StatusIcon className={`w-20 h-20 ${statusConfig.color}`} />
              </div>
              <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                {statusConfig.label}
              </h2>
              <p className="text-lg text-gray-600 dark:text-gray-400">
                {statusConfig.description}
              </p>
            </div>

            {/* Progress Bar */}
            <div className="mb-8">
              <div className="flex justify-between mb-2">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Order Progress
                </span>
                <span className="text-sm font-medium text-primary-600 dark:text-primary-400">
                  {statusConfig.progress}%
                </span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-4 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-1000 ${
                    statusConfig.progress === 100
                      ? 'bg-green-600'
                      : statusConfig.progress >= 66
                      ? 'bg-blue-600'
                      : 'bg-yellow-600'
                  }`}
                  style={{ width: `${statusConfig.progress}%` }}
                />
              </div>
            </div>

            {/* Timeline */}
            <div className="flex justify-between items-center mb-8">
              {['Order Placed', 'Preparing', 'Ready'].map((step, idx) => (
                <div key={step} className="flex flex-col items-center flex-1">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${
                      idx < statusConfig.progress / 33
                        ? 'bg-green-600 text-white'
                        : 'bg-gray-300 dark:bg-gray-600 text-gray-600 dark:text-gray-400'
                    }`}
                  >
                    {idx < statusConfig.progress / 33 ? '✓' : idx + 1}
                  </div>
                  <p className="text-xs mt-2 text-gray-600 dark:text-gray-400">{step}</p>
                </div>
              ))}
            </div>

            {/* Order Items */}
            <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
              <h3 className="font-semibold text-lg text-gray-900 dark:text-white mb-4">
                Your Order
              </h3>
              <div className="space-y-3">
                {currentOrder.items?.map((item: any, idx: number) => (
                  <div
                    key={idx}
                    className="flex justify-between items-center p-4 bg-gray-50 dark:bg-gray-800 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 font-bold">
                        {item.quantity}
                      </span>
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">{item.name}</p>
                        {item.notes && (
                          <p className="text-sm text-gray-500 dark:text-gray-400">{item.notes}</p>
                        )}
                      </div>
                    </div>
                    <span className="font-semibold text-gray-900 dark:text-white">
                      {formatCurrency(item.price * item.quantity)}
                    </span>
                  </div>
                ))}
              </div>

              {/* Total */}
              <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Subtotal</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Tax (10%)</p>
                    <p className="text-lg font-bold text-gray-900 dark:text-white mt-2">Total</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-900 dark:text-white">
                      {formatCurrency(currentOrder.subtotal)}
                    </p>
                    <p className="text-sm text-gray-900 dark:text-white">
                      {formatCurrency(currentOrder.tax)}
                    </p>
                    <p className="text-2xl font-bold text-primary-600 dark:text-primary-400 mt-2">
                      {formatCurrency(currentOrder.total)}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Review Button - Show when order is ready/paid */}
        {canReview && (
          <Card className="shadow-2xl border-2 border-yellow-400">
            <CardContent className="p-6">
              <div className="text-center">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                  How was your experience?
                </h3>
                <p className="text-gray-600 dark:text-gray-400 mb-4">
                  We'd love to hear your feedback!
                </p>
                <Button
                  onClick={() => setIsReviewModalOpen(true)}
                  className="bg-yellow-500 hover:bg-yellow-600 text-white"
                >
                  Leave a Review
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Review Submitted Message */}
        {existingReview && (
          <Card className="shadow-2xl border-2 border-green-400">
            <CardContent className="p-6">
              <div className="text-center">
                <CheckCircleIcon className="w-12 h-12 text-green-500 mx-auto mb-2" />
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                  Thank you for your review!
                </h3>
                <p className="text-gray-600 dark:text-gray-400">
                  We appreciate your feedback and look forward to serving you again.
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Footer */}
        <div className="text-center text-white text-sm">
          <p className="text-primary-100">
            Thank you for dining with us! 
          </p>
          <p className="text-primary-200 text-xs mt-1">
            Display updates automatically every 3 seconds
          </p>
        </div>
      </div>

      {/* Review Modal */}
      <Modal
        isOpen={isReviewModalOpen}
        onClose={() => setIsReviewModalOpen(false)}
        title="Share Your Experience"
        className="max-w-2xl max-h-[90vh] overflow-y-auto"
      >
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
          {currentOrder?.waiterName && (
            <div className="space-y-3 border-t border-gray-200 dark:border-gray-700 pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Waiter Service</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {currentOrder.waiterName}
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
          {currentOrder?.items && currentOrder.items.length > 0 && (
            <div className="space-y-4 border-t border-gray-200 dark:border-gray-700 pt-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Rate Your Items</h3>
              <div className="space-y-3">
                {currentOrder.items.map((item: any, idx: number) => {
                  const itemId = item.menuItemId?._id?.toString() || item.menuItemId?.toString() || item.menuItemId || item.id || idx.toString();
                  const itemRating = reviewForm.itemRatings[itemId] || { rating: 0, comment: '' };
                  
                  return (
                    <div key={itemId} className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <p className="font-medium text-gray-900 dark:text-white">
                            {item.quantity}x {item.name}
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
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <Button
              variant="secondary"
              onClick={() => setIsReviewModalOpen(false)}
              disabled={isSubmittingReview}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmitReview}
              disabled={isSubmittingReview}
              className="bg-yellow-500 hover:bg-yellow-600 text-white"
            >
              {isSubmittingReview ? 'Submitting...' : 'Submit Review'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
