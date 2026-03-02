import { forwardRef } from 'react';

/**
 * Rockobox Developer Watermark Component
 * This component displays the developer attribution.
 * 
 * IMPORTANT: This watermark is hardcoded and cannot be:
 * - Edited from the user interface
 * - Disabled from the admin panel
 * - Modified without code access
 * 
 * @author Rockobox
 * @year 2026
 */

interface DeveloperWatermarkProps {
  variant?: 'footer' | 'subtle' | 'copyright';
  className?: string;
}

const DEVELOPER_NAME = 'Rockobox';
const YEAR = 2026;

export const DeveloperWatermark = forwardRef<HTMLParagraphElement, DeveloperWatermarkProps>(
  function DeveloperWatermark({ variant = 'subtle', className = '' }, ref) {
    const baseStyles = 'select-none pointer-events-none';
    
    switch (variant) {
      case 'copyright':
        // Full copyright for admin footer/header
        return (
          <p ref={ref} className={`${baseStyles} text-xs text-muted-foreground/60 ${className}`}>
            © {YEAR} {DEVELOPER_NAME}
          </p>
        );
      
      case 'footer':
        // Footer style with "Desarrollado por"
        return (
          <p ref={ref} className={`${baseStyles} text-[10px] text-muted-foreground/50 ${className}`}>
            Desarrollado por {DEVELOPER_NAME}
          </p>
        );
      
      case 'subtle':
      default:
        // Most discrete version for login/profile
        return (
          <p ref={ref} className={`${baseStyles} text-[10px] text-muted-foreground/40 ${className}`}>
            Desarrollado por {DEVELOPER_NAME}
          </p>
        );
    }
  }
);
