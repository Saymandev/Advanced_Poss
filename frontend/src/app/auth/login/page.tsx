'use client';

import LoginFlow from '@/components/auth/LoginFlow';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { AuthResponse, useFindCompanyMutation, useSuperAdminLoginMutation } from '@/lib/api/authApi';
import { setCredentials } from '@/lib/slices/authSlice';
import { motion } from 'framer-motion';
import { Building2, Mail } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useDispatch } from 'react-redux';

export default function LoginPage() {
  const [loginType, setLoginType] = useState<'user' | 'super-admin'>('user');
  const [showLoginFlow, setShowLoginFlow] = useState(false);
  // const [companyData, setCompanyData] = useState<unknown>(null);
  
  const router = useRouter();
  const dispatch = useDispatch();
  const [findCompany, { isLoading: isFindingCompany }] = useFindCompanyMutation();
  const [superAdminLogin, { isLoading: isSuperAdminLoading }] = useSuperAdminLoginMutation();

  const handleLoginSuccess = (userData: AuthResponse) => {
    dispatch(setCredentials(userData));
    if (userData.user.isSuperAdmin) {
      router.push('/admin/dashboard');
    } else {
      router.push('/dashboard');
    }
  };

  const handleBackToLogin = () => {
    setShowLoginFlow(false);
  };

  if (showLoginFlow) {
    return (
      <LoginFlow
        onComplete={handleLoginSuccess as (data: unknown) => void}
        onBack={handleBackToLogin}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex items-center justify-center p-4 pt-20">
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 p-6">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <Link href="/" className="flex items-center space-x-2 cursor-pointer">
            <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
              <Building2 className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              RestaurantPOS
            </span>
          </Link>
          <ThemeToggle />
        </div>
      </div>

      {/* Login Card */}
      <motion.div
        className="w-full max-w-md"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 border border-gray-100 dark:border-gray-700">
          {/* Login Type Toggle */}
          <div className="flex items-center justify-center mb-8">
            <div className="flex items-center space-x-1 bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
              <button
                onClick={() => setLoginType('user')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors cursor-pointer ${
                  loginType === 'user'
                    ? 'bg-white dark:bg-gray-600 text-blue-600 dark:text-blue-400 shadow-sm'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'
                }`}
              >
                User Login
              </button>
              <button
                onClick={() => setLoginType('super-admin')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors cursor-pointer ${
                  loginType === 'super-admin'
                    ? 'bg-white dark:bg-gray-600 text-blue-600 dark:text-blue-400 shadow-sm'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'
                }`}
              >
                Super Admin
              </button>
            </div>
          </div>

          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
              {loginType === 'super-admin' ? 'Super Admin Login' : 'Welcome Back'}
            </h1>
            <p className="text-gray-600 dark:text-gray-300">
              {loginType === 'super-admin' 
                ? 'Access the admin dashboard' 
                : 'Sign in to your restaurant account'
              }
            </p>
          </div>

           {/* Login Form */}
           {loginType === 'user' ? (
             <UserLoginForm 
               onFindCompany={async (email) => {
                 try {
                   await findCompany({ email }).unwrap();
                   setShowLoginFlow(true);
                 } catch (error: unknown) {
                   console.error('Find company error:', error);
                   const errorMessage = error instanceof Error ? error.message : 'Failed to find company';
                   alert(errorMessage);
                 }
               }}
               isLoading={isFindingCompany}
             />
           ) : (
             <SuperAdminLoginForm 
               onLogin={async (credentials) => {
                 try {
                   const result = await superAdminLogin(credentials).unwrap();
                   handleLoginSuccess(result);
                 } catch (error: unknown) {
                   console.error('Super admin login error:', error);
                   const errorMessage = error instanceof Error ? error.message : 'Login failed';
                   alert(errorMessage);
                 }
               }}
               isLoading={isSuperAdminLoading}
             />
           )}

          {/* Footer */}
          <div className="mt-8 text-center">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Don&apos;t have an account?{' '}
              <Link href="/auth/register" className="text-blue-600 dark:text-blue-400 hover:underline font-medium">
                Register your restaurant
              </Link>
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

function UserLoginForm({ onFindCompany, isLoading }: { onFindCompany: (email: string) => Promise<void>; isLoading: boolean }) {
  const [email, setEmail] = useState('');

  const handleFindCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    await onFindCompany(email);
  };

  return (
    <form onSubmit={handleFindCompany} className="space-y-6" key="user-login-form" suppressHydrationWarning>
      <div>
        <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Email Address
        </label>
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Mail className="h-5 w-5 text-gray-400" />
          </div>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="block w-full pl-10 pr-3 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
            placeholder="Enter your email"
            required
            autoComplete="email"
            data-lpignore="true"
            suppressHydrationWarning
          />
        </div>
      </div>

       <motion.button
         type="submit"
         disabled={isLoading}
         className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 rounded-xl font-semibold hover:from-blue-700 hover:to-purple-700 transition-all duration-300 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
         whileHover={{ scale: isLoading ? 1 : 1.02 }}
         whileTap={{ scale: isLoading ? 1 : 0.98 }}
       >
         {isLoading ? 'Finding...' : 'Find My Restaurant'}
       </motion.button>
    </form>
  );
}

function SuperAdminLoginForm({ onLogin, isLoading }: { onLogin: (credentials: { email: string; password: string }) => Promise<void>; isLoading: boolean }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSuperAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    await onLogin({ email, password });
  };

  return (
    <form onSubmit={handleSuperAdminLogin} className="space-y-6" key="super-admin-form" suppressHydrationWarning>
      <div>
        <label htmlFor="admin-email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Admin Email
        </label>
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Mail className="h-5 w-5 text-gray-400" />
          </div>
          <input
            id="admin-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="block w-full pl-10 pr-3 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
            placeholder="admin@restaurantpos.com"
            required
            autoComplete="email"
            data-lpignore="true"
            suppressHydrationWarning
          />
        </div>
      </div>

      <div>
        <label htmlFor="admin-password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Password
        </label>
        <input
          id="admin-password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="block w-full px-3 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
          placeholder="Enter your password"
          required
          autoComplete="current-password"
          data-lpignore="true"
          suppressHydrationWarning
        />
      </div>

       <motion.button
         type="submit"
         disabled={isLoading}
         className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 rounded-xl font-semibold hover:from-blue-700 hover:to-purple-700 transition-all duration-300 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
         whileHover={{ scale: isLoading ? 1 : 1.02 }}
         whileTap={{ scale: isLoading ? 1 : 0.98 }}
       >
         {isLoading ? 'Signing In...' : 'Sign In as Super Admin'}
       </motion.button>
    </form>
  );
}
