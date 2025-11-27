'use client';

/* eslint-disable @next/next/no-img-element */

import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { useGetCompanyBySlugQuery, useGetCompanyGalleryQuery } from '@/lib/api/endpoints/publicApi';
import { ExclamationTriangleIcon, XMarkIcon } from '@heroicons/react/24/outline';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';

export default function GalleryPage() {
  const params = useParams();
  const router = useRouter();
  const companySlug = params.companySlug as string;
  
  const { 
    data: company, 
    isLoading: companyLoading,
    isError: companyError,
    error: companyErrorData 
  } = useGetCompanyBySlugQuery(companySlug, {
    skip: !companySlug,
  });
  
  const { 
    data: gallery = [], 
    isLoading: galleryLoading,
    isError: galleryError,
    error: galleryErrorData 
  } = useGetCompanyGalleryQuery(companySlug, {
    skip: !companySlug || !company,
  });
  
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  useEffect(() => {
    if (companyError) {
      const errorMessage = (companyErrorData as any)?.data?.message || 'Failed to load company information';
      toast.error(errorMessage);
    }
    if (galleryError) {
      const errorMessage = (galleryErrorData as any)?.data?.message || 'Failed to load gallery';
      toast.error(errorMessage);
    }
  }, [companyError, galleryError, companyErrorData, galleryErrorData]);

  // Close lightbox on Escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setSelectedImage(null);
      }
    };
    if (selectedImage) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [selectedImage]);

  if (companyLoading || galleryLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading gallery...</p>
        </div>
      </div>
    );
  }

  if (companyError || !company) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4">
        <Card className="max-w-md w-full">
          <CardContent className="p-8 text-center">
            <ExclamationTriangleIcon className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Company Not Found</h1>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              The restaurant you're looking for doesn't exist or may have been removed.
            </p>
            <Button onClick={() => router.push('/')}>
              Go to Homepage
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <header className="bg-white dark:bg-gray-800 shadow-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 md:py-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">Gallery</h1>
              <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 mt-1">
                {company.name} Photo Gallery
              </p>
            </div>
            <nav className="flex gap-2 sm:gap-4">
              <Link href={`/${companySlug}`}>
                <Button variant="ghost" size="sm">Home</Button>
              </Link>
              <Link href={`/${companySlug}/about`}>
                <Button variant="ghost" size="sm">About</Button>
              </Link>
              <Link href={`/${companySlug}/contact`}>
                <Button variant="ghost" size="sm">Contact</Button>
              </Link>
            </nav>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
        {galleryError ? (
          <Card>
            <CardContent className="p-6 md:p-12 text-center">
              <ExclamationTriangleIcon className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                Unable to load gallery. Please try again later.
              </p>
              <Button onClick={() => window.location.reload()}>
                Retry
              </Button>
            </CardContent>
          </Card>
        ) : gallery.length === 0 ? (
          <Card>
            <CardContent className="p-6 md:p-12 text-center">
              <div className="text-6xl mb-4">📸</div>
              <p className="text-gray-600 dark:text-gray-400">No gallery images available yet.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
            {gallery.map((item: any, index: number) => {
              const imageUrl = item.url || item;
              const imageCaption = item.caption || `Gallery image ${index + 1}`;
              
              return (
                <div
                  key={index}
                  className="aspect-square bg-gray-100 dark:bg-gray-800 rounded-lg overflow-hidden cursor-pointer hover:opacity-90 transition-all duration-200 hover:scale-[1.02] group relative"
                  onClick={() => setSelectedImage(imageUrl)}
                >
                  <img
                    src={imageUrl}
                    alt={imageCaption}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                      const parent = (e.target as HTMLImageElement).parentElement;
                      if (parent) {
                        parent.innerHTML = '<div class="w-full h-full flex items-center justify-center text-gray-400 text-4xl">📷</div>';
                      }
                    }}
                    loading="lazy"
                  />
                  {item.caption && (
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-3 opacity-0 group-hover:opacity-100 transition-opacity">
                      <p className="text-white text-sm truncate">{item.caption}</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Lightbox Modal */}
        {selectedImage && (
          <div
            className="fixed inset-0 bg-black bg-opacity-90 dark:bg-opacity-95 flex items-center justify-center z-50 p-4"
            onClick={() => setSelectedImage(null)}
          >
            <button
              onClick={() => setSelectedImage(null)}
              className="absolute top-4 right-4 text-white hover:text-gray-300 transition-colors z-10"
              aria-label="Close"
            >
              <XMarkIcon className="w-8 h-8" />
            </button>
            <div className="max-w-5xl w-full max-h-[90vh] flex items-center justify-center">
              <img
                src={selectedImage}
                alt="Selected gallery image"
                className="max-w-full max-h-[90vh] object-contain rounded-lg"
                onClick={(e) => e.stopPropagation()}
              />
            </div>
          </div>
        )}

        <div className="mt-6 md:mt-8 text-center">
          <Link href={`/${companySlug}`}>
            <Button variant="ghost">
              ← Back to Home
            </Button>
          </Link>
        </div>
      </main>
    </div>
  );
}


