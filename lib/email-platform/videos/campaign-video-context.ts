import { sql } from '@/lib/db/vercel-postgres';
import { getProductByHandle } from '@/lib/shopify/products';
import { resolveBrandLogoBuffer } from './brand-logo-resolver';

export type CampaignVideoRow = {
  id: string;
  name: string;
  status: string;
  template_subject: string | null;
  template_blocks: unknown;
  metadata: Record<string, unknown> | null;
  created_by: string | null;
};

export function getCampaignProductHandles(metadata: Record<string, unknown> | null): string[] {
  const raw = metadata?.productHandles;
  if (!Array.isArray(raw)) return [];
  return raw.filter((item): item is string => typeof item === 'string' && item.trim().length > 0);
}

export async function loadCampaignVideoRow(campaignId: string): Promise<CampaignVideoRow> {
  const result = await sql`
    SELECT c.id, c.name, c.status, c.metadata, c.created_by, tv.subject_template AS template_subject, tv.blocks AS template_blocks
    FROM email_campaigns c
    LEFT JOIN email_template_versions tv ON tv.id = c.template_version_id
    WHERE c.id = ${campaignId}
    LIMIT 1
  `;
  const row = result.rows[0] as CampaignVideoRow | undefined;
  if (!row) throw new Error('Campaign not found');
  return row;
}

export async function loadHeroImageBuffer(handles: string[]): Promise<Buffer | null> {
  const firstHandle = handles[0];
  if (!firstHandle) return null;
  try {
    const product = await getProductByHandle(firstHandle, { cache: 'no-store' });
    const imageUrl = product?.images?.edges?.[0]?.node?.url;
    if (!imageUrl) return null;
    const response = await fetch(imageUrl);
    if (!response.ok) return null;
    const bytes = await response.arrayBuffer();
    return Buffer.from(bytes);
  } catch {
    return null;
  }
}

export function resolveCampaignSubjectLine(campaign: CampaignVideoRow): string {
  const fromMeta =
    campaign.metadata && typeof campaign.metadata.subjectLine === 'string'
      ? campaign.metadata.subjectLine.trim()
      : '';
  const fromTemplate = (campaign.template_subject || '').trim();
  return fromMeta || fromTemplate;
}

export function resolveCampaignSubtitle(campaign: CampaignVideoRow): string {
  const fromMeta =
    campaign.metadata && typeof campaign.metadata.introText === 'string'
      ? campaign.metadata.introText.trim()
      : '';
  return fromMeta || 'Shop premium equestrian products at The Equestrian.';
}

export async function resolveCampaignLogoBuffer(campaign: CampaignVideoRow): Promise<Buffer | null> {
  return resolveBrandLogoBuffer(campaign);
}
