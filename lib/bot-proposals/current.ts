import { readCopy } from './copy-store';
import { readProductCopy } from './product-store';
import type { ContentFields, ProposalTarget } from './types';

export type CurrentContent = {
  fields: ContentFields | null;
  /** Product only: which override fields currently render on the PDP. */
  flags: Record<string, boolean> | null;
};

/** Live stored values for the page, read fresh (not the bot's snapshot). */
export async function loadCurrent(target: ProposalTarget): Promise<CurrentContent> {
  if (!target.key) return { fields: null, flags: null };
  if (target.type === 'product') {
    const product = await readProductCopy(target.key);
    return { fields: product.values, flags: product.flags };
  }
  if (target.type === 'category' || target.type === 'brand') {
    return { fields: await readCopy(target.type, target.key), flags: null };
  }
  return { fields: null, flags: null };
}
