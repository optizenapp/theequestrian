import React from "react";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import ArticleForm from "../../ArticleForm";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export const dynamic = 'force-dynamic';

interface Props {
  params: Promise<{
    id: string;
  }>;
}

export default async function EditArticlePage({ params }: Props) {
  const { id } = await params;

  const [article, categories, places, regions, placeAssociations, authors] = await Promise.all([
    prisma.article.findUnique({
      where: { article_id: id },
      select: {
        article_id: true,
        title: true,
        slug: true,
        excerpt: true,
        content: true,
        article_type: true,
        status: true,
        featured_image_url: true,
        featured_image_alt: true,
        meta_title: true,
        meta_description: true,
        exclude_from_place_hubs: true,
        primary_category_id: true,
        author_id: true,
        copiq_id: true,
        copiq_social_posts: true,
        pr_contacts: true,
        article_place: {
          include: {
            place: true
          }
        },
        article_category: true,
      }
    }),
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

  if (!article) {
    notFound();
  }

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
        <Link
          href="/admin/articles"
          className="inline-flex items-center gap-2 text-sm font-bold text-gray-600 hover:text-yorkshire-pink mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Articles
        </Link>
        
        <h1 className="text-3xl font-bold tracking-tight text-gray-900">Edit Article</h1>
        <p className="text-gray-500 font-medium">Update {article.title}</p>
      </div>

      <ArticleForm 
        article={article as any}
        categories={categories}
        places={places}
        regions={regions}
        regionPlaceMap={regionPlaceMap}
        authors={authors}
      />
    </div>
  );
}
