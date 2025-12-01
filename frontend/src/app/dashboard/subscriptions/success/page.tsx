'use client';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { apiSlice } from '@/lib/api/apiSlice';
import { useGetCompanyByIdQuery } from '@/lib/api/endpoints/companiesApi';
import { useAppSelector } from '@/lib/store';
import { CheckCircleIcon, SparklesIcon } from '@heroicons/react/24/outline';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import toast from 'react-hot-toast';

export default function PaymentSuccessPage() {
  const router = useRouter();
  const { user } = useAppSelector((state) => state.auth);
  const companyId = user?.companyId || '';

  // Refetch company and subscription data to get the latest status
  const { refetch: refetchCompany } = useGetCompanyByIdQuery(companyId, {
    skip: !companyId,
  });

  useEffect(() => {
    toast.success('Payment successful! Your subscription is now active.');
    
    // Invalidate all subscription and company related caches
    // This ensures fresh data is fetched on the next page load
    const invalidateCache = async () => {
      try {
        // Immediately invalidate all cache tags
        apiSlice.util.invalidateTags(['Subscription', 'Company']);
        
        // Remove all cached queries for company and subscription
        apiSlice.util.resetApiState();
        
        // Wait for webhook to process (can take a few seconds)
        setTimeout(async () => {
          // Force refetch company data
          await refetchCompany();
          
          // Invalidate again after refetch
          apiSlice.util.invalidateTags(['Subscription', 'Company']);
          
          // Force another refetch after a short delay to ensure webhook completed
          setTimeout(async () => {
            await refetchCompany();
            apiSlice.util.invalidateTags(['Subscription', 'Company']);
          }, 3000);
        }, 3000);
      } catch (error) {
        console.error('Error invalidating cache:', error);
      }
    };

    invalidateCache();
  }, [refetchCompany]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <Card className="p-8 text-center">
          <div className="flex justify-center mb-6">
            <div className="w-20 h-20 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center">
              <CheckCircleIcon className="w-12 h-12 text-green-600 dark:text-green-400" />
            </div>
          </div>

          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
            Payment Successful!
          </h1>

          <p className="text-lg text-gray-600 dark:text-gray-400 mb-8">
            Your subscription has been activated successfully. You now have full access to all premium features.
          </p>

          <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-6 mb-8">
            <SparklesIcon className="w-8 h-8 text-green-600 dark:text-green-400 mx-auto mb-2" />
            <p className="text-green-800 dark:text-green-200 font-semibold">
              Subscription Active
            </p>
            <p className="text-sm text-green-700 dark:text-green-300 mt-1">
              Your account is ready to use with all features unlocked
            </p>
          </div>

          <Button
            onClick={async () => {
              // Force cache clear before navigating
              apiSlice.util.resetApiState();
              apiSlice.util.invalidateTags(['Subscription', 'Company']);
              
              // Navigate after a brief delay to ensure cache is cleared
              setTimeout(() => {
                router.push('/dashboard');
                // Force a hard refresh after navigation to ensure fresh data
                setTimeout(() => {
                  window.location.reload();
                }, 1000);
              }, 500);
            }}
            className="w-full bg-primary-600 hover:bg-primary-700 text-white py-3 text-lg font-semibold"
          >
            Go to Dashboard
          </Button>

          <p className="text-sm text-gray-500 dark:text-gray-400 mt-4">
            Need help? Contact our support team anytime.
          </p>
        </Card>
      </div>
    </div>
  );
}

