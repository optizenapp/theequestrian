import React from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { getCategories, getPlaces, getRegions, getPlaceAssociations } from '@/lib/articles/db';
import ArticleForm from '../ArticleForm';

export const dynamic = 'force-dynamic';

export default async function NewArticlePage() {
  const [categories, places, regions, placeAssociations] = await Promise.all([
    getCategories(),
    getPlaces({ types: ['city', 'town', 'village', 'suburb'] }),
    getRegions(),
    getPlaceAssociations(),
  ]);

  const regionPlaceMap: Record<string, string[]> = {};
  const regionIds = new Set(regions.map((r) => r.place_id));
  for (const assoc of placeAssociations) {
    if (regionIds.has(assoc.parent_id)) {
      if (!regionPlaceMap[assoc.parent_id]) regionPlaceMap[assoc.parent_id] = [];
      regionPlaceMap[assoc.parent_id].push(assoc.child_id);
    }
  }

  return (
    <AdminLayout title="New Article" subtitle="Create a new article">
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">New Article</h1>
          <p className="text-gray-500 font-medium">Create a new blog post or news article.</p>
        </div>
        <ArticleForm
          categories={categories}
          places={places}
          regions={regions}
          regionPlaceMap={regionPlaceMap}
          authors={[]}
        />
      </div>
    </AdminLayout>
  );
}
