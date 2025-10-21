'use client';

import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { useFindCompanyMutation } from '@/lib/api/endpoints/authApi';
import { setCompanyContext } from '@/lib/slices/authSlice';
import { useAppDispatch } from '@/lib/store';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';

export default function LoginPage() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const [email, setEmail] = useState('');
  const [mounted, setMounted] = useState(false);
  const [findCompany, { isLoading }] = useFindCompanyMutation();

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email) {
      toast.error('Please enter your email');
      return;
    }

    try {
      console.log('Sending request to find company with email:', email);
      const response = await findCompany({ email }).unwrap();
      console.log('Response received:', response);
      
      // Check if the response has the expected structure
      if (response.success && response.data && response.data.found) {
        dispatch(setCompanyContext(response.data));
        toast.success('Company found! Please select your role and enter PIN.');
        router.push('/auth/pin-login');
      } else {
        toast.error(response.data?.message || 'Company not found. Please check your email.');
      }
    } catch (error: any) {
      console.error('Error finding company:', error);
      console.error('Error details:', {
        status: error?.status,
        data: error?.data,
        message: error?.message
      });
      toast.error(error?.data?.message || error?.message || 'Network error. Please try again.');
    }
  };

  if (!mounted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-500 via-primary-600 to-secondary-600 p-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-white mb-2">🍽️ Advanced POS</h1>
            <p className="text-primary-100">Loading...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-500 via-primary-600 to-secondary-600 p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">🍽️ Advanced POS</h1>
          <p className="text-primary-100">Restaurant Management System</p>
        </div>

        <Card className="shadow-2xl">
          <CardHeader>
            <CardTitle className="text-center">Welcome Back</CardTitle>
            <p className="text-sm text-gray-600 dark:text-gray-400 text-center mt-2">
              Enter your email to find your company
            </p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <Input
                type="email"
                label="Email Address"
                placeholder="your.email@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />

              <Button
                type="submit"
                className="w-full"
                isLoading={isLoading}
              >
                Continue
              </Button>
            </form>

            <div className="mt-6 space-y-3">
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-300 dark:border-gray-600"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-white dark:bg-gray-800 text-gray-500">Or</span>
                </div>
              </div>

              <Link href="/auth/super-admin">
                <Button variant="secondary" className="w-full">
                  Super Admin Login
                </Button>
              </Link>

              <Link href="/auth/register">
                <Button variant="ghost" className="w-full">
                  Register New Business
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        <p className="text-center text-sm text-primary-100 mt-4">
          Need help? Contact support
        </p>
      </div>
    </div>
  );
}

