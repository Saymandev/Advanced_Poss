'use client';

import { TwoFactorVerificationModal } from '@/components/auth/TwoFactorVerificationModal';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { useSuperAdminLoginMutation } from '@/lib/api/endpoints/authApi';
import { setCredentials } from '@/lib/slices/authSlice';
import { useAppDispatch } from '@/lib/store';
import { getRoleDashboardPath } from '@/utils/getRoleDashboard';
import { ArrowLeftIcon, ShieldCheckIcon } from '@heroicons/react/24/outline';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import toast from 'react-hot-toast';

export default function SuperAdminLoginPage() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [superAdminLogin, { isLoading }] = useSuperAdminLoginMutation();
  const [show2FAModal, setShow2FAModal] = useState(false);
  const [temporaryToken, setTemporaryToken] = useState<string>('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const response: any = await superAdminLogin({ email, password }).unwrap();

      // Check if 2FA is required
      if (response.requires2FA && response.temporaryToken) {
        setShow2FAModal(true);
        setTemporaryToken(response.temporaryToken);
        return;
      }

      // Tokens are now in httpOnly cookies, response only contains user data
      // Handle response structure: { success, data: { user } } or direct: { user }
      let loggedInUser;
      
      if (response.data) {
        // TransformInterceptor wrapped response
        loggedInUser = response.data.user || response.data;
      } else {
        // Direct response from service
        loggedInUser = response.user;
      }

      if (!loggedInUser) {
        console.error('Missing user in response:', response);
        toast.error('Login failed: Invalid response from server');
        return;
      }
      
      // Ensure companyId and branchId are properly serialized as strings
      const sanitizedUser = {
        ...loggedInUser,
        companyId: typeof loggedInUser.companyId === 'object' ? loggedInUser.companyId?._id || loggedInUser.companyId?.id || null : loggedInUser.companyId,
        branchId: typeof loggedInUser.branchId === 'object' ? loggedInUser.branchId?._id || loggedInUser.branchId?.id || null : loggedInUser.branchId,
      };

      // Tokens are in httpOnly cookies, only store user data
      dispatch(
        setCredentials({
          user: sanitizedUser,
        })
      );

      toast.success('Welcome back, Super Admin!');
      
      // Redirect to role-specific dashboard (should be /dashboard/super-admin)
      const dashboardPath = getRoleDashboardPath(loggedInUser?.role);
      router.push(dashboardPath);
    } catch (error: any) {
      toast.error(error?.data?.message || 'Invalid credentials');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-600 via-purple-700 to-indigo-800 p-4">
      <div className="w-full max-w-md">
        <Link
          href="/auth/login"
          className="text-white mb-4 flex items-center gap-2 hover:underline"
        >
          <ArrowLeftIcon className="w-4 h-4" />
          Back to login
        </Link>

        <Card className="shadow-2xl">
          <CardHeader>
            <div className="flex justify-center mb-4">
              <div className="p-3 bg-purple-100 dark:bg-purple-900 rounded-full">
                <ShieldCheckIcon className="w-12 h-12 text-purple-600 dark:text-purple-400" />
              </div>
            </div>
            <CardTitle className="text-center">Super Admin Login</CardTitle>
            <p className="text-sm text-gray-600 dark:text-gray-400 text-center mt-2">
              Enter your super admin credentials
            </p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <Input
                type="email"
                label="Email Address"
                placeholder="admin@restaurantpos.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />

              <Input
                type="password"
                label="Password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />

              <Button type="submit" className="w-full" isLoading={isLoading}>
                Login as Super Admin
              </Button>
            </form>
          </CardContent>
        </Card>

        <div className="mt-4 p-4 bg-purple-900/30 rounded-lg text-white text-sm">
          <p className="font-semibold mb-1">🔒 Restricted Access</p>
          <p className="text-purple-200">
            This area is for system administrators only. Unauthorized access attempts are logged.
          </p>
        </div>
      </div>
      
      {/* 2FA Verification Modal */}
      <TwoFactorVerificationModal
        isOpen={show2FAModal}
        temporaryToken={temporaryToken}
        onClose={() => {
          setShow2FAModal(false);
          setTemporaryToken('');
        }}
      />
    </div>
  );
}

