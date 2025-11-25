'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Info } from 'lucide-react';
import { useState } from 'react';
import * as React from 'react';
import { useSliderFilter } from '@/hooks/useSliderFilter';
import { DiamondFilters } from '@/types/filter.types';

interface ExternalDiamondFilterProps {
  filters: DiamondFilters;
  collection: 'natural' | 'labgrown';
  onCollectionChange: (collection: 'natural' | 'labgrown') => void;
  onFilterChange: (filters: DiamondFilters) => void;
}

const shapes = [
  { name: 'Round', image: '/images/shape-round.png' },
  { name: 'Oval', image: '/images/shape-oval.png' },
  { name: 'Emerald', image: '/images/shape-asscher.png' },
  { name: 'Cushion', image: '/images/shape-cushion.png' },
  { name: 'Elongated Cushion', image: '/images/shape-cushion.png' },
  { name: 'Pear', image: '/images/shape-pear.png' },
  { name: 'Radiant', image: '/images/shape-asscher.png' },
  { name: 'Princess', image: '/images/shape-princess.png' },
  { name: 'Marquise', image: '/images/shape-marquise.png' },
  { name: 'Asscher', image: '/images/shape-asscher.png' },
  { name: 'Heart', image: '/images/shape-heart.png' },
];

const cutGrades = ['Fair', 'Good', 'Very Good', 'Ideal', 'Super Ideal'];
const colorGrades = ['J', 'I', 'H', 'G', 'F', 'E', 'D'];
const clarityGrades = ['SI2', 'SI1', 'VS2', 'VS1', 'VVS2', 'VVS1', 'IF', 'FL'];

    export default function ExternalDiamondFilter({ filters, collection, onCollectionChange, onFilterChange }: ExternalDiamondFilterProps) {
  const [localFilters, setLocalFilters] = useState<DiamondFilters>({
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

  const updateFilter = (key: keyof DiamondFilters, value: any) => {
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
            <Accordion type="multiple" defaultValue={['collection', 'shape', 'carat', 'price']} className="w-full">

              {/* Collection Selector */}
              <AccordionItem value="collection" className="border-b border-border/30">
                <AccordionTrigger className="px-3 sm:px-4 py-3 text-[#1d2939] font-medium text-sm">
                  Diamond Type
                </AccordionTrigger>
                <AccordionContent className="px-3 sm:px-4 pb-3">
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => onCollectionChange('natural')}
                      className={`px-4 py-3 rounded-lg border-2 transition-all text-sm font-medium ${
                        collection === 'natural'
                          ? 'border-[#3d6373] bg-[#3d6373] text-white'
                          : 'border-border hover:border-[#3d6373]/50 bg-white text-[#1d2939]'
                      }`}
                    >
                      Natural Diamonds
                    </button>
                    <button
                      onClick={() => onCollectionChange('labgrown')}
                      className={`px-4 py-3 rounded-lg border-2 transition-all text-sm font-medium ${
                        collection === 'labgrown'
                          ? 'border-[#3d6373] bg-[#3d6373] text-white'
                          : 'border-border hover:border-[#3d6373]/50 bg-white text-[#1d2939]'
                      }`}
                    >
                      Lab-Grown Diamonds
                    </button>
                  </div>
                </AccordionContent>
              </AccordionItem>
          {/* Diamond Shape */}
          <AccordionItem value="shape" className="border-b border-border/30">
            <AccordionTrigger className="px-3 sm:px-4 py-3 text-[#1d2939] font-medium text-sm">
              Diamond Shape
            </AccordionTrigger>
            <AccordionContent className="px-3 sm:px-4 pb-3">
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 sm:gap-4">
                {shapes.map((shape) => (
                  <button
                    key={shape.name}
                    onClick={() => updateFilter('shape', localFilters.shape === shape.name ? '' : shape.name)}
                    className={`flex flex-col items-center gap-2 p-2 rounded-lg transition-all ${
                      localFilters.shape === shape.name
                        ? 'ring-2 ring-[#3d6373] bg-[#3d6373]/5'
                        : 'hover:bg-muted'
                    }`}
                  >
                    <div className="w-12 h-12 relative">
                      <img
                        src={shape.image}
                        alt={shape.name}
                        className="w-full h-full object-contain"
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
                  />
                </div>
                <div className="flex gap-2">
                  <input
                    type="number"
                    value={localFilters.minCarat}
                    onChange={(e) => updateFilter('minCarat', parseFloat(e.target.value) || 0.25)}
                    className="flex-1 px-2 py-1.5 border border-border rounded-md text-xs"
                    min={0.25}
                    max={18.06}
                    step={0.01}
                  />
                  <input
                    type="number"
                    value={localFilters.maxCarat}
                    onChange={(e) => updateFilter('maxCarat', parseFloat(e.target.value) || 18.06)}
                    className="flex-1 px-2 py-1.5 border border-border rounded-md text-xs"
                    min={0.25}
                    max={18.06}
                    step={0.01}
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

          {/* Cut Grade */}
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
                  />
                </div>
                <div className="flex gap-2">
                  <div className="flex-1">
                    <label className="text-[10px] text-[#667085] mb-1 block">Min</label>
                    <select
                      value={localFilters.minCut}
                      onChange={(e) => updateFilter('minCut', parseInt(e.target.value))}
                      className="w-full px-2 py-1.5 border border-border rounded-md text-xs"
                    >
                      {cutGrades.map((grade, index) => (
                        <option key={grade} value={index}>{grade}</option>
                      ))}
                    </select>
                  </div>
                  <div className="flex-1">
                    <label className="text-[10px] text-[#667085] mb-1 block">Max</label>
                    <select
                      value={localFilters.maxCut}
                      onChange={(e) => updateFilter('maxCut', parseInt(e.target.value))}
                      className="w-full px-2 py-1.5 border border-border rounded-md text-xs"
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

          {/* Color */}
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
                  />
                </div>
                <div className="flex gap-2">
                  <div className="flex-1">
                    <label className="text-[10px] text-[#667085] mb-1 block">Min</label>
                    <select
                      value={localFilters.minColor}
                      onChange={(e) => updateFilter('minColor', parseInt(e.target.value))}
                      className="w-full px-2 py-1.5 border border-border rounded-md text-xs"
                    >
                      {colorGrades.map((grade, index) => (
                        <option key={grade} value={index}>{grade}</option>
                      ))}
                    </select>
                  </div>
                  <div className="flex-1">
                    <label className="text-[10px] text-[#667085] mb-1 block">Max</label>
                    <select
                      value={localFilters.maxColor}
                      onChange={(e) => updateFilter('maxColor', parseInt(e.target.value))}
                      className="w-full px-2 py-1.5 border border-border rounded-md text-xs"
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

          {/* Clarity */}
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
                  />
                </div>
                <div className="flex gap-2">
                  <div className="flex-1">
                    <label className="text-[10px] text-[#667085] mb-1 block">Min</label>
                    <select
                      value={localFilters.minClarity}
                      onChange={(e) => updateFilter('minClarity', parseInt(e.target.value))}
                      className="w-full px-2 py-1.5 border border-border rounded-md text-xs"
                    >
                      {clarityGrades.map((grade, index) => (
                        <option key={grade} value={index}>{grade}</option>
                      ))}
                    </select>
                  </div>
                  <div className="flex-1">
                    <label className="text-[10px] text-[#667085] mb-1 block">Max</label>
                    <select
                      value={localFilters.maxClarity}
                      onChange={(e) => updateFilter('maxClarity', parseInt(e.target.value))}
                      className="w-full px-2 py-1.5 border border-border rounded-md text-xs"
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

