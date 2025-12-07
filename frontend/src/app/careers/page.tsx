'use client';

/* eslint-disable @next/next/no-img-element */

import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { ContentPageType, useGetPublicContentPagesQuery } from '@/lib/api/endpoints/cmsApi';
import { formatDate } from '@/lib/utils';
import { ArrowRightIcon, CalendarIcon, MapPinIcon, SparklesIcon } from '@heroicons/react/24/outline';
import Link from 'next/link';
import { useMemo, useState } from 'react';

export default function CareersPage() {
  const [selectedLocation, setSelectedLocation] = useState<string | null>(null);
  const [selectedType, setSelectedType] = useState<string | null>(null);

  const { data: jobs = [], isLoading } = useGetPublicContentPagesQuery({
    type: ContentPageType.CAREER,
    featured: false,
  });

  const locations = useMemo(() => {
    const locs = new Set<string>();
    jobs.forEach((job) => {
      if (job.location) locs.add(job.location);
    });
    return Array.from(locs).sort();
  }, [jobs]);

  const employmentTypes = useMemo(() => {
    const types = new Set<string>();
    jobs.forEach((job) => {
      if (job.employmentType) types.add(job.employmentType);
    });
    return Array.from(types).sort();
  }, [jobs]);

  const filteredJobs = useMemo(() => {
    return jobs.filter((job) => {
      if (selectedLocation && job.location !== selectedLocation) return false;
      if (selectedType && job.employmentType !== selectedType) return false;
      return true;
    });
  }, [jobs, selectedLocation, selectedType]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading job openings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Navigation */}
      <nav className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link href="/" className="flex items-center space-x-2">
              <SparklesIcon className="w-8 h-8 text-primary-600 dark:text-primary-400" />
              <span className="text-2xl font-bold bg-gradient-to-r from-primary-600 to-secondary-600 bg-clip-text text-transparent">
                Advanced POS
              </span>
            </Link>
            <div className="flex items-center space-x-4">
              <Link href="/">
                <Button variant="ghost">Home</Button>
              </Link>
              <Link href="/auth/login">
                <Button variant="ghost">Login</Button>
              </Link>
              <Link href="/auth/register">
                <Button>Get Started</Button>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="bg-gradient-to-r from-primary-600 to-secondary-600 text-white py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-5xl md:text-6xl font-extrabold mb-4">Join Our Team</h1>
            <p className="text-xl md:text-2xl text-white/90 max-w-3xl mx-auto">
              Help us build the future of restaurant management
            </p>
          </div>
        </div>
      </section>

      {/* Filters */}
      {(locations.length > 0 || employmentTypes.length > 0) && (
        <section className="py-8 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-wrap gap-4">
              <button
                onClick={() => {
                  setSelectedLocation(null);
                  setSelectedType(null);
                }}
                className={`px-4 py-2 rounded-lg transition-colors ${
                  !selectedLocation && !selectedType
                    ? 'bg-primary-600 text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                All Jobs
              </button>
              {locations.map((location) => (
                <button
                  key={location}
                  onClick={() => setSelectedLocation(location)}
                  className={`px-4 py-2 rounded-lg transition-colors ${
                    selectedLocation === location
                      ? 'bg-primary-600 text-white'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                >
                  {location}
                </button>
              ))}
              {employmentTypes.map((type) => (
                <button
                  key={type}
                  onClick={() => setSelectedType(type)}
                  className={`px-4 py-2 rounded-lg transition-colors ${
                    selectedType === type
                      ? 'bg-primary-600 text-white'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Jobs List */}
      <section className="py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {filteredJobs.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <p className="text-gray-600 dark:text-gray-400 text-lg mb-4">
                  No job openings found at the moment.
                </p>
                <p className="text-gray-500 dark:text-gray-500 text-sm">
                  Check back later or send us your resume at careers@advancedpos.com
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-6">
              {filteredJobs.map((job) => (
                <Link key={job._id} href={`/careers/${job.slug}`}>
                  <Card className="hover:shadow-xl transition-shadow cursor-pointer">
                    <CardContent className="p-6">
                      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                        <div className="flex-1">
                          <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                            {job.jobTitle || job.title}
                          </h3>
                          <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600 dark:text-gray-400 mb-4">
                            {job.location && (
                              <div className="flex items-center space-x-1">
                                <MapPinIcon className="w-4 h-4" />
                                <span>{job.location}</span>
                              </div>
                            )}
                            {job.employmentType && (
                              <span className="px-3 py-1 bg-gray-100 dark:bg-gray-700 rounded-full">
                                {job.employmentType}
                              </span>
                            )}
                            {job.salaryRange && (
                              <span className="text-primary-600 dark:text-primary-400 font-medium">
                                {job.salaryRange}
                              </span>
                            )}
                          </div>
                          {job.excerpt && (
                            <p className="text-gray-600 dark:text-gray-300 mb-4 line-clamp-2">
                              {job.excerpt}
                            </p>
                          )}
                          {job.applicationDeadline && (
                            <div className="flex items-center space-x-1 text-sm text-gray-500 dark:text-gray-400">
                              <CalendarIcon className="w-4 h-4" />
                              <span>Apply by {formatDate(job.applicationDeadline)}</span>
                            </div>
                          )}
                        </div>
                        <div className="flex items-center text-primary-600 dark:text-primary-400">
                          <span className="text-sm font-medium mr-2">View Details</span>
                          <ArrowRightIcon className="w-5 h-5" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 dark:bg-black text-white py-12 px-4 sm:px-6 lg:px-8 mt-12">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center space-x-2 mb-4">
                <SparklesIcon className="w-6 h-6 text-primary-400" />
                <span className="text-xl font-bold">Advanced POS</span>
              </div>
              <p className="text-gray-400">
                The most powerful restaurant management system
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Product</h4>
              <ul className="space-y-2 text-gray-400">
                <li><Link href="/#features" className="hover:text-white transition-colors">Features</Link></li>
                <li><Link href="/#pricing" className="hover:text-white transition-colors">Pricing</Link></li>
                <li><Link href="/security" className="hover:text-white transition-colors">Security</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Company</h4>
              <ul className="space-y-2 text-gray-400">
                <li><Link href="/about" className="hover:text-white transition-colors">About</Link></li>
                <li><Link href="/blog" className="hover:text-white transition-colors">Blog</Link></li>
                <li><Link href="/careers" className="hover:text-white transition-colors">Careers</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Support</h4>
              <ul className="space-y-2 text-gray-400">
                <li><Link href="/help-center" className="hover:text-white transition-colors">Help Center</Link></li>
                <li><Link href="/contact" className="hover:text-white transition-colors">Contact</Link></li>
                <li><Link href="/privacy" className="hover:text-white transition-colors">Privacy</Link></li>
                <li><Link href="/terms" className="hover:text-white transition-colors">Terms</Link></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400">
            <p>&copy; 2024 Advanced POS. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

