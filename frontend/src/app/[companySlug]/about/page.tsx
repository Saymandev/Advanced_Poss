'use client';

/* eslint-disable @next/next/no-img-element */

import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { useGetCompanyBySlugQuery } from '@/lib/api/endpoints/publicApi';
import { EnvelopeIcon, ExclamationTriangleIcon, GlobeAltIcon, MapPinIcon, PhoneIcon } from '@heroicons/react/24/outline';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import toast from 'react-hot-toast';

export default function AboutPage() {
  const params = useParams();
  const router = useRouter();
  const companySlug = params.companySlug as string;
  
  const { 
    data: company, 
    isLoading, 
    isError,
    error 
  } = useGetCompanyBySlugQuery(companySlug, {
    skip: !companySlug,
  });

  useEffect(() => {
    if (isError) {
      const errorMessage = (error as any)?.data?.message || 'Failed to load company information';
      toast.error(errorMessage);
    }
  }, [isError, error]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  if (isError || !company) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4">
        <Card className="max-w-md w-full">
          <CardContent className="p-8 text-center">
            <ExclamationTriangleIcon className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Company Not Found</h1>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              The restaurant you're looking for doesn't exist or may have been removed.
            </p>
            <Button onClick={() => router.push('/')}>
              Go to Homepage
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <header className="bg-white dark:bg-gray-800 shadow-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 md:py-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            {company.logo && (
              <img 
                src={company.logo} 
                alt={company.name} 
                className="w-12 h-12 sm:w-16 sm:h-16 rounded-lg object-cover flex-shrink-0"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
            )}
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">{company.name}</h1>
              <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400">About Us</p>
            </div>
            <nav className="flex gap-2 sm:gap-4 mt-2 sm:mt-0">
              <Link href={`/${companySlug}`}>
                <Button variant="ghost" size="sm">Home</Button>
              </Link>
              <Link href={`/${companySlug}/contact`}>
                <Button variant="ghost" size="sm">Contact</Button>
              </Link>
              <Link href={`/${companySlug}/gallery`}>
                <Button variant="ghost" size="sm">Gallery</Button>
              </Link>
            </nav>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
        <Card>
          <CardContent className="p-6 md:p-8">
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-4 md:mb-6">Our Story</h2>
            {company.description ? (
              <div className="text-gray-700 dark:text-gray-300 text-base sm:text-lg leading-relaxed mb-6 md:mb-8 whitespace-pre-line">
                {company.description}
              </div>
            ) : (
              <p className="text-gray-700 dark:text-gray-300 text-base sm:text-lg leading-relaxed mb-6 md:mb-8">
                Welcome to {company.name}! We are passionate about serving delicious food
                and creating memorable dining experiences for our customers. Our commitment
                to quality ingredients, exceptional service, and a warm atmosphere has made
                us a beloved establishment in the community.
              </p>
            )}

            <div className="border-t border-gray-200 dark:border-gray-700 pt-6 md:pt-8">
              <h3 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mb-4 md:mb-6">Contact Information</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6">
                {company.address && (
                  <div className="flex items-start gap-3">
                    <MapPinIcon className="w-5 h-5 sm:w-6 sm:h-6 text-gray-400 dark:text-gray-500 mt-1 flex-shrink-0" />
                    <div>
                      <h4 className="font-semibold text-gray-900 dark:text-white mb-1">Address</h4>
                      <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400">
                        {company.address.street && `${company.address.street}, `}
                        {company.address.city}
                        {company.address.state && `, ${company.address.state}`}
                        {company.address.zipCode && ` ${company.address.zipCode}`}
                        {company.address.country && <><br />{company.address.country}</>}
                      </p>
                    </div>
                  </div>
                )}
                {company.phone && (
                  <div className="flex items-start gap-3">
                    <PhoneIcon className="w-5 h-5 sm:w-6 sm:h-6 text-gray-400 dark:text-gray-500 mt-1 flex-shrink-0" />
                    <div>
                      <h4 className="font-semibold text-gray-900 dark:text-white mb-1">Phone</h4>
                      <a 
                        href={`tel:${company.phone}`}
                        className="text-sm sm:text-base text-gray-600 dark:text-gray-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
                      >
                        {company.phone}
                      </a>
                    </div>
                  </div>
                )}
                {company.email && (
                  <div className="flex items-start gap-3">
                    <EnvelopeIcon className="w-5 h-5 sm:w-6 sm:h-6 text-gray-400 dark:text-gray-500 mt-1 flex-shrink-0" />
                    <div>
                      <h4 className="font-semibold text-gray-900 dark:text-white mb-1">Email</h4>
                      <a 
                        href={`mailto:${company.email}`}
                        className="text-sm sm:text-base text-gray-600 dark:text-gray-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors break-all"
                      >
                        {company.email}
                      </a>
                    </div>
                  </div>
                )}
                {company.website && (
                  <div className="flex items-start gap-3">
                    <GlobeAltIcon className="w-5 h-5 sm:w-6 sm:h-6 text-gray-400 dark:text-gray-500 mt-1 flex-shrink-0" />
                    <div>
                      <h4 className="font-semibold text-gray-900 dark:text-white mb-1">Website</h4>
                      <a 
                        href={company.website} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="text-sm sm:text-base text-primary-600 dark:text-primary-400 hover:underline break-all"
                      >
                        {company.website}
                      </a>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="mt-6 md:mt-8 text-center">
          <Link href={`/${companySlug}`}>
            <Button variant="ghost">
              ← Back to Home
            </Button>
          </Link>
        </div>
      </main>
    </div>
  );
}

