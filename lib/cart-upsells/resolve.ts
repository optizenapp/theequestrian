import { listEnabledCartUpsellOffers } from '@/lib/cart-upsells/db';
import type {
  CartUpsellCartItem,
  CartUpsellOffer,
  CartUpsellProduct,
  CartUpsellResolveResult,
} from '@/lib/cart-upsells/types';
import { getProductsByHandles } from '@/lib/shopify/products-by-handles';
import { fetchProductVariantsByHandles } from '@/lib/shopify/fetch-product-variants-by-handles';
import { getComplementaryTypes } from '@/lib/mapping/complementary-products';

function offerMatchesCart(offer: CartUpsellOffer, cart: CartUpsellCartItem[]): boolean {
  const values = offer.triggerValues.map((v) => v.trim().toLowerCase()).filter(Boolean);
  if (values.length === 0) return false;

  for (const item of cart) {
    if (offer.triggerType === 'product_handle') {
      if (values.includes(item.handle.trim().toLowerCase())) return true;
    } else if (offer.triggerType === 'product_type') {
      if (values.includes(item.productType.trim().toLowerCase())) return true;
    } else if (offer.triggerType === 'vendor') {
      if (values.includes(item.vendor.trim().toLowerCase())) return true;
    }
  }
  return false;
}

function scoreCandidate(
  product: CartUpsellProduct,
  cart: CartUpsellCartItem[],
  complementaryTypes: string[],
  offerPriority: number
): number {
  let score = 1000 - offerPriority;
  const cartTypes = new Set(cart.map((i) => i.productType));
  const cartVendors = new Set(cart.map((i) => i.vendor).filter(Boolean));
  if (complementaryTypes.includes(product.productType)) score += 20;
  if (cartTypes.has(product.productType)) score += 8;
  if (cartVendors.has(product.vendor)) score += 10;
  if (product.availableForSale) score += 15;
  if (product.firstVariantId) score += 5;
  const avg =
    cart.reduce((s, i) => s + i.price, 0) / Math.max(1, cart.length);
  const price = parseFloat(product.priceAmount);
  if (!Number.isNaN(price) && price >= avg * 0.4 && price <= avg * 2.5) score += 6;
  return score;
}

async function hydrateProducts(handles: string[]): Promise<CartUpsellProduct[]> {
  if (handles.length === 0) return [];
  const [cards, variantsByHandle] = await Promise.all([
    getProductsByHandles(handles),
    fetchProductVariantsByHandles(handles),
  ]);

  const byHandle = new Map(cards.map((p) => [p.handle.toLowerCase(), p]));
  const out: CartUpsellProduct[] = [];

  for (const handle of handles) {
    const card = byHandle.get(handle.toLowerCase());
    if (!card) continue;
    const variants = variantsByHandle.get(handle.toLowerCase());
    const firstAvailable =
      variants?.edges.find((e) => e.node.availableForSale)?.node ??
      variants?.edges[0]?.node ??
      null;
    const image = card.images.edges[0]?.node;
    out.push({
      id: card.id,
      handle: card.handle,
      title: card.title,
      availableForSale: card.availableForSale,
      vendor: card.vendor,
      productType: card.productType,
      priceAmount: card.priceRange.minVariantPrice.amount,
      currencyCode: card.priceRange.minVariantPrice.currencyCode,
      imageUrl: image?.url ?? null,
      imageAlt: image?.altText ?? null,
      firstVariantId: firstAvailable?.id ?? null,
    });
  }
  return out;
}

/**
 * Match enabled curated offers to cart lines, rank candidates, return top products.
 * Callers should fall back to heuristic recs when source !== 'curated'.
 */
export async function resolveCartUpsells(
  cartItems: CartUpsellCartItem[],
  limit = 3
): Promise<CartUpsellResolveResult> {
  if (cartItems.length === 0) {
    return { products: [], headline: '', source: 'empty', offerId: null };
  }

  let offers: CartUpsellOffer[] = [];
  try {
    offers = await listEnabledCartUpsellOffers();
  } catch (err) {
    console.error('[resolveCartUpsells] list failed', err);
    return { products: [], headline: '', source: 'fallback', offerId: null };
  }

  const matched = offers.filter((o) => offerMatchesCart(o, cartItems));
  if (matched.length === 0) {
    return { products: [], headline: '', source: 'fallback', offerId: null };
  }

  const cartHandles = new Set(cartItems.map((i) => i.handle.toLowerCase()));
  const handlePriority = new Map<string, number>();
  let bestOffer = matched[0];
  let maxProducts = limit;

  for (const offer of matched) {
    if (offer.priority < bestOffer.priority) bestOffer = offer;
    maxProducts = Math.max(maxProducts, offer.maxProducts);
    for (const handle of offer.candidateHandles) {
      const key = handle.toLowerCase();
      if (cartHandles.has(key)) continue;
      const prev = handlePriority.get(key);
      if (prev == null || offer.priority < prev) {
        handlePriority.set(key, offer.priority);
      }
    }
  }

  const candidateHandles = [...handlePriority.keys()];
  if (candidateHandles.length === 0) {
    return { products: [], headline: bestOffer.headline, source: 'fallback', offerId: bestOffer.id };
  }

  const products = await hydrateProducts(candidateHandles);
  const complementaryTypes = getComplementaryTypes([
    ...new Set(cartItems.map((i) => i.productType).filter(Boolean)),
  ]);

  const scored = products
    .filter((p) => p.availableForSale && p.firstVariantId)
    .map((product) => ({
      product,
      score: scoreCandidate(
        product,
        cartItems,
        complementaryTypes,
        handlePriority.get(product.handle.toLowerCase()) ?? 100
      ),
    }))
    .sort((a, b) => b.score - a.score);

  const take = Math.min(limit, bestOffer.maxProducts, maxProducts);
  const selected = scored.slice(0, take).map((s) => s.product);

  if (selected.length === 0) {
    return { products: [], headline: bestOffer.headline, source: 'fallback', offerId: bestOffer.id };
  }

  return {
    products: selected,
    headline: bestOffer.headline,
    source: 'curated',
    offerId: bestOffer.id,
  };
}