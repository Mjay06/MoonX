import * as React from "react";
import { cn } from "@/lib/utils";

export interface SliderProps {
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (value: number) => void;
  className?: string;
  disabled?: boolean;
  "aria-label"?: string;
  "aria-valuetext"?: string;
}

export function Slider({
  value,
  min,
  max,
  step = 1,
  onChange,
  className,
  disabled = false,
  "aria-label": ariaLabel,
  "aria-valuetext": ariaValuetext,
}: SliderProps) {
  const percentage = Math.min(
    100,
    Math.max(0, ((value - min) / (max - min || 1)) * 100)
  );

  return (
    <div
      className={cn(
        "relative flex w-full touch-none select-none items-center py-2",
        disabled && "opacity-50 pointer-events-none",
        className
      )}
    >
      <div className="relative h-2 w-full grow overflow-hidden rounded-full bg-secondary/80 border border-border/50">
        <div
          className="h-full bg-primary transition-all duration-75"
          style={{ width: `${percentage}%` }}
        />
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        disabled={disabled}
        aria-label={ariaLabel}
        aria-valuetext={ariaValuetext}
        aria-valuenow={value}
        aria-valuemin={min}
        aria-valuemax={max}
        onChange={(e) => onChange(Number(e.target.value))}
        className={cn(
          "absolute inset-0 h-full w-full cursor-pointer opacity-0",
          "focus-visible:outline-none"
        )}
      />
      {/* Visual thumb */}
      <div
        className={cn(
          "pointer-events-none absolute top-1/2 -translate-y-1/2 h-4 w-4 rounded-full border-2 border-primary bg-background shadow-md",
          "transition-[left] duration-75"
        )}
        style={{ left: `calc(${percentage}% - 8px)` }}
      />
    </div>
  );
}
