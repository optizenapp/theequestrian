"use client";

import { useState, useEffect } from 'react';
import { X, AlignLeft, AlignCenter, AlignRight, Maximize2, Trash2, Link2, ExternalLink } from 'lucide-react';
import type { FigureImageAttributes } from './tiptap/FigureImage';

interface ImageEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageData: FigureImageAttributes | null;
  onSave: (data: FigureImageAttributes) => void;
  onDelete: () => void;
}

export function ImageEditModal({ isOpen, onClose, imageData, onSave, onDelete }: ImageEditModalProps) {
  const [alt, setAlt] = useState('');
  const [caption, setCaption] = useState('');
  const [alignment, setAlignment] = useState<'left' | 'center' | 'right' | 'full'>('center');
  const [href, setHref] = useState('');

  useEffect(() => {
    if (imageData) {
      setAlt(imageData.alt || '');
      setCaption(imageData.caption || '');
      setAlignment(imageData.alignment || 'center');
      setHref(imageData.href || '');
    }
  }, [imageData]);

  if (!isOpen || !imageData) return null;

  const handleSave = () => {
    onSave({
      ...imageData,
      alt,
      caption,
      alignment,
      href: href.trim() || undefined,
    });
    onClose();
  };

  const handleDelete = () => {
    if (confirm('Remove this image from the article?')) {
      onDelete();
      onClose();
    }
  };

  const alignmentOptions: { value: 'left' | 'center' | 'right' | 'full'; icon: React.ReactNode; label: string }[] = [
    { value: 'left', icon: <AlignLeft className="w-4 h-4" />, label: 'Left' },
    { value: 'center', icon: <AlignCenter className="w-4 h-4" />, label: 'Center' },
    { value: 'right', icon: <AlignRight className="w-4 h-4" />, label: 'Right' },
    { value: 'full', icon: <Maximize2 className="w-4 h-4" />, label: 'Full Width' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm" 
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-900">Edit Image</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="overflow-y-auto">
          {/* Preview */}
          <div className="px-6 pt-4">
            <div className="bg-gray-50 rounded-xl p-4 flex items-center justify-center">
              <img
                src={imageData.src}
                alt={alt}
                className="max-h-48 w-auto rounded-lg shadow-sm"
              />
            </div>
          </div>

          {/* Form */}
          <div className="p-6 space-y-5">
            {/* Alt Text */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Alt Text
                <span className="text-gray-400 font-normal ml-1">(for accessibility)</span>
              </label>
              <input
                type="text"
                value={alt}
                onChange={(e) => setAlt(e.target.value)}
                placeholder="Describe this image for screen readers..."
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-yorkshire-pink focus:border-transparent transition-all"
              />
            </div>

            {/* Caption */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Caption
                <span className="text-gray-400 font-normal ml-1">(shown below image)</span>
              </label>
              <input
                type="text"
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                placeholder="Add a caption that appears under the image..."
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-yorkshire-pink focus:border-transparent transition-all"
              />
            </div>

            {/* Link URL */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                <span className="flex items-center gap-1.5">
                  <Link2 className="w-4 h-4" />
                  Link URL
                  <span className="text-gray-400 font-normal">(clicking image opens this link)</span>
                </span>
              </label>
              <div className="relative">
                <input
                  type="url"
                  value={href}
                  onChange={(e) => setHref(e.target.value)}
                  placeholder="https://example.com/destination..."
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-yorkshire-pink focus:border-transparent transition-all pr-10"
                />
                {href && (
                  <a
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-blue-600 transition-colors"
                    title="Test link"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </a>
                )}
              </div>
              {href && (
                <button
                  type="button"
                  onClick={() => setHref('')}
                  className="mt-1.5 text-xs text-red-500 hover:text-red-700 font-medium"
                >
                  Remove link
                </button>
              )}
            </div>

            {/* Alignment */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-3">
                Alignment
              </label>
              <div className="flex gap-2">
                {alignmentOptions.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setAlignment(option.value)}
                    className={`flex-1 flex flex-col items-center gap-1.5 py-3 px-3 rounded-xl border-2 transition-all ${
                      alignment === option.value
                        ? 'border-yorkshire-pink bg-pink-50 text-yorkshire-pink'
                        : 'border-gray-200 hover:border-gray-300 text-gray-600'
                    }`}
                  >
                    {option.icon}
                    <span className="text-xs font-medium">{option.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100 bg-gray-50">
          <button
            type="button"
            onClick={handleDelete}
            className="flex items-center gap-2 px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
          >
            <Trash2 className="w-4 h-4" />
            <span className="font-medium">Remove</span>
          </button>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 text-gray-600 hover:bg-gray-100 rounded-xl font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="px-5 py-2.5 bg-yorkshire-pink text-white rounded-xl font-medium hover:bg-pink-600 transition-colors"
            >
              Save Changes
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
