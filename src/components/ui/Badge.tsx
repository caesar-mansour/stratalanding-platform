import { cn } from "@/lib/utils";
import { HTMLAttributes } from "react";

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: "default" | "primary" | "accent" | "muted";
  size?: "sm" | "md";
}

function Badge({
  className,
  variant = "default",
  size = "sm",
  children,
  ...props
}: BadgeProps) {
  const variants = {
    default: "bg-[#F8FAFC] text-[#475569] border border-[#E2E8F0]",
    primary: "bg-[#0B1B3A] text-white",
    accent: "bg-[#22D3EE]/10 text-[#0B1B3A] border border-[#22D3EE]/30",
    muted: "bg-[#E2E8F0] text-[#475569]",
  };

  const sizes = {
    sm: "px-2.5 py-1 text-xs",
    md: "px-3 py-1.5 text-sm",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center font-medium rounded-full",
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
}

export { Badge };
