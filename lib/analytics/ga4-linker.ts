/**
 * GA4 cross-domain linker: decorate outbound Shopify checkout URLs with `_gl`
 * when gtag auto-linker runs (temporary anchor + rAF). Falls back if gtag is missing.
 */

import {
  ensurePerformCartAttribute,
} from '@/lib/analytics/perform';

const FALLBACK_MS = 1000;
const LINKER_DEBUG_KEY = 'ga4-linker-debug';

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

function recordLinkerDebug(stage: string, details: Record<string, unknown>) {
  if (typeof window === 'undefined') return;
  console.log(`[ga4-linker] ${stage}`, details);
  try {
    const existing = window.sessionStorage.getItem(LINKER_DEBUG_KEY);
    const events = existing ? (JSON.parse(existing) as Array<Record<string, unknown>>) : [];
    events.push({
      stage,
      timestamp: new Date().toISOString(),
      ...details,
    });
    window.sessionStorage.setItem(LINKER_DEBUG_KEY, JSON.stringify(events.slice(-20)));
  } catch {
    // Ignore storage errors while preserving navigation.
  }
}

export async function prepareCheckoutRedirect(
  url: string,
  options: { source?: string; cartId?: string } = {}
): Promise<void> {
  if (options.cartId) {
    await ensurePerformCartAttribute(options.cartId);
  }

  redirectToDecoratedCheckout(url, options.source ?? 'unknown');
}

export function bindDecoratedCheckoutLink(
  link: HTMLAnchorElement,
  options: {
    source: string;
    cartId?: string;
    onPlainLeftClick?: () => void;
  }
) {
  const handleClick = (event: MouseEvent) => {
    recordLinkerDebug('link click observed', {
      source: options.source,
      href: link.href,
      plainLeftClick: isPlainLeftClick(event),
    });

    if (!isPlainLeftClick(event)) {
      return;
    }

    event.preventDefault();
    options.onPlainLeftClick?.();
    void prepareCheckoutRedirect(link.href, {
      source: options.source,
      cartId: options.cartId,
    });
  };

  link.addEventListener('click', handleClick, { capture: true });
  return () => link.removeEventListener('click', handleClick, { capture: true });
}

export function redirectToDecoratedCheckout(url: string, source = 'unknown'): void {
  if (typeof window === 'undefined') return;

  recordLinkerDebug('redirect called', { source, url });

  if (!getGtag()) {
    recordLinkerDebug('gtag unavailable', { source, url });
    window.location.href = url;
    return;
  }

  recordLinkerDebug('gtag available', { source, url });

  try {
    const link = document.createElement('a');
    link.href = url;
    link.target = '_self';
    link.rel = 'noopener noreferrer';
    link.setAttribute('aria-hidden', 'true');
    link.tabIndex = -1;
    link.style.cssText = 'position:absolute;left:-9999px;width:1px;height:1px;overflow:hidden';
    document.body.appendChild(link);

    recordLinkerDebug('anchor appended', {
      source,
      originalUrl: url,
      currentHref: link.href,
    });

    const timeoutId = setTimeout(() => {
      const decorated = link.href;
      recordLinkerDebug('timeout fallback', {
        source,
        originalUrl: url,
        decoratedUrl: decorated,
      });
      if (link.parentNode) {
        link.remove();
      }
      window.location.href = decorated;
    }, FALLBACK_MS);

    requestAnimationFrame(() => {
      clearTimeout(timeoutId);
      const decorated = link.href;
      recordLinkerDebug('raf complete', {
        source,
        originalUrl: url,
        decoratedUrl: decorated,
      });
      if (link.parentNode) {
        link.remove();
      }
      window.location.href = decorated;
    });
  } catch (err) {
    console.error('[ga4-linker] redirect setup failed', err);
    recordLinkerDebug('redirect setup failed', {
      source,
      url,
      message: err instanceof Error ? err.message : 'unknown error',
    });
    window.location.href = url;
  }
}
