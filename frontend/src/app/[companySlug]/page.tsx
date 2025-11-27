'use client';

/* eslint-disable @next/next/no-img-element */

import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { useGetCompanyBranchesQuery, useGetCompanyBySlugQuery } from '@/lib/api/endpoints/publicApi';
import { BuildingStorefrontIcon, ClockIcon, EnvelopeIcon, ExclamationTriangleIcon, MapPinIcon, PhoneIcon } from '@heroicons/react/24/outline';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import toast from 'react-hot-toast';

export default function CompanyLandingPage() {
  const params = useParams();
  const router = useRouter();
  const companySlug = params.companySlug as string;

  const { 
    data: company, 
    isLoading: companyLoading, 
    isError: companyError,
    error: companyErrorData 
  } = useGetCompanyBySlugQuery(companySlug, {
    skip: !companySlug,
  });
  
  const { 
    data: branches = [], 
    isLoading: branchesLoading,
    isError: branchesError,
    error: branchesErrorData 
  } = useGetCompanyBranchesQuery(companySlug, {
    skip: !companySlug || !company,
  });

  // Show error toast if API errors occur
  useEffect(() => {
    if (companyError) {
      const errorMessage = (companyErrorData as any)?.data?.message || 'Failed to load company information';
      toast.error(errorMessage);
    }
    if (branchesError) {
      const errorMessage = (branchesErrorData as any)?.data?.message || 'Failed to load branches';
      toast.error(errorMessage);
    }
  }, [companyError, branchesError, companyErrorData, branchesErrorData]);

  // Loading state
  if (companyLoading || branchesLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading restaurant information...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (companyError || !company) {
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

  const handleBranchSelect = (branchSlug: string) => {
    if (!branchSlug) {
      toast.error('Invalid branch selected');
      return;
    }
    router.push(`/${companySlug}/${branchSlug}/shop`);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
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
              {company.address && (
                <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 flex items-center gap-1 mt-1">
                  <MapPinIcon className="w-4 h-4 flex-shrink-0" />
                  <span className="truncate">
                    {company.address.city}{company.address.country ? `, ${company.address.country}` : ''}
                  </span>
                </p>
              )}
            </div>
            <nav className="flex gap-2 sm:gap-4 mt-2 sm:mt-0">
              <Link href={`/${companySlug}/about`}>
                <Button variant="ghost" size="sm">About</Button>
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

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
        {/* Branches Grid */}
        <div className="mb-8 md:mb-12">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mb-4 md:mb-6">Select a Location</h2>
          
          {branchesError ? (
            <Card>
              <CardContent className="p-6 md:p-8 text-center">
                <ExclamationTriangleIcon className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
                <p className="text-gray-600 dark:text-gray-400 mb-4">
                  Unable to load locations. Please try again later.
                </p>
                <Button onClick={() => window.location.reload()}>
                  Retry
                </Button>
              </CardContent>
            </Card>
          ) : branches.length === 0 ? (
            <Card>
              <CardContent className="p-6 md:p-8 text-center">
                <BuildingStorefrontIcon className="w-12 h-12 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
                <p className="text-gray-600 dark:text-gray-400">No locations available at the moment.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
              {branches.map((branch: any) => (
                <Card 
                  key={branch.id || branch.slug} 
                  className="hover:shadow-lg transition-all duration-200 hover:scale-[1.02]"
                >
                  <CardContent className="p-4 md:p-6">
                    <div className="mb-4">
                      <h3 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white mb-2">
                        {branch.name}
                      </h3>
                      {branch.address && (
                        <p className="text-sm text-gray-600 dark:text-gray-400 flex items-start gap-1">
                          <MapPinIcon className="w-4 h-4 mt-0.5 flex-shrink-0" />
                          <span>
                            {branch.address.street && `${branch.address.street}, `}
                            {branch.address.city}
                          </span>
                        </p>
                      )}
                    </div>

                    <div className="space-y-2 mb-4">
                      {branch.phone && (
                        <a 
                          href={`tel:${branch.phone}`}
                          className="text-sm text-gray-600 dark:text-gray-400 hover:text-primary-600 dark:hover:text-primary-400 flex items-center gap-2 transition-colors"
                        >
                          <PhoneIcon className="w-4 h-4 flex-shrink-0" />
                          <span>{branch.phone}</span>
                        </a>
                      )}
                      {branch.email && (
                        <a 
                          href={`mailto:${branch.email}`}
                          className="text-sm text-gray-600 dark:text-gray-400 hover:text-primary-600 dark:hover:text-primary-400 flex items-center gap-2 transition-colors"
                        >
                          <EnvelopeIcon className="w-4 h-4 flex-shrink-0" />
                          <span className="truncate">{branch.email}</span>
                        </a>
                      )}
                      {branch.openingHours && branch.openingHours.length > 0 && (
                        <div className="text-sm text-gray-600 dark:text-gray-400">
                          <div className="flex items-center gap-2 mb-1">
                            <ClockIcon className="w-4 h-4 flex-shrink-0" />
                            <span className="font-medium">Hours</span>
                          </div>
                          <div className="ml-6 space-y-1">
                            {branch.openingHours.slice(0, 3).map((hours: any, idx: number) => (
                              <div key={idx} className="text-xs">
                                {hours.day}: {hours.isClosed ? (
                                  <span className="text-red-600 dark:text-red-400">Closed</span>
                                ) : (
                                  `${hours.open} - ${hours.close}`
                                )}
                              </div>
                            ))}
                            {branch.openingHours.length > 3 && (
                              <div className="text-xs text-gray-500 dark:text-gray-500">
                                +{branch.openingHours.length - 3} more days
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>

                    <Button
                      onClick={() => handleBranchSelect(branch.slug)}
                      className="w-full"
                      disabled={!branch.slug || !branch.isActive}
                    >
                      {branch.isActive ? 'View Menu' : 'Currently Closed'}
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Company Info */}
        <Card>
          <CardContent className="p-4 md:p-6">
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mb-4">
              About {company.name}
            </h2>
            {company.description ? (
              <p className="text-gray-600 dark:text-gray-400 mb-6 leading-relaxed whitespace-pre-line">
                {company.description}
              </p>
            ) : (
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                Welcome to {company.name}! We are committed to providing exceptional service and quality products.
              </p>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {company.phone && (
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-1">Phone</h3>
                  <a 
                    href={`tel:${company.phone}`}
                    className="text-gray-600 dark:text-gray-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
                  >
                    {company.phone}
                  </a>
                </div>
              )}
              {company.email && (
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-1">Email</h3>
                  <a 
                    href={`mailto:${company.email}`}
                    className="text-gray-600 dark:text-gray-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors break-all"
                  >
                    {company.email}
                  </a>
                </div>
              )}
              {company.website && (
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-1">Website</h3>
                  <a 
                    href={company.website} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="text-primary-600 dark:text-primary-400 hover:underline break-all"
                  >
                    {company.website}
                  </a>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}

