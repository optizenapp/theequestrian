'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { AdminLayout } from '@/components/admin/AdminLayout';

interface BrandRow {
  handle: string;
  title: string;
  status: string;
}

export default function AdminBrandPages() {
  const [brands, setBrands] = useState<BrandRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadBrands();
  }, []);

  const loadBrands = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/admin/brands');
      const data = await response.json();
      setBrands(data.brands || []);
    } catch (error) {
      console.error('Failed to load brands:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AdminLayout title="Brand Pages" subtitle="Edit content for brand landing pages">
      <div className="mb-6">
        <Link href="/admin/categories" className="text-sm font-semibold text-action">
          ← Back to Categories
        </Link>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white shadow-sm">
        {isLoading ? (
          <div className="flex items-center justify-center py-24 text-gray-600">Loading brands...</div>
        ) : brands.length === 0 ? (
          <div className="py-12 text-center text-gray-500">No brands found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Brand</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {brands.map((brand) => (
                  <tr key={brand.handle} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-gray-900">{brand.title}</div>
                      <div className="text-xs text-gray-500">{brand.handle}</div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-700">{brand.status}</td>
                    <td className="px-6 py-4 text-right text-sm">
                      <Link
                        href={`/admin/categories/brands/${brand.handle}`}
                        className="text-action hover:text-pink-700"
                      >
                        Edit
                      </Link>
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
