'use client';

import { Sidebar } from '@/components/layout/Sidebar';
import { Topbar } from '@/components/layout/Topbar';
import { OrderNotificationManager } from '@/components/orders/OrderNotificationManager';
import { DashboardSkeleton } from '@/components/ui/DashboardSkeleton';
import { SubscriptionIndicator } from '@/components/ui/SubscriptionIndicator';
import { FeedbackTrigger } from '@/components/feedback/FeedbackTrigger';
import { useAppSelector } from '@/lib/store';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isAuthenticated, user } = useAppSelector((state) => state.auth);
  const router = useRouter();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const [mounted, setMounted] = useState(false);

  // Ensure component is mounted on client
  useEffect(() => {
    setMounted(true);
  }, []);

  // Check if auth state is being restored
  useEffect(() => {
    if (!mounted) return;
    
    const timer = setTimeout(() => {
      setIsInitializing(false);
    }, 1000); // Give time for auth restoration

    return () => clearTimeout(timer);
  }, [mounted]);

  useEffect(() => {
    if (!mounted || isInitializing) return;
    
    if (!isAuthenticated) {
      router.push('/auth/login');
    }
  }, [isAuthenticated, isInitializing, mounted, router]);

  // Listen for sidebar state changes
  useEffect(() => {
    if (!mounted || typeof window === 'undefined') return;
    
    const handleSidebarToggle = (event: CustomEvent) => {
      setSidebarCollapsed(event.detail.collapsed);
    };

    window.addEventListener('sidebar-toggle', handleSidebarToggle as EventListener);
    return () => {
      window.removeEventListener('sidebar-toggle', handleSidebarToggle as EventListener);
    };
  }, [mounted]);

  // Show skeleton while mounting, initializing or if not authenticated
  // During SSR, always return skeleton to avoid hydration mismatch
  if (!mounted || isInitializing || !isAuthenticated || !user) {
    return <DashboardSkeleton />;
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900" suppressHydrationWarning>
      <Sidebar />
      <div 
        className={`transition-all duration-300 ${
          sidebarCollapsed ? 'lg:ml-16' : 'lg:ml-64'
        }`}
        suppressHydrationWarning
      >
        {/* Fixed Topbar */}
        <div 
          className={`fixed top-0 right-0 z-40 transition-all duration-300 ${
            sidebarCollapsed ? 'left-16' : 'left-64'
          }`}
        >
          <Topbar />
        </div>
        
        {/* Subscription/Trial Indicator */}
        <div className={`mt-16 ${sidebarCollapsed ? 'ml-0' : 'ml-0'}`}>
          <SubscriptionIndicator />
        </div>
        
        {/* Order Notification Manager - Shows modal for new orders (owner/manager only) */}
        <OrderNotificationManager />
        
        {/* Feedback Trigger - Shows feedback modal randomly for company owners */}
        <FeedbackTrigger />
        
        {/* Main content with top padding to account for fixed navbar */}
        <main className="pt-0 py-6" suppressHydrationWarning>
          <div className="mx-auto w-full px-4">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}