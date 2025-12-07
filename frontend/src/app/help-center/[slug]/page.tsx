'use client';

/* eslint-disable @next/next/no-img-element */

import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { useGetContentPageBySlugQuery } from '@/lib/api/endpoints/cmsApi';
import { ArrowLeftIcon, SparklesIcon } from '@heroicons/react/24/outline';
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
              <Link href="/help-center">
                <Button variant="ghost">Help Center</Button>
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

