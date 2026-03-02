import { useTheme } from "next-themes";
import { Toaster as Sonner, toast } from "sonner";
import { X } from "lucide-react";

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme();

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      position="top-right"
      closeButton
      richColors
      expand
      visibleToasts={5}
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-xl group-[.toaster]:rounded-lg group-[.toaster]:animate-slide-in-right",
          description: "group-[.toast]:text-muted-foreground group-[.toast]:text-sm",
          actionButton: 
            "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground group-[.toast]:transition-all group-[.toast]:duration-200 group-[.toast]:hover:brightness-110 group-[.toast]:font-medium group-[.toast]:rounded-md group-[.toast]:px-3 group-[.toast]:py-1.5",
          cancelButton: 
            "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground group-[.toast]:transition-all group-[.toast]:duration-200 group-[.toast]:hover:bg-muted/80",
          closeButton:
            "group-[.toast]:bg-background group-[.toast]:border-border group-[.toast]:text-muted-foreground group-[.toast]:hover:text-foreground group-[.toast]:hover:bg-muted group-[.toast]:transition-colors",
          success: 
            "group-[.toaster]:border-l-4 group-[.toaster]:border-l-success group-[.toaster]:bg-success/5",
          error: 
            "group-[.toaster]:border-l-4 group-[.toaster]:border-l-destructive group-[.toaster]:bg-destructive/5 group-[.toaster]:animate-shake",
          warning: 
            "group-[.toaster]:border-l-4 group-[.toaster]:border-l-warning group-[.toaster]:bg-warning/5",
          info: 
            "group-[.toaster]:border-l-4 group-[.toaster]:border-l-primary group-[.toaster]:bg-primary/5",
          loading:
            "group-[.toaster]:border-l-4 group-[.toaster]:border-l-muted-foreground",
        },
      }}
      {...props}
    />
  );
};

export { Toaster, toast };
