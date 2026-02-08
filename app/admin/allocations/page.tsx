'use client';

import { useEffect, useMemo, useState } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';

interface AllocationRow {
  id: number;
  product_id: string;
  product_handle: string;
  canonical_path: string;
  category_path: string;
  top_level: string;
  parent_category: string | null;
  subcategory_handle: string | null;
  updated_at: string;
  product_title?: string | null;
  product_vendor?: string | null;
  product_type?: string | null;
}

interface ProductSearchResult {
  id: string;
  handle: string;
  title: string;
  vendor: string | null;
  product_type: string | null;
}

export default function AdminAllocationsPage() {
  const [allocations, setAllocations] = useState<AllocationRow[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [productSearch, setProductSearch] = useState('');
  const [productResults, setProductResults] = useState<ProductSearchResult[]>([]);
  const [categoryPath, setCategoryPath] = useState('');
  const [saving, setSaving] = useState(false);
  const [productTotal, setProductTotal] = useState(0);
  const [productOffset, setProductOffset] = useState(0);
  const productLimit = 25;
  const [selectedProductIds, setSelectedProductIds] = useState<Set<string>>(new Set());
  const [selectAllMatches, setSelectAllMatches] = useState(false);

  useEffect(() => {
    fetchAllocations();
  }, [search]);

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchAllocations = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      const response = await fetch(`/api/admin/product-allocations?${params.toString()}`);
      const data = await response.json();
      setAllocations(data.allocations || []);
    } catch (error) {
      console.error('Failed to load allocations:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await fetch('/api/admin/categories');
      const data = await response.json();
      const paths = (data.categories || []).map((item: any) => item.url_path).filter(Boolean);
      setCategories(paths);
    } catch (error) {
      console.error('Failed to load categories:', error);
    }
  };

  const searchProducts = async (reset: boolean = true) => {
    try {
      const offset = reset ? 0 : productOffset;
      const params = new URLSearchParams();
      if (productSearch) params.set('search', productSearch);
      params.set('limit', productLimit.toString());
      params.set('offset', offset.toString());
      const response = await fetch(`/api/admin/products?${params.toString()}`);
      const data = await response.json();
      if (reset) {
        setProductResults(data.products || []);
        setProductOffset(productLimit);
        setSelectedProductIds(new Set());
        setSelectAllMatches(false);
      } else {
        setProductResults((prev) => [...prev, ...(data.products || [])]);
        setProductOffset(offset + productLimit);
      }
      setProductTotal(data.totalCount || 0);
    } catch (error) {
      console.error('Failed to search products:', error);
    }
  };

  const selectedCount = useMemo(() => {
    if (selectAllMatches) {
      return productTotal;
    }
    return selectedProductIds.size;
  }, [productTotal, selectAllMatches, selectedProductIds]);

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

  const handleAssign = async () => {
    if (selectedCount === 0) return;
    if (!categoryPath.trim()) return;
    setSaving(true);
    try {
      const response = await fetch('/api/admin/product-allocations/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          search: selectAllMatches ? productSearch : undefined,
          productIds: selectAllMatches ? undefined : Array.from(selectedProductIds),
          categoryPath,
        }),
      });
      if (response.ok) {
        const data = await response.json();
        setCategoryPath('');
        setProductResults([]);
        setProductSearch('');
        setSelectedProductIds(new Set());
        setSelectAllMatches(false);
        setProductOffset(0);
        setProductTotal(0);
        fetchAllocations();
        alert(`Allocated ${data.updatedCount} products. Redirects created: ${data.redirectCount}.`);
      } else {
        const data = await response.json();
        alert(data?.error || 'Failed to save allocation');
      }
    } catch (error) {
      console.error('Failed to save allocation:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (productId: string) => {
    if (!confirm('Remove this allocation?')) return;
    try {
      const response = await fetch(`/api/admin/product-allocations/${productId}`, {
        method: 'DELETE',
      });
      if (response.ok) {
        fetchAllocations();
      }
    } catch (error) {
      console.error('Failed to delete allocation:', error);
    }
  };

  return (
    <AdminLayout title="Product Allocation" subtitle="Assign canonical category paths and manage redirects">
      <div className="mb-6 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <h3 className="text-base font-semibold text-gray-900 mb-4">Assign Product to Category</h3>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label className="text-sm font-medium text-gray-700">Search Products</label>
            <div className="mt-1 flex gap-2">
              <input
                value={productSearch}
                onChange={(event) => setProductSearch(event.target.value)}
                placeholder="Search by handle or title..."
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              />
              <button
                type="button"
                onClick={() => searchProducts(true)}
                className="rounded-lg border border-gray-200 px-3 py-2 text-sm font-semibold text-gray-700"
              >
                Search
              </button>
            </div>
            {productResults.length > 0 && (
              <div className="mt-3 max-h-48 overflow-y-auto rounded-lg border border-gray-200">
                {productResults.map((product) => {
                  const checked = selectAllMatches || selectedProductIds.has(product.id);
                  return (
                    <label
                      key={product.id}
                      className="flex w-full items-start justify-between border-b border-gray-100 px-3 py-2 text-left text-sm hover:bg-gray-50"
                    >
                      <div className="flex items-start gap-2">
                        <input
                          type="checkbox"
                          checked={checked}
                          disabled={selectAllMatches}
                          onChange={() => toggleSelected(product.id)}
                          className="mt-1"
                        />
                        <div>
                          <div className="font-medium text-gray-900">{product.title}</div>
                          <div className="text-xs text-gray-500">{product.handle}</div>
                        </div>
                      </div>
                      <span className="text-xs text-gray-500">{product.vendor || '—'}</span>
                    </label>
                  );
                })}
              </div>
            )}
            {productResults.length > 0 && productResults.length < productTotal && (
              <div className="mt-2">
                <button
                  type="button"
                  onClick={() => searchProducts(false)}
                  className="text-sm font-semibold text-action"
                >
                  Load more ({productResults.length}/{productTotal})
                </button>
              </div>
            )}
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700">Category Path</label>
            <input
              list="categoryPaths"
              value={categoryPath}
              onChange={(event) => setCategoryPath(event.target.value)}
              placeholder="/horse/boots/bell-boots"
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />
            <datalist id="categoryPaths">
              {categories.map((path) => (
                <option key={path} value={path} />
              ))}
            </datalist>
          </div>
        </div>

        {productTotal > 0 && (
          <div className="mt-4 rounded-lg border border-gray-200 bg-gray-50 p-4 text-sm text-gray-700">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="font-semibold text-gray-900">Bulk Selection</div>
                <div>{selectedCount} products selected</div>
              </div>
              <label className="flex items-center gap-2 text-sm">
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
                Select all {productTotal} matches
              </label>
            </div>
          </div>
        )}

        <div className="mt-4 flex justify-end">
          <button
            type="button"
            onClick={handleAssign}
            disabled={selectedCount === 0 || !categoryPath.trim() || saving}
            className="rounded-full bg-action px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
          >
            {saving ? 'Saving...' : 'Save Allocation'}
          </button>
        </div>
      </div>

      <div className="mb-6 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
        <input
          type="text"
          placeholder="Search allocations..."
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm"
        />
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white shadow-sm">
        {isLoading ? (
          <div className="flex items-center justify-center py-24 text-gray-600">Loading allocations...</div>
        ) : allocations.length === 0 ? (
          <div className="py-12 text-center text-gray-500">No allocations found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category Path</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Canonical URL</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {allocations.map((row) => (
                  <tr key={row.product_id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-gray-900">
                        {row.product_title || row.product_handle}
                      </div>
                      <div className="text-xs text-gray-500">{row.product_handle}</div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-700">{row.category_path}</td>
                    <td className="px-6 py-4 text-sm text-gray-700">{row.canonical_path}</td>
                    <td className="px-6 py-4 text-right text-sm">
                      <button
                        type="button"
                        onClick={() => handleDelete(row.product_id)}
                        className="text-red-600 hover:text-red-800"
                      >
                        Remove
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
