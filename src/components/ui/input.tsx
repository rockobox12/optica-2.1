import * as React from "react";

import { cn } from "@/lib/utils";

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          // Base styles
          "flex w-full rounded-lg border-2 border-input bg-background px-3 py-2",
          // Typography
          "text-base placeholder:text-muted-foreground",
          // Mobile: larger touch targets (48px min)
          "h-12 min-h-[48px]",
          // Desktop: slightly smaller
          "md:h-11 md:min-h-[44px] md:text-sm",
          // Focus states
          "ring-offset-background transition-all duration-200",
          "focus-visible:outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20",
          // Disabled state
          "disabled:cursor-not-allowed disabled:opacity-50",
          // File input
          "file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground",
          className,
        )}
        ref={ref}
        {...props}
      />
    );
  },
);
Input.displayName = "Input";

export { Input };
