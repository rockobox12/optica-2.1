import * as React from "react";
import * as AlertDialogPrimitive from "@radix-ui/react-alert-dialog";

import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";

const AlertDialog = AlertDialogPrimitive.Root;

const AlertDialogTrigger = AlertDialogPrimitive.Trigger;

const AlertDialogPortal = AlertDialogPrimitive.Portal;

const AlertDialogOverlay = React.forwardRef<
  React.ElementRef<typeof AlertDialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <AlertDialogPrimitive.Overlay
    className={cn(
      // Overlay is positioned by the portal wrapper
      "absolute inset-0 bg-black/50 backdrop-blur-sm",
      // Smooth fade animation
      "data-[state=open]:animate-in data-[state=closed]:animate-out",
      "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
      "duration-200",
      className,
    )}
    {...props}
    ref={ref}
  />
));
AlertDialogOverlay.displayName = AlertDialogPrimitive.Overlay.displayName;

const AlertDialogContent = React.forwardRef<
  React.ElementRef<typeof AlertDialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Content>
>(({ className, ...props }, ref) => (
  <AlertDialogPortal>
    <div className="fixed inset-0 z-[80] flex items-stretch justify-stretch sm:items-center sm:justify-center">
      <AlertDialogOverlay />
      <AlertDialogPrimitive.Content
        ref={ref}
        className={cn(
          // Ensure content is above overlay
          "relative z-10",
          // Base structure
          "grid gap-4 border bg-background shadow-2xl",
          // Responsive sizing - Mobile first
          "w-[95vw] max-w-[500px] max-h-[90vh] p-4 rounded-xl",
          // Tablet (768px+)
          "md:w-[85vw] md:max-w-[550px] md:p-6",
          // Desktop (1024px+)
          "lg:max-w-[600px] lg:p-8",
          // Internal scroll for long content
          "overflow-y-auto overscroll-contain",
          // Smooth animations - scale + fade + slide
          "duration-300 ease-out",
          "data-[state=open]:animate-in data-[state=closed]:animate-out",
          "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
          "data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-100",
          "data-[state=closed]:scale-95 data-[state=open]:scale-100",
          "data-[state=open]:slide-in-from-bottom-4 data-[state=closed]:slide-out-to-bottom-2",
          className,
        )}
        {...props}
      />
    </div>
  </AlertDialogPortal>
));
AlertDialogContent.displayName = AlertDialogPrimitive.Content.displayName;

const AlertDialogHeader = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div 
    className={cn(
      "flex flex-col space-y-2 text-center sm:text-left",
      className
    )} 
    {...props} 
  />
);
AlertDialogHeader.displayName = "AlertDialogHeader";

const AlertDialogFooter = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div 
    className={cn(
      // Mobile: stacked full-width buttons
      "flex flex-col-reverse gap-2 w-full",
      // Desktop: horizontal, right-aligned
      "sm:flex-row sm:justify-end sm:gap-3",
      // Top padding
      "pt-2",
      className
    )} 
    {...props} 
  />
);
AlertDialogFooter.displayName = "AlertDialogFooter";

const AlertDialogTitle = React.forwardRef<
  React.ElementRef<typeof AlertDialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <AlertDialogPrimitive.Title 
    ref={ref} 
    className={cn("text-lg md:text-xl font-semibold", className)} 
    {...props} 
  />
));
AlertDialogTitle.displayName = AlertDialogPrimitive.Title.displayName;

const AlertDialogDescription = React.forwardRef<
  React.ElementRef<typeof AlertDialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <AlertDialogPrimitive.Description 
    ref={ref} 
    className={cn("text-sm md:text-base text-muted-foreground", className)} 
    {...props} 
  />
));
AlertDialogDescription.displayName = AlertDialogPrimitive.Description.displayName;

const AlertDialogAction = React.forwardRef<
  React.ElementRef<typeof AlertDialogPrimitive.Action>,
  React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Action>
>(({ className, ...props }, ref) => (
  <AlertDialogPrimitive.Action 
    ref={ref} 
    className={cn(
      buttonVariants(), 
      // Mobile: full width, taller for touch
      "w-full h-11 md:h-10 md:w-auto",
      "text-base md:text-sm",
      className
    )} 
    {...props} 
  />
));
AlertDialogAction.displayName = AlertDialogPrimitive.Action.displayName;

const AlertDialogCancel = React.forwardRef<
  React.ElementRef<typeof AlertDialogPrimitive.Cancel>,
  React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Cancel>
>(({ className, ...props }, ref) => (
  <AlertDialogCancel
    ref={ref}
    className={cn(
      buttonVariants({ variant: "outline" }), 
      // Mobile: full width, taller for touch
      "w-full h-11 md:h-10 md:w-auto",
      "text-base md:text-sm",
      className
    )}
    {...props}
  />
));
AlertDialogCancel.displayName = AlertDialogPrimitive.Cancel.displayName;

// Fix: Use AlertDialogPrimitive.Cancel directly to avoid recursion
const AlertDialogCancelFixed = React.forwardRef<
  React.ElementRef<typeof AlertDialogPrimitive.Cancel>,
  React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Cancel>
>(({ className, ...props }, ref) => (
  <AlertDialogPrimitive.Cancel
    ref={ref}
    className={cn(
      buttonVariants({ variant: "outline" }), 
      // Mobile: full width, taller for touch
      "w-full h-11 md:h-10 md:w-auto",
      "text-base md:text-sm",
      className
    )}
    {...props}
  />
));
AlertDialogCancelFixed.displayName = AlertDialogPrimitive.Cancel.displayName;

export {
  AlertDialog,
  AlertDialogPortal,
  AlertDialogOverlay,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogAction,
  AlertDialogCancelFixed as AlertDialogCancel,
};
