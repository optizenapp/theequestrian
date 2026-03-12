"use client";

import { Node } from '@tiptap/core';
import { ReactNodeViewRenderer, NodeViewWrapper, NodeViewProps } from '@tiptap/react';
import { useState, useEffect } from 'react';
import { X, ChevronLeft, ChevronRight, Edit2, Images, Link2 } from 'lucide-react';

export interface GalleryImage {
  id: string;
  src: string;
  alt?: string;
  caption?: string;
  href?: string;
}

export interface ArticleGalleryAttributes {
  images: GalleryImage[];
  title?: string;
}

// React component for rendering the gallery in the editor
function ArticleGalleryView(props: NodeViewProps) {
  const { node, updateAttributes, selected, editor } = props;
  const attrs = node.attrs as ArticleGalleryAttributes;
  const { images = [], title } = attrs;
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);

  // Handle keyboard navigation
  useEffect(() => {
    if (!lightboxOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setLightboxOpen(false);
      else if (e.key === 'ArrowLeft') setCurrentIndex((i) => (i - 1 + images.length) % images.length);
      else if (e.key === 'ArrowRight') setCurrentIndex((i) => (i + 1) % images.length);
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [lightboxOpen, images.length]);

  // Prevent body scroll when lightbox is open
  useEffect(() => {
    document.body.style.overflow = lightboxOpen ? 'hidden' : 'unset';
    return () => { document.body.style.overflow = 'unset'; };
  }, [lightboxOpen]);

  const handleEditClick = () => {
    if (editor.isEditable) {
      window.dispatchEvent(new CustomEvent('tiptap:edit-gallery', {
        detail: { images, title, updateAttributes }
      }));
    }
  };

  const displayImages = images.slice(0, 12);

  if (images.length === 0) {
    return (
      <NodeViewWrapper className="article-gallery-wrapper my-8">
        <div 
          className={`border-2 border-dashed border-gray-300 rounded-xl p-8 text-center cursor-pointer hover:border-yorkshire-pink hover:bg-pink-50/50 transition-all ${selected ? 'ring-2 ring-yorkshire-pink ring-offset-2' : ''}`}
          onClick={handleEditClick}
        >
          <Images className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-600 font-medium">Click to add images to gallery</p>
        </div>
      </NodeViewWrapper>
    );
  }

  return (
    <NodeViewWrapper className="article-gallery-wrapper my-8">
      <div 
        className={`article-gallery relative ${selected ? 'ring-2 ring-yorkshire-pink ring-offset-2 rounded-xl' : ''}`}
        data-gallery="true"
      >
        {/* Edit Button */}
        {editor.isEditable && (
          <button
            onClick={handleEditClick}
            className="absolute -top-3 -right-3 z-10 p-2 bg-yorkshire-pink text-white rounded-full shadow-lg hover:bg-pink-600 transition-colors"
            title="Edit Gallery"
          >
            <Edit2 className="w-4 h-4" />
          </button>
        )}

        {title && (
          <h3 className="text-xl font-bold text-gray-900 mb-4">{title}</h3>
        )}

        {/* Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {displayImages.map((img, index) => (
            <button
              key={img.id}
              onClick={() => { setCurrentIndex(index); setLightboxOpen(true); }}
              className={`relative aspect-[4/3] rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-all group bg-gray-100 cursor-pointer ${
                index === 0 ? 'col-span-2 row-span-2 aspect-auto' : ''
              }`}
            >
              <img
                src={img.src}
                alt={img.alt || `Gallery image ${index + 1}`}
                className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
              {img.href && (
                <div className="absolute top-2 right-2 z-10 bg-blue-500 text-white p-1 rounded-full shadow-md" title={img.href}>
                  <Link2 className="w-3 h-3" />
                </div>
              )}
              {img.caption && (
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-3 opacity-0 group-hover:opacity-100 transition-opacity">
                  <p className="text-white text-xs font-medium truncate">{img.caption}</p>
                </div>
              )}
            </button>
          ))}
        </div>

        {images.length > 12 && (
          <p className="text-sm text-gray-500 mt-3 text-center">
            +{images.length - 12} more images
          </p>
        )}
      </div>

      {/* Lightbox Modal */}
      {lightboxOpen && (
        <div 
          className="fixed inset-0 z-[9999] bg-black/95 flex items-center justify-center"
          onClick={() => setLightboxOpen(false)}
        >
          <button
            onClick={(e) => { e.stopPropagation(); setLightboxOpen(false); }}
            className="absolute top-20 right-4 z-10 p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors text-white"
          >
            <X className="w-6 h-6" />
          </button>

          <div className="absolute top-20 left-1/2 -translate-x-1/2 z-10 bg-black/50 text-white px-4 py-2 rounded-full text-sm font-medium">
            {currentIndex + 1} / {images.length}
          </div>

          {images.length > 1 && (
            <>
              <button
                onClick={(e) => { e.stopPropagation(); setCurrentIndex((i) => (i - 1 + images.length) % images.length); }}
                className="absolute left-4 z-10 p-3 bg-white/10 hover:bg-white/20 rounded-full transition-colors text-white"
              >
                <ChevronLeft className="w-8 h-8" />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); setCurrentIndex((i) => (i + 1) % images.length); }}
                className="absolute right-4 z-10 p-3 bg-white/10 hover:bg-white/20 rounded-full transition-colors text-white"
              >
                <ChevronRight className="w-8 h-8" />
              </button>
            </>
          )}

          <div className="relative w-full h-full flex items-center justify-center pt-28 pb-4 px-4 md:px-16" onClick={(e) => e.stopPropagation()}>
            <img
              src={images[currentIndex].src}
              alt={images[currentIndex].alt || ''}
              className="max-w-full max-h-full object-contain"
            />
          </div>

          {images[currentIndex].caption && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 bg-black/50 text-white px-6 py-3 rounded-full text-sm max-w-2xl text-center">
              {images[currentIndex].caption}
            </div>
          )}
        </div>
      )}
    </NodeViewWrapper>
  );
}

// TipTap Node Extension
export const ArticleGallery = Node.create({
  name: 'articleGallery',
  
  group: 'block',
  
  atom: true,
  
  draggable: true,

  addAttributes() {
    return {
      images: {
        default: [],
        parseHTML: element => {
          try {
            const data = element.getAttribute('data-images');
            return data ? JSON.parse(data) : [];
          } catch {
            return [];
          }
        },
      },
      title: {
        default: '',
        parseHTML: element => element.getAttribute('data-title') || '',
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'div.article-gallery',
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    const { images = [], title } = HTMLAttributes;

    return [
      'div',
      {
        class: 'article-gallery my-8',
        'data-gallery': 'true',
        'data-images': JSON.stringify(images),
        'data-title': title || '',
      },
      // Grid will be rendered by CSS/JS on frontend
      ...images.slice(0, 12).map((img: GalleryImage, index: number) => {
        const imgTag = ['img', { src: img.src, alt: img.alt || '', class: 'gallery-img' }] as any;
        const imageContent = img.href
          ? ['a', { href: img.href, target: '_blank', rel: 'noopener', class: 'gallery-link' }, imgTag]
          : imgTag;
        return [
          'div',
          { class: `gallery-item ${index === 0 ? 'gallery-item-featured' : ''}`, ...(img.href ? { 'data-href': img.href } : {}) },
          imageContent,
          ...(img.caption ? [['span', { class: 'gallery-caption' }, img.caption]] : []),
        ];
      }),
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(ArticleGalleryView);
  },

  addCommands() {
    return {
      insertGallery: (options?: Partial<ArticleGalleryAttributes>) => ({ commands }) => {
        return commands.insertContent({
          type: this.name,
          attrs: options || { images: [], title: '' },
        });
      },
      updateGallery: (attributes: Partial<ArticleGalleryAttributes>) => ({ commands }) => {
        return commands.updateAttributes(this.name, attributes);
      },
    };
  },
});

// Extend TipTap's Commands interface
declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    articleGallery: {
      insertGallery: (options?: Partial<ArticleGalleryAttributes>) => ReturnType;
      updateGallery: (attributes: Partial<ArticleGalleryAttributes>) => ReturnType;
    };
  }
}
