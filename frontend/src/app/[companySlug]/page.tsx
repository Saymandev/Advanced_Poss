'use client';

/* eslint-disable @next/next/no-img-element */

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { useGetCompanyBranchesQuery, useGetCompanyBySlugQuery } from '@/lib/api/endpoints/publicApi';
import { BuildingStorefrontIcon, ClockIcon, EnvelopeIcon, MapPinIcon, PhoneIcon } from '@heroicons/react/24/outline';
import { useParams, useRouter } from 'next/navigation';

export default function CompanyLandingPage() {
  const params = useParams();
  const router = useRouter();
  const companySlug = params.companySlug as string;

  const { data: company, isLoading: companyLoading } = useGetCompanyBySlugQuery(companySlug);
  const { data: branches = [], isLoading: branchesLoading } = useGetCompanyBranchesQuery(companySlug);

  if (companyLoading || branchesLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!company) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Company Not Found</h1>
          <p className="text-gray-600">The restaurant you're looking for doesn't exist.</p>
        </div>
      </div>
    );
  }

  const handleBranchSelect = (branchSlug: string) => {
    router.push(`/${companySlug}/${branchSlug}/shop`);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center gap-4">
            {company.logo && (
              <img src={company.logo} alt={company.name} className="w-16 h-16 rounded-lg object-cover" />
            )}
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{company.name}</h1>
              {company.address && (
                <p className="text-gray-600 flex items-center gap-1 mt-1">
                  <MapPinIcon className="w-4 h-4" />
                  {company.address.city}, {company.address.country}
                </p>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Branches Grid */}
        <div className="mb-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Select a Location</h2>
          
          {branches.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <BuildingStorefrontIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">No locations available at the moment.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {branches.map((branch: any) => (
                <Card key={branch.id} className="hover:shadow-lg transition-shadow">
                  <div className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="text-xl font-semibold text-gray-900 mb-1">{branch.name}</h3>
                        {branch.address && (
                          <p className="text-sm text-gray-600 flex items-center gap-1">
                            <MapPinIcon className="w-4 h-4" />
                            {branch.address.street}, {branch.address.city}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="space-y-2 mb-4">
                      {branch.phone && (
                        <p className="text-sm text-gray-600 flex items-center gap-2">
                          <PhoneIcon className="w-4 h-4" />
                          {branch.phone}
                        </p>
                      )}
                      {branch.email && (
                        <p className="text-sm text-gray-600 flex items-center gap-2">
                          <EnvelopeIcon className="w-4 h-4" />
                          {branch.email}
                        </p>
                      )}
                      {branch.openingHours && branch.openingHours.length > 0 && (
                        <div className="text-sm text-gray-600">
                          <div className="flex items-center gap-2 mb-1">
                            <ClockIcon className="w-4 h-4" />
                            <span className="font-medium">Hours</span>
                          </div>
                          <div className="ml-6">
                            {branch.openingHours.slice(0, 2).map((hours: any, idx: number) => (
                              <div key={idx} className="text-xs">
                                {hours.day}: {hours.isClosed ? 'Closed' : `${hours.open} - ${hours.close}`}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    <Button
                      onClick={() => handleBranchSelect(branch.slug)}
                      className="w-full"
                    >
                      View Menu
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Company Info */}
        <Card>
          <div className="p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">About {company.name}</h2>
            {company.description && (
              <p className="text-gray-600 mb-4">{company.description}</p>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {company.phone && (
                <div>
                  <h3 className="font-semibold text-gray-900 mb-1">Phone</h3>
                  <p className="text-gray-600">{company.phone}</p>
                </div>
              )}
              {company.email && (
                <div>
                  <h3 className="font-semibold text-gray-900 mb-1">Email</h3>
                  <p className="text-gray-600">{company.email}</p>
                </div>
              )}
              {company.website && (
                <div>
                  <h3 className="font-semibold text-gray-900 mb-1">Website</h3>
                  <a href={company.website} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                    {company.website}
                  </a>
                </div>
              )}
            </div>
          </div>
        </Card>
      </main>
    </div>
  );
}

function CardContent({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <div className={className}>{children}</div>;
}

