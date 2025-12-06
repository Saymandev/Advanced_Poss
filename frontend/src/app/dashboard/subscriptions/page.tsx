'use client';

import { FeatureBasedSubscriptionSelector } from '@/components/subscriptions/FeatureBasedSubscriptionSelector';
import { PlanFeatureSelector } from '@/components/subscriptions/PlanFeatureSelector';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { DataTable } from '@/components/ui/DataTable';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { useGetCompaniesQuery, useGetCompanyByIdQuery } from '@/lib/api/endpoints/companiesApi';
import { useCreateCheckoutSessionMutation } from '@/lib/api/endpoints/paymentsApi';
import {
  BillingHistory,
  useCancelSubscriptionMutation,
  useCreateSubscriptionMutation,
  useCreateSubscriptionPlanMutation,
  useDeleteSubscriptionPlanMutation,
  useGetAllSubscriptionsQuery,
  useGetBillingHistoryQuery,
  useGetCurrentSubscriptionQuery,
  useGetPlanWithFeaturesQuery,
  useGetSubscriptionByCompanyQuery,
  useGetSubscriptionPlansQuery,
  useGetUsageStatsQuery,
  useReactivateSubscriptionMutation,
  useUpdateSubscriptionMutation,
  useUpdateSubscriptionPlanMutation,
} from '@/lib/api/endpoints/subscriptionsApi';
import { useAppSelector } from '@/lib/store';
import { formatCurrency, formatDateTime } from '@/lib/utils';
import {
  ArrowTrendingUpIcon,
  BuildingOffice2Icon,
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
  const isSuperAdmin = user?.role === 'SUPER_ADMIN' || user?.role === 'super_admin';
  const { data: plansData, isLoading: isPlanLoading, error: plansError, refetch: refetchPlans } = useGetSubscriptionPlansQuery({});
  
  // Normalize plans data - transformResponse handles the normalization
  const plans = useMemo(() => {
    // Debug logging
    console.log('Plans Query State:', { plansData, isPlanLoading, plansError });
    
    if (!plansData) {
      console.log('No plansData available');
      return [];
    }
    
    // transformResponse returns normalized array or { plans: [...] }
    if (Array.isArray(plansData)) {
      console.log(`Found ${plansData.length} plans (array format)`);
      return plansData;
    }
    
    // Handle { plans: [...] } format from transformResponse
    if (plansData && typeof plansData === 'object' && 'plans' in plansData) {
      const plansArray = Array.isArray((plansData as any).plans) ? (plansData as any).plans : [];
      console.log(`Found ${plansArray.length} plans (object with plans property)`);
      return plansArray;
    }
    
    // Log unexpected format for debugging
    console.warn('Unexpected plans data format:', plansData);
    
    return [];
  }, [plansData, isPlanLoading, plansError]);
  // Get company data to use as fallback for subscription info
  // CRITICAL: Company data is the source of truth after Stripe webhook updates
  const { data: companyData, refetch: refetchCompany } = useGetCompanyByIdQuery(companyId, {
    skip: !companyId,
    refetchOnMountOrArgChange: true, // Always refetch to get latest data
  });

  const { 
    data: currentSubscription, 
    isFetching: isSubscriptionLoading,
    refetch: refetchCurrentSubscription,
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
  // Always fetch this, even if currentSubscription exists, because currentSubscription might be stale
  const { 
    data: subscriptionByCompany, 
    refetch: refetchSubscriptionByCompany,
  } = useGetSubscriptionByCompanyQuery(
    { companyId },
    { 
      skip: !companyId, // Only skip if no companyId - always try to fetch real subscription record
      refetchOnMountOrArgChange: true, // Always refetch when component mounts or companyId changes
    },
  );

  // Auto-refresh subscription data when returning from checkout or when URL has checkout parameter
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    const urlParams = new URLSearchParams(window.location.search);
    const sessionId = urlParams.get('session_id');
    const checkoutSuccess = urlParams.get('checkout') === 'success';
    
    if (sessionId || checkoutSuccess) {
      console.log('🔄 Refreshing subscription data after checkout...');
      
      // CRITICAL: Refetch company data first (source of truth after webhook)
      refetchCompany();
      
      // Then refetch subscription data
      refetchCurrentSubscription();
      refetchSubscriptionByCompany();
      
      // Clear the URL parameters after refetching
      const newUrl = window.location.pathname;
      window.history.replaceState({}, '', newUrl);
      
      // Show success message
      if (checkoutSuccess) {
        toast.success('Subscription updated successfully! Refreshing data...');
      }
      
      // Force another refetch after a short delay to ensure webhook has processed
      setTimeout(() => {
        console.log('🔄 Second refresh to ensure webhook data is loaded...');
        refetchCompany();
        refetchCurrentSubscription();
        refetchSubscriptionByCompany();
      }, 2000);
    }
  }, [refetchCurrentSubscription, refetchSubscriptionByCompany, refetchCompany]);


  // Extract subscription data - handle both wrapped { data: {...} } and direct {...} formats
  const unwrappedCurrentSubscription = (currentSubscription as any)?.data || currentSubscription;
  const unwrappedSubscriptionByCompany = (subscriptionByCompany as any)?.data || subscriptionByCompany;
  
  // Use subscriptionByCompany if currentSubscription is not available
  const actualSubscription = unwrappedCurrentSubscription || unwrappedSubscriptionByCompany;

  // Create subscription object from company data if subscription record doesn't exist
  const subscriptionFromCompany = useMemo(() => {
    // If subscription record exists, use it
    if (actualSubscription) return null;
    
    // If no company data or no subscription plan, return null
    if (!companyData || !companyData.subscriptionPlan) return null;

    // Find plan details to build subscription object
    const plan = plans.find((p: any) => p.name === companyData.subscriptionPlan);
    if (!plan) return null;

    // Determine trial status: subscription is trial only if status is 'trial' AND has trialEndDate
    const subscriptionStatus = companyData.subscriptionStatus || 'active';
    const trialEndDateRaw = companyData.trialEndDate;
    const trialEndDate = trialEndDateRaw && trialEndDateRaw !== null && trialEndDateRaw !== 'null'
      ? new Date(trialEndDateRaw).toISOString()
      : null;
    
    // DEBUG: Log subscription status
    console.log('🔍 Subscription Page Debug:', {
      subscriptionStatus,
      trialEndDateRaw,
      trialEndDate,
      hasTrialEndDate: !!trialEndDate,
      companyDataKeys: Object.keys(companyData),
    });
    
    // Subscription is in trial only if:
    // 1. Status is explicitly 'trial' AND
    // 2. Has a valid trialEndDate (not null, not undefined, not empty)
    // If status is 'active', it's NOT a trial, regardless of trialEndDate
    const isTrial = subscriptionStatus === 'trial' && trialEndDate !== null;
    
    console.log('📊 Trial Status Calculation:', {
      subscriptionStatus,
      isTrial,
      trialEndDateExists: !!trialEndDate,
      finalIsTrial: isTrial,
    });

    return {
      id: 'company-subscription',
      companyId: companyData.id,
      planId: plan.id,
      plan: {
        ...plan,
        id: plan.id,
      },
      planKey: companyData.subscriptionPlan,
      status: subscriptionStatus === 'trial' ? 'active' : (subscriptionStatus || 'active'),
      currentPeriodStart: ((companyData as any).subscriptionStartDate) 
        ? new Date((companyData as any).subscriptionStartDate).toISOString()
        : new Date().toISOString(),
      currentPeriodEnd: companyData.subscriptionEndDate 
        ? new Date(companyData.subscriptionEndDate).toISOString()
        : (trialEndDate || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()),
      nextBillingDate: (companyData as any).nextBillingDate 
        ? new Date((companyData as any).nextBillingDate).toISOString()
        : (companyData.subscriptionEndDate 
            ? new Date(companyData.subscriptionEndDate).toISOString()
            : (trialEndDate || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString())),
      cancelAtPeriodEnd: false,
      trialEnd: trialEndDate,
      isTrial: isTrial,
      createdAt: companyData.createdAt,
      updatedAt: companyData.updatedAt,
    };
  }, [actualSubscription, companyData, plans]);

  // Use subscription from company if subscription record doesn't exist
  // Also ensure isTrial is correctly computed from actual subscription data
  let effectiveSubscription = actualSubscription || subscriptionFromCompany;
  
  // CRITICAL: Always prefer companyData for plan info (most up-to-date after Stripe webhook)
  // This ensures we show the correct plan even if subscription record is stale
  if (companyData && companyData.subscriptionPlan && plans.length > 0) {
    const companyPlan = companyData.subscriptionPlan;
    
    // DEBUG: Log company data to see what plan it has
    console.log('🔍 Company Data Check:', {
      companyPlan,
      companyStatus: companyData.subscriptionStatus,
      companyNextBilling: (companyData as any).nextBillingDate,
      companySubscriptionEnd: (companyData as any).subscriptionEndDate,
      availablePlans: plans.map((p: any) => ({ name: p.name, displayName: p.displayName })),
    });
    
    // Find the plan from company data
    const plan = plans.find((p: any) => p.name === companyPlan);
    
    if (plan) {
      // Check if subscription plan matches company plan
      const subPlanKey = actualSubscription 
        ? ((actualSubscription as any).planKey || (actualSubscription as any).plan?.name || (actualSubscription as any).plan)
        : null;
      
      // Always use company plan (source of truth after Stripe webhook)
      // Log the comparison
      console.log('📊 Plan Comparison:', {
        subscriptionPlan: subPlanKey,
        companyPlan: companyPlan,
        subscriptionId: actualSubscription?.id,
        willUseCompanyPlan: true, // Always use company plan
      });
      
      if (subPlanKey && subPlanKey !== companyPlan) {
        console.log('⚠️ Plan mismatch detected - using company data:', {
          subscriptionPlan: subPlanKey,
          companyPlan: companyPlan,
          subscriptionId: actualSubscription?.id,
        });
      }
      
      // Override subscription plan with company plan (always use company as source of truth)
      // CRITICAL: Use company's nextBillingDate and subscriptionEndDate (updated by webhook)
      const subscriptionPeriodEnd = (companyData as any).subscriptionEndDate 
        ? new Date((companyData as any).subscriptionEndDate).toISOString()
        : (actualSubscription as any)?.currentPeriodEnd;
      
      const subscriptionNextBilling = (companyData as any).nextBillingDate
        ? new Date((companyData as any).nextBillingDate).toISOString()
        : (actualSubscription as any)?.nextBillingDate;
      
      // CRITICAL: If nextBillingDate is in the past or equals trialEndDate, use currentPeriodEnd instead
      // This fixes the issue where nextBillingDate is stuck at trial end date
      let correctedNextBilling = subscriptionNextBilling;
      if (subscriptionNextBilling && subscriptionPeriodEnd) {
        const nextBillingDate = new Date(subscriptionNextBilling);
        const trialEndDate = (actualSubscription as any)?.trialEndDate 
          ? new Date((actualSubscription as any).trialEndDate)
          : null;
        const now = new Date();
        
        // If nextBillingDate is in the past, or equals trial end date, use currentPeriodEnd
        const isPast = nextBillingDate < now;
        const equalsTrialEnd = trialEndDate && Math.abs(nextBillingDate.getTime() - trialEndDate.getTime()) < 1000;
        
        if (isPast || equalsTrialEnd) {
          console.log('⚠️ nextBillingDate is invalid - using currentPeriodEnd:', {
            nextBillingDate: subscriptionNextBilling,
            currentPeriodEnd: subscriptionPeriodEnd,
            trialEndDate: trialEndDate?.toISOString(),
            isPast,
            equalsTrialEnd,
          });
          correctedNextBilling = subscriptionPeriodEnd;
        }
      }
      
      effectiveSubscription = {
        ...(actualSubscription || {}),
        plan: {
          ...plan,
          id: plan.id,
        },
        planKey: companyPlan,
        price: plan.price,
        // Preserve other subscription data, but prefer company dates
        ...(actualSubscription ? {
          status: (actualSubscription as any).status,
          currentPeriodStart: (actualSubscription as any).currentPeriodStart,
          currentPeriodEnd: subscriptionPeriodEnd || (actualSubscription as any).currentPeriodEnd,
          nextBillingDate: correctedNextBilling || subscriptionPeriodEnd || (actualSubscription as any).nextBillingDate,
          isTrial: (actualSubscription as any).isTrial,
        } : {
          // If no subscription record, use company data
          status: companyData.subscriptionStatus || 'active',
          currentPeriodEnd: subscriptionPeriodEnd,
          nextBillingDate: correctedNextBilling || subscriptionPeriodEnd,
          isTrial: false,
        }),
      };
      
      console.log('✅ Using company plan as source of truth:', {
        companyPlan,
        effectivePlan: effectiveSubscription.plan?.name,
        effectivePrice: effectiveSubscription.price,
        nextBillingDate: effectiveSubscription.nextBillingDate,
        currentPeriodEnd: effectiveSubscription.currentPeriodEnd,
      });
    }
  }
  
  // If we have actual subscription, ensure isTrial is correct based on status and trialEndDate
  if (actualSubscription) {
    const sub = actualSubscription as any;
    const subscriptionStatus = sub.status || 'active';
    const hasTrialEndDate = sub.trialEndDate || sub.trialEnd;
    
    // DEBUG: Log actual subscription data
    console.log('🔍 Actual Subscription Debug:', {
      status: subscriptionStatus,
      hasTrialEndDate,
      trialEndDate: sub.trialEndDate,
      trialEnd: sub.trialEnd,
      isTrialField: sub.isTrial,
      planKey: sub.planKey || sub.plan?.name || sub.plan,
      companyPlan: companyData?.subscriptionPlan,
      allKeys: Object.keys(sub),
    });
    
    // Subscription is trial ONLY if:
    // 1. Status is explicitly 'trial' AND
    // 2. Has a valid trialEndDate
    // If status is 'active', it's NOT a trial, regardless of trialEndDate
    const computedIsTrial = subscriptionStatus === 'trial' && hasTrialEndDate !== null && hasTrialEndDate !== undefined;
    
    console.log('📊 Computed Trial Status:', {
      subscriptionStatus,
      computedIsTrial,
      hasTrialEndDate: !!hasTrialEndDate,
    });
    
    effectiveSubscription = {
      ...effectiveSubscription,
      isTrial: computedIsTrial,
      status: subscriptionStatus,
    };
  }
  
  // Final check: if companyData shows active status, override isTrial to false
  if (companyData) {
    const companyStatus = companyData.subscriptionStatus;
    if (companyStatus === 'active') {
      console.log('✅ Company status is active - forcing isTrial to false');
      effectiveSubscription = {
        ...effectiveSubscription,
        isTrial: false,
        status: 'active',
      };
    }
  }
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
  
  const [createSubscription, { isLoading: isCreatingFeatureSubscription }] = useCreateSubscriptionMutation();
  const [_updateSubscription] = useUpdateSubscriptionMutation();
  const [cancelSubscription, { isLoading: isCancelling }] = useCancelSubscriptionMutation();
  const [reactivateSubscription, { isLoading: isReactivating }] = useReactivateSubscriptionMutation();
  const [createCheckoutSession, { isLoading: isUpdating }] = useCreateCheckoutSessionMutation();

  const [selectedPlan, setSelectedPlan] = useState<any>(null);
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  
  // View mode: 'plans' or 'features'
  const [viewMode, setViewMode] = useState<'plans' | 'features'>('plans');
  
  // Feature-based subscription state
  const [selectedSubscriptionFeatures, setSelectedSubscriptionFeatures] = useState<string[]>([]);
  const [featureBillingCycle, setFeatureBillingCycle] = useState<'monthly' | 'yearly'>('monthly');
  const [featureSubscriptionPrice, setFeatureSubscriptionPrice] = useState<number>(0);
  const [isFeatureSubscriptionModalOpen, setIsFeatureSubscriptionModalOpen] = useState(false);
  
  // Super Admin: selected company for feature-based subscription
  const [selectedCompanyForSubscription, setSelectedCompanyForSubscription] = useState<string>('');
  const { data: companiesData } = useGetCompaniesQuery({}, { skip: !isSuperAdmin });
  
  const companies = useMemo(() => {
    if (!companiesData) return [];
    if (Array.isArray(companiesData)) return companiesData;
    return companiesData.companies || [];
  }, [companiesData]);
  
  // Real-time trial countdown
  const [currentTime, setCurrentTime] = useState(new Date());
  
  useEffect(() => {
    if (!effectiveSubscription?.isTrial || !effectiveSubscription?.trialEnd) return;
    
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

    // Check if user is in trial mode and wants to pay for the same plan
    const isTrialMode = effectiveSubscription?.isTrial || 
                        effectiveSubscription?.status === 'trial' ||
                        companyData?.subscriptionStatus === 'trial';
    
    const currentPlanId = effectiveSubscription?.plan?.id;
    const isSamePlan = currentPlanId && selectedPlan.id === currentPlanId;
    
    // If user is in trial mode and selecting the same plan, allow them to pay for it
    if (isSamePlan && !isTrialMode) {
      toast.error('You are already on this plan');
      return;
    }

      try {
      // ALL plan changes MUST go through Stripe checkout for payment verification
      // This prevents unauthorized plan upgrades without payment
      
      // For free plans, we can skip checkout, but for security, let's still use checkout
      // This ensures all plan changes are properly tracked and verified
      
      // Prepare URLs for Stripe checkout
      const origin = window.location.origin || (window.location.protocol + '//' + window.location.host);
      const successUrl = `${origin}/dashboard/subscriptions/success`;
      const cancelUrl = `${origin}/dashboard/subscriptions?plan=${selectedPlan.name}`;
      
      toast.loading('Redirecting to payment...', { id: 'checkout-loading' });
      
      // Create Stripe checkout session
      const response = await createCheckoutSession({
        companyId: companyId,
        planName: selectedPlan.name, // Use plan name (e.g., 'basic', 'premium') not display name
        successUrl,
        cancelUrl,
      }).unwrap();

      toast.dismiss('checkout-loading');
      
      // Redirect to Stripe Checkout
      const checkoutUrl = (response as any).url || (response as any).data?.url;
      if (checkoutUrl) {
        window.location.href = checkoutUrl;
      } else {
        toast.error('Payment session creation failed. Please try again.');
      }
      
      setIsUpgradeModalOpen(false);
      setSelectedPlan(null);
    } catch (error: any) {
      console.error('Checkout creation error:', error);
      toast.dismiss('checkout-loading');
      toast.error(error?.data?.message || error?.message || 'Failed to create payment session. Please try again.');
    }
  };

  const handleCreateFeatureSubscription = async () => {
    if (!selectedSubscriptionFeatures || selectedSubscriptionFeatures.length === 0) {
      toast.error('Please select at least one feature');
      return;
    }

    let targetCompanyId: string;
    let targetCompanyEmail: string;
    let targetCompanyName: string;

    if (isSuperAdmin) {
      // Super Admin: Use selected company
      if (!selectedCompanyForSubscription) {
        toast.error('Please select a company');
        return;
      }
      
      const selectedCompany = companies.find((c: any) => String(c._id || c.id) === String(selectedCompanyForSubscription));
      if (!selectedCompany) {
        toast.error('Selected company not found');
        return;
      }
      
      targetCompanyId = (selectedCompany as any)._id || selectedCompany.id;
      targetCompanyEmail = selectedCompany.email || '';
      targetCompanyName = selectedCompany.name || '';
    } else {
      // Regular user: Use their own company
      if (!companyId || !companyData) {
        toast.error('Company information not found');
        return;
      }
      
      targetCompanyId = companyId;
      targetCompanyEmail = user?.email || companyData.email || '';
      targetCompanyName = companyData.name || '';
    }

    try {
      await createSubscription({
        companyId: targetCompanyId,
        enabledFeatures: selectedSubscriptionFeatures,
        billingCycle: featureBillingCycle,
        email: targetCompanyEmail,
        companyName: targetCompanyName,
      }).unwrap();

      toast.success('Feature-based subscription created successfully!');
      setIsFeatureSubscriptionModalOpen(false);
      setSelectedSubscriptionFeatures([]);
      setSelectedCompanyForSubscription('');
      setFeatureBillingCycle('monthly');
      
      if (!isSuperAdmin) {
        setViewMode('plans');
      }
      
      // Refetch subscription data
      if (!isSuperAdmin) {
        refetchCurrentSubscription();
        refetchSubscriptionByCompany();
      }
    } catch (error: any) {
      console.error('Feature subscription creation error:', error);
      toast.error(error?.data?.message || error?.message || 'Failed to create subscription. Please try again.');
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

  // SUPER ADMIN data/hooks (always declared, conditionally used in render)
  const { data: subsData, isFetching: isSubsLoading } = useGetAllSubscriptionsQuery(
    { limit: 100 },
    { skip: !isSuperAdmin },
  );
  const [isPlanModalOpen, setIsPlanModalOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<any | null>(null);
  const [selectedFeatures, setSelectedFeatures] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<'basic' | 'features'>('basic');

  const [createPlan, { isLoading: isCreatingPlan }] = useCreateSubscriptionPlanMutation();
  const [updatePlan, { isLoading: isUpdatingPlan }] = useUpdateSubscriptionPlanMutation();
  const [deletePlan, { isLoading: isDeletingPlan }] = useDeleteSubscriptionPlanMutation();

  // Fetch plan with features when editing
  const { data: planWithFeatures } = useGetPlanWithFeaturesQuery(editingPlan?.id || '', {
    skip: !editingPlan?.id || !isPlanModalOpen,
  });

  // Load features when editing plan
  useEffect(() => {
    if (editingPlan && isPlanModalOpen) {
      // Prefer enabledFeatureKeys, fallback to planWithFeatures
      const features = editingPlan.enabledFeatureKeys || planWithFeatures?.enabledFeatureKeys || [];
      setSelectedFeatures(features);
      setActiveTab('basic'); // Reset to basic tab
    } else if (!editingPlan) {
      // Reset when creating new plan
      setSelectedFeatures([]);
      setActiveTab('basic');
    }
  }, [editingPlan, isPlanModalOpen, planWithFeatures]);
  
  // Flatten subscription data for table/export (avoid nested objects as cell values)
  const flattenedSubscriptions = useMemo(() => {
    const source = subsData?.subscriptions || [];
    if (!Array.isArray(source)) return [];
    
    return source.map((sub: any) => {
      // Safely extract company name and email from populated companyId
      // Backend populates companyId with { name, email, _id } when using .populate('companyId', 'name email')
      let companyName = 'Unknown Company';
      let companyEmail = '';
      let companyId = '';
      
      // Check if companyId is populated (object with name/email) or just an ID
      if (sub.companyId) {
        if (typeof sub.companyId === 'object' && sub.companyId !== null) {
          // Populated company object from backend: { _id, name, email }
          // Handle both _id (ObjectId) and id (string) formats
          companyId = sub.companyId._id?.toString() || sub.companyId.id?.toString() || String(sub.companyId._id || sub.companyId.id || '');
          
          // Extract name and email from populated object
          companyName = sub.companyId.name || 'Unknown Company';
          companyEmail = sub.companyId.email || '';
          
          // If name is missing but we have an ID, try to get from other fields
          if (!companyName || companyName === 'Unknown Company') {
            // Check if there's a company object nested differently
            if (sub.company && typeof sub.company === 'object') {
              companyName = sub.company.name || companyName;
              companyEmail = sub.company.email || companyEmail;
            }
          }
        } else {
          // Just an ID string/ObjectId (not populated)
          companyId = String(sub.companyId);
        }
      }
      
      // Fallback: check sub.company field if companyId wasn't populated
      if ((!companyName || companyName === 'Unknown Company') && sub.company) {
        if (typeof sub.company === 'string') {
          companyName = sub.company;
        } else if (typeof sub.company === 'object' && sub.company !== null) {
          companyName = sub.company.name || 'Unknown Company';
          companyEmail = sub.company.email || companyEmail;
          if (!companyId && sub.company._id) {
            companyId = sub.company._id.toString() || sub.company.id || '';
          }
        }
      }
      
      // Use companyId as fallback for email if email is empty
      if (!companyEmail && companyId) {
        companyEmail = companyId;
      }
      
      // Check if company data is populated (can be in companyId or company field)
      const companyData = (sub.companyId && typeof sub.companyId === 'object' && sub.companyId.name)
        ? sub.companyId
        : (sub.company && typeof sub.company === 'object' && sub.company.name)
        ? sub.company
        : null;
      
      // Safely extract plan key
      // CRITICAL: Use company's subscriptionPlan as source of truth (updated by Stripe webhook)
      let planKey = 'N/A';
      
      // First, check company data (source of truth after Stripe webhook)
      if (companyData && companyData.subscriptionPlan) {
        planKey = String(companyData.subscriptionPlan);
      } else if (sub.planKey) {
        planKey = String(sub.planKey);
      } else if (sub.plan) {
        if (typeof sub.plan === 'object' && sub.plan !== null) {
          planKey = String(sub.plan.displayName || sub.plan.name || 'N/A');
        } else {
          planKey = String(sub.plan);
        }
      }
      
      // Determine correct status: check if subscription has active status or if company status is active
      // If company status is 'active', subscription should show as 'active', not 'trial'
      let displayStatus = String(sub.status || '');
      
      // Extract company subscription data if populated
      let companyNextBilling: string | undefined;
      let companySubscriptionEnd: string | undefined;
      let companyStatus: string | undefined;
      
      if (companyData) {
        companyStatus = companyData.subscriptionStatus;
        // If company status is 'active', override subscription status to 'active'
        if (companyStatus === 'active' && displayStatus === 'trial') {
          displayStatus = 'active';
        }
        
        // CRITICAL: Use company data for dates (source of truth after Stripe webhook)
        companyNextBilling = companyData.nextBillingDate;
        companySubscriptionEnd = companyData.subscriptionEndDate;
      }
      
      // Calculate correct expiration date
      // Priority: company nextBillingDate > company subscriptionEndDate > subscription currentPeriodEnd > subscription nextBillingDate
      let expirationDate: string | undefined;
      
      // First, try company data (most up-to-date after webhook)
      if (companyNextBilling) {
        expirationDate = companyNextBilling;
      } else if (companySubscriptionEnd) {
        expirationDate = companySubscriptionEnd;
      } else if (sub.currentPeriodEnd) {
        expirationDate = sub.currentPeriodEnd;
      } else if (sub.nextBillingDate) {
        // Only use subscription nextBillingDate if it's valid (not trial end date)
        const nextBillingDate = new Date(sub.nextBillingDate);
        const trialEndDate = sub.trialEndDate ? new Date(sub.trialEndDate) : null;
        const now = new Date();
        
        // If nextBillingDate is in the past or equals trial end date, it's invalid
        const isPast = nextBillingDate < now;
        const equalsTrialEnd = trialEndDate && Math.abs(nextBillingDate.getTime() - trialEndDate.getTime()) < 1000;
        
        if (!isPast && !equalsTrialEnd) {
          expirationDate = sub.nextBillingDate;
        }
      }
      
      // Fallback to currentPeriodEnd if we still don't have a valid date
      const nextBilling = expirationDate || sub.currentPeriodEnd;
      
      // Create a clean object with ONLY primitive string values
      const flattened: Record<string, string> = {
        id: String(sub.id || ''),
        companyId: companyId,
        companyName: String(companyName),
        companyEmail: String(companyEmail),
        planKey: planKey,
        status: displayStatus,
        currentPeriodEnd: nextBilling ? String(nextBilling) : 'N/A',
      };
      
      // Final safety check: remove any object values that might have slipped through
      Object.keys(flattened).forEach(key => {
        const value = flattened[key];
        if (value !== null && value !== undefined && typeof value === 'object') {
          flattened[key] = '[Object]';
        }
      });
      
      return flattened;
    });
  }, [subsData]);

  // SUPER ADMIN VIEW: system-wide subscription + plan management
  if (isSuperAdmin) {

    const subscriptionColumns = [
      {
        key: 'companyName',
        title: 'Company',
        render: (_: any, row: any) => {
          // Defensive: ensure all values are strings, never objects
          const companyName = typeof row.companyName === 'string' 
            ? row.companyName 
            : (typeof row.companyName === 'object' && row.companyName?.name 
                ? String(row.companyName.name)
                : 'Unknown Company');
          const companyEmail = typeof row.companyEmail === 'string'
            ? row.companyEmail
            : (typeof row.companyEmail === 'object'
                ? (row.companyEmail?.email ? String(row.companyEmail.email) : '')
                : '');
          const companyId = typeof row.companyId === 'string'
            ? row.companyId
            : (typeof row.companyId === 'object'
                ? String(row.companyId?._id || row.companyId?.id || '')
                : String(row.companyId || ''));
          
          const displayEmail = companyEmail || companyId || 'N/A';
          const displayName = companyName || 'Unknown Company';
          const initial = displayName.charAt(0).toUpperCase();
          
          return (
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center text-white text-sm font-semibold">
                {initial}
              </div>
              <div>
                <p className="font-semibold text-gray-900 dark:text-white">
                  {displayName}
                </p>
                <p className="text-xs text-gray-500">
                  {displayEmail}
                </p>
              </div>
            </div>
          );
        },
      },
      {
        key: 'planKey',
        title: 'Plan',
        render: (value: string, row: any) => {
          // Get plan display name from plans list if available
          const planName = row.planKey || value || 'N/A';
          const plan = plans.find((p: any) => p.name === planName);
          const displayName = plan?.displayName || planName;
          
          return (
            <span className="capitalize font-semibold">
              {displayName !== 'N/A' ? displayName.toUpperCase() : 'N/A'}
            </span>
          );
        },
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
        key: 'currentPeriodEnd',
        title: 'Expires',
        render: (value: string) =>
          value ? formatDateTime(value).split(',')[0] : 'N/A',
      },
    ];

    const planColumns = [
      {
        key: 'displayName',
        title: 'Plan',
        render: (value: string, row: any) => (
          <div>
            <div className="flex items-center gap-2">
              <p className="font-semibold text-gray-900 dark:text-white">
                {value || row.name}
              </p>
              {row.enabledFeatureKeys && row.enabledFeatureKeys.length > 0 && (
                <Badge variant="info" className="text-xs">
                  {row.enabledFeatureKeys.length} feature{row.enabledFeatureKeys.length !== 1 ? 's' : ''}
                </Badge>
              )}
            </div>
            <p className="text-xs text-gray-500">
              {row.description || 'No description'}
            </p>
            {row.trialPeriod && row.trialPeriod > 0 && (
              <p className="text-xs text-primary-600 dark:text-primary-400 mt-1">
                {row.trialPeriod === 168 ? '7 days free trial' : `${Math.round(row.trialPeriod / 24)} days free trial`}
              </p>
            )}
          </div>
        ),
      },
      {
        key: 'price',
        title: 'Price',
        render: (value: number, row: any) => (
          <span className="font-semibold">
            {formatCurrency(value || 0, row.currency || 'BDT')} /{row.billingCycle || 'monthly'}
          </span>
        ),
      },
      {
        key: 'isActive',
        title: 'Status',
        render: (value: boolean) => (
          <Badge variant={value ? 'success' : 'danger'}>
            {value ? 'Active' : 'Inactive'}
          </Badge>
        ),
      },
      {
        key: 'actions',
        title: 'Actions',
        render: (_: any, row: any) => (
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="secondary"
              onClick={() => {
                setEditingPlan(row);
                setIsPlanModalOpen(true);
              }}
            >
              Edit Plan
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="text-red-600 hover:text-red-700"
              disabled={isDeletingPlan}
              onClick={async () => {
                if (!window.confirm(`Delete plan "${row.displayName || row.name}"?`)) return;
                try {
                  await deletePlan(row.id).unwrap();
                  toast.success('Plan deleted');
                } catch (err: any) {
                  toast.error(err?.data?.message || 'Failed to delete plan');
                }
              }}
            >
              Delete
            </Button>
          </div>
        ),
      },
    ];

    const handleSavePlan = async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      const formData = new FormData(event.currentTarget);
      
      const isUpdate = !!editingPlan?.id;
      
      // Base payload - different for create vs update
      // Note: Currency is handled globally in Settings, not per plan
      const payload: any = {};
      
      // Always include displayName and description (text fields)
      const displayName = (formData.get('displayName') as string)?.trim();
      const description = (formData.get('description') as string)?.trim();
      if (displayName) payload.displayName = displayName;
      if (description) payload.description = description;
      
      if (isUpdate) {
        // For updates: Only include fields that have actual values (not empty/0)
        // This prevents overwriting existing data with empty values
        const priceValue = formData.get('price') as string;
        if (priceValue && priceValue.trim() !== '') {
          const price = Number(priceValue);
          if (!isNaN(price) && price >= 0) {
            payload.price = price;
          }
        }
        
        const trialPeriodValue = formData.get('trialPeriod') as string;
        if (trialPeriodValue && trialPeriodValue.trim() !== '') {
          const trialPeriod = Number(trialPeriodValue);
          if (!isNaN(trialPeriod) && trialPeriod >= 0) {
            payload.trialPeriod = trialPeriod;
          }
        }
        
        // Always include isActive if checkbox exists (user explicitly sets it)
        const isActiveCheckbox = formData.get('isActive');
        if (isActiveCheckbox !== null) {
          payload.isActive = isActiveCheckbox === 'on';
        }
        
        const billingCycle = (formData.get('billingCycle') as string)?.trim();
        if (billingCycle) {
          payload.billingCycle = billingCycle;
        }
      } else {
        // For creation: Include all required fields with defaults
        payload.name = (formData.get('name') as string)?.trim();
        payload.price = Number(formData.get('price') || 0);
        payload.billingCycle = (formData.get('billingCycle') as string) || 'monthly';
        payload.trialPeriod = Number(formData.get('trialPeriod') || 0);
        payload.isActive = formData.get('isActive') === 'on';
      }

      // Include enabledFeatureKeys if features are selected
      if (selectedFeatures.length > 0) {
        payload.enabledFeatureKeys = selectedFeatures;
      }

      try {
        if (isUpdate) {
          await updatePlan({ id: editingPlan.id, data: payload }).unwrap();
          toast.success('Plan updated successfully');
          // Manually refetch plans to ensure UI updates
          await refetchPlans();
        } else {
          await createPlan(payload).unwrap();
          toast.success('Plan created successfully');
          // Manually refetch plans to ensure UI updates
          await refetchPlans();
        }
        setIsPlanModalOpen(false);
        setEditingPlan(null);
        setSelectedFeatures([]);
        setActiveTab('basic');
      } catch (err: any) {
        toast.error(err?.data?.message || 'Failed to save plan');
      }
    };

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <BuildingOffice2Icon className="w-8 h-8 text-purple-600" />
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                System Subscriptions
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                View and manage subscriptions for all companies
              </p>
            </div>
          </div>
        </div>

        {/* System-wide subscriptions */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>All Company Subscriptions</CardTitle>
            <Button
              variant="primary"
              onClick={() => {
                console.log('Create Feature-Based Subscription button clicked');
                setIsFeatureSubscriptionModalOpen(true);
                console.log('Modal state should be set to true');
              }}
            >
              Create Feature-Based Subscription
            </Button>
          </CardHeader>
          <CardContent>
            <DataTable
              data={flattenedSubscriptions}
              columns={subscriptionColumns}
              loading={isSubsLoading}
              searchable
              selectable={false}
              emptyMessage="No subscriptions found"
            />
          </CardContent>
        </Card>

        {/* Plan Management */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Subscription Plans</CardTitle>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Manage available plans for all companies
              </p>
            </div>
            <Button
              variant="primary"
              onClick={() => {
                setEditingPlan(null);
                setIsPlanModalOpen(true);
              }}
            >
              Create Plan
            </Button>
          </CardHeader>
          <CardContent>
            {plansError && (
              <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                <p className="text-sm text-red-600 dark:text-red-400">
                  Error loading plans: {plansError && 'message' in plansError ? plansError.message : 'Unknown error'}
                </p>
              </div>
            )}
            <DataTable
              data={plans}
              columns={planColumns}
              loading={isPlanLoading}
              searchable
              selectable={false}
              emptyMessage="No plans found"
            />
          </CardContent>
        </Card>

        {/* Create / Edit Plan Modal */}
        <Modal
          isOpen={isPlanModalOpen}
          onClose={() => {
            setIsPlanModalOpen(false);
            setEditingPlan(null);
            setSelectedFeatures([]);
            setActiveTab('basic');
          }}
          title={editingPlan ? 'Edit Subscription Plan' : 'Create Subscription Plan'}
          className="max-w-4xl"
        >
          {/* Tabs */}
          <div className="border-b border-gray-200 dark:border-gray-700 mb-6">
            <nav className="flex space-x-8">
              <button
                type="button"
                onClick={() => setActiveTab('basic')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'basic'
                    ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                }`}
              >
                Basic Information
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('features')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'features'
                    ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                }`}
              >
                Features ({selectedFeatures.length})
              </button>
            </nav>
          </div>

          <form onSubmit={handleSavePlan} className="space-y-4">
            {activeTab === 'basic' && (
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Internal Name
                    {editingPlan?.id && (
                      <span className="text-xs text-gray-500 dark:text-gray-400 ml-2">(Cannot be changed)</span>
                    )}
                  </label>
                  <Input
                    name="name"
                    defaultValue={editingPlan?.name || ''}
                    placeholder="basic, premium, enterprise"
                    required
                    disabled={!!editingPlan?.id}
                    className={editingPlan?.id ? 'bg-gray-100 dark:bg-gray-800 cursor-not-allowed' : ''}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Display Name
                  </label>
                  <Input
                    name="displayName"
                    defaultValue={editingPlan?.displayName || ''}
                    placeholder="Basic, Premium, Enterprise"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Description
                  </label>
                  <Input
                    name="description"
                    defaultValue={editingPlan?.description || ''}
                    placeholder="Short description of the plan"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Price
                    <span className="text-xs text-gray-500 dark:text-gray-400 ml-2">
                      (Currency is set globally in Settings)
                    </span>
                  </label>
                  <Input
                    name="price"
                    type="number"
                    min={0}
                    step="0.01"
                    defaultValue={editingPlan?.price ?? 0}
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Billing Cycle
                    </label>
                    <Input
                      name="billingCycle"
                      defaultValue={editingPlan?.billingCycle || 'monthly'}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Trial Period (hours)
                    </label>
                    <Input
                      name="trialPeriod"
                      type="number"
                      min={0}
                      defaultValue={editingPlan?.trialPeriod ?? 0}
                    />
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      168 hours = 7 days (for free trial)
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    id="isActive"
                    name="isActive"
                    type="checkbox"
                    defaultChecked={editingPlan ? editingPlan.isActive : true}
                    className="h-4 w-4 text-primary-600 border-gray-300 rounded"
                  />
                  <label
                    htmlFor="isActive"
                    className="text-sm text-gray-700 dark:text-gray-300"
                  >
                    Active
                  </label>
                </div>
              </div>
            )}

            {activeTab === 'features' && (
              <div>
                <PlanFeatureSelector
                  selectedFeatures={selectedFeatures}
                  onChange={setSelectedFeatures}
                />
              </div>
            )}

            <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  setIsPlanModalOpen(false);
                  setEditingPlan(null);
                  setSelectedFeatures([]);
                  setActiveTab('basic');
                }}
              >
                Cancel
              </Button>
              {activeTab === 'features' && (
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setActiveTab('basic')}
                >
                  Back to Basic Info
                </Button>
              )}
              <Button
                type="submit"
                variant="primary"
                isLoading={isCreatingPlan || isUpdatingPlan}
              >
                {editingPlan ? 'Save Changes' : 'Create Plan'}
              </Button>
            </div>
          </form>
        </Modal>

        {/* Feature-Based Subscription Creation Modal - Super Admin */}
        <Modal
          isOpen={isFeatureSubscriptionModalOpen}
          onClose={() => {
            setIsFeatureSubscriptionModalOpen(false);
            setSelectedSubscriptionFeatures([]);
            setSelectedCompanyForSubscription('');
            setFeatureBillingCycle('monthly');
          }}
          title="Create Feature-Based Subscription"
          size="xl"
        >
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Select Company
              </label>
              <select
                value={selectedCompanyForSubscription}
                onChange={(e) => setSelectedCompanyForSubscription(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                required
              >
                <option value="">-- Select a company --</option>
                {companies.map((company: any) => (
                  <option key={company._id || company.id} value={company._id || company.id}>
                    {company.name} ({company.email})
                  </option>
                ))}
              </select>
            </div>

            {selectedCompanyForSubscription && (
              <>
                <FeatureBasedSubscriptionSelector
                  selectedFeatures={selectedSubscriptionFeatures}
                  onChange={setSelectedSubscriptionFeatures}
                  billingCycle={featureBillingCycle}
                  onBillingCycleChange={setFeatureBillingCycle}
                  onPriceCalculated={setFeatureSubscriptionPrice}
                />
              </>
            )}

            {selectedSubscriptionFeatures.length > 0 && selectedCompanyForSubscription && (
              <div className="flex gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                <Button
                  variant="secondary"
                  onClick={() => {
                    setIsFeatureSubscriptionModalOpen(false);
                    setSelectedSubscriptionFeatures([]);
                    setSelectedCompanyForSubscription('');
                    setFeatureBillingCycle('monthly');
                  }}
                  className="flex-1"
                  disabled={isCreatingFeatureSubscription}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleCreateFeatureSubscription}
                  isLoading={isCreatingFeatureSubscription}
                  className="flex-1"
                  variant="primary"
                  disabled={!selectedCompanyForSubscription || selectedSubscriptionFeatures.length === 0}
                >
                  {isCreatingFeatureSubscription ? 'Creating...' : 'Create Subscription'}
                </Button>
              </div>
            )}
          </div>
        </Modal>
      </div>
    );
  }

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
                      {formatCurrency(effectiveSubscription.plan?.price || 0, effectiveSubscription.plan?.currency)}
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
                  {(() => {
                    // Use nextBillingDate if valid, otherwise use currentPeriodEnd
                    const nextBilling = (effectiveSubscription as any).nextBillingDate;
                    const periodEnd = effectiveSubscription.currentPeriodEnd;
                    
                    // If nextBillingDate exists and is in the future, use it
                    if (nextBilling) {
                      const nextBillingDate = new Date(nextBilling);
                      const now = new Date();
                      if (nextBillingDate > now) {
                        return formatDateTime(nextBilling).split(',')[0];
                      }
                    }
                    
                    // Otherwise use currentPeriodEnd
                    if (periodEnd) {
                      return formatDateTime(periodEnd).split(',')[0];
                    }
                    
                    return 'N/A';
                  })()}
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

      {/* View Mode Toggle - Only for non-Super Admin users */}
      {!isSuperAdmin && (
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Choose Your Subscription Type
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  Select from fixed plans or build your own custom subscription
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  variant={viewMode === 'plans' ? 'primary' : 'secondary'}
                  onClick={() => setViewMode('plans')}
                  className="min-w-[140px]"
                >
                  Fixed Plans
                </Button>
                <Button
                  variant={viewMode === 'features' ? 'primary' : 'secondary'}
                  onClick={() => setViewMode('features')}
                  className="min-w-[140px]"
                >
                  Custom Features
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Feature-Based Subscription View */}
      {!isSuperAdmin && viewMode === 'features' && (
        <div id="custom-features" className="mb-6">
          <Card>
            <CardHeader>
              <CardTitle>Build Your Custom Subscription</CardTitle>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Select only the features you need and pay only for what you use
              </p>
            </CardHeader>
            <CardContent>
              <FeatureBasedSubscriptionSelector
                selectedFeatures={selectedSubscriptionFeatures}
                onChange={setSelectedSubscriptionFeatures}
                billingCycle={featureBillingCycle}
                onBillingCycleChange={setFeatureBillingCycle}
                onPriceCalculated={setFeatureSubscriptionPrice}
              />
              
              {selectedSubscriptionFeatures.length > 0 && (
                <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
                  <Button
                    variant="primary"
                    onClick={() => setIsFeatureSubscriptionModalOpen(true)}
                    className="w-full"
                    size="lg"
                  >
                    Create Custom Subscription - {formatCurrency(featureSubscriptionPrice)}
                    /{featureBillingCycle === 'monthly' ? 'month' : 'year'}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Available Plans */}
      <div id="available-plans" className={!isSuperAdmin && viewMode === 'features' ? 'hidden' : ''}>
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
                      {formatCurrency(plan.price, plan.currency)}
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
                        {plan.price === 0 ? 'Free' : formatCurrency(plan.price, plan.currency)}
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
                  {formatCurrency(effectiveSubscription?.plan?.price || 0, effectiveSubscription?.plan?.currency)}/{effectiveSubscription?.plan?.billingCycle || 'month'}
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
                      You will be charged an additional {formatCurrency(selectedPlan.price - (effectiveSubscription.plan?.price || 0), selectedPlan.currency)}/{selectedPlan.billingCycle}
                    </>
                  ) : (
                    <>
                      <ArrowTrendingUpIcon className="w-4 h-4 inline mr-2 rotate-180" />
                      You will save {formatCurrency((effectiveSubscription.plan?.price || 0) - selectedPlan.price, effectiveSubscription.plan?.currency || selectedPlan.currency)}/{selectedPlan.billingCycle}
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

      {/* Feature-Based Subscription Creation Modal */}
      <Modal
        isOpen={isFeatureSubscriptionModalOpen}
        onClose={() => {
          setIsFeatureSubscriptionModalOpen(false);
          setSelectedSubscriptionFeatures([]);
          setSelectedCompanyForSubscription('');
          setFeatureBillingCycle('monthly');
        }}
        title={isSuperAdmin ? "Create Feature-Based Subscription" : "Confirm Custom Subscription"}
        size={isSuperAdmin ? "xl" : "lg"}
      >
        {isSuperAdmin ? (
          // Super Admin: Full creation flow with company selection
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Select Company
              </label>
              <select
                value={selectedCompanyForSubscription}
                onChange={(e) => setSelectedCompanyForSubscription(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                required
              >
                <option value="">-- Select a company --</option>
                {companies.map((company: any) => (
                  <option key={company._id || company.id} value={company._id || company.id}>
                    {company.name} ({company.email})
                  </option>
                ))}
              </select>
            </div>

            {selectedCompanyForSubscription && (
              <>
                <FeatureBasedSubscriptionSelector
                  selectedFeatures={selectedSubscriptionFeatures}
                  onChange={setSelectedSubscriptionFeatures}
                  billingCycle={featureBillingCycle}
                  onBillingCycleChange={setFeatureBillingCycle}
                  onPriceCalculated={setFeatureSubscriptionPrice}
                />
              </>
            )}

            {selectedSubscriptionFeatures.length > 0 && selectedCompanyForSubscription && (
              <div className="flex gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                <Button
                  variant="secondary"
                  onClick={() => {
                    setIsFeatureSubscriptionModalOpen(false);
                    setSelectedSubscriptionFeatures([]);
                    setSelectedCompanyForSubscription('');
                    setFeatureBillingCycle('monthly');
                  }}
                  className="flex-1"
                  disabled={isCreatingFeatureSubscription}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleCreateFeatureSubscription}
                  isLoading={isCreatingFeatureSubscription}
                  className="flex-1"
                  variant="primary"
                  disabled={!selectedCompanyForSubscription || selectedSubscriptionFeatures.length === 0}
                >
                  {isCreatingFeatureSubscription ? 'Creating...' : 'Create Subscription'}
                </Button>
              </div>
            )}
          </div>
        ) : (
          // Regular users: Confirmation modal
          <div className="space-y-6">
            <div>
              <p className="text-gray-600 dark:text-gray-400 mb-2">
                Are you sure you want to create a custom subscription with the selected features?
              </p>
            </div>

            {/* Subscription Summary */}
            <div className="p-4 bg-primary-50 dark:bg-primary-900/20 rounded-lg border-2 border-primary-500">
            <h4 className="font-semibold text-gray-900 dark:text-white mb-3">Subscription Summary</h4>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400">Billing Cycle:</span>
                <span className="font-medium text-gray-900 dark:text-white capitalize">
                  {featureBillingCycle}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400">Selected Features:</span>
                <span className="font-medium text-gray-900 dark:text-white">
                  {selectedSubscriptionFeatures.length}
                </span>
              </div>
              <div className="flex justify-between text-lg font-bold border-t border-primary-200 dark:border-primary-700 pt-2 mt-2">
                <span className="text-gray-900 dark:text-white">Total Price:</span>
                <span className="text-primary-600 dark:text-primary-400">
                  {formatCurrency(featureSubscriptionPrice)}/{featureBillingCycle === 'monthly' ? 'month' : 'year'}
                </span>
              </div>
            </div>
            </div>

            {/* Selected Features List */}
            {selectedSubscriptionFeatures.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-semibold text-gray-900 dark:text-white">Selected Features:</h4>
                <div className="space-y-1 max-h-48 overflow-y-auto p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  {selectedSubscriptionFeatures.map((featureKey, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-sm">
                      <CheckCircleIcon className="w-4 h-4 text-green-500 flex-shrink-0" />
                      <span className="text-gray-700 dark:text-gray-300">{featureKey}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
              <p className="text-sm text-yellow-800 dark:text-yellow-200">
                <CreditCardIcon className="w-4 h-4 inline mr-2" />
                Your custom subscription will be created immediately with the selected features.
              </p>
            </div>

            <div className="flex gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
              <Button
                variant="secondary"
                onClick={() => {
                  setIsFeatureSubscriptionModalOpen(false);
                }}
                className="flex-1"
                disabled={isCreatingFeatureSubscription}
              >
                Cancel
              </Button>
              <Button
                onClick={handleCreateFeatureSubscription}
                isLoading={isCreatingFeatureSubscription}
                className="flex-1"
                variant="primary"
                disabled={selectedSubscriptionFeatures.length === 0}
              >
                {isCreatingFeatureSubscription ? 'Creating...' : 'Create Subscription'}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}