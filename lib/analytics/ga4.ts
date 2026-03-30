export function trackGaEvent(
  name: string,
  params?: Record<string, string | number | boolean | null | undefined | object>
) {
  if (typeof window === 'undefined') return;
  const gtag = (window as unknown as { gtag?: (...args: unknown[]) => void }).gtag;
  if (typeof gtag !== 'function') return;
  gtag('event', name, params);
}
