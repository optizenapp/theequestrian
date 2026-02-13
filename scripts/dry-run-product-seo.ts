import { getAllProducts } from '@/lib/shopify/products';
import { getProductOverridesByHandles } from '@/lib/content/product-overrides';
import { buildProductSeoMetadata } from '@/lib/seo/product-metadata';

const SAMPLE_SIZE = 10;

function pickRandomItems<T>(items: T[], count: number): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const randomIndex = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[randomIndex]] = [copy[randomIndex], copy[i]];
  }
  return copy.slice(0, Math.min(count, copy.length));
}

async function main() {
  console.log(`\n[SEO DRY RUN] Sampling ${SAMPLE_SIZE} random products...\n`);

  const products = await getAllProducts();
  if (products.length === 0) {
    console.error('[SEO DRY RUN] No products found.');
    process.exit(1);
  }

  const sampled = pickRandomItems(products, SAMPLE_SIZE);
  const handles = sampled.map((product) => product.handle);
  const overrideMap = await getProductOverridesByHandles(handles);

  sampled.forEach((product, index) => {
    const override = overrideMap.get(product.handle) || null;
    const displayTitle = override?.use_headless_title
      ? (override.title_override || product.title)
      : product.title;

    const seo = buildProductSeoMetadata({
      displayTitle,
      productDescription: product.description,
      override,
    });

    console.log(`--- Product ${index + 1} ---`);
    console.log(`Handle: ${product.handle}`);
    console.log(`Title: ${displayTitle}`);
    console.log(`Current Meta Title (${seo.currentTitle.length}): ${seo.currentTitle}`);
    console.log(`Proposed Meta Title (${seo.proposedTitle.length}): ${seo.proposedTitle}`);
    console.log(`Current Meta Description (${seo.currentDescription.length}): ${seo.currentDescription}`);
    console.log(`Proposed Meta Description (${seo.proposedDescription.length}): ${seo.proposedDescription}`);
    console.log('');
  });

  console.log('[SEO DRY RUN] Complete.\n');
}

main().catch((error) => {
  console.error('[SEO DRY RUN] Failed:', error);
  process.exit(1);
});
