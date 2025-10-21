'use client';

import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { useRegisterCompanyOwnerMutation } from '@/lib/api/endpoints/authApi';
import { setCredentials } from '@/lib/slices/authSlice';
import { useAppDispatch } from '@/lib/store';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import toast from 'react-hot-toast';

export default function RegisterPage() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    // Company info
    companyName: '',
    companyType: 'restaurant',
    country: '',
    companyEmail: '',
    // Branch info
    branchName: '',
    street: '',
    city: '',
    state: '',
    zipCode: '',
    // Owner info
    firstName: '',
    lastName: '',
    phoneNumber: '',
    pin: '',
    confirmPin: '',
    // Subscription
    package: 'basic',
  });

  const [registerCompanyOwner, { isLoading }] = useRegisterCompanyOwnerMutation();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleNextStep = () => {
    if (step === 1) {
      if (!formData.companyName || !formData.companyEmail || !formData.country) {
        toast.error('Please fill in all company details');
        return;
      }
    } else if (step === 2) {
      if (!formData.branchName || !formData.street || !formData.city || !formData.state || !formData.zipCode) {
        toast.error('Please fill in all branch details');
        return;
      }
    }
    setStep(step + 1);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.firstName || !formData.lastName || !formData.phoneNumber || !formData.pin) {
      toast.error('Please fill in all owner details');
      return;
    }

    if (formData.pin.length < 4) {
      toast.error('PIN must be at least 4 digits');
      return;
    }

    if (formData.pin !== formData.confirmPin) {
      toast.error('PINs do not match');
      return;
    }

    try {
      const response = await registerCompanyOwner({
        companyName: formData.companyName,
        companyType: formData.companyType,
        country: formData.country,
        companyEmail: formData.companyEmail,
        branchName: formData.branchName,
        branchAddress: {
          street: formData.street,
          city: formData.city,
          state: formData.state,
          country: formData.country,
          zipCode: formData.zipCode,
        },
        package: formData.package,
        firstName: formData.firstName,
        lastName: formData.lastName,
        phoneNumber: formData.phoneNumber,
        pin: formData.pin,
      }).unwrap();

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

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-500 via-primary-600 to-secondary-600 p-4">
      <div className="w-full max-w-2xl">
        <Link href="/auth/login" className="text-white mb-4 flex items-center gap-2 hover:underline">
          <ArrowLeftIcon className="w-4 h-4" />
          Back to login
        </Link>

        <Card className="shadow-2xl">
          <CardHeader>
            <CardTitle className="text-center">Register Your Business</CardTitle>
            <p className="text-sm text-gray-600 dark:text-gray-400 text-center mt-2">
              Step {step} of 3 - {step === 1 ? 'Company Details' : step === 2 ? 'Branch Information' : 'Owner Details'}
            </p>
            <div className="flex gap-2 mt-4">
              {[1, 2, 3].map((s) => (
                <div
                  key={s}
                  className={`flex-1 h-2 rounded-full ${
                    s <= step ? 'bg-primary-500' : 'bg-gray-200 dark:bg-gray-700'
                  }`}
                />
              ))}
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {step === 1 && (
                <>
                  <Input
                    label="Company Name"
                    name="companyName"
                    value={formData.companyName}
                    onChange={handleChange}
                    placeholder="The Golden Fork Restaurant"
                    required
                  />

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Business Type
                    </label>
                    <select
                      name="companyType"
                      value={formData.companyType}
                      onChange={handleChange}
                      className="input w-full"
                    >
                      <option value="restaurant">Restaurant</option>
                      <option value="cafe">Cafe</option>
                      <option value="bar">Bar</option>
                      <option value="fast-food">Fast Food</option>
                      <option value="food-truck">Food Truck</option>
                    </select>
                  </div>

                  <Input
                    type="email"
                    label="Company Email"
                    name="companyEmail"
                    value={formData.companyEmail}
                    onChange={handleChange}
                    placeholder="contact@goldenfork.com"
                    required
                  />

                  <Input
                    label="Country"
                    name="country"
                    value={formData.country}
                    onChange={handleChange}
                    placeholder="United States"
                    required
                  />

                  <Button type="button" onClick={handleNextStep} className="w-full">
                    Next Step
                  </Button>
                </>
              )}

              {step === 2 && (
                <>
                  <Input
                    label="Branch Name"
                    name="branchName"
                    value={formData.branchName}
                    onChange={handleChange}
                    placeholder="Downtown Branch"
                    required
                  />

                  <Input
                    label="Street Address"
                    name="street"
                    value={formData.street}
                    onChange={handleChange}
                    placeholder="123 Main Street"
                    required
                  />

                  <div className="grid grid-cols-2 gap-4">
                    <Input
                      label="City"
                      name="city"
                      value={formData.city}
                      onChange={handleChange}
                      placeholder="New York"
                      required
                    />

                    <Input
                      label="State"
                      name="state"
                      value={formData.state}
                      onChange={handleChange}
                      placeholder="NY"
                      required
                    />
                  </div>

                  <Input
                    label="ZIP Code"
                    name="zipCode"
                    value={formData.zipCode}
                    onChange={handleChange}
                    placeholder="10001"
                    required
                  />

                  <div className="flex gap-3">
                    <Button type="button" onClick={() => setStep(1)} variant="secondary" className="flex-1">
                      Back
                    </Button>
                    <Button type="button" onClick={handleNextStep} className="flex-1">
                      Next Step
                    </Button>
                  </div>
                </>
              )}

              {step === 3 && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <Input
                      label="First Name"
                      name="firstName"
                      value={formData.firstName}
                      onChange={handleChange}
                      placeholder="John"
                      required
                    />

                    <Input
                      label="Last Name"
                      name="lastName"
                      value={formData.lastName}
                      onChange={handleChange}
                      placeholder="Smith"
                      required
                    />
                  </div>

                  <Input
                    type="tel"
                    label="Phone Number"
                    name="phoneNumber"
                    value={formData.phoneNumber}
                    onChange={handleChange}
                    placeholder="+1234567890"
                    required
                  />

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Subscription Plan
                    </label>
                    <select
                      name="package"
                      value={formData.package}
                      onChange={handleChange}
                      className="input w-full"
                    >
                      <option value="basic">Basic - $29/month</option>
                      <option value="professional">Professional - $79/month</option>
                      <option value="premium">Premium - $149/month</option>
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <Input
                      type="password"
                      label="Create PIN (4-6 digits)"
                      name="pin"
                      value={formData.pin}
                      onChange={handleChange}
                      placeholder="••••"
                      maxLength={6}
                      required
                    />

                    <Input
                      type="password"
                      label="Confirm PIN"
                      name="confirmPin"
                      value={formData.confirmPin}
                      onChange={handleChange}
                      placeholder="••••"
                      maxLength={6}
                      required
                    />
                  </div>

                  <div className="flex gap-3">
                    <Button type="button" onClick={() => setStep(2)} variant="secondary" className="flex-1">
                      Back
                    </Button>
                    <Button type="submit" className="flex-1" isLoading={isLoading}>
                      Complete Registration
                    </Button>
                  </div>
                </>
              )}
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

