import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Initialize app configuration
import { APP_CONFIG, developer } from "./config/app";

// Log developer info in development
if (import.meta.env.DEV) {
  console.log(`%c${APP_CONFIG.appName} v${APP_CONFIG.appVersion}`, 'font-size: 16px; font-weight: bold;');
  console.log(`%cDesarrollado por ${developer}`, 'color: #888;');
}

// Register Service Worker for PWA
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  });
}

createRoot(document.getElementById("root")!).render(<App />);
