'use client';

import { Button } from '@/components/ui/Button';
import { Footer } from '@/components/ui/Footer';
import { Navbar } from '@/components/ui/Navbar';
import Link from 'next/link';

export default function RefundPage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Navbar />

      {/* Hero Section */}
      <section className="bg-gradient-to-r from-primary-600 to-secondary-600 text-white py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-5xl md:text-6xl font-extrabold mb-4">Refund and Cancellation Policy</h1>
            <p className="text-xl md:text-2xl text-white/90 max-w-3xl mx-auto">
              Last Updated: March 15, 2026
            </p>
          </div>
        </div>
      </section>

      {/* Content Section */}
      <section className="py-12">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="prose prose-lg dark:prose-invert max-w-none mb-12">
            <p className="text-gray-600 dark:text-gray-400">
              Thank you for choosing Raha Pos Solutions, a product of Infotigo IT, for your restaurant and food business management needs. We are committed to providing robust SaaS solutions. Please read our policy carefully to understand your rights and responsibilities regarding subscriptions, cancellations, and refunds.
            </p>

            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mt-8 mb-4">1. Software Subscriptions and Cancellations</h2>
            <div className="space-y-4 text-gray-600 dark:text-gray-300">
              <p>Raha Pos Solutions is offered as a subscription-based service. You may cancel your subscription at any time by contacting our support team or through your account dashboard.</p>
              <ul className="list-disc list-inside space-y-2">
                <li><strong>Cancellation Process:</strong> Cancellations must be made before the end of your current billing cycle to avoid being charged for the next period.</li>
                <li><strong>Access After Cancellation:</strong> If you cancel your subscription, you will retain access to the platform until the end of your currently paid billing cycle.</li>
                <li><strong>Data Export:</strong> Upon cancellation, you are responsible for exporting your restaurant data, menus, and reports. After your billing cycle ends, your data may be permanently deleted from our servers.</li>
              </ul>
            </div>

            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mt-8 mb-4">2. Subscription Refunds</h2>
            <div className="space-y-4 text-gray-600 dark:text-gray-300">
              <p>We strive to ensure Raha Pos Solutions meets your business needs, but we understand that it may not always be a perfect fit.</p>
              <ul className="list-disc list-inside space-y-2">
                <li><strong>Initial Purchase Guarantee:</strong> We offer a 14-day money-back guarantee for new subscribers. If you are not satisfied with the software within the first 14 days of your initial purchase, you may request a full refund of your base subscription fee.</li>
                <li><strong>Renewals and Active Accounts:</strong> After the initial 14-day period, we do not offer refunds or credits for partial months of service, downgrade refunds, or refunds for months unused with an open account.</li>
              </ul>
            </div>

            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mt-8 mb-4">3. Setup, Onboarding, and Customization Fees</h2>
            <p className="text-gray-600 dark:text-gray-300">
              Due to the labor and resources involved, any fees paid to Infotigo IT for account setup, menu data migration, custom development, or personalized onboarding sessions are strictly non-refundable once the service has commenced.
            </p>

            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mt-8 mb-4">4. Hardware Returns (If Applicable)</h2>
            <div className="space-y-4 text-gray-600 dark:text-gray-300">
              <p>If your purchase included physical hardware (such as POS terminals, receipt printers, or networking gear) directly from Infotigo IT:</p>
              <ul className="list-disc list-inside space-y-2">
                <li>Hardware can be returned within 14 days of receipt, provided it is in its original, undamaged condition and original packaging.</li>
                <li>A standard restocking fee of 15% will apply to all hardware returns.</li>
                <li>Customers are responsible for return shipping costs. Hardware that is damaged, used, or missing components will not be eligible for a refund.</li>
              </ul>
            </div>

            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mt-8 mb-4">5. Software Outages and Service Interruptions</h2>
            <p className="text-gray-600 dark:text-gray-300">
              While Raha Pos Solutions features robust offline sync capabilities to keep your business running locally during internet outages, we cannot guarantee 100% cloud uptime. Refunds or credits will not be issued for temporary cloud service interruptions or downtime.
            </p>

            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mt-8 mb-4">6. Modifications to This Policy</h2>
            <p className="text-gray-600 dark:text-gray-300">
              Infotigo IT reserves the right, at its sole and absolute discretion to update, change, modify or replace any part of this Refund and Cancellation Policy at any time without prior notice. Any changes will be effective immediately upon posting to our website. Your continued use of the Service following the posting of any changes constitutes your binding acceptance of those changes.
            </p>

            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mt-8 mb-4">7. How to Request a Refund or Cancellation</h2>
            <div className="bg-gray-100 dark:bg-gray-800 p-6 rounded-lg space-y-4 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700">
              <p>To request a refund under our guarantee or to cancel your service, please reach out to our team with your account details and business name:</p>
              <div className="space-y-1">
                <p><strong>Company:</strong> Infotigo IT</p>
                <p><strong>Email:</strong> support@raha.bd, contact@raha.bd</p>
                <p><strong>Phone:</strong> +880 9696 774922, +880 1921 120200</p>
                <p><strong>Address:</strong> House 652, Ward 2, Mizmizi, Shiddirgonj, Narayanganj, Bangladesh</p>
              </div>
            </div>
          </div>

          <div className="text-center">
            <Link href="/contact">
              <Button size="lg" variant="secondary">
                Contact For Support
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
