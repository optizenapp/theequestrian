'use client';

import { useEffect, useState } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import Link from 'next/link';

type EmailStats = {
  total: {
    sent: number;
    scheduled: number;
    failed: number;
    total: number;
    uniqueRecipients: number;
  };
  recent: Array<{
    id: string;
    orderId: string;
    orderNumber: string;
    customerEmail: string;
    customerName: string | null;
    productTitle: string | null;
    scheduledAt: string | null;
    sentAt: string | null;
    status: string;
    errorMessage: string | null;
    createdAt: string;
  }>;
  daily: Array<{
    date: string;
    count: number;
    sent: number;
    scheduled: number;
    failed: number;
  }>;
};

export default function AdminReviewEmailStatsPage() {
  const [emailStats, setEmailStats] = useState<EmailStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);
  const [statsDays, setStatsDays] = useState(30);

  useEffect(() => {
    async function loadStats() {
      setStatsLoading(true);
      try {
        const response = await fetch(`/api/admin/reviews/email-settings/stats?days=${statsDays}`);
        const data = await response.json();
        setEmailStats(data);
      } catch (error) {
        console.error('Failed to load email stats:', error);
      } finally {
        setStatsLoading(false);
      }
    }
    loadStats();
  }, [statsDays]);

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Email Statistics</h1>
            <p className="text-sm text-gray-500 mt-1">Track review request emails sent to customers.</p>
          </div>
          <Link
            href="/admin/reviews/email"
            className="rounded-full border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:border-action hover:text-action"
          >
            ← Email Settings
          </Link>
        </div>

        {/* Stats Section */}
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Email Statistics</h2>
              <p className="text-sm text-gray-500">Track review request emails sent to customers.</p>
            </div>
            <select
              value={statsDays}
              onChange={(e) => setStatsDays(Number(e.target.value))}
              className="rounded-full border border-gray-300 px-4 py-2 text-sm focus:border-action focus:outline-none focus:ring-2 focus:ring-action/20"
            >
              <option value={7}>Last 7 days</option>
              <option value={30}>Last 30 days</option>
              <option value={90}>Last 90 days</option>
              <option value={365}>Last year</option>
            </select>
          </div>

          {statsLoading ? (
            <div className="text-center py-8 text-gray-400">Loading stats...</div>
          ) : emailStats ? (
            <div className="space-y-6">
              {/* Summary Cards */}
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                  <div className="text-2xl font-bold text-gray-900">{emailStats.total.total}</div>
                  <div className="text-xs text-gray-600 mt-1">Total Emails</div>
                </div>
                <div className="rounded-xl border border-green-200 bg-green-50 p-4">
                  <div className="text-2xl font-bold text-green-700">{emailStats.total.sent}</div>
                  <div className="text-xs text-green-600 mt-1">Sent</div>
                </div>
                <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
                  <div className="text-2xl font-bold text-blue-700">{emailStats.total.scheduled}</div>
                  <div className="text-xs text-blue-600 mt-1">Scheduled</div>
                </div>
                <div className="rounded-xl border border-red-200 bg-red-50 p-4">
                  <div className="text-2xl font-bold text-red-700">{emailStats.total.failed}</div>
                  <div className="text-xs text-red-600 mt-1">Failed</div>
                </div>
                <div className="rounded-xl border border-purple-200 bg-purple-50 p-4">
                  <div className="text-2xl font-bold text-purple-700">{emailStats.total.uniqueRecipients}</div>
                  <div className="text-xs text-purple-600 mt-1">Unique Recipients</div>
                </div>
              </div>

              {/* Recent Sends */}
              <div>
                <h3 className="text-sm font-semibold text-gray-900 mb-3">Recent Email Sends</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left py-2 px-3 text-gray-600 font-semibold">Order</th>
                        <th className="text-left py-2 px-3 text-gray-600 font-semibold">Customer</th>
                        <th className="text-left py-2 px-3 text-gray-600 font-semibold">Product</th>
                        <th className="text-left py-2 px-3 text-gray-600 font-semibold">Status</th>
                        <th className="text-left py-2 px-3 text-gray-600 font-semibold">Sent At</th>
                      </tr>
                    </thead>
                    <tbody>
                      {emailStats.recent.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="text-center py-8 text-gray-400">
                            No emails sent yet
                          </td>
                        </tr>
                      ) : (
                        emailStats.recent.map((send) => (
                          <tr key={send.id} className="border-b border-gray-100 hover:bg-gray-50">
                            <td className="py-2 px-3">
                              <div className="font-medium text-gray-900">
                                {send.orderNumber === 'TEST' ? (
                                  <span className="inline-flex items-center gap-1">
                                    <span className="text-orange-600">#{send.orderNumber}</span>
                                    <span className="text-xs bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded">TEST</span>
                                  </span>
                                ) : (
                                  `#${send.orderNumber}`
                                )}
                              </div>
                              <div className="text-xs text-gray-500">{send.orderId}</div>
                            </td>
                            <td className="py-2 px-3">
                              <div className="text-gray-900">{send.customerEmail}</div>
                              {send.customerName && (
                                <div className="text-xs text-gray-500">{send.customerName}</div>
                              )}
                            </td>
                            <td className="py-2 px-3">
                              <div className="text-gray-900">{send.productTitle || 'N/A'}</div>
                            </td>
                            <td className="py-2 px-3">
                              <span
                                className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${
                                  send.status === 'sent'
                                    ? 'bg-green-100 text-green-700'
                                    : send.status === 'scheduled'
                                    ? 'bg-blue-100 text-blue-700'
                                    : 'bg-red-100 text-red-700'
                                }`}
                              >
                                {send.status}
                              </span>
                              {send.errorMessage && (
                                <div className="text-xs text-red-600 mt-1">{send.errorMessage}</div>
                              )}
                            </td>
                            <td className="py-2 px-3 text-gray-600">
                              {send.sentAt ? (
                                <div>
                                  <div>{new Date(send.sentAt).toLocaleDateString()}</div>
                                  <div className="text-xs text-gray-500">
                                    {new Date(send.sentAt).toLocaleTimeString()}
                                  </div>
                                </div>
                              ) : send.scheduledAt ? (
                                <div>
                                  <div>Scheduled</div>
                                  <div className="text-xs text-gray-500">
                                    {new Date(send.scheduledAt).toLocaleDateString()}
                                  </div>
                                </div>
                              ) : (
                                <span className="text-gray-400">—</span>
                              )}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-gray-400">No stats available</div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
