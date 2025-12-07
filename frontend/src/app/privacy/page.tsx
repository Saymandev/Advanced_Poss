'use client';

import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { SparklesIcon } from '@heroicons/react/24/outline';
import Link from 'next/link';

export default function PrivacyPage() {
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
            <h1 className="text-5xl md:text-6xl font-extrabold mb-4">Privacy Policy</h1>
            <p className="text-xl md:text-2xl text-white/90 max-w-3xl mx-auto">
              Last updated: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
          </div>
        </div>
      </section>

      {/* Privacy Content */}
      <section className="py-12">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <Card className="mb-8">
            <CardContent className="p-8">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">1. Information We Collect</h2>
              <div className="space-y-4 text-gray-600 dark:text-gray-300">
                <p>
                  We collect information that you provide directly to us, including when you create an account,
                  use our services, or contact us for support.
                </p>
                <p>
                  This may include your name, email address, phone number, business information, payment
                  information, and any other information you choose to provide.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="mb-8">
            <CardContent className="p-8">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">2. How We Use Your Information</h2>
              <div className="space-y-4 text-gray-600 dark:text-gray-300">
                <p>We use the information we collect to:</p>
                <ul className="list-disc list-inside space-y-2 ml-4">
                  <li>Provide, maintain, and improve our services</li>
                  <li>Process transactions and send related information</li>
                  <li>Send technical notices, updates, and support messages</li>
                  <li>Respond to your comments and questions</li>
                  <li>Monitor and analyze trends and usage</li>
                </ul>
              </div>
            </CardContent>
          </Card>

          <Card className="mb-8">
            <CardContent className="p-8">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">3. Information Sharing</h2>
              <div className="space-y-4 text-gray-600 dark:text-gray-300">
                <p>
                  We do not sell, trade, or rent your personal information to third parties. We may share
                  your information only in the following circumstances:
                </p>
                <ul className="list-disc list-inside space-y-2 ml-4">
                  <li>With your consent</li>
                  <li>To comply with legal obligations</li>
                  <li>To protect our rights and safety</li>
                  <li>With service providers who assist us in operating our platform</li>
                </ul>
              </div>
            </CardContent>
          </Card>

          <Card className="mb-8">
            <CardContent className="p-8">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">4. Data Security</h2>
              <div className="space-y-4 text-gray-600 dark:text-gray-300">
                <p>
                  We implement appropriate technical and organizational measures to protect your personal
                  information against unauthorized access, alteration, disclosure, or destruction.
                </p>
                <p>
                  However, no method of transmission over the Internet or electronic storage is 100% secure,
                  and we cannot guarantee absolute security.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="mb-8">
            <CardContent className="p-8">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">5. Your Rights</h2>
              <div className="space-y-4 text-gray-600 dark:text-gray-300">
                <p>Depending on your location, you may have the right to:</p>
                <ul className="list-disc list-inside space-y-2 ml-4">
                  <li>Access and receive a copy of your personal data</li>
                  <li>Rectify inaccurate or incomplete data</li>
                  <li>Request deletion of your personal data</li>
                  <li>Object to or restrict processing of your data</li>
                  <li>Data portability</li>
                </ul>
              </div>
            </CardContent>
          </Card>

          <Card className="mb-8">
            <CardContent className="p-8">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">6. Contact Us</h2>
              <div className="space-y-4 text-gray-600 dark:text-gray-300">
                <p>
                  If you have any questions about this Privacy Policy, please contact us at:
                </p>
                <p>
                  Email: privacy@advancedpos.com<br />
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

