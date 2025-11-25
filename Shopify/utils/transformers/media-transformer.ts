// Media transformation utilities
import { Media, MediaImage, Video } from '@/types/product';

/**
 * Get video source URL (prefer mp4)
 */
export function getVideoSource(video: Video): { url: string; mimeType: string } | null {
  if (!video.sources || video.sources.length === 0) return null;

  // Prefer mp4
  const mp4Source = video.sources.find((source) => source.mimeType.includes('mp4'));
  return mp4Source || video.sources[0] || null;
}

/**
 * Get video preview image URL (not available in Storefront API)
 * Returns null as Storefront API doesn't provide video preview images
 */
export function getVideoPreviewUrl(video: Video): string | null {
  // Storefront API doesn't provide preview images for videos
  return null;
}

/**
 * Get media preview/thumbnail URL
 */
export function getMediaPreviewUrl(media: Media): string | null {
  if (media.mediaContentType === 'VIDEO') {
    // Videos don't have preview images in Storefront API
    return null;
  }
  return media.image.url;
}

/**
 * Get media alt text
 */
export function getMediaAltText(media: Media): string | null {
  if (media.mediaContentType === 'VIDEO') {
    // Videos don't have alt text in Storefront API
    return null;
  }
  return media.image.altText;
}

