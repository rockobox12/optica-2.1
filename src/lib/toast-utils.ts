import { toast } from "sonner";
import { CheckCircle2, XCircle, AlertTriangle, Info, RefreshCw } from "lucide-react";
import { createElement } from "react";

interface ToastOptions {
  description?: string;
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
}

/**
 * Show a success toast notification
 * Duration: 3 seconds
 * Position: top-right (configured in Toaster)
 */
export function showSuccess(message: string, options?: ToastOptions) {
  return toast.success(message, {
    description: options?.description,
    duration: options?.duration ?? 3000,
    icon: createElement(CheckCircle2, { className: "h-5 w-5 text-success" }),
    action: options?.action ? {
      label: options.action.label,
      onClick: options.action.onClick,
    } : undefined,
  });
}

/**
 * Show an error toast notification
 * Duration: 5 seconds
 * Position: top-right (configured in Toaster)
 */
export function showError(message: string, options?: ToastOptions & { onRetry?: () => void }) {
  return toast.error(message, {
    description: options?.description,
    duration: options?.duration ?? 5000,
    icon: createElement(XCircle, { className: "h-5 w-5 text-destructive" }),
    action: options?.onRetry ? {
      label: "Reintentar",
      onClick: options.onRetry,
    } : options?.action ? {
      label: options.action.label,
      onClick: options.action.onClick,
    } : undefined,
  });
}

/**
 * Show a warning toast notification
 * Duration: 4 seconds
 */
export function showWarning(message: string, options?: ToastOptions) {
  return toast.warning(message, {
    description: options?.description,
    duration: options?.duration ?? 4000,
    icon: createElement(AlertTriangle, { className: "h-5 w-5 text-warning" }),
    action: options?.action ? {
      label: options.action.label,
      onClick: options.action.onClick,
    } : undefined,
  });
}

/**
 * Show an info toast notification
 * Duration: 3 seconds
 */
export function showInfo(message: string, options?: ToastOptions) {
  return toast.info(message, {
    description: options?.description,
    duration: options?.duration ?? 3000,
    icon: createElement(Info, { className: "h-5 w-5 text-primary" }),
    action: options?.action ? {
      label: options.action.label,
      onClick: options.action.onClick,
    } : undefined,
  });
}

/**
 * Show a loading toast that can be updated
 * Returns a function to update/dismiss the toast
 */
export function showLoading(message: string) {
  const id = toast.loading(message);
  
  return {
    id,
    success: (successMessage: string, options?: ToastOptions) => {
      toast.success(successMessage, {
        id,
        description: options?.description,
        duration: options?.duration ?? 3000,
        icon: createElement(CheckCircle2, { className: "h-5 w-5 text-success" }),
      });
    },
    error: (errorMessage: string, options?: ToastOptions & { onRetry?: () => void }) => {
      toast.error(errorMessage, {
        id,
        description: options?.description,
        duration: options?.duration ?? 5000,
        icon: createElement(XCircle, { className: "h-5 w-5 text-destructive" }),
        action: options?.onRetry ? {
          label: "Reintentar",
          onClick: options.onRetry,
        } : undefined,
      });
    },
    dismiss: () => toast.dismiss(id),
  };
}

/**
 * Promise-based toast for async operations
 * Shows loading → success/error automatically
 */
export function showPromise<T>(
  promise: Promise<T>,
  messages: {
    loading: string;
    success: string | ((data: T) => string);
    error: string | ((error: unknown) => string);
  },
  options?: {
    onRetry?: () => void;
  }
) {
  return toast.promise(promise, {
    loading: messages.loading,
    success: (data) => {
      const message = typeof messages.success === 'function' ? messages.success(data) : messages.success;
      return message;
    },
    error: (error) => {
      const message = typeof messages.error === 'function' ? messages.error(error) : messages.error;
      return message;
    },
  });
}

// Re-export base toast for custom usage
export { toast } from "sonner";
