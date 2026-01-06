'use client';

import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { useVerifyPinMutation } from '@/lib/api/endpoints/authApi';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import toast from 'react-hot-toast';

interface PinVerificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  title?: string;
  description?: string;
}

export function PinVerificationModal({
  isOpen,
  onClose,
  onSuccess,
  title = 'Admin PIN Verification',
  description = 'Please enter your PIN to confirm this admin action.',
}: PinVerificationModalProps) {
  const [pin, setPin] = useState('');
  const [verifyPin, { isLoading }] = useVerifyPinMutation();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!pin.trim() || pin.length < 4) {
      toast.error('Please enter a valid PIN');
      return;
    }

    try {
      await verifyPin({ pin: pin.trim() }).unwrap();

      toast.success('PIN verified successfully');
      setPin('');
      onSuccess();
      onClose();
    } catch (error: any) {
      const errorMessage = error?.data?.message || 'Invalid PIN. Please try again.';
      toast.error(errorMessage);

      // Clear PIN on error
      setPin('');

      // If unauthorized, redirect to login
      if (error?.status === 401) {
        toast.error('Session expired. Please login again.');
        router.push('/auth/login');
      }
    }
  };

  const handleClose = () => {
    setPin('');
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title={title} size="sm">
      <form onSubmit={handleSubmit}>
        <div className="space-y-4">
          <div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              {description}
            </p>

            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Enter PIN
            </label>
            <Input
              type="password"
              value={pin}
              onChange={(e) => {
                const value = e.target.value.replace(/\D/g, '').slice(0, 6);
                setPin(value);
              }}
              placeholder="Enter your PIN"
              maxLength={6}
              className="text-center text-2xl tracking-widest"
              autoFocus
            />
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <Button
            type="button"
            variant="secondary"
            onClick={handleClose}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={isLoading || pin.length < 4}
            className="min-w-[100px]"
          >
            {isLoading ? 'Verifying...' : 'Verify PIN'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
