import { useEffect } from 'react';

/**
 * iOS keyboard handling hook.
 * When an input receives focus on mobile, scrolls it into view
 * so the iOS keyboard doesn't cover it.
 * Also prevents iOS auto-zoom on inputs < 16px.
 */
export function useIOSKeyboard(containerRef?: React.RefObject<HTMLElement | null>) {
  useEffect(() => {
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || 
      (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    
    const isMobile = window.innerWidth < 768;
    
    if (!isIOS && !isMobile) return;

    const handleFocusIn = (e: FocusEvent) => {
      const target = e.target as HTMLElement;
      if (!target) return;
      
      const isInput = target.tagName === 'INPUT' || 
                      target.tagName === 'TEXTAREA' || 
                      target.tagName === 'SELECT' ||
                      target.isContentEditable;
      
      if (!isInput) return;

      // Delay to let iOS keyboard appear
      setTimeout(() => {
        target.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'center',
          inline: 'nearest'
        });
      }, 300);
    };

    const container = containerRef?.current || document;
    container.addEventListener('focusin', handleFocusIn, { passive: true });
    
    return () => {
      container.removeEventListener('focusin', handleFocusIn);
    };
  }, [containerRef]);
}
