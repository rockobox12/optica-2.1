import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";

import { cn } from "@/lib/utils";

const Dialog = DialogPrimitive.Root;

const DialogTrigger = DialogPrimitive.Trigger;

const DialogPortal = DialogPrimitive.Portal;

const DialogClose = DialogPrimitive.Close;

const DialogOverlay = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
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
  />
));
DialogOverlay.displayName = DialogPrimitive.Overlay.displayName;

// Size variants for different modal types
type DialogSize = "sm" | "md" | "lg" | "xl" | "full";

const sizeClasses: Record<DialogSize, string> = {
  sm: "md:max-w-[400px]",
  md: "md:max-w-[600px]",
  lg: "md:max-w-[800px]",
  xl: "md:max-w-[1100px]",
  full: "md:max-w-[95vw]",
};

interface DialogContentProps
  extends React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content> {
  size?: DialogSize;
  hideCloseButton?: boolean;
  /** Prevents closing via overlay click and ESC key. User must close explicitly via buttons. */
  preventClose?: boolean;
}

const DialogContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  DialogContentProps
>(({ className, children, size = "lg", hideCloseButton = false, preventClose = false, ...props }, ref) => (
  <DialogPortal>
    {/*
      IMPORTANT: The wrapper is the positioning layer.
      This avoids translate(-50%, -50%) on the content element (which can be overridden
      by Radix/Tailwind transform-based animations and causes right-shift).
    */}
    <div className="fixed inset-0 z-[70] flex items-stretch justify-stretch sm:items-center sm:justify-center">
      <DialogOverlay />
      <DialogPrimitive.Content
        ref={ref}
        onPointerDownOutside={preventClose ? (e) => e.preventDefault() : undefined}
        onEscapeKeyDown={preventClose ? (e) => e.preventDefault() : undefined}
        onInteractOutside={preventClose ? (e) => e.preventDefault() : undefined}
        className={cn(
          // Ensure content is above overlay
          "relative z-10",
          // Base structure
          "grid gap-4 border bg-background shadow-2xl",
          // Mobile: fullscreen
          "w-screen h-screen max-h-screen p-4 rounded-none",
          // Small+ (>=640px): centered modal sizing + rounded corners
          "sm:w-[95vw] sm:h-auto sm:max-h-[90vh] sm:rounded-xl",
          // Tablet (768px+)
          "md:w-[90vw] md:p-6",
          // Desktop (1024px+)
          "lg:w-[80vw] lg:p-8",
          // Apply size variant
          sizeClasses[size],
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
      >
        {children}
        {!hideCloseButton && !preventClose && (
          <DialogPrimitive.Close
            className={cn(
              "absolute right-3 top-3 md:right-4 md:top-4",
              // Minimum touch target size 44x44px
              "min-w-[44px] min-h-[44px] flex items-center justify-center",
              "rounded-full opacity-70 ring-offset-background",
              "transition-all duration-200",
              "hover:opacity-100 hover:bg-muted hover:scale-110",
              "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
              "disabled:pointer-events-none",
            )}
          >
            <X className="h-5 w-5 md:h-6 md:w-6" />
            <span className="sr-only">Cerrar</span>
          </DialogPrimitive.Close>
        )}
      </DialogPrimitive.Content>
    </div>
  </DialogPortal>
));
DialogContent.displayName = DialogPrimitive.Content.displayName;

const DialogHeader = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div 
    className={cn(
      "flex flex-col space-y-1.5 text-center sm:text-left",
      "pr-10", // Space for close button
      className
    )} 
    {...props} 
  />
);
DialogHeader.displayName = "DialogHeader";

const DialogFooter = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div 
    className={cn(
      // Mobile: stacked full-width buttons, primary first
      "flex flex-col-reverse gap-2 w-full",
      // Desktop: horizontal, right-aligned
      "sm:flex-row sm:justify-end sm:gap-3",
      // Sticky footer for long content
      "pt-4 mt-auto border-t border-border/50",
      className
    )} 
    {...props} 
  />
);
DialogFooter.displayName = "DialogFooter";

// Form grid for responsive layouts inside dialogs
const DialogFormGrid = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div 
    className={cn(
      // Mobile: single column
      "grid grid-cols-1 gap-4",
      // Tablet/Desktop: 2 columns
      "md:grid-cols-2 md:gap-6",
      className
    )} 
    {...props} 
  />
);
DialogFormGrid.displayName = "DialogFormGrid";

// Full-width field wrapper for fields that should span both columns
const DialogFormFullWidth = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div 
    className={cn("md:col-span-2", className)} 
    {...props} 
  />
);
DialogFormFullWidth.displayName = "DialogFormFullWidth";

const DialogTitle = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title
    ref={ref}
    className={cn(
      "text-lg md:text-xl font-semibold leading-none tracking-tight",
      className
    )}
    {...props}
  />
));
DialogTitle.displayName = DialogPrimitive.Title.displayName;

const DialogDescription = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Description 
    ref={ref} 
    className={cn("text-sm md:text-base text-muted-foreground", className)} 
    {...props} 
  />
));
DialogDescription.displayName = DialogPrimitive.Description.displayName;

export {
  Dialog,
  DialogPortal,
  DialogOverlay,
  DialogClose,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogFormGrid,
  DialogFormFullWidth,
  DialogTitle,
  DialogDescription,
};
