import type { CuratedProductCard, EmailBlock } from '@/lib/email-platform/types';

export function applyAlternatingProductLayout(
  blocks: EmailBlock[],
  cards: CuratedProductCard[],
  introText: string
): EmailBlock[] {
  const hasPerProductBlocks = blocks.some((block) => block.id === 'auto-sale-product-1');
  if (!hasPerProductBlocks) {
    const idx = blocks.findIndex((block) => block.type === 'curatedProducts');
    if (idx === -1) return blocks;
    return blocks.map((block, i) => (i === idx && block.type === 'curatedProducts' ? { ...block, products: cards } : block));
  }

  return blocks.map((block) => {
    if ((block.id === 'auto-sale-intro' || block.id === 'auto-sale-overview') && block.type === 'llmIntro') {
      return { ...block, text: introText.trim() || 'Check out our latest on-sale products designed for both you and your horse.' };
    }
    const productMatch = block.id.match(/^auto-sale-product-(\d+)$/);
    if (productMatch && block.type === 'curatedProducts') {
      const card = cards[Number(productMatch[1]) - 1];
      return { ...block, products: card ? [card] : [] };
    }
    return block;
  });
}
