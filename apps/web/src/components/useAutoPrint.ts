import { useEffect, useRef } from 'react';

/** True when this print page was loaded inside the hidden frame of `printInPlace` (see print.tsx). */
const embedded = window.parent !== window;
const tellParent = (type: 'hms-print-ready' | 'hms-print-blocked') => window.parent.postMessage({ type }, window.location.origin);

/**
 * Print pages. Opened on their own: the browser's print dialog opens by itself, once, when the page is
 * ready and its fonts and images (the logo) have loaded -- not again on a refetch; the Print button prints again.
 * Loaded in the hidden print frame: tells the screen that asked, which opens the dialog without leaving it.
 * `blocked`: there is nothing to print (payment pending, an error, no results) -- the screen then shows this page instead.
 */
export function useAutoPrint(ready: boolean, blocked = false) {
  const printed = useRef(false);
  useEffect(() => {
    if (embedded && blocked) tellParent('hms-print-blocked');
  }, [blocked]);
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
      if (embedded) tellParent('hms-print-ready');
      else window.print();
    });
    return () => {
      cancelled = true;
    };
  }, [ready]);
}
