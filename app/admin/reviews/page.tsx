'use client';

import { useState, useEffect } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { ReviewStars } from '@/components/reviews/ReviewStars';

interface Review {
  id: number;
  product_id: string;
  product_handle: string;
  product_title: string;
  rating: number;
  title: string;
  content: string;
  author_name: string;
  author_email: string | null;
  verified_purchase: boolean;
  order_id: string | null;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
}

interface Stats {
  pending_count: number;
  approved_count: number;
  rejected_count: number;
  total_count: number;
  avg_rating: number;
}

export default function AdminReviewsPage() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [editingId, setEditingId] = useState<number | null>(null);
  useEffect(() => {
    fetchReviews();
  }, [filterStatus, searchQuery]);

  const fetchReviews = async () => {
    try {
      const params = new URLSearchParams();
      if (filterStatus !== 'all') params.set('status', filterStatus);
      if (searchQuery) params.set('search', searchQuery);

      const response = await fetch(`/api/admin/reviews?${params}`);
      const data = await response.json();
      setReviews(data.reviews);
      setStats(data.stats);
    } catch (error) {
      console.error('Error fetching reviews:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleStatusChange = async (id: number, status: 'approved' | 'rejected') => {
    try {
      const response = await fetch(`/api/admin/reviews/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });

      if (response.ok) {
        fetchReviews();
      }
    } catch (error) {
      console.error('Error updating review:', error);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this review?')) return;

    try {
      const response = await fetch(`/api/admin/reviews/${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        fetchReviews();
      }
    } catch (error) {
      console.error('Error deleting review:', error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'approved': return 'bg-green-100 text-green-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <AdminLayout title="Review Management" subtitle="Approve, reject, or remove product reviews">
      <div className={isLoading ? 'flex items-center justify-center py-24' : ''}>
        {isLoading && (
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-action mx-auto mb-4"></div>
            <p className="text-gray-600">Loading reviews...</p>
          </div>
        )}
      </div>
      {!isLoading && (
        <>
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8">
            <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
              <p className="text-sm text-gray-600 mb-1">Total Reviews</p>
              <p className="text-3xl font-bold text-gray-900">{stats.total_count}</p>
            </div>
            <div className="bg-yellow-50 rounded-lg shadow-sm p-6 border border-yellow-200">
              <p className="text-sm text-yellow-800 mb-1">Pending</p>
              <p className="text-3xl font-bold text-yellow-900">{stats.pending_count}</p>
            </div>
            <div className="bg-green-50 rounded-lg shadow-sm p-6 border border-green-200">
              <p className="text-sm text-green-800 mb-1">Approved</p>
              <p className="text-3xl font-bold text-green-900">{stats.approved_count}</p>
            </div>
            <div className="bg-red-50 rounded-lg shadow-sm p-6 border border-red-200">
              <p className="text-sm text-red-800 mb-1">Rejected</p>
              <p className="text-3xl font-bold text-red-900">{stats.rejected_count}</p>
            </div>
            <div className="bg-blue-50 rounded-lg shadow-sm p-6 border border-blue-200">
              <p className="text-sm text-blue-800 mb-1">Avg Rating</p>
              <p className="text-3xl font-bold text-blue-900">{stats.avg_rating || 0}★</p>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-sm p-4 mb-6 border border-gray-200">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <input
                type="text"
                placeholder="Search reviews..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-action focus:border-transparent"
              />
            </div>
            <div className="flex gap-2">
              {['all', 'pending', 'approved', 'rejected'].map((status) => (
                <button
                  key={status}
                  onClick={() => setFilterStatus(status)}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors capitalize ${
                    filterStatus === status
                      ? 'bg-action text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {status}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Reviews Table */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          {reviews.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500">No reviews found.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rating</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Review</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {reviews.map((review) => (
                    <tr key={review.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-gray-900 max-w-xs truncate">
                          {review.product_title}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900">{review.author_name}</div>
                        {review.verified_purchase && (
                          <span className="text-xs text-green-600 font-medium">✓ Verified</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <ReviewStars rating={review.rating} size="sm" />
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900 max-w-md">
                          {review.title && <p className="font-medium mb-1">{review.title}</p>}
                          <p className="line-clamp-2 text-gray-600">{review.content}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(review.status)}`}>
                          {review.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {new Date(review.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 text-right text-sm font-medium">
                        <div className="flex items-center justify-end gap-2">
                          {review.status !== 'approved' && (
                            <button
                              onClick={() => handleStatusChange(review.id, 'approved')}
                              className="text-green-600 hover:text-green-900"
                              title="Approve"
                            >
                              ✓
                            </button>
                          )}
                          {review.status !== 'rejected' && (
                            <button
                              onClick={() => handleStatusChange(review.id, 'rejected')}
                              className="text-red-600 hover:text-red-900"
                              title="Reject"
                            >
                              ✗
                            </button>
                          )}
                          <button
                            onClick={() => handleDelete(review.id)}
                            className="text-gray-400 hover:text-red-600"
                            title="Delete"
                          >
                            🗑️
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
        </>
      )}
    </AdminLayout>
  );
}



