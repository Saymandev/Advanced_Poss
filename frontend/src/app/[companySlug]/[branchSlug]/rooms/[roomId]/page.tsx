'use client';

/* eslint-disable @next/next/no-img-element */

import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { useGetCompanyBySlugQuery, useGetRoomDetailsQuery } from '@/lib/api/endpoints/publicApi';
import { formatCurrency } from '@/lib/utils';
import { MapPinIcon, UserGroupIcon } from '@heroicons/react/24/outline';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useState } from 'react';

export default function RoomDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const companySlug = params.companySlug as string;
  const branchSlug = params.branchSlug as string;
  const roomId = params.roomId as string;

  const { 
    data: company, 
    isLoading: companyLoading,
  } = useGetCompanyBySlugQuery(companySlug, {
    skip: !companySlug,
  });
  
  const { 
    data: room, 
    isLoading: roomLoading,
    isError: roomError,
  } = useGetRoomDetailsQuery(
    { companySlug, branchSlug, roomId },
    { skip: !companySlug || !branchSlug || !roomId }
  );

  const [selectedImageIndex, setSelectedImageIndex] = useState(0);

  const handleBookNow = () => {
    router.push(`/${companySlug}/${branchSlug}/book?roomId=${roomId}`);
  };

  if (companyLoading || roomLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading room details...</p>
        </div>
      </div>
    );
  }

  if (roomError || !room || !company) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 dark:text-red-400">Room not found.</p>
          <Link href={`/${companySlug}/${branchSlug}/rooms`}>
            <Button className="mt-4">Back to Rooms</Button>
          </Link>
        </div>
      </div>
    );
  }

  const images = room.images && room.images.length > 0 ? room.images : [];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <Link 
                href={`/${companySlug}/${branchSlug}/rooms`}
                className="text-primary-600 hover:text-primary-700 text-sm mb-2 inline-block"
              >
                ← Back to Rooms
              </Link>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                Room {room.roomNumber}
              </h1>
              <p className="mt-1 text-gray-600 dark:text-gray-400 capitalize">
                {room.roomType} Room • {formatCurrency(room.basePrice)}/night
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2">
            {/* Image Gallery */}
            {images.length > 0 ? (
              <div className="mb-6">
                <div className="relative h-96 bg-gray-200 dark:bg-gray-700 rounded-lg overflow-hidden mb-4">
                  <img
                    src={images[selectedImageIndex]}
                    alt={`Room ${room.roomNumber} - Image ${selectedImageIndex + 1}`}
                    className="w-full h-full object-cover"
                  />
                </div>
                {images.length > 1 && (
                  <div className="grid grid-cols-4 gap-2">
                    {images.map((image, idx) => (
                      <button
                        key={idx}
                        onClick={() => setSelectedImageIndex(idx)}
                        className={`relative h-20 rounded overflow-hidden border-2 ${
                          selectedImageIndex === idx
                            ? 'border-primary-600'
                            : 'border-transparent'
                        }`}
                      >
                        <img
                          src={image}
                          alt={`Thumbnail ${idx + 1}`}
                          className="w-full h-full object-cover"
                        />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="relative h-96 bg-gray-200 dark:bg-gray-700 rounded-lg overflow-hidden mb-6 flex items-center justify-center">
                <MapPinIcon className="h-24 w-24 text-gray-400" />
              </div>
            )}

            {/* Description */}
            <Card className="mb-6">
              <CardContent className="p-6">
                <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
                  About This Room
                </h2>
                {room.description ? (
                  <p className="text-gray-600 dark:text-gray-400 whitespace-pre-line">
                    {room.description}
                  </p>
                ) : (
                  <p className="text-gray-600 dark:text-gray-400">
                    A comfortable {room.roomType} room perfect for your stay.
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Amenities */}
            {room.amenities && room.amenities.length > 0 && (
              <Card>
                <CardContent className="p-6">
                  <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
                    Amenities
                  </h2>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {room.amenities.map((amenity, idx) => (
                      <div
                        key={idx}
                        className="flex items-center text-gray-700 dark:text-gray-300"
                      >
                        <span className="w-2 h-2 bg-primary-600 rounded-full mr-2"></span>
                        {amenity}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Booking Sidebar */}
          <div className="lg:col-span-1">
            <Card className="sticky top-4">
              <CardContent className="p-6">
                <div className="text-center mb-6">
                  <div className="text-3xl font-bold text-primary-600 mb-2">
                    {formatCurrency(room.basePrice)}
                  </div>
                  <div className="text-gray-600 dark:text-gray-400">per night</div>
                </div>

                <div className="space-y-4 mb-6">
                  <div className="flex items-center text-gray-700 dark:text-gray-300">
                    <UserGroupIcon className="h-5 w-5 mr-2 text-gray-400" />
                    <span>Max {room.maxOccupancy} guests</span>
                  </div>
                  {room.size && (
                    <div className="flex items-center text-gray-700 dark:text-gray-300">
                      <MapPinIcon className="h-5 w-5 mr-2 text-gray-400" />
                      <span>{room.size}</span>
                    </div>
                  )}
                  {room.view && (
                    <div className="flex items-center text-gray-700 dark:text-gray-300">
                      <MapPinIcon className="h-5 w-5 mr-2 text-gray-400" />
                      <span>{room.view} view</span>
                    </div>
                  )}
                  {room.floor && (
                    <div className="flex items-center text-gray-700 dark:text-gray-300">
                      <span className="text-gray-400 mr-2">Floor:</span>
                      <span>{room.floor}</span>
                    </div>
                  )}
                  {room.building && (
                    <div className="flex items-center text-gray-700 dark:text-gray-300">
                      <span className="text-gray-400 mr-2">Building:</span>
                      <span>{room.building}</span>
                    </div>
                  )}
                  {room.smokingAllowed !== undefined && (
                    <div className="flex items-center text-gray-700 dark:text-gray-300">
                      <span className="text-gray-400 mr-2">Smoking:</span>
                      <span>{room.smokingAllowed ? 'Allowed' : 'Not Allowed'}</span>
                    </div>
                  )}
                </div>

                <Button
                  onClick={handleBookNow}
                  className="w-full"
                  size="lg"
                >
                  Book Now
                </Button>

                <p className="text-xs text-gray-500 dark:text-gray-400 text-center mt-4">
                  You'll be able to select dates and provide guest information on the next page
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

