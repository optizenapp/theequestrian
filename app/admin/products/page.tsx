'use client';

import { useEffect, useState } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { HtmlEditor } from '@/components/admin/HtmlEditor';

interface ProductResult {
  id: string;
  handle: string;
  title: string;
  vendor: string | null;
  product_type: string | null;
  is_published_headless?: boolean;
}

interface ProductContentResponse {
  product: {
    id: string;
    handle: string;
    title: string;
    descriptionHtml: string;
    images: Array<{ url: string; altText?: string | null }>;
  };
  override: {
    title_override: string | null;
    meta_title: string | null;
    meta_description: string | null;
    description_html: string | null;
    bullet_points: any[] | null;
    slug_override: string | null;
    use_headless_title: boolean | null;
    use_headless_meta_title: boolean | null;
    use_headless_meta_description: boolean | null;
    use_headless_description: boolean | null;
    use_headless_bullets: boolean | null;
    use_headless_slug: boolean | null;
  } | null;
}

export default function AdminProductContentPage() {
  const [search, setSearch] = useState('');
  const [results, setResults] = useState<ProductResult[]>([]);
  const [selected, setSelected] = useState<ProductContentResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [categories, setCategories] = useState<string[]>([]);
  const [categoryFilter, setCategoryFilter] = useState('');
  const [totalCount, setTotalCount] = useState(0);
  const [offset, setOffset] = useState(0);
  const [selectedProductIds, setSelectedProductIds] = useState<Set<string>>(new Set());
  const [selectAllMatches, setSelectAllMatches] = useState(false);
  const [bulkUpdating, setBulkUpdating] = useState(false);
  const pageSize = 50;

  const [titleOverride, setTitleOverride] = useState('');
  const [metaTitle, setMetaTitle] = useState('');
  const [metaDescription, setMetaDescription] = useState('');
  const [descriptionHtml, setDescriptionHtml] = useState('');
  const [slugOverride, setSlugOverride] = useState('');
  const [bulletPoints, setBulletPoints] = useState(['', '', '']);
  const [useHeadlessTitle, setUseHeadlessTitle] = useState(false);
  const [useHeadlessMetaTitle, setUseHeadlessMetaTitle] = useState(false);
  const [useHeadlessMetaDescription, setUseHeadlessMetaDescription] = useState(false);
  const [useHeadlessDescription, setUseHeadlessDescription] = useState(false);
  const [useHeadlessBullets, setUseHeadlessBullets] = useState(false);
  const [useHeadlessSlug, setUseHeadlessSlug] = useState(false);

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    try {
      const response = await fetch('/api/admin/categories');
      const data = await response.json();
      const paths = (data.categories || []).map((item: any) => item.url_path).filter(Boolean);
      setCategories(paths);
    } catch (error) {
      console.error('Failed to load categories:', error);
    }
  };

  const resetForm = (data: ProductContentResponse) => {
    setTitleOverride(data.override?.title_override || '');
    setMetaTitle(data.override?.meta_title || '');
    setMetaDescription(data.override?.meta_description || '');
    setDescriptionHtml(data.override?.description_html || data.product?.descriptionHtml || '');
    setSlugOverride(data.override?.slug_override || data.product?.handle || '');
    const bullets = Array.isArray(data.override?.bullet_points) ? data.override?.bullet_points : [];
    const padded = [...bullets].slice(0, 3);
    while (padded.length < 3) padded.push('');
    setBulletPoints(padded as string[]);
    setUseHeadlessTitle(Boolean(data.override?.use_headless_title));
    setUseHeadlessMetaTitle(Boolean(data.override?.use_headless_meta_title));
    setUseHeadlessMetaDescription(Boolean(data.override?.use_headless_meta_description));
    setUseHeadlessDescription(Boolean(data.override?.use_headless_description));
    setUseHeadlessBullets(Boolean(data.override?.use_headless_bullets));
    setUseHeadlessSlug(Boolean(data.override?.use_headless_slug));
  };

  const searchProducts = async (mode: 'reset' | 'more' | 'all' = 'reset') => {
    setIsLoading(true);
    try {
      let nextOffset = mode === 'reset' ? 0 : offset;
      let aggregated = mode === 'more' ? results : [];
      let total = totalCount;

      const fetchPage = async () => {
        const params = new URLSearchParams();
        if (search) params.set('search', search);
        params.set('limit', pageSize.toString());
        params.set('offset', nextOffset.toString());
        if (categoryFilter) params.set('categoryPath', categoryFilter);
        const response = await fetch(`/api/admin/products?${params.toString()}`);
        const data = await response.json();
        const pageResults = data.products || [];
        aggregated = [...aggregated, ...pageResults];
        total = data.totalCount || aggregated.length;
        nextOffset += pageSize;
        return pageResults.length;
      };

      if (mode === 'all') {
        while (true) {
          const fetched = await fetchPage();
          if (fetched < pageSize || aggregated.length >= total) break;
        }
        setResults(aggregated);
        setTotalCount(total);
        setOffset(nextOffset);
      } else {
        await fetchPage();
        setResults(aggregated);
        setTotalCount(total);
        setOffset(nextOffset);
      }
      if (mode === 'reset') {
        setSelectedProductIds(new Set());
        setSelectAllMatches(false);
      }
    } catch (error) {
      console.error('Failed to search products:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const selectedCount = selectAllMatches ? totalCount : selectedProductIds.size;

  const toggleSelected = (productId: string) => {
    setSelectedProductIds((prev) => {
      const next = new Set(prev);
      if (next.has(productId)) {
        next.delete(productId);
      } else {
        next.add(productId);
      }
      return next;
    });
  };

  const handleBulkPublishUpdate = async (published: boolean) => {
    if (selectedCount === 0) return;
    setBulkUpdating(true);
    try {
      const response = await fetch('/api/admin/products/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          published,
          search: selectAllMatches ? search : undefined,
          categoryPath: categoryFilter || undefined,
          productIds: selectAllMatches ? undefined : Array.from(selectedProductIds),
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        alert(data?.error || 'Failed to update publish visibility');
        return;
      }

      alert(`${published ? 'Published' : 'Unpublished'} ${data.updated} products.`);
      setSelectedProductIds(new Set());
      setSelectAllMatches(false);
      await searchProducts('reset');
    } catch (error) {
      console.error('Failed to bulk update publish visibility:', error);
    } finally {
      setBulkUpdating(false);
    }
  };

  const loadProduct = async (handle: string) => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/admin/product-content/${handle}`);
      const data = await response.json();
      if (!response.ok || !data?.product) {
        alert(data?.error || 'Failed to load product content');
        return;
      }
      setSelected(data);
      resetForm(data);
    } catch (error) {
      console.error('Failed to load product content:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const saveContent = async () => {
    if (!selected) return;
    setSaving(true);
    try {
      const response = await fetch(`/api/admin/product-content/${selected.product.handle}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title_override: titleOverride,
          meta_title: metaTitle,
          meta_description: metaDescription,
          description_html: descriptionHtml,
          bullet_points: bulletPoints,
          slug_override: slugOverride,
          use_headless_title: useHeadlessTitle,
          use_headless_meta_title: useHeadlessMetaTitle,
          use_headless_meta_description: useHeadlessMetaDescription,
          use_headless_description: useHeadlessDescription,
          use_headless_bullets: useHeadlessBullets,
          use_headless_slug: useHeadlessSlug,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        alert(data?.error || 'Failed to save');
        return;
      }
      const data = await response.json();
      setSelected((prev) => (prev ? { ...prev, override: data.override } : prev));
    } catch (error) {
      console.error('Failed to save product content:', error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <AdminLayout title="Product Content" subtitle="Edit product SEO and HTML content">
      <div className="mb-6 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-3 md:flex-row">
          <input
            type="text"
            placeholder="Search by handle or title..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm"
          />
          <select
            value={categoryFilter}
            onChange={(event) => setCategoryFilter(event.target.value)}
            className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm md:max-w-xs"
          >
            <option value="">All categories</option>
            {categories.map((path) => (
              <option key={path} value={path}>
                {path}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => searchProducts('reset')}
            className="rounded-full border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700"
          >
            Search
          </button>
        </div>
        {results.length > 0 && (
          <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs text-gray-500">
            <span>
              Showing {results.length} of {totalCount || results.length} products
            </span>
            <div className="flex gap-2">
              {results.length < totalCount && (
                <button
                  type="button"
                  onClick={() => searchProducts('more')}
                  className="text-action"
                >
                  Load more
                </button>
              )}
              {results.length < totalCount && (
                <button
                  type="button"
                  onClick={() => searchProducts('all')}
                  className="text-action"
                >
                  Load all
                </button>
              )}
            </div>
          </div>
        )}
        {totalCount > 0 && (
          <div className="mt-3 rounded-lg border border-gray-200 bg-gray-50 p-3 text-xs text-gray-700">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="font-semibold text-gray-900">
                  {selectedCount} selected
                </span>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={selectAllMatches}
                    onChange={(event) => {
                      setSelectAllMatches(event.target.checked);
                      if (event.target.checked) {
                        setSelectedProductIds(new Set());
                      }
                    }}
                  />
                  Select all {totalCount} matches
                </label>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={selectedCount === 0 || bulkUpdating}
                  onClick={() => handleBulkPublishUpdate(true)}
                  className="rounded-full border border-green-200 bg-green-50 px-3 py-1 font-semibold text-green-700 disabled:opacity-60"
                >
                  Publish selected
                </button>
                <button
                  type="button"
                  disabled={selectedCount === 0 || bulkUpdating}
                  onClick={() => handleBulkPublishUpdate(false)}
                  className="rounded-full border border-red-200 bg-red-50 px-3 py-1 font-semibold text-red-700 disabled:opacity-60"
                >
                  Unpublish selected
                </button>
              </div>
            </div>
          </div>
        )}
        {isLoading && (
          <div className="mt-3 text-sm text-gray-500">Loading...</div>
        )}
        {results.length > 0 && (
          <div className="mt-4 max-h-64 overflow-y-auto rounded-lg border border-gray-200">
            {results.map((product) => (
              <div
                key={product.id}
                className="flex w-full items-center justify-between border-b border-gray-100 px-4 py-3 text-left text-sm hover:bg-gray-50"
              >
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    checked={selectAllMatches || selectedProductIds.has(product.id)}
                    disabled={selectAllMatches}
                    onChange={() => toggleSelected(product.id)}
                    className="mt-1"
                  />
                  <div>
                    <div className="font-medium text-gray-900">{product.title}</div>
                    <div className="text-xs text-gray-500">{product.handle}</div>
                    <div className="mt-1">
                      {product.is_published_headless !== false ? (
                        <span className="rounded-full bg-green-100 px-2 py-0.5 text-[11px] font-semibold text-green-700">
                          Published
                        </span>
                      ) : (
                        <span className="rounded-full bg-red-100 px-2 py-0.5 text-[11px] font-semibold text-red-700">
                          Unpublished
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-xs text-gray-500">{product.vendor || '—'}</div>
                  <button
                    type="button"
                    onClick={() => loadProduct(product.handle)}
                    className="rounded-full border border-gray-200 px-3 py-1 text-xs font-semibold text-gray-700"
                  >
                    Edit
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {selected && (
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-gray-900">{selected.product.title}</h3>
            <p className="text-sm text-gray-500">Handle: {selected.product.handle}</p>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="text-sm font-medium text-gray-700">Title Override</label>
              <input
                value={titleOverride}
                onChange={(event) => setTitleOverride(event.target.value)}
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              />
              <label className="mt-2 flex items-center gap-2 text-xs text-gray-600">
                <input
                  type="checkbox"
                  checked={useHeadlessTitle}
                  onChange={(event) => setUseHeadlessTitle(event.target.checked)}
                />
                Use headless title
              </label>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Meta Title</label>
              <input
                value={metaTitle}
                onChange={(event) => setMetaTitle(event.target.value)}
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              />
              <label className="mt-2 flex items-center gap-2 text-xs text-gray-600">
                <input
                  type="checkbox"
                  checked={useHeadlessMetaTitle}
                  onChange={(event) => setUseHeadlessMetaTitle(event.target.checked)}
                />
                Use headless meta title
              </label>
            </div>
            <div className="md:col-span-2">
              <label className="text-sm font-medium text-gray-700">Meta Description</label>
              <textarea
                value={metaDescription}
                onChange={(event) => setMetaDescription(event.target.value)}
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                rows={2}
              />
              <label className="mt-2 flex items-center gap-2 text-xs text-gray-600">
                <input
                  type="checkbox"
                  checked={useHeadlessMetaDescription}
                  onChange={(event) => setUseHeadlessMetaDescription(event.target.checked)}
                />
                Use headless meta description
              </label>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Slug</label>
              <input
                value={slugOverride}
                onChange={(event) => setSlugOverride(event.target.value)}
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              />
              <label className="mt-2 flex items-center gap-2 text-xs text-gray-600">
                <input
                  type="checkbox"
                  checked={useHeadlessSlug}
                  onChange={(event) => setUseHeadlessSlug(event.target.checked)}
                />
                Use headless slug
              </label>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Bullet Points</label>
              <div className="mt-1 space-y-2">
                {bulletPoints.map((value, index) => (
                  <input
                    key={`bullet-${index}`}
                    value={value}
                    onChange={(event) => {
                      const next = [...bulletPoints];
                      next[index] = event.target.value;
                      setBulletPoints(next);
                    }}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                  />
                ))}
              </div>
              <label className="mt-2 flex items-center gap-2 text-xs text-gray-600">
                <input
                  type="checkbox"
                  checked={useHeadlessBullets}
                  onChange={(event) => setUseHeadlessBullets(event.target.checked)}
                />
                Use headless bullets
              </label>
            </div>
            <div className="md:col-span-2">
              <label className="text-sm font-medium text-gray-700">Description HTML (supports H2)</label>
              <HtmlEditor value={descriptionHtml} onChange={setDescriptionHtml} />
              <label className="mt-2 flex items-center gap-2 text-xs text-gray-600">
                <input
                  type="checkbox"
                  checked={useHeadlessDescription}
                  onChange={(event) => setUseHeadlessDescription(event.target.checked)}
                />
                Use headless description
              </label>
            </div>
            <div className="md:col-span-2">
              <label className="text-sm font-medium text-gray-700">Images (Shopify)</label>
              <div className="mt-2 grid grid-cols-2 gap-3 md:grid-cols-4">
                {selected.product.images?.length ? (
                  selected.product.images.map((image, index) => (
                    <div key={`${image.url}-${index}`} className="rounded-lg border border-gray-200 p-2">
                      <img src={image.url} alt={image.altText || ''} className="h-24 w-full object-cover" />
                    </div>
                  ))
                ) : (
                  <div className="text-sm text-gray-500">No images found.</div>
                )}
              </div>
            </div>
          </div>

          <div className="mt-6 flex justify-end">
            <button
              type="button"
              onClick={saveContent}
              disabled={saving}
              className="rounded-full bg-action px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
            >
              {saving ? 'Saving...' : 'Save Content'}
            </button>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
