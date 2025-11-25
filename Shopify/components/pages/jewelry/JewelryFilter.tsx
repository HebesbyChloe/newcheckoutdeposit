'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Info } from 'lucide-react';
import { useState } from 'react';
import * as React from 'react';
import { useSliderFilter } from '@/hooks/useSliderFilter';

interface JewelryFilterProps {
  filters: {
    collection?: string;
    category?: string;
    material?: string;
    minPrice?: number;
    maxPrice?: number;
    style?: string;
  };
  onFilterChange: (filters: any) => void;
  availableCollections?: Array<{id: string, title: string, handle: string}>;
}

const categories = ['Rings', 'Necklaces', 'Earrings', 'Bracelets', 'Pendants', 'Charms'];
const materials = ['Gold', 'Silver', 'Platinum', 'Rose Gold', 'White Gold', 'Yellow Gold'];
const styles = ['Classic', 'Modern', 'Vintage', 'Contemporary', 'Minimalist', 'Statement'];

export default function JewelryFilter({ filters, onFilterChange, availableCollections = [] }: JewelryFilterProps) {
  const [localFilters, setLocalFilters] = useState({
    collection: filters.collection || '',
    category: filters.category || '',
    material: filters.material || '',
    minPrice: filters.minPrice || 0,
    maxPrice: filters.maxPrice || 10000000, // High default to show all
    style: filters.style || '',
  });

  // Update local filters when props change
  React.useEffect(() => {
    setLocalFilters({
      collection: filters.collection || '',
      category: filters.category || '',
      material: filters.material || '',
      minPrice: filters.minPrice || 0,
      maxPrice: filters.maxPrice || 10000000,
      style: filters.style || '',
    });
  }, [filters]);

  const updateFilter = (key: string, value: any) => {
    const newFilters = { ...localFilters, [key]: value };
    setLocalFilters(newFilters);
    onFilterChange(newFilters);
  };

  // Memoize slider values to ensure proper updates
  const priceValue = React.useMemo(() => {
    const min = Math.max(0, Math.min(localFilters.minPrice, localFilters.maxPrice));
    const max = Math.min(10000000, Math.max(localFilters.minPrice, localFilters.maxPrice));
    return [min, max];
  }, [localFilters.minPrice, localFilters.maxPrice]);

  // Use slider filter hook for atomic updates
  const priceSlider = useSliderFilter({
    min: 0,
    max: 10000000,
    step: 1000,
    onValueChange: (min, max) => {
      const newFilters = { ...localFilters, minPrice: min, maxPrice: Math.min(max, 10000000) };
      setLocalFilters(newFilters);
      onFilterChange(newFilters);
    },
  });

  return (
    <Card className="border border-border/50 shadow-lg bg-white sticky top-4 sm:top-24 w-full z-10 max-h-[calc(100vh-6rem)] flex flex-col">
      <CardContent className="p-0 overflow-y-auto flex-1">
        {/* Collection Filter - Always visible, not collapsible */}
        <div className="px-3 sm:px-4 py-3 border-b border-border/30 w-full flex-shrink-0">
          {availableCollections.length > 0 ? (
            <div className="flex flex-col sm:flex-row gap-2 w-full">
              {availableCollections.map((collection) => (
                <Button
                  key={collection.id}
                  variant={localFilters.collection === collection.id || localFilters.collection === collection.handle ? 'default' : 'outline'}
                  onClick={() => {
                    const currentValue = localFilters.collection === collection.id || localFilters.collection === collection.handle;
                    // Use collection ID for filtering (most reliable)
                    updateFilter('collection', currentValue ? '' : collection.id);
                  }}
                  className={
                    (localFilters.collection === collection.id || localFilters.collection === collection.handle)
                      ? 'bg-[#3d6373] hover:bg-[#2d4d5a] text-white flex-1 min-w-0 text-[10px] sm:text-xs px-2 py-1.5'
                      : 'flex-1 min-w-0 text-[10px] sm:text-xs px-2 py-1.5'
                  }
                >
                  <span className="truncate block w-full">{collection.title}</span>
                </Button>
              ))}
            </div>
          ) : (
            <p className="text-xs text-[#667085]">Loading collections...</p>
          )}
        </div>

        <Accordion type="multiple" defaultValue={['category', 'price']} className="w-full">
          {/* Category Filter */}
          <AccordionItem value="category" className="border-b border-border/30">
            <AccordionTrigger className="px-3 sm:px-4 py-3 text-[#1d2939] font-medium text-sm">
              Category
            </AccordionTrigger>
            <AccordionContent className="px-3 sm:px-4 pb-3">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {categories.map((category) => (
                  <Button
                    key={category}
                    variant={localFilters.category === category ? 'default' : 'outline'}
                    onClick={() => updateFilter('category', localFilters.category === category ? '' : category)}
                    className={
                      localFilters.category === category
                        ? 'bg-[#3d6373] hover:bg-[#2d4d5a] text-white text-[10px] sm:text-xs px-2 py-1.5'
                        : 'text-[10px] sm:text-xs px-2 py-1.5'
                    }
                  >
                    {category}
                  </Button>
                ))}
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* Price Range */}
          <AccordionItem value="price" className="border-b border-border/30">
            <AccordionTrigger className="px-3 sm:px-4 py-3 text-[#1d2939] font-medium text-sm">
              Price
            </AccordionTrigger>
            <AccordionContent className="px-3 sm:px-4 pb-3">
              <div className="space-y-4">
                <div className="px-1">
                  <Slider
                    min={0}
                    max={10000000}
                    step={1000}
                    value={priceValue}
                    onValueChange={priceSlider.handleValueChange}
                    className="w-full"
                  />
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={localFilters.minPrice.toLocaleString()}
                    onChange={(e) => {
                      const num = parseFloat(e.target.value.replace(/[^0-9]/g, '')) || 0;
                      updateFilter('minPrice', num);
                    }}
                    className="flex-1 px-2 py-1.5 border border-border rounded-md text-xs min-w-0"
                    placeholder="Min"
                  />
                  <input
                    type="text"
                    value={localFilters.maxPrice >= 10000000 ? 'No limit' : localFilters.maxPrice.toLocaleString()}
                    onChange={(e) => {
                      const value = e.target.value;
                      if (value.toLowerCase().includes('no limit') || value === '') {
                        updateFilter('maxPrice', 10000000);
                      } else {
                        const num = parseFloat(value.replace(/[^0-9]/g, '')) || 10000000;
                        updateFilter('maxPrice', num);
                      }
                    }}
                    className="flex-1 px-2 py-1.5 border border-border rounded-md text-xs min-w-0 overflow-hidden text-ellipsis"
                    placeholder="Max"
                    style={{ textOverflow: 'ellipsis' }}
                  />
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* Material Filter */}
          <AccordionItem value="material" className="border-b border-border/30">
            <AccordionTrigger className="px-3 sm:px-4 py-3 text-[#1d2939] font-medium text-sm">
              Material
            </AccordionTrigger>
            <AccordionContent className="px-3 sm:px-4 pb-3">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {materials.map((material) => (
                  <Button
                    key={material}
                    variant={localFilters.material === material ? 'default' : 'outline'}
                    onClick={() => updateFilter('material', localFilters.material === material ? '' : material)}
                    className={
                      localFilters.material === material
                        ? 'bg-[#3d6373] hover:bg-[#2d4d5a] text-white text-[10px] sm:text-xs px-2 py-1.5'
                        : 'text-[10px] sm:text-xs px-2 py-1.5'
                    }
                  >
                    {material}
                  </Button>
                ))}
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* Style Filter */}
          <AccordionItem value="style" className="border-b border-border/30">
            <AccordionTrigger className="px-3 sm:px-4 py-3 text-[#1d2939] font-medium text-sm">
              Style
            </AccordionTrigger>
            <AccordionContent className="px-3 sm:px-4 pb-3">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {styles.map((style) => (
                  <Button
                    key={style}
                    variant={localFilters.style === style ? 'default' : 'outline'}
                    onClick={() => updateFilter('style', localFilters.style === style ? '' : style)}
                    className={
                      localFilters.style === style
                        ? 'bg-[#3d6373] hover:bg-[#2d4d5a] text-white text-[10px] sm:text-xs px-2 py-1.5'
                        : 'text-[10px] sm:text-xs px-2 py-1.5'
                    }
                  >
                    {style}
                  </Button>
                ))}
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </CardContent>
    </Card>
  );
}

