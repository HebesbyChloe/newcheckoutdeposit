import ProductPageLoading from '@/components/ui/ProductPageLoading';

export default function Loading() {
  return (
    <ProductPageLoading
      title="Loading loose diamonds..."
      subtitle="Please wait while we fetch the latest diamonds"
      showViewToggle={true}
      accordionItemsCount={4}
    />
  );
}

