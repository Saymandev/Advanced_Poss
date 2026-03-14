'use client';

/* eslint-disable @next/next/no-img-element */

import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { Footer } from '@/components/ui/Footer';
import { Navbar } from '@/components/ui/Navbar';
import { useGetContentPageBySlugQuery } from '@/lib/api/endpoints/cmsApi';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';
import Link from 'next/link';
import { useParams } from 'next/navigation';

export default function HelpArticlePage() {
  const params = useParams();
  const slug = params.slug as string;

  const { data: article, isLoading, isError } = useGetContentPageBySlugQuery(slug, {
    skip: !slug,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading article...</p>
        </div>
      </div>
    );
  }

  if (isError || !article) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4">
        <Card className="max-w-md w-full">
          <CardContent className="p-8 text-center">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Article Not Found</h1>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              The help article you're looking for doesn't exist or may have been removed.
            </p>
            <Link href="/help-center">
              <Button>Back to Help Center</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Navbar />

      {/* Article */}
      <article className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <Link href="/help-center">
          <Button variant="ghost" className="mb-8">
            <ArrowLeftIcon className="w-4 h-4 mr-2" />
            Back to Help Center
          </Button>
        </Link>

        <header className="mb-8">
          {article.category && (
            <span className="inline-block px-3 py-1 bg-primary-100 dark:bg-primary-900 text-primary-700 dark:text-primary-300 rounded-full text-sm font-medium mb-4">
              {article.category}
            </span>
          )}
          <h1 className="text-4xl md:text-5xl font-extrabold text-gray-900 dark:text-white mb-4">
            {article.title}
          </h1>
          {article.excerpt && (
            <p className="text-xl text-gray-600 dark:text-gray-300">
              {article.excerpt}
            </p>
          )}
        </header>

        <div
          className="prose prose-lg dark:prose-invert max-w-none mb-12"
          dangerouslySetInnerHTML={{ __html: article.content }}
        />

        {/* Helpful/Not Helpful */}
        {article.allowComments && (
          <Card className="mt-12">
            <CardContent className="p-6">
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                Was this article helpful?
              </p>
              <div className="flex space-x-4">
                <Button variant="secondary" size="sm">
                  Yes ({article.helpfulCount})
                </Button>
                <Button variant="secondary" size="sm">
                  No ({article.notHelpfulCount})
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </article>

      <Footer />
    </div>
  );
}
