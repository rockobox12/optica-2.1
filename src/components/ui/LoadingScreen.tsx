import { Eye } from 'lucide-react';

interface LoadingScreenProps {
  message?: string;
}

export function LoadingScreen({ message = 'Cargando...' }: LoadingScreenProps) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-4">
        <div className="relative">
          <div className="p-4 rounded-full bg-primary/10">
            <Eye className="h-8 w-8 text-primary animate-pulse" />
          </div>
          <div className="absolute inset-0 rounded-full border-2 border-primary/30 border-t-primary animate-spin" />
        </div>
        <p className="text-muted-foreground text-sm">{message}</p>
      </div>
    </div>
  );
}
