'use client';

import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { 
  useGetBookingDetailsQuery, 
  useGetCompanyBySlugQuery,
} from '@/lib/api/endpoints/publicApi';
import { formatCurrency } from '@/lib/utils';
import { 
  CheckCircleIcon, 
  CalendarIcon, 
  UserIcon,
  PhoneIcon,
  EnvelopeIcon,
} from '@heroicons/react/24/outline';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useMemo } from 'react';

export default function BookingConfirmationPage() {
  const params = useParams();
  const companySlug = params.companySlug as string;
  const branchSlug = params.branchSlug as string;
  const bookingId = params.bookingId as string;

  const { 
    data: company, 
    isLoading: companyLoading,
  } = useGetCompanyBySlugQuery(companySlug, {
    skip: !companySlug,
  });

  const { 
    data: booking, 
    isLoading: bookingLoading,
    isError: bookingError,
  } = useGetBookingDetailsQuery(
    { companySlug, branchSlug, bookingId },
    { skip: !companySlug || !branchSlug || !bookingId }
  );

  const checkInDate = useMemo(() => {
    if (!booking?.checkInDate) return null;
    return new Date(booking.checkInDate).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }, [booking]);

  const checkOutDate = useMemo(() => {
    if (!booking?.checkOutDate) return null;
    return new Date(booking.checkOutDate).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }, [booking]);

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { variant: 'success' | 'warning' | 'info' | 'danger'; label: string }> = {
      confirmed: { variant: 'success', label: 'Confirmed' },
      pending: { variant: 'warning', label: 'Pending' },
      cancelled: { variant: 'danger', label: 'Cancelled' },
      checked_in: { variant: 'info', label: 'Checked In' },
      checked_out: { variant: 'info', label: 'Checked Out' },
    };
    const statusInfo = statusMap[status] || { variant: 'info' as const, label: status };
    return (
      <Badge variant={statusInfo.variant}>
        {statusInfo.label}
      </Badge>
    );
  };

  if (companyLoading || bookingLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading booking details...</p>
        </div>
      </div>
    );
  }

  if (bookingError || !booking || !company) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 dark:text-red-400 mb-4">Booking not found.</p>
          <Link href={`/${companySlug}/${branchSlug}/rooms`}>
            <Button>Back to Rooms</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 shadow">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                Booking Confirmation
              </h1>
              <p className="mt-1 text-gray-600 dark:text-gray-400">
                Your booking has been confirmed
              </p>
            </div>
            <div className="text-right">
              {getStatusBadge(booking.status)}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Success Message */}
        <Card className="mb-6 border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20">
          <CardContent className="p-6">
            <div className="flex items-start">
              <CheckCircleIcon className="h-8 w-8 text-green-600 dark:text-green-400 mr-3 flex-shrink-0 mt-1" />
              <div>
                <h2 className="text-xl font-semibold text-green-900 dark:text-green-100 mb-2">
                  Booking Confirmed!
                </h2>
                <p className="text-green-800 dark:text-green-200">
                  Thank you for your booking. We've sent a confirmation email to{' '}
                  <span className="font-semibold">{booking.guestEmail}</span>.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Booking Details */}
            <Card>
              <CardHeader>
                <CardTitle>Booking Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Booking Number</p>
                    <p className="text-lg font-semibold text-gray-900 dark:text-white">
                      {booking.bookingNumber}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-600 dark:text-gray-400">Total Amount</p>
                    <p className="text-lg font-semibold text-primary-600">
                      {formatCurrency(booking.totalAmount)}
                    </p>
                  </div>
                </div>

                <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                  <div className="flex items-start mb-4">
                    <CalendarIcon className="h-5 w-5 text-gray-400 mr-3 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm text-gray-600 dark:text-gray-400">Check-In</p>
                      <p className="font-semibold text-gray-900 dark:text-white">
                        {checkInDate || booking.checkInDate}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start">
                    <CalendarIcon className="h-5 w-5 text-gray-400 mr-3 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm text-gray-600 dark:text-gray-400">Check-Out</p>
                      <p className="font-semibold text-gray-900 dark:text-white">
                        {checkOutDate || booking.checkOutDate}
                      </p>
                    </div>
                  </div>
                  <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Duration: {booking.numberOfNights} {booking.numberOfNights === 1 ? 'night' : 'nights'}
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Rate: {formatCurrency(booking.roomRate)}/night
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Guest Information */}
            <Card>
              <CardHeader>
                <CardTitle>Guest Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center">
                  <UserIcon className="h-5 w-5 text-gray-400 mr-3" />
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Name</p>
                    <p className="font-semibold text-gray-900 dark:text-white">
                      {booking.guestName}
                    </p>
                  </div>
                </div>
                <div className="flex items-center">
                  <EnvelopeIcon className="h-5 w-5 text-gray-400 mr-3" />
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Email</p>
                    <p className="font-semibold text-gray-900 dark:text-white">
                      {booking.guestEmail}
                    </p>
                  </div>
                </div>
                <div className="flex items-center">
                  <PhoneIcon className="h-5 w-5 text-gray-400 mr-3" />
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Phone</p>
                    <p className="font-semibold text-gray-900 dark:text-white">
                      {booking.guestPhone}
                    </p>
                  </div>
                </div>
                {booking.specialRequests && (
                  <div className="pt-3 border-t border-gray-200 dark:border-gray-700">
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Special Requests</p>
                    <p className="text-gray-900 dark:text-white">{booking.specialRequests}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Payment Status */}
            <Card>
              <CardHeader>
                <CardTitle>Payment Information</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Payment Status</p>
                    <Badge variant={booking.paymentStatus === 'paid' ? 'success' : 'warning'}>
                      {booking.paymentStatus === 'paid' ? 'Paid' : 'Pending'}
                    </Badge>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-600 dark:text-gray-400">Total Amount</p>
                    <p className="text-lg font-semibold text-gray-900 dark:text-white">
                      {formatCurrency(booking.totalAmount)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle>Next Steps</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                    What's Next?
                  </h3>
                  <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                    <li className="flex items-start">
                      <span className="mr-2">1.</span>
                      <span>Check your email for booking confirmation</span>
                    </li>
                    <li className="flex items-start">
                      <span className="mr-2">2.</span>
                      <span>Arrive on your check-in date</span>
                    </li>
                    <li className="flex items-start">
                      <span className="mr-2">3.</span>
                      <span>Present your booking number at check-in</span>
                    </li>
                  </ul>
                </div>

                <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                    Need Help?
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                    If you have any questions or need to modify your booking, please contact us.
                  </p>
                  {company.phone && (
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Phone: <span className="font-semibold">{company.phone}</span>
                    </p>
                  )}
                  {company.email && (
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Email: <span className="font-semibold">{company.email}</span>
                    </p>
                  )}
                </div>

                <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                  <Link href={`/${companySlug}/${branchSlug}/rooms`}>
                    <Button variant="secondary" className="w-full">
                      Book Another Room
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

