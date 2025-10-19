'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { useDispatch } from 'react-redux';

export default function PaymentSuccessPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const dispatch = useDispatch();
  const [isProcessing, setIsProcessing] = useState(true);

  useEffect(() => {
    const processPaymentSuccess = async () => {
      try {
        const sessionId = searchParams.get('session_id');
        if (!sessionId) {
          toast.error('Invalid payment session');
          router.push('/auth/register');
          return;
        }

        // Here you would typically verify the payment with your backend
        // For now, we'll just show success and redirect
        toast.success('Payment successful! Your subscription is now active.');
        
        // Update user state if needed
        // dispatch(setUser({ ...user, subscriptionStatus: 'active' }));

        // Redirect to dashboard after a short delay
        setTimeout(() => {
          router.push('/dashboard');
        }, 2000);

      } catch (error) {
        console.error('Payment processing error:', error);
        toast.error('Failed to process payment');
        router.push('/auth/register');
      } finally {
        setIsProcessing(false);
      }
    };

    processPaymentSuccess();
  }, [searchParams, router, dispatch]);

  if (isProcessing) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Processing your payment...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
      <div className="max-w-md mx-auto text-center">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8">
          <div className="w-16 h-16 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Payment Successful!
          </h1>
          
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Your subscription has been activated. You can now access all premium features.
          </p>
          
          <div className="space-y-3">
            <button
              onClick={() => router.push('/dashboard')}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-lg transition-colors"
            >
              Go to Dashboard
            </button>
            
            <button
              onClick={() => router.push('/auth/register')}
              className="w-full bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 font-semibold py-3 px-4 rounded-lg transition-colors"
            >
              Back to Registration
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
