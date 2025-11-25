'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Separator } from '@/components/ui/separator';
import {
  Truck,
  ShieldCheck,
  Diamond as DiamondIcon,
  PlayCircle,
  FileText,
  Heart,
  MessageCircle,
  ExternalLink,
  Share2,
} from 'lucide-react';
import { cn } from '@/utils/cn';
import type { DiamondDetailData } from '@/types/external-cart.types';

export interface DiamondDetailProps {
  diamond: DiamondDetailData;
  onAddToCart?: () => void | Promise<void>;
  /**
   * Optional loading flag to reflect add-to-cart in progress.
   */
  addingToCart?: boolean;
  onInquire?: () => void;
  onToggleWishlist?: () => void;
}

export function DiamondDetail({
  diamond,
  onAddToCart,
  addingToCart,
  onInquire,
  onToggleWishlist,
}: DiamondDetailProps) {
  const [activeMedia, setActiveMedia] = useState<'image' | 'video'>('image');

  const hasVideo = !!diamond.video;
  const primaryImage = diamond.images?.[0];

  const handleShare = () => {
    const shareUrl =
      typeof window !== 'undefined' ? window.location.href : undefined;
    const text = `Check out this diamond: ${diamond.title}`;

    if (navigator.share && shareUrl) {
      navigator
        .share({
          title: diamond.title,
          text,
          url: shareUrl,
        })
        .catch(() => {
          // ignore cancellation
        });
      return;
    }

    if (shareUrl && navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(shareUrl).catch(() => {
        // ignore clipboard failures
      });
    }
  };

  const priceFormatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 2,
  });

  const displayPrice = priceFormatter.format(diamond.price || 0);

  const specs = diamond.specs || {};

  return (
    <div className="bg-background min-h-screen pb-20">
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 lg:py-12">
        {/* Breadcrumbs */}
        <nav
          className="mb-8 flex text-sm text-muted-foreground"
          aria-label="Breadcrumb"
        >
          <ol className="flex items-center space-x-2">
            <li>
              <a
                href="/"
                className="transition-colors hover:text-foreground"
              >
                Home
              </a>
            </li>
            <li>/</li>
            <li>
              <a
                href="/diamonds-external"
                className="transition-colors hover:text-foreground"
              >
                Diamonds
              </a>
            </li>
            <li>/</li>
            <li>
              <span className="font-medium text-foreground">
                {diamond.shape || 'Diamond'}
              </span>
            </li>
          </ol>
        </nav>

        <div className="grid grid-cols-1 gap-12 lg:grid-cols-12">
          {/* Left Column: Gallery */}
          <div className="space-y-6 lg:col-span-7">
            <div className="relative aspect-square w-full overflow-hidden rounded-lg border border-border bg-secondary/10">
              {activeMedia === 'image' || !hasVideo ? (
                primaryImage ? (
                  <img
                    src={primaryImage}
                    alt={diamond.title}
                    className="h-full w-full object-contain p-8"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-muted">
                    <span className="text-sm text-muted-foreground">
                      No image available
                    </span>
                  </div>
                )
              ) : (
                <div className="relative h-full w-full bg-black">
                  <iframe
                    src={diamond.video}
                    className="absolute inset-0 h-full w-full"
                    style={{ border: 0 }}
                    allowFullScreen
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    title="Diamond Video"
                  />
                  {diamond.video && (
                    <a
                      href={diamond.video}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="absolute right-2 top-2 z-10 flex items-center gap-1 rounded bg-black/60 px-2 py-1 text-xs text-white backdrop-blur-sm transition-colors hover:bg-black/80"
                    >
                      <ExternalLink className="h-3 w-3" />
                      Open New Tab
                    </a>
                  )}
                </div>
              )}

              {/* Media Toggles */}
              <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 gap-2 rounded-full border border-border bg-white/90 p-1.5 shadow-sm backdrop-blur">
                <button
                  type="button"
                  onClick={() => setActiveMedia('image')}
                  className={cn(
                    'rounded-full p-2 transition-all',
                    activeMedia === 'image' || !hasVideo
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:bg-secondary',
                  )}
                  aria-label="Show image"
                >
                  <DiamondIcon className="h-5 w-5" />
                </button>
                {hasVideo && (
                  <button
                    type="button"
                    onClick={() => setActiveMedia('video')}
                    className={cn(
                      'rounded-full p-2 transition-all',
                      activeMedia === 'video'
                        ? 'bg-primary text-primary-foreground'
                        : 'text-muted-foreground hover:bg-secondary',
                    )}
                    aria-label="Show video"
                  >
                    <PlayCircle className="h-5 w-5" />
                  </button>
                )}
              </div>
            </div>

            <div className="flex items-center justify-center gap-4 text-sm text-muted-foreground">
              {diamond.lab && (
                <div className="flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4" />
                  <span>{diamond.lab} Certified</span>
                </div>
              )}
              <div className="h-1 w-1 rounded-full bg-muted-foreground/30" />
              <div className="flex items-center gap-2">
                <Truck className="h-4 w-4" />
                <span>Free Shipping</span>
                {diamond.countryCode && (
                  <Badge
                    variant="outline"
                    className="ml-1 h-5 px-1.5 text-[10px]"
                  >
                    {diamond.countryCode}
                  </Badge>
                )}
              </div>
            </div>
          </div>

          {/* Right Column: Product Details */}
          <div className="space-y-8 lg:col-span-5">
            {/* Header Info */}
            <div className="space-y-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h1 className="mb-2 text-3xl text-foreground lg:text-4xl">
                    {diamond.title}
                  </h1>
                  <p className="font-light text-muted-foreground">
                    SKU: {diamond.sku}
                  </p>
                </div>
              </div>

              <div className="flex items-baseline gap-4">
                <span className="text-3xl font-medium text-primary">
                  {displayPrice}
                </span>
              </div>
            </div>

            <Separator />

            {/* Key Specs Grid */}
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              {[
                { label: 'Carat', value: diamond.carat },
                { label: 'Color', value: diamond.color },
                { label: 'Clarity', value: diamond.clarity },
                { label: 'Cut', value: diamond.cut },
              ]
                .filter((spec) => spec.value !== undefined && spec.value !== '')
                .map((spec) => (
                  <div
                    key={spec.label}
                    className="rounded border border-border bg-secondary/20 p-3 text-center"
                  >
                    <p className="mb-1 text-xs uppercase tracking-wider text-muted-foreground">
                      {spec.label}
                    </p>
                    <p className="font-medium text-foreground">
                      {spec.value as string | number}
                    </p>
                  </div>
                ))}
            </div>

            {/* Actions */}
            <div className="space-y-4">
              <div className="flex gap-3">
                <Button
                  className="flex-1 h-12 text-base uppercase tracking-wide"
                  size="lg"
                  onClick={onAddToCart}
                  disabled={!onAddToCart || addingToCart}
                >
                  {addingToCart ? 'Adding…' : 'Add to Cart'}
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-12 w-12 border-border"
                  type="button"
                  onClick={onToggleWishlist}
                >
                  <Heart className="h-5 w-5" />
                </Button>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Button
                  variant="outline"
                  type="button"
                  className="border-border rounded-md hover:bg-muted"
                  onClick={handleShare}
                >
                  <Share2 className="mr-2 h-4 w-4" />
                  Share
                </Button>
                <Button
                  variant="outline"
                  type="button"
                  className="border-border rounded-md hover:bg-muted"
                  onClick={onInquire}
                >
                  <MessageCircle className="mr-2 h-4 w-4" />
                  Inquire
                </Button>
              </div>
            </div>

            <div className="rounded-md bg-muted/40 p-4 text-sm">
              <p className="flex items-center gap-2 text-foreground">
                <Truck className="h-4 w-4 text-primary" />
                <span>Order now, ships by</span>
                <span className="font-medium">
                  {diamond.shippingDate || 'within 5–7 business days'}
                </span>
              </p>
            </div>

            {/* Accordions */}
            <Accordion
              type="single"
              collapsible
              className="w-full"
              defaultValue="specs"
            >
              <AccordionItem value="specs">
                <AccordionTrigger className="text-base font-medium">
                  Product Specifications
                </AccordionTrigger>
                <AccordionContent>
                  <div className="grid grid-cols-2 gap-x-8 gap-y-4 py-2 text-sm">
                    {/* Top-level specs */}
                    <div>
                      <span className="mb-1 block text-muted-foreground">
                        Shape
                      </span>
                      <span className="font-medium">
                        {diamond.shape || 'N/A'}
                      </span>
                    </div>
                    <div>
                      <span className="mb-1 block text-muted-foreground">
                        Color
                      </span>
                      <span className="font-medium">
                        {diamond.color || 'N/A'}
                      </span>
                    </div>
                    <div>
                      <span className="mb-1 block text-muted-foreground">
                        Color Intensity
                      </span>
                      <span className="font-medium">
                        {diamond.intensity || 'N/A'}
                      </span>
                    </div>
                    <div>
                      <span className="mb-1 block text-muted-foreground">
                        Grade Report
                      </span>
                      {diamond.certificateUrl && diamond.certificateNumber ? (
                        <a
                          href={diamond.certificateUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center gap-1 font-medium text-primary hover:underline"
                        >
                          {(diamond.lab ? `${diamond.lab} ` : '') +
                            diamond.certificateNumber}
                          <FileText className="h-3 w-3" />
                        </a>
                      ) : (
                        <span className="font-medium">
                          {diamond.certificateNumber
                            ? (diamond.lab
                                ? `${diamond.lab} ${diamond.certificateNumber}`
                                : diamond.certificateNumber)
                            : 'N/A'}
                        </span>
                      )}
                    </div>

                    {/* Dimensions & Proportions */}
                    <div className="col-span-2 my-2">
                      <Separator className="my-2" />
                      <p className="mb-3 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                        Dimensions &amp; Proportions
                      </p>
                    </div>

                    <div>
                      <span className="mb-1 block text-muted-foreground">
                        Measurements
                      </span>
                      <span className="font-medium">
                        {specs.measurements || 'N/A'}
                      </span>
                    </div>
                    <div>
                      <span className="mb-1 block text-muted-foreground">
                        Table
                      </span>
                      <span className="font-medium">
                        {specs.table || 'N/A'}
                      </span>
                    </div>
                    <div>
                      <span className="mb-1 block text-muted-foreground">
                        Depth
                      </span>
                      <span className="font-medium">
                        {specs.depth || 'N/A'}
                      </span>
                    </div>
                    <div>
                      <span className="mb-1 block text-muted-foreground">
                        Culet
                      </span>
                      <span className="font-medium">
                        {specs.culet || 'N/A'}
                      </span>
                    </div>

                    {/* Finish & Grading */}
                    <div className="col-span-2 my-2">
                      <Separator className="my-2" />
                      <p className="mb-3 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                        Finish &amp; Grading
                      </p>
                    </div>

                    <div>
                      <span className="mb-1 block text-muted-foreground">
                        Polish
                      </span>
                      <span className="font-medium">
                        {specs.polish || 'N/A'}
                      </span>
                    </div>
                    <div>
                      <span className="mb-1 block text-muted-foreground">
                        Symmetry
                      </span>
                      <span className="font-medium">
                        {specs.symmetry || 'N/A'}
                      </span>
                    </div>
                    <div>
                      <span className="mb-1 block text-muted-foreground">
                        Fluorescence
                      </span>
                      <span className="font-medium">
                        {specs.fluorescence || 'N/A'}
                      </span>
                    </div>
                    <div>
                      <span className="mb-1 block text-muted-foreground">
                        Eye Clean
                      </span>
                      <span className="font-medium">
                        {specs.eyeClean || 'N/A'}
                      </span>
                    </div>

                    {/* Angles & Heights */}
                    <div className="col-span-2 my-2">
                      <Separator className="my-2" />
                      <p className="mb-3 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                        Angles &amp; Heights
                      </p>
                    </div>

                    <div>
                      <span className="mb-1 block text-muted-foreground">
                        Crown Angle
                      </span>
                      <span className="font-medium">
                        {specs.crownAngle || 'N/A'}
                      </span>
                    </div>
                    <div>
                      <span className="mb-1 block text-muted-foreground">
                        Crown Height
                      </span>
                      <span className="font-medium">
                        {specs.crownHeight || 'N/A'}
                      </span>
                    </div>
                    <div>
                      <span className="mb-1 block text-muted-foreground">
                        Pavilion Angle
                      </span>
                      <span className="font-medium">
                        {specs.pavilionAngle || 'N/A'}
                      </span>
                    </div>
                    <div>
                      <span className="mb-1 block text-muted-foreground">
                        Pavilion Depth
                      </span>
                      <span className="font-medium">
                        {specs.pavilionDepth || 'N/A'}
                      </span>
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="shipping">
                <AccordionTrigger className="text-base font-medium">
                  Shipping &amp; Returns
                </AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-3 text-sm text-muted-foreground">
                    <p>
                      Free fully insured shipping via FedEx Overnight. Adult
                      signature required for delivery.
                    </p>
                    <p>
                      30-day return policy. If you are not satisfied with your
                      purchase, you can return it within 30 days for a full
                      refund or exchange.
                    </p>
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>
        </div>
      </main>
    </div>
  );
}

export default DiamondDetail;


