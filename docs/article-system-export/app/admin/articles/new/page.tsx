import React from "react";
import { prisma } from "@/lib/prisma";
import ArticleForm from "../ArticleForm";

export const dynamic = 'force-dynamic';

export default async function NewArticlePage() {
  // Fetch categories, places, and regions for the form
  const [categories, places, regions, placeAssociations, authors] = await Promise.all([
    prisma.article_category.findMany({
      orderBy: { name: 'asc' }
    }),
    prisma.place.findMany({
      where: {
        type: {
          in: ['city', 'town', 'village', 'suburb']
        }
      },
      orderBy: { name: 'asc' },
      select: {
        place_id: true,
        name: true,
        slug: true,
        type: true,
        parent_place_id: true
      }
    }),
    prisma.place.findMany({
      where: { type: 'region' },
      orderBy: { name: 'asc' },
      select: {
        place_id: true,
        name: true,
        slug: true
      }
    }),
    prisma.place_association.findMany({
      select: { parent_id: true, child_id: true }
    }),
    prisma.user.findMany({
      where: { is_author: true },
      select: { id: true, name: true, image: true },
      orderBy: { name: 'asc' },
    })
  ]);

  // Build region → place_id[] map from place_association
  const regionPlaceMap: Record<string, string[]> = {};
  const regionIds = new Set(regions.map(r => r.place_id));
  for (const assoc of placeAssociations) {
    if (regionIds.has(assoc.parent_id)) {
      if (!regionPlaceMap[assoc.parent_id]) regionPlaceMap[assoc.parent_id] = [];
      regionPlaceMap[assoc.parent_id].push(assoc.child_id);
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-gray-900">New Article</h1>
        <p className="text-gray-500 font-medium">Create a new blog post, guide, or news article.</p>
      </div>

      <ArticleForm 
        categories={categories}
        places={places}
        regions={regions}
        regionPlaceMap={regionPlaceMap}
        authors={authors}
      />
    </div>
  );
}
