'use client';

import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { Footer } from '@/components/ui/Footer';
import { Navbar } from '@/components/ui/Navbar';
import { ShieldCheckIcon } from '@heroicons/react/24/outline';
import Link from 'next/link';

export default function SecurityPage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Navbar />

      {/* Hero Section */}
      <section className="bg-gradient-to-r from-primary-600 to-secondary-600 text-white py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <ShieldCheckIcon className="w-16 h-16 mx-auto mb-4" />
            <h1 className="text-5xl md:text-6xl font-extrabold mb-4">Security & Privacy</h1>
            <p className="text-xl md:text-2xl text-white/90 max-w-3xl mx-auto">
              Your data security is our top priority
            </p>
          </div>
        </div>
      </section>

      {/* Security Content */}
      <section className="py-12">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <Card className="mb-8">
            <CardContent className="p-8">
              <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">Data Encryption</h2>
              <p className="text-lg text-gray-600 dark:text-gray-300 mb-4">
                All data transmitted between your devices and our servers is encrypted using industry-standard
                TLS 1.3 encryption. This ensures that your sensitive information remains secure during transmission.
              </p>
              <p className="text-lg text-gray-600 dark:text-gray-300">
                Data at rest is encrypted using AES-256 encryption, the same standard used by banks and
                government agencies.
              </p>
            </CardContent>
          </Card>

          <Card className="mb-8">
            <CardContent className="p-8">
              <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">Secure Infrastructure</h2>
              <div className="space-y-4 text-gray-600 dark:text-gray-300">
                <p>
                  Our infrastructure is hosted on secure, enterprise-grade cloud platforms with 99.9% uptime
                  guarantees. We use redundant systems and automated backups to ensure your data is always
                  available and protected.
                </p>
                <p>
                  Regular security audits and penetration testing help us identify and address potential
                  vulnerabilities before they can be exploited.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="mb-8">
            <CardContent className="p-8">
              <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">Access Control</h2>
              <div className="space-y-4 text-gray-600 dark:text-gray-300">
                <p>
                  Raha Pos Solutions includes comprehensive role-based access control, allowing you to manage who
                  has access to what information within your organization.
                </p>
                <p>
                  Multi-factor authentication (MFA) is available to add an extra layer of security to your
                  account, protecting against unauthorized access even if your password is compromised.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="mb-8">
            <CardContent className="p-8">
              <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">Payment Security</h2>
              <div className="space-y-4 text-gray-600 dark:text-gray-300">
                <p>
                  We are PCI DSS compliant and never store your full credit card information. All payment
                  processing is handled through secure, certified payment processors.
                </p>
                <p>
                  Your financial data is tokenized and encrypted, ensuring that even in the unlikely event
                  of a data breach, your payment information remains secure.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="mb-8">
            <CardContent className="p-8">
              <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">Compliance</h2>
              <div className="space-y-4 text-gray-600 dark:text-gray-300">
                <p>
                  Raha Pos Solutions complies with major data protection regulations including GDPR, CCPA, and
                  other regional privacy laws.
                </p>
                <p>
                  We regularly review and update our security practices to ensure continued compliance with
                  evolving regulations and industry best practices.
                </p>
              </div>
            </CardContent>
          </Card>

          <div className="text-center">
            <Link href="/contact">
              <Button size="lg" variant="secondary">
                Have Security Questions?
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}

