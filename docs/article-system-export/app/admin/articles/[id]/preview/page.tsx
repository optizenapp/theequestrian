import React from "react";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { format } from "date-fns";
import Link from "next/link";
import { ArrowLeft, Edit, AlertTriangle } from "lucide-react";

export const dynamic = 'force-dynamic';

interface Props {
  params: Promise<{
    id: string;
  }>;
}

export default async function ArticlePreviewPage({ params }: Props) {
  const session = await auth();
  
  // Require admin or editor role
  if (!session?.user || !['ADMIN', 'EDITOR'].includes(session.user.role as string)) {
    redirect('/auth/signin');
  }

  const { id } = await params;

  const article = await prisma.article.findUnique({
    where: { article_id: id },
    include: {
      article_category: true,
      article_place: {
        include: { place: true }
      }
    }
  });

  if (!article) {
    notFound();
  }

  const primaryPlace = article.article_place.find(ap => ap.primary_place)?.place || article.article_place[0]?.place;

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Admin Preview Banner */}
      <div className="sticky top-0 z-50 bg-amber-500 text-black py-3 px-6">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5" />
            <span className="font-bold text-sm uppercase tracking-wider">
              Preview Mode {article.status === 'draft' && '(Unpublished Draft)'}
            </span>
          </div>
          <div className="flex items-center gap-4">
            <Link
              href={`/admin/articles/${id}/edit`}
              className="flex items-center gap-2 text-sm font-bold hover:underline"
            >
              <Edit className="w-4 h-4" />
              Edit Article
            </Link>
            <Link
              href="/admin/articles"
              className="flex items-center gap-2 text-sm font-bold hover:underline"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Articles
            </Link>
          </div>
        </div>
      </div>

      {/* Article Content Preview */}
      <div className="bg-white">
        {/* Hero Section */}
        <div className="relative">
          {article.featured_image_url ? (
            <div className="relative h-[40vh] overflow-hidden">
              <img 
                src={article.featured_image_url} 
                alt={article.featured_image_alt || article.title}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 p-8">
                <div className="max-w-4xl mx-auto">
                  <div className="flex flex-wrap gap-2 mb-4">
                    {primaryPlace && (
                      <span className="px-3 py-1 bg-white text-black text-xs font-bold uppercase rounded">
                        {primaryPlace.name}
                      </span>
                    )}
                    {article.article_category && (
                      <span className="px-3 py-1 bg-yorkshire-gold text-black text-xs font-bold uppercase rounded">
                        {article.article_category.name}
                      </span>
                    )}
                    <span className={`px-3 py-1 text-xs font-bold uppercase rounded ${
                      article.status === 'published' 
                        ? 'bg-green-500 text-white' 
                        : 'bg-orange-500 text-white'
                    }`}>
                      {article.status}
                    </span>
                  </div>
                  <h1 className="text-4xl font-black text-white leading-tight">
                    {article.title}
                  </h1>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-gray-900 py-16 px-8">
              <div className="max-w-4xl mx-auto">
                <div className="flex flex-wrap gap-2 mb-4">
                  {primaryPlace && (
                    <span className="px-3 py-1 bg-white text-black text-xs font-bold uppercase rounded">
                      {primaryPlace.name}
                    </span>
                  )}
                  {article.article_category && (
                    <span className="px-3 py-1 bg-yorkshire-gold text-black text-xs font-bold uppercase rounded">
                      {article.article_category.name}
                    </span>
                  )}
                  <span className={`px-3 py-1 text-xs font-bold uppercase rounded ${
                    article.status === 'published' 
                      ? 'bg-green-500 text-white' 
                      : 'bg-orange-500 text-white'
                  }`}>
                    {article.status}
                  </span>
                </div>
                <h1 className="text-4xl font-black text-white leading-tight">
                  {article.title}
                </h1>
              </div>
            </div>
          )}
        </div>

        {/* Article Body */}
        <div className="max-w-4xl mx-auto px-8 py-12">
          {/* Meta info */}
          <div className="flex items-center gap-4 mb-8 pb-8 border-b border-gray-200 text-sm text-gray-500">
            <div>
              <p className="font-bold text-black">{article.author_name || "Welcome to Yorkshire"}</p>
              <div className="flex items-center gap-3">
                {article.published_at ? (
                  <p>Published on {format(new Date(article.published_at), 'MMMM do, yyyy')}</p>
                ) : (
                  <p className="text-orange-600 font-medium">Not yet published</p>
                )}
              </div>
            </div>
          </div>

          {/* Excerpt */}
          {article.excerpt && (
            <div className="mb-8 text-xl text-gray-600 font-medium leading-relaxed border-l-4 border-yorkshire-pink pl-6">
              {article.excerpt}
            </div>
          )}

          {/* Content */}
          <article className="prose prose-lg max-w-none prose-headings:text-black prose-a:text-yorkshire-pink prose-img:rounded-xl">
            <div dangerouslySetInnerHTML={{ __html: article.content }} />
          </article>

          {/* SEO Preview */}
          <div className="mt-12 pt-8 border-t border-gray-200">
            <h3 className="font-bold text-sm text-gray-400 uppercase tracking-wider mb-4">SEO Preview</h3>
            <div className="bg-gray-50 p-6 rounded-xl space-y-4">
              <div>
                <p className="text-xs text-gray-400 mb-1">Meta Title</p>
                <p className="text-blue-600 text-lg font-medium">
                  {article.meta_title || article.title} | Yorkshire News
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-400 mb-1">Meta Description</p>
                <p className="text-gray-600 text-sm">
                  {article.meta_description || article.excerpt || 'No description set'}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-400 mb-1">URL Slug</p>
                <p className="text-green-700 text-sm font-mono">
                  /{article.article_type}/{article.article_category?.slug || 'uncategorized'}/{article.slug}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
