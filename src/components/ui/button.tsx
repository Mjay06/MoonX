import * as React from "react";
import { cn } from "@/lib/utils";

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?:
    | "default"
    | "secondary"
    | "outline"
    | "ghost"
    | "destructive"
    | "accent";
  size?: "default" | "sm" | "lg" | "icon";
}

const variantStyles: Record<NonNullable<ButtonProps["variant"]>, string> = {
  default:
    "bg-[#00e5ff] text-black font-semibold hover:bg-[#00e5ff]/90 shadow-sm border border-transparent",
  secondary:
    "bg-white/10 text-white hover:bg-white/20 border border-white/20",
  outline:
    "border border-white/20 bg-black/60 text-white hover:bg-white/10 hover:border-white/40",
  ghost:
    "text-white/70 hover:bg-white/10 hover:text-white border border-transparent",
  destructive:
    "bg-destructive text-white hover:bg-destructive/90 border border-transparent",
  accent:
    "bg-[#00e5ff] text-black font-semibold hover:bg-[#00e5ff]/90 border border-[#00e5ff]",
};

const sizeStyles: Record<NonNullable<ButtonProps["size"]>, string> = {
  default: "h-9 px-3 py-1.5 text-sm",
  sm: "h-7 px-2.5 text-xs rounded-sm",
  lg: "h-10 px-5 text-base rounded-sm",
  icon: "h-7 w-7 p-0 text-sm flex items-center justify-center rounded-sm",
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = "default",
      size = "default",
      type = "button",
      disabled,
      ...props
    },
    ref
  ) => {
    return (
      <button
        ref={ref}
        type={type}
        disabled={disabled}
        className={cn(
          "inline-flex items-center justify-center whitespace-nowrap rounded-sm font-medium transition-colors tracking-wide",
          "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#00e5ff] focus-visible:ring-offset-1 focus-visible:ring-offset-black",
          "disabled:pointer-events-none disabled:opacity-40",
          variantStyles[variant],
          sizeStyles[size],
          className
        )}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";
