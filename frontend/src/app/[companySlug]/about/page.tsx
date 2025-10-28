'use client';

import { Card } from '@/components/ui/Card';
import { useGetCompanyBySlugQuery } from '@/lib/api/endpoints/publicApi';
import { EnvelopeIcon, GlobeAltIcon, MapPinIcon, PhoneIcon } from '@heroicons/react/24/outline';
import Link from 'next/link';
import { useParams } from 'next/navigation';

export default function AboutPage() {
  const params = useParams();
  const companySlug = params.companySlug as string;
  const { data: company, isLoading } = useGetCompanyBySlugQuery(companySlug);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (!company) {
    return <div>Company not found</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center gap-4">
            {company.logo && (
              <img src={company.logo} alt={company.name} className="w-16 h-16 rounded-lg object-cover" />
            )}
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{company.name}</h1>
              <p className="text-gray-600">About Us</p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <Card>
          <div className="p-8">
            <h2 className="text-3xl font-bold text-gray-900 mb-6">Our Story</h2>
            {company.description ? (
              <p className="text-gray-700 text-lg leading-relaxed mb-8 whitespace-pre-line">
                {company.description}
              </p>
            ) : (
              <p className="text-gray-700 text-lg leading-relaxed mb-8">
                Welcome to {company.name}! We are passionate about serving delicious food
                and creating memorable dining experiences for our customers. Our commitment
                to quality ingredients, exceptional service, and a warm atmosphere has made
                us a beloved establishment in the community.
              </p>
            )}

            <div className="border-t pt-8">
              <h3 className="text-2xl font-bold text-gray-900 mb-6">Contact Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {company.address && (
                  <div className="flex items-start gap-3">
                    <MapPinIcon className="w-6 h-6 text-gray-400 mt-1" />
                    <div>
                      <h4 className="font-semibold text-gray-900 mb-1">Address</h4>
                      <p className="text-gray-600">
                        {company.address.street}<br />
                        {company.address.city}, {company.address.state} {company.address.zipCode}<br />
                        {company.address.country}
                      </p>
                    </div>
                  </div>
                )}
                {company.phone && (
                  <div className="flex items-start gap-3">
                    <PhoneIcon className="w-6 h-6 text-gray-400 mt-1" />
                    <div>
                      <h4 className="font-semibold text-gray-900 mb-1">Phone</h4>
                      <p className="text-gray-600">{company.phone}</p>
                    </div>
                  </div>
                )}
                {company.email && (
                  <div className="flex items-start gap-3">
                    <EnvelopeIcon className="w-6 h-6 text-gray-400 mt-1" />
                    <div>
                      <h4 className="font-semibold text-gray-900 mb-1">Email</h4>
                      <p className="text-gray-600">{company.email}</p>
                    </div>
                  </div>
                )}
                {company.website && (
                  <div className="flex items-start gap-3">
                    <GlobeAltIcon className="w-6 h-6 text-gray-400 mt-1" />
                    <div>
                      <h4 className="font-semibold text-gray-900 mb-1">Website</h4>
                      <a href={company.website} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                        {company.website}
                      </a>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </Card>

        <div className="mt-8 text-center">
          <Link href={`/${companySlug}`}>
            <button className="text-blue-600 hover:underline">← Back to Home</button>
          </Link>
        </div>
      </main>
    </div>
  );
}

