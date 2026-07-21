'use client';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { useForgotPasswordMutation } from '@/lib/api/endpoints/authApi';
import { EnvelopeIcon, DevicePhoneMobileIcon, ArrowLeftIcon } from '@heroicons/react/24/outline';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import toast from 'react-hot-toast';

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [method, setMethod] = useState<'email' | 'sms'>('email');
  const [forgotPassword, { isLoading }] = useForgotPasswordMutation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email) {
      toast.error('Please enter your email');
      return;
    }

    try {
      const response = await forgotPassword({ email, method }).unwrap();
      toast.success(response.message || 'Reset code sent successfully!');
      
      // Redirect to the reset password page where they can enter the 6-digit OTP
      setTimeout(() => {
        router.push('/auth/reset-password');
      }, 1500);
    } catch (error: any) {
      toast.error(error?.data?.message || 'Failed to request password reset. Please try again.');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background Image & Effects matching login page */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: "url('https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=1920&q=80')"
        }}
      ></div>
      <div className="absolute inset-0 bg-black/60"></div>
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-primary-900/20 via-transparent to-transparent animate-pulse"></div>
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,_var(--tw-gradient-stops))] from-secondary-900/20 via-transparent to-transparent animate-pulse" style={{ animationDelay: '1s' }}></div>
      <div className="absolute top-20 left-20 w-72 h-72 bg-primary-500/10 rounded-full blur-3xl animate-bounce-slow"></div>
      <div className="absolute bottom-20 right-20 w-96 h-96 bg-secondary-500/10 rounded-full blur-3xl animate-bounce-slow" style={{ animationDelay: '2s' }}></div>

      <div className="w-full max-w-md relative z-10">
        <Link href="/auth/login" className="inline-flex items-center gap-2 text-white/80 hover:text-white mb-6 transition-colors group">
          <ArrowLeftIcon className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
          <span>Back to Login</span>
        </Link>

        <Card className="backdrop-blur-xl bg-gray-800/50 border border-gray-700/50 shadow-2xl overflow-hidden">
          <div className="relative p-8 pb-0">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary-500 via-secondary-500 to-primary-500"></div>
            <div className="text-center">
              <h1 className="text-3xl font-bold text-white mb-2">Forgot Password</h1>
              <p className="text-gray-400">Enter your email and select how you want to receive your reset code.</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="p-8 space-y-6">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-300">Registered Email Address</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <EnvelopeIcon className="h-5 w-5 text-gray-500" />
                </div>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your-email@example.com"
                  className="pl-11 h-12 bg-gray-900/50 border-gray-700 text-white placeholder:text-gray-500 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 transition-all"
                  required
                />
              </div>
            </div>

            <div className="space-y-3 pt-2">
              <label className="text-sm font-medium text-gray-300">Delivery Method</label>
              <div className="grid grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => setMethod('email')}
                  className={`flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all ${
                    method === 'email'
                      ? 'border-primary-500 bg-primary-500/20 text-white'
                      : 'border-gray-700 bg-gray-900/50 text-gray-400 hover:border-gray-500'
                  }`}
                >
                  <EnvelopeIcon className={`h-8 w-8 mb-2 ${method === 'email' ? 'text-primary-400' : 'text-gray-500'}`} />
                  <span className="font-semibold text-sm">Send to Email</span>
                </button>
                <button
                  type="button"
                  onClick={() => setMethod('sms')}
                  className={`flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all ${
                    method === 'sms'
                      ? 'border-primary-500 bg-primary-500/20 text-white'
                      : 'border-gray-700 bg-gray-900/50 text-gray-400 hover:border-gray-500'
                  }`}
                >
                  <DevicePhoneMobileIcon className={`h-8 w-8 mb-2 ${method === 'sms' ? 'text-primary-400' : 'text-gray-500'}`} />
                  <span className="font-semibold text-sm">Send SMS</span>
                </button>
              </div>
            </div>

            <Button
              type="submit"
              className="w-full h-12 text-base font-semibold bg-gradient-to-r from-primary-600 to-secondary-600 hover:from-primary-700 hover:to-secondary-700 shadow-lg hover:shadow-xl hover:shadow-primary-500/50 transition-all duration-300 hover:scale-[1.02]"
              isLoading={isLoading}
            >
              Send Reset Code
            </Button>
          </form>
        </Card>
      </div>
    </div>
  );
}
