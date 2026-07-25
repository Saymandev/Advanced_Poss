'use client';

import { XMarkIcon } from '@heroicons/react/24/outline';
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/lib/utils';

interface VideoModalProps {
  isOpen: boolean;
  onClose: () => void;
  videoUrl?: string; // Optional custom URL
  videoTitle?: string;
  videoDescription?: string;
}

export function VideoModal({ isOpen, onClose, videoUrl, videoTitle, videoDescription }: VideoModalProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!isOpen || !mounted) return null;

  // Helper function to handle Google Drive and YouTube URLs automatically
  const getEmbedUrl = (url: string) => {
    // Handle Google Drive
    if (url.includes('drive.google.com/file/d/')) {
      const match = url.match(/file\/d\/([a-zA-Z0-9_-]+)/);
      if (match && match[1]) {
        return `https://drive.google.com/file/d/${match[1]}/preview`;
      }
    }
    
    // Handle YouTube (Watch links, short links, and playlists)
    if (url.includes('youtube.com/') || url.includes('youtu.be/')) {
      // Check if it's a playlist
      if (url.includes('list=')) {
        const listMatch = url.match(/[?&]list=([a-zA-Z0-9_-]+)/);
        if (listMatch && listMatch[1]) {
          return `https://www.youtube.com/embed/videoseries?list=${listMatch[1]}&autoplay=1`;
        }
      }
      
      // Check for standard watch link or short link
      const videoMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/);
      if (videoMatch && videoMatch[1]) {
        return `https://www.youtube.com/embed/${videoMatch[1]}?autoplay=1`;
      }
    }

    return url;
  };

  const defaultPlaceholder = 'https://www.youtube.com/embed/dQw4w9WgXcQ?autoplay=1&mute=1';
  const embedUrl = getEmbedUrl(videoUrl || defaultPlaceholder);

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
            {embedUrl.endsWith('.mp4') || embedUrl.endsWith('.webm') || embedUrl.startsWith('/') ? (
              <video
                className="absolute inset-0 w-full h-full"
                src={embedUrl}
                controls
                autoPlay
                playsInline
              />
            ) : (
              <iframe
                className="absolute inset-0 w-full h-full"
                src={embedUrl}
                title="Product Demo"
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              ></iframe>
            )}
          </div>
          
          {/* Title and Description */}
          {(videoTitle || videoDescription) && (
            <div className="p-6 bg-black/95 border-t border-white/10">
              {videoTitle && <h3 className="text-xl font-bold text-white mb-2">{videoTitle}</h3>}
              {videoDescription && <p className="text-gray-300 text-sm leading-relaxed">{videoDescription}</p>}
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
