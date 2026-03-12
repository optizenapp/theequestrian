"use client";

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import TextAlign from '@tiptap/extension-text-align';
import Youtube from '@tiptap/extension-youtube';
import { 
  Bold, 
  Italic, 
  List, 
  ListOrdered, 
  Heading2, 
  Heading3, 
  Link as LinkIcon,
  Quote,
  Undo,
  Redo,
  Search as SearchIcon,
  Image as ImageIcon,
  Upload,
  FileText,
  FolderOpen,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Images,
  Play,
  Megaphone
} from 'lucide-react';
import { useCallback, useState, useEffect } from 'react';
import { LinkSearchModal } from './LinkSearchModal';
import { LinkModal } from './LinkModal';
import { MediaLibraryPicker } from './MediaLibraryPicker';
import { ImageEditModal } from './ImageEditModal';
import { GalleryEditModal } from './GalleryEditModal';
import { CTAPickerModal } from './CTAPickerModal';
import { FigureImage, FigureImageAttributes } from './tiptap/FigureImage';
import { ArticleGallery, ArticleGalleryAttributes } from './tiptap/ArticleGallery';
import { CTAButton, CTAButtonAttributes } from './tiptap/CTAButton';

interface RichTextEditorProps {
  content: string;
  onChange: (html: string) => void;
  placeholder?: string;
}

export function RichTextEditor({ content, onChange, placeholder = "Write your article content here..." }: RichTextEditorProps) {
  const [isLinkSearchModalOpen, setIsLinkSearchModalOpen] = useState(false);
  const [isLinkModalOpen, setIsLinkModalOpen] = useState(false);
  const [isMediaLibraryOpen, setIsMediaLibraryOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isUploadingDoc, setIsUploadingDoc] = useState(false);
  const [currentLinkAttrs, setCurrentLinkAttrs] = useState<{ href?: string; target?: string; rel?: string }>({});

  // Image edit modal state
  const [isImageEditModalOpen, setIsImageEditModalOpen] = useState(false);
  const [editingImageData, setEditingImageData] = useState<FigureImageAttributes | null>(null);
  const [imageUpdateFn, setImageUpdateFn] = useState<((attrs: Partial<FigureImageAttributes>) => void) | null>(null);

  // CTA picker modal state
  const [isCTAPickerOpen, setIsCTAPickerOpen] = useState(false);

  // CTA edit modal state
  const [isEditingCTA, setIsEditingCTA] = useState(false);
  const [editingCTAData, setEditingCTAData] = useState<CTAButtonAttributes | null>(null);
  const [ctaUpdateFn, setCTAUpdateFn] = useState<((attrs: Partial<CTAButtonAttributes>) => void) | null>(null);

  // Gallery edit modal state
  const [isGalleryEditModalOpen, setIsGalleryEditModalOpen] = useState(false);
  const [editingGalleryData, setEditingGalleryData] = useState<ArticleGalleryAttributes | null>(null);
  const [galleryUpdateFn, setGalleryUpdateFn] = useState<((attrs: Partial<ArticleGalleryAttributes>) => void) | null>(null);

  // Force re-render on selection/focus changes to update toolbar button states
  const [, forceUpdate] = useState(0);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [2, 3],
        },
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-yorkshire-pink underline hover:text-pink-700',
        },
      }).extend({
        addAttributes() {
          return {
            ...this.parent?.(),
            target: {
              default: null,
              parseHTML: element => element.getAttribute('target'),
              renderHTML: attributes => {
                if (!attributes.target) return {};
                return { target: attributes.target };
              },
            },
            rel: {
              default: null,
              parseHTML: element => element.getAttribute('rel'),
              renderHTML: attributes => {
                if (!attributes.rel) return {};
                return { rel: attributes.rel };
              },
            },
          };
        },
      }),
      FigureImage,
      ArticleGallery,
      CTAButton,
      Youtube.configure({
        controls: true,
        nocookie: true,
        modestBranding: true,
        HTMLAttributes: {
          class: 'w-full aspect-video rounded-xl my-6',
        },
      }),
      Placeholder.configure({
        placeholder,
      }),
      TextAlign.configure({
        types: ['heading', 'paragraph'],
        alignments: ['left', 'center', 'right'],
      }),
    ],
    content,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    onSelectionUpdate: () => {
      // Force re-render to update toolbar button active states
      forceUpdate(n => n + 1);
    },
    onBlur: () => {
      // Force re-render when editor loses focus to clear active states
      forceUpdate(n => n + 1);
    },
    editorProps: {
      attributes: {
        class: 'prose prose-sm max-w-none focus:outline-none min-h-[400px] px-4 py-3',
      },
    },
  });

  // Listen for custom events from TipTap extensions
  useEffect(() => {
    const handleEditImage = (e: CustomEvent<{
      src: string;
      alt?: string;
      caption?: string;
      alignment?: 'left' | 'center' | 'right' | 'full';
      href?: string;
      updateAttributes: (attrs: Partial<FigureImageAttributes>) => void;
    }>) => {
      const { src, alt, caption, alignment, href, updateAttributes } = e.detail;
      setEditingImageData({ src, alt, caption, alignment, href });
      setImageUpdateFn(() => updateAttributes);
      setIsImageEditModalOpen(true);
    };

    const handleEditGallery = (e: CustomEvent<{
      images: ArticleGalleryAttributes['images'];
      title?: string;
      updateAttributes: (attrs: Partial<ArticleGalleryAttributes>) => void;
    }>) => {
      const { images, title, updateAttributes } = e.detail;
      setEditingGalleryData({ images, title });
      setGalleryUpdateFn(() => updateAttributes);
      setIsGalleryEditModalOpen(true);
    };

    const handleEditCTA = (e: CustomEvent<{
      href: string;
      text: string;
      affiliateType?: string;
      updateAttributes: (attrs: Partial<CTAButtonAttributes>) => void;
    }>) => {
      const { href, text, affiliateType, updateAttributes } = e.detail;
      setEditingCTAData({ href, text, affiliateType });
      setCTAUpdateFn(() => updateAttributes);
      setIsEditingCTA(true);
      setIsCTAPickerOpen(true);
    };

    window.addEventListener('tiptap:edit-image', handleEditImage as EventListener);
    window.addEventListener('tiptap:edit-gallery', handleEditGallery as EventListener);
    window.addEventListener('tiptap:edit-cta', handleEditCTA as EventListener);

    return () => {
      window.removeEventListener('tiptap:edit-image', handleEditImage as EventListener);
      window.removeEventListener('tiptap:edit-gallery', handleEditGallery as EventListener);
      window.removeEventListener('tiptap:edit-cta', handleEditCTA as EventListener);
    };
  }, []);

  const openLinkModal = useCallback(() => {
    if (!editor) return;

    const attrs = editor.getAttributes('link');
    setCurrentLinkAttrs({
      href: attrs.href || '',
      target: attrs.target || '',
      rel: attrs.rel || ''
    });
    setIsLinkModalOpen(true);
  }, [editor]);

  const handleLinkSubmit = useCallback((data: { url: string; target?: string; rel?: string }) => {
    if (!editor) return;

    setIsLinkModalOpen(false);

    if (!data.url) {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
      return;
    }

    editor.chain().focus().extendMarkRange('link').setLink({ 
      href: data.url,
      target: data.target || null,
      rel: data.rel || null
    }).run();
  }, [editor]);

  const handleInsertLink = useCallback((url: string, text: string) => {
    if (!editor) return;
    
    // If there's selected text, just add the link
    if (!editor.state.selection.empty) {
      editor.chain().focus().setLink({ href: url }).run();
    } else {
      // No selection - insert text with link
      editor.chain().focus().insertContent(`<a href="${url}">${text}</a>`).run();
    }
  }, [editor]);

  const handleImageUpload = useCallback(async () => {
    if (!editor) return;

    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
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

      setIsUploading(true);

      try {
        const formData = new FormData();
        formData.append('file', file);

        const response = await fetch('/api/upload/image', {
          method: 'POST',
          body: formData,
        });

        if (!response.ok) {
          throw new Error('Upload failed');
        }

        const data = await response.json();
        
        // Insert figure with image into editor
        editor.chain().focus().setFigureImage({ 
          src: data.url,
          alt: '',
          caption: '',
          alignment: 'center'
        }).run();
      } catch (error) {
        console.error('Image upload failed:', error);
        alert('Failed to upload image. Please try again.');
      } finally {
        setIsUploading(false);
      }
    };

    input.click();
  }, [editor]);

  const handleImageUrl = useCallback(() => {
    if (!editor) return;

    const url = window.prompt('Enter image URL:');
    
    if (url) {
      editor.chain().focus().setFigureImage({ 
        src: url,
        alt: '',
        caption: '',
        alignment: 'center'
      }).run();
    }
  }, [editor]);

  const handleDocumentUpload = useCallback(async () => {
    if (!editor) return;

    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      // Validate file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        alert('Document must be less than 10MB');
        return;
      }

      setIsUploadingDoc(true);

      try {
        const formData = new FormData();
        formData.append('file', file);

        const response = await fetch('/api/upload/document', {
          method: 'POST',
          body: formData,
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Upload failed');
        }

        const data = await response.json();
        
        // Insert document as a downloadable link with file icon
        const fileIcon = data.fileType === 'pdf' ? '📄' : '📝';
        editor.chain().focus().insertContent(
          `<a href="${data.url}" target="_blank" rel="noopener">${fileIcon} ${data.originalName}</a> `
        ).run();
      } catch (error) {
        console.error('Document upload failed:', error);
        alert(error instanceof Error ? error.message : 'Failed to upload document. Please try again.');
      } finally {
        setIsUploadingDoc(false);
      }
    };

    input.click();
  }, [editor]);

  const handleMediaLibrarySelect = useCallback((image: { url: string; altText: string }) => {
    if (!editor) return;
    editor.chain().focus().setFigureImage({ 
      src: image.url, 
      alt: image.altText,
      caption: '',
      alignment: 'center'
    }).run();
  }, [editor]);

  const handleInsertGallery = useCallback(() => {
    if (!editor) return;
    editor.chain().focus().insertGallery({ images: [], title: '' }).run();
  }, [editor]);

  const handleInsertYouTube = useCallback(() => {
    if (!editor) return;
    
    const url = window.prompt('Enter YouTube URL (e.g., https://www.youtube.com/watch?v=dQw4w9WgXcQ):');
    
    if (url) {
      editor.chain().focus().setYoutubeVideo({ src: url }).run();
    }
  }, [editor]);

  const handleImageEditSave = useCallback((data: FigureImageAttributes) => {
    if (imageUpdateFn) {
      imageUpdateFn(data);
    }
    setIsImageEditModalOpen(false);
    setEditingImageData(null);
    setImageUpdateFn(null);
  }, [imageUpdateFn]);

  const handleImageEditDelete = useCallback(() => {
    if (!editor) return;
    editor.chain().focus().deleteSelection().run();
    setIsImageEditModalOpen(false);
    setEditingImageData(null);
    setImageUpdateFn(null);
  }, [editor]);

  const handleGalleryEditSave = useCallback((data: ArticleGalleryAttributes) => {
    if (galleryUpdateFn) {
      galleryUpdateFn(data);
    }
    setIsGalleryEditModalOpen(false);
    setEditingGalleryData(null);
    setGalleryUpdateFn(null);
  }, [galleryUpdateFn]);

  const handleInsertCTA = useCallback((href: string, text: string, affiliateType?: string) => {
    if (!editor) return;
    if (isEditingCTA && ctaUpdateFn) {
      // Editing existing CTA
      ctaUpdateFn({ href, text, affiliateType });
    } else {
      // Inserting new CTA
      editor.chain().focus().setCTAButton({ href, text, affiliateType }).run();
    }
    setIsEditingCTA(false);
    setEditingCTAData(null);
    setCTAUpdateFn(null);
  }, [editor, isEditingCTA, ctaUpdateFn]);

  const handleGalleryEditDelete = useCallback(() => {
    if (!editor) return;
    editor.chain().focus().deleteSelection().run();
    setIsGalleryEditModalOpen(false);
    setEditingGalleryData(null);
    setGalleryUpdateFn(null);
  }, [editor]);

  if (!editor) {
    return null;
  }

  return (
    <>
      <LinkSearchModal
        isOpen={isLinkSearchModalOpen}
        onClose={() => setIsLinkSearchModalOpen(false)}
        onInsert={handleInsertLink}
      />
      
      <LinkModal
        isOpen={isLinkModalOpen}
        onClose={() => setIsLinkModalOpen(false)}
        onSubmit={handleLinkSubmit}
        initialUrl={currentLinkAttrs.href}
        initialTarget={currentLinkAttrs.target}
        initialRel={currentLinkAttrs.rel}
      />
      
      <MediaLibraryPicker
        isOpen={isMediaLibraryOpen}
        onClose={() => setIsMediaLibraryOpen(false)}
        onSelect={handleMediaLibrarySelect}
        title="Insert Image from Library"
      />

      <ImageEditModal
        isOpen={isImageEditModalOpen}
        onClose={() => setIsImageEditModalOpen(false)}
        imageData={editingImageData}
        onSave={handleImageEditSave}
        onDelete={handleImageEditDelete}
      />

      <GalleryEditModal
        isOpen={isGalleryEditModalOpen}
        onClose={() => setIsGalleryEditModalOpen(false)}
        galleryData={editingGalleryData}
        onSave={handleGalleryEditSave}
        onDelete={handleGalleryEditDelete}
      />

      <CTAPickerModal
        isOpen={isCTAPickerOpen}
        onClose={() => {
          setIsCTAPickerOpen(false);
          setIsEditingCTA(false);
          setEditingCTAData(null);
          setCTAUpdateFn(null);
        }}
        onInsert={handleInsertCTA}
      />
      
      <div className="border border-gray-200 rounded-xl">
      {/* Toolbar — sticky so it follows you as you scroll through long articles */}
      <div className="bg-gray-50 border-b border-gray-200 p-2 flex flex-wrap gap-1 sticky top-0 z-10">
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={`p-2 rounded hover:bg-white transition-colors ${
            editor.isActive('bold') ? 'bg-white text-yorkshire-pink' : 'text-gray-600'
          }`}
          title="Bold"
        >
          <Bold className="w-4 h-4" />
        </button>
        
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={`p-2 rounded hover:bg-white transition-colors ${
            editor.isActive('italic') ? 'bg-white text-yorkshire-pink' : 'text-gray-600'
          }`}
          title="Italic"
        >
          <Italic className="w-4 h-4" />
        </button>

        <div className="w-px h-8 bg-gray-200 mx-1" />

        <button
          type="button"
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          className={`px-3 py-2 rounded hover:bg-white transition-colors flex items-center gap-1.5 ${
            editor.isActive('heading', { level: 2 }) ? 'bg-white text-yorkshire-pink font-bold ring-2 ring-yorkshire-pink' : 'text-gray-600'
          }`}
          title="Heading 2"
        >
          <Heading2 className="w-4 h-4" />
          <span className="text-xs font-bold">H2</span>
        </button>

        <button
          type="button"
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          className={`px-3 py-2 rounded hover:bg-white transition-colors flex items-center gap-1.5 ${
            editor.isActive('heading', { level: 3 }) ? 'bg-white text-yorkshire-pink font-bold ring-2 ring-yorkshire-pink' : 'text-gray-600'
          }`}
          title="Heading 3"
        >
          <Heading3 className="w-4 h-4" />
          <span className="text-xs font-bold">H3</span>
        </button>

        <div className="w-px h-8 bg-gray-200 mx-1" />

        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          className={`p-2 rounded hover:bg-white transition-colors ${
            editor.isActive('bulletList') ? 'bg-white text-yorkshire-pink' : 'text-gray-600'
          }`}
          title="Bullet List"
        >
          <List className="w-4 h-4" />
        </button>

        <button
          type="button"
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          className={`p-2 rounded hover:bg-white transition-colors ${
            editor.isActive('orderedList') ? 'bg-white text-yorkshire-pink' : 'text-gray-600'
          }`}
          title="Numbered List"
        >
          <ListOrdered className="w-4 h-4" />
        </button>

        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          className={`p-2 rounded hover:bg-white transition-colors ${
            editor.isActive('blockquote') ? 'bg-white text-yorkshire-pink' : 'text-gray-600'
          }`}
          title="Quote"
        >
          <Quote className="w-4 h-4" />
        </button>

        <div className="w-px h-8 bg-gray-200 mx-1" />

        <button
          type="button"
          onClick={() => editor.chain().focus().setTextAlign('left').run()}
          className={`p-2 rounded hover:bg-white transition-colors ${
            editor.isActive({ textAlign: 'left' }) ? 'bg-white text-yorkshire-pink' : 'text-gray-600'
          }`}
          title="Align Left"
        >
          <AlignLeft className="w-4 h-4" />
        </button>

        <button
          type="button"
          onClick={() => editor.chain().focus().setTextAlign('center').run()}
          className={`p-2 rounded hover:bg-white transition-colors ${
            editor.isActive({ textAlign: 'center' }) ? 'bg-white text-yorkshire-pink' : 'text-gray-600'
          }`}
          title="Align Center"
        >
          <AlignCenter className="w-4 h-4" />
        </button>

        <button
          type="button"
          onClick={() => editor.chain().focus().setTextAlign('right').run()}
          className={`p-2 rounded hover:bg-white transition-colors ${
            editor.isActive({ textAlign: 'right' }) ? 'bg-white text-yorkshire-pink' : 'text-gray-600'
          }`}
          title="Align Right"
        >
          <AlignRight className="w-4 h-4" />
        </button>

        <div className="w-px h-8 bg-gray-200 mx-1" />

        <button
          type="button"
          onClick={openLinkModal}
          className={`p-2 rounded hover:bg-white transition-colors ${
            editor.isActive('link') ? 'bg-white text-yorkshire-pink' : 'text-gray-600'
          }`}
          title="Add/Edit Link"
        >
          <LinkIcon className="w-4 h-4" />
        </button>

        <button
          type="button"
          onClick={() => setIsLinkSearchModalOpen(true)}
          className="p-2 rounded hover:bg-white transition-colors text-gray-600"
          title="Search Places/Entities"
        >
          <SearchIcon className="w-4 h-4" />
        </button>

        <div className="w-px h-8 bg-gray-200 mx-1" />

        <button
          type="button"
          onClick={handleImageUpload}
          disabled={isUploading}
          className="p-2 rounded hover:bg-white transition-colors text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
          title={isUploading ? "Uploading..." : "Upload Image"}
        >
          {isUploading ? (
            <Upload className="w-4 h-4 animate-pulse" />
          ) : (
            <ImageIcon className="w-4 h-4" />
          )}
        </button>

        <button
          type="button"
          onClick={() => setIsMediaLibraryOpen(true)}
          className="p-2 rounded hover:bg-white transition-colors text-gray-600"
          title="Choose from Media Library"
        >
          <FolderOpen className="w-4 h-4" />
        </button>

        <button
          type="button"
          onClick={handleImageUrl}
          className="p-2 rounded hover:bg-white transition-colors text-gray-600"
          title="Insert Image from URL"
        >
          <LinkIcon className="w-4 h-4" />
          <ImageIcon className="w-3 h-3 -ml-1 -mt-1" />
        </button>

        <button
          type="button"
          onClick={handleDocumentUpload}
          disabled={isUploadingDoc}
          className="p-2 rounded hover:bg-white transition-colors text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
          title={isUploadingDoc ? "Uploading..." : "Upload PDF/Word Document"}
        >
          {isUploadingDoc ? (
            <Upload className="w-4 h-4 animate-pulse" />
          ) : (
            <FileText className="w-4 h-4" />
          )}
        </button>

        <div className="w-px h-8 bg-gray-200 mx-1" />

        <button
          type="button"
          onClick={handleInsertGallery}
          className="p-2 rounded hover:bg-white transition-colors text-gray-600"
          title="Insert Image Gallery"
        >
          <Images className="w-4 h-4" />
        </button>

        <button
          type="button"
          onClick={handleInsertYouTube}
          className={`p-2 rounded hover:bg-white transition-colors ${
            editor.isActive('youtube') ? 'bg-white text-yorkshire-pink' : 'text-gray-600'
          }`}
          title="Insert YouTube Video"
        >
          <Play className="w-4 h-4" />
        </button>

        <div className="w-px h-8 bg-gray-200 mx-1" />

        <button
          type="button"
          onClick={() => setIsCTAPickerOpen(true)}
          className="px-3 py-2 rounded hover:bg-white transition-colors text-gray-600 flex items-center gap-1.5"
          title="Insert CTA / Affiliate Button"
        >
          <Megaphone className="w-4 h-4" />
          <span className="text-xs font-bold">CTA</span>
        </button>

        <div className="w-px h-8 bg-gray-200 mx-1" />

        <button
          type="button"
          onClick={() => editor.chain().focus().undo().run()}
          disabled={!editor.can().undo()}
          className="p-2 rounded hover:bg-white transition-colors text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed"
          title="Undo"
        >
          <Undo className="w-4 h-4" />
        </button>

        <button
          type="button"
          onClick={() => editor.chain().focus().redo().run()}
          disabled={!editor.can().redo()}
          className="p-2 rounded hover:bg-white transition-colors text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed"
          title="Redo"
        >
          <Redo className="w-4 h-4" />
        </button>
      </div>

      {/* Editor */}
      <EditorContent editor={editor} className="bg-white" />
    </div>
    </>
  );
}
