'use client';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { useGetCompanyBySlugQuery } from '@/lib/api/endpoints/publicApi';
import { CheckCircleIcon, HomeIcon } from '@heroicons/react/24/outline';
import Link from 'next/link';
import { useParams, useRouter, useSearchParams } from 'next/navigation';

export default function OrderConfirmationPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const companySlug = params.companySlug as string;
  const branchSlug = params.branchSlug as string;
  const orderId = searchParams.get('orderId');

  const { data: company } = useGetCompanyBySlugQuery(companySlug);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <Card className="max-w-2xl w-full">
        <div className="p-8 text-center">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircleIcon className="w-12 h-12 text-green-600" />
          </div>
          
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Order Confirmed!</h1>
          <p className="text-gray-600 mb-6">
            Thank you for your order. We're preparing it now.
          </p>

          {orderId && orderId !== 'pending' && (
            <div className="bg-gray-50 rounded-lg p-4 mb-6">
              <p className="text-sm text-gray-600 mb-1">Order Number</p>
              <p className="text-xl font-bold text-gray-900 mb-2">{orderId}</p>
              <Link href={`/${companySlug}/${branchSlug}/track/${orderId}`}>
                <Button variant="outline" className="w-full">
                  Track Your Order
                </Button>
              </Link>
            </div>
          )}

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6 text-left">
            <h3 className="font-semibold text-gray-900 mb-2">What's Next?</h3>
            <ul className="text-sm text-gray-700 space-y-1">
              <li>• You'll receive a confirmation email shortly</li>
              <li>• Estimated preparation time: 20-30 minutes</li>
              {company?.phone && (
                <li>• Questions? Call us at {company.phone}</li>
              )}
            </ul>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              onClick={() => router.push(`/${companySlug}/${branchSlug}/shop`)}
            >
              Order Again
            </Button>
            <Link href={`/${companySlug}`}>
              <Button variant="outline">
                <HomeIcon className="w-5 h-5 mr-2" />
                Back to Home
              </Button>
            </Link>
          </div>
        </div>
      </Card>
    </div>
  );
}

