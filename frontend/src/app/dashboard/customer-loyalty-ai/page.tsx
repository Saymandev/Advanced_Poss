'use client';

import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { DataTable } from '@/components/ui/DataTable';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Select } from '@/components/ui/Select';
import { CustomerLoyaltyInsight, useGetCustomerLoyaltyInsightsQuery, useGetPersonalizedOffersMutation } from '@/lib/api/endpoints/aiApi';
import { useGetCustomersQuery } from '@/lib/api/endpoints/customersApi';
import { useAppSelector } from '@/lib/store';
import { formatCurrency } from '@/lib/utils';
import {
    ArrowTrendingDownIcon,
    ArrowTrendingUpIcon,
    EyeIcon,
    GiftIcon,
    LightBulbIcon,
    SparklesIcon,
    UserIcon,
    UsersIcon
} from '@heroicons/react/24/outline';
import { useState } from 'react';
import toast from 'react-hot-toast';

const LOYALTY_TIERS = [
  { value: 'bronze', label: 'Bronze', minPoints: 0, color: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400' },
  { value: 'silver', label: 'Silver', minPoints: 500, color: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400' },
  { value: 'gold', label: 'Gold', minPoints: 1000, color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400' },
  { value: 'platinum', label: 'Platinum', minPoints: 2000, color: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400' },
];

export default function CustomerLoyaltyAIPage() {
  const { user } = useAppSelector((state) => state.auth);
  const [selectedTier, setSelectedTier] = useState('all');
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [isOffersModalOpen, setIsOffersModalOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerLoyaltyInsight | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const { data: loyaltyData, isLoading, refetch } = useGetCustomerLoyaltyInsightsQuery({
    branchId: user?.branchId || undefined,
  });

  const { data: customers } = useGetCustomersQuery({ branchId: user?.branchId || undefined });
  const [generateOffers] = useGetPersonalizedOffersMutation();

  const openDetailsModal = (customer: CustomerLoyaltyInsight) => {
    setSelectedCustomer(customer);
    setIsDetailsModalOpen(true);
  };

  const openOffersModal = async (customer: CustomerLoyaltyInsight) => {
    try {
      const result = await generateOffers({
        customerId: customer.customerId,
        branchId: user?.branchId || '',
      }).unwrap();

      setSelectedCustomer({ ...customer, personalizedOffers: result.offers });
      setIsOffersModalOpen(true);
    } catch (error: any) {
      toast.error(error.data?.message || 'Failed to generate personalized offers');
    }
  };

  const getTierBadge = (tier: string) => {
    const tierConfig = LOYALTY_TIERS.find(t => t.value === tier);
    return tierConfig ? (
      <Badge className={tierConfig.color}>
        {tierConfig.label}
      </Badge>
    ) : (
      <Badge variant="secondary">{tier}</Badge>
    );
  };

  const getChurnRiskBadge = (risk: number) => {
    if (risk >= 0.7) return { variant: 'danger' as const, label: 'High Risk' };
    if (risk >= 0.4) return { variant: 'warning' as const, label: 'Medium Risk' };
    return { variant: 'success' as const, label: 'Low Risk' };
  };

  const getOfferTypeIcon = (type: string) => {
    const icons = {
      discount: '💰',
      free_item: '🎁',
      bonus_points: '⭐',
      early_access: '⚡',
    };
    return icons[type as keyof typeof icons] || '🎯';
  };

  const columns = [
    {
      key: 'customerName',
      title: 'Customer',
      sortable: true,
      render: (value: string, row: CustomerLoyaltyInsight) => (
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary-100 dark:bg-primary-900/30 rounded-full flex items-center justify-center">
            <UserIcon className="w-5 h-5 text-primary-600 dark:text-primary-400" />
          </div>
          <div>
            <p className="font-medium text-gray-900 dark:text-white">{value}</p>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              ID: {row.customerId.slice(-8)}
            </p>
          </div>
        </div>
      ),
    },
    {
      key: 'currentTier',
      title: 'Current Tier',
      render: (value: string) => getTierBadge(value),
    },
    {
      key: 'nextTierProgress',
      title: 'Next Tier Progress',
      align: 'center' as const,
      render: (value: number, row: CustomerLoyaltyInsight) => {
        const currentTier = LOYALTY_TIERS.find(t => t.value === row.currentTier);
        const nextTier = LOYALTY_TIERS[LOYALTY_TIERS.findIndex(t => t.value === row.currentTier) + 1];

        return (
          <div className="text-center">
            <div className="flex items-center justify-center gap-2 mb-1">
              <span className="text-sm font-medium text-gray-900 dark:text-white">
                {value.toFixed(0)}%
              </span>
              {nextTier && (
                <span className="text-xs text-gray-600 dark:text-gray-400">
                  to {nextTier.label}
                </span>
              )}
            </div>
            <div className="w-20 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-primary-600 transition-all duration-300"
                style={{ width: `${value}%` }}
              />
            </div>
          </div>
        );
      },
    },
    {
      key: 'lifetimeValue',
      title: 'Lifetime Value',
      align: 'right' as const,
      render: (value: number) => (
        <div className="text-right">
          <p className="font-semibold text-gray-900 dark:text-white">
            {formatCurrency(value)}
          </p>
        </div>
      ),
    },
    {
      key: 'predictedChurn',
      title: 'Churn Risk',
      render: (value: number) => {
        const risk = getChurnRiskBadge(value);
        return (
          <Badge variant={risk.variant}>
            {risk.label} ({Math.round(value * 100)}%)
          </Badge>
        );
      },
    },
    {
      key: 'recommendations',
      title: 'AI Recommendations',
      render: (value: string[]) => (
        <div className="space-y-1">
          {value.slice(0, 2).map((rec, index) => (
            <Badge key={index} variant="info" className="text-xs">
              {rec.length > 25 ? `${rec.substring(0, 25)}...` : rec}
            </Badge>
          ))}
          {value.length > 2 && (
            <Badge variant="secondary" className="text-xs">
              +{value.length - 2} more
            </Badge>
          )}
        </div>
      ),
    },
    {
      key: 'actions',
      title: 'Actions',
      render: (value: any, row: CustomerLoyaltyInsight) => (
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => openDetailsModal(row)}
          >
            <EyeIcon className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => openOffersModal(row)}
            className="text-purple-600 hover:text-purple-700"
          >
            <GiftIcon className="w-4 h-4" />
          </Button>
        </div>
      ),
    },
  ];

  const stats = {
    totalCustomers: loyaltyData?.length || 0,
    highChurnRisk: loyaltyData?.filter(c => c.predictedChurn >= 0.7).length || 0,
    avgLifetimeValue: loyaltyData ? loyaltyData.reduce((sum, c) => sum + c.lifetimeValue, 0) / loyaltyData.length : 0,
    totalOffers: loyaltyData?.reduce((sum, c) => sum + c.personalizedOffers.length, 0) || 0,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Customer Loyalty AI</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            AI-powered customer insights and personalized offers
          </p>
        </div>
        <Button onClick={() => refetch()}>
          <SparklesIcon className="w-5 h-5 mr-2" />
          Refresh AI Analysis
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Total Customers</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white">{stats.totalCustomers}</p>
              </div>
              <UsersIcon className="w-8 h-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">High Churn Risk</p>
                <p className="text-3xl font-bold text-red-600">{stats.highChurnRisk}</p>
              </div>
              <ArrowTrendingDownIcon className="w-8 h-8 text-red-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Avg Lifetime Value</p>
                <p className="text-3xl font-bold text-green-600">{formatCurrency(stats.avgLifetimeValue)}</p>
              </div>
              <ArrowTrendingUpIcon className="w-8 h-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Active Offers</p>
                <p className="text-3xl font-bold text-purple-600">{stats.totalOffers}</p>
              </div>
              <GiftIcon className="w-8 h-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <Input
                placeholder="Search customers..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="w-full sm:w-48">
              <Select
                options={[
                  { value: 'all', label: 'All Tiers' },
                  ...LOYALTY_TIERS.map(tier => ({ value: tier.value, label: tier.label })),
                ]}
                value={selectedTier}
                onChange={setSelectedTier}
                placeholder="Filter by tier"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Loyalty Insights Table */}
      <Card>
        <CardHeader>
          <CardTitle>Customer Loyalty Insights</CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable
            data={loyaltyData || []}
            columns={columns}
            loading={isLoading}
            searchable={false}
            selectable={false}
            exportable={true}
            exportFilename="customer-loyalty-insights"
            onExport={(format, items) => {
              console.log(`Exporting ${items.length} customer insights as ${format}`);
            }}
            emptyMessage="No customer loyalty insights available. The AI will analyze customer data and provide insights soon."
          />
        </CardContent>
      </Card>

      {/* Customer Details Modal */}
      <Modal
        isOpen={isDetailsModalOpen}
        onClose={() => {
          setIsDetailsModalOpen(false);
          setSelectedCustomer(null);
        }}
        title={`Customer Analysis - ${selectedCustomer?.customerName}`}
        className="max-w-4xl"
      >
        {selectedCustomer && (
          <div className="space-y-6">
            {/* Header */}
            <div className="flex items-start gap-6">
              <div className="w-16 h-16 bg-primary-100 dark:bg-primary-900/30 rounded-lg flex items-center justify-center">
                <UserIcon className="w-8 h-8 text-primary-600 dark:text-primary-400" />
              </div>
              <div className="flex-1">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                      {selectedCustomer.customerName}
                    </h3>
                    <div className="flex items-center gap-2 mt-2">
                      {getTierBadge(selectedCustomer.currentTier)}
                      <span className={`text-sm font-medium ${
                        selectedCustomer.predictedChurn >= 0.7 ? 'text-red-600' :
                        selectedCustomer.predictedChurn >= 0.4 ? 'text-yellow-600' : 'text-green-600'
                      }`}>
                        {getChurnRiskBadge(selectedCustomer.predictedChurn).label}
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-600 dark:text-gray-400">Lifetime Value</p>
                    <p className="text-2xl font-bold text-green-600">
                      {formatCurrency(selectedCustomer.lifetimeValue)}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Loyalty Progress */}
            <div>
              <h4 className="font-medium text-gray-900 dark:text-white mb-3">Loyalty Progress</h4>
              <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Current Tier:</span>
                  {getTierBadge(selectedCustomer.currentTier)}
                </div>
                <div className="mb-3">
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="text-gray-600 dark:text-gray-400">Progress to Next Tier</span>
                    <span className="font-medium text-gray-900 dark:text-white">
                      {selectedCustomer.nextTierProgress.toFixed(0)}%
                    </span>
                  </div>
                  <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary-600 transition-all duration-300"
                      style={{ width: `${selectedCustomer.nextTierProgress}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* AI Recommendations */}
            <div>
              <h4 className="font-medium text-gray-900 dark:text-white mb-3">AI Recommendations</h4>
              <div className="space-y-2">
                {selectedCustomer.recommendations.map((rec, index) => (
                  <div key={index} className="flex items-start gap-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                    <LightBulbIcon className="w-5 h-5 text-blue-600 mt-0.5" />
                    <p className="text-sm text-blue-800 dark:text-blue-400">{rec}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
              <Button
                variant="secondary"
                onClick={() => {
                  setIsDetailsModalOpen(false);
                  setSelectedCustomer(null);
                }}
              >
                Close
              </Button>
              <Button
                onClick={() => {
                  setIsDetailsModalOpen(false);
                  openOffersModal(selectedCustomer);
                }}
                className="bg-purple-600 hover:bg-purple-700"
              >
                <GiftIcon className="w-4 h-4 mr-2" />
                Generate Offers
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Personalized Offers Modal */}
      <Modal
        isOpen={isOffersModalOpen}
        onClose={() => {
          setIsOffersModalOpen(false);
          setSelectedCustomer(null);
        }}
        title={`Personalized Offers - ${selectedCustomer?.customerName}`}
        className="max-w-4xl"
      >
        {selectedCustomer && (
          <div className="space-y-6">
            {/* Header */}
            <div className="flex items-start gap-6">
              <div className="w-16 h-16 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center">
                <GiftIcon className="w-8 h-8 text-purple-600 dark:text-purple-400" />
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                  Personalized Offers for {selectedCustomer.customerName}
                </h3>
                <p className="text-gray-600 dark:text-gray-400 mt-1">
                  AI-generated offers tailored to this customer's preferences and behavior
                </p>
              </div>
            </div>

            {/* Offers Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {selectedCustomer.personalizedOffers?.map((offer, index) => (
                <Card key={index} className="border-2 border-purple-200 dark:border-purple-800">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="text-2xl">
                        {getOfferTypeIcon(offer.type)}
                      </div>
                      <div className="flex-1">
                        <h4 className="font-semibold text-gray-900 dark:text-white mb-1">
                          {offer.title}
                        </h4>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                          {offer.description}
                        </p>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Badge variant="info" className="text-xs">
                              Value: {formatCurrency(offer.value)}
                            </Badge>
                            <Badge variant="secondary" className="text-xs">
                              Expires: {new Date(offer.expiryDate).toLocaleDateString()}
                            </Badge>
                          </div>
                          <Button size="sm">
                            Send Offer
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )) || (
                <div className="col-span-2 text-center py-8">
                  <GiftIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500 dark:text-gray-400">
                    No personalized offers generated yet. The AI will create tailored offers based on customer behavior.
                  </p>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
              <Button
                variant="secondary"
                onClick={() => {
                  setIsOffersModalOpen(false);
                  setSelectedCustomer(null);
                }}
              >
                Close
              </Button>
              <Button>
                Send All Offers
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
