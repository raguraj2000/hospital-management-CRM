import type { AnchorHTMLAttributes, MouseEvent } from 'react';

const ANSWER_TIMEOUT_MS = 15_000;

/**
 * Prints one of the print pages WITHOUT leaving the current screen: the page loads in a hidden frame
 * and says when it is ready (useAutoPrint), then the print dialog opens over the screen the user is on.
 * If there is nothing to print (payment pending, an error) or the frame never answers, the print page
 * itself is opened so the user sees why.
 */
export function printInPlace(url: string) {
  const frame = document.createElement('iframe');
  frame.setAttribute('aria-hidden', 'true');
  frame.tabIndex = -1;
  // Off-screen at paper width (not display:none, which some browsers print blank).
  frame.style.cssText = 'position:fixed;left:-10000px;top:0;width:210mm;height:297mm;border:0;';
  let timer = window.setTimeout(() => openPage(), ANSWER_TIMEOUT_MS);
  const cleanup = () => {
    window.clearTimeout(timer);
    window.removeEventListener('message', onMessage);
    frame.remove();
  };
  const openPage = () => {
    cleanup();
    window.location.assign(url);
  };
  function onMessage(e: MessageEvent) {
    if (e.source !== frame.contentWindow || e.origin !== window.location.origin) return;
    if (e.data?.type === 'hms-print-blocked') openPage();
    if (e.data?.type === 'hms-print-ready') {
      window.clearTimeout(timer);
      const w = frame.contentWindow!;
      // Remove the frame once the dialog is closed (print() returns at once in some browsers), or after a long while.
      w.addEventListener('afterprint', () => window.setTimeout(cleanup, 500), { once: true });
      timer = window.setTimeout(cleanup, 10 * 60_000);
      w.focus();
      w.print();
    }
  }
  window.addEventListener('message', onMessage);
  frame.src = url;
  document.body.appendChild(frame);
}

/**
 * A link to a print page that prints in place on a normal click. It stays a real link, so
 * "open in new tab" still shows the page.
 */
export function PrintLink({ href, onClick, ...props }: AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) {
  return (
    <a
      href={href}
      onClick={(e: MouseEvent<HTMLAnchorElement>) => {
        onClick?.(e);
        if (e.defaultPrevented || e.button !== 0 || e.ctrlKey || e.metaKey || e.shiftKey || e.altKey) return;
        e.preventDefault();
        printInPlace(href);
      }}
      {...props}
    />
  );
}
