'use client';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { DataTable } from '@/components/ui/DataTable';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Select } from '@/components/ui/Select';
import { useCurrency } from '@/contexts/CurrencyContext';
import { useFeatureRedirect } from '@/hooks/useFeatureRedirect';
import { useFormatCurrency } from '@/hooks/useFormatCurrency';
import {
  Booking,
  useCancelBookingMutation,
  useCheckInMutation,
  useCheckOutMutation,
  useCreateBookingMutation,
  useGetBookingByIdQuery,
  useGetBookingStatsQuery,
  useGetBookingsQuery,
  useUpdateBookingMutation,
} from '@/lib/api/endpoints/bookingsApi';
import { useGetRoomsByBranchQuery as useGetRoomsQuery } from '@/lib/api/endpoints/roomsApi';
import { useAppSelector } from '@/lib/store';
import { useSocket } from '@/lib/hooks/useSocket';
import {
  CheckCircleIcon,
  PencilIcon,
  PlusIcon,
  XCircleIcon,
} from '@heroicons/react/24/outline';
import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
export default function BookingsPage() {
  const { user, companyContext } = useAppSelector((state) => state.auth);
  const formatCurrency = useFormatCurrency();
  const { currency } = useCurrency();
  useFeatureRedirect('booking-management');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');
  const [isCheckoutModalOpen, setIsCheckoutModalOpen] = useState(false);
  const [checkoutBooking, setCheckoutBooking] = useState<Booking | null>(null);
  const [checkoutForm, setCheckoutForm] = useState<{ additionalCharges: number; notes: string }>({
    additionalCharges: 0,
    notes: '',
  });
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [cancelBookingTarget, setCancelBookingTarget] = useState<Booking | null>(null);
  const [cancelForm, setCancelForm] = useState<{ reason: string; refundAmount: number }>({
    reason: '',
    refundAmount: 0,
  });
  const {
    data: latestCheckoutBooking,
    refetch: refetchCheckoutBooking,
  } = useGetBookingByIdQuery(checkoutBooking?.id || '', {
    skip: !checkoutBooking?.id,
  });
  const effectiveCheckoutBooking = latestCheckoutBooking || checkoutBooking;
  const checkoutExistingAdditionalTotal = useMemo(() => {
    if (!effectiveCheckoutBooking || !effectiveCheckoutBooking.additionalCharges) return 0;
    return effectiveCheckoutBooking.additionalCharges.reduce(
      (sum, charge) => sum + ((charge as any)?.amount || 0),
      0,
    );
  }, [effectiveCheckoutBooking]);
  const branchId = (user as any)?.branchId || 
                   (companyContext as any)?.branchId || 
                   (companyContext as any)?.branches?.[0]?._id ||
                   (companyContext as any)?.branches?.[0]?.id;
  const bookingsQueryParams = useMemo(() => {
    const params: { branchId?: string; status?: string } = {};
    if (branchId) {
      params.branchId = branchId;
    }
    if (statusFilter !== 'all') {
      params.status = statusFilter;
    }
    return params;
  }, [branchId, statusFilter]);
  const { data: bookingsResponse, isLoading, refetch } = useGetBookingsQuery(
    bookingsQueryParams,
    { 
      skip: !branchId,
      pollingInterval: 60000,
    }
  );
  // Socket.IO for real-time booking updates
  const { socket, isConnected } = useSocket();
  // Listen for booking updates via Socket.IO
  useEffect(() => {
    if (!socket || !isConnected) return;
    const handleBookingUpdated = (data: any) => {
      // If the updated booking is the one we're checking out, refetch it
      if (checkoutBooking?.id && (data._id === checkoutBooking.id || data.id === checkoutBooking.id)) {
        refetchCheckoutBooking();
      }
      // Also refetch the bookings list to show updated data
      refetch();
    };
    socket.on('booking:updated', handleBookingUpdated);
    return () => {
      socket.off('booking:updated', handleBookingUpdated);
    };
  }, [socket, isConnected, checkoutBooking?.id, refetchCheckoutBooking, refetch]);
  const { data: rooms } = useGetRoomsQuery(branchId || '', {
    skip: !branchId,
  });
  const { data: stats } = useGetBookingStatsQuery(
    { branchId: branchId || '' },
    { skip: !branchId }
  );
  const bookings = useMemo(() => {
    if (!bookingsResponse) return [];
    const response = bookingsResponse as any;
    // If transformResponse returned { bookings: Booking[]; total: number }
    if (Array.isArray(response.bookings)) {
      return response.bookings as Booking[];
    }
    // If transformResponse was bypassed and backend returned an array directly
    if (Array.isArray(response)) {
      return response as Booking[];
    }
    // If backend wrapped data inside .data
    if (response.data) {
      if (Array.isArray(response.data.bookings)) {
        return response.data.bookings as Booking[];
      }
      if (Array.isArray(response.data)) {
        return response.data as Booking[];
      }
    }
    return [] as Booking[];
  }, [bookingsResponse]);
  const filteredBookings = useMemo(() => {
    if (!bookings || bookings.length === 0) return [];
    return bookings.filter((booking: Booking) => {
      // Search filter - handle empty/null values safely
      const searchLower = searchQuery.toLowerCase();
      const matchesSearch = !searchQuery || 
        (booking.bookingNumber || '').toLowerCase().includes(searchLower) ||
        (booking.guestName || '').toLowerCase().includes(searchLower) ||
        (booking.roomNumber || '').toLowerCase().includes(searchLower);
      // Status filter
      const matchesStatus = statusFilter === 'all' || booking.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [bookings, searchQuery, statusFilter]);
  // Calendar-style view: build next 30 days with bookings per day
  const calendarDays = useMemo(() => {
    if (!bookings || bookings.length === 0) return [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const days: {
      date: Date;
      dateStr: string;
      bookings: Booking[];
    }[] = [];
    for (let i = 0; i < 30; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      date.setHours(0, 0, 0, 0);
      const dateStr = date.toISOString().split('T')[0];
      const dayBookings = bookings.filter((booking: Booking) => {
        if (!booking.checkInDate || !booking.checkOutDate) return false;
        const checkIn = new Date(booking.checkInDate);
        const checkOut = new Date(booking.checkOutDate);
        checkIn.setHours(0, 0, 0, 0);
        checkOut.setHours(0, 0, 0, 0);
        // Occupied nights from check-in (inclusive) to check-out (exclusive)
        return date >= checkIn && date < checkOut;
      });
      days.push({ date, dateStr, bookings: dayBookings });
    }
    return days;
  }, [bookings]);
  const [createBooking, { isLoading: isCreating }] = useCreateBookingMutation();
  const [updateBooking, { isLoading: isUpdating }] = useUpdateBookingMutation();
  const [checkIn] = useCheckInMutation();
  const [checkOut] = useCheckOutMutation();
  const [cancelBooking] = useCancelBookingMutation();
  const [formData, setFormData] = useState<any>({
    roomId: '',
    guestName: '',
    guestEmail: '',
    guestPhone: '',
    numberOfGuests: 1,
    checkInDate: '',
    checkOutDate: '',
    roomRate: 0,
    discount: 0,
    taxRate: 0,
    serviceChargeRate: 0,
    specialRequests: '',
    notes: '',
    paymentStatus: 'pending',
    depositAmount: 0,
  });
  const resetForm = () => {
    setFormData({
      roomId: '',
      guestName: '',
      guestEmail: '',
      guestPhone: '',
      numberOfGuests: 1,
      checkInDate: '',
      checkOutDate: '',
      roomRate: 0,
      discount: 0,
      taxRate: 0,
      serviceChargeRate: 0,
      specialRequests: '',
      notes: '',
      paymentStatus: 'pending',
      depositAmount: 0,
    });
    setSelectedBooking(null);
  };
  useEffect(() => {
    if (!isCreateModalOpen && !isEditModalOpen) {
      resetForm();
    }
  }, [isCreateModalOpen, isEditModalOpen]);
  useEffect(() => {
    if (selectedBooking && isEditModalOpen) {
      setFormData({
        roomId: selectedBooking.roomId,
        guestName: selectedBooking.guestName,
        guestEmail: selectedBooking.guestEmail || '',
        guestPhone: selectedBooking.guestPhone,
        numberOfGuests: selectedBooking.numberOfGuests,
        checkInDate: selectedBooking.checkInDate.split('T')[0],
        checkOutDate: selectedBooking.checkOutDate.split('T')[0],
        roomRate: selectedBooking.roomRate,
        discount: selectedBooking.discount || 0,
        taxRate: 0,
        serviceChargeRate: 0,
        specialRequests: selectedBooking.specialRequests || '',
        notes: selectedBooking.notes || '',
        paymentStatus: selectedBooking.paymentStatus,
        depositAmount: selectedBooking.depositAmount || 0,
      });
    }
  }, [selectedBooking, isEditModalOpen]);
  useEffect(() => {
    if (formData.roomId && rooms) {
      const selectedRoom = rooms.find((r) => r.id === formData.roomId);
      if (selectedRoom) {
        setFormData((prev: any) => ({
          ...prev,
          roomRate: selectedRoom.basePrice,
        }));
      }
    }
  }, [formData.roomId, rooms]);
  const handleCreate = async () => {
    if (!formData.roomId || !formData.guestName || !formData.guestPhone || !formData.checkInDate || !formData.checkOutDate) {
      toast.error('Please fill in all required fields');
      return;
    }
    try {
      await createBooking({
        branchId: branchId || '',
        ...formData,
        checkInDate: new Date(formData.checkInDate).toISOString(),
        checkOutDate: new Date(formData.checkOutDate).toISOString(),
      }).unwrap();
      toast.success('Booking created successfully');
      setIsCreateModalOpen(false);
      resetForm();
    } catch (error: any) {
      toast.error(error?.data?.message || 'Failed to create booking');
    }
  };
  const handleUpdate = async () => {
    if (!selectedBooking) return;
    try {
      await updateBooking({
        id: selectedBooking.id,
        ...formData,
        checkInDate: new Date(formData.checkInDate).toISOString(),
        checkOutDate: new Date(formData.checkOutDate).toISOString(),
      }).unwrap();
      toast.success('Booking updated successfully');
      setIsEditModalOpen(false);
      resetForm();
    } catch (error: any) {
      toast.error(error?.data?.message || 'Failed to update booking');
    }
  };
  const handleCheckIn = async (id: string) => {
    try {
      await checkIn({ id }).unwrap();
      toast.success('Guest checked in successfully');
      refetch();
    } catch (error: any) {
      toast.error(error?.data?.message || 'Failed to check in');
    }
  };
  const openCheckoutModal = (booking: Booking) => {
    setCheckoutBooking(booking);
    setCheckoutForm({
      additionalCharges: 0,
      notes: '',
    });
    setIsCheckoutModalOpen(true);
  };
  const handleConfirmCheckOut = async () => {
    if (!checkoutBooking) return;
    try {
      await checkOut({
        id: checkoutBooking.id,
        notes: checkoutForm.notes || undefined,
        additionalCharges:
          checkoutForm.additionalCharges && checkoutForm.additionalCharges > 0
            ? checkoutForm.additionalCharges
            : undefined,
      }).unwrap();
      toast.success('Guest checked out successfully');
      setIsCheckoutModalOpen(false);
      setCheckoutBooking(null);
      refetch();
    } catch (error: any) {
      toast.error(error?.data?.message || 'Failed to check out');
    }
  };
  const openCancelModal = (booking: Booking) => {
    setCancelBookingTarget(booking);
    setCancelForm({
      reason: '',
      refundAmount: 0,
    });
    setIsCancelModalOpen(true);
  };
  const handleConfirmCancel = async () => {
    if (!cancelBookingTarget) return;
    try {
      await cancelBooking({
        id: cancelBookingTarget.id,
        reason: cancelForm.reason || undefined,
        refundAmount:
          cancelForm.refundAmount && cancelForm.refundAmount > 0
            ? cancelForm.refundAmount
            : undefined,
      }).unwrap();
      toast.success('Booking cancelled successfully');
      setIsCancelModalOpen(false);
      setCancelBookingTarget(null);
      refetch();
    } catch (error: any) {
      toast.error(error?.data?.message || 'Failed to cancel booking');
    }
  };
  const handleConfirmBooking = async (booking: Booking) => {
    try {
      await updateBooking({
        id: booking.id,
        // Only change status; amounts and dates remain the same
        // UpdateBookingRequest doesn't include status, so cast as any
        ...( { status: 'confirmed' } as any ),
      }).unwrap();
      toast.success('Booking confirmed successfully');
      refetch();
    } catch (error: any) {
      toast.error(error?.data?.message || 'Failed to confirm booking');
    }
  };
  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { variant: 'success' | 'warning' | 'danger' | 'info' | 'default'; label: string }> = {
      pending: { variant: 'warning', label: 'Pending' },
      confirmed: { variant: 'success', label: 'Confirmed' },
      checked_in: { variant: 'info', label: 'Checked In' },
      checked_out: { variant: 'success', label: 'Checked Out' },
      cancelled: { variant: 'danger', label: 'Cancelled' },
      no_show: { variant: 'danger', label: 'No Show' },
    };
    const config = statusConfig[status] || { variant: 'default', label: status };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };
  const columns = [
    {
      key: 'bookingNumber',
      title: 'Booking #',
      sortable: true,
    },
    {
      key: 'guestName',
      title: 'Guest Name',
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
      sortable: true,
      render: (value: string) => new Date(value).toLocaleDateString(),
    },
    {
      key: 'checkOutDate',
      title: 'Check Out',
      sortable: true,
      render: (value: string) => new Date(value).toLocaleDateString(),
    },
    {
      key: 'numberOfNights',
      title: 'Nights',
      sortable: true,
    },
    {
      key: 'totalAmount',
      title: 'Total Amount',
      sortable: true,
      render: (value: number) => formatCurrency(value || 0),
    },
    {
      key: 'status',
      title: 'Status',
      render: (value: string) => getStatusBadge(value),
    },
    {
      key: 'actions',
      title: 'Actions',
      render: (_: any, booking: Booking) => {
        return (
          <div className="flex gap-2">
            {booking.status === 'pending' && (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => handleConfirmBooking(booking)}
              >
                <CheckCircleIcon className="h-4 w-4 mr-1" />
                Confirm
              </Button>
            )}
            {booking.status === 'confirmed' && (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => handleCheckIn(booking.id)}
              >
                Check In
              </Button>
            )}
            {booking.status === 'checked_in' && (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => openCheckoutModal(booking)}
              >
                Check Out
              </Button>
            )}
            {booking.status !== 'checked_out' && booking.status !== 'cancelled' && (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSelectedBooking(booking);
                    setIsEditModalOpen(true);
                  }}
                >
                  <PencilIcon className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => openCancelModal(booking)}
                >
                  <XCircleIcon className="h-4 w-4 text-red-500" />
                </Button>
              </>
            )}
          </div>
        );
      },
    },
  ];
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Booking Management</h1>
          <p className="text-gray-600 mt-1">Manage hotel bookings and check-ins</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
          <div className="inline-flex rounded-full border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-900 p-1">
            <button
              type="button"
              className={`px-3 py-1.5 text-xs sm:text-sm rounded-full transition ${
                viewMode === 'list'
                  ? 'bg-white dark:bg-slate-800 text-gray-900 dark:text-white shadow'
                  : 'text-gray-500 dark:text-slate-400'
              }`}
              onClick={() => setViewMode('list')}
            >
              List View
            </button>
            <button
              type="button"
              className={`px-3 py-1.5 text-xs sm:text-sm rounded-full transition ${
                viewMode === 'calendar'
                  ? 'bg-white dark:bg-slate-800 text-gray-900 dark:text-white shadow'
                  : 'text-gray-500 dark:text-slate-400'
              }`}
              onClick={() => setViewMode('calendar')}
            >
              Calendar View
            </button>
          </div>
          <Button onClick={() => setIsCreateModalOpen(true)}>
            <PlusIcon className="h-5 w-5 mr-2" />
            New Booking
          </Button>
        </div>
      </div>
      {stats && (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="text-sm text-gray-600">Total Bookings</div>
              <div className="text-2xl font-bold">{stats.total || 0}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-sm text-gray-600">Pending</div>
              <div className="text-2xl font-bold text-yellow-600">{stats.pending || 0}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-sm text-gray-600">Confirmed</div>
              <div className="text-2xl font-bold text-green-600">{stats.confirmed || 0}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-sm text-gray-600">Checked In</div>
              <div className="text-2xl font-bold text-blue-600">{stats.checkedIn || 0}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-sm text-gray-600">Checked Out</div>
              <div className="text-2xl font-bold text-gray-600">{stats.checkedOut || 0}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-sm text-gray-600">Cancelled</div>
              <div className="text-2xl font-bold text-red-600">{stats.cancelled || 0}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-sm text-gray-600">Revenue</div>
              <div className="text-2xl font-bold">
                {formatCurrency(stats.totalRevenue || 0)}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-sm text-gray-600">Avg Value</div>
              <div className="text-2xl font-bold">
                {formatCurrency(stats.averageBookingValue || 0)}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
      {viewMode === 'calendar' && (
        <Card>
          <CardHeader>
            <CardTitle>Booking Calendar (Next 30 Days)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-7 gap-3">
              {calendarDays.map((day) => {
                const dateLabel = day.date.toLocaleDateString(undefined, {
                  month: 'short',
                  day: 'numeric',
                });
                const weekdayLabel = day.date.toLocaleDateString(undefined, {
                  weekday: 'short',
                });
                const total = day.bookings.length;
                const confirmed = day.bookings.filter(
                  (b) => b.status === 'confirmed'
                ).length;
                const checkedIn = day.bookings.filter(
                  (b) => b.status === 'checked_in'
                ).length;
                return (
                  <div
                    key={day.dateStr}
                    className="rounded-xl border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-3 flex flex-col gap-1"
                  >
                    <div className="flex items-center justify-between text-xs text-gray-500 dark:text-slate-400">
                      <span>{weekdayLabel}</span>
                      <span className="font-medium text-gray-800 dark:text-slate-100">
                        {dateLabel}
                      </span>
                    </div>
                    <div className="text-lg font-semibold text-gray-900 dark:text-white">
                      {total} booking{total === 1 ? '' : 's'}
                    </div>
                    {total > 0 && (
                      <div className="text-[11px] text-gray-500 dark:text-slate-400 space-y-0.5">
                        <div>
                          <span className="inline-block w-2 h-2 rounded-full bg-green-500 mr-1" />
                          Confirmed: {confirmed}
                        </div>
                        <div>
                          <span className="inline-block w-2 h-2 rounded-full bg-blue-500 mr-1" />
                          Checked In: {checkedIn}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
      {viewMode === 'list' && (
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row gap-4">
              <Input
                placeholder="Search by booking number, guest name, or room..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1"
              />
              <Select
                value={statusFilter}
                onChange={(value) => setStatusFilter(value)}
                options={[
                  { value: 'all', label: 'All Status' },
                  { value: 'pending', label: 'Pending' },
                  { value: 'confirmed', label: 'Confirmed' },
                  { value: 'checked_in', label: 'Checked In' },
                  { value: 'checked_out', label: 'Checked Out' },
                  { value: 'cancelled', label: 'Cancelled' },
                ]}
                className="sm:min-w-[180px]"
              />
            </div>
          </CardHeader>
          <CardContent>
            <DataTable
              data={filteredBookings}
              columns={columns}
              loading={isLoading}
              exportOptions={{
                filename: 'bookings',
                columns: [
                  { key: 'bookingNumber', label: 'Booking Number' },
                  { key: 'guestName', label: 'Guest Name' },
                  { key: 'roomNumber', label: 'Room' },
                  {
                    key: 'checkInDate',
                    label: 'Check In',
                    format: (val) => new Date(val).toLocaleDateString(),
                  },
                  {
                    key: 'checkOutDate',
                    label: 'Check Out',
                    format: (val) => new Date(val).toLocaleDateString(),
                  },
                  { key: 'numberOfNights', label: 'Nights' },
                  {
                    key: 'totalAmount',
                    label: 'Total Amount',
                    format: (val) => formatCurrency(Number(val) || 0),
                  },
                  { key: 'status', label: 'Status' },
                ],
              }}
            />
          </CardContent>
        </Card>
      )}
      {/* Create Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Create Booking"
        size="lg"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Room *</label>
              <Select
                value={formData.roomId}
                onChange={(value) => setFormData({ ...formData, roomId: value })}
                options={[
                  { value: '', label: 'Select Room' },
                  ...(rooms?.map((room) => ({
                    value: room.id,
                    label: `${room.roomNumber} - ${room.roomType} (${formatCurrency(room.basePrice || 0)}/night)`,
                  })) || []),
                ]}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Room Rate ({currency}) *</label>
              <Input
                type="number"
                value={formData.roomRate}
                onChange={(e) => setFormData({ ...formData, roomRate: Number(e.target.value) })}
                min="0"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Guest Name *</label>
              <Input
                value={formData.guestName}
                onChange={(e) => setFormData({ ...formData, guestName: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Guest Phone *</label>
              <Input
                value={formData.guestPhone}
                onChange={(e) => setFormData({ ...formData, guestPhone: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Guest Email</label>
              <Input
                type="email"
                value={formData.guestEmail}
                onChange={(e) => setFormData({ ...formData, guestEmail: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Number of Guests *</label>
              <Input
                type="number"
                value={formData.numberOfGuests}
                onChange={(e) => setFormData({ ...formData, numberOfGuests: Number(e.target.value) })}
                min="1"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Check In Date *</label>
              <Input
                type="date"
                value={formData.checkInDate}
                onChange={(e) => setFormData({ ...formData, checkInDate: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Check Out Date *</label>
              <Input
                type="date"
                value={formData.checkOutDate}
                onChange={(e) => setFormData({ ...formData, checkOutDate: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Tax Rate (%)</label>
              <Input
                type="number"
                value={formData.taxRate}
                onChange={(e) => setFormData({ ...formData, taxRate: Number(e.target.value) })}
                min="0"
                max="100"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Service Charge (%)</label>
              <Input
                type="number"
                value={formData.serviceChargeRate}
                onChange={(e) => setFormData({ ...formData, serviceChargeRate: Number(e.target.value) })}
                min="0"
                max="100"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Discount ({currency})</label>
              <Input
                type="number"
                value={formData.discount}
                onChange={(e) => setFormData({ ...formData, discount: Number(e.target.value) })}
                min="0"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Deposit Amount ({currency})</label>
              <Input
                type="number"
                value={formData.depositAmount}
                onChange={(e) => setFormData({ ...formData, depositAmount: Number(e.target.value) })}
                min="0"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Special Requests</label>
            <Input
              value={formData.specialRequests}
              onChange={(e) => setFormData({ ...formData, specialRequests: e.target.value })}
              placeholder="Any special requests..."
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setIsCreateModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={isCreating}>
              {isCreating ? 'Creating...' : 'Create Booking'}
            </Button>
          </div>
        </div>
      </Modal>
      {/* Edit Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title="Edit Booking"
        size="lg"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Room *</label>
              <Select
                value={formData.roomId}
                onChange={(value) => setFormData({ ...formData, roomId: value })}
                options={[
                  { value: '', label: 'Select Room' },
                  ...(rooms?.map((room) => ({
                    value: room.id,
                    label: `${room.roomNumber} - ${room.roomType}`,
                  })) || []),
                ]}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Room Rate ({currency}) *</label>
              <Input
                type="number"
                value={formData.roomRate}
                onChange={(e) => setFormData({ ...formData, roomRate: Number(e.target.value) })}
                min="0"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Guest Name *</label>
              <Input
                value={formData.guestName}
                onChange={(e) => setFormData({ ...formData, guestName: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Guest Phone *</label>
              <Input
                value={formData.guestPhone}
                onChange={(e) => setFormData({ ...formData, guestPhone: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Check In Date *</label>
              <Input
                type="date"
                value={formData.checkInDate}
                onChange={(e) => setFormData({ ...formData, checkInDate: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Check Out Date *</label>
              <Input
                type="date"
                value={formData.checkOutDate}
                onChange={(e) => setFormData({ ...formData, checkOutDate: e.target.value })}
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setIsEditModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdate} disabled={isUpdating}>
              {isUpdating ? 'Updating...' : 'Update'}
            </Button>
          </div>
        </div>
      </Modal>
      {/* Check-Out Modal */}
      <Modal
        isOpen={isCheckoutModalOpen}
        onClose={() => setIsCheckoutModalOpen(false)}
        title="Check Out Booking"
        size="md"
      >
        <div className="space-y-4">
          {effectiveCheckoutBooking && (
            <div className="text-sm text-gray-600 dark:text-slate-300 space-y-1">
              <p>
                <span className="font-medium">Booking #:</span>{' '}
                {effectiveCheckoutBooking.bookingNumber}
              </p>
              <p>
                <span className="font-medium">Guest:</span>{' '}
                {effectiveCheckoutBooking.guestName} &middot; Room{' '}
                {effectiveCheckoutBooking.roomNumber}
              </p>
              <p>
                <span className="font-medium">Current Total:</span>{' '}
                {formatCurrency(effectiveCheckoutBooking.totalAmount)}
              </p>
            </div>
          )}
          {effectiveCheckoutBooking && effectiveCheckoutBooking.additionalCharges && effectiveCheckoutBooking.additionalCharges.length > 0 && (
            <div className="rounded-lg border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-900/40 p-3 space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="font-semibold text-gray-800 dark:text-slate-100">
                  Existing Additional Charges
                </span>
                <span className="font-semibold text-emerald-600 dark:text-emerald-300">
                  {formatCurrency(checkoutExistingAdditionalTotal)}
                </span>
              </div>
              <ul className="space-y-1 text-xs sm:text-sm text-gray-700 dark:text-slate-300">
                {effectiveCheckoutBooking.additionalCharges.map((charge: any, index: number) => (
                  <li key={index} className="flex items-center justify-between gap-2">
                    <span className="truncate">
                      {(charge.type || 'Charge').replace(/_/g, ' ')}
                      {charge.description ? ` — ${charge.description}` : ''}
                    </span>
                    <span className="font-medium">
                      {formatCurrency(charge.amount || 0)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          <div className="space-y-2">
            <label className="block text-sm font-medium mb-1">
              Additional Charges ({currency})
            </label>
            <Input
              type="number"
              min="0"
              value={checkoutForm.additionalCharges}
              onChange={(e) =>
                setCheckoutForm((prev) => ({
                  ...prev,
                  additionalCharges: Number(e.target.value) || 0,
                }))
              }
              placeholder="0"
            />
          </div>
          <div className="space-y-2">
            <label className="block text-sm font-medium mb-1">Notes</label>
            <textarea
              className="w-full px-3 py-2 border border-gray-300 dark:border-slate-700 rounded-md bg-white dark:bg-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              rows={3}
              value={checkoutForm.notes}
              onChange={(e) =>
                setCheckoutForm((prev) => ({
                  ...prev,
                  notes: e.target.value,
                }))
              }
              placeholder="Any notes about this checkout..."
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="secondary"
              onClick={() => setIsCheckoutModalOpen(false)}
            >
              Cancel
            </Button>
            <Button onClick={handleConfirmCheckOut}>
              Confirm Check Out
            </Button>
          </div>
        </div>
      </Modal>
      {/* Cancel / Refund Modal */}
      <Modal
        isOpen={isCancelModalOpen}
        onClose={() => setIsCancelModalOpen(false)}
        title="Cancel Booking"
        size="md"
      >
        <div className="space-y-4">
          {cancelBookingTarget && (
            <div className="text-sm text-gray-600 dark:text-slate-300 space-y-1">
              <p>
                <span className="font-medium">Booking #:</span>{' '}
                {cancelBookingTarget.bookingNumber}
              </p>
              <p>
                <span className="font-medium">Guest:</span>{' '}
                {cancelBookingTarget.guestName} &middot; Room{' '}
                {cancelBookingTarget.roomNumber}
              </p>
            </div>
          )}
          <div className="space-y-2">
            <label className="block text-sm font-medium mb-1">
              Cancellation Reason
            </label>
            <textarea
              className="w-full px-3 py-2 border border-gray-300 dark:border-slate-700 rounded-md bg-white dark:bg-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              rows={3}
              value={cancelForm.reason}
              onChange={(e) =>
                setCancelForm((prev) => ({
                  ...prev,
                  reason: e.target.value,
                }))
              }
              placeholder="Reason for cancellation..."
            />
          </div>
          <div className="space-y-2">
            <label className="block text-sm font-medium mb-1">
              Refund Amount ({currency})
            </label>
            <Input
              type="number"
              min="0"
              value={cancelForm.refundAmount}
              onChange={(e) =>
                setCancelForm((prev) => ({
                  ...prev,
                  refundAmount: Number(e.target.value) || 0,
                }))
              }
              placeholder="0"
            />
            <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">
              Leave as 0 if no refund is being issued.
            </p>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="secondary"
              onClick={() => setIsCancelModalOpen(false)}
            >
              Back
            </Button>
            <Button variant="danger" onClick={handleConfirmCancel}>
              Confirm Cancel
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}