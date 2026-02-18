import { sql } from '@/lib/db/client';

type StorefrontSelectedOption = {
  name?: string;
  value?: string;
};

type StorefrontVariantNode = {
  id: string;
  title?: string;
  availableForSale?: boolean;
  selectedOptions?: StorefrontSelectedOption[];
};

type StorefrontProductLike = {
  id: string;
  handle: string;
  variants?: {
    edges?: Array<{
      node: StorefrontVariantNode;
    }>;
  };
};

type WebhookVariant = {
  id: string | number;
  title?: string;
  option1?: string | null;
  option2?: string | null;
  option3?: string | null;
  available?: boolean;
  inventory_quantity?: number;
};

type WebhookOptionDefinition = {
  name?: string;
  position?: number;
};

function normalize(value: string): string {
  return value.trim().toLowerCase();
}

function nonEmpty(value: string | null | undefined): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

async function ensureVariantTables(): Promise<void> {
  await sql`
    CREATE TABLE IF NOT EXISTS product_variants (
      variant_id TEXT PRIMARY KEY,
      product_id TEXT NOT NULL,
      product_handle TEXT,
      title TEXT,
      available_for_sale BOOLEAN DEFAULT true,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `;
  await sql`CREATE INDEX IF NOT EXISTS idx_pv_product_id ON product_variants(product_id)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_pv_product_handle ON product_variants(product_handle)`;

  await sql`
    CREATE TABLE IF NOT EXISTS variant_options (
      id SERIAL PRIMARY KEY,
      variant_id TEXT NOT NULL,
      product_id TEXT NOT NULL,
      option_name TEXT NOT NULL,
      option_name_normalized TEXT NOT NULL,
      option_value TEXT NOT NULL,
      option_value_normalized TEXT NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `;
  await sql`CREATE INDEX IF NOT EXISTS idx_vo_variant_id ON variant_options(variant_id)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_vo_product_id ON variant_options(product_id)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_vo_name_value ON variant_options(option_name_normalized, option_value_normalized)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_vo_product_name ON variant_options(product_id, option_name_normalized)`;
}

async function upsertVariant(
  productId: string,
  productHandle: string,
  variantId: string,
  title: string,
  availableForSale: boolean
): Promise<void> {
  await sql`
    INSERT INTO product_variants (
      variant_id,
      product_id,
      product_handle,
      title,
      available_for_sale,
      updated_at
    ) VALUES (
      ${variantId},
      ${productId},
      ${productHandle},
      ${title},
      ${availableForSale},
      NOW()
    )
    ON CONFLICT (variant_id) DO UPDATE
    SET product_id = EXCLUDED.product_id,
        product_handle = EXCLUDED.product_handle,
        title = EXCLUDED.title,
        available_for_sale = EXCLUDED.available_for_sale,
        updated_at = NOW()
  `;
}

async function replaceVariantOptions(
  productId: string,
  variantId: string,
  selectedOptions: StorefrontSelectedOption[]
): Promise<void> {
  await sql`DELETE FROM variant_options WHERE variant_id = ${variantId}`;

  for (const selected of selectedOptions) {
    if (!nonEmpty(selected?.name) || !nonEmpty(selected?.value)) continue;

    await sql`
      INSERT INTO variant_options (
        variant_id,
        product_id,
        option_name,
        option_name_normalized,
        option_value,
        option_value_normalized
      ) VALUES (
        ${variantId},
        ${productId},
        ${selected.name.trim()},
        ${normalize(selected.name)},
        ${selected.value.trim()},
        ${normalize(selected.value)}
      )
    `;
  }
}

export async function upsertProductVariantsFromStorefront(
  product: StorefrontProductLike
): Promise<void> {
  await ensureVariantTables();

  const variants = product.variants?.edges?.map((edge) => edge.node).filter(Boolean) || [];

  await sql`DELETE FROM variant_options WHERE product_id = ${product.id}`;
  await sql`DELETE FROM product_variants WHERE product_id = ${product.id}`;

  for (const variant of variants) {
    if (!variant?.id) continue;
    await upsertVariant(
      product.id,
      product.handle,
      variant.id,
      variant.title || '',
      Boolean(variant.availableForSale)
    );
    await replaceVariantOptions(product.id, variant.id, variant.selectedOptions || []);
  }
}

export async function upsertProductVariantsFromWebhook(input: {
  productId: string;
  productHandle: string;
  variants: WebhookVariant[];
  options?: WebhookOptionDefinition[];
}): Promise<void> {
  await ensureVariantTables();

  const optionNamesByPosition = new Map<number, string>();
  for (const option of input.options || []) {
    if (!option?.position || !nonEmpty(option?.name)) continue;
    optionNamesByPosition.set(option.position, option.name.trim());
  }

  await sql`DELETE FROM variant_options WHERE product_id = ${input.productId}`;
  await sql`DELETE FROM product_variants WHERE product_id = ${input.productId}`;

  for (const variant of input.variants || []) {
    const rawVariantId = String(variant.id || '');
    if (!rawVariantId) continue;
    const variantId = rawVariantId.startsWith('gid://')
      ? rawVariantId
      : `gid://shopify/ProductVariant/${rawVariantId}`;

    const availableForSale =
      typeof variant.available === 'boolean'
        ? variant.available
        : Number(variant.inventory_quantity || 0) > 0;

    await upsertVariant(
      input.productId,
      input.productHandle,
      variantId,
      variant.title || '',
      availableForSale
    );

    const selectedOptions: StorefrontSelectedOption[] = [];
    const values = [variant.option1, variant.option2, variant.option3];
    for (let idx = 0; idx < values.length; idx += 1) {
      const value = values[idx];
      if (!nonEmpty(value)) continue;
      const name = optionNamesByPosition.get(idx + 1) || `option${idx + 1}`;
      selectedOptions.push({ name, value });
    }

    await replaceVariantOptions(input.productId, variantId, selectedOptions);
  }
}

export async function deleteProductVariantsByProductId(productId: string): Promise<void> {
  await ensureVariantTables();
  await sql`DELETE FROM variant_options WHERE product_id = ${productId}`;
  await sql`DELETE FROM product_variants WHERE product_id = ${productId}`;
}

