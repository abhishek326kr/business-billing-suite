"use client";

import * as React from "react";

import { cn } from "@/lib/utils";

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "default" | "outline" | "ghost" | "destructive";
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", ...props }, ref) => (
    <button
      ref={ref}
      className={cn(
        "inline-flex items-center justify-center rounded-lg px-4 py-2 text-sm font-medium transition focus:outline-none focus:ring-2 focus:ring-navy/20 disabled:cursor-not-allowed disabled:opacity-50",
        variant === "default" && "bg-navy text-white hover:bg-navy/90",
        variant === "outline" && "border border-border bg-white text-slate-700 hover:bg-slate-50",
        variant === "ghost" && "bg-transparent text-slate-700 hover:bg-slate-100",
        variant === "destructive" && "bg-red-600 text-white hover:bg-red-700",
        className
      )}
      {...props}
    />
  )
);

Button.displayName = "Button";
