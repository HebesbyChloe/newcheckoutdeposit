'use client';

import { memo, useEffect, useRef, useState, useMemo, useCallback } from 'react';
import { Video } from '@/types/product';
import { Play } from 'lucide-react';

interface ProductGalleryVideoProps {
  video: Video;
  className?: string;
  onPlay?: () => void;
  onPause?: () => void;
}

function ProductGalleryVideo({
  video,
  className = '',
  onPlay,
  onPause,
}: ProductGalleryVideoProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [hasStarted, setHasStarted] = useState(false);
  const [hasError, setHasError] = useState(false);

  // Find the best video source (prefer mp4)
  const videoSource = useMemo(() => {
    if (!video?.sources || video.sources.length === 0) {
      return null;
    }
    return video.sources.find((source) => source.mimeType?.includes('mp4')) || video.sources[0];
  }, [video?.sources]);

  // Handle video play events
  const handlePlay = useCallback(() => {
    onPlay?.();
  }, [onPlay]);

  // Handle video pause events
  const handlePause = useCallback(() => {
    onPause?.();
  }, [onPause]);

  // Handle video errors
  const handleError = useCallback(() => {
    setHasError(true);
  }, [videoSource?.url]);

  // Handle video loaded data
  const handleLoadedData = useCallback(() => {
    setHasError(false);
  }, []);

  // Intersection Observer and event listeners
  useEffect(() => {
    const videoElement = videoRef.current;
    const containerElement = containerRef.current;

    if (!videoElement || !containerElement) return;

    // Intersection Observer to handle autoplay on scroll
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && entry.intersectionRatio >= 0.5) {
            // Video is 50% visible, start playing
            if (!hasStarted) {
              videoElement.play().catch((error) => {
              });
              setHasStarted(true);
            } else if (videoElement.paused) {
              videoElement.play().catch((error) => {
              });
            }
          } else {
            // Video is not visible enough, pause it
            if (!videoElement.paused) {
              videoElement.pause();
            }
          }
        });
      },
      {
        threshold: 0.5, // Trigger when 50% visible
      }
    );

    observer.observe(containerElement);

    // Add event listeners
    videoElement.addEventListener('play', handlePlay);
    videoElement.addEventListener('pause', handlePause);
    videoElement.addEventListener('error', handleError);
    videoElement.addEventListener('loadeddata', handleLoadedData);

    return () => {
      observer.disconnect();
      videoElement.removeEventListener('play', handlePlay);
      videoElement.removeEventListener('pause', handlePause);
      videoElement.removeEventListener('error', handleError);
      videoElement.removeEventListener('loadeddata', handleLoadedData);
    };
  }, [hasStarted, handlePlay, handlePause, handleError, handleLoadedData]);

  if (!videoSource) {
    return (
      <div className={`flex items-center justify-center bg-gray-100 ${className}`}>
        <div className="text-center p-4">
          <p className="text-sm text-gray-600">No video source available</p>
        </div>
      </div>
    );
  }

  if (hasError) {
    return (
      <div className={`flex items-center justify-center bg-gray-100 ${className}`}>
        <div className="text-center p-4">
          <p className="text-sm text-gray-600">Unable to load video</p>
          <p className="text-xs text-gray-500 mt-1">Please check the video source</p>
        </div>
      </div>
    );
  }

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <video
        ref={videoRef}
        src={videoSource.url}
        muted
        loop
        controls
        playsInline
        className="w-full h-full object-cover"
        preload="metadata"
      />
      {!hasStarted && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/20 pointer-events-none">
          <div className="bg-white/90 rounded-full p-4 pointer-events-auto cursor-pointer hover:bg-white transition-colors"
               onClick={() => videoRef.current?.play()}>
            <Play className="h-8 w-8 text-[#3d6373]" fill="currentColor" />
          </div>
        </div>
      )}
    </div>
  );
}

export default memo(ProductGalleryVideo);