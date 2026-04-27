import { sql } from '@vercel/postgres';

/**
 * Product handles already used in auto weekly campaigns in the same calendar month as forDate.
 * Used to avoid repeating a product in the same month.
 */
export async function getProductHandlesUsedInMonth(forDate: Date): Promise<string[]> {
  const monthStart = new Date(Date.UTC(forDate.getUTCFullYear(), forDate.getUTCMonth(), 1));
  const monthEnd = new Date(Date.UTC(forDate.getUTCFullYear(), forDate.getUTCMonth() + 1, 0, 23, 59, 59));

  const result = await sql`
    SELECT metadata->'productHandles' AS handles
    FROM email_campaigns
    WHERE created_by IN ('auto-weekly', 'auto-campaign')
      AND scheduled_at IS NOT NULL
      AND scheduled_at >= ${monthStart.toISOString()}
      AND scheduled_at <= ${monthEnd.toISOString()}
      AND status IN ('pending_approval', 'scheduled', 'processing', 'completed')
  `;

  const allHandles: string[] = [];
  for (const row of result.rows) {
    const raw = row.handles;
    if (Array.isArray(raw)) {
      for (const h of raw) {
        if (typeof h === 'string' && h.trim()) allHandles.push(h.trim());
      }
    }
  }
  return [...new Set(allHandles)];
}

export type ProductUsageItem = { campaignName: string; scheduledAt: string };

/**
 * For each product handle, returns the list of previous auto weekly campaigns that used it
 * (so we can show "Product X was used in [date] email" in the approval UI).
 * Excludes the campaign with excludeCampaignId; includes completed/scheduled/processing
 * and older pending_approval campaigns.
 */
export async function getProductUsageForCampaign(
  excludeCampaignId: string,
  productHandles: string[],
  currentScheduledAt: string | null
): Promise<Record<string, ProductUsageItem[]>> {
  if (productHandles.length === 0) return {};

  const result = await sql`
    SELECT id, name, scheduled_at, metadata->'productHandles' AS handles
    FROM email_campaigns
    WHERE created_by IN ('auto-weekly', 'auto-campaign')
      AND id != ${excludeCampaignId}
      AND (
        status IN ('completed', 'scheduled', 'processing')
        OR (status = 'pending_approval' AND scheduled_at IS NOT NULL AND (${currentScheduledAt}::timestamptz IS NULL OR scheduled_at < ${currentScheduledAt}::timestamptz))
      )
    ORDER BY scheduled_at DESC NULLS LAST
  `;

  const usage: Record<string, ProductUsageItem[]> = {};
  for (const h of productHandles) {
    usage[h] = [];
  }

  for (const row of result.rows) {
    const rawHandles = row.handles;
    const campaignHandles = Array.isArray(rawHandles)
      ? (rawHandles as unknown[]).filter((x): x is string => typeof x === 'string' && x.trim() !== '')
      : [];
    const campaignName = (row.name as string) ?? 'Auto Weekly';
    const scheduledAt = row.scheduled_at
      ? new Date(row.scheduled_at as string).toISOString()
      : '';

    for (const handle of productHandles) {
      if (campaignHandles.includes(handle)) {
        usage[handle].push({ campaignName, scheduledAt });
      }
    }
  }

  return usage;
}
