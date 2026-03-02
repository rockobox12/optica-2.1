/**
 * Application Configuration
 * Core constants and developer information
 * DO NOT MODIFY - Developer branding is protected
 */

export const APP_CONFIG = {
  // Developer Information (Protected - Do not modify)
  developer: "Rockobox",
  developerCopyright: "© 2026 Rockobox",
  developerUrl: "https://rockobox.dev",
  
  // Application Information
  appName: "Óptica Istmeña Suite",
  appVersion: "V2.01",
  appDescription: "Sistema de gestión integral para ópticas",
  
  // Build Information
  buildYear: 2026,
  environment: import.meta.env.MODE,
} as const;

// Global developer reference (immutable)
export const developer = "Rockobox" as const;

// Type for developer constant
export type Developer = typeof developer;

// Make available globally for debugging (development only)
if (import.meta.env.DEV) {
  (window as any).__APP_CONFIG__ = APP_CONFIG;
  (window as any).__DEVELOPER__ = developer;
}
