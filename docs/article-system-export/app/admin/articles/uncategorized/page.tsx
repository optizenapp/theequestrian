'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { AlertTriangle, ExternalLink, CheckCircle, Edit } from 'lucide-react';

interface Article {
  article_id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  article_type: string;
  published_at: string | null;
}

interface Category {
  category_id: string;
  name: string;
  slug: string;
}

export default function UncategorizedArticlesPage() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch uncategorized articles
      const articlesRes = await fetch('/api/admin/articles/uncategorized');
      const articlesData = await articlesRes.json();
      
      // Fetch all categories
      const categoriesRes = await fetch('/api/admin/categories');
      const categoriesData = await categoriesRes.json();
      
      if (articlesData.success) {
        setArticles(articlesData.articles);
      }
      
      if (categoriesData.categories) {
        setCategories(categoriesData.categories);
      }
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCategoryChange = async (articleId: string, categoryId: string) => {
    setUpdating(articleId);
    
    try {
      const res = await fetch(`/api/admin/articles/${articleId}/category`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category_id: categoryId })
      });
      
      const data = await res.json();
      
      if (data.success) {
        setNotification({ type: 'success', message: 'Category updated successfully' });
        // Remove article from list
        setArticles(prev => prev.filter(a => a.article_id !== articleId));
        setTimeout(() => setNotification(null), 3000);
      } else {
        setNotification({ type: 'error', message: data.error || 'Failed to update category' });
        setTimeout(() => setNotification(null), 5000);
      }
    } catch (error) {
      setNotification({ type: 'error', message: 'Error updating category' });
      setTimeout(() => setNotification(null), 5000);
    } finally {
      setUpdating(null);
    }
  };

  // Filter categories by article type
  const getRelevantCategories = (articleType: string) => {
    const categoryMap: Record<string, string[]> = {
      'news': ['Sport', 'Business', 'Weather', 'Traffic & Travel', 'Crime & Punishment', 'Politics', 'Rural', 'Community', 'Visitor Economy News'],
      'inspiration': ['Food & Drink', 'Arts & Culture', 'Features', 'Seasonal', 'Outdoors'],
      'history': ['Heritage', 'Genealogy', 'Churches', 'Industrial', 'Archaeology', 'Domesday Book'],
      'guide': ['Tourist Questions', 'Visiting', 'Accessibility', 'Transport'],
    };
    
    const allowedNames = categoryMap[articleType] || [];
    return categories.filter(cat => allowedNames.includes(cat.name));
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        {notification && (
          <div className={`p-4 mb-4 rounded-lg ${
            notification.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
          }`}>
            {notification.message}
          </div>
        )}

        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-gray-900">Uncategorized Articles</h1>
            <p className="text-gray-600 mt-1">Review and assign proper categories to these articles</p>
          </div>
          <Link
            href="/admin/articles"
            className="px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors font-bold text-sm"
          >
            Back to Articles
          </Link>
        </div>

        {/* Stats */}
        <div className="bg-white rounded-lg shadow-sm p-5 mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-8 h-8 text-yellow-500" />
            <div>
              <p className="text-sm font-medium text-gray-600">Articles Needing Review</p>
              <p className="text-3xl font-bold text-gray-900">{articles.length}</p>
            </div>
          </div>
          {articles.length === 0 && !loading && (
            <div className="flex items-center gap-2 text-green-600">
              <CheckCircle className="w-5 h-5" />
              <span className="font-medium">All articles categorized!</span>
            </div>
          )}
        </div>

        {loading ? (
          <div className="text-center py-12 text-gray-500">Loading articles...</div>
        ) : articles.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <p className="text-xl font-medium">🎉 All articles have been categorized!</p>
            <p className="text-sm mt-2">Great work! No uncategorized articles remaining.</p>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Article</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Published</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Assign Category</th>
                  <th className="relative px-4 py-3"><span className="sr-only">Actions</span></th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {articles.map((article) => {
                  const relevantCategories = getRelevantCategories(article.article_type);
                  
                  return (
                    <tr key={article.article_id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div>
                          <p className="font-medium text-gray-900">{article.title}</p>
                          {article.excerpt && (
                            <p className="text-sm text-gray-500 mt-1 line-clamp-2">{article.excerpt}</p>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs font-semibold rounded">
                          {article.article_type}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {article.published_at 
                          ? new Date(article.published_at).toLocaleDateString('en-GB')
                          : 'Draft'
                        }
                      </td>
                      <td className="px-4 py-3">
                        <select
                          onChange={(e) => {
                            if (e.target.value && window.confirm('Assign this category to the article?')) {
                              handleCategoryChange(article.article_id, e.target.value);
                            }
                          }}
                          disabled={updating === article.article_id}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm disabled:opacity-50"
                        >
                          <option value="">Select category...</option>
                          {relevantCategories.map(cat => (
                            <option key={cat.category_id} value={cat.category_id}>
                              {cat.name}
                            </option>
                          ))}
                        </select>
                        {updating === article.article_id && (
                          <p className="text-xs text-gray-500 mt-1">Updating...</p>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right text-sm font-medium flex items-center justify-end gap-2">
                        <Link 
                          href={`/admin/articles/${article.article_id}`}
                          className="text-blue-600 hover:text-blue-900"
                          title="Edit article"
                        >
                          <Edit className="w-4 h-4" />
                        </Link>
                        <a 
                          href={`/inspiration/uncategorized/${article.slug}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-gray-400 hover:text-gray-600"
                          title="View article"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </a>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

