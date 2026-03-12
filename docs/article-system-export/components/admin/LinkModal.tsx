'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Link as LinkIcon, ExternalLink, BadgePercent } from 'lucide-react';

interface LinkModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: { url: string; target?: string; rel?: string }) => void;
  initialUrl?: string;
  initialTarget?: string;
  initialRel?: string;
}

export function LinkModal({ 
  isOpen, 
  onClose, 
  onSubmit, 
  initialUrl = '', 
  initialTarget = '',
  initialRel = ''
}: LinkModalProps) {
  const [url, setUrl] = useState(initialUrl);
  const [openInNewTab, setOpenInNewTab] = useState(initialTarget === '_blank');
  const [isSponsored, setIsSponsored] = useState(initialRel?.includes('sponsored') || false);

  useEffect(() => {
    setUrl(initialUrl);
    setOpenInNewTab(initialTarget === '_blank');
    setIsSponsored(initialRel?.includes('sponsored') || false);
  }, [initialUrl, initialTarget, initialRel, isOpen]);

  // Use portal to render outside any parent forms (fixes nested form submission bug)
  const [mounted, setMounted] = useState(false);
  
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!url.trim()) {
      // Empty URL means remove link
      onSubmit({ url: '' });
      return;
    }

    // Build rel attribute
    const relParts: string[] = [];
    if (openInNewTab) {
      relParts.push('noopener');
    }
    if (isSponsored) {
      relParts.push('sponsored');
    }

    onSubmit({
      url: url.trim(),
      target: openInNewTab ? '_blank' : undefined,
      rel: relParts.length > 0 ? relParts.join(' ') : undefined
    });
  };

  const handleRemoveLink = () => {
    onSubmit({ url: '' });
  };

  const modalContent = (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full">
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h3 className="text-lg font-bold flex items-center gap-2">
            <LinkIcon className="w-5 h-5" />
            Link Settings
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">
              URL
            </label>
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://example.com"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yorkshire-pink focus:border-transparent"
              autoFocus
            />
            <p className="text-xs text-gray-500 mt-1">
              Leave empty and click Save to remove the link
            </p>
          </div>

          <div className="space-y-3">
            <label className="flex items-center gap-3 cursor-pointer p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
              <input
                type="checkbox"
                checked={openInNewTab}
                onChange={(e) => setOpenInNewTab(e.target.checked)}
                className="w-5 h-5 rounded border-gray-300 text-yorkshire-pink focus:ring-yorkshire-pink"
              />
              <ExternalLink className="w-5 h-5 text-gray-600" />
              <div>
                <div className="font-bold text-gray-900">Open in new tab</div>
                <div className="text-xs text-gray-500">Link opens in a new browser tab</div>
              </div>
            </label>

            <label className="flex items-center gap-3 cursor-pointer p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
              <input
                type="checkbox"
                checked={isSponsored}
                onChange={(e) => setIsSponsored(e.target.checked)}
                className="w-5 h-5 rounded border-gray-300 text-yorkshire-pink focus:ring-yorkshire-pink"
              />
              <BadgePercent className="w-5 h-5 text-gray-600" />
              <div>
                <div className="font-bold text-gray-900">Sponsored link</div>
                <div className="text-xs text-gray-500">Mark as sponsored (rel=&quot;sponsored&quot;) for SEO compliance</div>
              </div>
            </label>
          </div>

          <div className="flex gap-3 pt-4 border-t border-gray-200">
            {initialUrl && (
              <button
                type="button"
                onClick={handleRemoveLink}
                className="px-4 py-2 text-red-600 font-bold hover:bg-red-50 rounded-lg transition-colors"
              >
                Remove Link
              </button>
            )}
            <div className="flex-1" />
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-gray-200 text-gray-900 font-bold rounded-lg hover:bg-gray-300 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2 bg-yorkshire-pink text-white font-bold rounded-lg hover:bg-pink-700 transition-colors"
            >
              Save Link
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  // Use portal to render outside any parent forms (fixes nested form submission issue)
  if (!mounted) return null;
  return createPortal(modalContent, document.body);
}
