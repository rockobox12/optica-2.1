import * as React from "react";
import { X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { Button } from "./button";

// Size variants for different modal types
type ModalSize = "sm" | "md" | "lg" | "xl" | "full";

const sizeClasses: Record<ModalSize, string> = {
  sm: "max-w-[400px]",
  md: "max-w-[600px]",
  lg: "max-w-[800px]",
  xl: "max-w-[1000px]",
  full: "max-w-[95vw]",
};

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  size?: ModalSize;
  children: React.ReactNode;
  showCloseButton?: boolean;
  closeOnOverlayClick?: boolean;
  closeOnEsc?: boolean;
  className?: string;
  footer?: React.ReactNode;
}

export function Modal({
  isOpen,
  onClose,
  title,
  description,
  size = "lg",
  children,
  showCloseButton = true,
  closeOnOverlayClick = false,
  closeOnEsc = true,
  className,
  footer,
}: ModalProps) {
  const modalRef = React.useRef<HTMLDivElement>(null);
  const previousActiveElement = React.useRef<HTMLElement | null>(null);

  // Handle ESC key
  React.useEffect(() => {
    if (!isOpen || !closeOnEsc) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, closeOnEsc, onClose]);

  // Lock body scroll when modal is open
  React.useEffect(() => {
    if (isOpen) {
      previousActiveElement.current = document.activeElement as HTMLElement;
      document.body.style.overflow = "hidden";
      
      // Focus first focusable element
      setTimeout(() => {
        const focusable = modalRef.current?.querySelector<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        focusable?.focus();
      }, 100);
    } else {
      document.body.style.overflow = "";
      previousActiveElement.current?.focus();
    }

    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  // Focus trap
  React.useEffect(() => {
    if (!isOpen) return;

    const handleTab = (e: KeyboardEvent) => {
      if (e.key !== "Tab" || !modalRef.current) return;

      const focusableElements = modalRef.current.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];

      if (e.shiftKey && document.activeElement === firstElement) {
        e.preventDefault();
        lastElement?.focus();
      } else if (!e.shiftKey && document.activeElement === lastElement) {
        e.preventDefault();
        firstElement?.focus();
      }
    };

    document.addEventListener("keydown", handleTab);
    return () => document.removeEventListener("keydown", handleTab);
  }, [isOpen]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
            onClick={closeOnOverlayClick ? onClose : undefined}
            aria-hidden="true"
          />

          {/* Modal */}
          <motion.div
            ref={modalRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={title ? "modal-title" : undefined}
            aria-describedby={description ? "modal-description" : undefined}
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ 
              duration: 0.25, 
              ease: [0.16, 1, 0.3, 1] // Custom ease-out
            }}
            className={cn(
              // Perfect centering
              "fixed left-1/2 top-1/2 z-50 -translate-x-1/2 -translate-y-1/2",
              // Base structure
              "flex flex-col bg-background border shadow-2xl",
              // Mobile first - nearly full screen
              "w-[95vw] max-h-[90vh] p-4 rounded-xl",
              // Tablet
              "md:w-[85vw] md:p-6",
              // Desktop
              "lg:w-[80vw] lg:p-8",
              // Size variant
              sizeClasses[size],
              className
            )}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            {(title || showCloseButton) && (
              <div className="flex items-start justify-between gap-4 mb-4">
                <div className="flex-1 pr-8">
                  {title && (
                    <h2
                      id="modal-title"
                      className="text-lg md:text-xl font-semibold leading-tight"
                    >
                      {title}
                    </h2>
                  )}
                  {description && (
                    <p
                      id="modal-description"
                      className="text-sm md:text-base text-muted-foreground mt-1"
                    >
                      {description}
                    </p>
                  )}
                </div>

                {showCloseButton && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={onClose}
                    className={cn(
                      "absolute right-3 top-3 md:right-4 md:top-4",
                      "min-w-[44px] min-h-[44px]",
                      "rounded-full opacity-70",
                      "hover:opacity-100 hover:bg-muted",
                      "transition-all duration-200"
                    )}
                    aria-label="Cerrar"
                  >
                    <X className="h-5 w-5 md:h-6 md:w-6" />
                  </Button>
                )}
              </div>
            )}

            {/* Content with scroll */}
            <div className="flex-1 overflow-y-auto overscroll-contain -mx-4 px-4 md:-mx-6 md:px-6 lg:-mx-8 lg:px-8">
              {children}
            </div>

            {/* Footer */}
            {footer && (
              <div className={cn(
                "flex flex-col-reverse gap-2 w-full",
                "sm:flex-row sm:justify-end sm:gap-3",
                "pt-4 mt-4 border-t border-border/50"
              )}>
                {footer}
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// Form utilities for modals
interface ModalFormGridProps extends React.HTMLAttributes<HTMLDivElement> {
  columns?: 1 | 2 | 3;
}

export function ModalFormGrid({ 
  className, 
  columns = 2, 
  ...props 
}: ModalFormGridProps) {
  const colClasses = {
    1: "grid-cols-1",
    2: "grid-cols-1 md:grid-cols-2",
    3: "grid-cols-1 md:grid-cols-2 lg:grid-cols-3",
  };

  return (
    <div 
      className={cn(
        "grid gap-4 md:gap-6",
        colClasses[columns],
        className
      )} 
      {...props} 
    />
  );
}

export function ModalFormFullWidth({ 
  className, 
  ...props 
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div 
      className={cn("col-span-full", className)} 
      {...props} 
    />
  );
}

// Responsive button wrapper for modal footers
interface ModalButtonsProps {
  children: React.ReactNode;
  className?: string;
}

export function ModalButtons({ children, className }: ModalButtonsProps) {
  return (
    <div className={cn(
      // Mobile: stacked, full width
      "flex flex-col-reverse gap-2 w-full",
      // Desktop: horizontal
      "sm:flex-row sm:justify-end sm:gap-3 sm:w-auto",
      className
    )}>
      {children}
    </div>
  );
}

export { type ModalSize };
