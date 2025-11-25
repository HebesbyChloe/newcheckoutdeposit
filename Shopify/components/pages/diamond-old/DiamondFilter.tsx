'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Info } from 'lucide-react';
import { useState } from 'react';
import * as React from 'react';
import { useSliderFilter } from '@/hooks/useSliderFilter';
import { DIAMOND_SHAPES_EXTENDED } from '@/constants/diamonds';

interface DiamondFilterProps {
  filters: {
    collection?: string;
    shape?: string;
    minCarat?: number;
    maxCarat?: number;
    minPrice?: number;
    maxPrice?: number;
    minCut?: number;
    maxCut?: number;
    minColor?: number;
    maxColor?: number;
    minClarity?: number;
    maxClarity?: number;
  };
  onFilterChange: (filters: any) => void;
  availableCollections?: Array<{id: string, title: string, handle: string}>;
}


const cutGrades = ['Fair', 'Good', 'Very Good', 'Ideal', 'Super Ideal'];
const colorGrades = ['J', 'I', 'H', 'G', 'F', 'E', 'D'];
const clarityGrades = ['SI2', 'SI1', 'VS2', 'VS1', 'VVS2', 'VVS1', 'IF', 'FL'];

export default function DiamondFilter({ filters, onFilterChange, availableCollections = [] }: DiamondFilterProps) {
  const [localFilters, setLocalFilters] = useState({
    collection: filters.collection || '',
    shape: filters.shape || '',
    minCarat: filters.minCarat || 0.25,
    maxCarat: filters.maxCarat || 18.06,
    minPrice: filters.minPrice || 0,
    maxPrice: filters.maxPrice || 10000000, // High default to show all
    minCut: filters.minCut !== undefined ? filters.minCut : 0,
    maxCut: filters.maxCut !== undefined ? filters.maxCut : cutGrades.length - 1,
    minColor: filters.minColor !== undefined ? filters.minColor : 0,
    maxColor: filters.maxColor !== undefined ? filters.maxColor : colorGrades.length - 1,
    minClarity: filters.minClarity !== undefined ? filters.minClarity : 0,
    maxClarity: filters.maxClarity !== undefined ? filters.maxClarity : clarityGrades.length - 1,
  });

  // Update local filters when props change
  React.useEffect(() => {
    setLocalFilters({
      collection: filters.collection || '',
      shape: filters.shape || '',
      minCarat: filters.minCarat || 0.25,
      maxCarat: filters.maxCarat || 18.06,
      minPrice: filters.minPrice || 0,
      maxPrice: filters.maxPrice || 10000000,
      minCut: filters.minCut !== undefined ? filters.minCut : 0,
      maxCut: filters.maxCut !== undefined ? filters.maxCut : cutGrades.length - 1,
      minColor: filters.minColor !== undefined ? filters.minColor : 0,
      maxColor: filters.maxColor !== undefined ? filters.maxColor : colorGrades.length - 1,
      minClarity: filters.minClarity !== undefined ? filters.minClarity : 0,
      maxClarity: filters.maxClarity !== undefined ? filters.maxClarity : clarityGrades.length - 1,
    });
  }, [filters]);

  const updateFilter = (key: string, value: any) => {
    const newFilters = { ...localFilters, [key]: value };
    setLocalFilters(newFilters);
    onFilterChange(newFilters);
  };

  // Memoize slider values to ensure proper updates
  const caratValue = React.useMemo(() => {
    const min = Math.min(localFilters.minCarat, localFilters.maxCarat);
    const max = Math.max(localFilters.minCarat, localFilters.maxCarat);
    return [min, max];
  }, [localFilters.minCarat, localFilters.maxCarat]);

  const priceValue = React.useMemo(() => {
    const min = Math.max(0, Math.min(localFilters.minPrice, localFilters.maxPrice));
    const max = Math.min(10000000, Math.max(localFilters.minPrice, localFilters.maxPrice));
    return [min, max];
  }, [localFilters.minPrice, localFilters.maxPrice]);

  const cutValue = React.useMemo(() => {
    const min = Math.min(localFilters.minCut, localFilters.maxCut);
    const max = Math.max(localFilters.minCut, localFilters.maxCut);
    return [min, max];
  }, [localFilters.minCut, localFilters.maxCut]);

  const colorValue = React.useMemo(() => {
    const min = Math.min(localFilters.minColor, localFilters.maxColor);
    const max = Math.max(localFilters.minColor, localFilters.maxColor);
    return [min, max];
  }, [localFilters.minColor, localFilters.maxColor]);

  const clarityValue = React.useMemo(() => {
    const min = Math.min(localFilters.minClarity, localFilters.maxClarity);
    const max = Math.max(localFilters.minClarity, localFilters.maxClarity);
    return [min, max];
  }, [localFilters.minClarity, localFilters.maxClarity]);

  // Use slider filter hooks for atomic updates
  const caratSlider = useSliderFilter({
    min: 0.25,
    max: 18.06,
    step: 0.01,
    onValueChange: (min, max) => {
      const newFilters = { ...localFilters, minCarat: min, maxCarat: max };
      setLocalFilters(newFilters);
      onFilterChange(newFilters);
    },
  });

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

  const cutSlider = useSliderFilter({
    min: 0,
    max: cutGrades.length - 1,
    step: 1,
    onValueChange: (min, max) => {
      const newFilters = { ...localFilters, minCut: min, maxCut: max };
      setLocalFilters(newFilters);
      onFilterChange(newFilters);
    },
  });

  const colorSlider = useSliderFilter({
    min: 0,
    max: colorGrades.length - 1,
    step: 1,
    onValueChange: (min, max) => {
      const newFilters = { ...localFilters, minColor: min, maxColor: max };
      setLocalFilters(newFilters);
      onFilterChange(newFilters);
    },
  });

  const claritySlider = useSliderFilter({
    min: 0,
    max: clarityGrades.length - 1,
    step: 1,
    onValueChange: (min, max) => {
      const newFilters = { ...localFilters, minClarity: min, maxClarity: max };
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
                      ? 'bg-[#3d6373] hover:bg-[#2d4d5a] text-white flex-1 min-w-0 text-[10px] sm:text-xs px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-[#3d6373] focus:ring-offset-2'
                      : 'flex-1 min-w-0 text-[10px] sm:text-xs px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-[#3d6373] focus:ring-offset-2'
                  }
                  aria-label={`Filter by ${collection.title} collection`}
                  aria-pressed={localFilters.collection === collection.id || localFilters.collection === collection.handle}
                >
                  <span className="truncate block w-full">{collection.title}</span>
                </Button>
              ))}
            </div>
          ) : (
            <p className="text-xs text-[#667085]">Loading collections...</p>
          )}
        </div>

        <Accordion type="multiple" defaultValue={['shape', 'carat', 'price']} className="w-full">

          {/* Diamond Shape */}
          <AccordionItem value="shape" className="border-b border-border/30">
            <AccordionTrigger className="px-3 sm:px-4 py-3 text-[#1d2939] font-medium text-sm">
              Diamond Shape
            </AccordionTrigger>
            <AccordionContent className="px-3 sm:px-4 pb-3">
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 sm:gap-4">
                {DIAMOND_SHAPES_EXTENDED.map((shape) => (
                  <button
                    key={shape.name}
                    onClick={() => updateFilter('shape', localFilters.shape === shape.name ? '' : shape.name)}
                    className={`flex flex-col items-center gap-2 p-2 rounded-lg transition-all focus:outline-none focus:ring-2 focus:ring-[#3d6373] focus:ring-offset-2 ${
                      localFilters.shape === shape.name
                        ? 'ring-2 ring-[#3d6373] bg-[#3d6373]/5'
                        : 'hover:bg-muted'
                    }`}
                    aria-label={`Filter by ${shape.name} diamond shape`}
                    aria-pressed={localFilters.shape === shape.name}
                  >
                    <div className="w-12 h-12 relative" role="img" aria-label={`${shape.name} diamond shape icon`}>
                      <img
                        src={shape.image}
                        alt=""
                        className="w-full h-full object-contain"
                        aria-hidden="true"
                      />
                    </div>
                    <span className="text-[10px] sm:text-xs text-center text-[#667085]">{shape.name}</span>
                  </button>
                ))}
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* Carat */}
          <AccordionItem value="carat" className="border-b border-border/30">
            <AccordionTrigger className="px-3 sm:px-4 py-3 text-[#1d2939] font-medium text-sm">
              <div className="flex items-center gap-2">
                Carat
                <Info className="h-3 w-3 text-[#667085] opacity-50" />
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-3 sm:px-4 pb-3">
              <div className="space-y-4">
                <div className="px-1">
                  <Slider
                    min={0.25}
                    max={18.06}
                    step={0.01}
                    value={caratValue}
                    onValueChange={caratSlider.handleValueChange}
                    className="w-full"
                    aria-label="Carat weight range filter"
                    aria-valuemin={0.25}
                    aria-valuemax={18.06}
                    aria-valuenow={caratValue[1]}
                    aria-valuetext={`${caratValue[0]} to ${caratValue[1]} carats`}
                  />
                </div>
                <div className="flex gap-2">
                  <label htmlFor="min-carat" className="sr-only">Minimum carat weight</label>
                  <input
                    id="min-carat"
                    type="number"
                    value={localFilters.minCarat}
                    onChange={(e) => updateFilter('minCarat', parseFloat(e.target.value) || 0.25)}
                    className="flex-1 px-2 py-1.5 border border-border rounded-md text-xs focus:outline-none focus:ring-2 focus:ring-[#3d6373] focus:ring-offset-1"
                    min={0.25}
                    max={18.06}
                    step={0.01}
                    aria-label="Minimum carat weight"
                  />
                  <label htmlFor="max-carat" className="sr-only">Maximum carat weight</label>
                  <input
                    id="max-carat"
                    type="number"
                    value={localFilters.maxCarat}
                    onChange={(e) => updateFilter('maxCarat', parseFloat(e.target.value) || 18.06)}
                    className="flex-1 px-2 py-1.5 border border-border rounded-md text-xs focus:outline-none focus:ring-2 focus:ring-[#3d6373] focus:ring-offset-1"
                    min={0.25}
                    max={18.06}
                    step={0.01}
                    aria-label="Maximum carat weight"
                  />
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* Diamond Price */}
          <AccordionItem value="price" className="border-b border-border/30">
            <AccordionTrigger className="px-3 sm:px-4 py-3 text-[#1d2939] font-medium text-sm">
              Diamond Price
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
                    aria-label="Price range filter"
                    aria-valuemin={0}
                    aria-valuemax={10000000}
                    aria-valuenow={priceValue[1]}
                    aria-valuetext={`$${priceValue[0].toLocaleString()} to $${priceValue[1] >= 10000000 ? 'No limit' : priceValue[1].toLocaleString()}`}
                  />
                </div>
                <div className="flex gap-2">
                  <label htmlFor="min-price" className="sr-only">Minimum price</label>
                  <input
                    id="min-price"
                    type="text"
                    value={localFilters.minPrice.toLocaleString()}
                    onChange={(e) => {
                      const num = parseFloat(e.target.value.replace(/[^0-9]/g, '')) || 0;
                      updateFilter('minPrice', num);
                    }}
                    className="flex-1 px-2 py-1.5 border border-border rounded-md text-xs min-w-0 focus:outline-none focus:ring-2 focus:ring-[#3d6373] focus:ring-offset-1"
                    placeholder="Min"
                    aria-label="Minimum price"
                  />
                  <label htmlFor="max-price" className="sr-only">Maximum price</label>
                  <input
                    id="max-price"
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
                    className="flex-1 px-2 py-1.5 border border-border rounded-md text-xs min-w-0 overflow-hidden text-ellipsis focus:outline-none focus:ring-2 focus:ring-[#3d6373] focus:ring-offset-1"
                    placeholder="Max"
                    style={{ textOverflow: 'ellipsis' }}
                    aria-label="Maximum price"
                  />
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* Cut Grade - 2-way range */}
          <AccordionItem value="cut" className="border-b border-border/30">
            <AccordionTrigger className="px-3 sm:px-4 py-3 text-[#1d2939] font-medium text-sm">
              <div className="flex items-center gap-2">
                Cut Grade
                <Info className="h-3 w-3 text-[#667085] opacity-50" />
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-3 sm:px-4 pb-3">
              <div className="space-y-4">
                <div className="px-1">
                  <Slider
                    min={0}
                    max={cutGrades.length - 1}
                    step={1}
                    value={cutValue}
                    onValueChange={cutSlider.handleValueChange}
                    className="w-full"
                    aria-label="Cut grade range filter"
                    aria-valuemin={0}
                    aria-valuemax={cutGrades.length - 1}
                    aria-valuenow={cutValue[1]}
                    aria-valuetext={`${cutGrades[cutValue[0]]} to ${cutGrades[cutValue[1]]}`}
                  />
                </div>
                <div className="flex gap-2">
                  <div className="flex-1">
                    <label htmlFor="min-cut" className="text-[10px] text-[#667085] mb-1 block">Min</label>
                    <select
                      id="min-cut"
                      value={localFilters.minCut}
                      onChange={(e) => updateFilter('minCut', parseInt(e.target.value))}
                      className="w-full px-2 py-1.5 border border-border rounded-md text-xs focus:outline-none focus:ring-2 focus:ring-[#3d6373] focus:ring-offset-1"
                      aria-label="Minimum cut grade"
                    >
                      {cutGrades.map((grade, index) => (
                        <option key={grade} value={index}>{grade}</option>
                      ))}
                    </select>
                  </div>
                  <div className="flex-1">
                    <label htmlFor="max-cut" className="text-[10px] text-[#667085] mb-1 block">Max</label>
                    <select
                      id="max-cut"
                      value={localFilters.maxCut}
                      onChange={(e) => updateFilter('maxCut', parseInt(e.target.value))}
                      className="w-full px-2 py-1.5 border border-border rounded-md text-xs focus:outline-none focus:ring-2 focus:ring-[#3d6373] focus:ring-offset-1"
                      aria-label="Maximum cut grade"
                    >
                      {cutGrades.map((grade, index) => (
                        <option key={grade} value={index}>{grade}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* Color - 2-way range */}
          <AccordionItem value="color" className="border-b border-border/30">
            <AccordionTrigger className="px-3 sm:px-4 py-3 text-[#1d2939] font-medium text-sm">
              <div className="flex items-center gap-2">
                Color
                <Info className="h-3 w-3 text-[#667085] opacity-50" />
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-3 sm:px-4 pb-3">
              <div className="space-y-4">
                <div className="px-1">
                  <Slider
                    min={0}
                    max={colorGrades.length - 1}
                    step={1}
                    value={colorValue}
                    onValueChange={colorSlider.handleValueChange}
                    className="w-full"
                    aria-label="Color grade range filter"
                    aria-valuemin={0}
                    aria-valuemax={colorGrades.length - 1}
                    aria-valuenow={colorValue[1]}
                    aria-valuetext={`${colorGrades[colorValue[0]]} to ${colorGrades[colorValue[1]]}`}
                  />
                </div>
                <div className="flex gap-2">
                  <div className="flex-1">
                    <label htmlFor="min-color" className="text-[10px] text-[#667085] mb-1 block">Min</label>
                    <select
                      id="min-color"
                      value={localFilters.minColor}
                      onChange={(e) => updateFilter('minColor', parseInt(e.target.value))}
                      className="w-full px-2 py-1.5 border border-border rounded-md text-xs focus:outline-none focus:ring-2 focus:ring-[#3d6373] focus:ring-offset-1"
                      aria-label="Minimum color grade"
                    >
                      {colorGrades.map((grade, index) => (
                        <option key={grade} value={index}>{grade}</option>
                      ))}
                    </select>
                  </div>
                  <div className="flex-1">
                    <label htmlFor="max-color" className="text-[10px] text-[#667085] mb-1 block">Max</label>
                    <select
                      id="max-color"
                      value={localFilters.maxColor}
                      onChange={(e) => updateFilter('maxColor', parseInt(e.target.value))}
                      className="w-full px-2 py-1.5 border border-border rounded-md text-xs focus:outline-none focus:ring-2 focus:ring-[#3d6373] focus:ring-offset-1"
                      aria-label="Maximum color grade"
                    >
                      {colorGrades.map((grade, index) => (
                        <option key={grade} value={index}>{grade}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* Clarity - 2-way range */}
          <AccordionItem value="clarity" className="border-b border-border/30">
            <AccordionTrigger className="px-3 sm:px-4 py-3 text-[#1d2939] font-medium text-sm">
              <div className="flex items-center gap-2">
                Clarity
                <Info className="h-3 w-3 text-[#667085] opacity-50" />
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-3 sm:px-4 pb-3">
              <div className="space-y-4">
                <div className="px-1">
                  <Slider
                    min={0}
                    max={clarityGrades.length - 1}
                    step={1}
                    value={clarityValue}
                    onValueChange={claritySlider.handleValueChange}
                    className="w-full"
                    aria-label="Clarity grade range filter"
                    aria-valuemin={0}
                    aria-valuemax={clarityGrades.length - 1}
                    aria-valuenow={clarityValue[1]}
                    aria-valuetext={`${clarityGrades[clarityValue[0]]} to ${clarityGrades[clarityValue[1]]}`}
                  />
                </div>
                <div className="flex gap-2">
                  <div className="flex-1">
                    <label htmlFor="min-clarity" className="text-[10px] text-[#667085] mb-1 block">Min</label>
                    <select
                      id="min-clarity"
                      value={localFilters.minClarity}
                      onChange={(e) => updateFilter('minClarity', parseInt(e.target.value))}
                      className="w-full px-2 py-1.5 border border-border rounded-md text-xs focus:outline-none focus:ring-2 focus:ring-[#3d6373] focus:ring-offset-1"
                      aria-label="Minimum clarity grade"
                    >
                      {clarityGrades.map((grade, index) => (
                        <option key={grade} value={index}>{grade}</option>
                      ))}
                    </select>
                  </div>
                  <div className="flex-1">
                    <label htmlFor="max-clarity" className="text-[10px] text-[#667085] mb-1 block">Max</label>
                    <select
                      id="max-clarity"
                      value={localFilters.maxClarity}
                      onChange={(e) => updateFilter('maxClarity', parseInt(e.target.value))}
                      className="w-full px-2 py-1.5 border border-border rounded-md text-xs focus:outline-none focus:ring-2 focus:ring-[#3d6373] focus:ring-offset-1"
                      aria-label="Maximum clarity grade"
                    >
                      {clarityGrades.map((grade, index) => (
                        <option key={grade} value={index}>{grade}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </CardContent>
    </Card>
  );
}

