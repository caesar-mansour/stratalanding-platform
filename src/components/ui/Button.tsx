"use client";

import { cn } from "@/lib/utils";
import { forwardRef, ButtonHTMLAttributes } from "react";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "accent" | "gradient" | "ghost" | "ghost-light";
  size?: "sm" | "md" | "lg";
  fullWidth?: boolean;
  loading?: boolean;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = "primary",
      size = "md",
      fullWidth = false,
      loading = false,
      disabled,
      children,
      ...props
    },
    ref
  ) => {
    const baseStyles =
      "inline-flex items-center justify-center font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#22D3EE] focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none";

    const variants = {
      primary:
        "bg-[#0B1B3A] text-white hover:bg-[#0B1B3A]/90 active:bg-[#0B1B3A]/80 shadow-lg shadow-[#0B1B3A]/20 hover:shadow-xl hover:shadow-[#0B1B3A]/30 transform hover:scale-[1.02] active:scale-[0.98]",
      secondary:
        "bg-transparent border-2 border-[#0B1B3A] text-[#0B1B3A] hover:bg-[#0B1B3A] hover:text-white",
      accent:
        "bg-[#22D3EE] text-[#0B1B3A] hover:bg-[#22D3EE]/90 active:bg-[#22D3EE]/80 font-bold shadow-lg shadow-[#22D3EE]/20",
      gradient:
        "bg-gradient-to-r from-[#E8F0F8] via-[#9ABCD8] to-[#3A6A8A] text-[#0B1B3A] hover:brightness-105 active:brightness-95 shadow-lg shadow-[#3A6A8A]/20 hover:shadow-xl hover:shadow-[#3A6A8A]/30 transform hover:scale-[1.02] active:scale-[0.98]",
      ghost:
        "bg-transparent text-[#0B1B3A] hover:bg-[#0B1B3A]/5 active:bg-[#0B1B3A]/10",
      "ghost-light":
        "bg-transparent text-white hover:bg-white/10 active:bg-white/20",
    };

    const sizes = {
      sm: "text-sm px-4 py-2.5 min-h-[44px] rounded-[10px]",
      md: "text-base px-6 py-3 rounded-[12px]",
      lg: "text-lg px-8 py-4 rounded-[12px]",
    };

    return (
      <button
        ref={ref}
        className={cn(
          baseStyles,
          variants[variant],
          sizes[size],
          fullWidth && "w-full",
          className
        )}
        disabled={disabled || loading}
        {...props}
      >
        {loading ? (
          <>
            <svg
              className="animate-spin -ml-1 mr-2 h-4 w-4"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            Processing...
          </>
        ) : (
          children
        )}
      </button>
    );
  }
);

Button.displayName = "Button";

export { Button };
