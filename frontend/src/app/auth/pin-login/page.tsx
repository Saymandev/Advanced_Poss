'use client';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { usePinLoginMutation } from '@/lib/api/endpoints/authApi';
import { clearCompanyContext, setCredentials } from '@/lib/slices/authSlice';
import { useAppDispatch, useAppSelector } from '@/lib/store';
import { ArrowLeftIcon, BackspaceIcon, EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';

const getAvatarUrl = (email: string) => {
  const hash = email.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return `https://i.pravatar.cc/150?img=${hash % 70}`;
};

export default function PinLoginPage() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { companyContext } = useAppSelector((state) => state.auth);
  const [pin, setPin] = useState('');
  const [selectedBranch, setSelectedBranch] = useState('');
  const [selectedRole, setSelectedRole] = useState('');
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [showPin, setShowPin] = useState(false);
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
  const availableUsers = selectedBranchData?.usersByRole?.[selectedRole] || [];

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-gray-800 to-black p-4">
      {/* Background decoration */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-primary-900/20 via-transparent to-transparent"></div>
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,_var(--tw-gradient-stops))] from-secondary-900/20 via-transparent to-transparent"></div>

      <div className="w-full max-w-6xl relative z-10">
        {/* Back button */}
        <button
          onClick={handleBack}
          className="text-white/80 hover:text-white mb-6 flex items-center gap-2 transition-colors"
        >
          <ArrowLeftIcon className="w-5 h-5" />
          Back to email
        </button>

        <Card className="backdrop-blur-xl bg-gray-800/50 border border-gray-700/50 shadow-2xl">
          {/* Company Header */}
          <div className="text-center py-8 border-b border-gray-700/50">
            {companyContext.logoUrl && (
              <div className="flex justify-center mb-4">
                <img
                  src={companyContext.logoUrl}
                  alt={companyContext.companyName}
                  className="h-20 w-20 rounded-full border-4 border-primary-500 shadow-lg"
                />
              </div>
            )}
            <h1 className="text-3xl font-bold text-white mb-2">
              {companyContext.companyName}
            </h1>
            <p className="text-gray-400">Select your branch and role to continue</p>
          </div>

          <div className="p-8">
            {/* Branch Selection */}
            {!selectedBranch && (
              <div className="space-y-4 animate-fade-in">
                <h2 className="text-xl font-semibold text-white mb-6">Select Branch</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {companyContext.branches.map((branch) => (
                    <button
                      key={branch.id}
                      onClick={() => {
                        setSelectedBranch(branch.id);
                        setSelectedRole('');
                        setSelectedUser(null);
                      }}
                      className="group relative overflow-hidden p-6 text-left rounded-xl border-2 border-gray-700 bg-gray-800/50 hover:border-primary-500 hover:bg-gray-800 transition-all duration-300 hover:scale-105"
                    >
                      <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-primary-500/10 to-transparent rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform"></div>
                      <div className="relative">
                        <div className="font-bold text-white text-lg mb-2">{branch.name}</div>
                        <div className="text-sm text-gray-400">
                          {branch.address.street}, {branch.address.city}
                        </div>
                        {branch.availableRoles && (
                          <div className="mt-3 flex flex-wrap gap-2">
                            {branch.availableRoles.slice(0, 3).map((role: string) => (
                              <span
                                key={role}
                                className="px-2 py-1 bg-primary-500/20 text-primary-300 text-xs rounded-full"
                              >
                                {role}
                              </span>
                            ))}
                            {branch.availableRoles.length > 3 && (
                              <span className="px-2 py-1 bg-gray-700 text-gray-300 text-xs rounded-full">
                                +{branch.availableRoles.length - 3}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Role Selection */}
            {selectedBranch && !selectedRole && selectedBranchData && (
              <div className="space-y-6 animate-fade-in">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-semibold text-white">Select Role</h2>
                  <button
                    onClick={() => setSelectedBranch('')}
                    className="text-gray-400 hover:text-white transition-colors text-sm"
                  >
                    Change Branch
                  </button>
                </div>

                {selectedBranchData.availableRoles && selectedBranchData.availableRoles.length > 0 ? (
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {selectedBranchData.availableRoles.map((role: string) => (
                      <button
                        key={role}
                        onClick={() => setSelectedRole(role)}
                        className="group relative overflow-hidden p-6 rounded-xl border-2 border-gray-700 bg-gray-800/50 hover:border-primary-500 hover:bg-gray-800 transition-all duration-300 hover:scale-105"
                      >
                        <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-primary-500/10 to-transparent rounded-full -mr-12 -mt-12 group-hover:scale-150 transition-transform"></div>
                        <div className="relative text-center">
                          <div className="w-12 h-12 bg-gradient-to-br from-primary-500 to-secondary-500 rounded-full flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform">
                            <span className="text-white font-bold text-lg">
                              {role.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <div className="text-white font-medium capitalize">{role.replace('_', ' ')}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 bg-gray-800/30 rounded-xl border border-gray-700">
                    <p className="text-gray-400">No roles available for this branch</p>
                    <p className="text-sm text-gray-500 mt-2">Please contact your administrator</p>
                  </div>
                )}
              </div>
            )}

            {/* User Selection & PIN Entry */}
            {selectedRole && (
              <div className="space-y-6 animate-fade-in">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-semibold text-white">Who's logging in?</h2>
                  <button
                    onClick={() => {
                      setSelectedRole('');
                      setSelectedUser(null);
                      setPin('');
                    }}
                    className="text-gray-400 hover:text-white transition-colors text-sm"
                  >
                    Change Role
                  </button>
                </div>

                {/* User Avatars */}
                {availableUsers.length > 0 && (
                  <div className="flex items-center justify-center gap-6 flex-wrap">
                    {availableUsers.map((user: any) => (
                      <button
                        key={user.id}
                        onClick={() => setSelectedUser(user)}
                        className={`group flex flex-col items-center transition-all duration-300 ${
                          selectedUser?.id === user.id ? 'scale-110' : 'hover:scale-105'
                        }`}
                      >
                        <div
                          className={`relative w-24 h-24 rounded-full border-4 transition-all duration-300 ${
                            selectedUser?.id === user.id
                              ? 'border-primary-500 shadow-lg shadow-primary-500/50'
                              : 'border-gray-700 group-hover:border-primary-400'
                          }`}
                        >
                          <img
                            src={getAvatarUrl(user.email)}
                            alt={user.firstName}
                            className="w-full h-full rounded-full object-cover"
                          />
                          {selectedUser?.id === user.id && (
                            <div className="absolute -top-2 -right-2 w-8 h-8 bg-primary-500 rounded-full flex items-center justify-center">
                              <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                              </svg>
                            </div>
                          )}
                        </div>
                        <div className="mt-3 text-center">
                          <div className={`font-semibold transition-colors ${
                            selectedUser?.id === user.id ? 'text-primary-400' : 'text-white'
                          }`}>
                            {user.firstName} {user.lastName}
                          </div>
                          <div className="text-xs text-gray-400 capitalize">{selectedRole}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}

                {/* PIN Input */}
                {(selectedUser || availableUsers.length === 0) && (
                  <div className="max-w-md mx-auto space-y-6 mt-8">
                    <div>
                      <div className="flex items-center justify-between mb-4">
                        <label className="text-white font-medium">
                          Enter PIN for {selectedUser ? `${selectedUser.firstName}` : selectedRole}
                        </label>
                        <button
                          onClick={() => setShowPin(!showPin)}
                          className="text-gray-400 hover:text-white transition-colors"
                        >
                          {showPin ? (
                            <EyeSlashIcon className="w-5 h-5" />
                          ) : (
                            <EyeIcon className="w-5 h-5" />
                          )}
                        </button>
                      </div>

                      {/* PIN Display */}
                      <div className="flex justify-center gap-3 mb-6">
                        {[0, 1, 2, 3, 4, 5].map((i) => (
                          <div
                            key={i}
                            className={`w-12 h-14 rounded-lg border-2 flex items-center justify-center text-2xl font-bold transition-all ${
                              pin[i]
                                ? 'border-primary-500 bg-primary-500/20 text-white'
                                : 'border-gray-700 bg-gray-800/50 text-gray-600'
                            }`}
                          >
                            {pin[i] ? (showPin ? pin[i] : '•') : ''}
                          </div>
                        ))}
                      </div>

                      {/* Number Pad */}
                      <div className="grid grid-cols-3 gap-3">
                        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((digit) => (
                          <button
                            key={digit}
                            onClick={() => handlePinInput(digit.toString())}
                            className="h-14 rounded-xl bg-gray-800/50 hover:bg-gray-700 border border-gray-700 hover:border-primary-500 text-white text-xl font-semibold transition-all hover:scale-105 active:scale-95"
                          >
                            {digit}
                          </button>
                        ))}
                        <button
                          onClick={handleBackspace}
                          className="h-14 rounded-xl bg-gray-800/50 hover:bg-gray-700 border border-gray-700 hover:border-danger-500 text-white font-semibold transition-all hover:scale-105 active:scale-95 flex items-center justify-center"
                        >
                          <BackspaceIcon className="w-6 h-6" />
                        </button>
                        <button
                          onClick={() => handlePinInput('0')}
                          className="h-14 rounded-xl bg-gray-800/50 hover:bg-gray-700 border border-gray-700 hover:border-primary-500 text-white text-xl font-semibold transition-all hover:scale-105 active:scale-95"
                        >
                          0
                        </button>
                        <button
                          onClick={() => setPin('')}
                          className="h-14 rounded-xl bg-gray-800/50 hover:bg-gray-700 border border-gray-700 hover:border-warning-500 text-white font-semibold transition-all hover:scale-105 active:scale-95"
                        >
                          Clear
                        </button>
                      </div>

                      <Button
                        onClick={handleSubmit}
                        className="w-full mt-6 h-14 text-lg"
                        isLoading={isLoading}
                        disabled={pin.length < 4}
                      >
                        Login
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
