"use client"

import * as React from "react"
import * as SliderPrimitive from "@radix-ui/react-slider"

import { cn } from "@/utils/cn"

const Slider = React.forwardRef<
  React.ElementRef<typeof SliderPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof SliderPrimitive.Root>
>(({ className, ...props }, ref) => {
  const value = props.value || props.defaultValue || [0];
  const thumbCount = React.useMemo(() => {
    const val = Array.isArray(value) ? value : [value];
    return val.length;
  }, [value]);
  
  return (
    <SliderPrimitive.Root
      ref={ref}
      className={cn(
        "relative flex w-full touch-none select-none items-center py-2.5",
        className
      )}
      {...props}
    >
      <SliderPrimitive.Track className="relative h-2.5 w-full grow rounded-full bg-gray-200 dark:bg-gray-800">
        <SliderPrimitive.Range className="absolute h-full bg-[#3d6373]" />
      </SliderPrimitive.Track>
      {Array.from({ length: thumbCount }).map((_, i) => (
        <SliderPrimitive.Thumb 
          key={`thumb-${i}`}
          className="block h-5 w-5 rounded-full border-2 border-[#3d6373] bg-white shadow-md transition-all hover:scale-110 hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3d6373] focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 relative z-10"
        />
      ))}
    </SliderPrimitive.Root>
  );
})
Slider.displayName = SliderPrimitive.Root.displayName

export { Slider }

