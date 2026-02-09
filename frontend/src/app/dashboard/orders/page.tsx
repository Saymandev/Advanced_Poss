'use client';
import { useFeatureRedirect } from '@/hooks/useFeatureRedirect';

export default function OrdersPage() {
  // Redirect if user doesn't have order-management feature
  useFeatureRedirect('order-management');
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Orders</h1>
      <p className="text-gray-600 dark:text-gray-400">Orders management page</p>
    </div>
  );
}

