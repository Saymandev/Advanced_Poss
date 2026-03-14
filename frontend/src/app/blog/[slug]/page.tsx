'use client';

/* eslint-disable @next/next/no-img-element */

import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { Footer } from '@/components/ui/Footer';
import { Navbar } from '@/components/ui/Navbar';
import { useGetContentPageBySlugQuery } from '@/lib/api/endpoints/cmsApi';
import { formatDate } from '@/lib/utils';
import { ArrowLeftIcon, CalendarIcon, ClockIcon, SparklesIcon, UserIcon } from '@heroicons/react/24/outline';
import Link from 'next/link';
import { useParams } from 'next/navigation';

export default function BlogPostPage() {
  const params = useParams();
  const slug = params.slug as string;

  const { data: post, isLoading, isError } = useGetContentPageBySlugQuery(slug, {
    skip: !slug,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading post...</p>
        </div>
      </div>
    );
  }

  if (isError || !post) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4">
        <Card className="max-w-md w-full">
          <CardContent className="p-8 text-center">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Post Not Found</h1>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              The blog post you're looking for doesn't exist or may have been removed.
            </p>
            <Link href="/blog">
              <Button>Back to Blog</Button>
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
        <Link href="/blog">
          <Button variant="ghost" className="mb-8">
            <ArrowLeftIcon className="w-4 h-4 mr-2" />
            Back to Blog
          </Button>
        </Link>

        <header className="mb-8">
          <h1 className="text-4xl md:text-5xl font-extrabold text-gray-900 dark:text-white mb-4">
            {post.title}
          </h1>
          {post.excerpt && (
            <p className="text-xl text-gray-600 dark:text-gray-300 mb-6">
              {post.excerpt}
            </p>
          )}
          <div className="flex items-center space-x-6 text-sm text-gray-500 dark:text-gray-400">
            {post.authorName && (
              <div className="flex items-center space-x-2">
                <UserIcon className="w-5 h-5" />
                <span>{post.authorName}</span>
              </div>
            )}
            {post.publishedAt && (
              <div className="flex items-center space-x-2">
                <CalendarIcon className="w-5 h-5" />
                <span>{formatDate(post.publishedAt)}</span>
              </div>
            )}
            {post.readingTime && (
              <div className="flex items-center space-x-2">
                <ClockIcon className="w-5 h-5" />
                <span>{post.readingTime} min read</span>
              </div>
            )}
          </div>
          {post.tags && post.tags.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-4">
              {post.tags.map((tag) => (
                <span
                  key={tag}
                  className="px-3 py-1 bg-primary-100 dark:bg-primary-900 text-primary-700 dark:text-primary-300 rounded-full text-sm"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
        </header>

        {post.featuredImage && (
          <div className="mb-8">
            <img
              src={post.featuredImage}
              alt={post.title}
              className="w-full h-96 object-cover rounded-lg"
            />
          </div>
        )}

        <div
          className="prose prose-lg dark:prose-invert max-w-none mb-12"
          dangerouslySetInnerHTML={{ __html: post.content }}
        />

        {post.images && post.images.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 my-12">
            {post.images.map((image, index) => (
              <img
                key={index}
                src={image}
                alt={`${post.title} - Image ${index + 1}`}
                className="w-full h-64 object-cover rounded-lg"
              />
            ))}
          </div>
        )}
      </article>

      {/* Footer */}
      <Footer />
    </div>
  );
}

