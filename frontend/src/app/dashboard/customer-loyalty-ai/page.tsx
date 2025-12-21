'use client';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { DataTable } from '@/components/ui/DataTable';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Select } from '@/components/ui/Select';
import { useFeatureRedirect } from '@/hooks/useFeatureRedirect';
import { CustomerLoyaltyInsight, useGetPersonalizedOffersMutation } from '@/lib/api/endpoints/aiApi';
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
import { useMemo, useState } from 'react';
import toast from 'react-hot-toast';
const LOYALTY_TIERS = [
  { value: 'bronze', label: 'Bronze', minPoints: 0, color: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400' },
  { value: 'silver', label: 'Silver', minPoints: 500, color: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400' },
  { value: 'gold', label: 'Gold', minPoints: 1000, color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400' },
  { value: 'platinum', label: 'Platinum', minPoints: 2000, color: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400' },
];
export default function CustomerLoyaltyAIPage() {
  const { user, companyContext } = useAppSelector((state) => state.auth);
  const [selectedTier, setSelectedTier] = useState('all');
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [isOffersModalOpen, setIsOffersModalOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerLoyaltyInsight | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  // Check subscription feature access using the standard hook
  // This will automatically redirect to /dashboard/subscriptions if user doesn't have the feature
  useFeatureRedirect('ai-customer-loyalty', '/dashboard/subscriptions');
  const companyId = (user as any)?.companyId || 
                   (companyContext as any)?.companyId;
  const branchId = (user as any)?.branchId || 
                   (companyContext as any)?.branchId || 
                   (companyContext as any)?.branches?.[0]?._id ||
                   (companyContext as any)?.branches?.[0]?.id;
  const queryParams = useMemo(() => {
    const params: any = {};
    if (branchId) params.branchId = branchId;
    if (companyId) params.companyId = companyId;
    return params;
  }, [branchId, companyId]);
  const { data: customersData, isLoading, error: loyaltyError, refetch } = useGetCustomersQuery(queryParams, {
    skip: !branchId && !companyId,
    refetchOnMountOrArgChange: true,
    refetchOnFocus: true,
  });
  const [generateOffers, { isLoading: offersLoading }] = useGetPersonalizedOffersMutation();
  // Transform customers data to loyalty insights format
  const loyaltyData = useMemo(() => {
    if (!customersData) return [];
    const customers = Array.isArray(customersData) ? customersData : (customersData.customers || []);
    return customers.map((customer): CustomerLoyaltyInsight => {
      // Calculate next tier progress (simplified calculation)
      const tierPoints = LOYALTY_TIERS.find(t => t.value === customer.tier)?.minPoints || 0;
      const nextTierPoints = LOYALTY_TIERS.find(t => t.minPoints > tierPoints)?.minPoints || tierPoints + 500;
      const progress = nextTierPoints > tierPoints 
        ? ((customer.loyaltyPoints - tierPoints) / (nextTierPoints - tierPoints)) * 100 
        : 100;
      // Calculate churn risk based on last order date
      let churnRisk = 0.5; // Default medium risk
      if (customer.lastOrderDate) {
        const daysSinceLastOrder = Math.floor(
          (new Date().getTime() - new Date(customer.lastOrderDate).getTime()) / (1000 * 60 * 60 * 24)
        );
        if (daysSinceLastOrder > 90) churnRisk = 0.9; // High risk
        else if (daysSinceLastOrder > 60) churnRisk = 0.7; // High risk
        else if (daysSinceLastOrder > 30) churnRisk = 0.5; // Medium risk
        else if (daysSinceLastOrder > 14) churnRisk = 0.3; // Low risk
        else churnRisk = 0.1; // Very low risk
      }
      // Generate recommendations
      const recommendations: string[] = [];
      if (customer.totalOrders < 3) {
        recommendations.push('New customer - offer welcome discount to encourage repeat visits');
      }
      if (progress > 80 && progress < 100) {
        recommendations.push(`Customer is ${Math.round(100 - progress)}% away from next tier - offer bonus points to encourage upgrade`);
      }
      if (churnRisk > 0.7) {
        recommendations.push('High churn risk - send personalized offer to re-engage');
      }
      if (customer.totalSpent > 500) {
        recommendations.push('High-value customer - provide VIP treatment and exclusive offers');
      }
      return {
        id: customer.id,
        customerId: customer.id,
        customerName: `${customer.firstName} ${customer.lastName}`,
        currentTier: customer.tier,
        nextTierProgress: Math.max(0, Math.min(100, progress)),
        personalizedOffers: [],
        recommendations: recommendations.length > 0 ? recommendations : [
          'Continue providing excellent service to maintain loyalty',
          'Monitor customer preferences for personalized recommendations',
        ],
        predictedChurn: churnRisk,
        lifetimeValue: customer.totalSpent,
        createdAt: customer.createdAt,
      };
    });
  }, [customersData]);
  // Filter loyalty data
  const filteredLoyaltyData = useMemo(() => {
    if (!loyaltyData || !Array.isArray(loyaltyData)) return [];
    return loyaltyData.filter((customer) => {
      // Filter by tier
      if (selectedTier !== 'all' && customer.currentTier !== selectedTier) return false;
      // Filter by search query
      if (searchQuery && !customer.customerName.toLowerCase().includes(searchQuery.toLowerCase())) {
        return false;
      }
      return true;
    });
  }, [loyaltyData, selectedTier, searchQuery]);
  const openDetailsModal = (customer: CustomerLoyaltyInsight) => {
    setSelectedCustomer(customer);
    setIsDetailsModalOpen(true);
  };
  const openOffersModal = async (customer: CustomerLoyaltyInsight) => {
    try {
      if (!user?.branchId) {
        toast.error('Branch ID is required');
        return;
      }
      const result = await generateOffers({
        customerId: customer.customerId,
        branchId: user.branchId,
      }).unwrap();
      setSelectedCustomer({ ...customer, personalizedOffers: result.offers || [] });
      setIsOffersModalOpen(true);
      toast.success('Personalized offers generated successfully');
    } catch (error: any) {
      toast.error(error.data?.message || 'Failed to generate personalized offers');
    }
  };
  const handleSendOffer = async (offer: CustomerLoyaltyInsight['personalizedOffers'][0]) => {
    try {
      // TODO: Implement send offer API call
      toast.success(`Offer "${offer.title}" sent to customer`);
    } catch (error) {
      console.error(error);
      toast.error('Failed to send offer');
    }
  };
  const handleSendAllOffers = async () => {
    if (!selectedCustomer || !selectedCustomer.personalizedOffers?.length) return;
    try {
      // TODO: Implement send all offers API call
      const offerCount = selectedCustomer.personalizedOffers.length;
      toast.success(`All ${offerCount} offers sent to customer`);
      setIsOffersModalOpen(false);
      setSelectedCustomer(null);
    } catch (error) {
      console.error(error);
      toast.error('Failed to send offers');
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
  const stats = useMemo(() => {
    const customers = Array.isArray(loyaltyData) ? loyaltyData : [];
    return {
      totalCustomers: customers.length,
      highChurnRisk: customers.filter(c => (c.predictedChurn || 0) >= 0.7).length,
      avgLifetimeValue: customers.length > 0
        ? customers.reduce((sum, c) => sum + (c.lifetimeValue || 0), 0) / customers.length
        : 0,
      totalOffers: customers.reduce((sum, c) => sum + (c.personalizedOffers?.length || 0), 0),
    };
  }, [loyaltyData]);
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">Customer Loyalty AI</h1>
          <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mt-1">
            AI-powered customer insights and personalized offers
          </p>
        </div>
        <Button onClick={() => refetch()} className="w-full sm:w-auto text-sm">
          <SparklesIcon className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
          Refresh AI Analysis
        </Button>
      </div>
      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 md:gap-6">
        <Card>
          <CardContent className="p-3 sm:p-4 md:p-6">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0 flex-1">
                <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 truncate">Total Customers</p>
                <p className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white truncate" title={stats.totalCustomers.toLocaleString()}>
                  {stats.totalCustomers.toLocaleString()}
                </p>
              </div>
              <UsersIcon className="w-5 h-5 sm:w-6 sm:h-6 md:w-8 md:h-8 text-blue-600 flex-shrink-0" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 sm:p-4 md:p-6">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0 flex-1">
                <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 truncate">High Churn Risk</p>
                <p className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold text-red-600 truncate" title={stats.highChurnRisk.toLocaleString()}>
                  {stats.highChurnRisk.toLocaleString()}
                </p>
              </div>
              <ArrowTrendingDownIcon className="w-5 h-5 sm:w-6 sm:h-6 md:w-8 md:h-8 text-red-600 flex-shrink-0" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 sm:p-4 md:p-6">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0 flex-1">
                <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 truncate">Avg Lifetime Value</p>
                <p className="text-sm sm:text-base md:text-lg lg:text-2xl font-bold text-green-600 truncate" title={formatCurrency(stats.avgLifetimeValue)}>
                  {formatCurrency(stats.avgLifetimeValue)}
                </p>
              </div>
              <ArrowTrendingUpIcon className="w-5 h-5 sm:w-6 sm:h-6 md:w-8 md:h-8 text-green-600 flex-shrink-0" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 sm:p-4 md:p-6">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0 flex-1">
                <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 truncate">Active Offers</p>
                <p className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold text-purple-600 truncate" title={stats.totalOffers.toLocaleString()}>
                  {stats.totalOffers.toLocaleString()}
                </p>
              </div>
              <GiftIcon className="w-5 h-5 sm:w-6 sm:h-6 md:w-8 md:h-8 text-purple-600 flex-shrink-0" />
            </div>
          </CardContent>
        </Card>
      </div>
      {/* Filters */}
      <Card>
        <CardContent className="p-3 sm:p-4 md:p-6">
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
            <div className="flex-1">
              <Input
                placeholder="Search customers..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="text-sm sm:text-base"
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
          {loyaltyError && (
            <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-4 mb-4">
              <p className="text-red-800 dark:text-red-400 text-sm">
                Error loading customer loyalty insights. Please try refreshing.
              </p>
            </div>
          )}
          <DataTable
            data={filteredLoyaltyData}
            columns={columns}
            loading={isLoading}
            searchable={false}
            selectable={false}
            exportable={true}
            exportFilename="customer-loyalty-insights"
            onExport={(_format, _items) => {
              }}
            emptyMessage="No customer loyalty insights found. The AI will analyze customer data and provide insights soon."
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
          <div className="space-y-4 sm:space-y-6 p-3 sm:p-4">
            {/* Header */}
            <div className="flex flex-col sm:flex-row items-start gap-4 sm:gap-6">
              <div className="w-12 h-12 sm:w-16 sm:h-16 bg-primary-100 dark:bg-primary-900/30 rounded-lg flex items-center justify-center flex-shrink-0">
                <UserIcon className="w-6 h-6 sm:w-8 sm:h-8 text-primary-600 dark:text-primary-400" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex flex-col sm:flex-row items-start sm:items-start justify-between gap-3 sm:gap-4">
                  <div className="min-w-0 flex-1">
                    <h3 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white truncate">
                      {selectedCustomer.customerName}
                    </h3>
                    <div className="flex flex-wrap items-center gap-2 mt-2">
                      {getTierBadge(selectedCustomer.currentTier)}
                      <span className={`text-xs sm:text-sm font-medium ${
                        selectedCustomer.predictedChurn >= 0.7 ? 'text-red-600' :
                        selectedCustomer.predictedChurn >= 0.4 ? 'text-yellow-600' : 'text-green-600'
                      }`}>
                        {getChurnRiskBadge(selectedCustomer.predictedChurn).label}
                      </span>
                    </div>
                  </div>
                  <div className="text-left sm:text-right">
                    <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">Lifetime Value</p>
                    <p className="text-xl sm:text-2xl font-bold text-green-600">
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
            <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
              <Button
                variant="secondary"
                onClick={() => {
                  setIsDetailsModalOpen(false);
                  setSelectedCustomer(null);
                }}
                className="w-full sm:w-auto text-sm"
              >
                Close
              </Button>
              <Button
                onClick={() => {
                  setIsDetailsModalOpen(false);
                  openOffersModal(selectedCustomer);
                }}
                className="bg-purple-600 hover:bg-purple-700 w-full sm:w-auto text-sm"
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
          <div className="space-y-4 sm:space-y-6 p-3 sm:p-4">
            {/* Header */}
            <div className="flex flex-col sm:flex-row items-start gap-4 sm:gap-6">
              <div className="w-12 h-12 sm:w-16 sm:h-16 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center flex-shrink-0">
                <GiftIcon className="w-6 h-6 sm:w-8 sm:h-8 text-purple-600 dark:text-purple-400" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white">
                  Personalized Offers for {selectedCustomer.customerName}
                </h3>
                <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mt-1">
                  AI-generated offers tailored to this customer's preferences and behavior
                </p>
              </div>
            </div>
            {/* Offers Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
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
                          <Button 
                            size="sm"
                            onClick={() => handleSendOffer(offer)}
                            disabled={offersLoading}
                          >
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
            <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
              <Button
                variant="secondary"
                onClick={() => {
                  setIsOffersModalOpen(false);
                  setSelectedCustomer(null);
                }}
                className="w-full sm:w-auto text-sm"
              >
                Close
              </Button>
              <Button
                onClick={handleSendAllOffers}
                disabled={offersLoading || !selectedCustomer?.personalizedOffers?.length}
                className="bg-purple-600 hover:bg-purple-700 w-full sm:w-auto text-sm"
              >
                <GiftIcon className="w-4 h-4 mr-2" />
                Send All Offers
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
