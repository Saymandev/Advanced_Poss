'use client';

import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { Footer } from '@/components/ui/Footer';
import { Navbar } from '@/components/ui/Navbar';
import Link from 'next/link';

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Navbar />

      {/* Hero Section */}
      <section className="bg-gradient-to-r from-primary-600 to-secondary-600 text-white py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-5xl md:text-6xl font-extrabold mb-4">Privacy Policy</h1>
            <p className="text-xl md:text-2xl text-white/90 max-w-3xl mx-auto">
              Last Updated: March 15, 2026
            </p>
          </div>
        </div>
      </section>

      {/* Privacy Content */}
      <section className="py-12">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="prose prose-lg dark:prose-invert max-w-none mb-12">
            <p className="text-gray-600 dark:text-gray-400">
              Infotigo IT ("Company," "we," "us," or "our") operates the Raha Pos Solutions management software (the "Service"). This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our SaaS platform.
            </p>
            <p className="text-gray-600 dark:text-gray-400">
              By accessing or using Raha Pos Solutions, you agree to the collection and use of information in accordance with this Privacy Policy.
            </p>

            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mt-8 mb-4">1. Information We Collect</h2>
            <div className="space-y-4 text-gray-600 dark:text-gray-300">
              <p>We collect different types of information to provide and improve our Service to you:</p>
              <ul className="list-disc list-inside space-y-2">
                <li><strong>Account Information:</strong> When you register for an account, we collect personal details such as your name, email address, phone number, business name, and payment information.</li>
                <li><strong>Customer Data:</strong> As part of using Raha Pos Solutions, you will input data regarding your own business operations, including menus, room bookings, inventory, and your own customers' personal information (e.g., names, phone numbers, and order histories). We host this data strictly on your behalf.</li>
                <li><strong>Device and Usage Data:</strong> We automatically collect data on how the Service is accessed and used. This includes your device's Internet Protocol (IP) address, browser type, operating system, and diagnostic data related to the software's offline sync functionality.</li>
              </ul>
            </div>

            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mt-8 mb-4">2. How We Use Your Information</h2>
            <div className="space-y-4 text-gray-600 dark:text-gray-300">
              <p>Infotigo IT uses the collected data for various purposes:</p>
              <ul className="list-disc list-inside space-y-2">
                <li>To provide, operate, and maintain the Raha Pos Solutions platform, including point of sale (POS) and hotel management modules.</li>
                <li>To process your payments and manage your SaaS subscription.</li>
                <li>To provide customer support and respond to technical issues.</li>
                <li>To ensure data safely synchronizes between your local devices (during offline mode) and our cloud servers.</li>
                <li>To monitor usage patterns and improve the software's functionality and user experience.</li>
              </ul>
            </div>

            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mt-8 mb-4">3. How We Share Your Information</h2>
            <div className="space-y-4 text-gray-600 dark:text-gray-300">
              <p>We respect your privacy and do not sell your personal information or your Customer Data to third parties. We may share information only in the following situations:</p>
              <ul className="list-disc list-inside space-y-2">
                <li><strong>Service Providers:</strong> We may employ third party companies (such as cloud hosting providers and payment processors) to facilitate our Service. These third parties have access to your data only to perform these tasks on our behalf and are obligated not to disclose or use it for any other purpose.</li>
                <li><strong>Legal Requirements:</strong> We may disclose your information if required to do so by law or in response to valid requests by public authorities (e.g., a court or government agency).</li>
                <li><strong>Business Transfers:</strong> If Infotigo IT is involved in a merger, acquisition, or asset sale, your personal data and Customer Data may be transferred as part of that business asset.</li>
              </ul>
            </div>

            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mt-8 mb-4">4. Data Security and Offline Mode</h2>
            <div className="space-y-4 text-gray-600 dark:text-gray-300">
              <p>The security of your data is important to us. We implement standard security measures to protect against unauthorized access, alteration, disclosure, or destruction of your personal information and Customer Data stored on our servers.</p>
              <p><strong>Local Security:</strong> Because Raha Pos Solutions features offline functionality, some data is temporarily stored locally on your own hardware. You are solely responsible for physically securing your devices and local networks to protect this offline data until it successfully syncs with our secure cloud servers.</p>
            </div>

            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mt-8 mb-4">5. Your Data Rights</h2>
            <p className="text-gray-600 dark:text-gray-300">
              You have the right to access, update, or delete the personal information we hold about you. You can manage your account information directly within the dashboard. If you wish to close your account and have your data permanently deleted from our servers, please contact our support team.
            </p>

            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mt-8 mb-4">6. Modifications to This Privacy Policy</h2>
            <p className="text-gray-600 dark:text-gray-300">
              Infotigo IT reserves the right, at our sole and absolute discretion, to modify, update, or change this Privacy Policy at any time and for any reason without prior notice. We will notify you of any changes by posting the new Privacy Policy on this page and updating the "Last Updated" date at the top.
            </p>
            <p className="text-gray-600 dark:text-gray-300">
              You are advised to review this Privacy Policy periodically for any changes. Your continued use of the Service after any modifications to the Privacy Policy constitutes your explicit acceptance of those changes.
            </p>

            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mt-8 mb-4">7. Contact Us</h2>
            <div className="bg-gray-100 dark:bg-gray-800 p-6 rounded-lg space-y-2 text-gray-700 dark:text-gray-300">
              <p><strong>Company:</strong> Infotigo IT</p>
              <p><strong>Email:</strong> support@raha.bd, contact@raha.bd</p>
              <p><strong>Phone:</strong> +880 9696 774922, +880 1921 120200</p>
              <p><strong>Address:</strong> House 652, Ward 2, Mizmizi, Shiddirgonj, Narayanganj, Bangladesh</p>
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

