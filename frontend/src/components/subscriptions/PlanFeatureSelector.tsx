'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Checkbox } from '@/components/ui/Checkbox';
import { useGetAvailableFeaturesQuery } from '@/lib/api/endpoints/subscriptionsApi';
import { ChevronDownIcon, ChevronRightIcon } from '@heroicons/react/24/outline';
import { useMemo, useState } from 'react';

interface PlanFeatureSelectorProps {
  selectedFeatures: string[];
  onChange: (features: string[]) => void;
}

export function PlanFeatureSelector({ selectedFeatures, onChange }: PlanFeatureSelectorProps) {
  const { data: featuresData, isLoading } = useGetAvailableFeaturesQuery();
  const [expandedCategories, setExpandedCategories] = useState<string[]>([]);

  const featuresByCategory = useMemo(() => {
    if (!featuresData?.data?.featuresByCategory) return {};
    return featuresData.data.featuresByCategory;
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

  const toggleCategoryAll = (category: string, features: Array<{ key: string; name: string }>) => {
    const allSelected = features.every((f) => selectedFeatures.includes(f.key));
    
    if (allSelected) {
      // Deselect all in category
      const newFeatures = selectedFeatures.filter(
        (f) => !features.some((catFeature) => catFeature.key === f)
      );
      onChange(newFeatures);
    } else {
      // Select all in category
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
      </div>
    );
  }

  const categories = Object.keys(featuresByCategory);
  const totalFeatures = Object.values(featuresByCategory).reduce((sum, features) => sum + features.length, 0);
  const selectedCount = selectedFeatures.length;

  return (
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
                    {features.map((feature) => (
                      <Checkbox
                        key={feature.key}
                        checked={selectedFeatures.includes(feature.key)}
                        onChange={() => toggleFeature(feature.key)}
                        label={feature.name}
                        className="cursor-pointer"
                      />
                    ))}
                  </div>
                </CardContent>
              )}
            </Card>
          );
        })}
      </div>

      {selectedCount > 0 && (
        <div className="mt-4 p-4 bg-primary-50 dark:bg-primary-900/20 rounded-lg">
          <p className="text-sm font-medium text-primary-900 dark:text-primary-100">
            {selectedCount} feature{selectedCount !== 1 ? 's' : ''} selected
          </p>
        </div>
      )}
    </div>
  );
}

