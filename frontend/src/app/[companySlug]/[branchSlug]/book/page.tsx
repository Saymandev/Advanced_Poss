'use client';

import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { DateRangePicker } from '@/components/ui/DateRangePicker';
import { Input } from '@/components/ui/Input';
import {
    useCheckRoomAvailabilityQuery,
    useCreatePublicBookingMutation,
    useGetCompanyBySlugQuery,
    useGetRoomDetailsQuery,
} from '@/lib/api/endpoints/publicApi';
import { formatCurrency } from '@/lib/utils';
import { ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import Link from 'next/link';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useMemo, useState } from 'react';
import toast from 'react-hot-toast';

export default function BookingFormPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const companySlug = params.companySlug as string;
  const branchSlug = params.branchSlug as string;
  const roomIdFromQuery = searchParams.get('roomId');

  const { 
    isLoading: companyLoading,
  } = useGetCompanyBySlugQuery(companySlug, {
    skip: !companySlug,
  });

  const [roomId] = useState<string>(roomIdFromQuery || '');
  const [checkInDate, setCheckInDate] = useState<string>('');
  const [checkOutDate, setCheckOutDate] = useState<string>('');
  const [guestName, setGuestName] = useState<string>('');
  const [guestEmail, setGuestEmail] = useState<string>('');
  const [guestPhone, setGuestPhone] = useState<string>('');
  const [numberOfGuests, setNumberOfGuests] = useState<number>(1);
  const [specialRequests, setSpecialRequests] = useState<string>('');

  const { 
    data: room, 
    isLoading: roomLoading,
  } = useGetRoomDetailsQuery(
    { companySlug, branchSlug, roomId },
    { skip: !companySlug || !branchSlug || !roomId }
  );

  const { 
    data: availabilityData,
  } = useCheckRoomAvailabilityQuery(
    {
      companySlug,
      branchSlug,
      checkInDate,
      checkOutDate,
    },
    {
      skip: !checkInDate || !checkOutDate || !companySlug || !branchSlug,
    }
  );

  const [createBooking, { isLoading: isCreating }] = useCreatePublicBookingMutation();

  const isRoomAvailable = useMemo(() => {
    if (!availabilityData || !roomId) return true;
    return availabilityData.availableRooms.some(r => r.id === roomId);
  }, [availabilityData, roomId]);

  const numberOfNights = useMemo(() => {
    if (!checkInDate || !checkOutDate) return 0;
    const checkIn = new Date(checkInDate);
    const checkOut = new Date(checkOutDate);
    const diffTime = checkOut.getTime() - checkIn.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > 0 ? diffDays : 0;
  }, [checkInDate, checkOutDate]);

  const totalAmount = useMemo(() => {
    if (!room || numberOfNights === 0) return 0;
    return room.basePrice * numberOfNights;
  }, [room, numberOfNights]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!roomId) {
      toast.error('Please select a room');
      return;
    }

    if (!checkInDate || !checkOutDate) {
      toast.error('Please select check-in and check-out dates');
      return;
    }

    if (checkInDate >= checkOutDate) {
      toast.error('Check-out date must be after check-in date');
      return;
    }

    if (!guestName || !guestEmail || !guestPhone) {
      toast.error('Please fill in all required guest information');
      return;
    }

    if (!isRoomAvailable) {
      toast.error('This room is not available for the selected dates');
      return;
    }

    try {
      const result = await createBooking({
        companySlug,
        branchSlug,
        bookingData: {
          roomId,
          guestName,
          guestEmail,
          guestPhone,
          checkInDate,
          checkOutDate,
          roomRate: room?.basePrice || 0,
          numberOfGuests,
          specialRequests: specialRequests || undefined,
        },
      }).unwrap();

      toast.success('Booking created successfully!');
      router.push(`/${companySlug}/${branchSlug}/booking/${result.id}`);
    } catch (error: any) {
      toast.error(error?.data?.message || 'Failed to create booking. Please try again.');
    }
  };

  const minDate = new Date().toISOString().split('T')[0];

  if (companyLoading || roomLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 shadow">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <Link 
            href={`/${companySlug}/${branchSlug}/rooms`}
            className="text-primary-600 hover:text-primary-700 text-sm mb-2 inline-block"
          >
            ← Back to Rooms
          </Link>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Book Your Stay
          </h1>
          <p className="mt-1 text-gray-600 dark:text-gray-400">
            Complete your booking in just a few steps
          </p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Room Selection */}
          {!roomIdFromQuery && (
            <Card>
              <CardHeader>
                <CardTitle>Select Room</CardTitle>
              </CardHeader>
              <CardContent>
                <Link href={`/${companySlug}/${branchSlug}/rooms`}>
                  <Button type="button" variant="secondary" className="w-full">
                    Browse Available Rooms
                  </Button>
                </Link>
                {roomId && (
                  <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-700 rounded">
                    <p className="font-semibold">Selected: Room {room?.roomNumber}</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {room?.roomType} • {formatCurrency(room?.basePrice || 0)}/night
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Selected Room Info */}
          {room && (
            <Card>
              <CardHeader>
                <CardTitle>Selected Room</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-lg">Room {room.roomNumber}</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400 capitalize">
                      {room.roomType} Room • Max {room.maxOccupancy} guests
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-lg">{formatCurrency(room.basePrice)}</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">per night</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Date Selection */}
          <Card>
            <CardHeader>
              <CardTitle>Select Dates</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Calendar Component */}
                <div>
                  <DateRangePicker
                    checkInDate={checkInDate}
                    checkOutDate={checkOutDate}
                    onCheckInChange={setCheckInDate}
                    onCheckOutChange={setCheckOutDate}
                    minDate={new Date(minDate)}
                  />
                </div>

                {/* Date Inputs (Alternative) */}
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Check-In Date *
                    </label>
                    <Input
                      type="date"
                      value={checkInDate}
                      onChange={(e) => {
                        setCheckInDate(e.target.value);
                        if (e.target.value >= checkOutDate) {
                          setCheckOutDate('');
                        }
                      }}
                      min={minDate}
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Check-Out Date *
                    </label>
                    <Input
                      type="date"
                      value={checkOutDate}
                      onChange={(e) => setCheckOutDate(e.target.value)}
                      min={checkInDate || minDate}
                      required
                    />
                  </div>
                  {numberOfNights > 0 && (
                    <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        {numberOfNights} {numberOfNights === 1 ? 'night' : 'nights'}
                      </p>
                      {room && (
                        <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                          Total: {formatCurrency(room.basePrice * numberOfNights)}
                        </p>
                      )}
                    </div>
                  )}
                  {checkInDate && checkOutDate && !isRoomAvailable && (
                    <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded flex items-start">
                      <ExclamationTriangleIcon className="h-5 w-5 text-yellow-600 dark:text-yellow-400 mr-2 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-sm text-yellow-800 dark:text-yellow-200 font-medium">
                          Room may not be available for these dates
                        </p>
                        <p className="text-xs text-yellow-700 dark:text-yellow-300 mt-1">
                          Please select different dates or choose another room
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Guest Information */}
          <Card>
            <CardHeader>
              <CardTitle>Guest Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Full Name *
                </label>
                <Input
                  type="text"
                  value={guestName}
                  onChange={(e) => setGuestName(e.target.value)}
                  placeholder="John Doe"
                  required
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Email *
                  </label>
                  <Input
                    type="email"
                    value={guestEmail}
                    onChange={(e) => setGuestEmail(e.target.value)}
                    placeholder="john@example.com"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Phone *
                  </label>
                  <Input
                    type="tel"
                    value={guestPhone}
                    onChange={(e) => setGuestPhone(e.target.value)}
                    placeholder="+1234567890"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Number of Guests
                </label>
                <Input
                  type="number"
                  value={numberOfGuests}
                  onChange={(e) => setNumberOfGuests(Number(e.target.value))}
                  min={1}
                  max={room?.maxOccupancy || 10}
                />
                {room && numberOfGuests > room.maxOccupancy && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                    Maximum {room.maxOccupancy} guests allowed for this room
                  </p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Special Requests (Optional)
                </label>
                <textarea
                  value={specialRequests}
                  onChange={(e) => setSpecialRequests(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="Any special requests or preferences..."
                />
              </div>
            </CardContent>
          </Card>

          {/* Booking Summary */}
          {numberOfNights > 0 && room && (
            <Card>
              <CardHeader>
                <CardTitle>Booking Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">
                      {formatCurrency(room.basePrice)} × {numberOfNights} {numberOfNights === 1 ? 'night' : 'nights'}
                    </span>
                    <span className="font-semibold">
                      {formatCurrency(room.basePrice * numberOfNights)}
                    </span>
                  </div>
                  <div className="border-t border-gray-200 dark:border-gray-700 pt-2 mt-2">
                    <div className="flex justify-between text-lg font-bold">
                      <span>Total</span>
                      <span>{formatCurrency(totalAmount)}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Submit Button */}
          <div className="flex gap-4">
            <Link href={`/${companySlug}/${branchSlug}/rooms`} className="flex-1">
              <Button type="button" variant="secondary" className="w-full">
                Cancel
              </Button>
            </Link>
            <Button
              type="submit"
              className="flex-1"
              disabled={isCreating || !isRoomAvailable || !roomId}
            >
              {isCreating ? 'Creating Booking...' : 'Confirm Booking'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

