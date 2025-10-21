'use client';

import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { ChartBarIcon, ExclamationTriangleIcon, LightBulbIcon, SparklesIcon } from '@heroicons/react/24/outline';

export default function AIPage() {
  const insights = [
    {
      type: 'recommendation',
      title: 'Optimize Menu Pricing',
      description: 'Based on sales data, consider increasing price of "Grilled Salmon" by 8% to maximize profit without affecting demand.',
      impact: 'high',
      icon: LightBulbIcon,
    },
    {
      type: 'prediction',
      title: 'Demand Forecast',
      description: 'Weekend traffic expected to increase by 35% this Saturday. Recommend scheduling 2 additional staff members.',
      impact: 'medium',
      icon: ChartBarIcon,
    },
    {
      type: 'alert',
      title: 'Inventory Alert',
      description: 'Chicken stock predicted to run out in 2 days based on current consumption rate. Restock immediately.',
      impact: 'critical',
      icon: ExclamationTriangleIcon,
    },
  ];

  const getImpactColor = (impact: string) => {
    switch (impact) {
      case 'critical':
        return 'border-red-300 bg-red-50 dark:bg-red-900/20';
      case 'high':
        return 'border-orange-300 bg-orange-50 dark:bg-orange-900/20';
      case 'medium':
        return 'border-yellow-300 bg-yellow-50 dark:bg-yellow-900/20';
      default:
        return 'border-blue-300 bg-blue-50 dark:bg-blue-900/20';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
            <SparklesIcon className="w-8 h-8 text-purple-600 dark:text-purple-400" />
            AI Insights & Recommendations
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">Powered by artificial intelligence</p>
        </div>
        <Button>
          <SparklesIcon className="w-5 h-5 mr-2" />
          Generate New Insights
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardContent className="p-6 text-center">
            <div className="text-4xl font-bold text-purple-600 dark:text-purple-400">87%</div>
            <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">Prediction Accuracy</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 text-center">
            <div className="text-4xl font-bold text-green-600 dark:text-green-400">+18%</div>
            <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">Revenue Improvement</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 text-center">
            <div className="text-4xl font-bold text-blue-600 dark:text-blue-400">24</div>
            <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">Active Insights</div>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4">
        {insights.map((insight, idx) => {
          const Icon = insight.icon;
          return (
            <Card key={idx} className={`border-2 ${getImpactColor(insight.impact)}`}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4">
                    <div className="p-3 bg-white dark:bg-gray-800 rounded-lg">
                      <Icon className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{insight.title}</CardTitle>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">{insight.description}</p>
                    </div>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold capitalize ${
                    insight.impact === 'critical'
                      ? 'bg-red-500 text-white'
                      : insight.impact === 'high'
                      ? 'bg-orange-500 text-white'
                      : 'bg-yellow-500 text-white'
                  }`}>
                    {insight.impact}
                  </span>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex gap-3">
                  <Button size="sm">Apply Recommendation</Button>
                  <Button size="sm" variant="secondary">View Details</Button>
                  <Button size="sm" variant="ghost">Dismiss</Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>AI Analysis Tools</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Button variant="secondary" className="h-24 flex-col">
              <ChartBarIcon className="w-8 h-8 mb-2" />
              <div className="font-semibold">Sales Analysis</div>
            </Button>
            <Button variant="secondary" className="h-24 flex-col">
              <SparklesIcon className="w-8 h-8 mb-2" />
              <div className="font-semibold">Demand Prediction</div>
            </Button>
            <Button variant="secondary" className="h-24 flex-col">
              <LightBulbIcon className="w-8 h-8 mb-2" />
              <div className="font-semibold">Menu Optimization</div>
            </Button>
            <Button variant="secondary" className="h-24 flex-col">
              <ChartBarIcon className="w-8 h-8 mb-2" />
              <div className="font-semibold">Customer Insights</div>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

