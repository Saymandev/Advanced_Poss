'use client';

import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { usePinLoginMutation } from '@/lib/api/endpoints/authApi';
import { clearCompanyContext, setCredentials } from '@/lib/slices/authSlice';
import { useAppDispatch, useAppSelector } from '@/lib/store';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';

export default function PinLoginPage() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { companyContext } = useAppSelector((state) => state.auth);
  const [pin, setPin] = useState('');
  const [selectedBranch, setSelectedBranch] = useState('');
  const [selectedRole, setSelectedRole] = useState('');
  const [pinLogin, { isLoading }] = usePinLoginMutation();

  useEffect(() => {
    if (!companyContext) {
      router.push('/auth/login');
    }
  }, [companyContext, router]);

  const handlePinInput = (digit: string) => {
    if (pin.length < 6) {
      setPin(pin + digit);
    }
  };

  const handleBackspace = () => {
    setPin(pin.slice(0, -1));
  };

  const handleSubmit = async () => {
    if (!selectedBranch || !selectedRole || !pin || pin.length < 4) {
      toast.error('Please select branch, role, and enter your PIN');
      return;
    }

    const loginData = {
      companyId: companyContext!.companyId,
      branchId: selectedBranch,
      role: selectedRole,
      pin,
    };

    console.log('🔐 Attempting PIN login with data:', loginData);
    console.log('🔐 Company Context:', companyContext);

    try {
      const response = await pinLogin(loginData).unwrap();
      
      console.log('✅ PIN login successful! Response:', response);

      dispatch(
        setCredentials({
          user: response.data.user,
          accessToken: response.data.accessToken,
          refreshToken: response.data.refreshToken,
        })
      );
      
      toast.success('Login successful!');
      router.push('/dashboard');
    } catch (error: any) {
      console.error('❌ PIN login failed:', error);
      console.error('❌ Error details:', {
        message: error?.data?.message,
        status: error?.status,
        data: error?.data,
        originalStatus: error?.originalStatus
      });
      
      toast.error(error?.data?.message || 'Invalid PIN. Please try again.');
      setPin('');
    }
  };

  const handleBack = () => {
    dispatch(clearCompanyContext());
    router.push('/auth/login');
  };

  if (!companyContext) {
    return null;
  }

  const selectedBranchData = companyContext.branches.find((b) => b.id === selectedBranch);
  
  // Debug logging
  console.log('Company Context:', companyContext);
  console.log('Selected Branch ID:', selectedBranch);
  console.log('Selected Branch Data:', selectedBranchData);
  console.log('Available Roles:', selectedBranchData?.availableRoles);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-500 via-primary-600 to-secondary-600 p-4">
      <div className="w-full max-w-2xl">
        <button
          onClick={handleBack}
          className="text-white mb-4 flex items-center gap-2 hover:underline"
        >
          <ArrowLeftIcon className="w-4 h-4" />
          Back to email
        </button>

        <Card className="shadow-2xl">
          <CardHeader>
            <div className="text-center">
              {companyContext.logoUrl && (
                <img
                  src={companyContext.logoUrl}
                  alt={companyContext.companyName}
                  className="h-16 mx-auto mb-2"
                />
              )}
              <CardTitle>{companyContext.companyName}</CardTitle>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                Select your branch, role, and enter your PIN
              </p>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {/* Branch Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Select Branch
                </label>
                <div className="grid grid-cols-1 gap-2">
                  {companyContext.branches.map((branch) => (
                    <button
                      key={branch.id}
                      onClick={() => {
                        setSelectedBranch(branch.id);
                        setSelectedRole('');
                      }}
                      className={`p-3 text-left rounded-lg border-2 transition-all ${
                        selectedBranch === branch.id
                          ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                          : 'border-gray-200 dark:border-gray-700 hover:border-primary-300'
                      }`}
                    >
                      <div className="font-medium">{branch.name}</div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        {branch.address.street}, {branch.address.city}, {branch.address.state}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Role Selection */}
              {selectedBranch && selectedBranchData && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Select Role
                  </label>
                  {selectedBranchData.availableRoles && selectedBranchData.availableRoles.length > 0 ? (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {selectedBranchData.availableRoles.map((role: string) => (
                        <button
                          key={role}
                          onClick={() => setSelectedRole(role)}
                          className={`p-3 rounded-lg border-2 transition-all capitalize ${
                            selectedRole === role
                              ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                              : 'border-gray-200 dark:border-gray-700 hover:border-primary-300'
                          }`}
                        >
                          {role.replace('_', ' ')}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-4 text-gray-500 dark:text-gray-400">
                      <p>No roles available for this branch.</p>
                      <p className="text-sm mt-1">Please contact your administrator.</p>
                    </div>
                  )}
                </div>
              )}

              {/* PIN Input */}
              {selectedRole && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Enter PIN
                  </label>
                  <div className="flex justify-center gap-2 mb-4">
                    {[0, 1, 2, 3, 4, 5].map((i) => (
                      <div
                        key={i}
                        className="w-12 h-12 rounded-lg border-2 border-gray-300 dark:border-gray-600 flex items-center justify-center text-2xl font-bold"
                      >
                        {pin[i] ? '•' : ''}
                      </div>
                    ))}
                  </div>

                  <div className="grid grid-cols-3 gap-3 max-w-xs mx-auto">
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((digit) => (
                      <button
                        key={digit}
                        onClick={() => handlePinInput(digit.toString())}
                        className="h-14 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-xl font-semibold transition-colors"
                      >
                        {digit}
                      </button>
                    ))}
                    <button
                      onClick={handleBackspace}
                      className="h-14 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-sm font-semibold transition-colors"
                    >
                      ← Delete
                    </button>
                    <button
                      onClick={() => handlePinInput('0')}
                      className="h-14 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-xl font-semibold transition-colors"
                    >
                      0
                    </button>
                    <button
                      onClick={() => setPin('')}
                      className="h-14 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-sm font-semibold transition-colors"
                    >
                      Clear
                    </button>
                  </div>

                  <Button
                    onClick={handleSubmit}
                    className="w-full mt-4"
                    isLoading={isLoading}
                    disabled={pin.length < 4}
                  >
                    Login
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

