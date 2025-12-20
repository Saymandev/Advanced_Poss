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
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              <Card>
                <CardContent className="p-4">
                  <div className="text-sm text-gray-600">Total Rooms</div>
                  <div className="text-2xl font-bold">{roomStats.total || 0}</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="text-sm text-gray-600">Available</div>
                  <div className="text-2xl font-bold text-green-600">
                    {roomStats.available || 0}
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="text-sm text-gray-600">Occupied</div>
                  <div className="text-2xl font-bold text-red-600">
                    {roomStats.occupied || 0}
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="text-sm text-gray-600">Reserved</div>
                  <div className="text-2xl font-bold text-yellow-600">
                    {roomStats.reserved || 0}
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="text-sm text-gray-600">Maintenance</div>
                  <div className="text-2xl font-bold text-blue-600">
                    {roomStats.maintenance || 0}
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="text-sm text-gray-600">Occupancy Rate</div>
                  <div className="text-2xl font-bold">
                    {roomStats.occupancyRate || 0}%
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
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              <Card>
                <CardContent className="p-4">
                  <div className="text-sm text-gray-600">Total Bookings</div>
                  <div className="text-2xl font-bold">
                    {bookingStats.total || 0}
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="text-sm text-gray-600">Pending</div>
                  <div className="text-2xl font-bold text-yellow-600">
                    {bookingStats.pending || 0}
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="text-sm text-gray-600">Confirmed</div>
                  <div className="text-2xl font-bold text-green-600">
                    {bookingStats.confirmed || 0}
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="text-sm text-gray-600">Checked In</div>
                  <div className="text-2xl font-bold text-blue-600">
                    {bookingStats.checkedIn || 0}
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="text-sm text-gray-600">Checked Out</div>
                  <div className="text-2xl font-bold text-gray-600">
                    {bookingStats.checkedOut || 0}
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="text-sm text-gray-600">Cancelled</div>
                  <div className="text-2xl font-bold text-red-600">
                    {bookingStats.cancelled || 0}
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              <Card>
                <CardContent className="p-4">
                  <div className="text-sm text-gray-600">Total Revenue</div>
                  <div className="text-2xl font-bold">
                    {formatCurrency(bookingStats.totalRevenue || 0)}
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="text-sm text-gray-600">Average Booking Value</div>
                  <div className="text-2xl font-bold">
                    {formatCurrency(bookingStats.averageBookingValue || 0)}
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


