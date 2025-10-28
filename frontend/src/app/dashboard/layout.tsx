'use client';

import { Sidebar } from '@/components/layout/Sidebar';
import { Topbar } from '@/components/layout/Topbar';
import { DashboardSkeleton } from '@/components/ui/DashboardSkeleton';
import { SubscriptionIndicator } from '@/components/ui/SubscriptionIndicator';
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

  // Check if auth state is being restored
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsInitializing(false);
    }, 1000); // Give time for auth restoration

    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!isInitializing && !isAuthenticated) {
      router.push('/auth/login');
    }
  }, [isAuthenticated, isInitializing, router]);

  // Listen for sidebar state changes
  useEffect(() => {
    const handleSidebarToggle = (event: CustomEvent) => {
      setSidebarCollapsed(event.detail.collapsed);
    };

    window.addEventListener('sidebar-toggle', handleSidebarToggle as EventListener);
    return () => {
      window.removeEventListener('sidebar-toggle', handleSidebarToggle as EventListener);
    };
  }, []);

  // Show skeleton while initializing or if not authenticated
  if (isInitializing || !isAuthenticated || !user) {
    return <DashboardSkeleton />;
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Sidebar />
      <div 
        className={`transition-all duration-300 ${
          sidebarCollapsed ? 'lg:ml-16' : 'lg:ml-64'
        }`}
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
        
        {/* Main content with top padding to account for fixed navbar */}
        <main className="pt-0 py-6">
          <div className="mx-auto w-full px-4">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}