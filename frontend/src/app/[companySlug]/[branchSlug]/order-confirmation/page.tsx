'use client';

import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { useGetCompanyBySlugQuery } from '@/lib/api/endpoints/publicApi';
import { CheckCircleIcon, ExclamationTriangleIcon, HomeIcon, PhoneIcon } from '@heroicons/react/24/outline';
import Link from 'next/link';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';

export default function OrderConfirmationPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const companySlug = params.companySlug as string;
  const branchSlug = params.branchSlug as string;
  const orderIdFromUrl = searchParams.get('orderId');
  
  // Get tracking URL from sessionStorage if available (from checkout page)
  const [trackingUrl, setTrackingUrl] = useState<string | null>(null);
  const [orderNumber, setOrderNumber] = useState<string | null>(null);
  const orderId = orderIdFromUrl || orderNumber || 'pending';
  
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const storedTrackingUrl = sessionStorage.getItem('lastTrackingUrl');
      const storedOrderNumber = sessionStorage.getItem('lastOrderNumber');
      if (storedTrackingUrl) {
        setTrackingUrl(storedTrackingUrl);
        sessionStorage.removeItem('lastTrackingUrl'); // Clear after use
      }
      if (storedOrderNumber) {
        setOrderNumber(storedOrderNumber);
        sessionStorage.removeItem('lastOrderNumber'); // Clear after use
      }
      sessionStorage.removeItem('lastOrderId'); // Clear after use
    }
  }, []);

  const { 
    data: company, 
    isLoading,
    isError,
    error 
  } = useGetCompanyBySlugQuery(companySlug, {
    skip: !companySlug,
  });

  useEffect(() => {
    if (isError) {
      const errorMessage = (error as any)?.data?.message || 'Failed to load company information';
      toast.error(errorMessage);
    }
  }, [isError, error]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  if (isError || !company) {
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

  // Validate orderId
  if (!orderId || orderId === 'pending') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4">
        <Card className="max-w-md w-full">
          <CardContent className="p-8 text-center">
            <ExclamationTriangleIcon className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Order Processing</h1>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Your order is being processed. Please check back in a moment or contact us if you have your order number.
            </p>
            <div className="flex gap-3 justify-center">
              <Link href={`/${companySlug}/${branchSlug}/shop`}>
                <Button variant="secondary">Continue Shopping</Button>
              </Link>
              {company?.phone && (
                <a href={`tel:${company.phone}`}>
                  <Button>
                    <PhoneIcon className="w-4 h-4 mr-2" />
                    Call Us
                  </Button>
                </a>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center px-4 py-8">
      <Card className="max-w-2xl w-full">
        <CardContent className="p-6 md:p-8 text-center">
          <div className="w-16 h-16 sm:w-20 sm:h-20 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4 md:mb-6">
            <CheckCircleIcon className="w-10 h-10 sm:w-12 sm:h-12 text-green-600 dark:text-green-400" />
          </div>
          
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Order Confirmed!
          </h1>
          <p className="text-base sm:text-lg text-gray-600 dark:text-gray-400 mb-4 md:mb-6">
            Thank you for your order. We're preparing it now.
          </p>

          {orderId && orderId !== 'pending' && (
            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 md:p-6 mb-4 md:mb-6">
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Order Number</p>
              <p className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mb-3 md:mb-4">
                {orderNumber || orderId}
              </p>
              {/* Use tracking URL from sessionStorage if available, otherwise build from slugs */}
              <Link href={trackingUrl || `/${companySlug}/${branchSlug}/track/${orderId}`}>
                <Button variant="secondary" className="w-full">
                  Track Your Order
                </Button>
              </Link>
            </div>
          )}

          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 md:p-6 mb-4 md:mb-6 text-left">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-2 md:mb-3">
              What's Next?
            </h3>
            <ul className="text-sm sm:text-base text-gray-700 dark:text-gray-300 space-y-1.5 md:space-y-2">
              <li>• You'll receive a confirmation email shortly</li>
              <li>• Estimated preparation time: 20-30 minutes</li>
              {company?.phone && (
                <li className="flex items-center gap-2">
                  <span>• Questions? Call us at</span>
                  <a 
                    href={`tel:${company.phone}`}
                    className="text-primary-600 dark:text-primary-400 hover:underline flex items-center gap-1"
                  >
                    <PhoneIcon className="w-4 h-4" />
                    {company.phone}
                  </a>
                </li>
              )}
            </ul>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 md:gap-4 justify-center">
            <Button
              onClick={() => router.push(`/${companySlug}/${branchSlug}/shop`)}
              className="w-full sm:w-auto"
            >
              Order Again
            </Button>
            <Link href={`/${companySlug}`} className="w-full sm:w-auto">
              <Button variant="secondary" className="w-full sm:w-auto">
                <HomeIcon className="w-5 h-5 mr-2" />
                Back to Home
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

