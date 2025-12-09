'use client';

import { useGetCompanyByIdQuery } from '@/lib/api/endpoints/companiesApi';
import { useAppSelector } from '@/lib/store';
import { ClockIcon, ExclamationTriangleIcon, XCircleIcon } from '@heroicons/react/24/outline';
import Link from 'next/link';
import { useEffect, useState } from 'react';

interface TimeRemaining {
  days: number;
  hours: number;
  minutes: number;
  totalMs: number;
}

export function SubscriptionIndicator() {
  const { user } = useAppSelector((state) => state.auth);
  
  // Super Admins don't need subscription indicators - they manage system-wide subscriptions
  const isSuperAdmin = user?.role === 'SUPER_ADMIN' || user?.role === 'super_admin';
  
  const companyId = user?.companyId;
  
  // All hooks must be called unconditionally at the top level
  const { data: companyData, isLoading } = useGetCompanyByIdQuery(companyId || '', {
    skip: !companyId || isSuperAdmin, // Skip if no companyId or super admin
    refetchOnMountOrArgChange: true,
    // Refetch more aggressively to catch payment status changes
    refetchOnFocus: true,
    refetchOnReconnect: true,
  });

  const [timeRemaining, setTimeRemaining] = useState<TimeRemaining | null>(null);
  const [isExpired, setIsExpired] = useState(false);
  
  // Early return for super admins AFTER hooks are called
  if (isSuperAdmin) {
    return null;
  }

  useEffect(() => {
    if (!companyData) return;

    const company = companyData as any;
    const status = company.subscriptionStatus || company.subscription?.status;
    const trialEndDateValue = company.trialEndDate;
    
    // DEBUG: Log the actual values to see what we're getting
    console.log('🔍 SubscriptionIndicator Debug:', {
      subscriptionStatus: status,
      trialEndDate: trialEndDateValue,
      trialEndDateType: typeof trialEndDateValue,
      isNull: trialEndDateValue === null,
      isUndefined: trialEndDateValue === undefined,
      companyKeys: Object.keys(company),
    });
    
    // CRITICAL: If subscription status is 'active', don't show trial banner at all
    // This means payment was successful and subscription is active
    // Check for both 'active' (lowercase) and 'ACTIVE' (uppercase)
    if (status === 'active' || status === 'ACTIVE') {
      console.log('✅ Subscription is ACTIVE - hiding trial banner');
      setTimeRemaining(null);
      setIsExpired(false);
      return;
    }
    
    // Also check if trialEndDate is null/undefined - if it is and status isn't trial, it's active
    if ((trialEndDateValue === null || trialEndDateValue === undefined || trialEndDateValue === '') && status !== 'trial') {
      console.log('✅ No trial end date and status is not trial - hiding trial banner');
      setTimeRemaining(null);
      setIsExpired(false);
      return;
    }
    
    // Only calculate trial time if status is actually 'trial'
    // Also check if trialEndDate exists and is not null/empty
    const endDate = company.trialEndDate || company.subscription?.endDate || company.subscriptionEndDate;
    
    // If no end date, don't show trial banner
    if (!endDate || endDate === null || endDate === 'null' || endDate === '') {
      setTimeRemaining(null);
      return;
    }

    const calculateRemaining = () => {
      const now = new Date().getTime();
      const end = new Date(endDate).getTime();
      const diff = end - now;

      if (diff <= 0) {
        setIsExpired(true);
        setTimeRemaining({ days: 0, hours: 0, minutes: 0, totalMs: 0 });
        return;
      }

      setIsExpired(false);
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

      setTimeRemaining({ days, hours, minutes, totalMs: diff });
    };

    calculateRemaining();
    const interval = setInterval(calculateRemaining, 60000); // Update every minute

    return () => clearInterval(interval);
  }, [companyData]);

  // If loading or no company data, don't show anything
  if (isLoading || !companyData) {
    return null;
  }

  const company = companyData as any;
  const status = company.subscriptionStatus || company.subscription?.status;
  const trialEndDateValue = company.trialEndDate;
  const plan = company.subscriptionPlan || company.subscription?.planName || 'basic';
  
  // CRITICAL: If subscription status is 'active', never show the trial banner
  // This is the most important check - if status is active, payment was successful
  if (status === 'active' || status === 'ACTIVE') {
    console.log('✅ Final check: Status is active - NOT showing trial banner');
    return null;
  }
  
  // Also check: if trialEndDate is null/undefined and status is not 'trial', hide banner
  if ((trialEndDateValue === null || trialEndDateValue === undefined || trialEndDateValue === '') && status !== 'trial' && status !== 'TRIAL') {
    console.log('✅ Final check: No trial end date and not in trial - NOT showing trial banner');
    return null;
  }
  
  // Only show trial banner if status is explicitly 'trial'
  const isTrial = status === 'trial' || status === 'TRIAL' || (!status && trialEndDateValue);

  // If no time remaining calculated (no trial period), don't show
  if (!timeRemaining) {
    return null;
  }

  const isAboutToExpire = timeRemaining.totalMs > 0 && timeRemaining.totalMs < 24 * 60 * 60 * 1000; // Less than 24 hours

  // Format time display
  const formatTime = () => {
    if (isExpired) return 'Expired';
    if (timeRemaining.days > 0) {
      return `${timeRemaining.days}d ${timeRemaining.hours}h remaining`;
    }
    if (timeRemaining.hours > 0) {
      return `${timeRemaining.hours}h ${timeRemaining.minutes}m remaining`;
    }
    return `${timeRemaining.minutes}m remaining`;
  };

  // Get styles based on status
  const getStyles = () => {
    if (isExpired) {
      return {
        bg: 'bg-red-50 dark:bg-red-900/20',
        border: 'border-red-200 dark:border-red-800',
        text: 'text-red-800 dark:text-red-200',
        icon: XCircleIcon,
      };
    }
    if (isAboutToExpire) {
      return {
        bg: 'bg-orange-50 dark:bg-orange-900/20',
        border: 'border-orange-200 dark:border-orange-800',
        text: 'text-orange-800 dark:text-orange-200',
        icon: ExclamationTriangleIcon,
      };
    }
    return {
      bg: 'bg-blue-50 dark:bg-blue-900/20',
      border: 'border-blue-200 dark:border-blue-800',
      text: 'text-blue-800 dark:text-blue-200',
      icon: ClockIcon,
    };
  };

  const styles = getStyles();
  const Icon = styles.icon;
  const planNames: Record<string, string> = {
    basic: 'Free Trial',
    premium: 'Premium',
    enterprise: 'Enterprise',
  };

  return (
    <div
      className={`${styles.bg} ${styles.border} border-t-2 py-3 px-4 shadow-sm`}
    >
      <div className="flex items-center justify-between max-w-7xl mx-auto">
        <div className="flex items-center gap-3">
          <Icon className={`w-5 h-5 ${styles.text}`} />
          <div>
            <p className={`text-sm font-medium ${styles.text}`}>
              {isExpired ? (
                `${planNames[plan] || plan} subscription has expired`
              ) : isTrial ? (
                `Free Trial: ${formatTime()}`
              ) : (
                `${planNames[plan] || plan} expires in: ${formatTime()}`
              )}
            </p>
            {!isExpired && (
              <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">
                {isTrial 
                  ? 'Upgrade to Premium or Enterprise to continue after trial'
                  : 'Renew your subscription to continue using all features'}
              </p>
            )}
          </div>
        </div>
        <Link
          href="/dashboard/subscriptions"
          className="px-4 py-1.5 text-sm font-medium bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors"
        >
          {isExpired ? 'Reactivate' : isTrial ? 'Upgrade Now' : 'Renew Now'}
        </Link>
      </div>
    </div>
  );
}

