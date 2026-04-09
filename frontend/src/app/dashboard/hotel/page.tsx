'use client';

import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { DataTable } from '@/components/ui/DataTable';
import { useFeatureRedirect } from '@/hooks/useFeatureRedirect';
import { useFormatCurrency } from '@/hooks/useFormatCurrency';
import {
    Booking,
    useGetBookingStatsQuery,
    useGetBookingsQuery,
} from '@/lib/api/endpoints/bookingsApi';
import {
    useGetRoomStatsQuery,
} from '@/lib/api/endpoints/roomsApi';
import { useAppSelector } from '@/lib/store';
import {
    ArchiveBoxXMarkIcon,
    ArrowLeftOnRectangleIcon,
    ArrowRightOnRectangleIcon,
    BanknotesIcon,
    BuildingOfficeIcon,
    CalendarDaysIcon,
    ChartBarIcon,
    CheckBadgeIcon,
    CheckCircleIcon,
    ClockIcon,
    PresentationChartBarIcon,
    WrenchScrewdriverIcon,
    XCircleIcon,
} from '@heroicons/react/24/outline';
import Link from 'next/link';
import { useMemo } from 'react';

export default function HotelDashboardPage() {
  const { user, companyContext } = useAppSelector((state) => state.auth);

  // Require hotel module access
  useFeatureRedirect('room-management');

  const formatCurrency = useFormatCurrency();

  // Extract branchId and ensure it's a string
  const branchIdRaw =
    (user as any)?.branchId ||
    (companyContext as any)?.branchId ||
    (companyContext as any)?.branches?.[0]?._id ||
    (companyContext as any)?.branches?.[0]?.id;
  
  // Convert to string if it's an ObjectId object
  const branchId = branchIdRaw 
    ? (typeof branchIdRaw === 'string' 
        ? branchIdRaw 
        : (branchIdRaw.toString ? branchIdRaw.toString() : String(branchIdRaw)))
    : undefined;

  const { data: roomStats } = useGetRoomStatsQuery(branchId || '', {
    skip: !branchId,
  });

  const { data: bookingStats } = useGetBookingStatsQuery(
    { branchId: branchId || '' },
    { skip: !branchId }
  );

  // Load bookings for simple upcoming view
  const {
    data: bookingsResponse,
    isLoading: bookingsLoading,
  } = useGetBookingsQuery(
    { branchId },
    {
      skip: !branchId,
      pollingInterval: 60000,
    }
  );

  const bookings: Booking[] = useMemo(() => {
    if (!bookingsResponse) return [];
    const response = bookingsResponse as any;
    let items: any[] = [];

    if (response.bookings && Array.isArray(response.bookings)) {
      items = response.bookings;
    } else if (Array.isArray(response)) {
      items = response;
    } else if (response.data) {
      if (Array.isArray(response.data)) {
        items = response.data;
      } else if (response.data.bookings && Array.isArray(response.data.bookings)) {
        items = response.data.bookings;
      }
    }

    return items as Booking[];
  }, [bookingsResponse]);

  const upcomingBookings = useMemo(() => {
    if (!bookings || bookings.length === 0) return [];

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return [...bookings]
      .filter((booking) => {
        if (!booking.checkInDate && !booking.checkOutDate) return false;
        const checkOut = new Date(booking.checkOutDate || booking.checkInDate);
        return checkOut >= today;
      })
      .sort((a, b) => {
        const aDate = new Date(a.checkInDate || a.createdAt).getTime();
        const bDate = new Date(b.checkInDate || b.createdAt).getTime();
        return aDate - bDate;
      })
      .slice(0, 20);
  }, [bookings]);

  const upcomingColumns = [
    {
      key: 'bookingNumber',
      title: 'Booking #',
      sortable: true,
    },
    {
      key: 'guestName',
      title: 'Guest',
      sortable: true,
    },
    {
      key: 'roomNumber',
      title: 'Room',
      sortable: true,
    },
    {
      key: 'checkInDate',
      title: 'Check In',
      render: (value: string) =>
        value ? new Date(value).toLocaleDateString() : '-',
    },
    {
      key: 'checkOutDate',
      title: 'Check Out',
      render: (value: string) =>
        value ? new Date(value).toLocaleDateString() : '-',
    },
    {
      key: 'status',
      title: 'Status',
      render: (value: string) => (
        <Badge
          variant={
            value === 'confirmed'
              ? 'success'
              : value === 'checked_in'
              ? 'info'
              : value === 'checked_out'
              ? 'secondary'
              : value === 'cancelled'
              ? 'danger'
              : 'secondary'
          }
        >
          {value.replace('_', ' ')}
        </Badge>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Hotel Dashboard</h1>
          <p className="text-gray-600 mt-1">
            Overview of room occupancy, bookings, and revenue.
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/dashboard/rooms">
            <Button variant="secondary">Manage Rooms</Button>
          </Link>
          <Link href="/dashboard/bookings">
            <Button>Manage Bookings</Button>
          </Link>
        </div>
      </div>

      {/* Room statistics */}
      {roomStats && (
        <Card>
          <CardHeader>
            <CardTitle>Room Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
              <Card>
                <CardContent className="p-3 sm:p-4">
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="text-xs text-gray-600 dark:text-gray-400 truncate">Total Rooms</p>
                      <p className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900 dark:text-white truncate" title={(roomStats.total || 0).toString()}>
                        {roomStats.total || 0}
                      </p>
                    </div>
                    <BuildingOfficeIcon className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600 flex-shrink-0" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-3 sm:p-4">
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="text-xs text-gray-600 dark:text-gray-400 truncate">Available</p>
                      <p className="text-lg sm:text-xl md:text-2xl font-bold text-green-600 truncate" title={(roomStats.available || 0).toString()}>
                        {roomStats.available || 0}
                      </p>
                    </div>
                    <CheckCircleIcon className="w-5 h-5 sm:w-6 sm:h-6 text-green-600 flex-shrink-0" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-3 sm:p-4">
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="text-xs text-gray-600 dark:text-gray-400 truncate">Occupied</p>
                      <p className="text-lg sm:text-xl md:text-2xl font-bold text-red-600 truncate" title={(roomStats.occupied || 0).toString()}>
                        {roomStats.occupied || 0}
                      </p>
                    </div>
                    <ArrowRightOnRectangleIcon className="w-5 h-5 sm:w-6 sm:h-6 text-red-600 flex-shrink-0" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-3 sm:p-4">
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="text-xs text-gray-600 dark:text-gray-400 truncate">Reserved</p>
                      <p className="text-lg sm:text-xl md:text-2xl font-bold text-yellow-600 truncate" title={(roomStats.reserved || 0).toString()}>
                        {roomStats.reserved || 0}
                      </p>
                    </div>
                    <CheckBadgeIcon className="w-5 h-5 sm:w-6 sm:h-6 text-yellow-600 flex-shrink-0" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-3 sm:p-4">
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="text-xs text-gray-600 dark:text-gray-400 truncate">Maintenance</p>
                      <p className="text-lg sm:text-xl md:text-2xl font-bold text-blue-600 truncate" title={(roomStats.maintenance || 0).toString()}>
                        {roomStats.maintenance || 0}
                      </p>
                    </div>
                    <WrenchScrewdriverIcon className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600 flex-shrink-0" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-3 sm:p-4">
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="text-xs text-gray-600 dark:text-gray-400 truncate">Occupancy Rate</p>
                      <p className="text-lg sm:text-xl md:text-2xl font-bold text-purple-600 truncate" title={`${roomStats.occupancyRate || 0}%`}>
                        {roomStats.occupancyRate || 0}%
                      </p>
                    </div>
                    <ChartBarIcon className="w-5 h-5 sm:w-6 sm:h-6 text-purple-600 flex-shrink-0" />
                  </div>
                </CardContent>
              </Card>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Booking statistics */}
      {bookingStats && (
        <Card>
          <CardHeader>
            <CardTitle>Booking Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
              <Card>
                <CardContent className="p-3 sm:p-4">
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="text-xs text-gray-600 dark:text-gray-400 truncate">Total Bookings</p>
                      <p className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900 dark:text-white truncate" title={(bookingStats.total || 0).toString()}>
                        {bookingStats.total || 0}
                      </p>
                    </div>
                    <CalendarDaysIcon className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600 flex-shrink-0" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-3 sm:p-4">
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="text-xs text-gray-600 dark:text-gray-400 truncate">Pending</p>
                      <p className="text-lg sm:text-xl md:text-2xl font-bold text-yellow-600 truncate" title={(bookingStats.pending || 0).toString()}>
                        {bookingStats.pending || 0}
                      </p>
                    </div>
                    <ClockIcon className="w-5 h-5 sm:w-6 sm:h-6 text-yellow-600 flex-shrink-0" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-3 sm:p-4">
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="text-xs text-gray-600 dark:text-gray-400 truncate">Confirmed</p>
                      <p className="text-lg sm:text-xl md:text-2xl font-bold text-green-600 truncate" title={(bookingStats.confirmed || 0).toString()}>
                        {bookingStats.confirmed || 0}
                      </p>
                    </div>
                    <CheckBadgeIcon className="w-5 h-5 sm:w-6 sm:h-6 text-green-600 flex-shrink-0" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-3 sm:p-4">
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="text-xs text-gray-600 dark:text-gray-400 truncate">Checked In</p>
                      <p className="text-lg sm:text-xl md:text-2xl font-bold text-blue-600 truncate" title={(bookingStats.checkedIn || 0).toString()}>
                        {bookingStats.checkedIn || 0}
                      </p>
                    </div>
                    <ArrowLeftOnRectangleIcon className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600 flex-shrink-0" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-3 sm:p-4">
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="text-xs text-gray-600 dark:text-gray-400 truncate">Checked Out</p>
                      <p className="text-lg sm:text-xl md:text-2xl font-bold text-gray-600 dark:text-gray-400 truncate" title={(bookingStats.checkedOut || 0).toString()}>
                        {bookingStats.checkedOut || 0}
                      </p>
                    </div>
                    <ArrowRightOnRectangleIcon className="w-5 h-5 sm:w-6 sm:h-6 text-gray-600 flex-shrink-0" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-3 sm:p-4">
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="text-xs text-gray-600 dark:text-gray-400 truncate">Cancelled</p>
                      <p className="text-lg sm:text-xl md:text-2xl font-bold text-red-600 truncate" title={(bookingStats.cancelled || 0).toString()}>
                        {bookingStats.cancelled || 0}
                      </p>
                    </div>
                    <XCircleIcon className="w-5 h-5 sm:w-6 sm:h-6 text-red-600 flex-shrink-0" />
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4 mt-4">
              <Card>
                <CardContent className="p-3 sm:p-4">
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="text-xs text-gray-600 dark:text-gray-400 truncate">Total Revenue</p>
                      <p className="text-sm sm:text-base md:text-lg font-bold text-emerald-600 truncate" title={formatCurrency(bookingStats.totalRevenue || 0)}>
                        {formatCurrency(bookingStats.totalRevenue || 0)}
                      </p>
                    </div>
                    <BanknotesIcon className="w-5 h-5 sm:w-6 sm:h-6 text-emerald-600 flex-shrink-0" />
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-3 sm:p-4">
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="text-xs text-gray-600 dark:text-gray-400 truncate">Average Booking Value</p>
                      <p className="text-sm sm:text-base md:text-lg font-bold text-purple-600 truncate" title={formatCurrency(bookingStats.averageBookingValue || 0)}>
                        {formatCurrency(bookingStats.averageBookingValue || 0)}
                      </p>
                    </div>
                    <PresentationChartBarIcon className="w-5 h-5 sm:w-6 sm:h-6 text-purple-600 flex-shrink-0" />
                  </div>
                </CardContent>
              </Card>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Simple upcoming bookings timeline / calendar-style list */}
      <Card>
        <CardHeader>
          <CardTitle>Upcoming & Current Bookings</CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable
            data={upcomingBookings}
            columns={upcomingColumns}
            loading={bookingsLoading}
            emptyMessage="No upcoming bookings found"
          />
        </CardContent>
      </Card>
    </div>
  );
}


