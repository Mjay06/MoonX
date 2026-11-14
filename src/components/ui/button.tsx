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
    "bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm border border-transparent",
  secondary:
    "bg-secondary text-secondary-foreground hover:bg-secondary/80 border border-border/40",
  outline:
    "border border-border/80 bg-card/60 text-foreground hover:bg-accent/30 hover:text-accent-foreground",
  ghost:
    "text-muted-foreground hover:bg-accent/20 hover:text-foreground border border-transparent",
  destructive:
    "bg-destructive text-destructive-foreground hover:bg-destructive/90 border border-transparent",
  accent:
    "bg-accent text-accent-foreground hover:bg-accent/80 border border-accent",
};

const sizeStyles: Record<NonNullable<ButtonProps["size"]>, string> = {
  default: "h-9 px-3 py-1.5 text-sm",
  sm: "h-8 px-2.5 text-xs rounded-md",
  lg: "h-10 px-5 text-base rounded-md",
  icon: "h-8 w-8 p-0 text-sm flex items-center justify-center rounded-md",
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
          "inline-flex items-center justify-center whitespace-nowrap rounded-md font-medium transition-colors",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
          "disabled:pointer-events-none disabled:opacity-50",
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
