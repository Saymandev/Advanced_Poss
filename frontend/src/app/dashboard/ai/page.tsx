'use client';

import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { useFeatureRedirect } from '@/hooks/useFeatureRedirect';
import { useGetMenuOptimizationQuery } from '@/lib/api/endpoints/aiApi';
import { useGetPOSStatsQuery } from '@/lib/api/endpoints/posApi';
import { useAppSelector } from '@/lib/store';
import { formatCurrency } from '@/lib/utils';
import {
  ChartBarIcon,
  ClockIcon,
  CurrencyDollarIcon,
  LightBulbIcon,
  ShoppingBagIcon,
  SparklesIcon,
} from '@heroicons/react/24/outline';
import Link from 'next/link';
import { useMemo } from 'react';

export default function AIPage() {
  useFeatureRedirect('ai-insights');
  const { user } = useAppSelector((state) => state.auth);
  const branchId = user?.branchId;
  const today = new Date().toISOString().split('T')[0];

  const { data: statsData } = useGetPOSStatsQuery(
    { branchId: branchId || undefined, date: today },
    { skip: !branchId }
  );

  const { data: optimizationData, isLoading: optLoading } = useGetMenuOptimizationQuery(
    { branchId: branchId || undefined },
    { skip: !branchId }
  );

  const stats = useMemo(() => {
    const d = (statsData as any) || {};
    return {
      ordersToday: d.ordersToday || d.totalOrders || 0,
      revenueToday: d.revenueToday || d.totalRevenue || 0,
      avgValue: d.averageOrderValue || d.avgOrderValue || 0,
    };
  }, [statsData]);

  const suggestions = useMemo(() => {
    if (!optimizationData) return [];
    const d = (optimizationData as any);
    if (Array.isArray(d)) return d;
    if (d.data) return Array.isArray(d.data) ? d.data : [];
    if (d.suggestions) return d.suggestions;
    if (d.recommendations) return d.recommendations;
    return [];
  }, [optimizationData]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
            <SparklesIcon className="w-8 h-8 text-purple-600 dark:text-purple-400" />
            AI Insights & Recommendations
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Data-driven insights powered by analytics
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
              <CurrencyDollarIcon className="w-5 h-5 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">Revenue Today</p>
              <p className="text-lg font-bold">{formatCurrency(stats.revenueToday)}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <ShoppingBagIcon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">Orders Today</p>
              <p className="text-lg font-bold">{stats.ordersToday}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
              <CurrencyDollarIcon className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">Avg Order Value</p>
              <p className="text-lg font-bold">{formatCurrency(stats.avgValue)}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {optLoading ? (
        <Card>
          <CardContent className="p-8">
            <div className="animate-pulse space-y-3">
              <div className="h-4 bg-gray-200 dark:bg-slate-800 rounded w-3/4" />
              <div className="h-4 bg-gray-200 dark:bg-slate-800 rounded w-1/2" />
            </div>
          </CardContent>
        </Card>
      ) : suggestions.length > 0 ? (
        <div className="space-y-4">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <LightBulbIcon className="w-5 h-5 text-yellow-500" />
            Menu Optimization Recommendations
          </h2>
          {suggestions.slice(0, 5).map((s: any, idx: number) => (
            <Card key={idx} className="border-l-4 border-l-purple-500">
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-semibold text-gray-900 dark:text-white">
                      {s.itemName || s.name || s.title || `Suggestion #${idx + 1}`}
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                      {s.reasoning || s.description || s.recommendation || ''}
                    </p>
                    {s.currentPrice && s.suggestedPrice && (
                      <p className="text-xs text-gray-500 mt-2">
                        {formatCurrency(s.currentPrice)} → {formatCurrency(s.suggestedPrice)}
                        <span className="ml-2 text-green-600">
                          ({s.priceChange > 0 ? '+' : ''}{s.priceChange || 0}%)
                        </span>
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="p-8 text-center">
            <LightBulbIcon className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-600 dark:text-gray-400">
              Navigate to Menu Optimization for AI-powered pricing and demand insights.
            </p>
            <Link href="/dashboard/ai-menu-optimization">
              <Button className="mt-4">Open Menu Optimization</Button>
            </Link>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>AI Analysis Tools</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Link href="/dashboard/ai-menu-optimization">
              <Button variant="secondary" className="h-24 w-full flex-col">
                <ChartBarIcon className="w-8 h-8 mb-2" />
                <div className="font-semibold">Menu Optimization</div>
              </Button>
            </Link>
            <Link href="/dashboard/customer-loyalty-ai">
              <Button variant="secondary" className="h-24 w-full flex-col">
                <SparklesIcon className="w-8 h-8 mb-2" />
                <div className="font-semibold">Customer Insights</div>
              </Button>
            </Link>
            <Link href="/dashboard/reports">
              <Button variant="secondary" className="h-24 w-full flex-col">
                <ChartBarIcon className="w-8 h-8 mb-2" />
                <div className="font-semibold">Reports</div>
              </Button>
            </Link>
            <Link href="/dashboard/work-periods">
              <Button variant="secondary" className="h-24 w-full flex-col">
                <ClockIcon className="w-8 h-8 mb-2" />
                <div className="font-semibold">Work Periods</div>
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
