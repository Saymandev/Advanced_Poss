'use client';

import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { DataTable } from '@/components/ui/DataTable';
import { Modal } from '@/components/ui/Modal';
import { useGetCompanyByIdQuery } from '@/lib/api/endpoints/companiesApi';
import {
  BillingHistory,
  useCancelSubscriptionMutation,
  useCreateSubscriptionMutation,
  useGetBillingHistoryQuery,
  useGetCurrentSubscriptionQuery,
  useGetSubscriptionByCompanyQuery,
  useGetSubscriptionPlansQuery,
  useGetUsageStatsQuery,
  useReactivateSubscriptionMutation,
  useUpdateSubscriptionMutation,
} from '@/lib/api/endpoints/subscriptionsApi';
import { useAppSelector } from '@/lib/store';
import { formatCurrency, formatDateTime } from '@/lib/utils';
import {
  ArrowTrendingUpIcon,
  CheckCircleIcon,
  ClockIcon,
  CreditCardIcon,
  DocumentArrowDownIcon,
  ExclamationTriangleIcon,
  XCircleIcon,
} from '@heroicons/react/24/outline';
import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';

export default function SubscriptionsPage() {
  const { user } = useAppSelector((state) => state.auth);
  const companyId = user?.companyId || '';
  const { data: plansData, isLoading: isPlanLoading, error: plansError } = useGetSubscriptionPlansQuery({});
  
  // Normalize plans data - transformResponse handles the normalization
  const plans = useMemo(() => {
    if (!plansData) return [];
    
    // transformResponse returns normalized array or { plans: [...] }
    if (Array.isArray(plansData)) {
      return plansData;
    }
    
    // Handle { plans: [...] } format from transformResponse
    if (plansData && typeof plansData === 'object' && 'plans' in plansData) {
      return Array.isArray((plansData as any).plans) ? (plansData as any).plans : [];
    }
    
    return [];
  }, [plansData]);
  // Get company data to use as fallback for subscription info
  const { data: companyData } = useGetCompanyByIdQuery(companyId, {
    skip: !companyId,
  });

  const { 
    data: currentSubscription, 
    isFetching: isSubscriptionLoading,
  } = useGetCurrentSubscriptionQuery(
    { companyId },
    { 
      skip: !companyId,
      // Don't throw error if subscription not found - company might be on trial
      refetchOnMountOrArgChange: true,
    },
  );

  // Also try to fetch subscription by company (includes inactive ones)
  // This helps when getCurrentSubscription returns 404 but subscription exists
  const { data: subscriptionByCompany, refetch: refetchSubscriptionByCompany } = useGetSubscriptionByCompanyQuery(
    { companyId },
    { 
      skip: !companyId || !!currentSubscription, // Skip if we already have currentSubscription
    },
  );

  // Use subscriptionByCompany if currentSubscription is not available
  const actualSubscription = currentSubscription || subscriptionByCompany;

  // Create subscription object from company data if subscription record doesn't exist
  const subscriptionFromCompany = useMemo(() => {
    // If subscription record exists, use it
    if (actualSubscription) return null;
    
    // If no company data or no subscription plan, return null
    if (!companyData || !companyData.subscriptionPlan) return null;

    // Find plan details to build subscription object
    const plan = plans.find((p: any) => p.name === companyData.subscriptionPlan);
    if (!plan) return null;

    const isTrial = companyData.subscriptionStatus === 'trial';
    const trialEndDate = companyData.trialEndDate 
      ? new Date(companyData.trialEndDate).toISOString()
      : null;

    return {
      id: 'company-subscription',
      companyId: companyData.id,
      planId: plan.id,
      plan: {
        ...plan,
        id: plan.id,
      },
      planKey: companyData.subscriptionPlan,
      status: isTrial ? 'active' : (companyData.subscriptionStatus || 'active'),
      currentPeriodStart: ((companyData as any).subscriptionStartDate) 
        ? new Date((companyData as any).subscriptionStartDate).toISOString()
        : new Date().toISOString(),
      currentPeriodEnd: companyData.subscriptionEndDate 
        ? new Date(companyData.subscriptionEndDate).toISOString()
        : (trialEndDate || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()),
      cancelAtPeriodEnd: false,
      trialEnd: trialEndDate,
      isTrial: isTrial,
      createdAt: companyData.createdAt,
      updatedAt: companyData.updatedAt,
    };
  }, [actualSubscription, companyData, plans]);

  // Use subscription from company if subscription record doesn't exist
  const effectiveSubscription = actualSubscription || subscriptionFromCompany;
  const { data: usageStats } = useGetUsageStatsQuery(
    { companyId },
    { skip: !companyId },
  );
  const { data: billingHistory, isFetching: isBillingLoading } = useGetBillingHistoryQuery(
    {
      companyId,
      limit: 10,
    },
    { skip: !companyId },
  );
  
  const [createSubscription] = useCreateSubscriptionMutation();
  const [updateSubscription, { isLoading: isUpdating }] = useUpdateSubscriptionMutation();
  const [cancelSubscription, { isLoading: isCancelling }] = useCancelSubscriptionMutation();
  const [reactivateSubscription, { isLoading: isReactivating }] = useReactivateSubscriptionMutation();

  const [selectedPlan, setSelectedPlan] = useState<any>(null);
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  
  // Real-time trial countdown
  const [currentTime, setCurrentTime] = useState(new Date());
  
  useEffect(() => {
    if (!currentSubscription?.isTrial || !currentSubscription?.trialEnd) return;
    
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000); // Update every minute
    
    return () => clearInterval(interval);
  }, [effectiveSubscription?.isTrial, effectiveSubscription?.trialEnd]);

  // Calculate trial time remaining
  const trialTimeRemaining = useMemo(() => {
    if (!effectiveSubscription?.trialEnd || !effectiveSubscription?.isTrial) return null;
    
    const now = currentTime.getTime();
    const trialEnd = new Date(effectiveSubscription.trialEnd).getTime();
    const remaining = trialEnd - now;
    
    if (remaining <= 0) return null;
    
    const hours = Math.floor(remaining / (1000 * 60 * 60));
    const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
    const days = Math.floor(hours / 24);
    const remainingHours = hours % 24;
    
    return { days, hours: remainingHours, minutes, totalHours: hours };
  }, [effectiveSubscription, currentTime]);

  const handleUpgrade = async () => {
    if (!selectedPlan || !effectiveSubscription) {
      toast.error('Please select a plan');
      return;
    }

    if (effectiveSubscription?.plan && selectedPlan.id === effectiveSubscription.plan.id) {
      toast.error('You are already on this plan');
      return;
    }

    try {
      let subscriptionId = effectiveSubscription.id;

      // Check if we have a fake ID (from subscriptionFromCompany) or no real subscription
      // The fake ID 'company-subscription' is not a valid MongoDB ObjectId
      const isFakeId = subscriptionId === 'company-subscription' || !subscriptionId || !actualSubscription;
      
      if (isFakeId && companyData) {
        // Find the current plan from company data
        const currentPlan = plans.find((p: any) => p.name === companyData.subscriptionPlan);
        
        if (!currentPlan) {
          toast.error('Unable to determine current plan. Please refresh the page.');
          return;
        }

        // Validate required fields
        const email = companyData.email || user?.email;
        const companyName = companyData.name;
        
        if (!email || !companyName) {
          toast.error('Missing required information (email or company name). Please contact support.');
          return;
        }

        // Try to create subscription record with current plan
        // Backend requires: companyId, plan (enum), billingCycle (enum), email, companyName
        // NOTE: Backend expects 'plan' (enum value like 'basic', 'premium'), NOT 'planId'
        try {
          const newSubscription = await createSubscription({
            companyId: companyId,
            plan: currentPlan.name, // SubscriptionPlan enum value (e.g., 'basic', 'premium', 'enterprise')
            billingCycle: currentPlan.billingCycle || 'monthly', // BillingCycle enum value
            email: email,
            companyName: companyName,
            // paymentMethodId is optional, omit it for now
          }).unwrap();

          subscriptionId = newSubscription.id;
        } catch (createError: any) {
          // If backend says subscription already exists, try to fetch it
          if (createError?.data?.message?.includes('already has an active subscription') || 
              createError?.message?.includes('already has an active subscription')) {
            // Try to fetch existing subscription by company using RTK Query
            try {
              const result = await refetchSubscriptionByCompany();
              const existingSub = result.data;
              
              if (existingSub?.id) {
                subscriptionId = existingSub.id;
              } else {
                throw new Error('Unable to fetch existing subscription');
              }
            } catch (fetchError) {
              toast.error('Subscription exists but could not be retrieved. Please refresh the page.');
              return;
            }
          } else {
            // Re-throw other errors
            throw createError;
          }
        }
        
        // If the new plan is the same as current plan, we're done
        if (selectedPlan.id === currentPlan.id) {
          toast.success(`Subscription created successfully with ${selectedPlan.displayName || selectedPlan.name}!`);
          setIsUpgradeModalOpen(false);
          setSelectedPlan(null);
          return;
        }
      }

      // Validate that we have a real subscription ID before updating
      if (!subscriptionId || subscriptionId === 'company-subscription') {
        toast.error('Unable to find subscription. Please refresh the page and try again.');
        return;
      }

      // Update subscription to new plan
      await updateSubscription({
        id: subscriptionId,
        planId: selectedPlan.id,
      }).unwrap();

      toast.success(`Successfully ${effectiveSubscription?.plan?.price && selectedPlan.price > effectiveSubscription.plan.price ? 'upgraded' : effectiveSubscription?.plan?.price && selectedPlan.price < effectiveSubscription.plan.price ? 'downgraded' : 'switched'} to ${selectedPlan.displayName || selectedPlan.name}!`);
      setIsUpgradeModalOpen(false);
      setSelectedPlan(null);
    } catch (error: any) {
      console.error('Upgrade error:', error);
      toast.error(error?.data?.message || error?.message || 'Failed to update subscription. Please try again.');
    }
  };

  const handleCancel = async () => {
    if (!currentSubscription) {
      toast.error('Subscription record not found. Cannot cancel subscription.');
      return;
    }

    try {
      await cancelSubscription({
        id: currentSubscription.id,
        cancelAtPeriodEnd: true,
      }).unwrap();

      toast.success('Subscription will be cancelled at the end of the billing period');
      setIsCancelModalOpen(false);
    } catch (error: any) {
      toast.error(error?.data?.message || 'Failed to cancel subscription');
    }
  };

  const handleReactivate = async () => {
    if (!actualSubscription) {
      toast.error('Subscription record not found. Cannot reactivate subscription.');
      return;
    }

    try {
      await reactivateSubscription(actualSubscription.id).unwrap();
      toast.success('Subscription reactivated successfully!');
    } catch (error: any) {
      toast.error(error?.data?.message || 'Failed to reactivate subscription');
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'success' | 'danger' | 'warning'> = {
      active: 'success',
      paid: 'success',
      cancelled: 'danger',
      expired: 'danger',
      failed: 'danger',
      pending: 'warning',
    };
    return variants[status] || 'success';
  };

  const billingColumns = [
    {
      key: 'createdAt',
      title: 'Date',
      render: (value: string) => formatDateTime(value).split(',')[0],
    },
    {
      key: 'amount',
      title: 'Amount',
      render: (value: number, row: BillingHistory) => (
        <span className="font-semibold">
          {formatCurrency(value)} {row.currency}
        </span>
      ),
    },
    {
      key: 'status',
      title: 'Status',
      render: (value: string) => (
        <Badge variant={getStatusBadge(value)}>
          {value.charAt(0).toUpperCase() + value.slice(1)}
        </Badge>
      ),
    },
    {
      key: 'invoiceUrl',
      title: 'Invoice',
      render: (value: string) =>
        value ? (
          <a
            href={value}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-primary-600 hover:text-primary-700"
          >
            <DocumentArrowDownIcon className="w-4 h-4" />
            Download
          </a>
        ) : (
          <span className="text-gray-400">N/A</span>
        ),
    },
  ];

  const getUsagePercentage = (used: number, limit: number) => {
    return Math.min((used / limit) * 100, 100);
  };

  const getUsageColor = (percentage: number) => {
    if (percentage >= 90) return 'text-red-600 dark:text-red-400';
    if (percentage >= 75) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-green-600 dark:text-green-400';
  };

  if (!companyId) {
    return (
      <div className="flex items-center justify-center h-96 text-center">
        <div>
          <p className="text-lg font-semibold text-gray-800 dark:text-gray-200">
            No company selected
          </p>
          <p className="text-gray-500 dark:text-gray-400">
            Please select or create a company to manage subscriptions.
          </p>
        </div>
      </div>
    );
  }

  // Only show loading if plans are loading OR if we're loading subscription AND don't have company data yet
  // Once we have company data, we can build subscription from it even if subscription query is still loading
  if (isPlanLoading || (isSubscriptionLoading && !companyData && !effectiveSubscription)) {
    return (
      <div className="flex flex-col items-center justify-center h-96 space-y-4">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600"></div>
        <p className="text-gray-600 dark:text-gray-400">Loading subscription information...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Subscription & Billing</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Manage your subscription plan and billing
          </p>
        </div>
      </div>

      {/* Current Plan */}
      {effectiveSubscription && effectiveSubscription.plan && (
        <Card className="border-2 border-primary-500 bg-gradient-to-br from-primary-50 to-white dark:from-primary-900/20 dark:to-gray-900">
          <CardHeader>
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2 flex-wrap">
                  <CheckCircleIcon className="w-6 h-6 text-green-500" />
                  <CardTitle className="text-2xl">Current Plan: {effectiveSubscription.plan?.displayName || effectiveSubscription.plan?.name || 'Unknown Plan'}</CardTitle>
                  {effectiveSubscription.isTrial && trialTimeRemaining && (
                    <Badge variant="warning" className="ml-2">
                      <ClockIcon className="w-4 h-4 mr-1" />
                      Trial: {trialTimeRemaining.days > 0 
                        ? `${trialTimeRemaining.days}d ${trialTimeRemaining.hours}h remaining`
                        : `${trialTimeRemaining.hours}h ${trialTimeRemaining.minutes}m remaining`}
                    </Badge>
                  )}
                  {effectiveSubscription.isTrial && !trialTimeRemaining && (
                    <Badge variant="danger" className="ml-2">
                      Trial Expired
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-4 flex-wrap">
                  <div>
                    <p className="text-3xl font-bold text-gray-900 dark:text-white">
                      {formatCurrency(effectiveSubscription.plan?.price || 0)}
                      <span className="text-lg font-normal text-gray-600 dark:text-gray-400">
                        /{effectiveSubscription.plan?.billingCycle || 'month'}
                      </span>
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={effectiveSubscription.status === 'active' ? 'success' : 'danger'} className="text-sm px-3 py-1">
                      {effectiveSubscription.status.charAt(0).toUpperCase() + effectiveSubscription.status.slice(1)}
                    </Badge>
                    {effectiveSubscription.cancelAtPeriodEnd && (
                      <Badge variant="warning" className="text-sm px-3 py-1">Cancelling at period end</Badge>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Button
                  variant="primary"
                  onClick={() => {
                    // Scroll to available plans section
                    document.getElementById('available-plans')?.scrollIntoView({ behavior: 'smooth' });
                  }}
                  className="whitespace-nowrap"
                >
                  <ArrowTrendingUpIcon className="w-4 h-4 mr-2" />
                  Change Plan
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            {/* Trial Warning */}
            {effectiveSubscription.isTrial && trialTimeRemaining && (
              <div className={`rounded-lg p-4 mb-4 border ${
                trialTimeRemaining.totalHours <= 1 
                  ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
                  : trialTimeRemaining.totalHours <= 24
                  ? 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800'
                  : 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800'
              }`}>
                <div className="flex items-start gap-3">
                  <ExclamationTriangleIcon className={`w-5 h-5 flex-shrink-0 mt-0.5 ${
                    trialTimeRemaining.totalHours <= 1 
                      ? 'text-red-600 dark:text-red-400'
                      : trialTimeRemaining.totalHours <= 24
                      ? 'text-yellow-600 dark:text-yellow-400'
                      : 'text-blue-600 dark:text-blue-400'
                  }`} />
                  <div className="flex-1">
                    <p className={`text-sm font-medium ${
                      trialTimeRemaining.totalHours <= 1 
                        ? 'text-red-800 dark:text-red-200'
                        : trialTimeRemaining.totalHours <= 24
                        ? 'text-yellow-800 dark:text-yellow-200'
                        : 'text-blue-800 dark:text-blue-200'
                    }`}>
                      {trialTimeRemaining.totalHours <= 1 
                        ? '⚠️ Your trial expires in less than 1 hour!'
                        : trialTimeRemaining.totalHours <= 24
                        ? '⏰ Your trial expires in less than 24 hours'
                        : 'ℹ️ You are currently on a trial period'}
                    </p>
                    <p className={`text-xs mt-1 ${
                      trialTimeRemaining.totalHours <= 1 
                        ? 'text-red-700 dark:text-red-300'
                        : trialTimeRemaining.totalHours <= 24
                        ? 'text-yellow-700 dark:text-yellow-300'
                        : 'text-blue-700 dark:text-blue-300'
                    }`}>
                      {trialTimeRemaining.totalHours <= 1
                        ? 'Upgrade now to continue using all features without interruption.'
                        : trialTimeRemaining.totalHours <= 24
                        ? `Upgrade before ${formatDateTime(effectiveSubscription.trialEnd).split(',')[0]} to continue using all features.`
                        : `Trial ends on ${formatDateTime(effectiveSubscription.trialEnd).split(',')[0]}. Upgrade anytime to continue.`}
                    </p>
                    {trialTimeRemaining.totalHours <= 24 && (
                      <Button
                        size="sm"
                        variant="primary"
                        onClick={() => {
                          document.getElementById('available-plans')?.scrollIntoView({ behavior: 'smooth' });
                        }}
                        className="mt-3"
                      >
                        <ArrowTrendingUpIcon className="w-4 h-4 mr-2" />
                        Upgrade Now
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            )}
            
            {/* Cancellation Notice */}
            {effectiveSubscription.cancelAtPeriodEnd && (
              <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 mb-4">
                <p className="text-sm text-yellow-800 dark:text-yellow-200">
                  Your subscription is set to cancel on {formatDateTime(effectiveSubscription.currentPeriodEnd).split(',')[0]}. 
                  You can reactivate it anytime before then.
                </p>
                {currentSubscription && (
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={handleReactivate}
                    isLoading={isReactivating}
                    className="mt-2"
                  >
                    Reactivate Subscription
                  </Button>
                )}
              </div>
            )}
          </CardContent>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <p className="text-sm text-gray-600 dark:text-gray-400">Next Billing</p>
                <p className="text-lg font-semibold text-gray-900 dark:text-white mt-1">
                  {formatDateTime(effectiveSubscription.currentPeriodEnd).split(',')[0]}
                </p>
              </div>
              <div className="text-center p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <p className="text-sm text-gray-600 dark:text-gray-400">Max Branches</p>
                <p className="text-lg font-semibold text-gray-900 dark:text-white mt-1">
                  {effectiveSubscription.plan?.limits?.maxBranches || effectiveSubscription.plan?.features?.maxBranches || 'Unlimited'}
                </p>
              </div>
              <div className="text-center p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <p className="text-sm text-gray-600 dark:text-gray-400">Max Users</p>
                <p className="text-lg font-semibold text-gray-900 dark:text-white mt-1">
                  {effectiveSubscription.plan?.limits?.maxUsers || effectiveSubscription.plan?.features?.maxUsers || 'Unlimited'}
                </p>
              </div>
              <div className="text-center p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <p className="text-sm text-gray-600 dark:text-gray-400">Storage</p>
                <p className="text-lg font-semibold text-gray-900 dark:text-white mt-1">
                  {effectiveSubscription.plan?.limits?.storageGB || 'N/A'} GB
                </p>
              </div>
            </div>

            {/* Usage Stats */}
            {usageStats && (
              <div className="space-y-3 mt-6">
                <h3 className="font-semibold text-gray-900 dark:text-white">Usage Statistics</h3>
                
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Branches</span>
                    <span className={`text-sm font-medium ${getUsageColor(getUsagePercentage(usageStats.branches, effectiveSubscription.plan?.limits?.maxBranches || effectiveSubscription.plan?.features?.maxBranches || 1))}`}>
                      {usageStats.branches} / {effectiveSubscription.plan?.limits?.maxBranches || effectiveSubscription.plan?.features?.maxBranches || 'Unlimited'}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div
                      className="bg-primary-600 h-2 rounded-full transition-all"
                      style={{ width: `${getUsagePercentage(usageStats.branches, effectiveSubscription.plan?.limits?.maxBranches || effectiveSubscription.plan?.features?.maxBranches || 1)}%` }}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Users</span>
                    <span className={`text-sm font-medium ${getUsageColor(getUsagePercentage(usageStats.users, effectiveSubscription.plan?.limits?.maxUsers || effectiveSubscription.plan?.features?.maxUsers || 1))}`}>
                      {usageStats.users} / {effectiveSubscription.plan?.limits?.maxUsers || effectiveSubscription.plan?.features?.maxUsers || 'Unlimited'}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div
                      className="bg-primary-600 h-2 rounded-full transition-all"
                      style={{ width: `${getUsagePercentage(usageStats.users, effectiveSubscription.plan?.limits?.maxUsers || effectiveSubscription.plan?.features?.maxUsers || 1)}%` }}
                    />
                  </div>
                </div>

                {effectiveSubscription.plan?.limits?.storageGB && (
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600 dark:text-gray-400">Storage</span>
                      <span className={`text-sm font-medium ${getUsageColor(getUsagePercentage(usageStats.storageUsed, effectiveSubscription.plan?.limits?.storageGB || 0))}`}>
                        {usageStats.storageUsed.toFixed(2)} GB / {effectiveSubscription.plan?.limits?.storageGB} GB
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                      <div
                        className="bg-primary-600 h-2 rounded-full transition-all"
                        style={{ width: `${getUsagePercentage(usageStats.storageUsed, effectiveSubscription.plan?.limits?.storageGB || 0)}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Plan Features */}
            <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
              <h4 className="font-semibold text-gray-900 dark:text-white mb-3">Plan Features</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {(effectiveSubscription.plan?.featureList || []).slice(0, 6).map((feature: string, idx: number) => (
                  <div key={idx} className="flex items-center gap-2">
                    <CheckCircleIcon className="w-5 h-5 text-green-500 flex-shrink-0" />
                    <span className="text-sm text-gray-700 dark:text-gray-300">{feature}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
              {effectiveSubscription.status === 'active' && !effectiveSubscription.cancelAtPeriodEnd && (
                <>
                  <Button
                    variant="primary"
                    onClick={() => {
                      document.getElementById('available-plans')?.scrollIntoView({ behavior: 'smooth' });
                    }}
                  >
                    <ArrowTrendingUpIcon className="w-4 h-4 mr-2" />
                    Change Plan
                  </Button>
                  {currentSubscription && (
                    <Button
                      variant="secondary"
                      onClick={() => setIsCancelModalOpen(true)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <XCircleIcon className="w-4 h-4 mr-2" />
                      Cancel Subscription
                    </Button>
                  )}
                </>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Billing History */}
      {billingHistory && billingHistory.history && billingHistory.history.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Billing History</CardTitle>
          </CardHeader>
          <CardContent>
            <DataTable
              data={billingHistory.history}
              columns={billingColumns}
              loading={isBillingLoading}
              searchable={false}
              selectable={false}
              emptyMessage="No billing history found"
            />
          </CardContent>
        </Card>
      )}

      {/* Available Plans */}
      <div id="available-plans">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Available Plans</h2>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Choose a plan that fits your business needs
            </p>
          </div>
        </div>
        {plansError && (
          <Card>
            <CardContent className="py-12 text-center">
              <XCircleIcon className="w-12 h-12 text-red-500 mx-auto mb-4" />
              <p className="text-red-600 dark:text-red-400 font-semibold mb-2">
                Error loading subscription plans
              </p>
              <p className="text-gray-600 dark:text-gray-400 text-sm">
                {(plansError as any)?.data?.message || 'Please try again later or contact support.'}
              </p>
            </CardContent>
          </Card>
        )}
        {plans.length === 0 && !isPlanLoading && !plansError && (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                No subscription plans available at the moment.
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-500">
                Please contact support or check back later.
              </p>
            </CardContent>
          </Card>
        )}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {plans.map((plan: any) => (
            <Card
              key={plan.id}
                      className={`hover:shadow-lg transition-all ${
                plan.isPopular ? 'border-2 border-primary-500' : ''
              } ${effectiveSubscription?.plan?.id === plan.id ? 'ring-2 ring-green-500' : ''}`}
            >
              {plan.isPopular && (
                <div className="bg-primary-500 text-white text-center py-2 rounded-t-lg">
                  <span className="text-sm font-semibold">Most Popular</span>
                </div>
              )}
              {effectiveSubscription?.plan?.id === plan.id && (
                <div className="bg-green-500 text-white text-center py-2 rounded-t-lg">
                  <span className="text-sm font-semibold flex items-center justify-center gap-2">
                    <CheckCircleIcon className="w-4 h-4" />
                    Current Plan
                  </span>
                </div>
              )}
              
              <CardContent className="p-6 space-y-6">
                <div className="text-center">
                  <h3 className="text-2xl font-bold text-gray-900 dark:text-white">{plan.displayName || plan.name}</h3>
                  <div className="mt-4">
                    <span className="text-4xl font-bold text-gray-900 dark:text-white">
                      {formatCurrency(plan.price)}
                    </span>
                    <span className="text-gray-600 dark:text-gray-400">/{plan.billingCycle}</span>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">{plan.description}</p>
                </div>

                <div className="space-y-3">
                  <h4 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                    <CheckCircleIcon className="w-5 h-5 text-green-500" />
                    Included Features
                  </h4>
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {(plan.featureList || []).map((feature: string, idx: number) => (
                      <div key={idx} className="flex items-start gap-2">
                        <CheckCircleIcon className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                        <span className="text-sm text-gray-700 dark:text-gray-300">{feature}</span>
                      </div>
                    ))}
                    {(!plan.featureList || plan.featureList.length === 0) && (
                      <div className="space-y-2">
                        {plan.features?.pos && (
                          <div className="flex items-start gap-2">
                            <CheckCircleIcon className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                            <span className="text-sm text-gray-700 dark:text-gray-300">POS & Ordering</span>
                          </div>
                        )}
                        {plan.features?.inventory && (
                          <div className="flex items-start gap-2">
                            <CheckCircleIcon className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                            <span className="text-sm text-gray-700 dark:text-gray-300">Inventory Management</span>
                          </div>
                        )}
                        {plan.features?.crm && (
                          <div className="flex items-start gap-2">
                            <CheckCircleIcon className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                            <span className="text-sm text-gray-700 dark:text-gray-300">Customer CRM</span>
                          </div>
                        )}
                        {plan.features?.multiBranch && (
                          <div className="flex items-start gap-2">
                            <CheckCircleIcon className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                            <span className="text-sm text-gray-700 dark:text-gray-300">Multi-branch Support</span>
                          </div>
                        )}
                        {plan.features?.aiInsights && (
                          <div className="flex items-start gap-2">
                            <CheckCircleIcon className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                            <span className="text-sm text-gray-700 dark:text-gray-300">AI Insights</span>
                          </div>
                        )}
                        {plan.features?.accounting && (
                          <div className="flex items-start gap-2">
                            <CheckCircleIcon className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                            <span className="text-sm text-gray-700 dark:text-gray-300">Accounting & Reports</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-2 pt-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4">
                  <h4 className="font-semibold text-gray-900 dark:text-white text-sm mb-2">Plan Limits</h4>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400">Max Branches:</span>
                    <span className="font-medium text-gray-900 dark:text-white">{plan.limits?.maxBranches || plan.features?.maxBranches || 'Unlimited'}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400">Max Users:</span>
                    <span className="font-medium text-gray-900 dark:text-white">{plan.limits?.maxUsers || plan.features?.maxUsers || 'Unlimited'}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400">Storage:</span>
                    <span className="font-medium text-gray-900 dark:text-white">{plan.limits?.storageGB ? `${plan.limits.storageGB} GB` : 'Unlimited'}</span>
                  </div>
                  {plan.limits?.maxTables && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600 dark:text-gray-400">Max Tables:</span>
                      <span className="font-medium text-gray-900 dark:text-white">{plan.limits.maxTables}</span>
                    </div>
                  )}
                  {plan.limits?.maxMenuItems && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600 dark:text-gray-400">Max Menu Items:</span>
                      <span className="font-medium text-gray-900 dark:text-white">{plan.limits.maxMenuItems}</span>
                    </div>
                  )}
                </div>

                {currentSubscription?.plan?.id !== plan.id && (
                  <Button
                    onClick={() => {
                      console.log('Selected plan:', plan);
                      console.log('Current subscription:', currentSubscription);
                      setSelectedPlan(plan);
                      setIsUpgradeModalOpen(true);
                    }}
                    className="w-full"
                    variant={plan.isPopular ? 'primary' : 'secondary'}
                    disabled={isUpdating}
                  >
                    <ArrowTrendingUpIcon className="w-4 h-4 mr-2" />
                    {plan.price > (effectiveSubscription?.plan?.price || 0) ? 'Upgrade' : plan.price < (effectiveSubscription?.plan?.price || 0) ? 'Downgrade' : 'Switch'} to {plan.displayName || plan.name}
                  </Button>
                )}
                {effectiveSubscription?.plan?.id === plan.id && (
                  <div className="w-full text-center py-2 px-4 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 rounded-lg font-medium">
                    Current Plan
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Plan Features Comparison */}
      {plans.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Feature Comparison</CardTitle>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Compare features across all available plans
            </p>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b-2 border-gray-200 dark:border-gray-700">
                    <th className="text-left py-4 px-4 text-sm font-semibold text-gray-900 dark:text-white">
                      Feature
                    </th>
                    {plans.map((plan: any) => (
                      <th
                        key={plan.id}
                        className={`text-center py-4 px-4 text-sm font-semibold ${
                          effectiveSubscription?.plan?.id === plan.id
                            ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300'
                            : 'text-gray-700 dark:text-gray-300'
                        }`}
                      >
                        {plan.displayName || plan.name}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {/* Pricing */}
                  <tr className="border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50">
                    <td className="py-3 px-4 text-sm font-medium text-gray-900 dark:text-white">Monthly Price</td>
                    {plans.map((plan: any) => (
                      <td key={plan.id} className="text-center py-3 px-4 text-sm font-bold text-gray-900 dark:text-white">
                        {plan.price === 0 ? 'Free' : formatCurrency(plan.price)}
                      </td>
                    ))}
                  </tr>
                  
                  {/* Trial Period */}
                  <tr className="border-b border-gray-100 dark:border-gray-800">
                    <td className="py-3 px-4 text-sm text-gray-700 dark:text-gray-300">Trial Period</td>
                    {plans.map((plan: any) => (
                      <td key={plan.id} className="text-center py-3 px-4 text-sm font-medium">
                        {plan.trialPeriod ? `${Math.floor(plan.trialPeriod / 24)} days` : 'No trial'}
                      </td>
                    ))}
                  </tr>

                  {/* Feature Flags */}
                  <tr className="border-b-2 border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                    <td colSpan={plans.length + 1} className="py-2 px-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Core Features
                    </td>
                  </tr>
                  
                  <tr className="border-b border-gray-100 dark:border-gray-800">
                    <td className="py-3 px-4 text-sm text-gray-700 dark:text-gray-300">POS & Ordering</td>
                    {plans.map((plan: any) => (
                      <td key={plan.id} className="text-center py-3 px-4">
                        {plan.features?.pos ? (
                          <CheckCircleIcon className="w-5 h-5 text-green-500 mx-auto" />
                        ) : (
                          <XCircleIcon className="w-5 h-5 text-gray-300 dark:text-gray-600 mx-auto" />
                        )}
                      </td>
                    ))}
                  </tr>
                  
                  <tr className="border-b border-gray-100 dark:border-gray-800">
                    <td className="py-3 px-4 text-sm text-gray-700 dark:text-gray-300">Inventory Management</td>
                    {plans.map((plan: any) => (
                      <td key={plan.id} className="text-center py-3 px-4">
                        {plan.features?.inventory ? (
                          <CheckCircleIcon className="w-5 h-5 text-green-500 mx-auto" />
                        ) : (
                          <XCircleIcon className="w-5 h-5 text-gray-300 dark:text-gray-600 mx-auto" />
                        )}
                      </td>
                    ))}
                  </tr>
                  
                  <tr className="border-b border-gray-100 dark:border-gray-800">
                    <td className="py-3 px-4 text-sm text-gray-700 dark:text-gray-300">Customer CRM</td>
                    {plans.map((plan: any) => (
                      <td key={plan.id} className="text-center py-3 px-4">
                        {plan.features?.crm ? (
                          <CheckCircleIcon className="w-5 h-5 text-green-500 mx-auto" />
                        ) : (
                          <XCircleIcon className="w-5 h-5 text-gray-300 dark:text-gray-600 mx-auto" />
                        )}
                      </td>
                    ))}
                  </tr>
                  
                  <tr className="border-b border-gray-100 dark:border-gray-800">
                    <td className="py-3 px-4 text-sm text-gray-700 dark:text-gray-300">Accounting & Reports</td>
                    {plans.map((plan: any) => (
                      <td key={plan.id} className="text-center py-3 px-4">
                        {plan.features?.accounting ? (
                          <CheckCircleIcon className="w-5 h-5 text-green-500 mx-auto" />
                        ) : (
                          <XCircleIcon className="w-5 h-5 text-gray-300 dark:text-gray-600 mx-auto" />
                        )}
                      </td>
                    ))}
                  </tr>
                  
                  <tr className="border-b border-gray-100 dark:border-gray-800">
                    <td className="py-3 px-4 text-sm text-gray-700 dark:text-gray-300">AI Insights</td>
                    {plans.map((plan: any) => (
                      <td key={plan.id} className="text-center py-3 px-4">
                        {plan.features?.aiInsights ? (
                          <CheckCircleIcon className="w-5 h-5 text-green-500 mx-auto" />
                        ) : (
                          <XCircleIcon className="w-5 h-5 text-gray-300 dark:text-gray-600 mx-auto" />
                        )}
                      </td>
                    ))}
                  </tr>
                  
                  <tr className="border-b border-gray-100 dark:border-gray-800">
                    <td className="py-3 px-4 text-sm text-gray-700 dark:text-gray-300">Multi-Branch Support</td>
                    {plans.map((plan: any) => (
                      <td key={plan.id} className="text-center py-3 px-4">
                        {plan.features?.multiBranch ? (
                          <CheckCircleIcon className="w-5 h-5 text-green-500 mx-auto" />
                        ) : (
                          <XCircleIcon className="w-5 h-5 text-gray-300 dark:text-gray-600 mx-auto" />
                        )}
                      </td>
                    ))}
                  </tr>

                  {/* Limits Section */}
                  <tr className="border-b-2 border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                    <td colSpan={plans.length + 1} className="py-2 px-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Limits
                    </td>
                  </tr>
                  
                  <tr className="border-b border-gray-100 dark:border-gray-800">
                    <td className="py-3 px-4 text-sm text-gray-700 dark:text-gray-300">Max Branches</td>
                    {plans.map((plan: any) => {
                      const maxBranches = plan.limits?.maxBranches ?? plan.features?.maxBranches;
                      return (
                        <td key={plan.id} className="text-center py-3 px-4 text-sm font-medium">
                          {maxBranches === -1 || maxBranches === undefined ? 'Unlimited' : maxBranches}
                        </td>
                      );
                    })}
                  </tr>
                  
                  <tr className="border-b border-gray-100 dark:border-gray-800">
                    <td className="py-3 px-4 text-sm text-gray-700 dark:text-gray-300">Max Users</td>
                    {plans.map((plan: any) => {
                      const maxUsers = plan.limits?.maxUsers ?? plan.features?.maxUsers;
                      return (
                        <td key={plan.id} className="text-center py-3 px-4 text-sm font-medium">
                          {maxUsers === -1 || maxUsers === undefined ? 'Unlimited' : maxUsers}
                        </td>
                      );
                    })}
                  </tr>
                  
                  {plans.some((p: any) => p.limits?.storageGB) && (
                    <tr className="border-b border-gray-100 dark:border-gray-800">
                      <td className="py-3 px-4 text-sm text-gray-700 dark:text-gray-300">Storage</td>
                      {plans.map((plan: any) => (
                        <td key={plan.id} className="text-center py-3 px-4 text-sm font-medium">
                          {plan.limits?.storageGB ? `${plan.limits.storageGB} GB` : 'Unlimited'}
                        </td>
                      ))}
                    </tr>
                  )}
                  
                  {plans.some((p: any) => p.limits?.maxTables) && (
                    <tr className="border-b border-gray-100 dark:border-gray-800">
                      <td className="py-3 px-4 text-sm text-gray-700 dark:text-gray-300">Max Tables</td>
                      {plans.map((plan: any) => (
                        <td key={plan.id} className="text-center py-3 px-4 text-sm font-medium">
                          {plan.limits?.maxTables || 'Unlimited'}
                        </td>
                      ))}
                    </tr>
                  )}
                  
                  {plans.some((p: any) => p.limits?.maxMenuItems) && (
                    <tr className="border-b border-gray-100 dark:border-gray-800">
                      <td className="py-3 px-4 text-sm text-gray-700 dark:text-gray-300">Max Menu Items</td>
                      {plans.map((plan: any) => (
                        <td key={plan.id} className="text-center py-3 px-4 text-sm font-medium">
                          {plan.limits?.maxMenuItems || 'Unlimited'}
                        </td>
                      ))}
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Upgrade Modal */}
      <Modal
        isOpen={isUpgradeModalOpen}
        onClose={() => {
          setIsUpgradeModalOpen(false);
          setSelectedPlan(null);
        }}
        title="Confirm Plan Change"
        size="lg"
      >
        {(() => {
          console.log('Modal state - selectedPlan:', selectedPlan);
          console.log('Modal state - effectiveSubscription:', effectiveSubscription);
          console.log('Modal state - currentSubscription:', currentSubscription);
          console.log('Modal state - subscriptionFromCompany:', subscriptionFromCompany);
          
          if (!selectedPlan) {
            return (
              <div className="py-8 text-center">
                <p className="text-gray-600 dark:text-gray-400">No plan selected. Please try again.</p>
              </div>
            );
          }
          
          // Check if we're still loading subscription data
          if (isSubscriptionLoading && !effectiveSubscription) {
            return (
              <div className="py-8 text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary-600 mx-auto mb-4"></div>
                <p className="text-gray-600 dark:text-gray-400">Loading subscription information...</p>
              </div>
            );
          }
          
          // If no subscription data at all (not even from company), show error
          if (!effectiveSubscription) {
            return (
              <div className="py-8 text-center">
                <p className="text-gray-600 dark:text-gray-400">Unable to load subscription information. Please refresh the page.</p>
              </div>
            );
          }
          
          return (
          <div className="space-y-6">
            <div>
              <p className="text-gray-600 dark:text-gray-400 mb-2">
                Are you sure you want to {
                  selectedPlan?.price && effectiveSubscription?.plan?.price 
                    ? (effectiveSubscription.plan && selectedPlan.price > effectiveSubscription.plan.price ? 'upgrade' : effectiveSubscription.plan && selectedPlan.price < effectiveSubscription.plan.price ? 'downgrade' : 'switch')
                    : 'change'
                } your subscription plan?
              </p>
            </div>

            {/* Plan Comparison */}
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Current Plan</h4>
                <p className="text-lg font-bold text-gray-900 dark:text-white">
                  {effectiveSubscription?.plan?.displayName || effectiveSubscription?.plan?.name || 'N/A'}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  {formatCurrency(effectiveSubscription?.plan?.price || 0)}/{effectiveSubscription?.plan?.billingCycle || 'month'}
                </p>
              </div>
              <div className="p-4 bg-primary-50 dark:bg-primary-900/20 rounded-lg border-2 border-primary-500">
                <h4 className="font-semibold text-gray-900 dark:text-white mb-2">New Plan</h4>
                <p className="text-lg font-bold text-gray-900 dark:text-white">
                  {selectedPlan?.displayName || selectedPlan?.name || 'N/A'}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  {formatCurrency(selectedPlan?.price || 0)}/{selectedPlan?.billingCycle || 'month'}
                </p>
              </div>
            </div>

            {/* Price Difference */}
            {selectedPlan?.price !== undefined && effectiveSubscription?.plan?.price !== undefined && selectedPlan.price !== effectiveSubscription.plan.price && (
              <div className={`p-4 rounded-lg ${selectedPlan.price > (effectiveSubscription.plan?.price || 0) ? 'bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800' : 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800'}`}>
                <p className={`text-sm font-medium ${selectedPlan.price > (effectiveSubscription.plan?.price || 0) ? 'text-blue-800 dark:text-blue-200' : 'text-green-800 dark:text-green-200'}`}>
                  {selectedPlan.price > (effectiveSubscription.plan?.price || 0) ? (
                    <>
                      <ArrowTrendingUpIcon className="w-4 h-4 inline mr-2" />
                      You will be charged an additional {formatCurrency(selectedPlan.price - (effectiveSubscription.plan?.price || 0))}/{selectedPlan.billingCycle}
                    </>
                  ) : (
                    <>
                      <ArrowTrendingUpIcon className="w-4 h-4 inline mr-2 rotate-180" />
                      You will save {formatCurrency((effectiveSubscription.plan?.price || 0) - selectedPlan.price)}/{selectedPlan.billingCycle}
                    </>
                  )}
                </p>
              </div>
            )}

            {/* Features Comparison */}
            <div className="space-y-2">
              <h4 className="font-semibold text-gray-900 dark:text-white">What's Included:</h4>
              <div className="space-y-1 max-h-48 overflow-y-auto">
                {selectedPlan?.featureList && selectedPlan.featureList.length > 0 ? (
                  selectedPlan.featureList.slice(0, 8).map((feature: string, idx: number) => (
                    <div key={idx} className="flex items-center gap-2 text-sm">
                      <CheckCircleIcon className="w-4 h-4 text-green-500 flex-shrink-0" />
                      <span className="text-gray-700 dark:text-gray-300">{feature}</span>
                    </div>
                  ))
                ) : (
                  <div className="text-sm text-gray-500 dark:text-gray-400 italic">
                    No feature list available
                  </div>
                )}
              </div>
            </div>

            <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
              <p className="text-sm text-yellow-800 dark:text-yellow-200">
                <CreditCardIcon className="w-4 h-4 inline mr-2" />
                Your billing will be updated immediately. Changes take effect right away.
              </p>
            </div>

            <div className="flex gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
              <Button
                variant="secondary"
                onClick={() => {
                  setIsUpgradeModalOpen(false);
                  setSelectedPlan(null);
                }}
                className="flex-1"
                disabled={isUpdating}
              >
                Cancel
              </Button>
              <Button
                onClick={handleUpgrade}
                isLoading={isUpdating}
                className="flex-1"
                variant="primary"
                disabled={!selectedPlan || !effectiveSubscription}
              >
                {isUpdating ? 'Processing...' : `Confirm ${selectedPlan?.price && effectiveSubscription?.plan?.price && selectedPlan.price > effectiveSubscription.plan.price ? 'Upgrade' : selectedPlan?.price && effectiveSubscription?.plan?.price && selectedPlan.price < effectiveSubscription.plan.price ? 'Downgrade' : 'Switch'}`}
              </Button>
            </div>
          </div>
          );
        })()}
      </Modal>

      {/* Cancel Subscription Modal */}
      <Modal
        isOpen={isCancelModalOpen}
        onClose={() => setIsCancelModalOpen(false)}
        title="Cancel Subscription"
        size="md"
      >
        {effectiveSubscription && (
          <div className="space-y-4">
            <p className="text-gray-600 dark:text-gray-400">
              Are you sure you want to cancel your subscription?
            </p>

            {!currentSubscription && subscriptionFromCompany && (
              <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                <p className="text-sm text-red-800 dark:text-red-200">
                  <strong>Note:</strong> You don't have an active subscription record. Please contact support to manage your subscription.
                </p>
              </div>
            )}

            {currentSubscription && (
              <>
                <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                  <p className="text-sm text-yellow-800 dark:text-yellow-200 mb-2">
                    <strong>Important:</strong> Your subscription will remain active until{' '}
                    {formatDateTime(effectiveSubscription.currentPeriodEnd).split(',')[0]}.
                  </p>
                  <p className="text-sm text-yellow-800 dark:text-yellow-200">
                    You will continue to have access to all features until then. You can reactivate your subscription at any time before the cancellation date.
                  </p>
                </div>

                <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-gray-600 dark:text-gray-400">Current Plan:</span>
                    <span className="font-medium">{effectiveSubscription.plan?.name || 'Unknown'}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400">Cancellation Date:</span>
                    <span className="font-medium">
                      {formatDateTime(effectiveSubscription.currentPeriodEnd).split(',')[0]}
                    </span>
                  </div>
                </div>
              </>
            )}

            <div className="flex gap-3">
              <Button
                variant="secondary"
                onClick={() => setIsCancelModalOpen(false)}
                className="flex-1"
              >
                Keep Subscription
              </Button>
              {currentSubscription ? (
                <Button
                  onClick={handleCancel}
                  isLoading={isCancelling}
                  className="flex-1 bg-red-600 hover:bg-red-700"
                >
                  <XCircleIcon className="w-4 h-4 mr-2" />
                  Cancel Subscription
                </Button>
              ) : (
                <Button
                  onClick={() => setIsCancelModalOpen(false)}
                  className="flex-1 bg-gray-600 hover:bg-gray-700"
                >
                  Close
                </Button>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}