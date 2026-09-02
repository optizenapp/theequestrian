import { sql } from '@/lib/db/vercel-postgres';
import { logEmailAudit } from '@/lib/email-platform/audit';
import { recomputeCustomerAffinities, recomputeCustomerAggregates } from '@/lib/email-platform/orders';

type ContactRow = {
  id: string;
  primary_email: string;
  created_at: string;
};

type SubscriptionStatus = 'suppressed' | 'unsubscribed' | 'subscribed' | 'pending';

function canonicalEmail(email: string): string {
  const normalized = email.trim().toLowerCase();
  const [localRaw, domainRaw] = normalized.split('@');
  if (!localRaw || !domainRaw) return normalized;

  const domain = domainRaw === 'googlemail.com' ? 'gmail.com' : domainRaw;
  let local = localRaw;
  if (domain === 'gmail.com') {
    local = local.split('+')[0].replace(/\./g, '');
  } else {
    local = local.split('+')[0];
  }
  return `${local}@${domain}`;
}

function rankStatus(status: string | null | undefined): number {
  const normalized = (status || 'pending').toLowerCase();
  const order: Record<string, number> = {
    suppressed: 4,
    unsubscribed: 3,
    subscribed: 2,
    pending: 1,
  };
  return order[normalized] || 1;
}

async function mergeSubscriptions(winnerId: string, loserId: string): Promise<void> {
  const rows = await sql`
    SELECT contact_id, status, source, suppression_reason
    FROM email_subscriptions
    WHERE contact_id IN (${winnerId}, ${loserId})
  `;

  let finalStatus: SubscriptionStatus = 'pending';
  let source = 'dedupe_merge';
  let suppressionReason: string | null = null;

  for (const row of rows.rows) {
    const current = (row.status as string | null) || 'pending';
    if (rankStatus(current) > rankStatus(finalStatus)) {
      finalStatus = current as SubscriptionStatus;
      source = (row.source as string | null) || source;
      suppressionReason = (row.suppression_reason as string | null) || suppressionReason;
    }
  }

  await sql`
    INSERT INTO email_subscriptions (
      contact_id,
      status,
      source,
      suppression_reason,
      updated_at
    )
    VALUES (
      ${winnerId},
      ${finalStatus},
      ${source},
      ${suppressionReason},
      NOW()
    )
    ON CONFLICT (contact_id)
    DO UPDATE SET
      status = ${finalStatus},
      source = ${source},
      suppression_reason = ${suppressionReason},
      updated_at = NOW()
  `;

  await sql`DELETE FROM email_subscriptions WHERE contact_id = ${loserId}`;
}

async function moveManyToMany(winnerId: string, loserId: string): Promise<void> {
  await sql`
    INSERT INTO email_list_memberships (list_id, contact_id, source, created_at)
    SELECT list_id, ${winnerId}, source, created_at
    FROM email_list_memberships
    WHERE contact_id = ${loserId}
    ON CONFLICT (list_id, contact_id) DO NOTHING
  `;
  await sql`DELETE FROM email_list_memberships WHERE contact_id = ${loserId}`;

  await sql`
    INSERT INTO email_segment_memberships (segment_id, contact_id, computed_at)
    SELECT segment_id, ${winnerId}, computed_at
    FROM email_segment_memberships
    WHERE contact_id = ${loserId}
    ON CONFLICT (segment_id, contact_id) DO NOTHING
  `;
  await sql`DELETE FROM email_segment_memberships WHERE contact_id = ${loserId}`;

  await sql`
    INSERT INTO email_campaign_recipients (
      campaign_id, contact_id, email, status, skip_reason, provider_message_id, scheduled_at, sent_at, delivered_at, created_at, updated_at
    )
    SELECT
      campaign_id,
      ${winnerId},
      email,
      status,
      skip_reason,
      provider_message_id,
      scheduled_at,
      sent_at,
      delivered_at,
      created_at,
      updated_at
    FROM email_campaign_recipients
    WHERE contact_id = ${loserId}
    ON CONFLICT (campaign_id, contact_id) DO NOTHING
  `;
  await sql`DELETE FROM email_campaign_recipients WHERE contact_id = ${loserId}`;

  await sql`
    INSERT INTO email_sequence_enrollments (
      sequence_id, sequence_version_id, contact_id, status, current_step_order, enrolled_at, next_run_at, exited_at, exit_reason, metadata
    )
    SELECT
      sequence_id,
      sequence_version_id,
      ${winnerId},
      status,
      current_step_order,
      enrolled_at,
      next_run_at,
      exited_at,
      exit_reason,
      metadata
    FROM email_sequence_enrollments
    WHERE contact_id = ${loserId}
    ON CONFLICT (sequence_id, sequence_version_id, contact_id) DO NOTHING
  `;
  await sql`DELETE FROM email_sequence_enrollments WHERE contact_id = ${loserId}`;
}

async function moveSingleFKRows(winnerId: string, loserId: string): Promise<void> {
  await sql`UPDATE customer_order_facts SET contact_id = ${winnerId} WHERE contact_id = ${loserId}`;
  await sql`UPDATE email_sends SET contact_id = ${winnerId} WHERE contact_id = ${loserId}`;
}

async function mergeContactIdentities(winnerId: string, loserId: string): Promise<void> {
  await sql`
    INSERT INTO email_contact_identities (
      contact_id, provider, external_id, external_email, metadata, created_at
    )
    SELECT
      ${winnerId},
      provider,
      external_id,
      external_email,
      metadata,
      created_at
    FROM email_contact_identities
    WHERE contact_id = ${loserId}
    ON CONFLICT (provider, external_id) DO NOTHING
  `;
  await sql`DELETE FROM email_contact_identities WHERE contact_id = ${loserId}`;
}

async function mergeContactAffinityRows(winnerId: string, loserId: string): Promise<void> {
  await sql`
    INSERT INTO customer_product_affinity (
      contact_id, product_type, vendor, product_handle, order_count, total_spend, updated_at
    )
    SELECT
      ${winnerId},
      product_type,
      vendor,
      product_handle,
      order_count,
      total_spend,
      updated_at
    FROM customer_product_affinity
    WHERE contact_id = ${loserId}
    ON CONFLICT (contact_id, product_type, vendor, product_handle)
    DO UPDATE SET
      order_count = customer_product_affinity.order_count + EXCLUDED.order_count,
      total_spend = customer_product_affinity.total_spend + EXCLUDED.total_spend,
      updated_at = NOW()
  `;
  await sql`DELETE FROM customer_product_affinity WHERE contact_id = ${loserId}`;
}

async function mergeSingleDuplicateGroup(winner: ContactRow, losers: ContactRow[]): Promise<void> {
  for (const loser of losers) {
    await mergeSubscriptions(winner.id, loser.id);
    await moveManyToMany(winner.id, loser.id);
    await moveSingleFKRows(winner.id, loser.id);
    await mergeContactIdentities(winner.id, loser.id);
    await mergeContactAffinityRows(winner.id, loser.id);
    await sql`DELETE FROM customer_aggregate_metrics WHERE contact_id = ${loser.id}`;
    await sql`DELETE FROM email_contacts WHERE id = ${loser.id}`;

    await logEmailAudit({
      actor: 'admin',
      action: 'contact_deduped',
      entityType: 'email_contact',
      entityId: winner.id,
      payload: {
        winnerId: winner.id,
        loserId: loser.id,
        winnerEmail: winner.primary_email,
        loserEmail: loser.primary_email,
      },
    });
  }
}

export async function runContactDedupe(input?: {
  dryRun?: boolean;
}): Promise<{
  duplicateGroupCount: number;
  duplicateContactCount: number;
  mergedCount: number;
  groups: Array<{ canonicalEmail: string; winnerId: string; loserIds: string[]; emails: string[] }>;
}> {
  const dryRun = input?.dryRun !== false;
  const contacts = await sql`
    SELECT id, primary_email, created_at
    FROM email_contacts
    ORDER BY created_at ASC
  `;

  const groupsMap = new Map<string, ContactRow[]>();
  for (const row of contacts.rows) {
    const contact: ContactRow = {
      id: row.id as string,
      primary_email: (row.primary_email as string).trim().toLowerCase(),
      created_at: row.created_at as string,
    };
    const key = canonicalEmail(contact.primary_email);
    const list = groupsMap.get(key) || [];
    list.push(contact);
    groupsMap.set(key, list);
  }

  const groups = Array.from(groupsMap.entries())
    .filter(([, list]) => list.length > 1)
    .map(([key, list]) => {
      const sorted = [...list].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
      return {
        canonicalEmail: key,
        winner: sorted[0],
        losers: sorted.slice(1),
      };
    });

  if (!dryRun) {
    for (const group of groups) {
      await mergeSingleDuplicateGroup(group.winner, group.losers);
    }
    await recomputeCustomerAggregates();
    await recomputeCustomerAffinities();
  }

  return {
    duplicateGroupCount: groups.length,
    duplicateContactCount: groups.reduce((sum, group) => sum + group.losers.length, 0),
    mergedCount: dryRun ? 0 : groups.reduce((sum, group) => sum + group.losers.length, 0),
    groups: groups.slice(0, 100).map((group) => ({
      canonicalEmail: group.canonicalEmail,
      winnerId: group.winner.id,
      loserIds: group.losers.map((loser) => loser.id),
      emails: [group.winner.primary_email, ...group.losers.map((loser) => loser.primary_email)],
    })),
  };
}
