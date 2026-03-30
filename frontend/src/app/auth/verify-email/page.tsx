'use client';

import { useVerifyEmailMutation } from '@/lib/api/endpoints/authApi';
import { 
  CheckCircleIcon, 
  XCircleIcon, 
  ArrowPathIcon,
  EnvelopeIcon 
} from '@heroicons/react/24/outline';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function VerifyEmailPage() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const [verifyEmail, { isLoading, isSuccess, isError, error }] = useVerifyEmailMutation();
  const [verificationAttempted, setVerificationAttempted] = useState(false);

  useEffect(() => {
    if (token && !verificationAttempted) {
      verifyEmail(token);
      setVerificationAttempted(true);
    }
  }, [token, verifyEmail, verificationAttempted]);

  const renderContent = () => {
    if (!token) {
      return (
        <div className="text-center">
          <XCircleIcon className="mx-auto h-16 w-16 text-red-500" />
          <h2 className="mt-4 text-2xl font-bold text-white">Invalid Link</h2>
          <p className="mt-2 text-gray-400">
            The verification link is missing a token. Please check your email again.
          </p>
          <div className="mt-6">
            <Link
              href="/auth/login"
              className="inline-flex items-center justify-center rounded-lg bg-primary-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-primary-700"
            >
              Back to Login
            </Link>
          </div>
        </div>
      );
    }

    if (isLoading) {
      return (
        <div className="text-center">
          <ArrowPathIcon className="mx-auto h-16 w-16 animate-spin text-primary-500" />
          <h2 className="mt-4 text-2xl font-bold text-white">Verifying your email...</h2>
          <p className="mt-2 text-gray-400">
            Please wait while we confirm your account details.
          </p>
        </div>
      );
    }

    if (isSuccess) {
      return (
        <div className="text-center">
          <CheckCircleIcon className="mx-auto h-16 w-16 text-green-500" />
          <h2 className="mt-4 text-2xl font-bold text-white">Email Verified!</h2>
          <p className="mt-2 text-gray-400">
            Your email has been successfully verified. You can now log in to your account and start managing your restaurant.
          </p>
          <div className="mt-6">
            <Link
              href="/auth/login"
              className="inline-flex items-center justify-center rounded-lg bg-primary-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-primary-700"
            >
              Log in to Your Account
            </Link>
          </div>
        </div>
      );
    }

    if (isError) {
      const errorMessage = (error as any)?.data?.message || 'The verification link is invalid or has expired.';
      return (
        <div className="text-center">
          <XCircleIcon className="mx-auto h-16 w-16 text-red-500" />
          <h2 className="mt-4 text-2xl font-bold text-white">Verification Failed</h2>
          <p className="mt-2 text-gray-400">{errorMessage}</p>
          <div className="mt-6 flex flex-col gap-3">
            <Link
              href="/auth/register"
              className="inline-flex items-center justify-center rounded-lg bg-primary-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-primary-700"
            >
              Try Registering Again
            </Link>
            <Link
              href="/auth/login"
              className="text-sm font-medium text-primary-500 hover:text-primary-400"
            >
              Back to Login
            </Link>
          </div>
        </div>
      );
    }

    return null;
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-900 px-4 py-12 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8 rounded-2xl bg-gray-800 p-10 shadow-2xl ring-1 ring-white/10">
        <div className="text-center">
          <div className="mx-auto mt-2 flex h-12 w-12 items-center justify-center rounded-full bg-primary-500/10">
            <EnvelopeIcon className="h-6 w-6 text-primary-500" />
          </div>
          <h1 className="mt-4 text-3xl font-extrabold tracking-tight text-white">
            Email Verification
          </h1>
        </div>

        <div className="mt-8">{renderContent()}</div>

        <div className="mt-10 border-t border-white/10 pt-6 text-center text-xs text-gray-500">
          <p>&copy; {new Date().getFullYear()} Raha POS Solutions. All rights reserved.</p>
        </div>
      </div>
    </div>
  );
}
