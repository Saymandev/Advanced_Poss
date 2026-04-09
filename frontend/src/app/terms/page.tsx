'use client';

import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { Footer } from '@/components/ui/Footer';
import { Navbar } from '@/components/ui/Navbar';
import Link from 'next/link';

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Navbar />

      {/* Hero Section */}
      <section className="bg-gradient-to-r from-primary-600 to-secondary-600 text-white py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-5xl md:text-6xl font-extrabold mb-4">Terms of Service</h1>
            <p className="text-xl md:text-2xl text-white/90 max-w-3xl mx-auto">
              Last Updated: March 15, 2026
            </p>
          </div>
        </div>
      </section>

      {/* Terms Content */}
      <section className="py-12">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="prose prose-lg dark:prose-invert max-w-none mb-12">
            <p className="text-gray-600 dark:text-gray-400">
              Welcome to Raha Pos Solutions. These Terms of Service ("Terms") govern your access to and use of our SaaS platform, including any associated software, websites, and services (collectively, the "Service").
            </p>
            <p className="text-gray-600 dark:text-gray-400 font-semibold">
              By accessing or using the Service, you agree to be bound by these Terms. If you are using the Service on behalf of a business, you represent that you have the authority to bind that entity to these Terms.
            </p>

            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mt-8 mb-4">1. Description of Service</h2>
            <p className="text-gray-600 dark:text-gray-300">
              Raha Pos Solutions is a management software platform designed for the food and hospitality industries, featuring cloud-based management and advanced local synchronization for offline business continuity.
            </p>

            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mt-8 mb-4">2. User Accounts</h2>
            <div className="space-y-4 text-gray-600 dark:text-gray-300">
              <p>To use most features of the Service, you must register for an account. You agree to:</p>
              <ul className="list-disc list-inside space-y-2">
                <li>Provide accurate, current, and complete information.</li>
                <li>Maintain the security and confidentiality of your login credentials.</li>
                <li>Promptly update your account information as necessary.</li>
                <li>Immediately notify us of any unauthorized use of your account.</li>
              </ul>
            </div>

            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mt-8 mb-4">3. Subscriptions and Payments</h2>
            <div className="space-y-4 text-gray-600 dark:text-gray-300">
              <p>Access to Raha Pos Solutions is provided on a subscription basis. By subscribing, you agree to the following:</p>
              <ul className="list-disc list-inside space-y-2">
                <li><strong>Fees:</strong> Subscription fees are billed in advance on a recurring monthly or annual basis. All fees are non-refundable except as required by law.</li>
                <li><strong>Modifications:</strong> Infotigo IT reserves the right to change subscription plans or pricing at any time. We will provide at least 30 days' notice before any price changes take effect.</li>
                <li><strong>Termination for Non-Payment:</strong> If we are unable to process payment for your subscription, we reserve the right to suspend or terminate your access to the Service.</li>
              </ul>
            </div>

            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mt-8 mb-4">4. Data Ownership and Responsibilities</h2>
            <div className="space-y-4 text-gray-600 dark:text-gray-300">
              <p>Your Data: You retain all rights and ownership to the business data you input into Raha Pos Solutions ("User Data"). By using the Service, you grant Infotigo IT a limited license to host, transmit, and display your User Data solely to provide the Service to you.</p>
              <p><strong>Security:</strong> While we implement industry-standard security to protect our servers, you are solely responsible for securing your local devices, hardware, and networks used to access the software, especially during offline use.</p>
            </div>

            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mt-8 mb-4">5. Prohibited Conduct</h2>
            <div className="space-y-4 text-gray-600 dark:text-gray-300">
              <p>You agree not to:</p>
              <ul className="list-disc list-inside space-y-2">
                <li>Decompile, reverse engineer, or attempt to extract the source code of the Service.</li>
                <li>Use the Service for any illegal or unauthorized purpose.</li>
                <li>Interfere with or disrupt the integrity or performance of the Service.</li>
                <li>Exceed any usage limits associated with your subscription plan.</li>
              </ul>
            </div>

            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mt-8 mb-4">6. Modification of These Terms</h2>
            <p className="text-gray-600 dark:text-gray-300">
              Infotigo IT reserves the right, at our sole and absolute discretion, to modify or replace these Terms at any time without prior notice. The most current version will always be posted on our website. Your continued use of the Service after changes constitute your acceptance of the new Terms.
            </p>

            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mt-8 mb-4">7. Termination</h2>
            <p className="text-gray-600 dark:text-gray-300">
              We may terminate or suspend your access to the Service immediately, without prior notice or liability, for any reason, including if you breach these Terms. Upon termination, your right to use the Service will immediately cease.
            </p>

            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mt-8 mb-4">8. Governing Law</h2>
            <p className="text-gray-600 dark:text-gray-300">
              These Terms shall be governed and construed in accordance with the laws of Bangladesh, without regard to its conflict of law provisions.
            </p>

            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mt-8 mb-4">9. Contact Information</h2>
            <div className="bg-gray-100 dark:bg-gray-800 p-6 rounded-lg space-y-4 text-gray-700 dark:text-gray-300">
              <p>If you have any questions about these Terms, please contact us at:</p>
              <div className="space-y-1">
                <p><strong>Company:</strong> Infotigo IT</p>
                <p><strong>Email:</strong> legal@raha.bd, contact@raha.bd</p>
                <p><strong>Address:</strong> House 652, Ward 2, Mizmizi, Shiddirgonj, Narayanganj, Bangladesh</p>
              </div>
            </div>
          </div>

          <div className="text-center">
            <Link href="/contact">
              <Button size="lg" variant="secondary">
                Contact Us
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}

