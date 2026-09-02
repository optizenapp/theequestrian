import { sql } from '@/lib/db/vercel-postgres';
import { createTemplate, createTemplateVersion, getTemplateVersion, listTemplates } from '@/lib/email-platform/templates';
import type { EmailBlock } from '@/lib/email-platform/types';

const AUTO_WEEKLY_FLOW_NAME = 'Auto Weekly Flow';
const AUTO_ON_SALE_FLOW_NAME = 'Auto On-Sale Product Flow';

export type AutoWeeklyFlowTemplate = {
  templateId: string;
  versionId: string;
};

function buildAutoOnSaleBlocks(): EmailBlock[] {
  return [
    { id: 'auto-sale-heading', type: 'heading', level: 2, text: 'Selected sale picks', align: 'center', fontSize: 28 },
    { id: 'auto-sale-intro', type: 'llmIntro', text: 'Check out our latest on-sale products designed for both you and your horse.', align: 'left', fontSize: 16 },
    { id: 'auto-sale-product-1', type: 'curatedProducts', products: [], showDividers: true, align: 'center', fontSize: 16 },
    { id: 'auto-sale-product-2', type: 'curatedProducts', products: [], showDividers: true, align: 'center', fontSize: 16 },
    { id: 'auto-sale-product-3', type: 'curatedProducts', products: [], showDividers: true, align: 'center', fontSize: 16 },
    { id: 'auto-sale-cta', type: 'text', text: '[VIEW ALL SALE ITEMS HERE](https://www.theequestrian.com.au/on-sale)', align: 'center', fontSize: 16 },
    { id: 'auto-sale-footer', type: 'footer', text: 'The Equestrian\n{{siteUrl}}\n\nUnsubscribe: {{unsubscribeUrl}}', align: 'left', fontSize: 13 },
  ];
}

/**
 * Ensures the "Auto Weekly Flow" template exists. Creates it if not.
 * Returns template id and active version id for use in campaigns.
 */
export async function ensureAutoWeeklyFlowTemplate(): Promise<AutoWeeklyFlowTemplate | null> {
  const list = await listTemplates(100);
  const existing = list.find((t) => t.name === AUTO_WEEKLY_FLOW_NAME);
  if (existing?.activeVersionId) {
    return { templateId: existing.id, versionId: existing.activeVersionId };
  }

  const blocks: EmailBlock[] = [
    {
      id: 'auto-intro',
      type: 'text',
      text: 'This week we\'ve picked some highlights for you.',
      align: 'left',
      fontSize: 16,
    },
    {
      id: 'auto-products',
      type: 'curatedProducts',
      products: [],
      showDividers: true,
      align: 'center',
      fontSize: 16,
    },
  ];

  const { templateId, versionId } = await createTemplate({
    name: AUTO_WEEKLY_FLOW_NAME,
    templateType: 'campaign',
    subjectTemplate: 'Your weekly picks from The Equestrian',
    blocks,
    fromName: 'The Equestrian',
    fromEmail: 'support@theequestrian.com.au',
  });

  return { templateId, versionId };
}

/**
 * Get template and version id by name. Returns null if not found.
 */
export async function getAutoWeeklyFlowVersionId(): Promise<string | null> {
  const list = await listTemplates(100);
  const existing = list.find((t) => t.name === AUTO_WEEKLY_FLOW_NAME);
  return existing?.activeVersionId ?? null;
}

export async function ensureAutoOnSaleFlowTemplate(): Promise<AutoWeeklyFlowTemplate | null> {
  const list = await listTemplates(100);
  const existing = list.find((t) => t.name === AUTO_ON_SALE_FLOW_NAME);
  if (existing?.activeVersionId) {
    const active = await getTemplateVersion(existing.activeVersionId);
    const matchesCurrentLayout =
      active?.blocks.some((b) => b.id === 'auto-sale-intro') === true &&
      active.blocks.some((b) => b.id === 'auto-sale-product-3') &&
      !active.blocks.some((b) => b.id === 'auto-sale-product-text-1');
    if (!matchesCurrentLayout) {
      const next = await createTemplateVersion({
        templateId: existing.id,
        subjectTemplate: 'Selected sale picks',
        blocks: buildAutoOnSaleBlocks(),
        fromName: 'The Equestrian',
        fromEmail: 'support@theequestrian.com.au',
        setActive: true,
      });
      return { templateId: existing.id, versionId: next.versionId };
    }
    return { templateId: existing.id, versionId: existing.activeVersionId };
  }

  const { templateId, versionId } = await createTemplate({
    name: AUTO_ON_SALE_FLOW_NAME,
    templateType: 'campaign',
    subjectTemplate: 'Selected sale picks',
    blocks: buildAutoOnSaleBlocks(),
    fromName: 'The Equestrian',
    fromEmail: 'support@theequestrian.com.au',
  });

  return { templateId, versionId };
}
