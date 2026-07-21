'use client';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { useResetPasswordMutation } from '@/lib/api/endpoints/authApi';
import { LockClosedIcon, KeyIcon, ArrowLeftIcon, EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';

export default function ResetPasswordPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tokenFromUrl = searchParams.get('token');

  const [token, setToken] = useState(tokenFromUrl || '');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [resetPassword, { isLoading }] = useResetPasswordMutation();

  useEffect(() => {
    if (tokenFromUrl) {
      setToken(tokenFromUrl);
    }
  }, [tokenFromUrl]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!token) {
      toast.error('Please enter the 6-digit reset code');
      return;
    }

    if (newPassword.length < 6) {
      toast.error('Password must be at least 6 characters long');
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    try {
      const response = await resetPassword({ token, newPassword }).unwrap();
      toast.success(response.message || 'Password reset successfully');
      
      // Redirect back to login page
      setTimeout(() => {
        router.replace('/auth/login');
      }, 2000);
    } catch (error: any) {
      toast.error(error?.data?.message || 'Failed to reset password. The code might be expired or invalid.');
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
        <Link href="/auth/forgot-password" className="inline-flex items-center gap-2 text-white/80 hover:text-white mb-6 transition-colors group">
          <ArrowLeftIcon className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
          <span>Back</span>
        </Link>

        <Card className="backdrop-blur-xl bg-gray-800/50 border border-gray-700/50 shadow-2xl overflow-hidden">
          <div className="relative p-8 pb-0">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary-500 via-secondary-500 to-primary-500"></div>
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-primary-500 to-secondary-500 rounded-2xl mb-4 animate-scale-in">
                <KeyIcon className="w-8 h-8 text-white" />
              </div>
              <h1 className="text-3xl font-bold text-white mb-2">Reset Password</h1>
              <p className="text-gray-400">Enter your 6-digit code and set a new password.</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="p-8 space-y-6">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-300">6-Digit Reset Code</label>
              <div className="relative">
                <Input
                  type="text"
                  value={token}
                  onChange={(e) => setToken(e.target.value.replace(/\s+/g, ''))}
                  placeholder="123456"
                  className="h-14 text-center text-2xl tracking-widest bg-gray-900/50 border-gray-700 text-white placeholder:text-gray-600 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 transition-all font-mono font-bold"
                  maxLength={6}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-300">New Password</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <LockClosedIcon className="h-5 w-5 text-gray-500" />
                </div>
                <Input
                  type={showPassword ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="••••••••"
                  className="pl-11 pr-11 h-12 bg-gray-900/50 border-gray-700 text-white placeholder:text-gray-500 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 transition-all"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-white transition-colors"
                >
                  {showPassword ? <EyeSlashIcon className="h-5 w-5" /> : <EyeIcon className="h-5 w-5" />}
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-300">Confirm New Password</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <LockClosedIcon className="h-5 w-5 text-gray-500" />
                </div>
                <Input
                  type={showPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className="pl-11 h-12 bg-gray-900/50 border-gray-700 text-white placeholder:text-gray-500 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 transition-all"
                  required
                />
              </div>
            </div>

            <Button
              type="submit"
              className="w-full h-12 text-base font-semibold bg-gradient-to-r from-primary-600 to-secondary-600 hover:from-primary-700 hover:to-secondary-700 shadow-lg hover:shadow-xl hover:shadow-primary-500/50 transition-all duration-300 hover:scale-[1.02]"
              isLoading={isLoading}
              disabled={!token || !newPassword || !confirmPassword || newPassword !== confirmPassword}
            >
              Reset Password
            </Button>
          </form>
        </Card>
      </div>
    </div>
  );
}
