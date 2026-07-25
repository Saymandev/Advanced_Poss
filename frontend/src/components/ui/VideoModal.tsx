'use client';

import { XMarkIcon } from '@heroicons/react/24/outline';
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/lib/utils';

interface VideoModalProps {
  isOpen: boolean;
  onClose: () => void;
  videoUrl?: string; // Optional custom URL
}

export function VideoModal({ isOpen, onClose, videoUrl }: VideoModalProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!isOpen || !mounted) return null;

  const embedUrl = videoUrl || 'https://www.youtube.com/embed/dQw4w9WgXcQ?autoplay=1&mute=1';

  const modalContent = (
    <div className="fixed inset-0 overflow-y-auto animate-fade-in" style={{ zIndex: 9999 }}>
      <div className="flex min-h-full items-center justify-center p-4 text-center sm:p-0">
        <div
          className="fixed inset-0 bg-black/80 backdrop-blur-md transition-all duration-300"
          onClick={onClose}
        />
        
        <div
          className={cn(
            "relative transform overflow-hidden rounded-2xl bg-black text-left align-middle shadow-[0_0_50px_rgba(255,255,255,0.1)] border border-white/10 transition-all sm:my-8 w-full animate-scale-in",
            "max-w-5xl"
          )}
        >
          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 z-10 rounded-full bg-black/50 p-2 text-white/70 hover:text-white hover:bg-black/80 backdrop-blur-md transition-all duration-200"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>

          {/* Video Container (16:9 aspect ratio) */}
          <div className="relative w-full pt-[56.25%] bg-black">
            <iframe
              className="absolute inset-0 w-full h-full"
              src={embedUrl}
              title="Product Demo"
              frameBorder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            ></iframe>
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
