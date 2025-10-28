'use client';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { useCreateCheckoutSessionMutation } from '@/lib/api/endpoints/paymentsApi';
import { useGetSubscriptionPlansQuery } from '@/lib/api/endpoints/subscriptionsApi';
import { useAppSelector } from '@/lib/store';
import { ClockIcon, CreditCardIcon, SparklesIcon } from '@heroicons/react/24/outline';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';

export default function CheckoutPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAppSelector((state) => state.auth);
  const [createCheckoutSession, { isLoading }] = useCreateCheckoutSessionMutation();
  const { data: plansData, isLoading: isLoadingPlans } = useGetSubscriptionPlansQuery({});
  
  const planName = searchParams.get('plan') || 'premium';
  const afterRegistration = searchParams.get('after_registration') === 'true';
  
  // Get plans from API and find selected plan
  const [selectedPlan, setSelectedPlan] = useState<any>(null);

  useEffect(() => {
    if (!plansData) return;
    
    // Handle different response structures: data.data or data.plans
    let plans: any[] = [];
    if (Array.isArray(plansData)) {
      plans = plansData;
    } else {
      const nestedData = (plansData as any)?.data;
      if (Array.isArray(nestedData)) {
        plans = nestedData;
      } else if (Array.isArray(nestedData?.data)) {
        plans = nestedData.data;
      } else if (Array.isArray(nestedData?.plans)) {
        plans = nestedData.plans;
      } else {
        plans = (plansData as any)?.plans || [];
      }
    }
    
    if (Array.isArray(plans) && plans.length > 0) {
      // Find plan by name first, then fallback to first plan with price > 0
      const plan = plans.find((p: any) => p.name === planName) || plans.find((p: any) => p.price > 0) || plans[0];
      if (plan) {
        setSelectedPlan(plan);
      }
    }
  }, [plansData, planName]);

  useEffect(() => {
    if (!user?.companyId) {
      router.push('/auth/login');
    }
  }, [user, router]);

  const handleStartTrial = () => {
    // User wants to start trial without paying now
    toast.success('Your trial period has started! You can upgrade anytime from settings.');
    router.push('/dashboard');
  };

  const handlePayNow = async () => {
    if (!user?.companyId) {
      toast.error('Company information not found');
      return;
    }

    try {
      const successUrl = `${window.location.origin}/dashboard/subscriptions/success`;
      const cancelUrl = `${window.location.origin}/dashboard/subscriptions/checkout?plan=${planName}`;
      
      const response = await createCheckoutSession({
        companyId: user.companyId,
        planName: selectedPlan.name,
        successUrl,
        cancelUrl,
      }).unwrap();

      // Redirect to Stripe Checkout
      const checkoutUrl = (response as any).url || (response as any).data?.url;
      if (checkoutUrl) {
        window.location.href = checkoutUrl;
      } else {
        toast.error('Payment session creation failed');
      }
    } catch (error: any) {
      console.error('Checkout error:', error);
      toast.error(error?.data?.message || 'Failed to create payment session. Please try again.');
    }
  };

  if (!user?.companyId) {
    return null;
  }

  if (isLoadingPlans || !selectedPlan) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-12 px-4 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading plan details...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-8">
          <SparklesIcon className="w-16 h-16 text-primary-500 mx-auto mb-4" />
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            {afterRegistration ? 'Welcome! Complete Your Setup' : 'Upgrade Your Plan'}
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            {afterRegistration 
              ? 'Your account is ready! Choose to start your trial or activate your subscription now.'
              : 'Choose your preferred payment option'}
          </p>
        </div>

        <Card className="p-8 mb-6">
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              {selectedPlan.displayName || selectedPlan.name}
            </h2>
            <div className="flex items-center justify-center gap-2 text-3xl font-bold text-primary-600 dark:text-primary-400">
              <span>{selectedPlan.currency || 'BDT'}</span>
              <span>{selectedPlan.price?.toLocaleString() || '0'}</span>
              {selectedPlan.price > 0 && (
                <span className="text-lg text-gray-600 dark:text-gray-400">/{selectedPlan.billingCycle || 'month'}</span>
              )}
            </div>
            {selectedPlan.description && (
              <p className="text-gray-600 dark:text-gray-400 mt-2">{selectedPlan.description}</p>
            )}
          </div>

          <div className="space-y-4 mb-8">
            {selectedPlan.trialPeriod > 0 && (
              <div className="flex items-start gap-3 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                <ClockIcon className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-semibold text-blue-900 dark:text-blue-100">
                    {selectedPlan.trialPeriod / 24}-Day Free Trial
                  </p>
                  <p className="text-sm text-blue-700 dark:text-blue-300">
                    Full access to all features for {selectedPlan.trialPeriod / 24} days, no credit card required to start.
                  </p>
                </div>
              </div>
            )}

            {/* Use admin-managed featureList if available, otherwise use features */}
            {((selectedPlan.featureList && selectedPlan.featureList.length > 0) || selectedPlan.features) && (
              <div className="space-y-2">
                <h3 className="font-semibold text-gray-900 dark:text-white">What's Included:</h3>
                <ul className="space-y-2 text-gray-700 dark:text-gray-300">
                  {selectedPlan.featureList && selectedPlan.featureList.length > 0 ? (
                    // Use backend-managed feature list
                    selectedPlan.featureList.map((feature: string, idx: number) => (
                      <li key={idx} className="flex items-center gap-2">
                        <span className="text-green-500">✓</span>
                        {feature}
                      </li>
                    ))
                  ) : (
                    // Fallback: Generate from features object
                    <>
                      {selectedPlan.features?.pos && (
                        <li className="flex items-center gap-2">
                          <span className="text-green-500">✓</span>
                          Full POS System Access
                        </li>
                      )}
                      {selectedPlan.features?.inventory && (
                        <li className="flex items-center gap-2">
                          <span className="text-green-500">✓</span>
                          Inventory Management
                        </li>
                      )}
                      {selectedPlan.features?.accounting && (
                        <li className="flex items-center gap-2">
                          <span className="text-green-500">✓</span>
                          Advanced Reports & Analytics
                        </li>
                      )}
                      {selectedPlan.features?.multiBranch && (
                        <li className="flex items-center gap-2">
                          <span className="text-green-500">✓</span>
                          Multi-branch Support ({selectedPlan.features.maxBranches === -1 ? 'Unlimited' : selectedPlan.features.maxBranches})
                        </li>
                      )}
                      {selectedPlan.features?.maxUsers > 0 && (
                        <li className="flex items-center gap-2">
                          <span className="text-green-500">✓</span>
                          Up to {selectedPlan.features.maxUsers === -1 ? 'Unlimited' : selectedPlan.features.maxUsers} Users
                        </li>
                      )}
                      {selectedPlan.features?.crm && (
                        <li className="flex items-center gap-2">
                          <span className="text-green-500">✓</span>
                          Customer Relationship Management
                        </li>
                      )}
                      {selectedPlan.features?.aiInsights && (
                        <li className="flex items-center gap-2">
                          <span className="text-green-500">✓</span>
                          AI-Powered Insights
                        </li>
                      )}
                    </>
                  )}
                </ul>
              </div>
            )}
          </div>

          <div className="space-y-3">
            <Button
              onClick={handlePayNow}
              disabled={isLoading}
              className="w-full bg-primary-600 hover:bg-primary-700 text-white py-3 text-lg font-semibold"
            >
              <CreditCardIcon className="w-5 h-5 mr-2" />
              {isLoading ? 'Processing...' : 'Pay Now & Activate'}
            </Button>

            <Button
              onClick={handleStartTrial}
              variant="secondary"
              className="w-full border-2 border-primary-600 text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-900/20 py-3 text-lg font-semibold"
            >
              <ClockIcon className="w-5 h-5 mr-2" />
              Start Free Trial Now
            </Button>

            {afterRegistration && (
              <p className="text-center text-sm text-gray-500 dark:text-gray-400 mt-4">
                You can upgrade anytime from your dashboard settings
              </p>
            )}
          </div>
        </Card>

        <div className="text-center text-sm text-gray-500 dark:text-gray-400">
          <p>Secure payment powered by Stripe</p>
          <p className="mt-1">Cancel anytime. Your data is always safe.</p>
        </div>
      </div>
    </div>
  );
}

