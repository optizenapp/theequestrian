import type { CuratedProductCard, EmailBlock } from '@/lib/email-platform/types';

function parseProductNotes(introText: string, handles: string[]) {
  const lines = introText.split(/\n+/).map((line) => line.trim()).filter(Boolean);
  const notes = new Map<string, string>();
  let overviewEnd = lines.length;
  for (const handle of handles) {
    const idx = lines.findIndex((line) => line.includes(`(${handle})`));
    if (idx === -1) continue;
    overviewEnd = Math.min(overviewEnd, idx);
    const title = lines[idx];
    const body: string[] = [];
    for (let i = idx + 1; i < lines.length; i += 1) {
      if (handles.some((h) => lines[i].includes(`(${h})`))) break;
      body.push(lines[i]);
    }
    notes.set(handle, [title, ...body].join('\n'));
  }
  return {
    overview: lines.slice(0, overviewEnd).join('\n\n'),
    notes,
  };
}

function fallbackProductNote(card: CuratedProductCard): string {
  const price = card.compareAtPrice ? `${card.price || ''} (was ${card.compareAtPrice})` : card.price || '';
  return [`${card.title || card.handle} (${card.handle})`, price].filter(Boolean).join('\n');
}

export function applyAlternatingProductLayout(
  blocks: EmailBlock[],
  cards: CuratedProductCard[],
  introText: string
): EmailBlock[] {
  const hasAlternatingProductBlocks = blocks.some((block) => block.id === 'auto-sale-product-1');
  if (!hasAlternatingProductBlocks) {
    const idx = blocks.findIndex((block) => block.type === 'curatedProducts');
    if (idx === -1) return blocks;
    return blocks.map((block, i) => (i === idx && block.type === 'curatedProducts' ? { ...block, products: cards } : block));
  }

  const parsed = parseProductNotes(introText, cards.map((card) => card.handle));
  return blocks.map((block) => {
    if (block.id === 'auto-sale-overview' && block.type === 'llmIntro') {
      return { ...block, text: parsed.overview || 'A few selected sale picks worth a closer look.' };
    }
    const textMatch = block.id.match(/^auto-sale-product-text-(\d+)$/);
    if (textMatch && block.type === 'text') {
      const card = cards[Number(textMatch[1]) - 1];
      if (!card) return { ...block, text: '' };
      return { ...block, text: parsed.notes.get(card.handle) || fallbackProductNote(card) };
    }
    const productMatch = block.id.match(/^auto-sale-product-(\d+)$/);
    if (productMatch && block.type === 'curatedProducts') {
      const card = cards[Number(productMatch[1]) - 1];
      return { ...block, products: card ? [card] : [] };
    }
    return block;
  });
}
