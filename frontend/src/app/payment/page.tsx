'use client';

import { RootState } from '@/lib/store';
import { Elements, PaymentElement, useElements, useStripe } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { useSelector } from 'react-redux';

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

interface PaymentFormProps {
  amount: number;
  planName: string;
  onSuccess: () => void;
}

function PaymentForm({ amount, planName, onSuccess }: PaymentFormProps) {
  const stripe = useStripe();
  const elements = useElements();
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setIsLoading(true);

    const { error } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/payment/success`,
      },
    });

    if (error) {
      toast.error(error.message || 'Payment failed');
    } else {
      onSuccess();
    }

    setIsLoading(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Payment Details
        </h3>
        <PaymentElement />
      </div>

      <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
        <div className="flex justify-between items-center">
          <div>
            <p className="text-sm text-gray-600 dark:text-gray-400">Plan</p>
            <p className="font-semibold text-gray-900 dark:text-white capitalize">{planName}</p>
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-600 dark:text-gray-400">Amount</p>
            <p className="font-semibold text-gray-900 dark:text-white">
              ৳{amount.toLocaleString()}
            </p>
          </div>
        </div>
      </div>

      <button
        type="submit"
        disabled={!stripe || isLoading}
        className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-semibold py-3 px-4 rounded-lg transition-colors"
      >
        {isLoading ? 'Processing...' : `Pay ৳${amount.toLocaleString()}`}
      </button>
    </form>
  );
}

export default function PaymentPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useSelector((state: RootState) => state.auth);
  const [paymentData, setPaymentData] = useState<{
    clientSecret: string;
    amount: number;
    currency: string;
    plan: {
      name: string;
      displayName: string;
      features: {
        pos: boolean;
        inventory: boolean;
        crm: boolean;
        accounting: boolean;
        aiInsights: boolean;
        multiBranch: boolean;
        maxUsers: number;
        maxBranches: number;
      };
    };
  } | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const initializePayment = async () => {
      try {
        const planName = searchParams.get('plan');
        if (!planName || !user?.companyId) {
          toast.error('Invalid payment request');
          router.push('/auth/register');
          return;
        }

        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/payments/create-payment-intent`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
          },
          body: JSON.stringify({
            companyId: user.companyId,
            planName: planName,
          }),
        });

        if (!response.ok) {
          throw new Error('Failed to create payment intent');
        }

        const data = await response.json();
        setPaymentData(data);
      } catch (error) {
        console.error('Payment initialization error:', error);
        toast.error('Failed to initialize payment');
        router.push('/auth/register');
      } finally {
        setIsLoading(false);
      }
    };

    initializePayment();
  }, [searchParams, user, router]);

  const handlePaymentSuccess = () => {
    toast.success('Payment successful! Redirecting to dashboard...');
    router.push('/dashboard');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Initializing payment...</p>
        </div>
      </div>
    );
  }

  if (!paymentData) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 dark:text-red-400">Failed to load payment data</p>
          <button
            onClick={() => router.push('/auth/register')}
            className="mt-4 bg-blue-600 text-white px-4 py-2 rounded-lg"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-12">
      <div className="max-w-md mx-auto">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Complete Your Subscription
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              Secure payment powered by Stripe
            </p>
          </div>

          <Elements
            stripe={stripePromise}
            options={{
              clientSecret: paymentData.clientSecret,
              appearance: {
                theme: 'stripe',
                variables: {
                  colorPrimary: '#2563eb',
                },
              },
            }}
          >
             <PaymentForm
               amount={paymentData.amount}
               planName={paymentData.plan.displayName}
               onSuccess={handlePaymentSuccess}
             />
          </Elements>

          <div className="mt-6 text-center">
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Your payment information is secure and encrypted
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
