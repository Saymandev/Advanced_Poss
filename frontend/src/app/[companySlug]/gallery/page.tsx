'use client';

/* eslint-disable @next/next/no-img-element */

import { Card } from '@/components/ui/Card';
import { useGetCompanyGalleryQuery } from '@/lib/api/endpoints/publicApi';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useState } from 'react';

export default function GalleryPage() {
  const params = useParams();
  const companySlug = params.companySlug as string;
  const { data: gallery = [], isLoading } = useGetCompanyGalleryQuery(companySlug);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <h1 className="text-3xl font-bold text-gray-900">Gallery</h1>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {gallery.length === 0 ? (
          <Card>
            <div className="p-12 text-center">
              <div className="text-6xl mb-4">📸</div>
              <p className="text-gray-600">No gallery images available yet.</p>
            </div>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {gallery.map((item: any, index: number) => (
              <div
                key={index}
                className="aspect-square bg-gray-100 rounded-lg overflow-hidden cursor-pointer hover:opacity-90 transition-opacity"
                onClick={() => setSelectedImage(item.url || item)}
              >
                <img
                  src={item.url || item}
                  alt={item.caption || `Gallery image ${index + 1}`}
                  className="w-full h-full object-cover"
                />
              </div>
            ))}
          </div>
        )}

        {selectedImage && (
          <div
            className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4"
            onClick={() => setSelectedImage(null)}
          >
            <div className="max-w-4xl w-full">
              <img
                src={selectedImage}
                alt="Selected"
                className="w-full h-auto rounded-lg"
              />
            </div>
          </div>
        )}

        <div className="mt-8 text-center">
          <Link href={`/${companySlug}`}>
            <button className="text-blue-600 hover:underline">← Back to Home</button>
          </Link>
        </div>
      </main>
    </div>
  );
}

