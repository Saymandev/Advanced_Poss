'use client';

/* eslint-disable @next/next/no-img-element */

import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { ContentPageType, useGetPublicContentPagesQuery } from '@/lib/api/endpoints/cmsApi';
import { formatDate } from '@/lib/utils';
import { ArrowRightIcon, CalendarIcon, ClockIcon, SparklesIcon, UserIcon } from '@heroicons/react/24/outline';
import Link from 'next/link';
import { useMemo, useState } from 'react';

export default function BlogPage() {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  
  const { data: blogPosts = [], isLoading } = useGetPublicContentPagesQuery({
    type: ContentPageType.BLOG,
    featured: false,
  });

  const { data: featuredPosts = [] } = useGetPublicContentPagesQuery({
    type: ContentPageType.BLOG,
    featured: true,
    limit: 3,
  });

  const categories = useMemo(() => {
    const cats = new Set<string>();
    blogPosts.forEach((post) => {
      if (post.category) cats.add(post.category);
      if (post.tags) post.tags.forEach((tag) => cats.add(tag));
    });
    return Array.from(cats).sort();
  }, [blogPosts]);

  const filteredPosts = useMemo(() => {
    if (!selectedCategory) return blogPosts;
    return blogPosts.filter(
      (post) => post.category === selectedCategory || post.tags?.includes(selectedCategory)
    );
  }, [blogPosts, selectedCategory]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading blog posts...</p>
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
            <h1 className="text-5xl md:text-6xl font-extrabold mb-4">Our Blog</h1>
            <p className="text-xl md:text-2xl text-white/90 max-w-3xl mx-auto">
              Stay updated with the latest news, tips, and insights about restaurant management
            </p>
          </div>
        </div>
      </section>

      {/* Featured Posts */}
      {featuredPosts.length > 0 && (
        <section className="py-12 bg-white dark:bg-gray-800">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-8">Featured Posts</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {featuredPosts.map((post) => (
                <Link key={post._id} href={`/blog/${post.slug}`}>
                  <Card className="h-full hover:shadow-xl transition-shadow cursor-pointer">
                    <CardContent className="p-0">
                      {post.featuredImage && (
                        <img
                          src={post.featuredImage}
                          alt={post.title}
                          className="w-full h-48 object-cover rounded-t-lg"
                        />
                      )}
                      <div className="p-6">
                        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2 line-clamp-2">
                          {post.title}
                        </h3>
                        {post.excerpt && (
                          <p className="text-gray-600 dark:text-gray-300 mb-4 line-clamp-3">
                            {post.excerpt}
                          </p>
                        )}
                        <div className="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400">
                          <div className="flex items-center space-x-4">
                            {post.authorName && (
                              <div className="flex items-center space-x-1">
                                <UserIcon className="w-4 h-4" />
                                <span>{post.authorName}</span>
                              </div>
                            )}
                            {post.publishedAt && (
                              <div className="flex items-center space-x-1">
                                <CalendarIcon className="w-4 h-4" />
                                <span>{formatDate(post.publishedAt)}</span>
                              </div>
                            )}
                          </div>
                          {post.readingTime && (
                            <div className="flex items-center space-x-1">
                              <ClockIcon className="w-4 h-4" />
                              <span>{post.readingTime} min</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Main Content */}
      <section className="py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col lg:flex-row gap-8">
            {/* Sidebar - Categories */}
            {categories.length > 0 && (
              <aside className="lg:w-64 flex-shrink-0">
                <Card>
                  <CardContent className="p-6">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                      Categories
                    </h3>
                    <div className="space-y-2">
                      <button
                        onClick={() => setSelectedCategory(null)}
                        className={`w-full text-left px-4 py-2 rounded-lg transition-colors ${
                          !selectedCategory
                            ? 'bg-primary-100 text-primary-700 dark:bg-primary-900 dark:text-primary-300'
                            : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                        }`}
                      >
                        All Posts
                      </button>
                      {categories.map((category) => (
                        <button
                          key={category}
                          onClick={() => setSelectedCategory(category)}
                          className={`w-full text-left px-4 py-2 rounded-lg transition-colors ${
                            selectedCategory === category
                              ? 'bg-primary-100 text-primary-700 dark:bg-primary-900 dark:text-primary-300'
                              : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                          }`}
                        >
                          {category}
                        </button>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </aside>
            )}

            {/* Blog Posts List */}
            <div className="flex-1">
              {filteredPosts.length === 0 ? (
                <Card>
                  <CardContent className="p-12 text-center">
                    <p className="text-gray-600 dark:text-gray-400 text-lg">
                      No blog posts found.
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-6">
                  {filteredPosts.map((post) => (
                    <Link key={post._id} href={`/blog/${post.slug}`}>
                      <Card className="hover:shadow-xl transition-shadow cursor-pointer">
                        <CardContent className="p-6">
                          <div className="flex flex-col md:flex-row gap-6">
                            {post.featuredImage && (
                              <img
                                src={post.featuredImage}
                                alt={post.title}
                                className="w-full md:w-48 h-48 object-cover rounded-lg flex-shrink-0"
                              />
                            )}
                            <div className="flex-1">
                              <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                                {post.title}
                              </h3>
                              {post.excerpt && (
                                <p className="text-gray-600 dark:text-gray-300 mb-4">
                                  {post.excerpt}
                                </p>
                              )}
                              <div className="flex items-center justify-between flex-wrap gap-4">
                                <div className="flex items-center space-x-4 text-sm text-gray-500 dark:text-gray-400">
                                  {post.authorName && (
                                    <div className="flex items-center space-x-1">
                                      <UserIcon className="w-4 h-4" />
                                      <span>{post.authorName}</span>
                                    </div>
                                  )}
                                  {post.publishedAt && (
                                    <div className="flex items-center space-x-1">
                                      <CalendarIcon className="w-4 h-4" />
                                      <span>{formatDate(post.publishedAt)}</span>
                                    </div>
                                  )}
                                  {post.readingTime && (
                                    <div className="flex items-center space-x-1">
                                      <ClockIcon className="w-4 h-4" />
                                      <span>{post.readingTime} min read</span>
                                    </div>
                                  )}
                                </div>
                                <div className="flex items-center text-primary-600 dark:text-primary-400">
                                  <span className="text-sm font-medium">Read more</span>
                                  <ArrowRightIcon className="w-4 h-4 ml-1" />
                                </div>
                              </div>
                              {post.tags && post.tags.length > 0 && (
                                <div className="flex flex-wrap gap-2 mt-4">
                                  {post.tags.map((tag) => (
                                    <span
                                      key={tag}
                                      className="px-3 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-full text-xs"
                                    >
                                      {tag}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 dark:bg-black text-white py-12 px-4 sm:px-6 lg:px-8">
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

