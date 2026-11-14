import * as React from "react";
import { cn } from "@/lib/utils";

export type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type = "text", disabled, ...props }, ref) => {
    return (
      <input
        type={type}
        ref={ref}
        disabled={disabled}
        className={cn(
          "flex h-8 w-full rounded-sm border border-white/20 bg-black/80 px-3 py-1 text-xs text-white font-mono",
          "placeholder:text-white/40",
          "transition-colors file:border-0 file:bg-transparent file:text-xs file:font-medium",
          "focus-visible:outline-none focus-visible:border-[#00e5ff] focus-visible:ring-1 focus-visible:ring-[#00e5ff]",
          "disabled:cursor-not-allowed disabled:opacity-40",
          className
        )}
        {...props}
      />
    );
  }
);
Input.displayName = "Input";
