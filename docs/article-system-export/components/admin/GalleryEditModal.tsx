"use client";

import { useState, useEffect, useCallback } from 'react';
import { X, Plus, Trash2, GripVertical, Upload, FolderOpen, Image as ImageIcon, Link2, ExternalLink, RotateCw, Loader2 } from 'lucide-react';
import type { GalleryImage, ArticleGalleryAttributes } from './tiptap/ArticleGallery';
import { MediaLibraryPicker } from './MediaLibraryPicker';

interface GalleryEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  galleryData: ArticleGalleryAttributes | null;
  onSave: (data: ArticleGalleryAttributes) => void;
  onDelete: () => void;
}

export function GalleryEditModal({ isOpen, onClose, galleryData, onSave, onDelete }: GalleryEditModalProps) {
  const [title, setTitle] = useState('');
  const [images, setImages] = useState<GalleryImage[]>([]);
  const [editingImage, setEditingImage] = useState<string | null>(null);
  const [isMediaLibraryOpen, setIsMediaLibraryOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [rotatingId, setRotatingId] = useState<string | null>(null);

  useEffect(() => {
    if (galleryData) {
      setTitle(galleryData.title || '');
      setImages(galleryData.images || []);
    }
  }, [galleryData]);

  const generateId = () => `img-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  const handleMediaSelect = useCallback((media: { url: string; altText: string }) => {
    const newImage: GalleryImage = {
      id: generateId(),
      src: media.url,
      alt: media.altText,
      caption: '',
    };
    setImages(prev => [...prev, newImage]);
    setIsMediaLibraryOpen(false);
  }, []);

  const handleUpload = useCallback(async () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.multiple = true;

    input.onchange = async (e) => {
      const files = (e.target as HTMLInputElement).files;
      if (!files || files.length === 0) return;

      setIsUploading(true);

      const newImages: GalleryImage[] = [];

      for (const file of Array.from(files)) {
        if (!file.type.startsWith('image/')) continue;
        if (file.size > 5 * 1024 * 1024) {
          alert(`${file.name} is too large (max 5MB)`);
          continue;
        }

        try {
          const formData = new FormData();
          formData.append('file', file);

          const response = await fetch('/api/upload/image', {
            method: 'POST',
            body: formData,
          });

          if (!response.ok) throw new Error('Upload failed');

          const data = await response.json();
          newImages.push({
            id: generateId(),
            src: data.url,
            alt: '',
            caption: '',
          });
        } catch (error) {
          console.error('Upload failed:', error);
        }
      }

      setImages(prev => [...prev, ...newImages]);
      setIsUploading(false);
    };

    input.click();
  }, []);

  const handleRotateImage = async (id: string) => {
    const img = images.find(i => i.id === id);
    if (!img) return;
    setRotatingId(id);
    try {
      const res = await fetch('/api/admin/rotate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: img.src, degrees: 90 }),
      });
      if (!res.ok) throw new Error('Rotation failed');
      const data = await res.json();
      handleUpdateImage(id, { src: data.url });
    } catch (error) {
      console.error('Rotate failed:', error);
      alert('Failed to rotate image. Please try again.');
    } finally {
      setRotatingId(null);
    }
  };

  const handleRemoveImage = (id: string) => {
    setImages(prev => prev.filter(img => img.id !== id));
  };

  const handleUpdateImage = (id: string, updates: Partial<GalleryImage>) => {
    setImages(prev => prev.map(img => 
      img.id === id ? { ...img, ...updates } : img
    ));
  };

  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;

    const newImages = [...images];
    const [draggedImage] = newImages.splice(draggedIndex, 1);
    newImages.splice(index, 0, draggedImage);
    setImages(newImages);
    setDraggedIndex(index);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

  const handleSave = () => {
    onSave({ images, title });
    onClose();
  };

  const handleDeleteGallery = () => {
    if (confirm('Remove this gallery from the article?')) {
      onDelete();
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <MediaLibraryPicker
        isOpen={isMediaLibraryOpen}
        onClose={() => setIsMediaLibraryOpen(false)}
        onSelect={handleMediaSelect}
        title="Add Image to Gallery"
      />

      <div className="fixed inset-0 z-50 flex items-center justify-center">
        {/* Backdrop */}
        <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
        
        {/* Modal */}
        <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-4xl mx-4 max-h-[90vh] overflow-hidden flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 flex-shrink-0">
            <h2 className="text-lg font-bold text-gray-900">Edit Gallery</h2>
            <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6">
            {/* Title */}
            <div className="mb-6">
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Gallery Title
                <span className="text-gray-400 font-normal ml-1">(optional)</span>
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Property Images, Event Photos..."
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-yorkshire-pink focus:border-transparent transition-all"
              />
            </div>

            {/* Add Images Buttons */}
            <div className="flex gap-3 mb-6">
              <button
                type="button"
                onClick={handleUpload}
                disabled={isUploading}
                className="flex-1 flex items-center justify-center gap-2 py-3 px-4 border-2 border-dashed border-gray-300 rounded-xl hover:border-yorkshire-pink hover:bg-pink-50/50 transition-all disabled:opacity-50"
              >
                {isUploading ? (
                  <Upload className="w-5 h-5 animate-pulse text-yorkshire-pink" />
                ) : (
                  <Upload className="w-5 h-5 text-gray-500" />
                )}
                <span className="font-medium text-gray-700">
                  {isUploading ? 'Uploading...' : 'Upload Images'}
                </span>
              </button>
              <button
                type="button"
                onClick={() => setIsMediaLibraryOpen(true)}
                className="flex-1 flex items-center justify-center gap-2 py-3 px-4 border-2 border-dashed border-gray-300 rounded-xl hover:border-yorkshire-pink hover:bg-pink-50/50 transition-all"
              >
                <FolderOpen className="w-5 h-5 text-gray-500" />
                <span className="font-medium text-gray-700">From Library</span>
              </button>
            </div>

            {/* Images Grid */}
            {images.length === 0 ? (
              <div className="border-2 border-dashed border-gray-200 rounded-xl p-12 text-center">
                <ImageIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">No images in gallery yet</p>
                <p className="text-sm text-gray-400 mt-1">Upload or select images from the library</p>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-sm text-gray-500 mb-3">
                  Drag to reorder. First image will be featured (larger).
                </p>
                {images.map((img, index) => (
                  <div
                    key={img.id}
                    draggable
                    onDragStart={() => handleDragStart(index)}
                    onDragOver={(e) => handleDragOver(e, index)}
                    onDragEnd={handleDragEnd}
                    className={`flex items-center gap-4 p-3 bg-gray-50 rounded-xl border border-gray-100 ${
                      draggedIndex === index ? 'opacity-50' : ''
                    } ${index === 0 ? 'ring-2 ring-yorkshire-pink ring-offset-2' : ''}`}
                  >
                    {/* Drag Handle */}
                    <div className="cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-600">
                      <GripVertical className="w-5 h-5" />
                    </div>

                    {/* Thumbnail */}
                    <div className="w-20 h-14 rounded-lg overflow-hidden bg-gray-200 flex-shrink-0">
                      <img src={img.src} alt={img.alt || ''} className="w-full h-full object-cover" />
                    </div>

                    {/* Badge for featured */}
                    {index === 0 && (
                      <span className="px-2 py-1 bg-yorkshire-pink text-white text-xs font-medium rounded-full flex-shrink-0">
                        Featured
                      </span>
                    )}

                    {/* Edit Fields */}
                    {editingImage === img.id ? (
                      <div className="flex-1 space-y-2">
                        <input
                          type="text"
                          value={img.alt || ''}
                          onChange={(e) => handleUpdateImage(img.id, { alt: e.target.value })}
                          placeholder="Alt text..."
                          className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-yorkshire-pink focus:border-transparent"
                        />
                        <input
                          type="text"
                          value={img.caption || ''}
                          onChange={(e) => handleUpdateImage(img.id, { caption: e.target.value })}
                          placeholder="Caption..."
                          className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-yorkshire-pink focus:border-transparent"
                        />
                        <div className="flex items-center gap-2">
                          <Link2 className="w-4 h-4 text-gray-400 flex-shrink-0" />
                          <input
                            type="url"
                            value={img.href || ''}
                            onChange={(e) => handleUpdateImage(img.id, { href: e.target.value || undefined })}
                            placeholder="Link URL (optional)..."
                            className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          />
                          {img.href && (
                            <a href={img.href} target="_blank" rel="noopener noreferrer" className="p-1 text-blue-500 hover:text-blue-700" title="Test link">
                              <ExternalLink className="w-4 h-4" />
                            </a>
                          )}
                        </div>
                        <button
                          onClick={() => setEditingImage(null)}
                          className="text-xs text-yorkshire-pink font-medium"
                        >
                          Done
                        </button>
                      </div>
                    ) : (
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {img.caption || img.alt || 'No caption'}
                        </p>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setEditingImage(img.id)}
                            className="text-xs text-gray-500 hover:text-yorkshire-pink"
                          >
                            Edit details
                          </button>
                          {img.href && (
                            <span className="inline-flex items-center gap-1 text-xs text-blue-600">
                              <Link2 className="w-3 h-3" />
                              Linked
                            </span>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Rotate */}
                    <button
                      onClick={() => handleRotateImage(img.id)}
                      disabled={rotatingId === img.id}
                      title="Rotate 90°"
                      className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors flex-shrink-0 disabled:opacity-50"
                    >
                      {rotatingId === img.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <RotateCw className="w-4 h-4" />
                      )}
                    </button>

                    {/* Delete */}
                    <button
                      onClick={() => handleRemoveImage(img.id)}
                      className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors flex-shrink-0"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100 bg-gray-50 flex-shrink-0">
            <button
              type="button"
              onClick={handleDeleteGallery}
              className="flex items-center gap-2 px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              <span className="font-medium">Remove Gallery</span>
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
                Save Gallery
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
