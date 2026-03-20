import { sql } from '@vercel/postgres';
import { createTemplate, listTemplates } from '@/lib/email-platform/templates';
import type { EmailBlock } from '@/lib/email-platform/types';

const AUTO_WEEKLY_FLOW_NAME = 'Auto Weekly Flow';

export type AutoWeeklyFlowTemplate = {
  templateId: string;
  versionId: string;
};

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
