'use client';

/* eslint-disable @next/next/no-img-element */

import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { useGetContentPageBySlugQuery } from '@/lib/api/endpoints/cmsApi';
import { formatDate } from '@/lib/utils';
import { ArrowLeftIcon, CalendarIcon, MapPinIcon, SparklesIcon } from '@heroicons/react/24/outline';
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
              <Link href="/careers">
                <Button variant="ghost">Careers</Button>
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

