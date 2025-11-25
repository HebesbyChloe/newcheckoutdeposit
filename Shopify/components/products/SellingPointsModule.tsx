'use client';

import { Info } from 'lucide-react';

export interface SellingPoint {
  icon: React.ReactNode;
  title: string;
}

export interface SellingPointsModuleProps {
  title?: string;
  showInfoIcon?: boolean;
  points: SellingPoint[];
  className?: string;
}

export function SellingPointsModule({
  title = "We've Got You Covered",
  showInfoIcon = true,
  points,
  className = "",
}: SellingPointsModuleProps) {
  if (points.length === 0) return null;

  return (
    <div className={`border-t pt-6 space-y-4 ${className}`}>
      <div className="flex items-center gap-2 text-[#1d2939]">
        <span>{title}</span>
        {showInfoIcon && <Info className="h-4 w-4 text-[#667085]" />}
      </div>
      
      <div className="grid grid-cols-1 gap-4">
        {points.map((point, index) => (
          <div key={index} className="flex items-start gap-3">
            <div className="text-[#2c5f6f] mt-0.5">
              {point.icon}
            </div>
            <span className="text-sm text-[#667085]">{point.title}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default SellingPointsModule;
