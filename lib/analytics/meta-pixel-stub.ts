'use client';

type FbqFn = ((...args: unknown[]) => void) & {
  callMethod?: (...args: unknown[]) => void;
  queue?: unknown[][];
  loaded?: boolean;
  version?: string;
  push?: unknown;
};

type WindowWithFbq = Window & { fbq?: FbqFn; _fbq?: FbqFn };

export function installMetaPixelStub() {
  if (typeof window === 'undefined') return;
  const w = window as WindowWithFbq;
  if (typeof w.fbq === 'function') return;
  const fbq: FbqFn = function (...args: unknown[]) {
    if (fbq.callMethod) {
      fbq.callMethod(...args);
    } else {
      (fbq.queue = fbq.queue || []).push(args);
    }
  };
  fbq.push = fbq;
  fbq.loaded = true;
  fbq.version = '2.0';
  fbq.queue = [];
  w.fbq = fbq;
  w._fbq = fbq;
}

export function getMetaFbq(): FbqFn | undefined {
  if (typeof window === 'undefined') return undefined;
  return (window as WindowWithFbq).fbq;
}
