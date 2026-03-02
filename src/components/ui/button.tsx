import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-medium ring-offset-background transition-all duration-200 ease-in-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 hover:shadow-md active:scale-[0.97] relative overflow-hidden touch-manipulation",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-accent hover:brightness-110 shadow-sm",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90 hover:brightness-110 shadow-sm",
        outline: "border-2 border-input bg-background hover:bg-secondary hover:text-secondary-foreground hover:border-primary/50",
        secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80 hover:brightness-105 shadow-sm",
        ghost: "hover:bg-secondary hover:text-secondary-foreground",
        link: "text-primary underline-offset-4 hover:underline",
        success: "bg-success text-success-foreground hover:bg-success/90 hover:brightness-110 shadow-sm",
        warning: "bg-warning text-warning-foreground hover:bg-warning/90 hover:brightness-110 shadow-sm",
        ai: "bg-ai text-ai-foreground hover:bg-ai/90 hover:brightness-110 shadow-sm ai-glow",
      },
      size: {
        // Mobile first: larger touch targets
        default: "h-11 min-h-[44px] px-4 py-2.5 text-base md:h-10 md:min-h-[40px] md:text-sm",
        sm: "h-10 min-h-[40px] rounded-lg px-3 py-2 text-sm md:h-9 md:min-h-[36px]",
        lg: "h-12 min-h-[48px] rounded-lg px-6 py-3 text-base md:h-11 md:min-h-[44px]",
        icon: "h-11 w-11 min-h-[44px] min-w-[44px] md:h-10 md:w-10 md:min-h-[40px] md:min-w-[40px]",
        // Full width for mobile modals
        mobile: "h-12 min-h-[48px] w-full px-6 py-3 text-base",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />;
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
