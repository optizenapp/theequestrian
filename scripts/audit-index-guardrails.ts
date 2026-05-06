import robots from '@/app/robots';
import { blogRedirects, collectionRedirects, pageRedirects } from '@/lib/redirects/maps';

type GuardrailResult = {
  name: string;
  passed: boolean;
  detail: string;
};

const appJunkPatterns = ['globo_basis', 'globo-', 'secomapp', 'toolbox'];

function normalizeLocation(location: string | null): string | null {
  if (!location) return null;
  if (!location.startsWith('http')) return location;
  const url = new URL(location);
  return `${url.pathname}${url.search}${url.hash}`;
}

function evaluatePath(pathname: string): { status: number; location?: string; noindex?: boolean } {
  const decodedPath = decodeURIComponent(pathname);

  if (pathname === '/brands/kentucky-horsewear') return { status: 301, location: '/brands/kentucky' };
  if (pathname === '/brands/ego-7') return { status: 301, location: '/brands/ego7' };
  if (pathname === '/accessories/collectibles') return { status: 301, location: '/accessories/toys' };
  if (pathname.startsWith('/cart/c/')) return { status: 301, location: '/cart' };

  if (pathname.startsWith('/collections/')) {
    const target = collectionRedirects[pathname];
    if (target) return { status: 301, location: target };
  }

  if (
    decodedPath.includes('+') ||
    decodedPath.endsWith('.atom') ||
    decodedPath.endsWith('.rss') ||
    appJunkPatterns.some((pattern) => decodedPath.includes(pattern)) ||
    decodedPath.startsWith('/collections/') ||
    decodedPath === '/collections'
  ) {
    return { status: 410, noindex: true };
  }

  if (pathname.startsWith('/blogs/')) {
    return { status: 301, location: blogRedirects[pathname] ?? pathname.replace(/^\/blogs/, '') };
  }

  if (pathname.startsWith('/pages/')) {
    return { status: 301, location: pageRedirects[pathname] ?? pathname.replace(/^\/pages/, '') };
  }

  return { status: 200 };
}

function assertRedirect(name: string, from: string, expectedTo: string): GuardrailResult {
  const result = evaluatePath(from);
  const location = normalizeLocation(result.location ?? null);
  const passed = result.status === 301 && location === expectedTo;
  return {
    name,
    passed,
    detail: `${from} -> ${location ?? 'none'} (${result.status}), expected ${expectedTo} (301)`,
  };
}

function assertGone(name: string, path: string): GuardrailResult {
  const result = evaluatePath(path);
  const passed = result.status === 410 && result.noindex === true;
  return {
    name,
    passed,
    detail: `${path} returned ${result.status}, noindex=${result.noindex === true}`,
  };
}

function assertRobotsDisallow(name: string, disallowPattern: string): GuardrailResult {
  const metadata = robots();
  const rules = Array.isArray(metadata.rules) ? metadata.rules : [metadata.rules];
  const passed = rules.some((rule) => {
    const disallow = Array.isArray(rule.disallow) ? rule.disallow : [rule.disallow];
    return disallow.includes(disallowPattern);
  });

  return {
    name,
    passed,
    detail: `${disallowPattern} ${passed ? 'is present' : 'is missing'} in robots rules`,
  };
}

const firstCollectionRedirect = Object.entries(collectionRedirects)[0];
const firstBlogRedirect = Object.entries(blogRedirects)[0];
const firstPageRedirect = Object.entries(pageRedirects)[0];

const results: GuardrailResult[] = [
  assertRedirect('sample collection redirect', firstCollectionRedirect[0], firstCollectionRedirect[1]),
  assertRedirect('legacy brand consolidation', '/brands/kentucky-horsewear', '/brands/kentucky'),
  assertRedirect('legacy cart permalink', '/cart/c/example-cart-id', '/cart'),
  assertGone('unknown collection path is gone', '/collections/not-in-map'),
  assertGone('plus URL combination is gone', '/collections/footwear/top-boots+black'),
  assertGone('RSS path is gone', '/collections/horse-rugs.atom'),
  assertGone('unmapped Shopify app junk path is gone', '/collections/globo-unmapped-app-junk'),
  assertRobotsDisallow('robots blocks api', '/api/'),
  assertRobotsDisallow('robots blocks cart', '/cart'),
  assertRobotsDisallow('robots blocks search', '/search'),
  assertRobotsDisallow('robots blocks variant params', '/*?*variant=*'),
  assertRobotsDisallow('robots blocks page params', '/*?*page=*'),
  assertRobotsDisallow('robots blocks sort params', '/*?*sort_by=*'),
  assertRobotsDisallow('robots blocks filter params', '/*?filter*'),
];

if (firstBlogRedirect) {
  results.push(assertRedirect('sample blog redirect', firstBlogRedirect[0], firstBlogRedirect[1]));
}

if (firstPageRedirect) {
  results.push(assertRedirect('sample page redirect', firstPageRedirect[0], firstPageRedirect[1]));
}

const failures = results.filter((result) => !result.passed);

for (const result of results) {
  console.log(`${result.passed ? 'PASS' : 'FAIL'} ${result.name}: ${result.detail}`);
}

if (failures.length > 0) {
  console.error(`\nIndex guardrail audit failed: ${failures.length} failing check(s).`);
  process.exit(1);
}

console.log(`\nIndex guardrail audit passed: ${results.length} checks.`);
