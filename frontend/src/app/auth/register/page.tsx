'use client';

import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { useHydration } from '@/hooks/useHydration';
import { useRegisterCompanyOwnerMutation } from '@/lib/api/authApi';
import { setCredentials } from '@/lib/slices/authSlice';
import { CompanyOwnerRegisterData } from '@/types/auth';
import { motion } from 'framer-motion';
import { ArrowLeft, Building2, MapPin, User } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'react-hot-toast';
import { useDispatch } from 'react-redux';

export default function RegisterPage() {
  const isHydrated = useHydration();
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<CompanyOwnerRegisterData>({
    // Company Information
    companyName: '',
    companyType: 'restaurant',
    country: '',
    companyEmail: '',
    
    // Branch Information
    branchName: '',
    branchAddress: '', // Changed to string
    package: 'basic',
    
    // Owner Information
    firstName: '',
    lastName: '',
    phoneNumber: '',
    pin: '',
  });

  const steps = [
    { number: 1, title: 'Company Info', icon: Building2 },
    { number: 2, title: 'Branch Info', icon: MapPin },
    { number: 3, title: 'Owner Info', icon: User },
  ];

  const router = useRouter();
  const dispatch = useDispatch();
  const [registerCompanyOwner, { isLoading }] = useRegisterCompanyOwnerMutation();


  const validatePhoneNumber = (phone: string): boolean => {
    // BD phone number: +880 followed by 11 digits (total 14 digits)
    const bdPhoneRegex = /^\+8801[3-9]\d{8}$/;
    return bdPhoneRegex.test(phone);
  };

  const validateStep = (step: number): boolean => {
    switch (step) {
      case 1: // Company Info
        return !!(formData.companyName && formData.companyType && formData.country && formData.companyEmail);
      case 2: // Branch Info
        return !!(formData.branchName && formData.branchAddress);
      case 3: // Owner Info
        return !!(formData.firstName && formData.lastName && formData.phoneNumber && formData.pin && validatePhoneNumber(formData.phoneNumber));
      default:
        return false;
    }
  };

  const handleNext = () => {
    if (currentStep < 3 && validateStep(currentStep)) {
      setCurrentStep(currentStep + 1);
    } else if (!validateStep(currentStep)) {
      toast.error('Please fill in all required fields before proceeding');
    }
  };

  const handlePrev = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const result = await registerCompanyOwner(formData).unwrap();
      dispatch(setCredentials(result));
      
      // Check if payment is required
      if (result.requiresPayment) {
        toast.success('Registration successful! Redirecting to payment...');
        // Redirect to Stripe payment page
        router.push(`/payment?plan=${formData.package}`);
      } else {
        toast.success('Registration successful! Welcome to your dashboard!');
        router.push('/dashboard');
      }
    } catch (error: unknown) {
      console.error('Registration error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Registration failed';
      toast.error(errorMessage);
    }
  };

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

      {/* Registration Card */}
      <motion.div
        className="w-full max-w-2xl"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 border border-gray-100 dark:border-gray-700">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
              Register Your Restaurant
            </h1>
            <p className="text-gray-600 dark:text-gray-300">
              Get started with your restaurant management system
            </p>
          </div>

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
                    <span className={`text-xs mt-2 font-medium ${
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

          {/* Form */}
          {!isHydrated ? (
            <div className="space-y-6">
              <div className="animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
                <div className="h-10 bg-gray-200 rounded mb-4"></div>
                <div className="h-4 bg-gray-200 rounded w-1/2 mb-4"></div>
                <div className="h-10 bg-gray-200 rounded"></div>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
            {currentStep === 1 && (
              <CompanyInfoStep
                data={formData}
                onChange={setFormData}
              />
            )}
            
            {currentStep === 2 && (
              <BranchInfoStep
                data={formData}
                onChange={setFormData}
              />
            )}
            
            {currentStep === 3 && (
              <OwnerInfoStep
                data={formData}
                onChange={setFormData}
              />
            )}

            {/* Navigation Buttons */}
            <div className="flex justify-between pt-6">
              <motion.button
                type="button"
                onClick={handlePrev}
                disabled={currentStep === 1}
                className="flex items-center space-x-2 px-6 py-3 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                whileHover={{ scale: currentStep > 1 ? 1.05 : 1 }}
                whileTap={{ scale: currentStep > 1 ? 0.95 : 1 }}
              >
                <ArrowLeft size={16} />
                <span>Previous</span>
              </motion.button>

              {currentStep < 3 ? (
                <motion.button
                  type="button"
                  onClick={handleNext}
                  disabled={!validateStep(currentStep)}
                  className="px-8 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl font-semibold hover:from-blue-700 hover:to-purple-700 transition-all duration-300 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                  whileHover={{ scale: validateStep(currentStep) ? 1.05 : 1 }}
                  whileTap={{ scale: validateStep(currentStep) ? 0.95 : 1 }}
                >
                  Next Step
                </motion.button>
              ) : (
                 <motion.button
                   type="submit"
                   disabled={isLoading || !validateStep(3)}
                   className="px-8 py-3 bg-gradient-to-r from-green-600 to-blue-600 text-white rounded-xl font-semibold hover:from-green-700 hover:to-blue-700 transition-all duration-300 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                   whileHover={{ scale: (isLoading || !validateStep(3)) ? 1 : 1.05 }}
                   whileTap={{ scale: (isLoading || !validateStep(3)) ? 1 : 0.95 }}
                 >
                   {isLoading ? 'Registering...' : 'Complete Registration'}
                 </motion.button>
              )}
            </div>
          </form>
          )}

          {/* Footer */}
          <div className="mt-8 text-center">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Already have an account?{' '}
              <Link href="/auth/login" className="text-blue-600 dark:text-blue-400 hover:underline font-medium">
                Sign in here
              </Link>
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

function CompanyInfoStep({ data, onChange }: { data: CompanyOwnerRegisterData; onChange: (data: CompanyOwnerRegisterData) => void }) {
  return (
    <div className="space-y-6">
      <h3 className="text-xl font-semibold text-gray-900 dark:text-white">Company Information</h3>
      
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Company Name *
        </label>
        <input
          type="text"
          value={data.companyName}
          onChange={(e) => onChange({ ...data, companyName: e.target.value })}
          className="w-full px-3 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          placeholder="e.g., The Golden Fork Restaurant"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Company Type *
        </label>
        <select
          value={data.companyType}
          onChange={(e) => onChange({ ...data, companyType: e.target.value as 'restaurant' | 'cafe' | 'bar' })}
          className="w-full px-3 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          required
        >
          <option value="restaurant">Restaurant</option>
          <option value="cafe">Cafe</option>
          <option value="bar">Bar</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Country *
        </label>
        <input
          type="text"
          value={data.country}
          onChange={(e) => onChange({ ...data, country: e.target.value })}
          className="w-full px-3 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          placeholder="e.g., United States"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Company Email *
        </label>
        <input
          type="email"
          value={data.companyEmail}
          onChange={(e) => onChange({ ...data, companyEmail: e.target.value })}
          className="w-full px-3 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          placeholder="contact@restaurant.com"
          required
        />
      </div>
    </div>
  );
}

function BranchInfoStep({ data, onChange }: { data: CompanyOwnerRegisterData; onChange: (data: CompanyOwnerRegisterData) => void }) {
  return (
    <div className="space-y-6">
      <h3 className="text-xl font-semibold text-gray-900 dark:text-white">Branch Information</h3>
      
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Branch Name *
        </label>
        <input
          type="text"
          value={data.branchName}
          onChange={(e) => onChange({ ...data, branchName: e.target.value })}
          className="w-full px-3 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          placeholder="e.g., Downtown Branch"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Branch Address *
        </label>
        <textarea
          value={data.branchAddress}
          onChange={(e) => onChange({ ...data, branchAddress: e.target.value })}
          className="w-full px-3 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          placeholder="123 Main Street, New York, NY 10001, United States"
          rows={3}
          required
        />
        <p className="text-sm text-gray-500 mt-1">
          Enter the complete address including street, city, state, zip code, and country
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Subscription Package *
        </label>
        <select
          value={data.package}
          onChange={(e) => onChange({ ...data, package: e.target.value })}
          className="w-full px-3 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          required
        >
          <option value="basic">Basic - FREE (12h trial)</option>
          <option value="premium">Premium - ৳2,500/month (7 days trial)</option>
          <option value="enterprise">Enterprise - ৳5,000/month (7 days trial)</option>
        </select>
      </div>
    </div>
  );
}

function OwnerInfoStep({ data, onChange }: { data: CompanyOwnerRegisterData; onChange: (data: CompanyOwnerRegisterData) => void }) {
  const validatePhoneNumber = (phone: string): boolean => {
    // BD phone number: +880 followed by 11 digits (total 14 digits)
    const bdPhoneRegex = /^\+8801[3-9]\d{8}$/;
    return bdPhoneRegex.test(phone);
  };
  return (
    <div className="space-y-6">
      <h3 className="text-xl font-semibold text-gray-900 dark:text-white">Owner Information</h3>
      
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            First Name *
          </label>
          <input
            type="text"
            value={data.firstName}
            onChange={(e) => onChange({ ...data, firstName: e.target.value })}
            className="w-full px-3 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            placeholder="John"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Last Name *
          </label>
          <input
            type="text"
            value={data.lastName}
            onChange={(e) => onChange({ ...data, lastName: e.target.value })}
            className="w-full px-3 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            placeholder="Smith"
            required
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Phone Number *
        </label>
        <input
          type="tel"
          value={data.phoneNumber}
          onChange={(e) => onChange({ ...data, phoneNumber: e.target.value })}
          className={`w-full px-3 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white ${
            data.phoneNumber && !validatePhoneNumber(data.phoneNumber) 
              ? 'border-red-500 dark:border-red-500' 
              : 'border-gray-300 dark:border-gray-600'
          }`}
          placeholder="+8801712345678"
          required
        />
        {data.phoneNumber && !validatePhoneNumber(data.phoneNumber) && (
          <p className="text-red-500 text-sm mt-1">
            Please enter a valid BD phone number (e.g., +8801712345678)
          </p>
        )}
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
          BD phone number: +880 followed by 11 digits (e.g., +8801712345678)
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          PIN (4-6 digits) *
        </label>
        <input
          type="password"
          value={data.pin}
          onChange={(e) => onChange({ ...data, pin: e.target.value })}
          className="w-full px-3 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          placeholder="1234"
          maxLength={6}
          pattern="[0-9]{4,6}"
          required
        />
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
          This PIN will be used for quick login to your POS system
        </p>
      </div>
    </div>
  );
}
