'use client';

/* eslint-disable @next/next/no-img-element */

import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { Footer } from '@/components/ui/Footer';
import { Navbar } from '@/components/ui/Navbar';
import { useGetContentPageBySlugQuery } from '@/lib/api/endpoints/cmsApi';
import { formatDate } from '@/lib/utils';
import { ArrowLeftIcon, CalendarIcon, MapPinIcon } from '@heroicons/react/24/outline';
import Link from 'next/link';
import { useParams } from 'next/navigation';

export default function CareerDetailPage() {
  const params = useParams();
  const slug = params.slug as string;

  const { data: job, isLoading, isError } = useGetContentPageBySlugQuery(slug, {
    skip: !slug,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading job details...</p>
        </div>
      </div>
    );
  }

  if (isError || !job) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4">
        <Card className="max-w-md w-full">
          <CardContent className="p-8 text-center">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Job Not Found</h1>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              The job posting you're looking for doesn't exist or may have been removed.
            </p>
            <Link href="/careers">
              <Button>Back to Careers</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Navbar />

      {/* Job Details */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <Link href="/careers">
          <Button variant="ghost" className="mb-8">
            <ArrowLeftIcon className="w-4 h-4 mr-2" />
            Back to Careers
          </Button>
        </Link>

        <Card className="mb-8">
          <CardContent className="p-8">
            <h1 className="text-4xl md:text-5xl font-extrabold text-gray-900 dark:text-white mb-4">
              {job.jobTitle || job.title}
            </h1>
            <div className="flex flex-wrap items-center gap-6 text-gray-600 dark:text-gray-400 mb-6">
              {job.location && (
                <div className="flex items-center space-x-2">
                  <MapPinIcon className="w-5 h-5" />
                  <span>{job.location}</span>
                </div>
              )}
              {job.employmentType && (
                <span className="px-4 py-2 bg-primary-100 dark:bg-primary-900 text-primary-700 dark:text-primary-300 rounded-full">
                  {job.employmentType}
                </span>
              )}
              {job.salaryRange && (
                <span className="text-lg font-semibold text-primary-600 dark:text-primary-400">
                  {job.salaryRange}
                </span>
              )}
            </div>
            {job.applicationDeadline && (
              <div className="flex items-center space-x-2 text-sm text-gray-500 dark:text-gray-400 mb-6">
                <CalendarIcon className="w-4 h-4" />
                <span>Apply by {formatDate(job.applicationDeadline)}</span>
              </div>
            )}
            {job.applicationUrl ? (
              <a href={job.applicationUrl} target="_blank" rel="noopener noreferrer">
                <Button size="lg" className="w-full sm:w-auto">
                  Apply Now
                </Button>
              </a>
            ) : (
              <Button size="lg" className="w-full sm:w-auto" disabled>
                Application Closed
              </Button>
            )}
          </CardContent>
        </Card>

        {job.excerpt && (
          <Card className="mb-8">
            <CardContent className="p-8">
              <p className="text-xl text-gray-600 dark:text-gray-300">{job.excerpt}</p>
            </CardContent>
          </Card>
        )}

        <div
          className="prose prose-lg dark:prose-invert max-w-none mb-8"
          dangerouslySetInnerHTML={{ __html: job.content }}
        />

        {job.responsibilities && job.responsibilities.length > 0 && (
          <Card className="mb-8">
            <CardContent className="p-8">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Responsibilities</h2>
              <ul className="space-y-2">
                {job.responsibilities.map((responsibility, index) => (
                  <li key={index} className="flex items-start">
                    <span className="text-primary-600 dark:text-primary-400 mr-2">•</span>
                    <span className="text-gray-700 dark:text-gray-300">{responsibility}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}

        {job.requirements && job.requirements.length > 0 && (
          <Card className="mb-8">
            <CardContent className="p-8">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Requirements</h2>
              <ul className="space-y-2">
                {job.requirements.map((requirement, index) => (
                  <li key={index} className="flex items-start">
                    <span className="text-primary-600 dark:text-primary-400 mr-2">•</span>
                    <span className="text-gray-700 dark:text-gray-300">{requirement}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}

        {job.applicationUrl && (
          <div className="text-center">
            <a href={job.applicationUrl} target="_blank" rel="noopener noreferrer">
              <Button size="lg" className="w-full sm:w-auto">
                Apply Now
              </Button>
            </a>
          </div>
        )}
      </div>

      <Footer />
    </div>
  );
}

