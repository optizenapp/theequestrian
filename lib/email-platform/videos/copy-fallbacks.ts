import type { SlideCopy, SlideCopyContext } from './copy-types';

export function buildFallbackSlideCopy(input: SlideCopyContext): SlideCopy {
  const name = safeTitle(input.displayName, input.variant === 'on_sale' ? 'Sale Picks' : 'Collection');
  const link = buildShortLink(input.ctaUrl, input.categoryHandle);

  if (input.variant === 'on_sale') {
    return {
      s1: {
        eyebrow: 'On Sale',
        title: short(input.subjectLine, 72),
        subtitle: 'Refresh the kit your rider relies on.',
      },
      s2: {
        eyebrow: 'This Week',
        title: 'Restock the everyday basics',
        subtitle: 'A tight edit of rider gear worth grabbing now.',
        cta: 'Shop the sale',
        linkText: link || 'theequestrian.com.au/on-sale',
      },
      s3: { eyebrow: 'Picks', title: 'Rider favourites this week' },
      s4: { eyebrow: 'On Sale', title: 'See the full sale', cta: 'Shop the sale' },
    };
  }

  if (input.variant === 'category') {
    return {
      s1: {
        eyebrow: name,
        title: short(input.subjectLine, 72),
        subtitle: `A tight edit of ${name.toLowerCase()} for everyday riding.`,
      },
      s2: {
        eyebrow: name,
        title: `Built for the way you ride`,
        subtitle: `Fit, feel and finish that holds up in the paddock and the arena.`,
        cta: `Shop ${name}`,
        linkText: '',
      },
      s3: { eyebrow: 'Picks', title: `${name} we rate` },
      s4: { eyebrow: name, title: `Browse the ${name} edit`, cta: `Shop ${name}` },
    };
  }

  return {
    s1: {
      eyebrow: name,
      title: short(input.subjectLine, 72),
      subtitle: `Inside the ${name} range at The Equestrian.`,
    },
    s2: {
      eyebrow: name,
      title: `Why riders choose ${name}`,
      subtitle: short(input.aboutText || `A focused range built for working riders.`, 170),
      cta: `Explore ${name}`,
      linkText: link || 'theequestrian.com.au',
    },
    s3: { eyebrow: 'Picks', title: `Standouts from ${name}` },
    s4: { eyebrow: name, title: `Browse the ${name} range`, cta: `Shop ${name}` },
  };
}

function safeTitle(value: string, fallback: string): string {
  const clean = value.replace(/\s+/g, ' ').trim();
  return clean || fallback;
}

function short(value: string, max: number): string {
  const clean = value.replace(/\s+/g, ' ').trim();
  if (clean.length <= max) return clean;
  const cut = clean.slice(0, max);
  const idx = cut.lastIndexOf(' ');
  return `${(idx > 20 ? cut.slice(0, idx) : cut).trim()}…`;
}

function buildShortLink(ctaUrl: string, handle: string | null): string {
  try {
    const u = new URL(ctaUrl);
    const p = u.pathname.replace(/\/+$/, '') || '/';
    return `${u.hostname}${p}`;
  } catch {
    if (handle && handle.trim()) return `theequestrian.com.au/${handle.trim()}`;
    return '';
  }
}

