/**
 * GA4 cross-domain linker: decorate outbound Shopify checkout URLs with `_gl`
 * when gtag auto-linker runs (temporary anchor + rAF). Falls back if gtag is missing.
 */

const FALLBACK_MS = 1000;

function getGtag(): ((...args: unknown[]) => void) | undefined {
  if (typeof window === 'undefined') return undefined;
  const w = window as unknown as { gtag?: (...args: unknown[]) => void };
  return typeof w.gtag === 'function' ? w.gtag : undefined;
}

/** Plain left-click only — allow new tab / modified clicks for native anchor behavior. */
export function isPlainLeftClick(e: {
  metaKey: boolean;
  ctrlKey: boolean;
  shiftKey: boolean;
  altKey: boolean;
  button: number;
}): boolean {
  return (
    !e.metaKey &&
    !e.ctrlKey &&
    !e.shiftKey &&
    !e.altKey &&
    e.button === 0
  );
}

export function redirectToDecoratedCheckout(url: string): void {
  if (typeof window === 'undefined') return;

  if (!getGtag()) {
    window.location.href = url;
    return;
  }

  try {
    const link = document.createElement('a');
    link.href = url;
    link.target = '_self';
    link.rel = 'noopener noreferrer';
    link.setAttribute('aria-hidden', 'true');
    link.tabIndex = -1;
    link.style.cssText = 'position:absolute;left:-9999px;width:1px;height:1px;overflow:hidden';
    document.body.appendChild(link);

    const timeoutId = setTimeout(() => {
      const decorated = link.href;
      if (link.parentNode) {
        link.remove();
      }
      window.location.href = decorated;
    }, FALLBACK_MS);

    requestAnimationFrame(() => {
      clearTimeout(timeoutId);
      const decorated = link.href;
      if (link.parentNode) {
        link.remove();
      }
      window.location.href = decorated;
    });
  } catch (err) {
    console.error('[ga4-linker] redirect setup failed', err);
    window.location.href = url;
  }
}
