'use client';

import { useEffect, useState } from 'react';

interface TrialModeIndicatorProps {
  trialEndDate: string;
  subscriptionStatus: string;
  className?: string;
}

export default function TrialModeIndicator({ 
  trialEndDate, 
  subscriptionStatus, 
  className = '' 
}: TrialModeIndicatorProps) {
  const [timeLeft, setTimeLeft] = useState<string>('');
  const [isExpired, setIsExpired] = useState(false);

  useEffect(() => {
    const updateTimeLeft = () => {
      const now = new Date().getTime();
      const trialEnd = new Date(trialEndDate).getTime();
      const difference = trialEnd - now;

      if (difference <= 0) {
        setIsExpired(true);
        setTimeLeft('Trial expired');
        return;
      }

      const hours = Math.floor(difference / (1000 * 60 * 60));
      const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((difference % (1000 * 60)) / 1000);

      if (hours > 0) {
        setTimeLeft(`${hours}h ${minutes}m ${seconds}s`);
      } else if (minutes > 0) {
        setTimeLeft(`${minutes}m ${seconds}s`);
      } else {
        setTimeLeft(`${seconds}s`);
      }
    };

    updateTimeLeft();
    const interval = setInterval(updateTimeLeft, 1000);

    return () => clearInterval(interval);
  }, [trialEndDate]);

  if (subscriptionStatus !== 'trial') {
    return null;
  }

  return (
    <div className={`bg-yellow-100 dark:bg-yellow-900 border border-yellow-300 dark:border-yellow-700 rounded-lg p-3 ${className}`}>
      <div className="flex items-center">
        <div className="flex-shrink-0">
          <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
        </div>
        <div className="ml-3">
          <h3 className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
            Trial Mode Active
          </h3>
          <div className="mt-1 text-sm text-yellow-700 dark:text-yellow-300">
            {isExpired ? (
              <span className="text-red-600 dark:text-red-400 font-semibold">
                Your trial has expired. Please upgrade to continue using the service.
              </span>
            ) : (
              <span>
                Time remaining: <span className="font-semibold">{timeLeft}</span>
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
