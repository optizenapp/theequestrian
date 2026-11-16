import { sql } from '@/lib/db/vercel-postgres';
import { ensureCartUpsellOffersTable } from '@/lib/cart-upsells/ensure-table';
import type {
  CartUpsellOffer,
  CartUpsellOfferInput,
  CartUpsellTriggerType,
} from '@/lib/cart-upsells/types';

type OfferRow = {
  id: number;
  name: string;
  enabled: boolean;
  priority: number;
  headline: string;
  trigger_type: string;
  trigger_values: string[] | null;
  candidate_handles: string[] | null;
  max_products: number;
  created_at: string;
  updated_at: string;
};

const TRIGGER_TYPES = new Set<CartUpsellTriggerType>([
  'product_handle',
  'product_type',
  'vendor',
]);

function normalizeList(values: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of values) {
    const v = raw.trim();
    if (!v) continue;
    const key = v.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(v);
  }
  return out;
}

function mapRow(row: OfferRow): CartUpsellOffer {
  const triggerType = TRIGGER_TYPES.has(row.trigger_type as CartUpsellTriggerType)
    ? (row.trigger_type as CartUpsellTriggerType)
    : 'product_type';
  return {
    id: row.id,
    name: row.name,
    enabled: Boolean(row.enabled),
    priority: row.priority,
    headline: row.headline,
    triggerType,
    triggerValues: row.trigger_values ?? [],
    candidateHandles: row.candidate_handles ?? [],
    maxProducts: row.max_products,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function listCartUpsellOffers(): Promise<CartUpsellOffer[]> {
  await ensureCartUpsellOffersTable();
  const result = await sql`
    SELECT * FROM cart_upsell_offers
    ORDER BY priority ASC, id ASC
  `;
  return (result.rows as OfferRow[]).map(mapRow);
}

export async function listEnabledCartUpsellOffers(): Promise<CartUpsellOffer[]> {
  await ensureCartUpsellOffersTable();
  const result = await sql`
    SELECT * FROM cart_upsell_offers
    WHERE enabled = TRUE
    ORDER BY priority ASC, id ASC
  `;
  return (result.rows as OfferRow[]).map(mapRow);
}

export async function createCartUpsellOffer(
  input: CartUpsellOfferInput
): Promise<CartUpsellOffer> {
  await ensureCartUpsellOffersTable();
  if (!TRIGGER_TYPES.has(input.triggerType)) {
    throw new RangeError('Invalid triggerType');
  }
  const triggerValues = normalizeList(input.triggerValues);
  const candidateHandles = normalizeList(input.candidateHandles).map((h) =>
    h.toLowerCase()
  );
  if (!input.name.trim()) throw new RangeError('name is required');
  if (triggerValues.length === 0) throw new RangeError('triggerValues required');
  if (candidateHandles.length === 0) throw new RangeError('candidateHandles required');

  const maxProducts = Math.min(6, Math.max(1, input.maxProducts ?? 3));
  const priority = input.priority ?? 100;
  const headline = (input.headline ?? 'Complete your order').trim() || 'Complete your order';
  const enabled = input.enabled ?? true;

  const result = await sql.query(
    `INSERT INTO cart_upsell_offers (
      name, enabled, priority, headline, trigger_type,
      trigger_values, candidate_handles, max_products
    )
    VALUES ($1, $2, $3, $4, $5, $6::text[], $7::text[], $8)
    RETURNING *`,
    [
      input.name.trim(),
      enabled,
      priority,
      headline,
      input.triggerType,
      triggerValues,
      candidateHandles,
      maxProducts,
    ]
  );
  return mapRow(result.rows[0] as OfferRow);
}

export async function updateCartUpsellOffer(
  id: number,
  input: Partial<CartUpsellOfferInput>
): Promise<CartUpsellOffer | null> {
  await ensureCartUpsellOffersTable();
  const existing = await sql`SELECT * FROM cart_upsell_offers WHERE id = ${id}`;
  if (!existing.rows[0]) return null;
  const current = mapRow(existing.rows[0] as OfferRow);

  const triggerType = input.triggerType ?? current.triggerType;
  if (!TRIGGER_TYPES.has(triggerType)) throw new RangeError('Invalid triggerType');

  const name = (input.name ?? current.name).trim();
  const headline =
    (input.headline ?? current.headline).trim() || 'Complete your order';
  const enabled = input.enabled ?? current.enabled;
  const priority = input.priority ?? current.priority;
  const maxProducts = Math.min(
    6,
    Math.max(1, input.maxProducts ?? current.maxProducts)
  );
  const triggerValues = input.triggerValues
    ? normalizeList(input.triggerValues)
    : current.triggerValues;
  const candidateHandles = input.candidateHandles
    ? normalizeList(input.candidateHandles).map((h) => h.toLowerCase())
    : current.candidateHandles;

  if (!name) throw new RangeError('name is required');
  if (triggerValues.length === 0) throw new RangeError('triggerValues required');
  if (candidateHandles.length === 0) throw new RangeError('candidateHandles required');

  const result = await sql.query(
    `UPDATE cart_upsell_offers SET
      name = $1,
      enabled = $2,
      priority = $3,
      headline = $4,
      trigger_type = $5,
      trigger_values = $6::text[],
      candidate_handles = $7::text[],
      max_products = $8,
      updated_at = NOW()
    WHERE id = $9
    RETURNING *`,
    [
      name,
      enabled,
      priority,
      headline,
      triggerType,
      triggerValues,
      candidateHandles,
      maxProducts,
      id,
    ]
  );
  return mapRow(result.rows[0] as OfferRow);
}

export async function deleteCartUpsellOffer(id: number): Promise<boolean> {
  await ensureCartUpsellOffersTable();
  const result = await sql`DELETE FROM cart_upsell_offers WHERE id = ${id} RETURNING id`;
  return result.rows.length > 0;
}