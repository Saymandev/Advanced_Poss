'use client';

import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { FindCompanyResponse, usePinLoginWithRoleMutation } from '@/lib/api/authApi';
import { LoginFlowData } from '@/types/auth';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowLeft, Lock, Users } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'react-hot-toast';

interface LoginFlowProps {
  onComplete: (data: unknown) => void;
  onBack: () => void;
  companyData?: FindCompanyResponse | { data: FindCompanyResponse };
}

export default function LoginFlow({ onComplete, onBack, companyData }: LoginFlowProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [loginData, setLoginData] = useState<LoginFlowData>({
    companyId: (companyData as any)?.companyId || (companyData as any)?.data?.companyId || '', // eslint-disable-line @typescript-eslint/no-explicit-any
    branchId: '',
    role: '',
    userId: '',
    pin: '',
  });

  const steps = [
    { number: 1, title: 'Select Branch & Role', icon: Users, description: 'Choose your branch and role' },
    { number: 2, title: 'Enter PIN', icon: Lock, description: 'Enter your PIN to complete login' },
  ];

  const handleNext = () => {
    if (currentStep < 2) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrev = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex items-center justify-center p-4 pt-20">
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 p-6">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <button
            onClick={onBack}
            className="flex items-center space-x-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 cursor-pointer"
          >
            <ArrowLeft size={20} />
            <span>Back to Login</span>
          </button>
          <ThemeToggle />
        </div>
      </div>

      {/* Login Flow Card */}
      <motion.div
        className="w-full max-w-2xl"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 border border-gray-100 dark:border-gray-700">
          {/* Progress Steps */}
          <div className="flex items-center justify-center mb-8">
            {steps.map((step, index) => {
              const Icon = step.icon;
              const isActive = currentStep === step.number;
              const isCompleted = currentStep > step.number;
              
              return (
                <div key={step.number} className="flex items-center">
                  <div className="flex flex-col items-center">
                    <div
                      className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors ${
                        isActive
                          ? 'bg-blue-600 text-white'
                          : isCompleted
                          ? 'bg-green-500 text-white'
                          : 'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
                      }`}
                    >
                      <Icon size={20} />
                    </div>
                    <span className={`text-xs mt-2 font-medium text-center ${
                      isActive
                        ? 'text-blue-600 dark:text-blue-400'
                        : 'text-gray-500 dark:text-gray-400'
                    }`}>
                      {step.title}
                    </span>
                  </div>
                  {index < steps.length - 1 && (
                    <div className={`w-16 h-0.5 mx-4 ${
                      isCompleted ? 'bg-green-500' : 'bg-gray-200 dark:bg-gray-700'
                    }`} />
                  )}
                </div>
              );
            })}
          </div>

          {/* Step Content */}
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
            >
              {currentStep === 1 && (
                <SelectBranchRoleStep
                  data={loginData}
                  onChange={setLoginData}
                  onNext={handleNext}
                  onPrev={handlePrev}
                  companyData={companyData}
                  currentStep={currentStep}
                />
              )}
              
               {currentStep === 2 && (
                 <EnterPinStep
                   data={loginData}
                   onComplete={onComplete}
                   onPrev={handlePrev}
                 />
               )}
            </motion.div>
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}


function SelectBranchRoleStep({ data, onChange, onNext, onPrev, companyData, currentStep }: { 
  data: LoginFlowData; 
  onChange: (data: LoginFlowData) => void; 
  onNext: () => void; 
  onPrev: () => void;
  companyData?: FindCompanyResponse | { data: FindCompanyResponse };
  currentStep: number;
}) {
  // Use real company data instead of mock data
  const allBranches = (companyData as any)?.data?.branches || (companyData as any)?.branches || []; // eslint-disable-line @typescript-eslint/no-explicit-any
  // Filter branches that have available roles
  const branches = allBranches.filter((branch: any) => // eslint-disable-line @typescript-eslint/no-explicit-any
    branch.availableRoles && 
    Array.isArray(branch.availableRoles) && 
    branch.availableRoles.length > 0
  );

  // Helper function to format address
  const formatAddress = (address: string | { street?: string; city?: string; state?: string } | undefined) => {
    if (typeof address === 'string') return address;
    if (address && typeof address === 'object') {
      return `${address.street || ''}, ${address.city || ''} ${address.state || ''}`.trim();
    }
    return 'Address not available';
  };

  const handleBranchSelect = (branchId: string) => {
    onChange({
      ...data,
      branchId,
      role: '', // Reset role when branch changes
    });
  };

  const handleRoleSelect = (role: string) => {
    onChange({
      ...data,
      role,
      userId: '', // Reset userId when role changes
    });
  };


  const handleNext = () => {
    if (data.branchId && data.role) {
      onNext();
    }
  };

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4 text-center">
        Select Branch & Role
      </h2>
      <p className="text-gray-600 dark:text-gray-300 mb-8 text-center">
        Choose your branch and role to continue
      </p>

      <div className="space-y-6">
        {/* Branch Selection */}
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Select Branch
          </h3>
          {branches.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-600 dark:text-gray-300 mb-4">
                No branches with available roles found for this company.
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Please contact your administrator to set up roles for your branches.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {branches.map((branch: any) => ( // eslint-disable-line @typescript-eslint/no-explicit-any
              <motion.button
                key={branch.id}
                onClick={() => handleBranchSelect(branch.id)}
                className={`w-full p-4 text-left border rounded-xl transition-all ${
                  data.branchId === branch.id
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                    : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
                }`}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <div className="font-semibold text-gray-900 dark:text-white">
                  {branch.name}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-300">
                  {formatAddress(branch.address)}
                </div>
              </motion.button>
              ))}
            </div>
          )}
        </div>

        {/* Role Selection */}
        {data.branchId && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Select Your Role
            </h3>
            {branches.find((b: any) => b.id === data.branchId)?.availableRoles?.length === 0 ? ( // eslint-disable-line @typescript-eslint/no-explicit-any
              <div className="text-center py-4">
                <p className="text-gray-600 dark:text-gray-300">
                  No roles available for this branch. Please contact your administrator.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {branches.find((b: any) => b.id === data.branchId)?.availableRoles?.map((role: string) => ( // eslint-disable-line @typescript-eslint/no-explicit-any
                  <motion.button
                    key={role}
                    onClick={() => handleRoleSelect(role)}
                    className={`p-3 text-center border rounded-xl transition-all ${
                      data.role === role
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                        : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500 text-gray-700 dark:text-gray-300'
                    }`}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <span className="capitalize font-medium">{role}</span>
                  </motion.button>
                ))}
              </div>
            )}
          </motion.div>
        )}

        {/* Navigation */}
        <div className="flex justify-between pt-6">
          {currentStep > 1 ? (
            <motion.button
              onClick={onPrev}
              className="flex items-center space-x-2 px-6 py-3 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 cursor-pointer"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <ArrowLeft size={16} />
              <span>Previous</span>
            </motion.button>
          ) : (
            <div></div>
          )}

          <motion.button
            onClick={handleNext}
            disabled={!data.branchId || !data.role}
            className="px-8 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl font-semibold hover:from-blue-700 hover:to-purple-700 transition-all duration-300 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            Continue
          </motion.button>
        </div>
      </div>
    </div>
  );
}

function EnterPinStep({ data, onComplete, onPrev }: { data: LoginFlowData; onComplete: (data: unknown) => void; onPrev: () => void }) {
  const [pin, setPin] = useState('');
  const [pinLoginWithRole, { isLoading }] = usePinLoginWithRoleMutation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // Remove userId from the request as the API doesn't expect it
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { userId, ...loginData } = data;
      console.log('Sending login data:', { ...loginData, pin });
      const result = await pinLoginWithRole({ ...loginData, pin }).unwrap();
      console.log('Login response:', result);
      toast.success('Login successful! Welcome back!');
      onComplete(result as unknown);
    } catch (error: unknown) {
      console.error('PIN login error:', error);
      console.error('Error details:', JSON.stringify(error, null, 2));
      const errorMessage = error instanceof Error ? error.message : 'Login failed';
      toast.error(errorMessage);
    }
  };

  return (
    <div className="text-center">
      <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
        Enter Your PIN
      </h2>
      <p className="text-gray-600 dark:text-gray-300 mb-8">
        Enter your 4-6 digit PIN to complete the login process
      </p>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <input
            type="password"
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-center text-2xl tracking-widest"
            placeholder="••••"
            maxLength={6}
            pattern="[0-9]{4,6}"
            required
          />
        </div>

        <div className="flex justify-between pt-6">
          <motion.button
            type="button"
            onClick={onPrev}
            className="flex items-center space-x-2 px-6 py-3 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 cursor-pointer"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <ArrowLeft size={16} />
            <span>Previous</span>
          </motion.button>

           <motion.button
             type="submit"
             disabled={isLoading}
             className="px-8 py-3 bg-gradient-to-r from-green-600 to-blue-600 text-white rounded-xl font-semibold hover:from-green-700 hover:to-blue-700 transition-all duration-300 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
             whileHover={{ scale: isLoading ? 1 : 1.05 }}
             whileTap={{ scale: isLoading ? 1 : 0.95 }}
           >
             {isLoading ? 'Logging In...' : 'Complete Login'}
           </motion.button>
        </div>
      </form>
    </div>
  );
}
