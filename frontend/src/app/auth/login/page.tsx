'use client';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { useFindCompanyMutation } from '@/lib/api/endpoints/authApi';
import { setCompanyContext } from '@/lib/slices/authSlice';
import { useAppDispatch } from '@/lib/store';
import { EnvelopeIcon, HomeIcon, SparklesIcon } from '@heroicons/react/24/outline';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';

export default function LoginPage() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const [email, setEmail] = useState('');
  const [findCompany, { isLoading }] = useFindCompanyMutation();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email) {
      toast.error('Please enter your email');
      return;
    }

    console.log('🔍 Searching for company with email:', email);

    try {
      const response = await findCompany({ email }).unwrap();

      console.log('📧 Find company response:', response);

      if (response.success && response.data && response.data.found) {
        console.log('✅ Company found!', response.data);

        dispatch(setCompanyContext(response.data));
        toast.success(`Welcome to ${response.data.companyName}!`);
        router.push('/auth/pin-login');
      } else {
        console.log('❌ Company not found');
        toast.error('No restaurant found with this email');
      }
    } catch (error: any) {
      console.error('❌ Error finding company:', error);
      toast.error(error?.data?.message || 'No restaurant found with this email');
    }
  };

  if (!mounted) {
    return null;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-gray-800 to-black p-4 relative overflow-hidden">
      {/* Animated background */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-primary-900/30 via-transparent to-transparent animate-pulse"></div>
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,_var(--tw-gradient-stops))] from-secondary-900/30 via-transparent to-transparent animate-pulse" style={{ animationDelay: '1s' }}></div>
      
      {/* Floating shapes */}
      <div className="absolute top-20 left-20 w-72 h-72 bg-primary-500/10 rounded-full blur-3xl animate-bounce-slow"></div>
      <div className="absolute bottom-20 right-20 w-96 h-96 bg-secondary-500/10 rounded-full blur-3xl animate-bounce-slow" style={{ animationDelay: '2s' }}></div>

      <div className="w-full max-w-md relative z-10">
        {/* Home Button */}
        <Link href="/" className="inline-flex items-center gap-2 text-white/80 hover:text-white mb-6 transition-colors group">
          <HomeIcon className="w-5 h-5 group-hover:scale-110 transition-transform" />
          <span>Back to Home</span>
        </Link>

        <Card className="backdrop-blur-xl bg-gray-800/50 border border-gray-700/50 shadow-2xl overflow-hidden">
          {/* Header with gradient */}
          <div className="relative p-8 pb-0">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary-500 via-secondary-500 to-primary-500"></div>
            
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-primary-500 to-secondary-500 rounded-2xl mb-4 animate-scale-in">
                <SparklesIcon className="w-8 h-8 text-white" />
              </div>
              <h1 className="text-3xl font-bold text-white mb-2">Welcome Back</h1>
              <p className="text-gray-400">Enter your company email to continue</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="p-8 space-y-6">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-300">Company Email</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <EnvelopeIcon className="h-5 w-5 text-gray-500" />
                </div>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your-restaurant@example.com"
                  className="pl-11 h-12 bg-gray-900/50 border-gray-700 text-white placeholder:text-gray-500 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 transition-all"
                  required
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Use the email registered with your restaurant
              </p>
            </div>

            <Button
              type="submit"
              className="w-full h-12 text-base font-semibold bg-gradient-to-r from-primary-600 to-secondary-600 hover:from-primary-700 hover:to-secondary-700 shadow-lg hover:shadow-xl hover:shadow-primary-500/50 transition-all duration-300 hover:scale-[1.02]"
              isLoading={isLoading}
            >
              Continue to PIN Login
            </Button>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-700"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-4 bg-gray-800/50 text-gray-400">or</span>
              </div>
            </div>

            <div className="space-y-3">
              <Link href="/auth/super-admin">
                <Button
                  type="button"
                  variant="secondary"
                  className="w-full h-11 bg-gray-700/50 hover:bg-gray-700 border border-gray-600 text-white"
                >
                  Super Admin Login
                </Button>
              </Link>
            </div>

            <div className="text-center pt-4 border-t border-gray-700/50">
              <p className="text-gray-400 text-sm">
                Don't have an account?{' '}
                <Link href="/auth/register" className="text-primary-400 hover:text-primary-300 font-semibold transition-colors">
                  Register your restaurant
                </Link>
              </p>
            </div>
          </form>

          {/* Demo credentials hint */}
          <div className="px-8 pb-6">
            <div className="bg-primary-500/10 border border-primary-500/20 rounded-lg p-4">
              <p className="text-xs text-primary-300 font-medium mb-1">Demo Account</p>
              <p className="text-xs text-gray-400">Email: test@pizzapalace.com</p>
              <p className="text-xs text-gray-400">PIN: 123456</p>
            </div>
          </div>
        </Card>

        {/* Footer */}
        <p className="text-center text-gray-500 text-sm mt-8">
          © 2024 Advanced POS. All rights reserved.
        </p>
      </div>
    </div>
  );
}
