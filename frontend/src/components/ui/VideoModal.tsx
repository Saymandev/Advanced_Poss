'use client';

import { XMarkIcon } from '@heroicons/react/24/outline';
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/lib/utils';

interface Video {
  url: string;
  title?: string;
  description?: string;
}

interface VideoModalProps {
  isOpen: boolean;
  onClose: () => void;
  videoUrl?: string; // Optional custom URL
  videoTitle?: string;
  videoDescription?: string;
  videos?: Video[];
}

export function VideoModal({ isOpen, onClose, videoUrl, videoTitle, videoDescription, videos = [] }: VideoModalProps) {
  const [mounted, setMounted] = useState(false);
  const [activeVideoIndex, setActiveVideoIndex] = useState(0);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (isOpen) {
      if (videoUrl && videos.length > 0) {
        const index = videos.findIndex(v => v.url === videoUrl);
        setActiveVideoIndex(index >= 0 ? index : 0);
      } else {
        setActiveVideoIndex(0);
      }
    }
  }, [isOpen, videoUrl, videos]);

  if (!isOpen || !mounted) return null;

  const currentVideo = videos.length > 0 ? videos[activeVideoIndex] : { url: videoUrl, title: videoTitle, description: videoDescription };
  const activeUrl = currentVideo?.url || videoUrl || '';
  const activeTitle = currentVideo?.title || videoTitle;
  const activeDesc = currentVideo?.description || videoDescription;

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
  const embedUrl = getEmbedUrl(activeUrl || defaultPlaceholder);
  const hasPlaylist = videos.length > 1;

  const modalContent = (
    <div className="fixed inset-0 overflow-y-auto animate-fade-in" style={{ zIndex: 9999 }}>
      <div className="flex min-h-full items-center justify-center p-4 text-center sm:p-0">
        <div
          className="fixed inset-0 bg-black/80 backdrop-blur-md transition-all duration-300"
          onClick={onClose}
        />
        
        <div
          className={cn(
            "relative transform overflow-hidden rounded-2xl bg-black text-left align-middle shadow-[0_0_50px_rgba(255,255,255,0.1)] border border-white/10 transition-all sm:my-8 w-full animate-scale-in flex flex-col md:flex-row",
            hasPlaylist ? "max-w-6xl" : "max-w-5xl"
          )}
        >
          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 z-20 rounded-full bg-black/50 p-2 text-white/70 hover:text-white hover:bg-black/80 backdrop-blur-md transition-all duration-200"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>

          {/* Main Video Area */}
          <div className={cn("flex flex-col bg-black", hasPlaylist ? "w-full md:w-2/3 lg:w-3/4" : "w-full")}>
            <div className="relative w-full pt-[56.25%] bg-black shrink-0">
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
            {(activeTitle || activeDesc) && (
              <div className="p-6 bg-black/95">
                {activeTitle && <h3 className="text-xl font-bold text-white mb-2">{activeTitle}</h3>}
                {activeDesc && <p className="text-gray-300 text-sm leading-relaxed">{activeDesc}</p>}
              </div>
            )}
          </div>

          {/* Playlist Sidebar */}
          {hasPlaylist && (
            <div className="w-full md:w-1/3 lg:w-1/4 bg-gray-900 border-t md:border-t-0 md:border-l border-white/10 relative">
              <div className="md:absolute md:inset-0 overflow-y-auto flex flex-col h-64 md:h-full">
                <div className="p-4 border-b border-white/10 bg-black sticky top-0 z-10 shrink-0">
                  <h4 className="text-white font-semibold">More Videos</h4>
                </div>
                <div className="flex flex-col p-2 gap-2">
                  {videos.map((vid, idx) => (
                    <button
                      key={idx}
                      onClick={() => setActiveVideoIndex(idx)}
                      className={cn(
                        "text-left p-3 rounded-xl transition-all flex flex-col gap-1",
                        activeVideoIndex === idx 
                          ? "bg-white/10 border border-white/20" 
                          : "hover:bg-white/5 border border-transparent"
                      )}
                    >
                      <span className={cn("font-medium text-sm line-clamp-2", activeVideoIndex === idx ? "text-white" : "text-gray-300")}>
                        {vid.title || `Demo Video ${idx + 1}`}
                      </span>
                      {vid.description && (
                        <span className="text-xs text-gray-500 line-clamp-2">
                          {vid.description}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
