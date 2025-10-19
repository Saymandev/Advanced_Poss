'use client';

import TrialModeIndicator from '@/components/ui/TrialModeIndicator';
import { RootState } from '@/lib/store';
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { useSelector } from 'react-redux';

interface SubscriptionStatusProps {
  className?: string;
}

interface SubscriptionData {
  companyId: string;
  companyName: string;
  subscriptionStatus: string;
  trialEndDate?: string;
  isExpired: boolean;
  isExpiringSoon: boolean;
  timeLeft: number;
}

export default function SubscriptionStatus({ className = '' }: SubscriptionStatusProps) {
  const { user } = useSelector((state: RootState) => state.auth);
  const [subscriptionData, setSubscriptionData] = useState<SubscriptionData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (user?.companyId) {
      fetchSubscriptionStatus();
    }
  }, [user?.companyId]);

  const fetchSubscriptionStatus = async () => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/subscription-management/status`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setSubscriptionData(data);
      }
    } catch (error) {
      console.error('Error fetching subscription status:', error);
    } finally {
      setIsLoading(false);
    }
  };


  const handleReactivate = async (planName: string) => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/subscription-management/reactivate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
        },
        body: JSON.stringify({ planName }),
      });

      if (response.ok) {
        const data = await response.json();
        window.location.href = data.url;
      } else {
        toast.error('Failed to initiate reactivation');
      }
    } catch (error) {
      console.error('Error reactivating account:', error);
      toast.error('Failed to reactivate account');
    }
  };

  if (isLoading) {
    return (
      <div className={`bg-gray-100 dark:bg-gray-800 rounded-lg p-4 ${className}`}>
        <div className="animate-pulse">
          <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-1/3 mb-2"></div>
          <div className="h-3 bg-gray-300 dark:bg-gray-600 rounded w-1/2"></div>
        </div>
      </div>
    );
  }

  if (!subscriptionData) {
    return null;
  }

  // Show trial mode indicator for trial subscriptions
  if (subscriptionData.subscriptionStatus === 'trial' && subscriptionData.trialEndDate) {
    return (
      <TrialModeIndicator
        trialEndDate={subscriptionData.trialEndDate}
        subscriptionStatus={subscriptionData.subscriptionStatus}
        className={className}
      />
    );
  }

  // Show expired account message
  if (subscriptionData.isExpired) {
    return (
      <div className={`bg-red-100 dark:bg-red-900 border border-red-300 dark:border-red-700 rounded-lg p-4 ${className}`}>
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-red-800 dark:text-red-200">
              Account Expired
            </h3>
            <div className="mt-1 text-sm text-red-700 dark:text-red-300">
              <p>Your subscription has expired. Please upgrade to continue using the service.</p>
              <div className="mt-3 flex space-x-2">
                <button
                  onClick={() => handleReactivate('premium')}
                  className="bg-red-600 hover:bg-red-700 text-white text-xs font-semibold py-2 px-3 rounded"
                >
                  Upgrade to Premium
                </button>
                <button
                  onClick={() => handleReactivate('enterprise')}
                  className="bg-gray-600 hover:bg-gray-700 text-white text-xs font-semibold py-2 px-3 rounded"
                >
                  Upgrade to Enterprise
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Show active subscription
  if (subscriptionData.subscriptionStatus === 'active') {
    return (
      <div className={`bg-green-100 dark:bg-green-900 border border-green-300 dark:border-green-700 rounded-lg p-4 ${className}`}>
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-green-800 dark:text-green-200">
              Subscription Active
            </h3>
            <p className="text-sm text-green-700 dark:text-green-300">
              Your subscription is active and all features are available.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
