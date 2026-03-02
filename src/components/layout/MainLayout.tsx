import { Suspense, ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { MobileNav } from './MobileNav';
import { Header } from './Header';
import { ErrorBoundary } from '@/components/error/ErrorBoundary';
import { ModuleErrorFallback } from '@/components/error/ModuleErrorFallback';
import { Skeleton } from '@/components/ui/skeleton';
import { DeveloperWatermark } from '@/components/branding/DeveloperWatermark';
import { useBreakpoint } from '@/hooks/use-mobile';
import { useTouchScroll } from '@/hooks/useTouchScroll';

interface MainLayoutProps {
  children: ReactNode;
}

function ContentLoader() {
  return (
    <div className="space-y-4">
      <div className="flex gap-4">
        <Skeleton className="h-32 flex-1" />
        <Skeleton className="h-32 flex-1" />
        <Skeleton className="h-32 flex-1 hidden sm:block" />
        <Skeleton className="h-32 flex-1 hidden lg:block" />
      </div>
      <Skeleton className="h-64 w-full" />
      <Skeleton className="h-48 w-full" />
    </div>
  );
}

export function MainLayout({ children }: MainLayoutProps) {
  const location = useLocation();
  const bp = useBreakpoint();
  const isMobile = bp === 'mobile';
  const isTablet = bp === 'tablet';
  const isDesktop = bp === 'desktop';
  const isExpedienteRoute = location.pathname.startsWith('/expediente');
  const layoutRef = useTouchScroll<HTMLDivElement>();

  // Tablet: sidebar collapsed by default
  const sidebarCollapsed = isTablet;

  return (
    <div
      ref={layoutRef}
      className="min-h-screen bg-background overflow-x-hidden safe-area-left safe-area-right"
      style={{ touchAction: 'pan-x pan-y', msTouchAction: 'pan-x pan-y', WebkitOverflowScrolling: 'touch' }}
    >
      {/* Desktop & Tablet Sidebar */}
      {!isMobile && (
        <ErrorBoundary fallback={<ModuleErrorFallback title="Error en el menú" description="No se pudo cargar el menú lateral." />}>
          <Sidebar forceCollapsed={isTablet} />
        </ErrorBoundary>
      )}

      {/* Mobile Navigation */}
      {isMobile && (
        <ErrorBoundary fallback={<div className="h-14 bg-background border-b" />}>
          <MobileNav />
        </ErrorBoundary>
      )}
      
      {/* Desktop & Tablet Header */}
      {!isMobile && (
        <ErrorBoundary fallback={<div className="h-16 bg-background border-b" />}>
          <Header sidebarCollapsed={sidebarCollapsed} />
        </ErrorBoundary>
      )}
      
      <main
        className={`transition-all duration-300 min-h-screen flex flex-col overflow-x-hidden ${!isExpedienteRoute ? 'mobile-compact' : ''} ${
          isMobile 
            ? 'pt-12 pb-16'
            : `pt-16 ${sidebarCollapsed ? 'pl-[70px]' : 'pl-[260px]'}`
        }`}
      >
        <div className={`flex-1 ${isMobile ? 'p-3' : isTablet ? 'p-4' : 'p-6'}`}>
          <ErrorBoundary 
            fallback={
              <ModuleErrorFallback 
                title="Error al cargar el contenido" 
                description="Hubo un problema al renderizar esta sección."
                onRetry={() => window.location.reload()}
              />
            }
          >
            <Suspense fallback={<ContentLoader />}>
              {children}
            </Suspense>
          </ErrorBoundary>
        </div>
        
        {/* Developer watermark - hidden on mobile */}
        {isDesktop && (
          <footer className="px-6 py-4 border-t border-border/50">
            <div className="flex items-center justify-between">
              <DeveloperWatermark variant="copyright" />
              <DeveloperWatermark variant="footer" />
            </div>
          </footer>
        )}
      </main>
    </div>
  );
}
