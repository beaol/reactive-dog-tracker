import { Platform } from 'react-native';

/**
 * Web-only setup for the installed (Add to Home Screen) app:
 *  - registers the service worker so the app opens offline;
 *  - asks the browser to keep this site's storage persistent, so the dog data
 *    isn't cleared to free up space.
 * No-op on iOS/Android native builds and in development.
 */
export function setUpWebApp(): void {
  if (Platform.OS !== 'web' || typeof window === 'undefined' || __DEV__) return;

  if ('serviceWorker' in navigator) {
    // sw.js sits next to manifest.json at the app's base path (root, or /<repo>/ on GitHub Pages).
    const manifest = document.querySelector<HTMLLinkElement>('link[rel="manifest"]');
    const swUrl = manifest ? new URL('sw.js', manifest.href).href : '/sw.js';
    const register = () =>
      navigator.serviceWorker.register(swUrl).catch((e) => console.warn('Service worker registration failed', e));
    if (document.readyState === 'complete') register();
    else window.addEventListener('load', register);
  }

  navigator.storage?.persist?.().catch(() => {});
}

/** True when running as an installed home-screen web app. */
export function isInstalledWebApp(): boolean {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return false;
  return (
    window.matchMedia?.('(display-mode: standalone)').matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}
