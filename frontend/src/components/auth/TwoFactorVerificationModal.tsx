'use client';

import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { useVerify2FALoginMutation } from '@/lib/api/endpoints/authApi';
import { setCredentials } from '@/lib/slices/authSlice';
import { useAppDispatch } from '@/lib/store';
import { getRoleDashboardPath } from '@/utils/getRoleDashboard';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import toast from 'react-hot-toast';

interface TwoFactorVerificationModalProps {
  isOpen: boolean;
  temporaryToken: string;
  onClose: () => void;
}

export function TwoFactorVerificationModal({
  isOpen,
  temporaryToken,
  onClose,
}: TwoFactorVerificationModalProps) {
  const [token, setToken] = useState('');
  const [backupCode, setBackupCode] = useState('');
  const [useBackupCode, setUseBackupCode] = useState(false);
  const dispatch = useAppDispatch();
  const router = useRouter();
  const [verify2FA, { isLoading }] = useVerify2FALoginMutation();

  const handleSubmit = async () => {
    if (!useBackupCode && !token.trim()) {
      toast.error('Please enter your 2FA code');
      return;
    }

    if (useBackupCode && !backupCode.trim()) {
      toast.error('Please enter your backup code');
      return;
    }

    try {
      const response: any = await verify2FA({
        temporaryToken,
        token: useBackupCode ? undefined : token.trim(),
        backupCode: useBackupCode ? backupCode.trim() : undefined,
      }).unwrap();

      // Tokens are now in httpOnly cookies, response only contains user data
      // Handle response structure: { user } or { data: { user } }
      let loggedInUser;
      
      if (response.data) {
        loggedInUser = response.data.user || response.data;
      } else {
        loggedInUser = response.user;
      }

      if (!loggedInUser) {
        toast.error('Login failed: Invalid response from server');
        return;
      }

      // Ensure companyId and branchId are properly serialized as strings
      const sanitizedUser = {
        ...loggedInUser,
        companyId: typeof loggedInUser.companyId === 'object' ? loggedInUser.companyId?._id || loggedInUser.companyId?.id || null : loggedInUser.companyId,
        branchId: typeof loggedInUser.branchId === 'object' ? loggedInUser.branchId?._id || loggedInUser.branchId?.id || null : loggedInUser.branchId,
      };

      dispatch(
        setCredentials({
          user: sanitizedUser,
        })
      );

      toast.success('2FA verified successfully!');

      // Immediate redirect - authentication cookies should be set by backend
      router.push(getRoleDashboardPath(loggedInUser?.role));
    } catch (error: any) {
      const errorMessage = error?.data?.message || 'Invalid 2FA code. Please try again.';
      toast.error(
        `${errorMessage}\n\nMake sure you're using the current code from your authenticator app (codes change every 30 seconds).`,
        { duration: 5000 }
      );
      // Clear inputs on error
      setToken('');
      setBackupCode('');
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Two-Factor Authentication"
      size="md"
    >
      <div className="space-y-6">
        <div>
          <p className="text-gray-600 dark:text-gray-300 mb-2">
            Please enter the <strong>current</strong> 6-digit code from your authenticator app.
          </p>
          <p className="text-sm text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 p-2 rounded">
            ⏱️ <strong>Important:</strong> Codes change every 30 seconds. Make sure you're using the code that's currently displayed in your app, not an old code.
          </p>
        </div>

        {!useBackupCode ? (
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              2FA Code
            </label>
            <Input
              value={token}
              onChange={(e) => {
                const value = e.target.value.replace(/\D/g, '').slice(0, 6);
                setToken(value);
              }}
              placeholder="000000"
              maxLength={6}
              className="text-center text-2xl tracking-widest"
              autoFocus
            />
          </div>
        ) : (
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Backup Code
            </label>
            <Input
              value={backupCode}
              onChange={(e) => setBackupCode(e.target.value.trim())}
              placeholder="Enter backup code"
              autoFocus
            />
          </div>
        )}

        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => {
              setUseBackupCode(!useBackupCode);
              setToken('');
              setBackupCode('');
            }}
            className="text-sm text-primary-600 dark:text-primary-400 hover:underline"
          >
            {useBackupCode ? 'Use 2FA code instead' : 'Use backup code instead'}
          </button>
        </div>

        <div className="flex justify-end space-x-3 pt-4">
          <Button
            variant="secondary"
            onClick={onClose}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isLoading || (!useBackupCode && token.length !== 6) || (useBackupCode && !backupCode.trim())}
          >
            {isLoading ? 'Verifying...' : 'Verify'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

