"use client";

import * as React from "react";
import { cn } from "@/utils/cn";

export interface SeparatorProps
  extends React.HTMLAttributes<HTMLDivElement> {}

/**
 * Simple horizontal or vertical separator, matching shadcn/ui defaults.
 */
export function Separator({ className, ...props }: SeparatorProps) {
  return (
    <div
      className={cn("shrink-0 bg-border h-[1px] w-full", className)}
      role="separator"
      {...props}
    />
  );
}


