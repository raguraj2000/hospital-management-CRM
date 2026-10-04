import { useEffect, useRef } from 'react';

/**
 * Print pages: opens the browser's print dialog by itself, once, when the page is ready and its
 * fonts and images (the logo) have loaded. Not again on a refetch or re-render -- the Print button prints again.
 */
export function useAutoPrint(ready: boolean) {
  const printed = useRef(false);
  useEffect(() => {
    if (!ready || printed.current) return;
    let cancelled = false; // StrictMode runs effects twice in development: the first run is cancelled
    const images = Array.from(document.images)
      .filter((img) => !img.complete)
      .map(
        (img) =>
          new Promise<void>((done) => {
            img.addEventListener('load', () => done(), { once: true });
            img.addEventListener('error', () => done(), { once: true });
          }),
      );
    void Promise.all([document.fonts?.ready, ...images]).then(() => {
      if (cancelled || printed.current) return;
      printed.current = true;
      window.print();
    });
    return () => {
      cancelled = true;
    };
  }, [ready]);
}
