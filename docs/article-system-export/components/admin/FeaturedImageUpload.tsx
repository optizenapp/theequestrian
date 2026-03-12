"use client";

import { useState, useRef } from 'react';
import { Upload, X, Loader2, Sparkles, Image as ImageIcon, FolderOpen, RotateCw } from 'lucide-react';
import { MediaLibraryPicker } from './MediaLibraryPicker';

interface FeaturedImageUploadProps {
  currentImageUrl: string;
  currentAltText?: string;
  onImageChange: (data: { url: string; altText: string }) => void;
}

interface ImageMetadata {
  url: string;
  altText: string;
  title: string;
  filename: string;
}

export function FeaturedImageUpload({ currentImageUrl, currentAltText = '', onImageChange }: FeaturedImageUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [isGeneratingAlt, setIsGeneratingAlt] = useState(false);
  const [showMetadataModal, setShowMetadataModal] = useState(false);
  const [showMediaLibrary, setShowMediaLibrary] = useState(false);
  const [isRotating, setIsRotating] = useState(false);
  const [metadata, setMetadata] = useState<ImageMetadata | null>(null);
  const [tempFile, setTempFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleMediaLibrarySelect = (image: { url: string; altText: string }) => {
    onImageChange({ url: image.url, altText: image.altText });
    setShowMediaLibrary(false);
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('Image must be less than 5MB');
      return;
    }

    setTempFile(file);
    setIsGeneratingAlt(true);

    try {
      // Upload to temporary location and generate AI metadata
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/admin/upload-featured-image', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Upload failed');
      }

      const data = await response.json();
      
      setMetadata({
        url: data.url,
        altText: data.altText || '',
        title: data.title || file.name.replace(/\.[^/.]+$/, ''),
        filename: data.filename || file.name,
      });
      
      setShowMetadataModal(true);
    } catch (error) {
      console.error('Upload error:', error);
      alert('Failed to upload image. Please try again.');
    } finally {
      setIsGeneratingAlt(false);
    }
  };

  const handleConfirmUpload = () => {
    if (metadata) {
      onImageChange({ url: metadata.url, altText: metadata.altText });
      setShowMetadataModal(false);
      setMetadata(null);
      setTempFile(null);
    }
  };

  const handleCancelUpload = () => {
    setShowMetadataModal(false);
    setMetadata(null);
    setTempFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleRotateImage = async () => {
    if (!currentImageUrl || isRotating) return;
    setIsRotating(true);
    try {
      const res = await fetch('/api/admin/rotate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: currentImageUrl, degrees: 90 }),
      });
      if (!res.ok) throw new Error('Rotation failed');
      const data = await res.json();
      onImageChange({ url: data.url, altText: currentAltText });
    } catch (error) {
      console.error('Rotate failed:', error);
      alert('Failed to rotate image. Please try again.');
    } finally {
      setIsRotating(false);
    }
  };

  const handleRemoveImage = () => {
    onImageChange({ url: '', altText: '' });
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <>
      <div className="space-y-4">
        {/* Hidden file input - always rendered so ref is available for Change Image button */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileSelect}
          className="hidden"
        />

        {/* Current Image Preview */}
        {currentImageUrl && !showMetadataModal && (
          <div className="relative aspect-video w-full rounded-xl overflow-hidden border border-gray-100 group">
            <img 
              src={currentImageUrl} 
              alt="Featured image preview" 
              className="w-full h-full object-cover" 
            />
            <div className="absolute top-2 right-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                type="button"
                onClick={handleRotateImage}
                disabled={isRotating}
                title="Rotate 90°"
                className="p-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50"
              >
                {isRotating ? <Loader2 className="w-4 h-4 animate-spin" /> : <RotateCw className="w-4 h-4" />}
              </button>
              <button
                type="button"
                onClick={handleRemoveImage}
                className="p-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Upload Button */}
        {!currentImageUrl && !isGeneratingAlt && (
          <div className="space-y-3">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="w-full border-2 border-dashed border-gray-200 rounded-xl p-6 hover:border-yorkshire-pink hover:bg-pink-50 transition-all group"
            >
              <div className="flex flex-col items-center gap-2">
                <div className="p-2 bg-gray-100 rounded-lg group-hover:bg-yorkshire-pink/10">
                  <Upload className="w-5 h-5 text-gray-400 group-hover:text-yorkshire-pink" />
                </div>
                <div className="text-center">
                  <p className="font-bold text-gray-700 group-hover:text-yorkshire-pink text-sm">
                    Upload New Image
                  </p>
                  <p className="text-xs text-gray-500">
                    PNG, JPG up to 5MB • AI alt text
                  </p>
                </div>
              </div>
            </button>
            
            <button
              type="button"
              onClick={() => setShowMediaLibrary(true)}
              className="w-full border border-gray-200 rounded-xl p-4 hover:border-gray-300 hover:bg-gray-50 transition-all group flex items-center justify-center gap-3"
            >
              <FolderOpen className="w-5 h-5 text-gray-400 group-hover:text-gray-600" />
              <span className="font-bold text-gray-600 group-hover:text-gray-800 text-sm">
                Choose from Media Library
              </span>
            </button>
          </div>
        )}

        {/* Loading State */}
        {isGeneratingAlt && (
          <div className="border-2 border-dashed border-yorkshire-pink rounded-xl p-8 bg-pink-50">
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="w-8 h-8 text-yorkshire-pink animate-spin" />
              <div className="text-center">
                <p className="font-bold text-gray-700">
                  Uploading & Analyzing Image...
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  AI is generating alt text and metadata
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Change Image Button (when image exists) */}
        {currentImageUrl && !showMetadataModal && (
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Change Image
          </button>
        )}
      </div>

      {/* Metadata Confirmation Modal */}
      {showMetadataModal && metadata && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-yorkshire-pink" />
                  Confirm Image Details
                </h3>
                <button
                  onClick={handleCancelUpload}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>

              {/* Image Preview */}
              <div className="aspect-video w-full rounded-xl overflow-hidden border border-gray-100 mb-6">
                <img 
                  src={metadata.url} 
                  alt="Preview" 
                  className="w-full h-full object-cover" 
                />
              </div>

              {/* Editable Metadata */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    Alt Text (AI Generated)
                  </label>
                  <textarea
                    value={metadata.altText}
                    onChange={(e) => setMetadata({ ...metadata, altText: e.target.value })}
                    rows={2}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-yorkshire-pink/20 text-sm"
                    placeholder="Describe the image for screen readers..."
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    AI-generated description. Edit if needed.
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    Image Title
                  </label>
                  <input
                    type="text"
                    value={metadata.title}
                    onChange={(e) => setMetadata({ ...metadata, title: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-yorkshire-pink/20 text-sm"
                    placeholder="Image title attribute..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    Filename
                  </label>
                  <input
                    type="text"
                    value={metadata.filename}
                    onChange={(e) => setMetadata({ ...metadata, filename: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-yorkshire-pink/20 text-sm font-mono"
                    placeholder="filename.jpg"
                  />
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3 mt-6 pt-6 border-t border-gray-100">
                <button
                  type="button"
                  onClick={handleCancelUpload}
                  className="flex-1 px-4 py-3 border border-gray-200 rounded-xl font-bold text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmUpload}
                  className="flex-1 px-4 py-3 bg-yorkshire-pink text-white rounded-xl font-bold hover:bg-pink-700 transition-colors"
                >
                  Use This Image
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Media Library Picker */}
      <MediaLibraryPicker
        isOpen={showMediaLibrary}
        onClose={() => setShowMediaLibrary(false)}
        onSelect={handleMediaLibrarySelect}
        title="Choose Featured Image"
      />
    </>
  );
}
