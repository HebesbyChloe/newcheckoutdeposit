import { useState, useCallback } from 'react';
import { Media } from '@/types/product';

export interface UseMediaGalleryReturn {
  selectedMedia: Media | null;
  selectedIndex: number;
  selectMedia: (index: number) => void;
}

export function useMediaGallery(media: Media[], initialIndex: number = 0): UseMediaGalleryReturn {
  const [selectedIndex, setSelectedIndex] = useState(initialIndex);
  
  const selectMedia = useCallback((index: number) => {
    if (index >= 0 && index < media.length) {
      setSelectedIndex(index);
    }
  }, [media.length]);
  
  return {
    selectedMedia: media[selectedIndex] || null,
    selectedIndex,
    selectMedia,
  };
}

