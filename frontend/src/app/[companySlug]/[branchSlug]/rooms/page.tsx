'use client';

/* eslint-disable @next/next/no-img-element */

import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { useGetBranchRoomsQuery, useGetCompanyBySlugQuery } from '@/lib/api/endpoints/publicApi';
import { formatCurrency } from '@/lib/utils';
import { MagnifyingGlassIcon, MapPinIcon } from '@heroicons/react/24/outline';
import Link from 'next/link';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';

export default function PublicRoomsPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const companySlug = params.companySlug as string;
  const branchSlug = params.branchSlug as string;
  
  const checkInDate = searchParams.get('checkIn') || '';
  const checkOutDate = searchParams.get('checkOut') || '';

  const { 
    data: company, 
    isLoading: companyLoading,
    isError: companyError,
  } = useGetCompanyBySlugQuery(companySlug, {
    skip: !companySlug,
  });
  
  const { 
    data: rooms, 
    isLoading: roomsLoading,
    isError: roomsError,
    error: roomsErrorData,
  } = useGetBranchRoomsQuery(
    { 
      companySlug, 
      branchSlug,
      checkInDate: checkInDate || undefined,
      checkOutDate: checkOutDate || undefined,
    },
    { 
      skip: !companySlug || !branchSlug,
    }
  );

  const [searchQuery, setSearchQuery] = useState<string>('');
  const [roomTypeFilter, setRoomTypeFilter] = useState<string>('all');
  const [priceRange, setPriceRange] = useState<{ min: number; max: number }>({ min: 0, max: 100000 });

  // Show error toast if API errors occur
  useEffect(() => {
    if (companyError) {
      const errorMsg = (companyError as any)?.data?.message || 'Failed to load company information';
      toast.error(errorMsg);
      console.error('Company error:', companyError);
    }
    if (roomsError) {
      const errorMsg = (roomsErrorData as any)?.data?.message || 'Failed to load rooms. Please try again later.';
      toast.error(errorMsg);
      console.error('Rooms error:', roomsErrorData);
    }
  }, [companyError, roomsError, roomsErrorData]);

  const filteredRooms = useMemo(() => {
    if (!rooms || !Array.isArray(rooms)) return [];
    
    return rooms.filter((room) => {
      const matchesSearch = 
        room.roomNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        room.roomType.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (room.description && room.description.toLowerCase().includes(searchQuery.toLowerCase()));
      
      const matchesType = roomTypeFilter === 'all' || room.roomType === roomTypeFilter;
      const matchesPrice = room.basePrice >= priceRange.min && room.basePrice <= priceRange.max;
      
      return matchesSearch && matchesType && matchesPrice;
    });
  }, [rooms, searchQuery, roomTypeFilter, priceRange]);

  const roomTypes = useMemo(() => {
    if (!rooms) return [];
    const types = new Set(rooms.map(r => r.roomType));
    return Array.from(types);
  }, [rooms]);

  const maxPrice = useMemo(() => {
    if (!rooms || rooms.length === 0) return 10000;
    return Math.max(...rooms.map(r => r.basePrice));
  }, [rooms]);

  const handleDateChange = (type: 'checkIn' | 'checkOut', value: string) => {
    const newSearchParams = new URLSearchParams(searchParams.toString());
    if (value) {
      newSearchParams.set(type === 'checkIn' ? 'checkIn' : 'checkOut', value);
    } else {
      newSearchParams.delete(type === 'checkIn' ? 'checkIn' : 'checkOut');
    }
    router.push(`/${companySlug}/${branchSlug}/rooms?${newSearchParams.toString()}`);
  };

  if (companyLoading || roomsLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading rooms...</p>
        </div>
      </div>
    );
  }

  if (companyError || roomsError || !company) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 dark:text-red-400">Failed to load rooms. Please try again later.</p>
          <Link href={`/${companySlug}/${branchSlug}`}>
            <Button className="mt-4">Go Back</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                {company.name} - Rooms
              </h1>
              <p className="mt-1 text-gray-600 dark:text-gray-400">
                Browse available rooms and book your stay
              </p>
            </div>
            <Link href={`/${companySlug}/${branchSlug}`}>
              <Button variant="secondary">Back to Menu</Button>
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Filters */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Date Filters */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Check-In Date
              </label>
              <Input
                type="date"
                value={checkInDate}
                onChange={(e) => handleDateChange('checkIn', e.target.value)}
                min={new Date().toISOString().split('T')[0]}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Check-Out Date
              </label>
              <Input
                type="date"
                value={checkOutDate}
                onChange={(e) => handleDateChange('checkOut', e.target.value)}
                min={checkInDate || new Date().toISOString().split('T')[0]}
              />
            </div>

            {/* Search */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Search
              </label>
              <div className="relative">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <Input
                  type="text"
                  placeholder="Search rooms..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {/* Room Type Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Room Type
              </label>
              <select
                value={roomTypeFilter}
                onChange={(e) => setRoomTypeFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="all">All Types</option>
                {roomTypes.map((type) => (
                  <option key={type} value={type}>
                    {type.charAt(0).toUpperCase() + type.slice(1)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Price Range */}
          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Price Range: {formatCurrency(priceRange.min)} - {formatCurrency(priceRange.max)}
            </label>
            <div className="grid grid-cols-2 gap-4">
              <Input
                type="number"
                placeholder="Min Price"
                value={priceRange.min}
                onChange={(e) => setPriceRange({ ...priceRange, min: Number(e.target.value) })}
              />
              <Input
                type="number"
                placeholder="Max Price"
                value={priceRange.max}
                onChange={(e) => setPriceRange({ ...priceRange, max: Number(e.target.value) })}
              />
            </div>
          </div>
        </div>

        {/* Results Count */}
        <div className="mb-4">
          <p className="text-gray-600 dark:text-gray-400">
            {filteredRooms.length} {filteredRooms.length === 1 ? 'room' : 'rooms'} available
            {checkInDate && checkOutDate && ` for ${checkInDate} to ${checkOutDate}`}
          </p>
        </div>

        {/* Rooms Grid */}
        {filteredRooms.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-600 dark:text-gray-400 text-lg">
              No rooms found matching your criteria.
            </p>
            <Button
              className="mt-4"
              onClick={() => {
                setSearchQuery('');
                setRoomTypeFilter('all');
                setPriceRange({ min: 0, max: maxPrice });
                router.push(`/${companySlug}/${branchSlug}/rooms`);
              }}
            >
              Clear Filters
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredRooms.map((room) => (
              <Card key={room.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                <Link href={`/${companySlug}/${branchSlug}/rooms/${room.id}`}>
                  <div className="relative h-48 bg-gray-200 dark:bg-gray-700">
                    {room.images && room.images.length > 0 ? (
                      <img
                        src={room.images[0]}
                        alt={room.roomNumber}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-400">
                        <MapPinIcon className="h-16 w-16" />
                      </div>
                    )}
                    <div className="absolute top-2 right-2 bg-primary-600 text-white px-2 py-1 rounded text-sm font-semibold">
                      {formatCurrency(room.basePrice)}/night
                    </div>
                  </div>
                  <CardContent className="p-4">
                    <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                      Room {room.roomNumber}
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-2 capitalize">
                      {room.roomType} Room
                    </p>
                    {room.description && (
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-3 line-clamp-2">
                        {room.description}
                      </p>
                    )}
                    <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400 mb-3">
                      <span>Max {room.maxOccupancy} guests</span>
                      {room.size && <span>{room.size}</span>}
                    </div>
                    {room.amenities && room.amenities.length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-3">
                        {room.amenities.slice(0, 3).map((amenity, idx) => (
                          <span
                            key={idx}
                            className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 px-2 py-1 rounded"
                          >
                            {amenity}
                          </span>
                        ))}
                        {room.amenities.length > 3 && (
                          <span className="text-xs text-gray-500">+{room.amenities.length - 3} more</span>
                        )}
                      </div>
                    )}
                    <Button className="w-full mt-4">View Details & Book</Button>
                  </CardContent>
                </Link>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

