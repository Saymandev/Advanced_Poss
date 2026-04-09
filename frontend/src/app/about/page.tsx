'use client';

/* eslint-disable @next/next/no-img-element */

import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { Footer } from '@/components/ui/Footer';
import { Navbar } from '@/components/ui/Navbar';
import Link from 'next/link';

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Navbar />

      {/* Hero Section */}
      <section className="bg-gradient-to-r from-primary-600 to-secondary-600 text-white py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-5xl md:text-6xl font-extrabold mb-4">About Raha Pos Solutions</h1>
            <p className="text-xl md:text-2xl text-white/90 max-w-3xl mx-auto">
              Empowering restaurants with cutting-edge technology
            </p>
          </div>
        </div>
      </section>

      {/* About Content */}
      <section className="py-12">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <Card className="mb-8">
            <CardContent className="p-8">
              <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">Our Mission</h2>
              <p className="text-lg text-gray-600 dark:text-gray-300 mb-6">
                At Raha Pos Solutions, we're dedicated to revolutionizing the restaurant industry through innovative
                point-of-sale solutions. Our mission is to help restaurant owners streamline their operations,
                increase efficiency, and grow their businesses with powerful, intuitive technology.
              </p>
              <p className="text-lg text-gray-600 dark:text-gray-300">
                We believe that every restaurant, regardless of size, deserves access to enterprise-level
                tools that make running a business easier and more profitable.
              </p>
            </CardContent>
          </Card>

          <Card className="mb-8">
            <CardContent className="p-8">
              <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">What We Do</h2>
              <div className="space-y-4 text-gray-600 dark:text-gray-300">
                <p>
                  Raha Pos Solutions is a comprehensive restaurant management system that combines point-of-sale
                  functionality with inventory management, staff scheduling, customer relationship management,
                  and powerful analytics.
                </p>
                <p>
                  Our platform is designed to be user-friendly yet powerful, allowing restaurant owners to
                  manage every aspect of their business from a single, integrated dashboard.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="mb-8">
            <CardContent className="p-8">
              <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">Why Choose Us</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Easy to Use</h3>
                  <p className="text-gray-600 dark:text-gray-300">
                    Intuitive interface designed for restaurant staff of all technical levels.
                  </p>
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Comprehensive</h3>
                  <p className="text-gray-600 dark:text-gray-300">
                    All-in-one solution covering POS, inventory, staff, and customer management.
                  </p>
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Scalable</h3>
                  <p className="text-gray-600 dark:text-gray-300">
                    Grows with your business, from single locations to multi-branch operations.
                  </p>
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Support</h3>
                  <p className="text-gray-600 dark:text-gray-300">
                    24/7 customer support to help you succeed.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="text-center">
            <Link href="/auth/register">
              <Button size="lg">Get Started Today</Button>
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}

