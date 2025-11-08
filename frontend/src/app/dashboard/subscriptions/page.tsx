'use client';

import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { DataTable } from '@/components/ui/DataTable';
import { Modal } from '@/components/ui/Modal';
import {
  BillingHistory,
  useCancelSubscriptionMutation,
  useGetBillingHistoryQuery,
  useGetCurrentSubscriptionQuery,
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
  CreditCardIcon,
  DocumentArrowDownIcon,
  XCircleIcon,
} from '@heroicons/react/24/outline';
import { useState } from 'react';
import toast from 'react-hot-toast';

export default function SubscriptionsPage() {
  const { user } = useAppSelector((state) => state.auth);
  const { data: plansData, isLoading } = useGetSubscriptionPlansQuery({});
  
  // Normalize plans data to handle both array and object responses
  const plans = Array.isArray(plansData) ? plansData : (plansData as any)?.plans || [];
  const { data: currentSubscription } = useGetCurrentSubscriptionQuery({
    companyId: user?.companyId || '',
  });
  const { data: usageStats } = useGetUsageStatsQuery({
    companyId: user?.companyId || '',
  });
  const { data: billingHistory } = useGetBillingHistoryQuery({
    companyId: user?.companyId || '',
    limit: 10,
  });
  
  const [updateSubscription, { isLoading: isUpdating }] = useUpdateSubscriptionMutation();
  const [cancelSubscription, { isLoading: isCancelling }] = useCancelSubscriptionMutation();
  const [reactivateSubscription, { isLoading: isReactivating }] = useReactivateSubscriptionMutation();

  const [selectedPlan, setSelectedPlan] = useState<any>(null);
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);

  const handleUpgrade = async () => {
    if (!selectedPlan || !currentSubscription) return;

    try {
      await updateSubscription({
        id: currentSubscription.id,
        planId: selectedPlan.id,
      }).unwrap();

      toast.success('Subscription updated successfully!');
      setIsUpgradeModalOpen(false);
      setSelectedPlan(null);
    } catch (error: any) {
      toast.error(error?.data?.message || 'Failed to update subscription');
    }
  };

  const handleCancel = async () => {
    if (!currentSubscription) return;

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
    if (!currentSubscription) return;

    try {
      await reactivateSubscription(currentSubscription.id).unwrap();
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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600"></div>
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
      {currentSubscription && (
        <Card className="border-2 border-primary-500">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Current Plan: {currentSubscription.plan.name}</CardTitle>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  {formatCurrency(currentSubscription.plan.price)}/
                  {currentSubscription.plan.billingCycle}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={currentSubscription.status === 'active' ? 'success' : 'danger'}>
                  {currentSubscription.status}
                </Badge>
                {currentSubscription.cancelAtPeriodEnd && (
                  <Badge variant="warning">Cancelling at period end</Badge>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            {currentSubscription.cancelAtPeriodEnd && (
              <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 mb-4">
                <p className="text-sm text-yellow-800 dark:text-yellow-200">
                  Your subscription is set to cancel on {formatDateTime(currentSubscription.currentPeriodEnd).split(',')[0]}. 
                  You can reactivate it anytime before then.
                </p>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={handleReactivate}
                  isLoading={isReactivating}
                  className="mt-2"
                >
                  Reactivate Subscription
                </Button>
              </div>
            )}
          </CardContent>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <p className="text-sm text-gray-600 dark:text-gray-400">Next Billing</p>
                <p className="text-lg font-semibold text-gray-900 dark:text-white mt-1">
                  {formatDateTime(currentSubscription.currentPeriodEnd).split(',')[0]}
                </p>
              </div>
              <div className="text-center p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <p className="text-sm text-gray-600 dark:text-gray-400">Max Branches</p>
                <p className="text-lg font-semibold text-gray-900 dark:text-white mt-1">
                  {currentSubscription.plan.limits?.maxBranches || currentSubscription.plan.features.maxBranches}
                </p>
              </div>
              <div className="text-center p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <p className="text-sm text-gray-600 dark:text-gray-400">Max Users</p>
                <p className="text-lg font-semibold text-gray-900 dark:text-white mt-1">
                  {currentSubscription.plan.limits?.maxUsers || currentSubscription.plan.features.maxUsers}
                </p>
              </div>
              <div className="text-center p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <p className="text-sm text-gray-600 dark:text-gray-400">Storage</p>
                <p className="text-lg font-semibold text-gray-900 dark:text-white mt-1">
                  {currentSubscription.plan.limits?.storageGB || 'N/A'} GB
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
                    <span className={`text-sm font-medium ${getUsageColor(getUsagePercentage(usageStats.branches, currentSubscription.plan.limits?.maxBranches || currentSubscription.plan.features.maxBranches))}`}>
                      {usageStats.branches} / {currentSubscription.plan.limits?.maxBranches || currentSubscription.plan.features.maxBranches}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div
                      className="bg-primary-600 h-2 rounded-full transition-all"
                      style={{ width: `${getUsagePercentage(usageStats.branches, currentSubscription.plan.limits?.maxBranches || currentSubscription.plan.features.maxBranches)}%` }}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Users</span>
                    <span className={`text-sm font-medium ${getUsageColor(getUsagePercentage(usageStats.users, currentSubscription.plan.limits?.maxUsers || currentSubscription.plan.features.maxUsers))}`}>
                      {usageStats.users} / {currentSubscription.plan.limits?.maxUsers || currentSubscription.plan.features.maxUsers}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div
                      className="bg-primary-600 h-2 rounded-full transition-all"
                      style={{ width: `${getUsagePercentage(usageStats.users, currentSubscription.plan.limits?.maxUsers || currentSubscription.plan.features.maxUsers)}%` }}
                    />
                  </div>
                </div>

                {currentSubscription.plan.limits?.storageGB && (
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600 dark:text-gray-400">Storage</span>
                      <span className={`text-sm font-medium ${getUsageColor(getUsagePercentage(usageStats.storageUsed, currentSubscription.plan.limits.storageGB))}`}>
                        {usageStats.storageUsed.toFixed(2)} GB / {currentSubscription.plan.limits.storageGB} GB
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                      <div
                        className="bg-primary-600 h-2 rounded-full transition-all"
                        style={{ width: `${getUsagePercentage(usageStats.storageUsed, currentSubscription.plan.limits.storageGB)}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
              {currentSubscription.status === 'active' && !currentSubscription.cancelAtPeriodEnd && (
                <Button
                  variant="secondary"
                  onClick={() => setIsCancelModalOpen(true)}
                  className="text-red-600 hover:text-red-700"
                >
                  <XCircleIcon className="w-4 h-4 mr-2" />
                  Cancel Subscription
                </Button>
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
              loading={false}
              searchable={false}
              selectable={false}
              emptyMessage="No billing history found"
            />
          </CardContent>
        </Card>
      )}

      {/* Available Plans */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Available Plans</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {(Array.isArray(plansData) ? plansData : plansData?.plans || [])?.map((plan: any) => (
            <Card
              key={plan.id}
              className={`hover:shadow-lg transition-all ${
                plan.isPopular ? 'border-2 border-primary-500' : ''
              } ${currentSubscription?.plan.id === plan.id ? 'ring-2 ring-green-500' : ''}`}
            >
              {plan.isPopular && (
                <div className="bg-primary-500 text-white text-center py-2 rounded-t-lg">
                  <span className="text-sm font-semibold">Most Popular</span>
                </div>
              )}
              {currentSubscription?.plan.id === plan.id && (
                <div className="bg-green-500 text-white text-center py-2 rounded-t-lg">
                  <span className="text-sm font-semibold flex items-center justify-center gap-2">
                    <CheckCircleIcon className="w-4 h-4" />
                    Current Plan
                  </span>
                </div>
              )}
              
              <CardContent className="p-6 space-y-6">
                <div className="text-center">
                  <h3 className="text-2xl font-bold text-gray-900 dark:text-white">{plan.name}</h3>
                  <div className="mt-4">
                    <span className="text-4xl font-bold text-gray-900 dark:text-white">
                      {formatCurrency(plan.price)}
                    </span>
                    <span className="text-gray-600 dark:text-gray-400">/{plan.billingCycle}</span>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">{plan.description}</p>
                </div>

                <div className="space-y-3">
                  <h4 className="font-semibold text-gray-900 dark:text-white">Features:</h4>
                  {plan.features.map((feature: string, idx: number) => (
                    <div key={idx} className="flex items-start gap-2">
                      <CheckCircleIcon className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                      <span className="text-sm text-gray-600 dark:text-gray-400">{feature}</span>
                    </div>
                  ))}
                </div>

                <div className="space-y-2 pt-4 border-t border-gray-200 dark:border-gray-700">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400">Max Branches:</span>
                    <span className="font-medium">{plan.limits?.maxBranches || plan.features?.maxBranches || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400">Max Users:</span>
                    <span className="font-medium">{plan.limits?.maxUsers || plan.features?.maxUsers || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400">Storage:</span>
                    <span className="font-medium">{plan.limits?.storageGB ? `${plan.limits.storageGB} GB` : 'N/A'}</span>
                  </div>
                </div>

                {currentSubscription?.plan.id !== plan.id && (
                  <Button
                    onClick={() => {
                      setSelectedPlan(plan);
                      setIsUpgradeModalOpen(true);
                    }}
                    className="w-full"
                    variant={plan.isPopular ? 'primary' : 'secondary'}
                  >
                    <ArrowTrendingUpIcon className="w-4 h-4 mr-2" />
                    {plan.price > (currentSubscription?.plan.price || 0) ? 'Upgrade' : 'Switch'} to {plan.name}
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Plan Features Comparison */}
      <Card>
        <CardHeader>
          <CardTitle>Feature Comparison</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700">
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">
                      Feature
                    </th>
                    {plans.map((plan: any) => (
                    <th
                      key={plan.id}
                      className="text-center py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300"
                    >
                      {plan.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-gray-100 dark:border-gray-800">
                  <td className="py-3 px-4 text-sm text-gray-700 dark:text-gray-300">Max Branches</td>
                  {plans.map((plan: any) => (
                    <td key={plan.id} className="text-center py-3 px-4 text-sm font-medium">
                      {plan.limits?.maxBranches || plan.features?.maxBranches || 'N/A'}
                    </td>
                  ))}
                </tr>
                <tr className="border-b border-gray-100 dark:border-gray-800">
                  <td className="py-3 px-4 text-sm text-gray-700 dark:text-gray-300">Max Users</td>
                  {plans.map((plan: any) => (
                    <td key={plan.id} className="text-center py-3 px-4 text-sm font-medium">
                      {plan.limits?.maxUsers || plan.features?.maxUsers || 'N/A'}
                    </td>
                  ))}
                </tr>
                <tr className="border-b border-gray-100 dark:border-gray-800">
                  <td className="py-3 px-4 text-sm text-gray-700 dark:text-gray-300">Storage</td>
                  {plans.map((plan: any) => (
                    <td key={plan.id} className="text-center py-3 px-4 text-sm font-medium">
                      {plan.limits?.storageGB ? `${plan.limits.storageGB} GB` : 'N/A'}
                    </td>
                  ))}
                </tr>
                <tr className="border-b border-gray-100 dark:border-gray-800">
                  <td className="py-3 px-4 text-sm text-gray-700 dark:text-gray-300">Max Tables</td>
                  {plans.map((plan: any) => (
                    <td key={plan.id} className="text-center py-3 px-4 text-sm font-medium">
                      {plan.limits?.maxTables || 'N/A'}
                    </td>
                  ))}
                </tr>
                <tr className="border-b border-gray-100 dark:border-gray-800">
                  <td className="py-3 px-4 text-sm text-gray-700 dark:text-gray-300">Max Menu Items</td>
                  {plans.map((plan: any) => (
                    <td key={plan.id} className="text-center py-3 px-4 text-sm font-medium">
                      {plan.limits?.maxMenuItems || 'N/A'}
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Upgrade Modal */}
      <Modal
        isOpen={isUpgradeModalOpen}
        onClose={() => setIsUpgradeModalOpen(false)}
        title="Confirm Plan Change"
        size="md"
      >
        <div className="space-y-4">
          <p className="text-gray-600 dark:text-gray-400">
            Are you sure you want to {selectedPlan?.price > (currentSubscription?.plan.price || 0) ? 'upgrade' : 'switch'} to the <span className="font-semibold">{selectedPlan?.name}</span> plan?
          </p>
          
          <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <p className="text-sm text-blue-800 dark:text-blue-200">
              <CreditCardIcon className="w-4 h-4 inline mr-2" />
              Your card will be charged {formatCurrency(selectedPlan?.price || 0)} {selectedPlan?.billingCycle === 'monthly' ? 'per month' : 'per year'}.
            </p>
          </div>

          <div className="flex gap-3">
            <Button
              variant="secondary"
              onClick={() => setIsUpgradeModalOpen(false)}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={handleUpgrade}
              isLoading={isUpdating}
              className="flex-1"
            >
              Confirm Change
            </Button>
          </div>
        </div>
      </Modal>

      {/* Cancel Subscription Modal */}
      <Modal
        isOpen={isCancelModalOpen}
        onClose={() => setIsCancelModalOpen(false)}
        title="Cancel Subscription"
        size="md"
      >
        {currentSubscription && (
          <div className="space-y-4">
            <p className="text-gray-600 dark:text-gray-400">
              Are you sure you want to cancel your subscription?
            </p>

            <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
              <p className="text-sm text-yellow-800 dark:text-yellow-200 mb-2">
                <strong>Important:</strong> Your subscription will remain active until{' '}
                {formatDateTime(currentSubscription.currentPeriodEnd).split(',')[0]}.
              </p>
              <p className="text-sm text-yellow-800 dark:text-yellow-200">
                You will continue to have access to all features until then. You can reactivate your subscription at any time before the cancellation date.
              </p>
            </div>

            <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <div className="flex justify-between text-sm mb-2">
                <span className="text-gray-600 dark:text-gray-400">Current Plan:</span>
                <span className="font-medium">{currentSubscription.plan.name}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400">Cancellation Date:</span>
                <span className="font-medium">
                  {formatDateTime(currentSubscription.currentPeriodEnd).split(',')[0]}
                </span>
              </div>
            </div>

            <div className="flex gap-3">
              <Button
                variant="secondary"
                onClick={() => setIsCancelModalOpen(false)}
                className="flex-1"
              >
                Keep Subscription
              </Button>
              <Button
                onClick={handleCancel}
                isLoading={isCancelling}
                className="flex-1 bg-red-600 hover:bg-red-700"
              >
                <XCircleIcon className="w-4 h-4 mr-2" />
                Cancel Subscription
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}