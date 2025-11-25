interface ProductPageLoadingProps {
  /**
   * Main loading title
   * @default "Loading collection..."
   */
  title?: string;
  /**
   * Subtitle/description text
   * @default "Please wait while we fetch the latest items"
   */
  subtitle?: string;
  /**
   * Show view toggle buttons skeleton (for pages with grid/table view)
   * @default false
   */
  showViewToggle?: boolean;
  /**
   * Number of accordion items in filter skeleton
   * @default 3
   */
  accordionItemsCount?: number;
}

/**
 * Reusable loading skeleton for product listing pages
 * Used by jewelry, diamonds, and other product category pages
 */
export default function ProductPageLoading({
  title = 'Loading collection...',
  subtitle = 'Please wait while we fetch the latest items',
  showViewToggle = false,
  accordionItemsCount = 3,
}: ProductPageLoadingProps) {
  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8 max-w-[1400px]">
      {/* Header Skeleton */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6 sm:mb-8">
        <div className="h-9 w-64 bg-gray-200 rounded animate-pulse" />
        {/* View toggle buttons skeleton */}
        {showViewToggle && (
          <div className="flex gap-2">
            <div className="h-10 w-10 bg-gray-200 rounded animate-pulse" />
            <div className="h-10 w-10 bg-gray-200 rounded animate-pulse" />
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 sm:gap-6 lg:gap-8">
        {/* Filter Sidebar Skeleton */}
        <div className="lg:col-span-1 order-2 lg:order-1">
          <div className="border border-border/50 shadow-lg bg-white rounded-lg p-4 space-y-4">
            {/* Collection buttons skeleton */}
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="h-8 bg-gray-200 rounded animate-pulse flex-1" />
              <div className="h-8 bg-gray-200 rounded animate-pulse flex-1" />
            </div>
            
            {/* Accordion items skeleton */}
            <div className="space-y-3">
              {Array.from({ length: accordionItemsCount }).map((_, i) => (
                <div key={i} className="h-12 bg-gray-200 rounded animate-pulse" />
              ))}
            </div>
          </div>
        </div>

        {/* Products Grid Skeleton */}
        <div className="lg:col-span-3 order-1 lg:order-2">
          <div className="flex flex-col items-center justify-center min-h-[400px] gap-6">
            {/* Spinner */}
            <div className="w-12 h-12 border-4 border-[#3d6373] border-t-transparent rounded-full animate-spin" />
            
            {/* Loading text */}
            <div className="flex flex-col items-center gap-2">
              <p className="text-[#667085] text-lg font-medium">{title}</p>
              <p className="text-[#667085] text-sm">{subtitle}</p>
            </div>

            {/* Product cards skeleton (optional, for better UX) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6 w-full mt-4">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="flex flex-col gap-3">
                  <div className="aspect-square bg-gray-200 rounded-lg animate-pulse" />
                  <div className="h-4 bg-gray-200 rounded animate-pulse w-3/4" />
                  <div className="h-4 bg-gray-200 rounded animate-pulse w-1/2" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

