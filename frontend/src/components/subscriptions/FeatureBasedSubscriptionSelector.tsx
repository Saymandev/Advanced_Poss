'use client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Checkbox } from '@/components/ui/Checkbox';
import { useGetCompanyByIdQuery } from '@/lib/api/endpoints/companiesApi';
import { useCalculateFeaturePriceMutation, useGetSubscriptionFeaturesQuery, useSeedSubscriptionFeaturesMutation } from '@/lib/api/endpoints/subscriptionsApi';
import { useAppSelector } from '@/lib/store';
import { formatCurrency } from '@/lib/utils';
import { ChevronDownIcon, ChevronRightIcon } from '@heroicons/react/24/outline';
import { JSX, useEffect, useMemo, useState } from 'react';
interface FeatureBasedSubscriptionSelectorProps {
  selectedFeatures: string[];
  onChange: (features: string[]) => void;
  billingCycle: 'monthly' | 'quarterly' | 'yearly';
  onBillingCycleChange: (cycle: 'monthly' | 'quarterly' | 'yearly') => void;
  onPriceCalculated?: (price: number) => void;
}
export function FeatureBasedSubscriptionSelector({
  selectedFeatures,
  onChange,
  billingCycle,
  onBillingCycleChange,
  onPriceCalculated,
}: FeatureBasedSubscriptionSelectorProps): JSX.Element {
  const { user } = useAppSelector((state) => state.auth);
  const companyId = user?.companyId || '';
  const { data: companyData } = useGetCompanyByIdQuery(companyId, { skip: !companyId });
  const { data: featuresData, isLoading, error: featuresError, refetch: refetchFeatures } = useGetSubscriptionFeaturesQuery();
  const [expandedCategories, setExpandedCategories] = useState<string[]>([]);
  const [calculatePrice, { data: priceData, isLoading: isCalculatingPrice, isSuccess: isPriceCalculated }] = useCalculateFeaturePriceMutation();
  const [seedFeatures, { isLoading: isSeeding }] = useSeedSubscriptionFeaturesMutation();
  const isSuperAdmin = user?.role === 'super_admin';
  const handleSeedFeatures = async () => {
    try {
      await seedFeatures().unwrap();
      await refetchFeatures();
    } catch (error: any) {
      console.error('Failed to seed features:', error);
    }
  };
  // Debug logging removed
  // Get branch and user counts for price calculation
  // Note: Company type may not have branches/users directly, using defaults
  const branchCount = (companyData as any)?.branches?.length || 1;
  const userCount = (companyData as any)?.users?.length || 1;
  // Calculate price when features or billing cycle changes
  useEffect(() => {
    if (selectedFeatures.length > 0) {
      calculatePrice({
        featureKeys: selectedFeatures,
        billingCycle,
        branchCount,
        userCount,
      })
        .unwrap()
        .then((result: any) => {
          // Handle both { data: {...} } and direct response formats
          const priceData = result?.data || result;
          const totalPrice = priceData?.totalPrice ?? 0;
          console.log('[FeatureBasedSubscriptionSelector] Price calculated:', { totalPrice, result, selectedFeatures, billingCycle });
          if (onPriceCalculated) {
            onPriceCalculated(totalPrice);
          }
        })
        .catch((error: any) => {
          console.error('Error calculating feature price:', error);
          if (onPriceCalculated) {
            onPriceCalculated(0);
          }
        });
    } else {
      // Reset price when no features selected
      if (onPriceCalculated) {
        onPriceCalculated(0);
      }
    }
  }, [selectedFeatures, billingCycle, branchCount, userCount, calculatePrice, onPriceCalculated]);

  // Also update price when mutation data changes (fallback)
  useEffect(() => {
    if (isPriceCalculated && priceData && onPriceCalculated) {
      const totalPrice = priceData?.totalPrice ?? 0;
      console.log('[FeatureBasedSubscriptionSelector] Price updated from mutation data:', { totalPrice, priceData });
      onPriceCalculated(totalPrice);
    }
  }, [isPriceCalculated, priceData, onPriceCalculated]);
  
  const featuresByCategory = useMemo(() => {
    if (!featuresData || !Array.isArray(featuresData)) return {};
    const grouped: Record<string, any[]> = {};
    featuresData.forEach((feature: any) => {
      if (!feature.isActive) return;
      const category = feature.category || 'Other';
      if (!grouped[category]) {
        grouped[category] = [];
      }
      grouped[category].push(feature);
    });
    // Sort features within each category
    Object.keys(grouped).forEach((category) => {
      grouped[category].sort((a, b) => a.name.localeCompare(b.name));
    });
    return grouped;
  }, [featuresData]);
  const toggleCategory = (category: string) => {
    setExpandedCategories((prev) =>
      prev.includes(category)
        ? prev.filter((c) => c !== category)
        : [...prev, category]
    );
  };
  const toggleFeature = (featureKey: string) => {
    const newFeatures = selectedFeatures.includes(featureKey)
      ? selectedFeatures.filter((f) => f !== featureKey)
      : [...selectedFeatures, featureKey];
    onChange(newFeatures);
  };
  const toggleCategoryAll = (category: string, features: any[]) => {
    const allSelected = features.every((f) => selectedFeatures.includes(f.key));
    if (allSelected) {
      const newFeatures = selectedFeatures.filter(
        (f) => !features.some((catFeature) => catFeature.key === f)
      );
      onChange(newFeatures);
    } else {
      const newFeatures = [
        ...selectedFeatures,
        ...features.map((f) => f.key).filter((key) => !selectedFeatures.includes(key)),
      ];
      onChange(newFeatures);
    }
  };
  const allCategoriesExpanded = useMemo(() => {
    const categories = Object.keys(featuresByCategory);
    return categories.every((cat) => expandedCategories.includes(cat));
  }, [expandedCategories, featuresByCategory]);
  const expandAll = () => {
    if (allCategoriesExpanded) {
      setExpandedCategories([]);
    } else {
      setExpandedCategories(Object.keys(featuresByCategory));
    }
  };
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary-600"></div>
        <span className="ml-3 text-gray-600 dark:text-gray-400">Loading features...</span>
      </div>
    );
  }
  if (featuresError) {
    return (
      <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
        <p className="text-sm text-red-600 dark:text-red-400 font-medium mb-2">
          Error loading features
        </p>
        <p className="text-xs text-red-500 dark:text-red-400">
          {featuresError && 'message' in featuresError ? featuresError.message : 'Unknown error. Please check if features are seeded in the database.'}
        </p>
        <p className="text-xs text-red-500 dark:text-red-400 mt-2">
          Super Admin can seed features by calling: <code className="bg-red-100 dark:bg-red-900/40 px-1 rounded">GET /subscription-features/seed</code>
        </p>
      </div>
    );
  }
  const categories = Object.keys(featuresByCategory);
  const totalFeatures = Object.values(featuresByCategory).reduce((sum, features) => sum + features.length, 0);
  const selectedCount = selectedFeatures.length;
  // Handle both { data: {...} } and direct response formats
  const totalPrice = priceData?.totalPrice || (priceData as any)?.data?.totalPrice || 0;
  
  // Show message when no features are available
  if (!isLoading && !featuresError && totalFeatures === 0) {
    return (
      <div className="space-y-6">
        <div className="p-6 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-yellow-800 dark:text-yellow-200 mb-2">
                No Features Available
              </h3>
              <p className="text-sm text-yellow-700 dark:text-yellow-300 mb-4">
                The feature catalog is empty. You need to seed default features before creating feature-based subscriptions.
              </p>
              {isSuperAdmin && (
                <button
                  type="button"
                  onClick={handleSeedFeatures}
                  disabled={isSeeding}
                  className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {isSeeding ? 'Seeding Features...' : 'Seed Default Features'}
                </button>
              )}
              {!isSuperAdmin && (
                <p className="text-xs text-yellow-600 dark:text-yellow-400">
                  Please contact a Super Admin to seed the feature catalog.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }
  return (
    <div className="space-y-6">
      {/* Billing Cycle Selector */}
      <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Billing Cycle
          </label>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => onBillingCycleChange('monthly')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                billingCycle === 'monthly'
                  ? 'bg-primary-600 text-white'
                  : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600'
              }`}
            >
              Monthly
            </button>
            <button
              type="button"
              onClick={() => onBillingCycleChange('quarterly')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                billingCycle === 'quarterly'
                  ? 'bg-primary-600 text-white'
                  : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600'
              }`}
            >
              Quarterly
            </button>
            <button
              type="button"
              onClick={() => onBillingCycleChange('yearly')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                billingCycle === 'yearly'
                  ? 'bg-primary-600 text-white'
                  : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600'
              }`}
            >
              Yearly
            </button>
          </div>
        </div>
        {/* Price Display */}
        {selectedCount > 0 && (
          <div className="text-right">
            <p className="text-sm text-gray-600 dark:text-gray-400">Total Price</p>
            {isCalculatingPrice ? (
              <div className="animate-pulse h-8 w-24 bg-gray-200 dark:bg-gray-700 rounded mt-1"></div>
            ) : (
              <p className="text-2xl font-bold text-primary-600 dark:text-primary-400">
                {formatCurrency(totalPrice)}
              </p>
            )}
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              per {billingCycle === 'monthly' ? 'month' : billingCycle === 'quarterly' ? 'quarter' : 'year'}
            </p>
          </div>
        )}
      </div>
      {/* Feature Selection */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Select Features
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {selectedCount} of {totalFeatures} features selected
            </p>
          </div>
          <button
            type="button"
            onClick={expandAll}
            className="text-sm text-primary-600 hover:text-primary-700 dark:text-primary-400"
          >
            {allCategoriesExpanded ? 'Collapse All' : 'Expand All'}
          </button>
        </div>
        <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2">
          {categories.map((category) => {
            const features = featuresByCategory[category] || [];
            const isExpanded = expandedCategories.includes(category);
            const categorySelected = features.filter((f) => selectedFeatures.includes(f.key)).length;
            const categoryTotal = features.length;
            const allSelected = categorySelected === categoryTotal && categoryTotal > 0;
            return (
              <Card key={category} className="border border-gray-200 dark:border-gray-700">
                <CardHeader
                  className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                  onClick={() => toggleCategory(category)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {isExpanded ? (
                        <ChevronDownIcon className="w-5 h-5 text-gray-500" />
                      ) : (
                        <ChevronRightIcon className="w-5 h-5 text-gray-500" />
                      )}
                      <CardTitle className="text-base font-semibold">{category}</CardTitle>
                      <span className="text-sm text-gray-500 dark:text-gray-400">
                        ({categorySelected}/{categoryTotal})
                      </span>
                    </div>
                    {isExpanded && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleCategoryAll(category, features);
                        }}
                        className="text-sm text-primary-600 hover:text-primary-700 dark:text-primary-400"
                      >
                        {allSelected ? 'Deselect All' : 'Select All'}
                      </button>
                    )}
                  </div>
                </CardHeader>
                {isExpanded && (
                  <CardContent className="pt-0">
                    <div className="space-y-3 pl-7">
                      {features.map((feature: any) => {
                        let featurePrice: number;
                        if (billingCycle === 'monthly') {
                          featurePrice = feature.basePriceMonthly;
                        } else if (billingCycle === 'quarterly') {
                          // Quarterly is typically 3x monthly (or use basePriceQuarterly if available)
                          featurePrice = feature.basePriceQuarterly || (feature.basePriceMonthly * 3);
                        } else {
                          // Yearly
                          featurePrice = feature.basePriceYearly || (feature.basePriceMonthly * 10);
                        }
                        return (
                          <div key={feature.key} className="flex items-start justify-between gap-4">
                            <Checkbox
                              checked={selectedFeatures.includes(feature.key)}
                              onChange={() => toggleFeature(feature.key)}
                              label={
                                <div>
                                  <div className="font-medium">{feature.name}</div>
                                  {feature.description && (
                                    <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                                      {feature.description}
                                    </div>
                                  )}
                                </div>
                              }
                              className="cursor-pointer flex-1"
                            />
                            <div className="text-right flex-shrink-0">
                              <div className="font-semibold text-gray-900 dark:text-white">
                                {formatCurrency(featurePrice)}
                              </div>
                              <div className="text-xs text-gray-500 dark:text-gray-400">
                                /{billingCycle === 'monthly' ? 'month' : billingCycle === 'quarterly' ? 'quarter' : 'year'}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                )}
              </Card>
            );
          })}
        </div>
      </div>
      {selectedCount === 0 && (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          Select at least one feature to continue
        </div>
      )}
    </div>
  );
}
