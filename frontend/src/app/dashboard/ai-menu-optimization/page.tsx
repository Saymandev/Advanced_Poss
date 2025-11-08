'use client';

import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { DataTable } from '@/components/ui/DataTable';
import { Modal } from '@/components/ui/Modal';
import { Select } from '@/components/ui/Select';
import { DemandPrediction, MenuOptimizationSuggestion, useGetDemandPredictionsQuery, useGetMenuOptimizationQuery } from '@/lib/api/endpoints/aiApi';
import { useGetMenuItemsQuery, useUpdateMenuItemMutation } from '@/lib/api/endpoints/menuItemsApi';
import { useAppSelector } from '@/lib/store';
import { formatCurrency } from '@/lib/utils';
import {
  ArrowTrendingDownIcon,
  ArrowTrendingUpIcon,
  ChartBarIcon,
  CheckCircleIcon,
  EyeIcon,
  LightBulbIcon,
  SparklesIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';
import { useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts';

export default function AIMenuOptimizationPage() {
  const { user } = useAppSelector((state) => state.auth);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [selectedSuggestion, setSelectedSuggestion] = useState<MenuOptimizationSuggestion | null>(null);

  const { 
    data: optimizationData, 
    isLoading: optimizationLoading, 
    error: optimizationError,
    refetch: refetchOptimization 
  } = useGetMenuOptimizationQuery({
    branchId: user?.branchId || undefined,
    category: selectedCategory === 'all' ? undefined : selectedCategory,
  }, {
    skip: !user?.branchId,
  });

  const { 
    data: demandData, 
    isLoading: demandLoading,
    error: demandError 
  } = useGetDemandPredictionsQuery({
    branchId: user?.branchId || undefined,
  }, {
    skip: !user?.branchId,
  });

  const { data: menuItemsData } = useGetMenuItemsQuery({ branchId: user?.branchId || undefined });
  const [updateMenuItem] = useUpdateMenuItemMutation();

  const menuItems = useMemo(() => {
    if (menuItemsData && 'menuItems' in menuItemsData) return menuItemsData.menuItems;
    if (menuItemsData && 'items' in menuItemsData) return menuItemsData.items;
    return [];
  }, [menuItemsData]);

  const categoryOptions = useMemo(() => {
    const uniqueCategories = Array.from(new Set(menuItems.map(item => item.category).filter(Boolean)));
    return [
      { value: 'all', label: 'All Categories' },
      ...uniqueCategories.map(cat => ({ value: cat, label: cat }))
    ];
  }, [menuItems]);

  const openDetailsModal = (suggestion: MenuOptimizationSuggestion) => {
    setSelectedSuggestion(suggestion);
    setIsDetailsModalOpen(true);
  };

  const handleApplySuggestion = async () => {
    if (!selectedSuggestion) return;

    try {
      await updateMenuItem({
        id: selectedSuggestion.itemId,
        price: selectedSuggestion.suggestedPrice,
      }).unwrap();

      toast.success(`Price updated successfully to ${formatCurrency(selectedSuggestion.suggestedPrice)}`);
      setIsDetailsModalOpen(false);
      setSelectedSuggestion(null);
      refetchOptimization();
    } catch (error: any) {
      toast.error(error.data?.message || 'Failed to apply suggestion');
    }
  };

  const getRecommendationBadge = (recommendation: MenuOptimizationSuggestion['recommendation']) => {
    const configs = {
      increase_price: { variant: 'warning' as const, icon: ArrowTrendingUpIcon, label: 'Increase Price' },
      decrease_price: { variant: 'info' as const, icon: ArrowTrendingDownIcon, label: 'Decrease Price' },
      maintain_price: { variant: 'secondary' as const, icon: ArrowTrendingUpIcon, label: 'Maintain Price' },
      remove_item: { variant: 'danger' as const, icon: XMarkIcon, label: 'Remove Item' },
      add_item: { variant: 'success' as const, icon: SparklesIcon, label: 'Add Item' },
    };

    const config = configs[recommendation];
    const Icon = config.icon;

    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        <Icon className="w-3 h-3" />
        {config.label}
      </Badge>
    );
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'text-green-600';
    if (confidence >= 0.6) return 'text-yellow-600';
    return 'text-red-600';
  };

  const optimizationColumns = [
    {
      key: 'itemName',
      title: 'Menu Item',
      sortable: true,
      render: (value: string, row: MenuOptimizationSuggestion) => (
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary-100 dark:bg-primary-900/30 rounded-lg flex items-center justify-center">
            <LightBulbIcon className="w-5 h-5 text-primary-600 dark:text-primary-400" />
          </div>
          <div>
            <p className="font-medium text-gray-900 dark:text-white">{value}</p>
            <div className="flex items-center gap-2 mt-1">
              <span className={`text-sm font-medium ${getConfidenceColor(row.confidence)}`}>
                {Math.round(row.confidence * 100)}% confidence
              </span>
            </div>
          </div>
        </div>
      ),
    },
    {
      key: 'currentPrice',
      title: 'Current Price',
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
      key: 'suggestedPrice',
      title: 'Suggested Price',
      align: 'right' as const,
      render: (value: number, row: MenuOptimizationSuggestion) => (
        <div className="text-right">
          <p className="font-semibold text-gray-900 dark:text-white">
            {formatCurrency(value)}
          </p>
          {row.priceChange !== 0 && (
            <p className={`text-sm ${row.priceChange > 0 ? 'text-green-600' : 'text-red-600'}`}>
              {row.priceChange > 0 ? '+' : ''}{row.priceChange.toFixed(1)}%
            </p>
          )}
        </div>
      ),
    },
    {
      key: 'demandScore',
      title: 'Demand Score',
      align: 'center' as const,
      render: (value: number) => (
        <div className="text-center">
          <div className="flex items-center justify-center gap-1">
            <div className="flex">
              {Array.from({ length: 10 }, (_, i) => (
                <div
                  key={i}
                  className={`w-2 h-2 rounded-full ${i < value ? 'bg-green-500' : 'bg-gray-300'}`}
                />
              ))}
            </div>
            <span className="text-sm font-medium text-gray-900 dark:text-white ml-2">
              {value}/10
            </span>
          </div>
        </div>
      ),
    },
    {
      key: 'popularityScore',
      title: 'Popularity',
      align: 'center' as const,
      render: (value: number) => (
        <div className="text-center">
          <div className="flex items-center justify-center gap-1">
            {Array.from({ length: 5 }, (_, i) => (
              <span
                key={i}
                className={`text-sm ${i < Math.floor(value) ? 'text-yellow-400' : 'text-gray-300'}`}
              >
                ★
              </span>
            ))}
            <span className="text-sm text-gray-600 dark:text-gray-400 ml-1">
              ({value.toFixed(1)})
            </span>
          </div>
        </div>
      ),
    },
    {
      key: 'recommendation',
      title: 'AI Recommendation',
      render: (value: MenuOptimizationSuggestion['recommendation']) => getRecommendationBadge(value),
    },
    {
      key: 'expectedImpact',
      title: 'Expected Impact',
      render: (value: any, row: MenuOptimizationSuggestion) => (
        <div className="text-center">
          <p className="font-semibold text-green-600">
            +{formatCurrency(row.expectedImpact.revenue)}
          </p>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            +{row.expectedImpact.orders} orders
          </p>
        </div>
      ),
    },
    {
      key: 'actions',
      title: 'Actions',
      render: (value: any, row: MenuOptimizationSuggestion) => (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => openDetailsModal(row)}
        >
          <EyeIcon className="w-4 h-4" />
        </Button>
      ),
    },
  ];

  const demandColumns = [
    {
      key: 'itemName',
      title: 'Menu Item',
      sortable: true,
      render: (value: string, row: DemandPrediction) => (
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
            <ChartBarIcon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <p className="font-medium text-gray-900 dark:text-white">{value}</p>
            <p className={`text-sm font-medium ${getConfidenceColor(row.confidence)}`}>
              {Math.round(row.confidence * 100)}% confidence
            </p>
          </div>
        </div>
      ),
    },
    {
      key: 'predictedDemand',
      title: 'Predicted Demand',
      align: 'right' as const,
      render: (value: number) => (
        <div className="text-right">
          <p className="font-semibold text-gray-900 dark:text-white">
            {value} orders
          </p>
        </div>
      ),
    },
    {
      key: 'factors',
      title: 'Key Factors',
      render: (value: DemandPrediction['factors']) => (
        <div className="space-y-1">
          {Object.entries(value).map(([factor, score]) => (
            <div key={factor} className="flex items-center gap-2">
              <div className="w-16 h-1 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all duration-300 ${
                    score >= 0.7 ? 'bg-green-500' :
                    score >= 0.4 ? 'bg-yellow-500' : 'bg-red-500'
                  }`}
                  style={{ width: `${score * 100}%` }}
                />
              </div>
              <span className="text-xs text-gray-600 dark:text-gray-400 capitalize">
                {factor.replace(/([A-Z])/g, ' $1').trim()}
              </span>
            </div>
          ))}
        </div>
      ),
    },
    {
      key: 'recommendations',
      title: 'AI Recommendations',
      render: (value: string[]) => (
        <div className="space-y-1">
          {value.slice(0, 2).map((rec, index) => (
            <Badge key={index} variant="info" className="text-xs">
              {rec.length > 30 ? `${rec.substring(0, 30)}...` : rec}
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
  ];

  // Prepare chart data
  const optimizationChartData = useMemo(() => {
    if (!optimizationData || !Array.isArray(optimizationData)) return [];
    return optimizationData.slice(0, 8).map(item => ({
      name: item.itemName.length > 15 ? `${item.itemName.substring(0, 15)}...` : item.itemName,
      currentPrice: item.currentPrice || 0,
      suggestedPrice: item.suggestedPrice || 0,
      demandScore: item.demandScore || 0,
    }));
  }, [optimizationData]);

  const demandChartData = useMemo(() => {
    if (!demandData || !Array.isArray(demandData)) return [];
    return demandData.slice(0, 8).map(item => ({
      name: item.itemName.length > 15 ? `${item.itemName.substring(0, 15)}...` : item.itemName,
      predictedDemand: item.predictedDemand || 0,
    }));
  }, [demandData]);

  const stats = useMemo(() => {
    const optimizations = Array.isArray(optimizationData) ? optimizationData : [];
    return {
      totalOptimizations: optimizations.length,
      priceIncreases: optimizations.filter(o => o.recommendation === 'increase_price').length,
      priceDecreases: optimizations.filter(o => o.recommendation === 'decrease_price').length,
      totalRevenueImpact: optimizations.reduce((sum, o) => sum + (o.expectedImpact?.revenue || 0), 0),
      avgConfidence: optimizations.length > 0 
        ? optimizations.reduce((sum, o) => sum + (o.confidence || 0), 0) / optimizations.length 
        : 0,
    };
  }, [optimizationData]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">AI Menu Optimization</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            AI-powered insights to optimize your menu pricing and performance
          </p>
        </div>
        <Button onClick={() => refetchOptimization()}>
          <SparklesIcon className="w-5 h-5 mr-2" />
          Refresh AI Analysis
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Total Suggestions</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white">{stats.totalOptimizations}</p>
              </div>
              <LightBulbIcon className="w-8 h-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Price Increases</p>
                <p className="text-3xl font-bold text-green-600">{stats.priceIncreases}</p>
              </div>
              <ArrowTrendingUpIcon className="w-8 h-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Price Decreases</p>
                <p className="text-3xl font-bold text-red-600">{stats.priceDecreases}</p>
              </div>
              <ArrowTrendingDownIcon className="w-8 h-8 text-red-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Revenue Impact</p>
                <p className="text-3xl font-bold text-purple-600">{formatCurrency(stats.totalRevenueImpact)}</p>
              </div>
              <ChartBarIcon className="w-8 h-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Avg Confidence</p>
                <p className="text-3xl font-bold text-yellow-600">{Math.round(stats.avgConfidence * 100)}%</p>
              </div>
              <SparklesIcon className="w-8 h-8 text-yellow-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="w-full sm:w-48">
              <Select
                options={categoryOptions}
                value={selectedCategory}
                onChange={setSelectedCategory}
                placeholder="Filter by category"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Price Optimization Overview</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={optimizationChartData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200 dark:stroke-gray-700" />
                <XAxis dataKey="name" className="text-sm" />
                <YAxis className="text-sm" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'rgba(255, 255, 255, 0.95)',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                  }}
                  formatter={(value: any, name: string) => [
                    formatCurrency(value),
                    name === 'currentPrice' ? 'Current Price' : 'Suggested Price'
                  ]}
                />
                <Bar dataKey="currentPrice" fill="#8b5cf6" name="Current Price" />
                <Bar dataKey="suggestedPrice" fill="#10b981" name="Suggested Price" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Demand Predictions</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={demandChartData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200 dark:stroke-gray-700" />
                <XAxis dataKey="name" className="text-sm" />
                <YAxis className="text-sm" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'rgba(255, 255, 255, 0.95)',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                  }}
                />
                <Bar dataKey="predictedDemand" fill="#f59e0b" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Optimization Suggestions Table */}
      <Card>
        <CardHeader>
          <CardTitle>AI Optimization Suggestions</CardTitle>
        </CardHeader>
        <CardContent>
          {optimizationError && (
            <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-4 mb-4">
              <p className="text-red-800 dark:text-red-400 text-sm">
                Error loading optimization data. Please try refreshing.
              </p>
            </div>
          )}
          <DataTable
            data={Array.isArray(optimizationData) ? optimizationData : []}
            columns={optimizationColumns}
            loading={optimizationLoading}
            searchable={false}
            selectable={false}
            exportable={true}
            exportFilename="menu-optimization"
            onExport={(format, items) => {
              console.log(`Exporting ${items.length} optimization suggestions as ${format}`);
            }}
            emptyMessage="No optimization suggestions available. The AI will analyze your menu data and provide suggestions soon."
          />
        </CardContent>
      </Card>

      {/* Demand Predictions Table */}
      <Card>
        <CardHeader>
          <CardTitle>Demand Predictions</CardTitle>
        </CardHeader>
        <CardContent>
          {demandError && (
            <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-4 mb-4">
              <p className="text-red-800 dark:text-red-400 text-sm">
                Error loading demand predictions. Please try refreshing.
              </p>
            </div>
          )}
          <DataTable
            data={Array.isArray(demandData) ? demandData : []}
            columns={demandColumns}
            loading={demandLoading}
            searchable={false}
            selectable={false}
            exportable={true}
            exportFilename="demand-predictions"
            onExport={(format, items) => {
              console.log(`Exporting ${items.length} demand predictions as ${format}`);
            }}
            emptyMessage="No demand predictions available. The AI will analyze your sales data and provide predictions soon."
          />
        </CardContent>
      </Card>

      {/* Suggestion Details Modal */}
      <Modal
        isOpen={isDetailsModalOpen}
        onClose={() => {
          setIsDetailsModalOpen(false);
          setSelectedSuggestion(null);
        }}
        title={`Optimization Details - ${selectedSuggestion?.itemName}`}
        className="max-w-4xl"
      >
        {selectedSuggestion && (
          <div className="space-y-6">
            {/* Header */}
            <div className="flex items-start gap-6">
              <div className="w-16 h-16 bg-primary-100 dark:bg-primary-900/30 rounded-lg flex items-center justify-center">
                <LightBulbIcon className="w-8 h-8 text-primary-600 dark:text-primary-400" />
              </div>
              <div className="flex-1">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                      {selectedSuggestion.itemName}
                    </h3>
                    <div className="flex items-center gap-2 mt-2">
                      {getRecommendationBadge(selectedSuggestion.recommendation)}
                      <span className={`text-sm font-medium ${getConfidenceColor(selectedSuggestion.confidence)}`}>
                        {Math.round(selectedSuggestion.confidence * 100)}% confidence
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-600 dark:text-gray-400">Current Price</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">
                      {formatCurrency(selectedSuggestion.currentPrice)}
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Suggested Price</p>
                    <p className="text-xl font-semibold text-primary-600">
                      {formatCurrency(selectedSuggestion.suggestedPrice)}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Analysis Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-medium text-gray-900 dark:text-white mb-3">Current Performance</h4>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600 dark:text-gray-400">Demand Score:</span>
                    <div className="flex items-center gap-2">
                      <div className="flex">
                        {Array.from({ length: 10 }, (_, i) => (
                          <div
                            key={i}
                            className={`w-2 h-2 rounded-full ${i < selectedSuggestion.demandScore ? 'bg-green-500' : 'bg-gray-300'}`}
                          />
                        ))}
                      </div>
                      <span className="font-medium text-gray-900 dark:text-white">
                        {selectedSuggestion.demandScore}/10
                      </span>
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600 dark:text-gray-400">Popularity Score:</span>
                    <div className="flex items-center gap-1">
                      {Array.from({ length: 5 }, (_, i) => (
                        <span
                          key={i}
                          className={`text-sm ${i < Math.floor(selectedSuggestion.popularityScore) ? 'text-yellow-400' : 'text-gray-300'}`}
                        >
                          ★
                        </span>
                      ))}
                      <span className="font-medium text-gray-900 dark:text-white ml-1">
                        {selectedSuggestion.popularityScore.toFixed(1)}
                      </span>
                    </div>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Profit Margin:</span>
                    <span className="font-medium text-gray-900 dark:text-white">
                      {selectedSuggestion.profitMargin.toFixed(1)}%
                    </span>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="font-medium text-gray-900 dark:text-white mb-3">Expected Impact</h4>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Revenue Change:</span>
                    <span className={`font-medium ${selectedSuggestion.expectedImpact.revenue >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {selectedSuggestion.expectedImpact.revenue >= 0 ? '+' : ''}{formatCurrency(selectedSuggestion.expectedImpact.revenue)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Profit Change:</span>
                    <span className={`font-medium ${selectedSuggestion.expectedImpact.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {selectedSuggestion.expectedImpact.profit >= 0 ? '+' : ''}{formatCurrency(selectedSuggestion.expectedImpact.profit)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Order Change:</span>
                    <span className={`font-medium ${selectedSuggestion.expectedImpact.orders >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {selectedSuggestion.expectedImpact.orders >= 0 ? '+' : ''}{selectedSuggestion.expectedImpact.orders}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* AI Reasoning */}
            <div>
              <h4 className="font-medium text-gray-900 dark:text-white mb-3">AI Analysis & Reasoning</h4>
              <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
                <p className="text-blue-800 dark:text-blue-400">
                  {selectedSuggestion.reasoning}
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
              <Button
                variant="secondary"
                onClick={() => {
                  setIsDetailsModalOpen(false);
                  setSelectedSuggestion(null);
                }}
              >
                Close
              </Button>
              <Button onClick={handleApplySuggestion}>
                <CheckCircleIcon className="w-4 h-4 mr-2" />
                Apply Suggestion
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
