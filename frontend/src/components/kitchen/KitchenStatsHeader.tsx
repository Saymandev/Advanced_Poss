'use client';

import { Card } from '@/components/ui/Card';
import {
    BoltIcon,
    ChartBarIcon,
    CheckCircleIcon,
    ClockIcon,
    ExclamationTriangleIcon,
    FireIcon
} from '@heroicons/react/24/outline';

interface KitchenStatsHeaderProps {
  stats: {
    pending: number;
    preparing: number;
    ready: number;
    delayed: number;
    avgPrepTime: number;
    ordersCompleted: number;
  } | undefined;
  isLoading: boolean;
  isConnected: boolean;
}

export default function KitchenStatsHeader({ stats, isLoading, isConnected }: KitchenStatsHeaderProps) {
  const statItems = [
    {
      label: 'Pending',
      value: stats?.pending ?? 0,
      icon: ClockIcon,
      color: 'text-yellow-600 dark:text-yellow-500',
      bgColor: 'bg-yellow-50 dark:bg-yellow-900/20',
    },
    {
      label: 'Preparing',
      value: stats?.preparing ?? 0,
      icon: FireIcon,
      color: 'text-blue-600 dark:text-blue-500',
      bgColor: 'bg-blue-50 dark:bg-blue-900/20',
    },
    {
      label: 'Ready',
      value: stats?.ready ?? 0,
      icon: CheckCircleIcon,
      color: 'text-green-600 dark:text-green-500',
      bgColor: 'bg-green-50 dark:bg-green-900/20',
    },
    {
      label: 'Delayed',
      value: stats?.delayed ?? 0,
      icon: ExclamationTriangleIcon,
      color: 'text-red-600 dark:text-red-500',
      bgColor: 'bg-red-50 dark:bg-red-900/20',
    },
    {
      label: 'Avg Prep',
      value: `${Math.round(stats?.avgPrepTime ?? 0)}m`,
      icon: BoltIcon,
      color: 'text-purple-600 dark:text-purple-500',
      bgColor: 'bg-purple-50 dark:bg-purple-900/20',
    },
    {
      label: 'Completed',
      value: stats?.ordersCompleted ?? 0,
      icon: ChartBarIcon,
      color: 'text-indigo-600 dark:text-indigo-500',
      bgColor: 'bg-indigo-50 dark:bg-indigo-900/20',
    },
  ];

  return (
    <Card className="overflow-hidden border-none shadow-sm bg-white/50 dark:bg-gray-800/50 backdrop-blur-md">
      <div className="flex flex-wrap items-center justify-between p-2 sm:p-4 gap-3">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]' : 'bg-red-500'} ${isConnected ? 'animate-pulse' : ''}`} />
          </div>
          <span className="text-xs font-medium text-gray-500 dark:text-gray-400 hidden sm:inline">
            {isConnected ? 'LIVE CONNECTION' : 'DISCONNECTED'}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:gap-6">
          {statItems.map((item, index) => (
            <div key={index} className="flex items-center gap-2 px-2 py-1 rounded-lg transition-all hover:bg-gray-100 dark:hover:bg-gray-700/50">
              <div className={`p-1.5 rounded-md ${item.bgColor}`}>
                <item.icon className={`w-4 h-4 ${item.color}`} />
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] sm:text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  {item.label}
                </span>
                <span className="text-sm sm:text-lg font-bold text-gray-900 dark:text-white leading-tight">
                  {isLoading ? '...' : item.value}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}
