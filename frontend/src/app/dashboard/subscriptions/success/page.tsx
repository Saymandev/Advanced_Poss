'use client';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { apiSlice } from '@/lib/api/apiSlice';
import { useGetCompanyByIdQuery } from '@/lib/api/endpoints/companiesApi';
import { useActivateSubscriptionMutation } from '@/lib/api/endpoints/paymentsApi';
import { useAppSelector } from '@/lib/store';
import { CheckCircleIcon, SparklesIcon } from '@heroicons/react/24/outline';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';

export default function PaymentSuccessPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAppSelector((state) => state.auth);
  const companyId = user?.companyId || '';
  const [activationAttempted, setActivationAttempted] = useState(false);

  // Get session_id from URL if available
  const sessionId = searchParams?.get('session_id') || null;

  // Refetch company and subscription data to get the latest status
  const { refetch: refetchCompany } = useGetCompanyByIdQuery(companyId, {
    skip: !companyId,
  });
  
  const [activateSubscription] = useActivateSubscriptionMutation();

  useEffect(() => {
    toast.success('Payment successful! Activating your subscription...');
    
    const activateAndRefresh = async () => {
      try {
        // If we have session_id, try manual activation (for local dev where webhooks don't work)
        if (sessionId && !activationAttempted) {
          setActivationAttempted(true);
          console.log('🔄 Attempting manual subscription activation for session:', sessionId);
          
          try {
            const result = await activateSubscription({ sessionId }).unwrap();
            if (result.success) {
              console.log('✅ Manual activation successful:', result.message);
              toast.success('Subscription activated successfully!');
            } else {
              console.warn('⚠️ Manual activation response:', result.message);
            }
          } catch (error: any) {
            console.error('❌ Manual activation failed:', error);
            // Don't show error toast - webhook might have already processed it
          }
        }

        // Invalidate all subscription and company related caches
        apiSlice.util.invalidateTags(['Subscription', 'Company']);
        apiSlice.util.resetApiState();
        
        // Wait a bit then refetch
        setTimeout(async () => {
          await refetchCompany();
          apiSlice.util.invalidateTags(['Subscription', 'Company']);
          
          // Check if subscription is now active
          const updatedData = await refetchCompany();
          const company = updatedData.data;
          
          if (company) {
            console.log('📊 Company status after activation:', {
              subscriptionStatus: company.subscriptionStatus,
              trialEndDate: company.trialEndDate,
              subscriptionPlan: company.subscriptionPlan,
            });
            
            // If still trial, wait a bit more and try again
            if (company.subscriptionStatus === 'trial' && company.trialEndDate) {
              console.log('⏳ Still showing trial, waiting for webhook...');
              setTimeout(async () => {
                await refetchCompany();
                apiSlice.util.invalidateTags(['Subscription', 'Company']);
              }, 5000);
            }
          }
        }, 2000);
      } catch (error) {
        console.error('Error in activation flow:', error);
      }
    };

    activateAndRefresh();
  }, [sessionId, activationAttempted, activateSubscription, refetchCompany]);

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

