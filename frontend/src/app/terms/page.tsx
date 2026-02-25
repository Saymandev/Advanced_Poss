'use client';

import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { SparklesIcon } from '@heroicons/react/24/outline';
import Link from 'next/link';

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Navigation */}
      <nav className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link href="/" className="flex items-center space-x-2">
              <SparklesIcon className="w-8 h-8 text-primary-600 dark:text-primary-400" />
              <span className="text-2xl font-bold bg-gradient-to-r from-primary-600 to-secondary-600 bg-clip-text text-transparent">
                Raha Pos Solutions
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
            <h1 className="text-5xl md:text-6xl font-extrabold mb-4">Terms of Service</h1>
            <p className="text-xl md:text-2xl text-white/90 max-w-3xl mx-auto">
              Last updated: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
          </div>
        </div>
      </section>

      {/* Terms Content */}
      <section className="py-12">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <Card className="mb-8">
            <CardContent className="p-8">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">1. Acceptance of Terms</h2>
              <div className="space-y-4 text-gray-600 dark:text-gray-300">
                <p>
                  By accessing and using Raha Pos Solutions, you accept and agree to be bound by the terms and
                  provision of this agreement.
                </p>
                <p>
                  If you do not agree to abide by the above, please do not use this service.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="mb-8">
            <CardContent className="p-8">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">2. Use License</h2>
              <div className="space-y-4 text-gray-600 dark:text-gray-300">
                <p>
                  Permission is granted to temporarily use Raha Pos Solutions for personal or commercial purposes.
                  This is the grant of a license, not a transfer of title, and under this license you may not:
                </p>
                <ul className="list-disc list-inside space-y-2 ml-4">
                  <li>Modify or copy the materials</li>
                  <li>Use the materials for any commercial purpose or for any public display</li>
                  <li>Attempt to reverse engineer any software contained in Raha Pos Solutions</li>
                  <li>Remove any copyright or other proprietary notations from the materials</li>
                </ul>
              </div>
            </CardContent>
          </Card>

          <Card className="mb-8">
            <CardContent className="p-8">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">3. Account Responsibilities</h2>
              <div className="space-y-4 text-gray-600 dark:text-gray-300">
                <p>
                  You are responsible for maintaining the confidentiality of your account and password and
                  for restricting access to your computer.
                </p>
                <p>
                  You agree to accept responsibility for all activities that occur under your account or password.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="mb-8">
            <CardContent className="p-8">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">4. Payment Terms</h2>
              <div className="space-y-4 text-gray-600 dark:text-gray-300">
                <p>
                  Subscription fees are billed in advance on a monthly or annual basis. All fees are
                  non-refundable except as required by law.
                </p>
                <p>
                  We reserve the right to change our pricing with 30 days notice. Continued use of the
                  service after price changes constitutes acceptance of the new pricing.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="mb-8">
            <CardContent className="p-8">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">5. Service Availability</h2>
              <div className="space-y-4 text-gray-600 dark:text-gray-300">
                <p>
                  We strive to maintain 99.9% uptime but do not guarantee uninterrupted access to our services.
                  We may perform scheduled maintenance that may result in temporary service interruptions.
                </p>
                <p>
                  We are not liable for any damages resulting from service interruptions or unavailability.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="mb-8">
            <CardContent className="p-8">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">6. Limitation of Liability</h2>
              <div className="space-y-4 text-gray-600 dark:text-gray-300">
                <p>
                  In no event shall Advanced POS or its suppliers be liable for any damages (including, without
                  limitation, damages for loss of data or profit, or due to business interruption) arising out
                  of the use or inability to use Raha Pos Solutions.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="mb-8">
            <CardContent className="p-8">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">7. Termination</h2>
              <div className="space-y-4 text-gray-600 dark:text-gray-300">
                <p>
                  We may terminate or suspend your account immediately, without prior notice or liability, for
                  any reason whatsoever, including without limitation if you breach the Terms.
                </p>
                <p>
                  Upon termination, your right to use the service will immediately cease.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="mb-8">
            <CardContent className="p-8">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">8. Contact Information</h2>
              <div className="space-y-4 text-gray-600 dark:text-gray-300">
                <p>
                  If you have any questions about these Terms of Service, please contact us at:
                </p>
                <p>
                  Email: legal@rahapos.com<br />
                  Address: 123 Business Street, Suite 100, City, State 12345
                </p>
              </div>
            </CardContent>
          </Card>

          <div className="text-center">
            <Link href="/contact">
              <Button size="lg" variant="secondary">
                Contact Us
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 dark:bg-black text-white py-12 px-4 sm:px-6 lg:px-8 mt-12">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center space-x-2 mb-4">
                <SparklesIcon className="w-6 h-6 text-primary-400" />
                <span className="text-xl font-bold">Raha Pos Solutions</span>
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
            <p>&copy; {new Date().getFullYear()} Raha Pos Solutions. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

