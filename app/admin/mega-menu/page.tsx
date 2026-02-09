'use client';

import { useEffect, useState } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';

interface MegaMenuContent {
  id: number;
  category: string;
  featured_image_url: string | null;
  featured_title: string | null;
  featured_subtitle: string | null;
  featured_link: string | null;
  quick_links: Array<{ title: string; imageUrl: string; link: string }>;
  subcategory_cards: Array<{ title: string; imageUrl: string; link: string }>;
  created_at: string;
  updated_at: string;
}

export default function MegaMenuAdminPage() {
  const [content, setContent] = useState<MegaMenuContent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<Partial<MegaMenuContent>>({});
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetchContent();
  }, []);

  const fetchContent = async () => {
    try {
      const response = await fetch('/api/admin/mega-menu');
      const data = await response.json();
      setContent(data);
    } catch (error) {
      console.error('Error fetching mega menu content:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const startEditing = (item: MegaMenuContent) => {
    setEditingId(item.id);
    setEditForm({ ...item });
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditForm({});
  };

  const saveChanges = async () => {
    if (!editForm.category) return;
    
    setIsSaving(true);
    try {
      const response = await fetch('/api/admin/mega-menu', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm),
      });

      if (response.ok) {
        await fetchContent();
        setEditingId(null);
        setEditForm({});
        alert('Mega menu content updated successfully!');
      } else {
        alert('Failed to update mega menu content');
      }
    } catch (error) {
      console.error('Error saving:', error);
      alert('Error saving changes');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <AdminLayout title="Mega Menu Content" subtitle="Manage featured images and quick links">
      <div className="space-y-6">
        {/* Info Card */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <svg className="h-5 w-5 text-blue-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <h3 className="text-sm font-semibold text-blue-900 mb-1">Mega Menu Content</h3>
              <p className="text-sm text-blue-800">
                Configure featured images, quick links, and subcategory cards for each top-level category.
                Changes are cached for 15 minutes.
              </p>
            </div>
          </div>
        </div>

        {/* Content List */}
        {isLoading ? (
          <div className="bg-white rounded-lg shadow-sm p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-action mx-auto mb-4"></div>
            <p className="text-gray-600">Loading mega menu content...</p>
          </div>
        ) : (
          <div className="space-y-4">
            {content.map((item) => (
              <div key={item.id} className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                <div className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 capitalize">{item.category}</h3>
                      <p className="text-sm text-gray-500">
                        Last updated: {new Date(item.updated_at).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      {editingId === item.id ? (
                        <>
                          <button
                            onClick={saveChanges}
                            disabled={isSaving}
                            className="px-4 py-2 text-sm font-medium text-white bg-action rounded-lg hover:bg-pink-600 transition disabled:opacity-50"
                          >
                            {isSaving ? 'Saving...' : 'Save'}
                          </button>
                          <button
                            onClick={cancelEditing}
                            disabled={isSaving}
                            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition"
                          >
                            Cancel
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={() => startEditing(item)}
                          className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition"
                        >
                          Edit
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Featured Image */}
                  <div className="mb-4">
                    <h4 className="text-sm font-semibold text-gray-700 mb-2">Featured Image</h4>
                    {editingId === item.id ? (
                      <div className="space-y-3 bg-gray-50 p-4 rounded-lg">
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">Image URL</label>
                          <input
                            type="text"
                            value={editForm.featured_image_url || ''}
                            onChange={(e) => setEditForm({ ...editForm, featured_image_url: e.target.value })}
                            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-action focus:border-transparent"
                            placeholder="https://cdn.shopify.com/..."
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">Title</label>
                          <input
                            type="text"
                            value={editForm.featured_title || ''}
                            onChange={(e) => setEditForm({ ...editForm, featured_title: e.target.value })}
                            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-action focus:border-transparent"
                            placeholder="Horse"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">Subtitle</label>
                          <input
                            type="text"
                            value={editForm.featured_subtitle || ''}
                            onChange={(e) => setEditForm({ ...editForm, featured_subtitle: e.target.value })}
                            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-action focus:border-transparent"
                            placeholder="The best for your horse"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">Link</label>
                          <input
                            type="text"
                            value={editForm.featured_link || ''}
                            onChange={(e) => setEditForm({ ...editForm, featured_link: e.target.value })}
                            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-action focus:border-transparent"
                            placeholder="/horse"
                          />
                        </div>
                        {editForm.featured_image_url && (
                          <div>
                            <p className="text-xs font-medium text-gray-700 mb-1">Preview:</p>
                            <img
                              src={editForm.featured_image_url}
                              alt="Preview"
                              className="w-full max-w-md h-40 object-cover rounded-lg"
                            />
                          </div>
                        )}
                      </div>
                    ) : (
                      item.featured_image_url ? (
                        <div className="flex items-start gap-4">
                          <img
                            src={item.featured_image_url}
                            alt={item.featured_title || item.category}
                            className="w-32 h-20 object-cover rounded-lg"
                          />
                          <div className="flex-1">
                            <p className="text-sm font-medium text-gray-900">{item.featured_title}</p>
                            <p className="text-xs text-gray-600">{item.featured_subtitle}</p>
                            <p className="text-xs text-gray-500 mt-1">
                              Link: <a href={item.featured_link || '#'} className="text-action hover:underline">{item.featured_link}</a>
                            </p>
                          </div>
                        </div>
                      ) : (
                        <p className="text-sm text-gray-500 italic">No featured image configured</p>
                      )
                    )}
                  </div>

                  {/* Quick Links */}
                  <div className="mb-4">
                    <h4 className="text-sm font-semibold text-gray-700 mb-2">
                      Quick Links ({item.quick_links?.length || 0})
                    </h4>
                    {item.quick_links && item.quick_links.length > 0 ? (
                      <div className="grid grid-cols-2 gap-2">
                        {item.quick_links.map((link, idx) => (
                          <div key={idx} className="flex items-center gap-2 p-2 bg-gray-50 rounded">
                            <img src={link.imageUrl} alt={link.title} className="w-10 h-10 object-cover rounded" />
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-medium text-gray-900 truncate">{link.title}</p>
                              <p className="text-xs text-gray-500 truncate">{link.link}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500 italic">No quick links configured</p>
                    )}
                  </div>

                  {/* Subcategory Cards */}
                  <div>
                    <h4 className="text-sm font-semibold text-gray-700 mb-2">
                      Subcategory Cards ({item.subcategory_cards?.length || 0})
                    </h4>
                    {item.subcategory_cards && item.subcategory_cards.length > 0 ? (
                      <div className="grid grid-cols-3 gap-2">
                        {item.subcategory_cards.map((card, idx) => (
                          <div key={idx} className="flex items-center gap-2 p-2 bg-gray-50 rounded">
                            <img src={card.imageUrl} alt={card.title} className="w-10 h-10 object-cover rounded" />
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-medium text-gray-900 truncate">{card.title}</p>
                              <p className="text-xs text-gray-500 truncate">{card.link}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500 italic">No subcategory cards configured</p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Instructions */}
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <h3 className="text-sm font-semibold text-gray-900 mb-2">How to Update</h3>
          <div className="text-sm text-gray-700 space-y-2">
            <p><strong>Option 1:</strong> Update via database directly (recommended for now)</p>
            <p><strong>Option 2:</strong> Update CSV file and run: <code className="bg-gray-200 px-2 py-1 rounded">npm run migrate:mega-menu</code></p>
            <p><strong>Option 3:</strong> Use the API endpoint: <code className="bg-gray-200 px-2 py-1 rounded">PUT /api/admin/mega-menu</code></p>
            <p className="text-xs text-gray-500 mt-2">Note: Full editing UI coming soon. For now, this page is read-only.</p>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
