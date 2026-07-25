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
          className="fixed inset-0 bg-black/90 backdrop-blur-md transition-all duration-500"
          onClick={onClose}
        />
        
        <div
          className={cn(
            "relative transform overflow-hidden rounded-2xl bg-black/90 text-left align-middle shadow-[0_0_80px_rgba(0,0,0,0.8)] border border-white/10 backdrop-blur-xl transition-all sm:my-8 w-full animate-scale-in flex flex-col md:flex-row",
            hasPlaylist ? "max-w-6xl" : "max-w-5xl"
          )}
        >
          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 z-30 rounded-full bg-black/40 p-2 text-white/70 hover:text-white hover:bg-white/20 hover:scale-105 backdrop-blur-md border border-white/10 transition-all duration-300"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>

          {/* Main Video Area */}
          <div className={cn("flex flex-col relative z-10", hasPlaylist ? "w-full md:w-2/3 lg:w-3/4 shadow-2xl" : "w-full")}>
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
              <div className="p-6 md:p-8 bg-gradient-to-b from-black/60 to-black/95 backdrop-blur-md">
                {activeTitle && <h3 className="text-xl md:text-2xl font-bold text-white mb-2 tracking-tight">{activeTitle}</h3>}
                {activeDesc && <p className="text-gray-300 text-sm md:text-base leading-relaxed max-w-3xl">{activeDesc}</p>}
              </div>
            )}
          </div>

          {/* Playlist Sidebar */}
          {hasPlaylist && (
            <div className="w-full md:w-1/3 lg:w-1/4 bg-gray-900/50 backdrop-blur-lg border-t md:border-t-0 md:border-l border-white/10 relative z-0">
              <div className="md:absolute md:inset-0 overflow-y-auto flex flex-col h-64 md:h-full [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:bg-white/10 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-white/20">
                
                <div className="p-5 border-b border-white/10 bg-black/40 backdrop-blur-xl sticky top-0 z-20 shrink-0 flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-primary-500 animate-pulse"></div>
                  <h4 className="text-white font-semibold tracking-wide">Playlist</h4>
                  <span className="ml-auto text-xs font-medium text-gray-400 bg-white/10 px-2.5 py-1 rounded-full border border-white/5">
                    {activeVideoIndex + 1} / {videos.length}
                  </span>
                </div>
                
                <div className="flex flex-col p-3 gap-2">
                  {videos.map((vid, idx) => {
                    const isActive = activeVideoIndex === idx;
                    return (
                      <button
                        key={idx}
                        onClick={() => setActiveVideoIndex(idx)}
                        className={cn(
                          "text-left p-4 rounded-xl transition-all duration-300 flex items-start gap-4 group relative overflow-hidden",
                          isActive 
                            ? "bg-primary-900/20 border border-primary-500/50 shadow-[0_0_20px_rgba(168,85,247,0.1)]" 
                            : "bg-transparent border border-transparent hover:bg-white/5 hover:border-white/10"
                        )}
                      >
                        {/* Playing Indicator */}
                        <div className={cn(
                          "shrink-0 mt-0.5 rounded-full flex items-center justify-center transition-all duration-300",
                          isActive ? "w-8 h-8 bg-primary-500/20 text-primary-400" : "w-8 h-8 bg-white/5 text-gray-500 group-hover:bg-white/10 group-hover:text-white"
                        )}>
                          {isActive ? (
                            <div className="w-2 h-2 rounded-full bg-primary-400 animate-pulse"></div>
                          ) : (
                            <div className="w-1.5 h-1.5 rounded-full bg-gray-500 group-hover:bg-white transition-colors"></div>
                          )}
                        </div>
                        
                        <div className="flex flex-col gap-1.5">
                          <span className={cn(
                            "font-medium text-sm transition-colors duration-300 line-clamp-2 leading-snug", 
                            isActive ? "text-white" : "text-gray-400 group-hover:text-gray-200"
                          )}>
                            {vid.title || `Demo Video ${idx + 1}`}
                          </span>
                          {vid.description && (
                            <span className={cn(
                              "text-xs transition-colors duration-300 line-clamp-2 leading-relaxed",
                              isActive ? "text-gray-300" : "text-gray-500 group-hover:text-gray-400"
                            )}>
                              {vid.description}
                            </span>
                          )}
                        </div>

                        {isActive && (
                          <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary-500 rounded-l-xl shadow-[0_0_10px_rgba(168,85,247,0.8)]"></div>
                        )}
                      </button>
                    );
                  })}
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
