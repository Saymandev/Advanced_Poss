'use client';

import { Button } from '@/components/ui/Button';
import { Footer } from '@/components/ui/Footer';
import { Navbar } from '@/components/ui/Navbar';
import Link from 'next/link';

export default function EULAPage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Navbar />

      {/* Hero Section */}
      <section className="bg-gradient-to-r from-primary-600 to-secondary-600 text-white py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-5xl md:text-6xl font-extrabold mb-4">End User License Agreement (EULA)</h1>
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
              This End User License Agreement ("EULA") is a binding legal agreement between you (the "User" or "Customer") and Infotigo IT ("Company," "we," "us," or "our") governing your use of the Raha Pos Solutions software applications, including any local clients, offline modules, mobile applications, and related electronic documentation (collectively, the "Software").
            </p>
            <p className="text-gray-600 dark:text-gray-400 font-semibold">
              By installing, copying, accessing, or otherwise using the Software, you explicitly agree to be bound by the terms of this EULA.
            </p>

            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mt-8 mb-4">1. Grant of License</h2>
            <p className="text-gray-600 dark:text-gray-300">
              Subject to your continuous compliance with this EULA and the payment of all applicable SaaS subscription fees to Infotigo IT, you are granted a revocable, non-exclusive, non-transferable, limited license to access and use the Software solely for your internal business operations.
            </p>

            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mt-8 mb-4">2. Restrictions on Use</h2>
            <div className="space-y-4 text-gray-600 dark:text-gray-300">
              <p>You agree not to, and you will not permit others to:</p>
              <ul className="list-disc list-inside space-y-2">
                <li>Reverse engineer, decompile, disassemble, or attempt to derive the source code of the Software.</li>
                <li>Modify, translate, adapt, or create derivative works based on the Software.</li>
                <li>Rent, lease, lend, sell, sublicense, distribute, or host the Software for any third party.</li>
                <li>Remove, alter, or obscure any proprietary notices, labels, or marks from the Software or its outputs.</li>
                <li>Use the Software for any unlawful purpose or to facilitate illegal transactions.</li>
              </ul>
            </div>

            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mt-8 mb-4">3. Software Functionality and Offline Sync</h2>
            <div className="space-y-4 text-gray-600 dark:text-gray-300">
              <p><strong>Offline Capabilities:</strong> Raha Pos Solutions includes an offline sync feature designed to allow continued local operation (such as order taking and room booking) during internet outages.</p>
              <p><strong>Data Synchronization:</strong> When network connectivity is restored, the Software will automatically attempt to sync your local data with our secure cloud servers. You are solely responsible for ensuring the hardware eventually reconnects to the internet to prevent permanent data loss. Infotigo IT is not responsible or liable for data lost due to prolonged hardware failure, local network issues, or device damage before a successful cloud sync is completed.</p>
            </div>

            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mt-8 mb-4">4. Updates and Maintenance</h2>
            <p className="text-gray-600 dark:text-gray-300">
              Infotigo IT may occasionally provide updates, bug fixes, patches, or new features for the Software. Because this is a SaaS product, many of these updates may be installed automatically to ensure system integrity and security. You agree to receive these updates as part of your use of the Software.
            </p>

            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mt-8 mb-4">5. Modifications to the Software and Agreement</h2>
            <div className="space-y-4 text-gray-600 dark:text-gray-300">
              <p><strong>Amendments to this EULA:</strong> Infotigo IT reserves the right, at its sole and absolute discretion, to amend, alter, or modify this EULA at any time as required by business needs, legal compliance, or software updates, without prior notice. Any amended EULA will be effective immediately upon posting on our website or within the Software itself.</p>
              <p><strong>Changes to Software Functionality:</strong> Infotigo IT reserves the right to modify, add, or remove features within the Software (including, but not limited to, the POS system, hotel management modules, and offline sync capabilities) at any time without notice. We may do this to improve performance, enhance security, or adjust to market demands.</p>
              <p><strong>Acceptance of Changes:</strong> By continuing to install, access, or use the Software after any such changes have been made to the EULA or the Software itself, you are explicitly agreeing to be bound by the revised terms and the updated functionality.</p>
            </div>

            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mt-8 mb-4">6. Intellectual Property Rights</h2>
            <p className="text-gray-600 dark:text-gray-300">
              The Software is licensed, not sold. Infotigo IT retains all rights, title, and interest in and to the Software, including all related intellectual property rights (such as copyrights, trademarks, patents, and trade secrets).
            </p>

            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mt-8 mb-4">7. Disclaimer of Warranties</h2>
            <p className="text-gray-600 dark:text-gray-300">
              THE SOFTWARE IS PROVIDED "AS IS" AND "AS AVAILABLE." INFOTIGO IT DISCLAIMS ALL WARRANTIES, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO IMPLIED WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT. WE DO NOT WARRANT THAT THE SOFTWARE WILL BE COMPLETELY ERROR-FREE, SECURE, OR UNINTERRUPTED.
            </p>

            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mt-8 mb-4">8. Limitation of Liability</h2>
            <p className="text-gray-600 dark:text-gray-300">
              TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW, IN NO EVENT SHALL INFOTIGO IT BE LIABLE FOR ANY SPECIAL, INCIDENTAL, INDIRECT, PUNITIVE, OR CONSEQUENTIAL DAMAGES WHATSOEVER (INCLUDING, WITHOUT LIMITATION, DAMAGES FOR LOSS OF BUSINESS PROFITS, BUSINESS INTERRUPTION, LOSS OF DATA, OR LOSS OF BUSINESS INFORMATION) ARISING OUT OF THE USE OF OR INABILITY TO USE THE SOFTWARE, EVEN IF WE HAVE BEEN ADVISED OF THE POSSIBILITY OF SUCH DAMAGES.
            </p>

            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mt-8 mb-4">9. Termination</h2>
            <p className="text-gray-600 dark:text-gray-300">
              This license is effective until terminated. Your rights under this EULA will terminate automatically without notice from Infotigo IT if you fail to comply with any of its terms, or if your subscription under the Terms of Service expires or is canceled. Upon termination, you must cease all use of the Software and destroy all local copies in your possession.
            </p>

            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mt-8 mb-4">10. Contact Information</h2>
            <div className="bg-gray-100 dark:bg-gray-800 p-6 rounded-lg space-y-4 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700">
              <p>If you have any questions or require support regarding this EULA or the Software, please contact us at:</p>
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
