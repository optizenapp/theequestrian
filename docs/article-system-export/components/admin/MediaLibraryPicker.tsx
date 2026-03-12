'use client';

import { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { 
  X, 
  Search, 
  Image as ImageIcon,
  ChevronLeft,
  ChevronRight,
  Check
} from 'lucide-react';

interface MediaImage {
  image_id: string;
  image_url: string | null;
  alt_text: string | null;
  caption: string | null;
  entity?: {
    name: string;
    type_slug: string | null;
  } | null;
}

interface MediaLibraryPickerProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (image: { url: string; altText: string }) => void;
  title?: string;
}

export function MediaLibraryPicker({ 
  isOpen, 
  onClose, 
  onSelect,
  title = "Choose from Media Library"
}: MediaLibraryPickerProps) {
  const [images, setImages] = useState<MediaImage[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [currentPage, setCurrentPage] = useState(1);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedImage, setSelectedImage] = useState<MediaImage | null>(null);
  
  // Use portal to render outside any parent forms (fixes nested form submission bug)
  const [mounted, setMounted] = useState(false);
  
  useEffect(() => {
    setMounted(true);
  }, []);

  const fetchImages = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      params.set('page', currentPage.toString());
      params.set('limit', '24');

      const response = await fetch(`/api/admin/media-library?${params.toString()}`);
      if (response.ok) {
        const data = await response.json();
        setImages(data.images);
        setTotalCount(data.totalCount);
        setTotalPages(data.totalPages);
      }
    } catch (error) {
      console.error('Failed to fetch images:', error);
    } finally {
      setIsLoading(false);
    }
  }, [search, currentPage]);

  useEffect(() => {
    if (isOpen) {
      fetchImages();
    }
  }, [isOpen, fetchImages]);

  useEffect(() => {
    if (!isOpen) {
      setSelectedImage(null);
      setSearch('');
      setSearchInput('');
      setCurrentPage(1);
    }
  }, [isOpen]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearch(searchInput);
    setCurrentPage(1);
  };

  const handleSelect = () => {
    if (selectedImage?.image_url) {
      onSelect({
        url: selectedImage.image_url,
        altText: selectedImage.alt_text || selectedImage.caption || selectedImage.entity?.name || 'Image'
      });
      onClose();
    }
  };

  if (!isOpen) return null;

  const modalContent = (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h3 className="text-xl font-bold text-gray-900">{title}</h3>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search */}
        <div className="p-4 border-b border-gray-100">
          <form onSubmit={handleSearch} className="flex gap-2">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Search images..."
                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-yorkshire-pink text-sm"
              />
            </div>
            <button
              type="submit"
              className="px-4 py-2 bg-gray-900 text-white rounded-lg font-bold text-sm hover:bg-gray-800"
            >
              Search
            </button>
          </form>
          {search && (
            <p className="text-xs text-gray-500 mt-2">
              {totalCount} result{totalCount !== 1 ? 's' : ''} for "{search}"
              <button 
                onClick={() => { setSearch(''); setSearchInput(''); setCurrentPage(1); }}
                className="ml-2 text-yorkshire-pink hover:underline"
              >
                Clear
              </button>
            </p>
          )}
        </div>

        {/* Image Grid */}
        <div className="flex-1 overflow-y-auto p-4">
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yorkshire-pink"></div>
            </div>
          ) : images.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-gray-500">
              <ImageIcon className="w-12 h-12 mb-3 text-gray-300" />
              <p className="font-medium">No images found</p>
              {search && <p className="text-sm">Try a different search term</p>}
            </div>
          ) : (
            <div className="grid grid-cols-4 md:grid-cols-6 gap-3">
              {images.map((img) => (
                <button
                  key={img.image_id}
                  onClick={() => setSelectedImage(img)}
                  className={`relative aspect-square rounded-lg overflow-hidden border-2 transition-all ${
                    selectedImage?.image_id === img.image_id
                      ? 'border-yorkshire-pink ring-2 ring-yorkshire-pink/30'
                      : 'border-transparent hover:border-gray-300'
                  }`}
                >
                  {img.image_url ? (
                    <img
                      src={img.image_url}
                      alt={img.alt_text || ''}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-full h-full bg-gray-100 flex items-center justify-center">
                      <ImageIcon className="w-6 h-6 text-gray-300" />
                    </div>
                  )}
                  {selectedImage?.image_id === img.image_id && (
                    <div className="absolute inset-0 bg-yorkshire-pink/20 flex items-center justify-center">
                      <div className="bg-yorkshire-pink rounded-full p-1">
                        <Check className="w-4 h-4 text-white" />
                      </div>
                    </div>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 p-3 border-t border-gray-100">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage <= 1}
              className="p-1.5 rounded border border-gray-200 hover:bg-gray-50 disabled:opacity-50"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-sm text-gray-600">
              Page {currentPage} of {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage >= totalPages}
              className="p-1.5 rounded border border-gray-200 hover:bg-gray-50 disabled:opacity-50"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between p-4 border-t border-gray-200 bg-gray-50">
          <div className="text-sm text-gray-600">
            {selectedImage ? (
              <span className="font-medium text-gray-900">
                Selected: {selectedImage.entity?.name || selectedImage.alt_text || 'Image'}
              </span>
            ) : (
              <span>Click an image to select it</span>
            )}
          </div>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 border border-gray-200 rounded-lg font-bold text-gray-700 hover:bg-gray-100"
            >
              Cancel
            </button>
            <button
              onClick={handleSelect}
              disabled={!selectedImage?.image_url}
              className="px-6 py-2 bg-yorkshire-pink text-white rounded-lg font-bold hover:bg-pink-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Insert Image
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  // Use portal to render outside any parent forms (fixes nested form submission issue)
  if (!mounted) return null;
  return createPortal(modalContent, document.body);
}
