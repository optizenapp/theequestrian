import React from 'react';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { getArticleById, getCategories, getPlaces, getRegions, getPlaceAssociations } from '@/lib/articles/db';
import ArticleForm from '../../ArticleForm';

export const dynamic = 'force-dynamic';

interface Props {
  params: Promise<{ id: string }>;
}

export default async function EditArticlePage({ params }: Props) {
  const { id } = await params;

  const [article, categories, places, regions, placeAssociations] = await Promise.all([
    getArticleById(id),
    getCategories(),
    getPlaces({ types: ['city', 'town', 'village', 'suburb'] }),
    getRegions(),
    getPlaceAssociations(),
  ]);

  if (!article) {
    notFound();
  }

  const regionPlaceMap: Record<string, string[]> = {};
  const regionIds = new Set(regions.map((r) => r.place_id));
  for (const assoc of placeAssociations) {
    if (regionIds.has(assoc.parent_id)) {
      if (!regionPlaceMap[assoc.parent_id]) regionPlaceMap[assoc.parent_id] = [];
      regionPlaceMap[assoc.parent_id].push(assoc.child_id);
    }
  }

  return (
    <AdminLayout title="Edit Article" subtitle={article.title}>
      <div className="space-y-8">
        <div>
          <Link
            href="/admin/articles"
            className="inline-flex items-center gap-2 text-sm font-bold text-gray-600 hover:text-action mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Articles
          </Link>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">Edit Article</h1>
          <p className="text-gray-500 font-medium">Update {article.title}</p>
        </div>
        <ArticleForm
          article={article as Parameters<typeof ArticleForm>[0]['article']}
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
