'use client';

import { useState, useTransition } from 'react';
import { Trash2, X } from 'lucide-react';
import { deleteArticleAction } from './actions';
import { useRouter } from 'next/navigation';

interface DeleteArticleButtonProps {
  articleId: string;
  articleTitle: string;
  variant?: 'icon' | 'button';
  redirectAfterDelete?: boolean;
}

export function DeleteArticleButton({
  articleId,
  articleTitle,
  variant = 'button',
  redirectAfterDelete = false,
}: DeleteArticleButtonProps) {
  const router = useRouter();
  const [showConfirm, setShowConfirm] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const handleDelete = () => {
    if (confirmText !== 'DELETE') {
      setError('Please type "DELETE" to confirm');
      return;
    }
    startTransition(async () => {
      const result = await deleteArticleAction(articleId);
      if (result.success) {
        if (redirectAfterDelete) {
          router.push('/admin/articles');
        } else {
          router.refresh();
        }
      } else {
        setError(result.error ?? 'Failed to delete article');
      }
    });
  };

  const modal = (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-gray-900">Delete Article</h3>
          <button
            onClick={() => setShowConfirm(false)}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>
        <p className="text-sm text-gray-600 mb-4">You are about to permanently delete:</p>
        <p className="font-bold text-gray-900 mb-4 p-3 bg-gray-50 rounded-lg">{articleTitle}</p>
        <p className="text-sm text-gray-600 mb-4">
          Type <span className="font-bold text-red-600">DELETE</span> to confirm:
        </p>
        <input
          type="text"
          value={confirmText}
          onChange={(e) => {
            setConfirmText(e.target.value);
            setError(null);
          }}
          placeholder="Type DELETE"
          className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 mb-2"
          autoFocus
        />
        {error && <p className="text-sm text-red-600 mb-4">{error}</p>}
        <div className="flex gap-3 mt-6">
          <button
            onClick={() => setShowConfirm(false)}
            className="flex-1 px-4 py-2 border border-gray-200 rounded-lg font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            disabled={isPending}
          >
            Cancel
          </button>
          <button
            onClick={handleDelete}
            disabled={isPending || confirmText !== 'DELETE'}
            className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg font-bold hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isPending ? 'Deleting...' : 'Delete Article'}
          </button>
        </div>
      </div>
    </div>
  );

  if (variant === 'icon') {
    return (
      <>
        <button
          onClick={() => setShowConfirm(true)}
          className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
          title="Delete article"
        >
          <Trash2 className="w-4 h-4" />
        </button>
        {showConfirm && modal}
      </>
    );
  }

  return (
    <>
      <button
        onClick={() => setShowConfirm(true)}
        type="button"
        className="w-full px-4 py-3 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 transition-all flex items-center justify-center gap-2"
      >
        <Trash2 className="w-4 h-4" /> Delete Article
      </button>
      {showConfirm && modal}
    </>
  );
}
