'use client';
import { FeatureBasedSubscriptionSelector } from '@/components/subscriptions/FeatureBasedSubscriptionSelector';
import { PaymentInstructionsModal } from '@/components/subscriptions/PaymentInstructionsModal';
import { PaymentMethodSelector } from '@/components/subscriptions/PaymentMethodSelector';
import { PlanFeatureSelector } from '@/components/subscriptions/PlanFeatureSelector';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { DataTable } from '@/components/ui/DataTable';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Select } from '@/components/ui/Select';
import { useGetCompaniesQuery, useGetCompanyByIdQuery } from '@/lib/api/endpoints/companiesApi';
import { useCreateCheckoutSessionMutation } from '@/lib/api/endpoints/paymentsApi';
import {
  PaymentRequest,
  PaymentRequestStatus,
  SubscriptionPaymentMethod,
  useGetPaymentRequestsQuery,
  useInitializeSubscriptionPaymentMutation,
  useManualActivateSubscriptionMutation,
  useVerifyPaymentRequestMutation,
} from '@/lib/api/endpoints/subscriptionPaymentsApi';
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

// Payment Requests Section Component
function PaymentRequestsSection({ isSuperAdmin }: { isSuperAdmin: boolean }) {
  const [statusFilter, setStatusFilter] = useState<PaymentRequestStatus | undefined>(PaymentRequestStatus.PENDING);
  const [selectedRequest, setSelectedRequest] = useState<PaymentRequest | null>(null);
  const [isVerifyModalOpen, setIsVerifyModalOpen] = useState(false);
  const [verifyForm, setVerifyForm] = useState({
    adminNotes: '',
    rejectionReason: '',
  });

  const { data: paymentRequests = [], isLoading, refetch } = useGetPaymentRequestsQuery(
    { status: statusFilter },
    { skip: !isSuperAdmin }
  );

  const [verifyRequest, { isLoading: isVerifying }] = useVerifyPaymentRequestMutation();

  const getStatusBadge = (status: PaymentRequestStatus) => {
    const statusConfig = {
      [PaymentRequestStatus.PENDING]: { variant: 'warning' as const, label: 'Pending' },
      [PaymentRequestStatus.VERIFIED]: { variant: 'success' as const, label: 'Verified' },
      [PaymentRequestStatus.REJECTED]: { variant: 'danger' as const, label: 'Rejected' },
      [PaymentRequestStatus.EXPIRED]: { variant: 'secondary' as const, label: 'Expired' },
    };
    const config = statusConfig[status] || statusConfig[PaymentRequestStatus.PENDING];
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const getCompanyName = (company: any) => {
    if (typeof company === 'string') return 'Unknown Company';
    return company?.name || 'Unknown Company';
  };

  const getPaymentMethodName = (method: any) => {
    if (typeof method === 'string') return 'Unknown Method';
    return method?.displayName || method?.name || 'Unknown Method';
  };

  const columns = [
    {
      key: 'company',
      title: 'Company',
      render: (_: any, row: PaymentRequest) => getCompanyName(row.companyId),
    },
    {
      key: 'planName',
      title: 'Plan',
      render: (value: string) => value,
    },
    {
      key: 'amount',
      title: 'Amount',
      render: (_: any, row: PaymentRequest) => formatCurrency(row.amount, row.currency),
    },
    {
      key: 'paymentMethod',
      title: 'Payment Method',
      render: (_: any, row: PaymentRequest) => getPaymentMethodName(row.paymentMethodId),
    },
    {
      key: 'transactionId',
      title: 'Transaction ID',
      render: (value: string) => (
        <span className="font-mono text-xs">{value}</span>
      ),
    },
    {
      key: 'phoneNumber',
      title: 'Phone Number',
      render: (value: string) => value,
    },
    {
      key: 'status',
      title: 'Status',
      render: (_: any, row: PaymentRequest) => getStatusBadge(row.status),
    },
    {
      key: 'createdAt',
      title: 'Submitted',
      render: (value: string) => formatDateTime(value),
    },
    {
      key: 'actions',
      title: 'Actions',
      render: (_: any, row: PaymentRequest) => (
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="secondary"
            onClick={() => {
              setSelectedRequest(row);
              setIsVerifyModalOpen(true);
            }}
            disabled={row.status !== PaymentRequestStatus.PENDING}
          >
            Review
          </Button>
        </div>
      ),
    },
  ];

  const handleVerify = async (status: PaymentRequestStatus) => {
    if (!selectedRequest) return;

    if (status === PaymentRequestStatus.REJECTED && !verifyForm.rejectionReason) {
      toast.error('Please provide a rejection reason');
      return;
    }

    // Ensure we have a valid request ID
    const requestId = selectedRequest.id || (selectedRequest as any)._id;
    if (!requestId) {
      toast.error('Invalid payment request ID');
      return;
    }

    try {
      await verifyRequest({
        requestId,
        status,
        adminNotes: verifyForm.adminNotes || undefined,
        rejectionReason: verifyForm.rejectionReason || undefined,
      }).unwrap();

      toast.success(
        status === PaymentRequestStatus.VERIFIED
          ? 'Payment verified and subscription activated!'
          : 'Payment request rejected'
      );

      setIsVerifyModalOpen(false);
      setSelectedRequest(null);
      setVerifyForm({ adminNotes: '', rejectionReason: '' });
      refetch();
    } catch (error: any) {
      toast.error(error?.data?.message || error?.message || 'Failed to verify payment request');
    }
  };

  if (!isSuperAdmin) return null;

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
            <div>
              <CardTitle className="text-lg sm:text-xl">Payment Requests</CardTitle>
              <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                Review and verify manual payment requests
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                variant={statusFilter === PaymentRequestStatus.PENDING ? 'primary' : 'secondary'}
                size="sm"
                onClick={() => setStatusFilter(PaymentRequestStatus.PENDING)}
              >
                Pending ({paymentRequests.filter((r) => r.status === PaymentRequestStatus.PENDING).length})
              </Button>
              <Button
                variant={statusFilter === undefined ? 'primary' : 'secondary'}
                size="sm"
                onClick={() => setStatusFilter(undefined)}
              >
                All
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <DataTable
            data={paymentRequests}
            columns={columns}
            loading={isLoading}
            searchable
            selectable={false}
            emptyMessage="No payment requests found"
          />
        </CardContent>
      </Card>

      {/* Verify Payment Request Modal */}
      <Modal
        isOpen={isVerifyModalOpen}
        onClose={() => {
          setIsVerifyModalOpen(false);
          setSelectedRequest(null);
          setVerifyForm({ adminNotes: '', rejectionReason: '' });
        }}
        title="Review Payment Request"
        size="lg"
      >
        {selectedRequest && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Company
                </label>
                <div className="text-gray-900 dark:text-white">{getCompanyName(selectedRequest.companyId)}</div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Plan
                </label>
                <div className="text-gray-900 dark:text-white">{selectedRequest.planName}</div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Amount
                </label>
                <div className="text-gray-900 dark:text-white">
                  {formatCurrency(selectedRequest.amount, selectedRequest.currency)}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Payment Method
                </label>
                <div className="text-gray-900 dark:text-white">
                  {getPaymentMethodName(selectedRequest.paymentMethodId)}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Transaction ID
                </label>
                <div className="font-mono text-sm text-gray-900 dark:text-white">
                  {selectedRequest.transactionId}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Phone Number
                </label>
                <div className="text-gray-900 dark:text-white">{selectedRequest.phoneNumber}</div>
              </div>
              {selectedRequest.referenceNumber && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Reference Number
                  </label>
                  <div className="text-gray-900 dark:text-white">{selectedRequest.referenceNumber}</div>
                </div>
              )}
              {selectedRequest.notes && (
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    User Notes
                  </label>
                  <div className="text-gray-900 dark:text-white">{selectedRequest.notes}</div>
                </div>
              )}
              {selectedRequest.screenshotUrl && (
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Payment Screenshot
                  </label>
                  <div className="mt-2">
                    <img
                      src={selectedRequest.screenshotUrl}
                      alt="Payment screenshot"
                      className="max-w-full h-auto rounded-lg border border-gray-300 dark:border-gray-700 cursor-pointer hover:opacity-90"
                      onClick={() => window.open(selectedRequest.screenshotUrl, '_blank')}
                    />
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      Click to view full size
                    </p>
                  </div>
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Admin Notes (Optional)
              </label>
              <textarea
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                rows={3}
                placeholder="Add any notes about this verification..."
                value={verifyForm.adminNotes}
                onChange={(e) => setVerifyForm({ ...verifyForm, adminNotes: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Rejection Reason (Required if rejecting)
              </label>
              <Input
                type="text"
                placeholder="Enter reason for rejection..."
                value={verifyForm.rejectionReason}
                onChange={(e) => setVerifyForm({ ...verifyForm, rejectionReason: e.target.value })}
              />
            </div>

            <div className="flex gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
              <Button
                variant="secondary"
                onClick={() => {
                  setIsVerifyModalOpen(false);
                  setSelectedRequest(null);
                  setVerifyForm({ adminNotes: '', rejectionReason: '' });
                }}
                className="flex-1"
                disabled={isVerifying}
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                onClick={() => handleVerify(PaymentRequestStatus.REJECTED)}
                className="flex-1"
                disabled={isVerifying}
              >
                {isVerifying ? 'Rejecting...' : 'Reject'}
              </Button>
              <Button
                variant="primary"
                onClick={() => handleVerify(PaymentRequestStatus.VERIFIED)}
                className="flex-1"
                disabled={isVerifying}
              >
                {isVerifying ? 'Verifying...' : 'Verify & Activate'}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}

export default function SubscriptionsPage() {
  const { user } = useAppSelector((state) => state.auth);
  const companyId = user?.companyId || '';
  const isSuperAdmin = user?.role === 'SUPER_ADMIN' || user?.role === 'super_admin';
  const { data: plansData, isLoading: isPlanLoading, error: plansError, refetch: refetchPlans } = useGetSubscriptionPlansQuery({});
  // Normalize plans data - transformResponse handles the normalization
  const plans = useMemo(() => {
    // Debug logging
    if (!plansData) {
      return [];
    }
    // transformResponse returns normalized array or { plans: [...] }
    if (Array.isArray(plansData)) {
      return plansData;
    }
    // Handle { plans: [...] } format from transformResponse
    if (plansData && typeof plansData === 'object' && 'plans' in plansData) {
      const plansArray = Array.isArray((plansData as any).plans) ? (plansData as any).plans : [];
      return plansArray;
    }
    // Log unexpected format for debugging
    console.warn('Unexpected plans data format:', plansData);
    return [];
  }, [plansData]);
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
    // Subscription is in trial only if:
    // 1. Status is explicitly 'trial' AND
    // 2. Has a valid trialEndDate (not null, not undefined, not empty)
    // If status is 'active', it's NOT a trial, regardless of trialEndDate
    const isTrial = subscriptionStatus === 'trial' && trialEndDate !== null;
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
    // Find the plan from company data
    const plan = plans.find((p: any) => p.name === companyPlan);
    if (plan) {
      // Always use company plan (source of truth after Stripe webhook)
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
      }
  }
  // If we have actual subscription, ensure isTrial is correct based on status and trialEndDate
  if (actualSubscription) {
    const sub = actualSubscription as any;
    const subscriptionStatus = sub.status || 'active';
    const hasTrialEndDate = sub.trialEndDate || sub.trialEnd;
    // Subscription is trial ONLY if:
    // 1. Status is explicitly 'trial' AND
    // 2. Has a valid trialEndDate
    // If status is 'active', it's NOT a trial, regardless of trialEndDate
    const computedIsTrial = subscriptionStatus === 'trial' && hasTrialEndDate !== null && hasTrialEndDate !== undefined;
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
  const [updateSubscription] = useUpdateSubscriptionMutation();
  const [cancelSubscription, { isLoading: isCancelling }] = useCancelSubscriptionMutation();
  const [reactivateSubscription, { isLoading: isReactivating }] = useReactivateSubscriptionMutation();
  const [_createCheckoutSession, { isLoading: isUpdating }] = useCreateCheckoutSessionMutation();
  const [selectedPlan, setSelectedPlan] = useState<any>(null);
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [isPaymentMethodModalOpen, setIsPaymentMethodModalOpen] = useState(false);
  const [isFeatureSubscriptionPayment, setIsFeatureSubscriptionPayment] = useState(false);
  const [isPaymentInstructionsModalOpen, setIsPaymentInstructionsModalOpen] = useState(false);
  const [paymentInstructions, setPaymentInstructions] = useState<any>(null);
  const [paymentGateway, setPaymentGateway] = useState<string>('');
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<SubscriptionPaymentMethod | null>(null);
  const [initializePayment, { isLoading: isInitializingPayment }] = useInitializeSubscriptionPaymentMutation();
  const [manualActivate, { isLoading: isActivating }] = useManualActivateSubscriptionMutation();
  // Auto-refresh + finalize plan when returning from checkout (Stripe)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const urlParams = new URLSearchParams(window.location.search);
    const sessionId = urlParams.get('session_id');
    const checkoutSuccess = urlParams.get('checkout') === 'success';
    const genericSuccess = urlParams.get('success') === 'true';
    const hasSuccess = sessionId || checkoutSuccess || genericSuccess;
    if (!hasSuccess) return;
    const finalizePendingPlan = async (subscriptionId?: string) => {
      try {
        // Check for feature-based subscription first
        const featureRaw = window.localStorage.getItem('pendingFeatureSubscription');
        if (featureRaw) {
          // Feature-based subscriptions are handled by webhook, just clean up
          window.localStorage.removeItem('pendingFeatureSubscription');
          toast.success('Feature-based subscription activated successfully');
          refetchCompany();
          refetchCurrentSubscription();
          refetchSubscriptionByCompany();
          return;
        }
        
        // Handle plan-based subscription
        const raw = window.localStorage.getItem('pendingPlanChange');
        if (!raw) return;
        const pending = JSON.parse(raw);
        if (!pending?.planId) return;
        const subId = subscriptionId || pending.subscriptionId;
        if (!subId) return;
        toast.loading('Applying plan change...', { id: 'pending-plan' });
        await updateSubscription({
          id: subId,
          planId: pending.planId,
        }).unwrap();
        toast.dismiss('pending-plan');
        toast.success('Plan updated successfully');
        window.localStorage.removeItem('pendingPlanChange');
        refetchCompany();
        refetchCurrentSubscription();
        refetchSubscriptionByCompany();
      } catch (err: any) {
        toast.dismiss('pending-plan');
        console.error('Failed to apply pending plan change', err);
        toast.error(err?.data?.message || 'Failed to apply plan change after checkout');
      }
    };
    refetchCompany();
    refetchCurrentSubscription();
    refetchSubscriptionByCompany();
    // Clear the URL parameters after refetching
    const newUrl = window.location.pathname;
    window.history.replaceState({}, '', newUrl);
    // Show success message
    toast.success('Payment successful. Finalizing your plan change...');
    // Apply pending plan after a short delay to ensure data is available
    setTimeout(() => {
      finalizePendingPlan(effectiveSubscription?.id);
      // Safety refetch after finalize
      setTimeout(() => {
        refetchCompany();
        refetchCurrentSubscription();
        refetchSubscriptionByCompany();
      }, 1500);
    }, 400);
  }, [
    effectiveSubscription?.id,
    refetchCompany,
    refetchCurrentSubscription,
    refetchSubscriptionByCompany,
    updateSubscription,
  ]);
  // View mode: 'plans' or 'features'
  const [viewMode, setViewMode] = useState<'plans' | 'features'>('plans');
  // Feature-based subscription state
  const [selectedSubscriptionFeatures, setSelectedSubscriptionFeatures] = useState<string[]>([]);
  const [featureBillingCycle, setFeatureBillingCycle] = useState<'monthly' | 'quarterly' | 'yearly'>('monthly');
  const [featureSubscriptionPrice, setFeatureSubscriptionPrice] = useState<number>(0);
  
  // Debug: Log price changes
  useEffect(() => {
    console.log('[SubscriptionsPage] featureSubscriptionPrice updated:', featureSubscriptionPrice);
  }, [featureSubscriptionPrice]);
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
  const handleUpgrade = () => {
    if (!selectedPlan) {
      toast.error('Please select a plan');
      return;
    }
    // For new companies without subscription, allow them to proceed
    if (!effectiveSubscription) {
      setIsUpgradeModalOpen(false);
      setTimeout(() => {
        setIsPaymentMethodModalOpen(true);
      }, 100);
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
    // Close upgrade modal and open payment method selector
    setIsUpgradeModalOpen(false);
    // Small delay to ensure modal closes before opening new one
    setTimeout(() => {
      setIsPaymentMethodModalOpen(true);
    }, 100);
  };
  const handlePaymentMethodSelected = async (method: SubscriptionPaymentMethod) => {
    if (!selectedPlan || !companyId) {
      toast.error('Missing plan or company information');
      return;
    }
    setSelectedPaymentMethod(method);
    try {
      toast.loading('Initializing payment...', { id: 'payment-init' });
      // Initialize payment based on selected method
      // Ensure we have the payment method ID - try id, _id, or method itself
      const methodId = method.id || (method as any)._id || (method as any).id?.toString() || (method as any)._id?.toString();
      
      const paymentResponse = await initializePayment({
        companyId,
        planName: selectedPlan.name,
        paymentGateway: method.gateway,
        paymentMethodId: methodId, // Pass the specific payment method ID for manual payments
        billingCycle: 'monthly',
      }).unwrap();
      toast.dismiss('payment-init');
      // Handle different payment gateway responses
      // transformResponse should have already unwrapped the data
      if (paymentResponse.url) {
        // Redirect to payment URL (Stripe, PayPal, Google Pay, etc.)
        // Persist pending plan change so we can finalize after returning from checkout
        try {
          window.localStorage.setItem(
            'pendingPlanChange',
            JSON.stringify({
              planId: selectedPlan.id,
              planName: selectedPlan.name,
              companyId,
              subscriptionId: effectiveSubscription?.id || null,
            }),
          );
        } catch (e) {
          console.warn('Failed to persist pendingPlanChange', e);
        }
        window.location.href = paymentResponse.url;
      } else if (paymentResponse.requiresManualVerification && paymentResponse.instructions) {
        // For mobile wallets (bKash, Nagad) with manual verification, show instructions modal
        // Store payment info in instructions to ensure it's available when form is submitted
        // Ensure we have the payment method ID - try id, _id, or method itself
        const methodId = method.id || (method as any)._id || (method as any).id?.toString() || (method as any)._id?.toString();
        
        if (!methodId) {
          console.error('Payment method ID is missing:', method);
          toast.error('Payment method ID is missing. Please try again.');
          return;
        }

        const instructionsWithPaymentInfo = {
          ...paymentResponse.instructions,
          _paymentInfo: {
            companyId,
            paymentMethodId: methodId,
            planName: selectedPlan?.name,
            billingCycle: 'monthly',
          },
        };
        setPaymentInstructions(instructionsWithPaymentInfo);
        setPaymentGateway(paymentResponse.gateway);
        setIsPaymentMethodModalOpen(false);
        setIsPaymentInstructionsModalOpen(true);
        toast.success('Please follow the payment instructions below', {
          duration: 5000,
        });
      } else if (paymentResponse.clientSecret) {
        // For payment methods that require client secret (future implementation)
        toast.error('This payment method requires additional setup. Please contact support.');
      } else {
        console.error('🔴 Payment initialization failed - no URL, clientSecret, or requiresManualVerification');
        console.error('🔴 Full response:', paymentResponse);
        toast.error('Payment initialization failed - no payment URL received. Please check console for details.');
      }
      // Only close modals if we're redirecting (not showing instructions)
      if (paymentResponse.url) {
        setIsPaymentMethodModalOpen(false);
        setIsUpgradeModalOpen(false);
      }
    } catch (error: any) {
      console.error('🔴 Payment initialization error:', error);
      toast.dismiss('payment-init');
      toast.error(error?.data?.message || error?.message || 'Failed to initialize payment');
    }
  };
  const handleManualActivation = async () => {
    const targetCompanyId = isSuperAdmin ? (selectedCompanyForSubscription || companyId) : companyId;
    if (!targetCompanyId || !selectedPlan) {
      toast.error('Please select a company and plan');
      return;
    }
    try {
      toast.loading('Activating subscription...', { id: 'manual-activate' });
      await manualActivate({
        companyId: targetCompanyId,
        planName: selectedPlan.name,
        billingCycle: selectedPlan.billingCycle || 'monthly',
        notes: `Manually activated by Super Admin${user?.firstName ? ` (${user.firstName} ${user.lastName})` : ''}`,
      }).unwrap();
      toast.dismiss('manual-activate');
      toast.success('Subscription activated successfully');
      setIsUpgradeModalOpen(false);
      setSelectedPlan(null);
      if (isSuperAdmin) {
        setSelectedCompanyForSubscription('');
      }
      refetchCompany();
      if (isSuperAdmin) {
        refetchAllSubscriptions();
      }
    } catch (error: any) {
      toast.dismiss('manual-activate');
      toast.error(error?.data?.message || 'Failed to activate subscription');
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
      // Super Admin: Direct creation (no payment needed)
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
        refetchAllSubscriptions();
      } catch (error: any) {
        console.error('Feature subscription creation error:', error);
        toast.error(error?.data?.message || error?.message || 'Failed to create subscription. Please try again.');
      }
    } else {
      // Regular user: Show payment method selector
      setIsFeatureSubscriptionModalOpen(false);
      setIsFeatureSubscriptionPayment(true);
      setIsPaymentMethodModalOpen(true);
    }
  };
  
  // Handle payment method selection for feature-based subscriptions
  const handleFeatureSubscriptionPayment = async (method: SubscriptionPaymentMethod) => {
    if (!selectedSubscriptionFeatures || selectedSubscriptionFeatures.length === 0) {
      toast.error('Please select at least one feature');
      return;
    }
    if (!companyId) {
      toast.error('Company information not found');
      return;
    }
    setSelectedPaymentMethod(method);
    try {
      toast.loading('Initializing payment...', { id: 'feature-payment-init' });
      const methodId = method.id || (method as any)._id || (method as any).id?.toString() || (method as any)._id?.toString();
      
      const paymentResponse = await initializePayment({
        companyId,
        enabledFeatures: selectedSubscriptionFeatures, // Pass enabledFeatures instead of planName
        paymentGateway: method.gateway,
        paymentMethodId: methodId,
        billingCycle: featureBillingCycle,
      }).unwrap();
      
      toast.dismiss('feature-payment-init');
      
      // Handle different payment gateway responses
      if (paymentResponse.url) {
        // Redirect to payment URL (Stripe, PayPal, Google Pay, etc.)
        try {
          window.localStorage.setItem(
            'pendingFeatureSubscription',
            JSON.stringify({
              enabledFeatures: selectedSubscriptionFeatures,
              billingCycle: featureBillingCycle,
              companyId,
            }),
          );
        } catch (e) {
          console.warn('Failed to persist pendingFeatureSubscription', e);
        }
        window.location.href = paymentResponse.url;
      } else if (paymentResponse.requiresManualVerification && paymentResponse.instructions) {
        // For mobile wallets (bKash, Nagad) with manual verification
        if (!methodId) {
          console.error('Payment method ID is missing:', method);
          toast.error('Payment method ID is missing. Please try again.');
          return;
        }
        const instructionsWithPaymentInfo = {
          ...paymentResponse.instructions,
          _paymentInfo: {
            companyId,
            paymentMethodId: methodId,
            enabledFeatures: selectedSubscriptionFeatures,
            billingCycle: featureBillingCycle,
          },
        };
        setPaymentInstructions(instructionsWithPaymentInfo);
        setPaymentGateway(paymentResponse.gateway);
        setIsPaymentMethodModalOpen(false);
        setIsFeatureSubscriptionPayment(false);
        setIsPaymentInstructionsModalOpen(true);
        toast.success('Please follow the payment instructions below', {
          duration: 5000,
        });
      } else if (paymentResponse.clientSecret) {
        toast.error('This payment method requires additional setup. Please contact support.');
      } else {
        console.error('🔴 Payment initialization failed - no URL, clientSecret, or requiresManualVerification');
        console.error('🔴 Full response:', paymentResponse);
        toast.error('Payment initialization failed - no payment URL received. Please check console for details.');
      }
      if (paymentResponse.url) {
        setIsPaymentMethodModalOpen(false);
        setIsFeatureSubscriptionPayment(false);
      }
    } catch (error: any) {
      console.error('🔴 Feature subscription payment initialization error:', error);
      toast.dismiss('feature-payment-init');
      toast.error(error?.data?.message || error?.message || 'Failed to initialize payment');
    }
  };
  const handleCancel = async () => {
    // Prefer the actual subscription record (from current or by-company)
    const sub: any = actualSubscription;
    if (!sub) {
      toast.error('Subscription record not found. Cannot cancel subscription.');
      return;
    }
    const subId = sub.id || sub._id;
    if (!subId) {
      console.error('❌ [CancelSubscription] Missing subscription id on object:', sub);
      toast.error('Internal error: subscription ID is missing.');
      return;
    }
    try {
      await cancelSubscription({
        id: subId,
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
  const { data: subsData, isFetching: isSubsLoading, refetch: refetchAllSubscriptions } = useGetAllSubscriptionsQuery(
    { limit: 100 },
    { skip: !isSuperAdmin },
  );
  const [isPlanModalOpen, setIsPlanModalOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<any | null>(null);
  const [editingSubscription, setEditingSubscription] = useState<any | null>(null);
  const [selectedFeatures, setSelectedFeatures] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<'basic' | 'features' | 'limits'>('basic');
  const [billingCycleValue, setBillingCycleValue] = useState<'monthly' | 'quarterly' | 'yearly'>('monthly');
  const [isOverrideModalOpen, setIsOverrideModalOpen] = useState(false);
  const [overrideFeatures, setOverrideFeatures] = useState<string[]>([]);
  const [overrideLimits, setOverrideLimits] = useState<any>({});
  const [createPlan, { isLoading: isCreatingPlan }] = useCreateSubscriptionPlanMutation();
  const [updatePlan, { isLoading: isUpdatingPlan }] = useUpdateSubscriptionPlanMutation();
  const [updateSubscriptionOverride, { isLoading: isUpdatingSubscription }] = useUpdateSubscriptionMutation();
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
      // Set billing cycle from editing plan
      setBillingCycleValue((editingPlan.billingCycle as 'monthly' | 'quarterly' | 'yearly') || 'monthly');
    } else if (!editingPlan) {
      // Reset when creating new plan
      setSelectedFeatures([]);
      setActiveTab('basic');
      setBillingCycleValue('monthly');
    }
  }, [editingPlan, isPlanModalOpen, planWithFeatures]);

  // Handle subscription override
  useEffect(() => {
    if (editingSubscription && isOverrideModalOpen) {
      setOverrideFeatures(editingSubscription.enabledFeatures || []);
      setOverrideLimits(editingSubscription.limits || {});
    } else if (!editingSubscription) {
      setOverrideFeatures([]);
      setOverrideLimits({});
    }
  }, [editingSubscription, isOverrideModalOpen]);

  const handleSaveOverride = async () => {
    if (!editingSubscription) return;

    try {
      await updateSubscriptionOverride({
        id: editingSubscription.id,
        enabledFeatures: overrideFeatures,
        limits: overrideLimits,
      }).unwrap();

      toast.success('Subscription override applied successfully');
      setIsOverrideModalOpen(false);
      setEditingSubscription(null);
      refetchAllSubscriptions();
    } catch (error: any) {
      toast.error(error?.data?.message || 'Failed to apply override');
    }
  };
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
      {
        key: 'actions',
        title: 'Actions',
        render: (_: any, row: any) => (
          <Button
            size="sm"
            variant="secondary"
            onClick={() => {
              // Open override modal for this subscription
              setEditingSubscription(row);
              setIsOverrideModalOpen(true);
            }}
          >
            Override
          </Button>
        ),
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
                  // Some responses use `_id` (MongoDB) instead of normalized `id`
                  const planId = row.id || row._id;
                  if (!planId) {
                    console.error('❌ [Delete Plan] Missing plan id on row:', row);
                    toast.error('Cannot delete plan: missing plan ID');
                    return;
                  }
                  await deletePlan(planId).unwrap();
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
      console.log('🔵 [1] Form submitted');
      console.log('🔵 [1] editingPlan:', JSON.stringify(editingPlan, null, 2));
      console.log('🔵 [1] activeTab:', activeTab);
      
      const formData = new FormData(event.currentTarget);
      
      // Log all form data
      console.log('🔵 [2] FormData contents:');
      for (const [key, value] of formData.entries()) {
        console.log(`  - ${key}:`, value);
      }
      
      // CRITICAL: Check for both id and _id (MongoDB uses _id, but API might normalize to id)
      const planId = editingPlan?.id || editingPlan?._id;
      const isUpdate = !!planId;
      console.log('🔵 [3] isUpdate:', isUpdate);
      console.log('🔵 [3] editingPlan?.id:', editingPlan?.id);
      console.log('🔵 [3] editingPlan?._id:', editingPlan?._id);
      console.log('🔵 [3] planId (resolved):', planId);
      
      // Base payload - different for create vs update
      // Note: Currency is handled globally in Settings, not per plan
      const payload: any = {};
      // Always include displayName and description (text fields) - but only if they have values
      // For updates, use existing values if form fields are empty
      const displayName = (formData.get('displayName') as string)?.trim();
      const description = (formData.get('description') as string)?.trim();
      
      console.log('🔵 [4] Extracted form values:');
      console.log('  - displayName from form:', displayName);
      console.log('  - description from form:', description);
      
      if (isUpdate) {
        // For updates: ALWAYS include basic fields from existing plan
        // This is critical because when user is on Features or Limits tab,
        // the form doesn't have these fields, but backend requires them
        // Use form values if provided, otherwise use existing plan values
        
        // displayName: use form value if provided, otherwise use existing plan value
        payload.displayName = (displayName && displayName.length > 0) 
          ? displayName 
          : (editingPlan?.displayName || editingPlan?.name || 'Plan');
        console.log('🟢 [5] displayName resolved:', payload.displayName);
        console.log('  - form value:', displayName);
        console.log('  - editingPlan.displayName:', editingPlan?.displayName);
        console.log('  - editingPlan.name:', editingPlan?.name);
        
        // description: use form value if provided, otherwise use existing plan value
        payload.description = (description && description.length > 0) 
          ? description 
          : (editingPlan?.description || '');
        console.log('🟢 [5] description resolved:', payload.description);
        console.log('  - form value:', description);
        console.log('  - editingPlan.description:', editingPlan?.description);
        
        // price: use form value if provided, otherwise use existing plan value
        const priceValue = formData.get('price') as string;
        if (priceValue && priceValue.trim() !== '') {
          const price = Number(priceValue);
          if (!isNaN(price) && price >= 0) {
            payload.price = price;
          } else {
            payload.price = editingPlan?.price ?? 0;
          }
        } else {
          payload.price = editingPlan?.price ?? 0;
        }
        
        // billingCycle: use form value if provided, otherwise use existing plan value
        const billingCycle = (formData.get('billingCycle') as string)?.trim();
        payload.billingCycle = billingCycle || editingPlan?.billingCycle || 'monthly';
        
        // trialPeriod: use form value if provided, otherwise use existing plan value
        const trialPeriodValue = formData.get('trialPeriod') as string;
        if (trialPeriodValue && trialPeriodValue.trim() !== '') {
          const trialPeriod = Number(trialPeriodValue);
          if (!isNaN(trialPeriod) && trialPeriod >= 0) {
            payload.trialPeriod = trialPeriod;
          } else {
            payload.trialPeriod = editingPlan?.trialPeriod ?? 0;
          }
        } else {
          payload.trialPeriod = editingPlan?.trialPeriod ?? 0;
        }
        
        // isActive: use form value if checkbox exists, otherwise use existing plan value
        const isActiveCheckbox = formData.get('isActive');
        if (isActiveCheckbox !== null) {
          payload.isActive = isActiveCheckbox === 'on';
        } else {
          payload.isActive = editingPlan?.isActive ?? true;
        }
      } else {
        // For creation: Include all required fields with defaults
        // CRITICAL: MongoDB requires non-empty strings for name, displayName, description
        const nameValue = (formData.get('name') as string)?.trim();
        const displayNameValue = displayName || (formData.get('displayName') as string)?.trim();
        const descriptionValue = description || (formData.get('description') as string)?.trim();
        
        // Validate required fields
        if (!nameValue || nameValue.length === 0) {
          toast.error('Internal Name is required');
          return;
        }
        
        payload.name = nameValue;
        payload.displayName = displayNameValue || nameValue; // Use name as fallback
        payload.description = descriptionValue || 'No description provided'; // Default description
        payload.price = Number(formData.get('price') || 0);
        payload.billingCycle = (formData.get('billingCycle') as string) || 'monthly';
        payload.trialPeriod = Number(formData.get('trialPeriod') || 0);
        payload.isActive = formData.get('isActive') === 'on';
        
        // Backend requires features object (legacy format)
        payload.features = {
          pos: false,
          inventory: false,
          crm: false,
          accounting: false,
          aiInsights: false,
          multiBranch: false,
          maxUsers: 0,
          maxBranches: 0,
        };
        
        // Backend requires stripePriceId (must be non-empty string)
        payload.stripePriceId = (formData.get('stripePriceId') as string)?.trim() || 'pending_stripe_setup';
      }
      // Include enabledFeatureKeys if features are selected
      if (selectedFeatures.length > 0) {
        payload.enabledFeatureKeys = selectedFeatures;
      }
      // Collect limits data from form
      const limits: any = {};
      const limitFields = [
        'maxBranches',
        'maxUsers',
        'maxTables',
        'maxMenuItems',
        'maxOrders',
        'maxCustomers',
        'storageGB',
        'maxPublicBranches',
        'maxReviewsPerMonth',
      ];
      const limitBooleanFields = [
        'publicOrderingEnabled',
        'reviewsEnabled',
        'reviewModerationRequired',
        'whitelabelEnabled',
        'customDomainEnabled',
        'prioritySupportEnabled',
      ];
      // Process numeric limit fields
      for (const field of limitFields) {
        const value = formData.get(`limits.${field}`) as string;
        if (value !== null && value !== undefined && value.trim() !== '') {
          const numValue = Number(value);
          if (!isNaN(numValue)) {
            limits[field] = numValue;
          }
        }
      }
      // Process boolean limit fields
      for (const field of limitBooleanFields) {
        const checkbox = formData.get(`limits.${field}`);
        if (checkbox !== null) {
          limits[field] = checkbox === 'on';
        }
      }
      // Only include limits if at least one field was set
      if (Object.keys(limits).length > 0) {
        payload.limits = limits;
      }
      
      console.log('🟡 [6] Final payload before API call:');
      console.log(JSON.stringify(payload, null, 2));
      console.log('🟡 [6] Payload keys:', Object.keys(payload));
      
      try {
        if (isUpdate) {
          // CRITICAL: UpdateSubscriptionPlanDto does NOT allow 'name' to be updated
          // Only include fields that are allowed in UpdateSubscriptionPlanDto
          const updatePlanId = editingPlan?.id || editingPlan?._id;
          const finalPayload = {
            // displayName (allowed in UpdateSubscriptionPlanDto)
            displayName: String(payload.displayName || editingPlan?.displayName || editingPlan?.name || 'Plan'),
            // description (allowed in UpdateSubscriptionPlanDto)
            description: String(payload.description || editingPlan?.description || 'No description'),
            // stripePriceId (allowed in UpdateSubscriptionPlanDto)
            stripePriceId: String(payload.stripePriceId || editingPlan?.stripePriceId || 'pending_stripe_setup'),
            // Optional fields - only include if they have values
            ...(payload.price !== undefined && { price: payload.price }),
            ...(payload.billingCycle && { billingCycle: payload.billingCycle }),
            ...(payload.trialPeriod !== undefined && { trialPeriod: payload.trialPeriod }),
            ...(payload.isActive !== undefined && { isActive: payload.isActive }),
            ...(payload.enabledFeatureKeys && payload.enabledFeatureKeys.length > 0 && { enabledFeatureKeys: payload.enabledFeatureKeys }),
            ...(payload.limits && Object.keys(payload.limits).length > 0 && { limits: payload.limits }),
          };
          
          console.log('🟠 [7] Calling updatePlan with:');
          console.log('  - id:', updatePlanId);
          console.log('  - data:', JSON.stringify(finalPayload, null, 2));
          
          await updatePlan({ id: updatePlanId, data: finalPayload }).unwrap();
          toast.success('Plan updated successfully');
          // Manually refetch plans to ensure UI updates
          await refetchPlans();
        } else {
          console.log('🟠 [7] Calling createPlan with:');
          console.log('  - data:', JSON.stringify(payload, null, 2));
          
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
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <BuildingOffice2Icon className="w-6 h-6 sm:w-8 sm:h-8 text-purple-600 flex-shrink-0" />
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
                System Subscriptions
              </h1>
              <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mt-1">
                View and manage subscriptions for all companies
              </p>
            </div>
          </div>
        </div>
        {/* System-wide subscriptions */}
        <Card>
          <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
            <CardTitle className="text-lg sm:text-xl">All Company Subscriptions</CardTitle>
            <Button
              variant="primary"
              onClick={() => {
                setIsFeatureSubscriptionModalOpen(true);
                }}
              className="w-full sm:w-auto text-sm"
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
        {/* Payment Requests Management */}
        <PaymentRequestsSection isSuperAdmin={isSuperAdmin} />
        {/* Plan Management */}
        <Card>
          <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
            <div>
              <CardTitle className="text-lg sm:text-xl">Subscription Plans</CardTitle>
              <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                Manage available plans for all companies
              </p>
            </div>
            <Button
              variant="primary"
              className="w-full sm:w-auto text-sm"
              onClick={() => {
                setEditingPlan(null);
                setIsPlanModalOpen(true);
              }}
            >
              Create Plan
            </Button>
          </CardHeader>
          <CardContent>
            {!!plansError && (
              <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                <p className="text-sm text-red-600 dark:text-red-400">
                  Error loading plans: {(plansError as any)?.data?.message || (plansError as any)?.message || 'Unknown error'}
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
              <button
                type="button"
                onClick={() => setActiveTab('limits')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'limits'
                    ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                }`}
              >
                Limits
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
                    <Select
                      label="Billing Cycle"
                      value={billingCycleValue}
                      onChange={(value) => {
                        setBillingCycleValue(value as 'monthly' | 'quarterly' | 'yearly');
                        // Update hidden input for form submission
                        const form = document.querySelector('form') as HTMLFormElement;
                        if (form) {
                          let input = form.querySelector('input[name="billingCycle"]') as HTMLInputElement;
                          if (!input) {
                            // Create hidden input if it doesn't exist
                            input = document.createElement('input');
                            input.type = 'hidden';
                            input.name = 'billingCycle';
                            form.appendChild(input);
                          }
                          input.value = value;
                        }
                      }}
                      options={[
                        { value: 'monthly', label: 'Monthly' },
                        { value: 'quarterly', label: 'Quarterly' },
                        { value: 'yearly', label: 'Yearly' },
                      ]}
                    />
                    {/* Hidden input for form submission */}
                    <input type="hidden" name="billingCycle" value={billingCycleValue} />
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
            {activeTab === 'limits' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                    Resource Limits
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Max Branches
                        <span className="text-xs text-gray-500 dark:text-gray-400 ml-2">
                          (-1 for unlimited)
                        </span>
                      </label>
                      <Input
                        name="limits.maxBranches"
                        type="number"
                        min={-1}
                        defaultValue={editingPlan?.limits?.maxBranches ?? ''}
                        placeholder="-1"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Max Users
                        <span className="text-xs text-gray-500 dark:text-gray-400 ml-2">
                          (-1 for unlimited)
                        </span>
                      </label>
                      <Input
                        name="limits.maxUsers"
                        type="number"
                        min={-1}
                        defaultValue={editingPlan?.limits?.maxUsers ?? ''}
                        placeholder="-1"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Max Tables
                        <span className="text-xs text-gray-500 dark:text-gray-400 ml-2">
                          (-1 for unlimited)
                        </span>
                      </label>
                      <Input
                        name="limits.maxTables"
                        type="number"
                        min={-1}
                        defaultValue={editingPlan?.limits?.maxTables ?? ''}
                        placeholder="-1"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Max Menu Items
                        <span className="text-xs text-gray-500 dark:text-gray-400 ml-2">
                          (-1 for unlimited)
                        </span>
                      </label>
                      <Input
                        name="limits.maxMenuItems"
                        type="number"
                        min={-1}
                        defaultValue={editingPlan?.limits?.maxMenuItems ?? ''}
                        placeholder="-1"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Max Orders
                        <span className="text-xs text-gray-500 dark:text-gray-400 ml-2">
                          (-1 for unlimited)
                        </span>
                      </label>
                      <Input
                        name="limits.maxOrders"
                        type="number"
                        min={-1}
                        defaultValue={editingPlan?.limits?.maxOrders ?? ''}
                        placeholder="-1"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Max Customers
                        <span className="text-xs text-gray-500 dark:text-gray-400 ml-2">
                          (-1 for unlimited)
                        </span>
                      </label>
                      <Input
                        name="limits.maxCustomers"
                        type="number"
                        min={-1}
                        defaultValue={editingPlan?.limits?.maxCustomers ?? ''}
                        placeholder="-1"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Storage (GB)
                        <span className="text-xs text-gray-500 dark:text-gray-400 ml-2">
                          (0 for unlimited)
                        </span>
                      </label>
                      <Input
                        name="limits.storageGB"
                        type="number"
                        min={0}
                        step="0.01"
                        defaultValue={editingPlan?.limits?.storageGB ?? ''}
                        placeholder="0"
                      />
                    </div>
                  </div>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                    Public Ordering Limits
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex items-center gap-2">
                      <input
                        id="limits.publicOrderingEnabled"
                        name="limits.publicOrderingEnabled"
                        type="checkbox"
                        defaultChecked={editingPlan?.limits?.publicOrderingEnabled ?? false}
                        className="h-4 w-4 text-primary-600 border-gray-300 rounded"
                      />
                      <label
                        htmlFor="limits.publicOrderingEnabled"
                        className="text-sm text-gray-700 dark:text-gray-300"
                      >
                        Enable Public Ordering
                      </label>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Max Public Branches
                        <span className="text-xs text-gray-500 dark:text-gray-400 ml-2">
                          (-1 for unlimited)
                        </span>
                      </label>
                      <Input
                        name="limits.maxPublicBranches"
                        type="number"
                        min={-1}
                        defaultValue={editingPlan?.limits?.maxPublicBranches ?? ''}
                        placeholder="-1"
                      />
                    </div>
                  </div>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                    Review System Limits
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex items-center gap-2">
                      <input
                        id="limits.reviewsEnabled"
                        name="limits.reviewsEnabled"
                        type="checkbox"
                        defaultChecked={editingPlan?.limits?.reviewsEnabled ?? false}
                        className="h-4 w-4 text-primary-600 border-gray-300 rounded"
                      />
                      <label
                        htmlFor="limits.reviewsEnabled"
                        className="text-sm text-gray-700 dark:text-gray-300"
                      >
                        Enable Reviews
                      </label>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        id="limits.reviewModerationRequired"
                        name="limits.reviewModerationRequired"
                        type="checkbox"
                        defaultChecked={editingPlan?.limits?.reviewModerationRequired ?? false}
                        className="h-4 w-4 text-primary-600 border-gray-300 rounded"
                      />
                      <label
                        htmlFor="limits.reviewModerationRequired"
                        className="text-sm text-gray-700 dark:text-gray-300"
                      >
                        Require Review Moderation
                      </label>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Max Reviews Per Month
                        <span className="text-xs text-gray-500 dark:text-gray-400 ml-2">
                          (-1 for unlimited)
                        </span>
                      </label>
                      <Input
                        name="limits.maxReviewsPerMonth"
                        type="number"
                        min={-1}
                        defaultValue={editingPlan?.limits?.maxReviewsPerMonth ?? ''}
                        placeholder="-1"
                      />
                    </div>
                  </div>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                    Additional Features
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex items-center gap-2">
                      <input
                        id="limits.whitelabelEnabled"
                        name="limits.whitelabelEnabled"
                        type="checkbox"
                        defaultChecked={editingPlan?.limits?.whitelabelEnabled ?? false}
                        className="h-4 w-4 text-primary-600 border-gray-300 rounded"
                      />
                      <label
                        htmlFor="limits.whitelabelEnabled"
                        className="text-sm text-gray-700 dark:text-gray-300"
                      >
                        Whitelabel Enabled
                      </label>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        id="limits.customDomainEnabled"
                        name="limits.customDomainEnabled"
                        type="checkbox"
                        defaultChecked={editingPlan?.limits?.customDomainEnabled ?? false}
                        className="h-4 w-4 text-primary-600 border-gray-300 rounded"
                      />
                      <label
                        htmlFor="limits.customDomainEnabled"
                        className="text-sm text-gray-700 dark:text-gray-300"
                      >
                        Custom Domain Enabled
                      </label>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        id="limits.prioritySupportEnabled"
                        name="limits.prioritySupportEnabled"
                        type="checkbox"
                        defaultChecked={editingPlan?.limits?.prioritySupportEnabled ?? false}
                        className="h-4 w-4 text-primary-600 border-gray-300 rounded"
                      />
                      <label
                        htmlFor="limits.prioritySupportEnabled"
                        className="text-sm text-gray-700 dark:text-gray-300"
                      >
                        Priority Support Enabled
                      </label>
                    </div>
                  </div>
                </div>
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
              {(activeTab === 'features' || activeTab === 'limits') && (
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
        {/* Subscription Override Modal - Super Admin */}
        <Modal
          isOpen={isOverrideModalOpen}
          onClose={() => {
            setIsOverrideModalOpen(false);
            setEditingSubscription(null);
          }}
          title={`Override Subscription: ${editingSubscription?.companyName || 'Unknown Company'}`}
          size="xl"
        >
          <div className="space-y-6">
            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
              <div className="flex items-start gap-2">
                <ExclamationTriangleIcon className="w-5 h-5 text-yellow-600 dark:text-yellow-400 mt-0.5" />
                <div>
                  <h4 className="text-sm font-semibold text-yellow-800 dark:text-yellow-200">
                    Manual Override
                  </h4>
                  <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
                    This will override the subscription features and limits for this specific user, bypassing their plan restrictions. Use with caution.
                  </p>
                </div>
              </div>
            </div>

            {/* Current Plan Info */}
            <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4">
              <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">Current Plan</h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-600 dark:text-gray-400">Plan:</span>
                  <span className="ml-2 font-medium">{editingSubscription?.planKey || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-gray-600 dark:text-gray-400">Status:</span>
                  <Badge variant={getStatusBadge(editingSubscription?.status)} className="ml-2">
                    {editingSubscription?.status || 'N/A'}
                  </Badge>
                </div>
              </div>
            </div>

            {/* Features Override */}
            <div>
              <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">
                Override Features
              </h4>
              <PlanFeatureSelector
                selectedFeatures={overrideFeatures}
                onChange={setOverrideFeatures}
              />
            </div>

            {/* Limits Override */}
            <div>
              <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">
                Override Limits
              </h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Max Branches (-1 for unlimited)
                  </label>
                  <Input
                    type="number"
                    min={-1}
                    value={overrideLimits.maxBranches ?? ''}
                    onChange={(e) => setOverrideLimits({
                      ...overrideLimits,
                      maxBranches: e.target.value ? Number(e.target.value) : undefined
                    })}
                    placeholder="-1"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Max Users (-1 for unlimited)
                  </label>
                  <Input
                    type="number"
                    min={-1}
                    value={overrideLimits.maxUsers ?? ''}
                    onChange={(e) => setOverrideLimits({
                      ...overrideLimits,
                      maxUsers: e.target.value ? Number(e.target.value) : undefined
                    })}
                    placeholder="-1"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
              <Button
                variant="secondary"
                onClick={() => {
                  setIsOverrideModalOpen(false);
                  setEditingSubscription(null);
                }}
                disabled={isUpdatingSubscription}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSaveOverride}
                isLoading={isUpdatingSubscription}
                variant="primary"
              >
                Apply Override
              </Button>
            </div>
          </div>
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
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">Subscription & Billing</h1>
          <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mt-1">
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
                    /{featureBillingCycle === 'monthly' ? 'month' : featureBillingCycle === 'quarterly' ? 'quarter' : 'year'}
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
        {!!plansError && (
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
              } ${effectiveSubscription?.planKey === plan.name ? 'ring-2 ring-green-500' : ''}`}
            >
              {plan.isPopular && (
                <div className="bg-primary-500 text-white text-center py-2 rounded-t-lg">
                  <span className="text-sm font-semibold">Most Popular</span>
                </div>
              )}
              {(() => {
                // Use planKey (from companyData.subscriptionPlan) as the single source of truth
                const currentPlanKey = effectiveSubscription?.planKey;
                // Only match if planKey exactly matches plan.name (case-sensitive exact match)
                return currentPlanKey && currentPlanKey === plan.name;
              })() && (
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
                {/* Show Upgrade/Downgrade/Switch button for all NON-current plans.
                    Use effectiveSubscription.planKey vs plan.name as the single source of truth,
                    because backend doesn't always expose a normalized `id` field here. */}
                {(!effectiveSubscription || effectiveSubscription.planKey !== plan.name) && (
                  <Button
                    onClick={() => {
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
                {effectiveSubscription?.planKey === plan.name && (
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
                          effectiveSubscription?.planKey === plan.name
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
                  {/* Helper function to check if feature is enabled */}
                  {(() => {
                    const checkFeature = (plan: any, featureKey: string, legacyKey?: string) => {
                      // Check enabledFeatureKeys first (new system)
                      if (plan.enabledFeatureKeys && Array.isArray(plan.enabledFeatureKeys)) {
                        return plan.enabledFeatureKeys.includes(featureKey);
                      }
                      // Fallback to legacy features object
                      if (legacyKey && plan.features?.[legacyKey] !== undefined) {
                        return plan.features[legacyKey];
                      }
                      return false;
                    };

                    const featureRows = [
                      { label: 'POS & Ordering', key: 'order-management', legacy: 'pos' },
                      { label: 'Inventory Management', key: 'inventory', legacy: 'inventory' },
                      { label: 'Customer CRM', key: 'customer-management', legacy: 'crm' },
                      { label: 'Accounting & Reports', key: 'reports', legacy: 'accounting' },
                      { label: 'AI Insights', key: 'ai-insights', legacy: 'aiInsights' },
                      { label: 'Multi-Branch Support', key: 'multi-branch', legacy: 'multiBranch' },
                      { label: 'Dashboard', key: 'dashboard', legacy: undefined },
                      { label: 'Menu Management', key: 'menu-management', legacy: undefined },
                      { label: 'Staff Management', key: 'staff-management', legacy: undefined },
                      { label: 'Role Management', key: 'role-management', legacy: undefined },
                      { label: 'Attendance', key: 'attendance', legacy: undefined },
                      { label: 'QR Menus', key: 'qr-menus', legacy: undefined },
                    ];

                    return featureRows.map((feature) => (
                      <tr key={feature.key} className="border-b border-gray-100 dark:border-gray-800">
                        <td className="py-3 px-4 text-sm text-gray-700 dark:text-gray-300">{feature.label}</td>
                        {plans.map((plan: any) => (
                          <td key={plan.id} className="text-center py-3 px-4">
                            {checkFeature(plan, feature.key, feature.legacy) ? (
                              <CheckCircleIcon className="w-5 h-5 text-green-500 mx-auto" />
                            ) : (
                              <XCircleIcon className="w-5 h-5 text-gray-300 dark:text-gray-600 mx-auto" />
                            )}
                          </td>
                        ))}
                      </tr>
                    ));
                  })()}
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
                  <tr className="border-b border-gray-100 dark:border-gray-800">
                    <td className="py-3 px-4 text-sm text-gray-700 dark:text-gray-300">Storage</td>
                    {plans.map((plan: any) => {
                      const storageGB = plan.limits?.storageGB;
                      return (
                        <td key={plan.id} className="text-center py-3 px-4 text-sm font-medium">
                          {storageGB === -1 || storageGB === 0 || storageGB === undefined ? 'Unlimited' : `${storageGB} GB`}
                        </td>
                      );
                    })}
                  </tr>
                  {plans.some((p: any) => p.limits?.maxTables !== undefined) && (
                    <tr className="border-b border-gray-100 dark:border-gray-800">
                      <td className="py-3 px-4 text-sm text-gray-700 dark:text-gray-300">Max Tables</td>
                      {plans.map((plan: any) => {
                        const maxTables = plan.limits?.maxTables;
                        return (
                          <td key={plan.id} className="text-center py-3 px-4 text-sm font-medium">
                            {maxTables === -1 || maxTables === undefined ? 'Unlimited' : maxTables}
                          </td>
                        );
                      })}
                    </tr>
                  )}
                  {plans.some((p: any) => p.limits?.maxMenuItems !== undefined) && (
                    <tr className="border-b border-gray-100 dark:border-gray-800">
                      <td className="py-3 px-4 text-sm text-gray-700 dark:text-gray-300">Max Menu Items</td>
                      {plans.map((plan: any) => {
                        const maxMenuItems = plan.limits?.maxMenuItems;
                        return (
                          <td key={plan.id} className="text-center py-3 px-4 text-sm font-medium">
                            {maxMenuItems === -1 || maxMenuItems === undefined ? 'Unlimited' : maxMenuItems}
                          </td>
                        );
                      })}
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
      {/* Payment Method Selector Modal */}
      {isPaymentMethodModalOpen && (selectedPlan || isFeatureSubscriptionPayment) && (() => {
        // Determine if this is for feature-based or plan-based subscription
        if (isFeatureSubscriptionPayment) {
          // Feature-based subscription
          return (
            <PaymentMethodSelector
              isOpen={isPaymentMethodModalOpen}
              onClose={() => {
                setIsPaymentMethodModalOpen(false);
                setIsFeatureSubscriptionPayment(false);
              }}
              onSelect={handleFeatureSubscriptionPayment}
              amount={featureSubscriptionPrice}
              currency="BDT"
              country="BD"
            />
          );
        } else {
          // Plan-based subscription
          const planPrice = selectedPlan?.price || 0;
          const planCurrency = selectedPlan?.currency || 'BDT';
          return (
            <PaymentMethodSelector
              isOpen={isPaymentMethodModalOpen}
              onClose={() => {
                setIsPaymentMethodModalOpen(false);
              }}
              onSelect={handlePaymentMethodSelected}
              amount={planPrice}
              currency={planCurrency}
              country="BD"
            />
          );
        }
      })()}
      {/* Payment Instructions Modal */}
      {paymentInstructions && (
        <PaymentInstructionsModal
          isOpen={isPaymentInstructionsModalOpen}
          onClose={() => {
            setIsPaymentInstructionsModalOpen(false);
            setPaymentInstructions(null);
            setPaymentGateway('');
            setSelectedPaymentMethod(null);
          }}
          instructions={paymentInstructions}
          gateway={paymentGateway}
          companyId={companyId}
          paymentMethodId={selectedPaymentMethod?.id}
          planName={selectedPlan?.name}
          enabledFeatures={isFeatureSubscriptionPayment ? selectedSubscriptionFeatures : undefined}
          billingCycle={isFeatureSubscriptionPayment ? featureBillingCycle : (selectedPlan?.billingCycle || 'monthly')}
          onPaymentCompleted={() => {
            setIsPaymentInstructionsModalOpen(false);
            setPaymentInstructions(null);
            setPaymentGateway('');
            setSelectedPaymentMethod(null);
            // Refresh subscription data
            refetchCompany();
            if (currentSubscription) {
              refetchCurrentSubscription();
            }
          }}
        />
      )}
      {/* Upgrade Modal */}
      <Modal
        isOpen={isUpgradeModalOpen}
        onClose={() => {
          setIsUpgradeModalOpen(false);
          setSelectedPlan(null);
        }}
        title={isSuperAdmin ? "Activate Subscription" : (effectiveSubscription ? "Confirm Plan Change" : "Create Subscription")}
        size="lg"
      >
        {(() => {
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
          // For new companies without subscription, show create subscription UI
          if (!effectiveSubscription) {
            return (
              <div className="space-y-6">
                <div>
                  <p className="text-gray-600 dark:text-gray-400 mb-2">
                    You're about to create a new subscription with the <strong>{selectedPlan.displayName || selectedPlan.name}</strong> plan.
                  </p>
                </div>
                {/* Selected Plan Details */}
                <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                  <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Selected Plan</h4>
                  <p className="text-lg font-bold text-gray-900 dark:text-white">
                    {selectedPlan.displayName || selectedPlan.name}
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    {selectedPlan.price === 0 ? 'Free' : `${selectedPlan.currency} ${selectedPlan.price.toLocaleString()}/${selectedPlan.billingCycle || 'month'}`}
                  </p>
                  {selectedPlan.trialPeriod && selectedPlan.trialPeriod > 0 && (
                    <p className="text-sm text-primary-600 dark:text-primary-400 mt-2">
                      ✓ {selectedPlan.trialPeriod === 168 ? '7 Days' : `${Math.round(selectedPlan.trialPeriod / 24)} Days`} Free Trial
                    </p>
                  )}
                </div>
                <div className="flex gap-3 pt-4 border-t">
                  <Button variant="secondary" onClick={() => setIsUpgradeModalOpen(false)} className="flex-1">
                    Cancel
                  </Button>
                  <Button onClick={handleUpgrade} className="flex-1">
                    Continue to Payment
                  </Button>
                </div>
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
            {/* Super Admin: Manual Activation */}
            {isSuperAdmin && (
              <div className="space-y-4">
                <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                  <p className="text-sm text-blue-800 dark:text-blue-200">
                    <strong>Super Admin Mode:</strong> You can manually activate this subscription without payment.
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Select Company
                  </label>
                  <select
                    value={selectedCompanyForSubscription || companyId}
                    onChange={(e) => setSelectedCompanyForSubscription(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  >
                    <option value="">Select a company...</option>
                    {companies?.map((company: any) => (
                      <option key={company.id} value={company.id}>
                        {company.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}
            <div className="flex gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
              <Button
                variant="secondary"
                onClick={() => {
                  setIsUpgradeModalOpen(false);
                  setSelectedPlan(null);
                  setSelectedCompanyForSubscription('');
                }}
                className="flex-1"
                disabled={isUpdating || isActivating}
              >
                Cancel
              </Button>
              {isSuperAdmin ? (
                <Button
                  onClick={handleManualActivation}
                  isLoading={isActivating}
                  className="flex-1"
                  variant="primary"
                  disabled={!selectedPlan || !selectedCompanyForSubscription}
                >
                  {isActivating ? 'Activating...' : 'Activate Subscription'}
                </Button>
              ) : (
                <Button
                  onClick={handleUpgrade}
                  isLoading={isUpdating || isInitializingPayment}
                  className="flex-1"
                  variant="primary"
                  disabled={!selectedPlan || !effectiveSubscription}
                >
                  {isUpdating || isInitializingPayment ? 'Processing...' : `Continue to Payment`}
                </Button>
              )}
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
            {!actualSubscription && subscriptionFromCompany && (
              <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                <p className="text-sm text-red-800 dark:text-red-200">
                  <strong>Note:</strong> You don't have an active subscription record. Please contact support to manage your subscription.
                </p>
              </div>
            )}
            {actualSubscription && (
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
              {actualSubscription ? (
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
          // Don't reset price here - let it persist until features are cleared
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
          // Regular users: Confirmation modal with proceed to payment
          <div className="space-y-6">
            <div>
              <p className="text-gray-600 dark:text-gray-400 mb-2">
                Review your custom subscription and proceed to payment
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
                  {formatCurrency(featureSubscriptionPrice)}/{featureBillingCycle === 'monthly' ? 'month' : featureBillingCycle === 'quarterly' ? 'quarter' : 'year'}
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
            <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
              <p className="text-sm text-blue-800 dark:text-blue-200">
                <CreditCardIcon className="w-4 h-4 inline mr-2" />
                You will be redirected to select a payment method after confirming.
              </p>
            </div>
            <div className="flex gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
              <Button
                variant="secondary"
                onClick={() => {
                  setIsFeatureSubscriptionModalOpen(false);
                }}
                className="flex-1"
                disabled={isInitializingPayment}
              >
                Cancel
              </Button>
              <Button
                onClick={handleCreateFeatureSubscription}
                isLoading={isInitializingPayment}
                className="flex-1"
                variant="primary"
                disabled={selectedSubscriptionFeatures.length === 0}
              >
                Proceed to Payment
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}