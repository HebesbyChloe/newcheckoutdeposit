import ProductPageLoading from '@/components/ui/ProductPageLoading';

export default function Loading() {
  return (
    <ProductPageLoading
      title="Loading jewelry collection..."
      subtitle="Please wait while we fetch the latest pieces"
      showViewToggle={false}
      accordionItemsCount={3}
    />
  );
}

