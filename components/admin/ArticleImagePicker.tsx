'use client';

import { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { X, Upload, Image as ImageIcon, Check, Loader2 } from 'lucide-react';

interface ArticleImagePickerProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (image: { url: string; altText?: string }) => void;
  title?: string;
}

export function ArticleImagePicker({
  isOpen,
  onClose,
  onSelect,
  title = 'Insert image',
}: ArticleImagePickerProps) {
  const [tab, setTab] = useState<'upload' | 'browse'>('upload');
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [images, setImages] = useState<{ url: string; key: string }[]>([]);
  const [loadingImages, setLoadingImages] = useState(false);
  const [selectedUrl, setSelectedUrl] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const fetchImages = useCallback(async () => {
    setLoadingImages(true);
    try {
      const res = await fetch('/api/admin/articles/images');
      if (res.ok) {
        const data = await res.json();
        setImages(data.images ?? []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingImages(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen && tab === 'browse') {
      fetchImages();
    }
  }, [isOpen, tab, fetchImages]);

  useEffect(() => {
    if (!isOpen) {
      setTab('upload');
      setUploadFile(null);
      setUploadError(null);
      setSelectedUrl(null);
    }
  }, [isOpen]);

  const handleUpload = async () => {
    if (!uploadFile) return;
    setUploading(true);
    setUploadError(null);
    try {
      const formData = new FormData();
      formData.append('file', uploadFile);
      const res = await fetch('/api/admin/articles/upload-image', {
        method: 'POST',
        body: formData,
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Upload failed');
      }
      const data = await res.json();
      if (data.url) {
        onSelect({ url: data.url });
        onClose();
      }
    } catch (e) {
      setUploadError(e instanceof Error ? e.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleSelectFromLibrary = () => {
    if (selectedUrl) {
      onSelect({ url: selectedUrl });
      onClose();
    }
  };

  if (!isOpen) return null;

  const modalContent = (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h3 className="text-xl font-bold text-gray-900">{title}</h3>
          <button
            type="button"
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex border-b border-gray-100">
          <button
            type="button"
            onClick={() => setTab('upload')}
            className={`flex-1 py-3 text-sm font-medium transition-colors ${
              tab === 'upload'
                ? 'text-action border-b-2 border-action bg-gray-50'
                : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            Upload to S3
          </button>
          <button
            type="button"
            onClick={() => setTab('browse')}
            className={`flex-1 py-3 text-sm font-medium transition-colors ${
              tab === 'browse'
                ? 'text-action border-b-2 border-action bg-gray-50'
                : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            Choose from S3
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {tab === 'upload' && (
            <div className="space-y-4">
              <label className="block">
                <span className="text-sm font-medium text-gray-700">Image file (max 5MB)</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    setUploadFile(f ?? null);
                    setUploadError(null);
                  }}
                  className="mt-1 block w-full text-sm text-gray-600 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border file:border-gray-200 file:bg-gray-50 file:font-medium hover:file:bg-gray-100"
                />
              </label>
              {uploadError && (
                <p className="text-sm text-red-600">{uploadError}</p>
              )}
              <button
                type="button"
                onClick={handleUpload}
                disabled={!uploadFile || uploading}
                className="inline-flex items-center gap-2 rounded-xl bg-action px-4 py-2.5 font-bold text-white hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {uploading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Uploading…
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4" />
                    Upload and insert
                  </>
                )}
              </button>
            </div>
          )}

          {tab === 'browse' && (
            <div>
              {loadingImages ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
                </div>
              ) : images.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-gray-500">
                  <ImageIcon className="w-12 h-12 mb-3 text-gray-300" />
                  <p className="font-medium">No images in S3 yet</p>
                  <p className="text-sm">Upload images using the “Upload to S3” tab</p>
                </div>
              ) : (
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                  {images.map((img) => (
                    <button
                      key={img.key}
                      type="button"
                      onClick={() => setSelectedUrl(img.url)}
                      className={`relative aspect-square rounded-lg overflow-hidden border-2 transition-all ${
                        selectedUrl === img.url
                          ? 'border-action ring-2 ring-action/30'
                          : 'border-transparent hover:border-gray-300'
                      }`}
                    >
                      <img
                        src={img.url}
                        alt=""
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                      {selectedUrl === img.url && (
                        <div className="absolute inset-0 bg-action/20 flex items-center justify-center">
                          <div className="bg-action rounded-full p-1">
                            <Check className="w-4 h-4 text-white" />
                          </div>
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {tab === 'browse' && (
          <div className="flex items-center justify-between p-4 border-t border-gray-200 bg-gray-50">
            <span className="text-sm text-gray-600">
              {selectedUrl ? 'Selected' : 'Click an image to select'}
            </span>
            <button
              type="button"
              onClick={handleSelectFromLibrary}
              disabled={!selectedUrl}
              className="rounded-xl bg-action px-4 py-2 font-bold text-white hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Insert image
            </button>
          </div>
        )}
      </div>
    </div>
  );

  if (!mounted) return null;
  return createPortal(modalContent, document.body);
}
