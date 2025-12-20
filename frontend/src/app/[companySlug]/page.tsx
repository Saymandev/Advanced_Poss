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

  // Generate structured data for SEO
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'Restaurant',
    name: company.name,
    description: company.description || `Welcome to ${company.name}`,
    image: company.logo,
    address: company.address ? {
      '@type': 'PostalAddress',
      streetAddress: company.address.street,
      addressLocality: company.address.city,
      addressRegion: company.address.state,
      postalCode: company.address.zipCode,
      addressCountry: company.address.country,
    } : undefined,
    telephone: company.phone,
    email: company.email,
    url: company.website,
    servesCuisine: 'Food & Beverages',
    priceRange: '$$',
  };

  return (
    <>
      {/* Structured Data for SEO */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />

      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white dark:from-gray-900 dark:to-gray-800">
        {/* Header */}
        <header className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-md shadow-sm sticky top-0 z-10 border-b border-gray-200 dark:border-gray-700">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 md:py-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
              {company.logo && (
                <img 
                  src={company.logo} 
                  alt={company.name} 
                  className="w-12 h-12 sm:w-16 sm:h-16 rounded-lg object-cover flex-shrink-0 ring-2 ring-gray-200 dark:ring-gray-700"
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
              <nav className="flex gap-2 sm:gap-4 mt-2 sm:mt-0 flex-wrap">
                <Link href={`/${companySlug}/about`}>
                  <Button variant="ghost" size="sm">About</Button>
                </Link>
                <Link href={`/${companySlug}/contact`}>
                  <Button variant="ghost" size="sm">Contact</Button>
                </Link>
                <Link href={`/${companySlug}/gallery`}>
                  <Button variant="ghost" size="sm">Gallery</Button>
                </Link>
                {branches.length > 0 && branches[0]?.slug && (
                  <Link href={`/${companySlug}/${branches[0].slug}/rooms`}>
                    <Button variant="ghost" size="sm" className="text-primary-600 dark:text-primary-400 font-semibold">
                      Book a Room
                    </Button>
                  </Link>
                )}
              </nav>
            </div>
          </div>
        </header>

        {/* Hero Section */}
        <section className="relative bg-gradient-to-r from-primary-600 to-primary-800 dark:from-primary-700 dark:to-primary-900 text-white py-12 md:py-16 lg:py-20 overflow-hidden">
          <div className="absolute inset-0 bg-black/10"></div>
          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center">
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-4">
                Welcome to {company.name}
              </h2>
              <p className="text-lg sm:text-xl text-primary-100 max-w-2xl mx-auto mb-6">
                {company.description || 'Discover amazing flavors and experience exceptional service. Order online and enjoy delicious meals delivered to your door.'}
              </p>
              {branches.length > 0 && (
                <p className="text-primary-200 text-sm sm:text-base">
                  {branches.length} location{branches.length !== 1 ? 's' : ''} available
                </p>
              )}
            </div>
          </div>
        </section>

        {/* Main Content */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
          {/* Branches Grid */}
          <div className="mb-8 md:mb-12">
            <div className="flex items-center justify-between mb-6 md:mb-8">
              <div>
                <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-2">
                  Select a Location
                </h2>
                <p className="text-gray-600 dark:text-gray-400">
                  Choose your preferred branch to view menu and place an order
                </p>
              </div>
            </div>
          
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
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
              {branches.map((branch: any) => (
                <Card 
                  key={branch.id || branch.slug} 
                  className="hover:shadow-xl transition-all duration-300 hover:scale-[1.02] border-2 border-transparent hover:border-primary-200 dark:hover:border-primary-800 group overflow-hidden"
                >
                  <CardContent className="p-6 md:p-8">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <h3 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mb-2 group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">
                          {branch.name}
                        </h3>
                        {branch.address && (
                          <p className="text-sm text-gray-600 dark:text-gray-400 flex items-start gap-1.5 mb-3">
                            <MapPinIcon className="w-4 h-4 mt-0.5 flex-shrink-0 text-primary-500" />
                            <span>
                              {branch.address.street && `${branch.address.street}, `}
                              {branch.address.city}
                              {branch.address.zipCode && ` ${branch.address.zipCode}`}
                            </span>
                          </p>
                        )}
                      </div>
                      {branch.isActive && (
                        <span className="ml-2 px-2 py-1 text-xs font-semibold rounded-full bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400">
                          Open
                        </span>
                      )}
                    </div>

                    <div className="space-y-3 mb-6">
                      {branch.phone && (
                        <a 
                          href={`tel:${branch.phone}`}
                          className="text-sm text-gray-600 dark:text-gray-400 hover:text-primary-600 dark:hover:text-primary-400 flex items-center gap-2 transition-colors group/item"
                        >
                          <PhoneIcon className="w-4 h-4 flex-shrink-0 group-hover/item:scale-110 transition-transform" />
                          <span>{branch.phone}</span>
                        </a>
                      )}
                      {branch.email && (
                        <a 
                          href={`mailto:${branch.email}`}
                          className="text-sm text-gray-600 dark:text-gray-400 hover:text-primary-600 dark:hover:text-primary-400 flex items-center gap-2 transition-colors group/item"
                        >
                          <EnvelopeIcon className="w-4 h-4 flex-shrink-0 group-hover/item:scale-110 transition-transform" />
                          <span className="truncate">{branch.email}</span>
                        </a>
                      )}
                      {branch.openingHours && branch.openingHours.length > 0 && (
                        <div className="text-sm text-gray-600 dark:text-gray-400 pt-2 border-t border-gray-200 dark:border-gray-700">
                          <div className="flex items-center gap-2 mb-2">
                            <ClockIcon className="w-4 h-4 flex-shrink-0 text-primary-500" />
                            <span className="font-semibold">Opening Hours</span>
                          </div>
                          <div className="ml-6 space-y-1">
                            {branch.openingHours.slice(0, 3).map((hours: any, idx: number) => (
                              <div key={idx} className="text-xs flex items-center justify-between">
                                <span className="font-medium">{hours.day}:</span>
                                {hours.isClosed ? (
                                  <span className="text-red-600 dark:text-red-400 ml-2">Closed</span>
                                ) : (
                                  <span className="ml-2">{hours.open} - {hours.close}</span>
                                )}
                              </div>
                            ))}
                            {branch.openingHours.length > 3 && (
                              <div className="text-xs text-gray-500 dark:text-gray-500 pt-1">
                                +{branch.openingHours.length - 3} more days
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="flex flex-col gap-2">
                      <Button
                        onClick={() => handleBranchSelect(branch.slug)}
                        className="w-full font-semibold"
                        disabled={!branch.slug || !branch.isActive}
                        size="lg"
                      >
                        {branch.isActive ? (
                          <>
                            View Menu
                            <span className="ml-2">→</span>
                          </>
                        ) : (
                          'Currently Closed'
                        )}
                      </Button>
                      {branch.isActive && branch.slug && (
                        <div className="flex gap-2">
                          <Link href={`/${companySlug}/${branch.slug}/shop`} className="flex-1">
                            <Button variant="secondary" size="sm" className="w-full">
                              Shop
                            </Button>
                          </Link>
                          <Link href={`/${companySlug}/${branch.slug}/rooms`} className="flex-1">
                            <Button variant="secondary" size="sm" className="w-full">
                              Rooms
                            </Button>
                          </Link>
                          <Link href={`/${companySlug}/${branch.slug}/book`} className="flex-1">
                            <Button variant="secondary" size="sm" className="w-full">
                              Book
                            </Button>
                          </Link>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Company Info Section */}
        <section className="mt-12 md:mt-16">
          <Card className="border-2 border-gray-200 dark:border-gray-700 shadow-lg">
            <CardContent className="p-6 md:p-8 lg:p-10">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-1 h-12 bg-primary-600 rounded-full"></div>
                <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
                  About {company.name}
                </h2>
              </div>
              {company.description ? (
                <div className="text-gray-700 dark:text-gray-300 mb-8 leading-relaxed whitespace-pre-line text-base sm:text-lg">
                  {company.description}
                </div>
              ) : (
                <p className="text-gray-700 dark:text-gray-300 mb-8 leading-relaxed text-base sm:text-lg">
                  Welcome to {company.name}! We are committed to providing exceptional service and quality products.
                  Our passion for excellence drives everything we do, from sourcing the finest ingredients to delivering
                  memorable dining experiences for our valued customers.
                </p>
              )}
              
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 pt-6 border-t border-gray-200 dark:border-gray-700">
                {company.phone && (
                  <div className="flex items-start gap-3 group">
                    <div className="p-2 bg-primary-100 dark:bg-primary-900/30 rounded-lg group-hover:bg-primary-200 dark:group-hover:bg-primary-900/50 transition-colors">
                      <PhoneIcon className="w-5 h-5 text-primary-600 dark:text-primary-400" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900 dark:text-white mb-1">Phone</h3>
                      <a 
                        href={`tel:${company.phone}`}
                        className="text-gray-600 dark:text-gray-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
                      >
                        {company.phone}
                      </a>
                    </div>
                  </div>
                )}
                {company.email && (
                  <div className="flex items-start gap-3 group">
                    <div className="p-2 bg-primary-100 dark:bg-primary-900/30 rounded-lg group-hover:bg-primary-200 dark:group-hover:bg-primary-900/50 transition-colors">
                      <EnvelopeIcon className="w-5 h-5 text-primary-600 dark:text-primary-400" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900 dark:text-white mb-1">Email</h3>
                      <a 
                        href={`mailto:${company.email}`}
                        className="text-gray-600 dark:text-gray-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors break-all"
                      >
                        {company.email}
                      </a>
                    </div>
                  </div>
                )}
                {company.website && (
                  <div className="flex items-start gap-3 group">
                    <div className="p-2 bg-primary-100 dark:bg-primary-900/30 rounded-lg group-hover:bg-primary-200 dark:group-hover:bg-primary-900/50 transition-colors">
                      <MapPinIcon className="w-5 h-5 text-primary-600 dark:text-primary-400" />
                    </div>
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
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </section>
      </main>
    </div>
    </>
  );
}

