import React from "react";
import { prisma } from "@/lib/prisma";
import { 
  FileText, 
  Plus, 
  Search, 
  Clock, 
  CheckCircle2, 
  AlertCircle,
  Eye,
  ArrowUpRight,
  Filter,
  ExternalLink,
  ChevronLeft,
  ChevronRight
} from "lucide-react";
import Link from "next/link";
import { DeleteArticleButton } from "./DeleteArticleButton";
import { getArticleUrl } from "@/lib/articles";
import { ArticleSearchForm } from "./ArticleSearchForm";


export const dynamic = 'force-dynamic';

const ARTICLES_PER_PAGE = 50;

interface Props {
  searchParams: Promise<{
    q?: string;
    status?: string;
    page?: string;
  }>;
}

export default async function AdminArticlesPage({ searchParams }: Props) {
  const params = await searchParams;
  const searchQuery = params.q || "";
  const statusFilter = params.status || "";
  const currentPage = parseInt(params.page || "1", 10);
  // Get uncategorized category
  const uncategorizedCategory = await prisma.article_category.findFirst({
    where: {
      OR: [
        { slug: 'uncategorized' },
        { name: { contains: 'Uncategorized', mode: 'insensitive' } }
      ]
    }
  });

  // Build the where clause for filtering
  const whereClause: any = {};
  
  if (searchQuery) {
    whereClause.OR = [
      { title: { contains: searchQuery, mode: 'insensitive' } },
      { slug: { contains: searchQuery, mode: 'insensitive' } },
      { excerpt: { contains: searchQuery, mode: 'insensitive' } },
      { content: { contains: searchQuery, mode: 'insensitive' } }
    ];
  }
  
  if (statusFilter) {
    if (statusFilter === 'published') {
      whereClause.status = { in: ['published', 'publish'] };
    } else if (statusFilter === 'draft') {
      whereClause.status = 'draft';
    }
  }

  const [totalArticles, draftArticles, uncategorizedCount, filteredCount, articles] = await Promise.all([
    prisma.article.count(),
    prisma.article.count({ where: { status: 'draft' } }),
    uncategorizedCategory 
      ? prisma.article.count({
          where: {
            primary_category_id: uncategorizedCategory.category_id,
            article_type: { in: ['news', 'inspiration', 'history', 'guide', 'route'] }
          }
        })
      : Promise.resolve(0),
    prisma.article.count({ where: whereClause }),
    prisma.article.findMany({
      where: whereClause,
      orderBy: { created_at: 'desc' },
      skip: (currentPage - 1) * ARTICLES_PER_PAGE,
      take: ARTICLES_PER_PAGE,
      include: {
        article_category: true,
        article_place: {
          include: { place: true }
        }
      }
    })
  ]);

  const totalPages = Math.ceil(filteredCount / ARTICLES_PER_PAGE);

  return (
    <div className="space-y-8 text-black">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">Article Management</h1>
          <p className="text-gray-500 font-medium">Manage news, travel guides, reviews, and blog posts.</p>
        </div>
        <Link href="/admin/articles/new" className="bg-black text-white px-6 py-3 rounded-xl font-bold hover:bg-yorkshire-pink transition-all flex items-center gap-2 shadow-lg">
          <Plus className="w-5 h-5" /> New Article
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
          <div className="bg-blue-50 text-blue-600 p-3 rounded-xl w-fit mb-4">
            <FileText className="w-6 h-6" />
          </div>
          <p className="text-[10px] font-bold tracking-widest text-gray-400 leading-none mb-1">Total Articles</p>
          <p className="text-2xl font-bold text-gray-900">{totalArticles.toLocaleString()}</p>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
          <div className="bg-orange-50 text-orange-600 p-3 rounded-xl w-fit mb-4">
            <Clock className="w-6 h-6" />
          </div>
          <p className="text-[10px] font-bold tracking-widest text-gray-400 leading-none mb-1">Drafts</p>
          <p className="text-2xl font-bold text-gray-900">{draftArticles}</p>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
          <div className="bg-green-50 text-green-600 p-3 rounded-xl w-fit mb-4">
            <Eye className="w-6 h-6" />
          </div>
          <p className="text-[10px] font-bold tracking-widest text-gray-400 leading-none mb-1">Published</p>
          <p className="text-2xl font-bold text-gray-900">{totalArticles - draftArticles}</p>
        </div>
        <Link href="/admin/articles/uncategorized" className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm hover:border-yellow-300 transition-all group">
          <div className="bg-yellow-50 text-yellow-600 p-3 rounded-xl w-fit mb-4 group-hover:bg-yellow-100 transition-colors">
            <AlertCircle className="w-6 h-6" />
          </div>
          <p className="text-[10px] font-bold tracking-widest text-gray-400 leading-none mb-1">Needs Review</p>
          <p className="text-2xl font-bold text-gray-900">{uncategorizedCount}</p>
          {uncategorizedCount > 0 && (
            <p className="text-xs text-yellow-600 mt-2 font-medium">Click to categorize →</p>
          )}
        </Link>
      </div>

      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="p-8 border-b border-gray-50 flex flex-col md:flex-row justify-between items-center gap-4 bg-gray-50/50">
          <div>
            <h2 className="font-bold text-xl uppercase">
              {searchQuery ? `Search: "${searchQuery}"` : 'Recent Articles'}
            </h2>
            {(searchQuery || statusFilter) && (
              <p className="text-sm text-gray-500">
                Showing {filteredCount} result{filteredCount !== 1 ? 's' : ''}
                {statusFilter && <span className="ml-1">({statusFilter})</span>}
              </p>
            )}
          </div>
          <ArticleSearchForm 
            initialQuery={searchQuery} 
            initialStatus={statusFilter}
          />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-gray-50 text-[10px] font-bold tracking-widest text-gray-400">
                <th className="px-8 py-4">Article</th>
                <th className="px-8 py-4">Place</th>
                <th className="px-8 py-4">Category</th>
                <th className="px-8 py-4 text-center">Hubs</th>
                <th className="px-8 py-4">Status</th>
                <th className="px-8 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {articles.map(art => (
                <tr key={art.article_id} className="hover:bg-gray-50/50 transition-colors group">
                  <td className="px-8 py-6">
                    <div>
                      <p className="font-bold text-gray-900 group-hover:text-yorkshire-pink transition-colors">{art.title}</p>
                      <p className="text-xs text-gray-400">/{art.slug}</p>
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <span className="text-xs font-bold text-gray-500">
                      {art.article_place[0]?.place.name || 'Global'}
                    </span>
                  </td>
                  <td className="px-8 py-6">
                    {art.article_category ? (
                      <span className="px-3 py-1 bg-gray-100 text-gray-600 rounded-lg text-[10px] font-bold tracking-widest uppercase">
                        {art.article_category.name}
                      </span>
                    ) : (
                      <span className="px-3 py-1 bg-red-50 text-red-600 rounded-lg text-[10px] font-bold tracking-widest uppercase flex items-center gap-1 w-fit">
                        <AlertCircle className="w-3 h-3" /> Missing
                      </span>
                    )}
                  </td>
                  <td className="px-8 py-6 text-center">
                    {(art as any).exclude_from_place_hubs ? (
                      <span className="text-[10px] font-black text-orange-600 uppercase tracking-tighter" title="Hidden from Place Hubs">Hidden</span>
                    ) : (
                      <span className="text-[10px] font-black text-green-600 uppercase tracking-tighter" title="Shown on Place Hubs">Visible</span>
                    )}
                  </td>
                  <td className="px-8 py-6">
                    {art.status === 'publish' || art.status === 'published' ? (
                      <span className="flex items-center gap-1.5 text-[10px] font-bold tracking-widest text-green-600 uppercase">
                        <CheckCircle2 className="w-3 h-3" /> Published
                      </span>
                    ) : (
                      <span className="flex items-center gap-1.5 text-[10px] font-bold tracking-widest text-orange-500 uppercase">
                        <Clock className="w-3 h-3" /> Draft
                      </span>
                    )}
                  </td>
                  <td className="px-8 py-6 text-right">
                    <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Link 
                        href={getArticleUrl(art)}
                        target="_blank"
                        className="p-2 text-gray-400 hover:text-yorkshire-pink hover:bg-pink-50 rounded-lg transition-colors"
                        title="View article"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </Link>
                      <Link 
                        href={`/admin/articles/${art.article_id}/edit`}
                        className="text-xs font-bold tracking-widest text-yorkshire-pink hover:underline px-2"
                      >
                        Edit
                      </Link>
                      <DeleteArticleButton 
                        articleId={art.article_id}
                        articleTitle={art.title}
                        variant="icon"
                      />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="p-6 border-t border-gray-100 bg-gray-50/50 flex items-center justify-between">
            <p className="text-sm text-gray-500">
              Page {currentPage} of {totalPages} ({filteredCount} articles)
            </p>
            <div className="flex items-center gap-2">
              {currentPage > 1 && (
                <Link
                  href={`/admin/articles?${new URLSearchParams({
                    ...(searchQuery && { q: searchQuery }),
                    ...(statusFilter && { status: statusFilter }),
                    page: String(currentPage - 1)
                  })}`}
                  className="flex items-center gap-1 px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm font-bold hover:bg-gray-50 transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                  Previous
                </Link>
              )}
              
              {/* Page numbers */}
              <div className="hidden md:flex items-center gap-1">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum: number;
                  if (totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (currentPage <= 3) {
                    pageNum = i + 1;
                  } else if (currentPage >= totalPages - 2) {
                    pageNum = totalPages - 4 + i;
                  } else {
                    pageNum = currentPage - 2 + i;
                  }
                  return (
                    <Link
                      key={pageNum}
                      href={`/admin/articles?${new URLSearchParams({
                        ...(searchQuery && { q: searchQuery }),
                        ...(statusFilter && { status: statusFilter }),
                        page: String(pageNum)
                      })}`}
                      className={`px-3 py-2 rounded-lg text-sm font-bold transition-colors ${
                        pageNum === currentPage
                          ? 'bg-yorkshire-pink text-white'
                          : 'bg-white border border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      {pageNum}
                    </Link>
                  );
                })}
              </div>

              {currentPage < totalPages && (
                <Link
                  href={`/admin/articles?${new URLSearchParams({
                    ...(searchQuery && { q: searchQuery }),
                    ...(statusFilter && { status: statusFilter }),
                    page: String(currentPage + 1)
                  })}`}
                  className="flex items-center gap-1 px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm font-bold hover:bg-gray-50 transition-colors"
                >
                  Next
                  <ChevronRight className="w-4 h-4" />
                </Link>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

