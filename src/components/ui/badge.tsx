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
    "border-transparent bg-primary text-primary-foreground hover:bg-primary/80",
  secondary:
    "border-border/60 bg-secondary text-secondary-foreground hover:bg-secondary/80",
  outline: "text-foreground border-border",
  success:
    "border-emerald-500/40 bg-emerald-950/80 text-emerald-300 font-medium",
  warning:
    "border-amber-500/40 bg-amber-950/80 text-amber-300 font-medium",
  destructive:
    "border-rose-500/40 bg-rose-950/80 text-rose-300 font-medium",
  illustrative:
    "border-sky-500/30 bg-sky-950/60 text-sky-300 font-mono text-[10px] uppercase tracking-wider",
};

export function Badge({
  className,
  variant = "default",
  ...props
}: BadgeProps) {
  return (
    <div
      className={cn(
        "inline-flex items-center rounded px-2 py-0.5 text-xs font-semibold border transition-colors",
        variantStyles[variant],
        className
      )}
      {...props}
    />
  );
}
