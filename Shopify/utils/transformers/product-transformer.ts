import { Product, Media } from '@/types/product';

export function getProductMedia(product: Product): Media[] {
  const media: Media[] = [];
  
  // Get images from media field
  if (product.media?.edges) {
    product.media.edges.forEach(edge => {
      if (edge.node) {
        media.push(edge.node);
      }
    });
  }
  
  // Fallback to images field
  if (media.length === 0 && product.images?.edges) {
    product.images.edges.forEach(edge => {
      if (edge.node) {
        media.push({
          mediaContentType: 'IMAGE',
          image: edge.node,
        });
      }
    });
  }
  
  return media;
}

export function isVideo(media: Media | null | undefined): boolean {
  return (media?.mediaContentType === 'VIDEO') || (media !== null && media !== undefined && 'sources' in media && media.sources !== undefined) || false;
}

