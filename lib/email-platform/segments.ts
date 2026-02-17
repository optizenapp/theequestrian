import { sql } from '@vercel/postgres';
import type { SegmentCondition, SegmentRuleGroup } from '@/lib/email-platform/types';

function sqlColumnForField(field: SegmentCondition['field']): string {
  switch (field) {
    case 'email':
      return 'c.primary_email';
    case 'order_count':
      return 'COALESCE(m.order_count, 0)::TEXT';
    case 'lifetime_value':
      return 'COALESCE(m.lifetime_value, 0)::TEXT';
    case 'average_order_value':
      return 'COALESCE(m.average_order_value, 0)::TEXT';
    case 'last_order_days_ago':
      return 'COALESCE(m.last_order_days_ago, 999999)::TEXT';
    case 'top_product_type':
      return "COALESCE((SELECT p.product_type FROM customer_product_affinity p WHERE p.contact_id = c.id ORDER BY p.order_count DESC LIMIT 1), '')";
    case 'top_vendor':
      return "COALESCE((SELECT p.vendor FROM customer_product_affinity p WHERE p.contact_id = c.id ORDER BY p.order_count DESC LIMIT 1), '')";
    case 'shopify_customer_tag':
      return "COALESCE(c.metadata->>'shopifyTags', '')";
    default:
      return "''";
  }
}

function matchesCondition(condition: SegmentCondition, candidateValue: string): boolean {
  const op = condition.operator;
  const raw = condition.value;

  if (op === 'in' && Array.isArray(raw)) {
    return raw.map((value) => String(value)).includes(candidateValue);
  }

  const target = Array.isArray(raw) ? String(raw[0] ?? '') : String(raw);

  if (op === 'contains') return candidateValue.toLowerCase().includes(target.toLowerCase());
  if (op === 'not_contains') return !candidateValue.toLowerCase().includes(target.toLowerCase());
  if (op === 'eq') return candidateValue === target;
  if (op === 'neq') return candidateValue !== target;

  const numericCandidate = Number(candidateValue);
  const numericTarget = Number(target);
  if (!Number.isFinite(numericCandidate) || !Number.isFinite(numericTarget)) {
    return false;
  }

  if (op === 'gt') return numericCandidate > numericTarget;
  if (op === 'gte') return numericCandidate >= numericTarget;
  if (op === 'lt') return numericCandidate < numericTarget;
  if (op === 'lte') return numericCandidate <= numericTarget;
  return false;
}

export async function evaluateSegmentMembership(segmentId: string): Promise<{ totalMembers: number }> {
  const segmentResult = await sql`
    SELECT rules
    FROM email_segments
    WHERE id = ${segmentId}
    LIMIT 1
  `;
  const rules = (segmentResult.rows[0]?.rules as SegmentRuleGroup | undefined) ?? {
    mode: 'all',
    conditions: [],
  };

  const contactsResult = await sql`
    SELECT
      c.id,
      c.primary_email,
      COALESCE(m.order_count, 0) AS order_count,
      COALESCE(m.lifetime_value, 0) AS lifetime_value,
      COALESCE(m.average_order_value, 0) AS average_order_value,
      COALESCE(m.last_order_days_ago, 999999) AS last_order_days_ago,
      COALESCE(
        (
          SELECT p.product_type
          FROM customer_product_affinity p
          WHERE p.contact_id = c.id
          ORDER BY p.order_count DESC
          LIMIT 1
        ),
        ''
      ) AS top_product_type,
      COALESCE(
        (
          SELECT p.vendor
          FROM customer_product_affinity p
          WHERE p.contact_id = c.id
          ORDER BY p.order_count DESC
          LIMIT 1
        ),
        ''
      ) AS top_vendor,
      COALESCE(c.metadata->>'shopifyTags', '') AS shopify_customer_tag
    FROM email_contacts c
    LEFT JOIN customer_aggregate_metrics m ON m.contact_id = c.id
  `;

  const matchedContactIds: string[] = [];
  const mode = rules.mode === 'any' ? 'any' : 'all';
  const conditions = Array.isArray(rules.conditions) ? rules.conditions : [];

  for (const row of contactsResult.rows) {
    const outcomes = conditions.map((condition) => {
      const key = condition.field;
      const value = String((row as Record<string, unknown>)[key] ?? '');
      return matchesCondition(condition, value);
    });

    const matched =
      conditions.length === 0 ? true : mode === 'all' ? outcomes.every(Boolean) : outcomes.some(Boolean);
    if (matched) {
      matchedContactIds.push(row.id as string);
    }
  }

  await sql`DELETE FROM email_segment_memberships WHERE segment_id = ${segmentId}`;

  for (const contactId of matchedContactIds) {
    await sql`
      INSERT INTO email_segment_memberships (segment_id, contact_id, computed_at)
      VALUES (${segmentId}, ${contactId}, NOW())
      ON CONFLICT (segment_id, contact_id) DO UPDATE SET computed_at = NOW()
    `;
  }

  await sql`
    UPDATE email_segments
    SET last_evaluated_at = NOW(),
        total_members = ${matchedContactIds.length},
        updated_at = NOW()
    WHERE id = ${segmentId}
  `;

  return { totalMembers: matchedContactIds.length };
}

export async function getResolvedAudienceContactIds(input: {
  listIds?: string[];
  segmentIds?: string[];
}): Promise<string[]> {
  const set = new Set<string>();

  for (const listId of input.listIds || []) {
    const listRows = await sql`
      SELECT contact_id
      FROM email_list_memberships
      WHERE list_id = ${listId}
    `;
    for (const row of listRows.rows) {
      set.add(row.contact_id as string);
    }
  }

  for (const segmentId of input.segmentIds || []) {
    const segmentRows = await sql`
      SELECT contact_id
      FROM email_segment_memberships
      WHERE segment_id = ${segmentId}
    `;
    for (const row of segmentRows.rows) {
      set.add(row.contact_id as string);
    }
  }

  return Array.from(set);
}

export async function getAudienceBreakdown(input: {
  listIds?: string[];
  segmentIds?: string[];
}): Promise<{
  listContacts: number;
  segmentContacts: number;
  overlapContacts: number;
  totalUniqueContacts: number;
}> {
  const listSet = new Set<string>();
  const segmentSet = new Set<string>();

  for (const listId of input.listIds || []) {
    const listRows = await sql`
      SELECT contact_id
      FROM email_list_memberships
      WHERE list_id = ${listId}
    `;
    for (const row of listRows.rows) {
      listSet.add(row.contact_id as string);
    }
  }

  for (const segmentId of input.segmentIds || []) {
    const segmentRows = await sql`
      SELECT contact_id
      FROM email_segment_memberships
      WHERE segment_id = ${segmentId}
    `;
    for (const row of segmentRows.rows) {
      segmentSet.add(row.contact_id as string);
    }
  }

  let overlapContacts = 0;
  for (const contactId of listSet) {
    if (segmentSet.has(contactId)) {
      overlapContacts += 1;
    }
  }

  const totalUniqueContacts = new Set<string>([...listSet, ...segmentSet]).size;
  return {
    listContacts: listSet.size,
    segmentContacts: segmentSet.size,
    overlapContacts,
    totalUniqueContacts,
  };
}

export async function listSegments(limit = 100): Promise<
  Array<{
    id: string;
    name: string;
    description: string | null;
    isActive: boolean;
    totalMembers: number;
    lastEvaluatedAt: string | null;
    rules: SegmentRuleGroup;
  }>
> {
  const result = await sql`
    SELECT id, name, description, is_active, total_members, last_evaluated_at, rules
    FROM email_segments
    ORDER BY created_at DESC
    LIMIT ${limit}
  `;

  return result.rows.map((row) => ({
    id: row.id as string,
    name: row.name as string,
    description: (row.description as string | null) ?? null,
    isActive: Boolean(row.is_active),
    totalMembers: Number(row.total_members || 0),
    lastEvaluatedAt: row.last_evaluated_at
      ? new Date(row.last_evaluated_at as string).toISOString()
      : null,
    rules: (row.rules as SegmentRuleGroup) || { mode: 'all', conditions: [] },
  }));
}

export async function createSegment(input: {
  name: string;
  description?: string;
  rules?: SegmentRuleGroup;
}): Promise<{ id: string }> {
  const rules = input.rules || { mode: 'all', conditions: [] };
  const result = await sql`
    INSERT INTO email_segments (name, description, rules)
    VALUES (${input.name}, ${input.description ?? null}, ${JSON.stringify(rules)})
    RETURNING id
  `;
  return { id: result.rows[0]?.id as string };
}

export function buildSegmentRuleFieldCatalog(): Array<{ key: string; sqlExpression: string }> {
  return [
    { key: 'email', sqlExpression: sqlColumnForField('email') },
    { key: 'order_count', sqlExpression: sqlColumnForField('order_count') },
    { key: 'lifetime_value', sqlExpression: sqlColumnForField('lifetime_value') },
    { key: 'average_order_value', sqlExpression: sqlColumnForField('average_order_value') },
    { key: 'last_order_days_ago', sqlExpression: sqlColumnForField('last_order_days_ago') },
    { key: 'top_product_type', sqlExpression: sqlColumnForField('top_product_type') },
    { key: 'top_vendor', sqlExpression: sqlColumnForField('top_vendor') },
    { key: 'shopify_customer_tag', sqlExpression: sqlColumnForField('shopify_customer_tag') },
  ];
}
