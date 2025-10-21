'use client';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Checkbox } from '@/components/ui/Checkbox';
import { Input } from '@/components/ui/Input';
import { useRegisterCompanyOwnerMutation } from '@/lib/api/endpoints/authApi';
import { setCredentials } from '@/lib/slices/authSlice';
import { useAppDispatch } from '@/lib/store';
import {
  BuildingStorefrontIcon,
  EnvelopeIcon,
  HomeIcon,
  MapPinIcon,
  PhoneIcon,
  SparklesIcon,
  UserIcon
} from '@heroicons/react/24/outline';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import toast from 'react-hot-toast';

const countries = [
  { value: 'USA', label: 'United States' },
  { value: 'UK', label: 'United Kingdom' },
  { value: 'CA', label: 'Canada' },
  { value: 'AU', label: 'Australia' },
  { value: 'BD', label: 'Bangladesh' },
  { value: 'IN', label: 'India' },
];

const businessTypes = [
  { value: 'restaurant', label: 'Restaurant' },
  { value: 'cafe', label: 'Café' },
  { value: 'bakery', label: 'Bakery' },
  { value: 'bar', label: 'Bar' },
  { value: 'food_truck', label: 'Food Truck' },
  { value: 'other', label: 'Other' },
];

export default function RegisterPage() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const [registerCompanyOwner, { isLoading }] = useRegisterCompanyOwnerMutation();
  const [step, setStep] = useState(1);
  const [agreeTerms, setAgreeTerms] = useState(false);

  const [formData, setFormData] = useState({
    // Company Info
    companyName: '',
    businessType: 'restaurant',
    companyEmail: '',
    companyPhone: '',
    country: 'USA',
    
    // Branch Info
    branchName: '',
    branchAddress: '',
    branchCity: '',
    branchState: '',
    branchZipCode: '',
    
    // Owner Info
    firstName: '',
    lastName: '',
    phoneNumber: '',
    pin: '',
    confirmPin: '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const validateStep1 = () => {
    if (!formData.companyName || !formData.companyEmail || !formData.companyPhone) {
      toast.error('Please fill in all company information');
      return false;
    }
    return true;
  };

  const validateStep2 = () => {
    if (!formData.branchName || !formData.branchAddress || !formData.branchCity || !formData.branchState) {
      toast.error('Please fill in all branch information');
      return false;
    }
    return true;
  };

  const validateStep3 = () => {
    if (!formData.firstName || !formData.lastName || !formData.phoneNumber) {
      toast.error('Please fill in all owner information');
      return false;
    }
    if (formData.pin.length !== 6) {
      toast.error('PIN must be 6 digits');
      return false;
    }
    if (formData.pin !== formData.confirmPin) {
      toast.error('PINs do not match');
      return false;
    }
    if (!agreeTerms) {
      toast.error('Please agree to the terms and conditions');
      return false;
    }
    return true;
  };

  const handleNext = () => {
    if (step === 1 && validateStep1()) setStep(2);
    else if (step === 2 && validateStep2()) setStep(3);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateStep3()) return;

    try {
      const response = await registerCompanyOwner({
        companyName: formData.companyName,
        companyType: formData.businessType,
        companyEmail: formData.companyEmail,
        country: formData.country,
        branchName: formData.branchName,
        branchAddress: {
          street: formData.branchAddress,
          city: formData.branchCity,
          state: formData.branchState,
          country: formData.country,
          zipCode: formData.branchZipCode,
        },
        package: 'starter',
        firstName: formData.firstName,
        lastName: formData.lastName,
        phoneNumber: formData.phoneNumber,
        pin: formData.pin,
      } as any).unwrap();

      dispatch(
        setCredentials({
          user: response.data.user,
          accessToken: response.data.accessToken,
          refreshToken: response.data.refreshToken,
        })
      );

      toast.success('Registration successful! Welcome to Advanced POS.');
      router.push('/dashboard');
    } catch (error: any) {
      toast.error(error?.data?.message || 'Registration failed. Please try again.');
    }
  };

  const renderStepIndicator = () => (
    <div className="flex items-center justify-center mb-8">
      {[1, 2, 3].map((i) => (
        <div key={i} className="flex items-center">
          <div
            className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold transition-all ${
              i === step
                ? 'bg-gradient-to-br from-primary-500 to-secondary-500 text-white scale-110 shadow-lg'
                : i < step
                ? 'bg-green-500 text-white'
                : 'bg-gray-700 text-gray-400'
            }`}
          >
            {i < step ? '✓' : i}
          </div>
          {i < 3 && (
            <div
              className={`w-16 h-1 mx-2 transition-all ${
                i < step ? 'bg-green-500' : 'bg-gray-700'
              }`}
            />
          )}
        </div>
      ))}
    </div>
  );

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-gray-800 to-black p-4 relative overflow-hidden">
      {/* Animated background */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-primary-900/30 via-transparent to-transparent animate-pulse"></div>
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,_var(--tw-gradient-stops))] from-secondary-900/30 via-transparent to-transparent animate-pulse" style={{ animationDelay: '1s' }}></div>

      <div className="w-full max-w-2xl relative z-10">
        {/* Home Button */}
        <Link href="/" className="inline-flex items-center gap-2 text-white/80 hover:text-white mb-6 transition-colors group">
          <HomeIcon className="w-5 h-5 group-hover:scale-110 transition-transform" />
          <span>Back to Home</span>
        </Link>

        <Card className="backdrop-blur-xl bg-gray-800/50 border border-gray-700/50 shadow-2xl">
          {/* Header */}
          <div className="relative p-8 pb-6">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary-500 via-secondary-500 to-primary-500"></div>
            
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-primary-500 to-secondary-500 rounded-2xl mb-4">
                <SparklesIcon className="w-8 h-8 text-white" />
              </div>
              <h1 className="text-3xl font-bold text-white mb-2">Create Your Account</h1>
              <p className="text-gray-400">Set up your restaurant in minutes</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="p-8 pt-0">
            {renderStepIndicator()}

            {/* Step 1: Company Information */}
            {step === 1 && (
              <div className="space-y-5 animate-fade-in">
                <h3 className="text-xl font-semibold text-white flex items-center gap-2 mb-4">
                  <BuildingStorefrontIcon className="w-6 h-6 text-primary-400" />
                  Company Information
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <Input
                      name="companyName"
                      value={formData.companyName}
                      onChange={handleChange}
                      placeholder="Restaurant Name"
                      className="h-12 bg-gray-900/50 border-gray-700 text-white focus:border-primary-500"
                      required
                    />
                  </div>

                  <select
                    name="businessType"
                    value={formData.businessType}
                    onChange={handleChange}
                    className="h-12 bg-gray-900/50 border-gray-700 text-white px-4 py-2 rounded-lg focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 focus:outline-none"
                  >
                    {businessTypes.map((type) => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </select>

                  <select
                    name="country"
                    value={formData.country}
                    onChange={handleChange}
                    className="h-12 bg-gray-900/50 border-gray-700 text-white px-4 py-2 rounded-lg focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 focus:outline-none"
                  >
                    {countries.map((country) => (
                      <option key={country.value} value={country.value}>
                        {country.label}
                      </option>
                    ))}
                  </select>

                  <div className="relative">
                    <EnvelopeIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                    <Input
                      type="email"
                      name="companyEmail"
                      value={formData.companyEmail}
                      onChange={handleChange}
                      placeholder="company@email.com"
                      className="pl-11 h-12 bg-gray-900/50 border-gray-700 text-white"
                      required
                    />
                  </div>

                  <div className="relative">
                    <PhoneIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                    <Input
                      type="tel"
                      name="companyPhone"
                      value={formData.companyPhone}
                      onChange={handleChange}
                      placeholder="+1-234-567-8900"
                      className="pl-11 h-12 bg-gray-900/50 border-gray-700 text-white"
                      required
                    />
                  </div>
                </div>

                <Button
                  type="button"
                  onClick={handleNext}
                  className="w-full h-12 bg-gradient-to-r from-primary-600 to-secondary-600 hover:from-primary-700 hover:to-secondary-700"
                >
                  Next Step →
                </Button>
              </div>
            )}

            {/* Step 2: Branch Information */}
            {step === 2 && (
              <div className="space-y-5 animate-fade-in">
                <h3 className="text-xl font-semibold text-white flex items-center gap-2 mb-4">
                  <MapPinIcon className="w-6 h-6 text-primary-400" />
                  Branch Information
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <Input
                      name="branchName"
                      value={formData.branchName}
                      onChange={handleChange}
                      placeholder="Branch Name"
                      className="h-12 bg-gray-900/50 border-gray-700 text-white"
                      required
                    />
                  </div>

                  <div className="md:col-span-2">
                    <Input
                      name="branchAddress"
                      value={formData.branchAddress}
                      onChange={handleChange}
                      placeholder="Street Address"
                      className="h-12 bg-gray-900/50 border-gray-700 text-white"
                      required
                    />
                  </div>

                  <Input
                    name="branchCity"
                    value={formData.branchCity}
                    onChange={handleChange}
                    placeholder="City"
                    className="h-12 bg-gray-900/50 border-gray-700 text-white"
                    required
                  />

                  <Input
                    name="branchState"
                    value={formData.branchState}
                    onChange={handleChange}
                    placeholder="State/Province"
                    className="h-12 bg-gray-900/50 border-gray-700 text-white"
                    required
                  />

                  <Input
                    name="branchZipCode"
                    value={formData.branchZipCode}
                    onChange={handleChange}
                    placeholder="ZIP Code"
                    className="h-12 bg-gray-900/50 border-gray-700 text-white"
                  />
                </div>

                <div className="flex gap-3">
                  <Button
                    type="button"
                    onClick={() => setStep(1)}
                    variant="secondary"
                    className="flex-1 h-12 bg-gray-700/50 hover:bg-gray-700"
                  >
                    ← Back
                  </Button>
                  <Button
                    type="button"
                    onClick={handleNext}
                    className="flex-1 h-12 bg-gradient-to-r from-primary-600 to-secondary-600"
                  >
                    Next Step →
                  </Button>
                </div>
              </div>
            )}

            {/* Step 3: Owner Information */}
            {step === 3 && (
              <div className="space-y-5 animate-fade-in">
                <h3 className="text-xl font-semibold text-white flex items-center gap-2 mb-4">
                  <UserIcon className="w-6 h-6 text-primary-400" />
                  Owner Information
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    name="firstName"
                    value={formData.firstName}
                    onChange={handleChange}
                    placeholder="First Name"
                    className="h-12 bg-gray-900/50 border-gray-700 text-white"
                    required
                  />

                  <Input
                    name="lastName"
                    value={formData.lastName}
                    onChange={handleChange}
                    placeholder="Last Name"
                    className="h-12 bg-gray-900/50 border-gray-700 text-white"
                    required
                  />

                  <div className="md:col-span-2 relative">
                    <PhoneIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                    <Input
                      type="tel"
                      name="phoneNumber"
                      value={formData.phoneNumber}
                      onChange={handleChange}
                      placeholder="+1-234-567-8900"
                      className="pl-11 h-12 bg-gray-900/50 border-gray-700 text-white"
                      required
                    />
                  </div>

                  <div>
                    <label className="text-sm text-gray-400 mb-1 block">PIN (6 digits)</label>
                    <Input
                      type="password"
                      name="pin"
                      value={formData.pin}
                      onChange={handleChange}
                      placeholder="••••••"
                      maxLength={6}
                      className="h-12 bg-gray-900/50 border-gray-700 text-white"
                      required
                    />
                  </div>

                  <div>
                    <label className="text-sm text-gray-400 mb-1 block">Confirm PIN</label>
                    <Input
                      type="password"
                      name="confirmPin"
                      value={formData.confirmPin}
                      onChange={handleChange}
                      placeholder="••••••"
                      maxLength={6}
                      className="h-12 bg-gray-900/50 border-gray-700 text-white"
                      required
                    />
                  </div>
                </div>

                <div className="bg-gray-900/50 border border-gray-700 rounded-lg p-4">
                  <Checkbox
                    checked={agreeTerms}
                    onChange={(e) => setAgreeTerms(e.target.checked)}
                    label={
                      <span className="text-sm text-gray-300">
                        I agree to the{' '}
                        <a href="#" className="text-primary-400 hover:text-primary-300">
                          Terms and Conditions
                        </a>
                        {' '}and{' '}
                        <a href="#" className="text-primary-400 hover:text-primary-300">
                          Privacy Policy
                        </a>
                      </span>
                    }
                  />
                </div>

                <div className="flex gap-3">
                  <Button
                    type="button"
                    onClick={() => setStep(2)}
                    variant="secondary"
                    className="flex-1 h-12 bg-gray-700/50 hover:bg-gray-700"
                  >
                    ← Back
                  </Button>
                  <Button
                    type="submit"
                    isLoading={isLoading}
                    className="flex-1 h-12 bg-gradient-to-r from-primary-600 to-secondary-600 hover:from-primary-700 hover:to-secondary-700 shadow-lg"
                  >
                    Create Account
                  </Button>
                </div>
              </div>
            )}

            <div className="text-center pt-6 border-t border-gray-700/50 mt-6">
              <p className="text-gray-400 text-sm">
                Already have an account?{' '}
                <Link href="/auth/login" className="text-primary-400 hover:text-primary-300 font-semibold">
                  Login here
                </Link>
              </p>
            </div>
          </form>
        </Card>

        <p className="text-center text-gray-500 text-sm mt-8">
          © 2024 Advanced POS. All rights reserved.
        </p>
      </div>
    </div>
  );
}
