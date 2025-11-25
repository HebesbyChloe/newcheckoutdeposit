'use client';

import { memo, useState } from 'react';

interface ExternalVideo360Props {
  videoUrl: string;
  className?: string;
  autoplay?: boolean;
  loop?: boolean;
  muted?: boolean;
  controls?: boolean;
  onPlay?: () => void;
  onPause?: () => void;
}

function ExternalVideo360({
  videoUrl,
  className = '',
  autoplay = false,
  loop = true,
  muted = true,
  controls = true,
  onPlay,
  onPause,
}: ExternalVideo360Props) {
  const [hasError, setHasError] = useState(false);

  if (!videoUrl) {
    return null;
  }

  // Check if URL is an HTML file (like Vision360.html) or a video file
  const isHtmlFile = videoUrl.toLowerCase().endsWith('.html') || 
                     videoUrl.toLowerCase().includes('.html?') ||
                     videoUrl.toLowerCase().includes('/viewer/') ||
                     videoUrl.toLowerCase().includes('vision360');

  // If it's an HTML file, use iframe; otherwise use video tag
  if (isHtmlFile) {
    return (
      <div className={`relative ${className}`}>
        <iframe
          src={videoUrl}
          className="w-full h-full border-0"
          allow="autoplay; fullscreen; vr"
          allowFullScreen
          onError={() => setHasError(true)}
          onLoad={() => {
            setHasError(false);
            onPlay?.();
          }}
        />
        {hasError && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
            <div className="text-center p-4">
              <p className="text-sm text-gray-600">Unable to load 360 viewer</p>
              <p className="text-xs text-gray-500 mt-1">Please check the URL</p>
            </div>
          </div>
        )}
      </div>
    );
  }

  // For actual video files, use video tag
  return (
    <div className={`relative ${className}`}>
      <video
        src={videoUrl}
        autoPlay={autoplay}
        loop={loop}
        muted={muted}
        controls={controls}
        playsInline
        className="w-full h-full object-cover"
        preload="metadata"
        onError={() => setHasError(true)}
        onLoadedData={() => {
          setHasError(false);
          onPlay?.();
        }}
        onPause={() => onPause?.()}
      />
      {hasError && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
          <div className="text-center p-4">
            <p className="text-sm text-gray-600">Unable to load video</p>
            <p className="text-xs text-gray-500 mt-1">Please check the video URL</p>
          </div>
        </div>
      )}
    </div>
  );
}

export default memo(ExternalVideo360);

