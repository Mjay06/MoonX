import * as React from "react";
import { cn } from "@/lib/utils";

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?:
    | "default"
    | "secondary"
    | "outline"
    | "success"
    | "warning"
    | "destructive"
    | "illustrative";
}

const variantStyles: Record<NonNullable<BadgeProps["variant"]>, string> = {
  default:
    "border-transparent bg-[#00e5ff] text-black font-semibold hover:bg-[#00e5ff]/80",
  secondary:
    "border-white/15 bg-white/10 text-white hover:bg-white/15",
  outline: "text-white/80 border-white/20 bg-white/[0.03]",
  success:
    "border-emerald-500/40 bg-emerald-950/70 text-emerald-300 font-medium",
  warning:
    "border-amber-500/40 bg-amber-950/70 text-amber-300 font-medium",
  destructive:
    "border-rose-500/40 bg-rose-950/70 text-rose-300 font-medium",
  illustrative:
    "border-white/20 bg-white/5 text-[#00e5ff] font-mono text-[9px] uppercase tracking-wider",
};

export function Badge({
  className,
  variant = "default",
  ...props
}: BadgeProps) {
  return (
    <div
      className={cn(
        "inline-flex items-center rounded-xs px-2 py-0.5 text-[10px] font-mono border transition-colors",
        variantStyles[variant],
        className
      )}
      {...props}
    />
  );
}
