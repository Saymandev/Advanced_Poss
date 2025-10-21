'use client';

import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Modal } from '@/components/ui/Modal';
import {
  useGetCurrentSubscriptionQuery,
  useGetSubscriptionPlansQuery,
  useGetUsageStatsQuery,
  useUpdateSubscriptionMutation,
} from '@/lib/api/endpoints/subscriptionsApi';
import { useAppSelector } from '@/lib/store';
import { formatCurrency, formatDateTime } from '@/lib/utils';
import {
  ArrowTrendingUpIcon,
  CheckCircleIcon,
  CreditCardIcon
} from '@heroicons/react/24/outline';
import { useState } from 'react';
import toast from 'react-hot-toast';

export default function SubscriptionsPage() {
  const { user } = useAppSelector((state) => state.auth);
  const { data: plansData, isLoading } = useGetSubscriptionPlansQuery({});
  const { data: currentSubscription } = useGetCurrentSubscriptionQuery({
    companyId: user?.companyId || '',
  });
  const { data: usageStats } = useGetUsageStatsQuery({
    companyId: user?.companyId || '',
  });
  const [updateSubscription, { isLoading: isUpdating }] = useUpdateSubscriptionMutation();

  const [selectedPlan, setSelectedPlan] = useState<any>(null);
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);

  const handleUpgrade = async () => {
    if (!selectedPlan) return;

    try {
      await updateSubscription({
        id: currentSubscription?.id || '',
        planId: selectedPlan.id,
      }).unwrap();

      toast.success('Subscription upgraded successfully!');
      setIsUpgradeModalOpen(false);
    } catch (error: any) {
      toast.error(error?.data?.message || 'Failed to upgrade subscription');
    }
  };

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
              <Badge variant={currentSubscription.status === 'active' ? 'success' : 'danger'}>
                {currentSubscription.status}
              </Badge>
            </div>
          </CardHeader>
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
                  {currentSubscription.plan.limits.maxBranches}
                </p>
              </div>
              <div className="text-center p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <p className="text-sm text-gray-600 dark:text-gray-400">Max Users</p>
                <p className="text-lg font-semibold text-gray-900 dark:text-white mt-1">
                  {currentSubscription.plan.limits.maxUsers}
                </p>
              </div>
              <div className="text-center p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <p className="text-sm text-gray-600 dark:text-gray-400">Storage</p>
                <p className="text-lg font-semibold text-gray-900 dark:text-white mt-1">
                  {currentSubscription.plan.limits.storageGB} GB
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
                    <span className={`text-sm font-medium ${getUsageColor(getUsagePercentage(usageStats.branches, currentSubscription.plan.limits.maxBranches))}`}>
                      {usageStats.branches} / {currentSubscription.plan.limits.maxBranches}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div
                      className="bg-primary-600 h-2 rounded-full transition-all"
                      style={{ width: `${getUsagePercentage(usageStats.branches, currentSubscription.plan.limits.maxBranches)}%` }}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Users</span>
                    <span className={`text-sm font-medium ${getUsageColor(getUsagePercentage(usageStats.users, currentSubscription.plan.limits.maxUsers))}`}>
                      {usageStats.users} / {currentSubscription.plan.limits.maxUsers}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div
                      className="bg-primary-600 h-2 rounded-full transition-all"
                      style={{ width: `${getUsagePercentage(usageStats.users, currentSubscription.plan.limits.maxUsers)}%` }}
                    />
                  </div>
                </div>

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
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Available Plans */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Available Plans</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {plansData?.plans?.map((plan: any) => (
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
                    <span className="font-medium">{plan.limits.maxBranches}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400">Max Users:</span>
                    <span className="font-medium">{plan.limits.maxUsers}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400">Storage:</span>
                    <span className="font-medium">{plan.limits.storageGB} GB</span>
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
                  {plansData?.plans?.map((plan: any) => (
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
                  {plansData?.plans?.map((plan: any) => (
                    <td key={plan.id} className="text-center py-3 px-4 text-sm font-medium">
                      {plan.limits.maxBranches}
                    </td>
                  ))}
                </tr>
                <tr className="border-b border-gray-100 dark:border-gray-800">
                  <td className="py-3 px-4 text-sm text-gray-700 dark:text-gray-300">Max Users</td>
                  {plansData?.plans?.map((plan: any) => (
                    <td key={plan.id} className="text-center py-3 px-4 text-sm font-medium">
                      {plan.limits.maxUsers}
                    </td>
                  ))}
                </tr>
                <tr className="border-b border-gray-100 dark:border-gray-800">
                  <td className="py-3 px-4 text-sm text-gray-700 dark:text-gray-300">Storage</td>
                  {plansData?.plans?.map((plan: any) => (
                    <td key={plan.id} className="text-center py-3 px-4 text-sm font-medium">
                      {plan.limits.storageGB} GB
                    </td>
                  ))}
                </tr>
                <tr className="border-b border-gray-100 dark:border-gray-800">
                  <td className="py-3 px-4 text-sm text-gray-700 dark:text-gray-300">Max Tables</td>
                  {plansData?.plans?.map((plan: any) => (
                    <td key={plan.id} className="text-center py-3 px-4 text-sm font-medium">
                      {plan.limits.maxTables}
                    </td>
                  ))}
                </tr>
                <tr className="border-b border-gray-100 dark:border-gray-800">
                  <td className="py-3 px-4 text-sm text-gray-700 dark:text-gray-300">Max Menu Items</td>
                  {plansData?.plans?.map((plan: any) => (
                    <td key={plan.id} className="text-center py-3 px-4 text-sm font-medium">
                      {plan.limits.maxMenuItems}
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
    </div>
  );
}