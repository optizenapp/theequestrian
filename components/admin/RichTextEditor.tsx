'use client';

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import TextAlign from '@tiptap/extension-text-align';
import Youtube from '@tiptap/extension-youtube';
import Image from '@tiptap/extension-image';
import { TableKit } from '@tiptap/extension-table';
import {
  Bold,
  Italic,
  List,
  ListOrdered,
  Heading2,
  Heading3,
  Heading4,
  Link as LinkIcon,
  Quote,
  Undo,
  Redo,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Image as ImageIcon,
  Play,
  Table as TableIcon,
  Trash2,
} from 'lucide-react';
import { useCallback, useState } from 'react';
import { ArticleImagePicker } from './ArticleImagePicker';

export interface RichTextEditorProps {
  content: string;
  onChange: (html: string) => void;
  placeholder?: string;
}

export function RichTextEditor({
  content,
  onChange,
  placeholder = 'Write your article content here…',
}: RichTextEditorProps) {
  const [, forceUpdate] = useState(0);
  const [imagePickerOpen, setImagePickerOpen] = useState(false);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3, 4] },
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-[#E91E8C] underline hover:text-[#d01a7d] transition-colors',
        },
      }).extend({
        addAttributes() {
          return {
            ...this.parent?.(),
            target: {
              default: null,
              parseHTML: (el) => el.getAttribute('target'),
              renderHTML: (attrs) => (attrs.target ? { target: attrs.target } : {}),
            },
            rel: {
              default: null,
              parseHTML: (el) => el.getAttribute('rel'),
              renderHTML: (attrs) => (attrs.rel ? { rel: attrs.rel } : {}),
            },
          };
        },
      }),
      Image.configure({
        HTMLAttributes: {
          class: 'rounded-lg my-8 mx-auto max-w-full h-auto block',
        },
      }),
      Youtube.configure({
        controls: true,
        nocookie: true,
        modestBranding: true,
        HTMLAttributes: { class: 'w-full aspect-video rounded-xl my-8 mx-auto block' },
      }),
      Placeholder.configure({ placeholder }),
      TextAlign.configure({
        types: ['heading', 'paragraph'],
        alignments: ['left', 'center', 'right'],
      }),
      TableKit.configure({
        table: { HTMLAttributes: { class: 'w-full border-collapse my-8' } },
        tableCell: { HTMLAttributes: { class: 'border border-gray-300 px-4 py-2' } },
        tableHeader: { HTMLAttributes: { class: 'bg-gray-100 border border-gray-300 px-4 py-2 text-left font-semibold' } },
      }),
    ],
    content,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    onSelectionUpdate: () => forceUpdate((n) => n + 1),
    onBlur: () => forceUpdate((n) => n + 1),
    editorProps: {
      attributes: {
        class:
          'article-content focus:outline-none min-h-[320px] px-4 py-3 text-gray-800 leading-relaxed overflow-visible',
      },
    },
  });

  const setLink = useCallback(() => {
    if (!editor) return;
    const url = window.prompt('Link URL:', editor.getAttributes('link').href || '');
    if (url === null) return;
    if (url === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
  }, [editor]);

  const addImage = useCallback(() => {
    if (!editor) return;
    setImagePickerOpen(true);
  }, [editor]);

  const handleImageSelect = useCallback(
    (image: { url: string; altText?: string }) => {
      if (!editor) return;
      editor.chain().focus().setImage({ src: image.url, alt: image.altText ?? '' }).run();
      setImagePickerOpen(false);
    },
    [editor]
  );

  const addYoutube = useCallback(() => {
    if (!editor) return;
    const url = window.prompt(
      'YouTube URL (e.g. https://www.youtube.com/watch?v=…)'
    );
    if (url) {
      editor.chain().focus().setYoutubeVideo({ src: url }).run();
    }
  }, [editor]);

  if (!editor) {
    return (
      <div className="min-h-[320px] rounded-xl border border-gray-200 bg-gray-50 animate-pulse" />
    );
  }

  return (
    <>
      <ArticleImagePicker
        isOpen={imagePickerOpen}
        onClose={() => setImagePickerOpen(false)}
        onSelect={handleImageSelect}
        title="Insert image"
      />
      <div className="rounded-xl border border-gray-200 overflow-hidden">
      <div className="bg-gray-50 border-b border-gray-200 p-2 flex flex-wrap gap-1 sticky top-0 z-10">
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={`p-2 rounded hover:bg-white transition-colors ${
            editor.isActive('bold') ? 'bg-white text-action' : 'text-gray-600'
          }`}
          title="Bold"
        >
          <Bold className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={`p-2 rounded hover:bg-white transition-colors ${
            editor.isActive('italic') ? 'bg-white text-action' : 'text-gray-600'
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
            editor.isActive('heading', { level: 2 })
              ? 'bg-white text-action font-bold ring-2 ring-action'
              : 'text-gray-600'
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
            editor.isActive('heading', { level: 3 })
              ? 'bg-white text-action font-bold ring-2 ring-action'
              : 'text-gray-600'
          }`}
          title="Heading 3"
        >
          <Heading3 className="w-4 h-4" />
          <span className="text-xs font-bold">H3</span>
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleHeading({ level: 4 }).run()}
          className={`px-3 py-2 rounded hover:bg-white transition-colors flex items-center gap-1.5 ${
            editor.isActive('heading', { level: 4 })
              ? 'bg-white text-action font-bold ring-2 ring-action'
              : 'text-gray-600'
          }`}
          title="Heading 4"
        >
          <Heading4 className="w-4 h-4" />
          <span className="text-xs font-bold">H4</span>
        </button>
        <div className="w-px h-8 bg-gray-200 mx-1" />
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          className={`p-2 rounded hover:bg-white transition-colors ${
            editor.isActive('bulletList') ? 'bg-white text-action' : 'text-gray-600'
          }`}
          title="Bullet list"
        >
          <List className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          className={`p-2 rounded hover:bg-white transition-colors ${
            editor.isActive('orderedList') ? 'bg-white text-action' : 'text-gray-600'
          }`}
          title="Numbered list"
        >
          <ListOrdered className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          className={`p-2 rounded hover:bg-white transition-colors ${
            editor.isActive('blockquote') ? 'bg-white text-action' : 'text-gray-600'
          }`}
          title="Quote"
        >
          <Quote className="w-4 h-4" />
        </button>
        <div className="w-px h-8 bg-gray-200 mx-1" />
        <button
          type="button"
          onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}
          className="p-2 rounded hover:bg-white transition-colors text-gray-600"
          title="Insert table"
        >
          <TableIcon className="w-4 h-4" />
        </button>
        <div className="w-px h-8 bg-gray-200 mx-1" />
        <button
          type="button"
          onClick={() => editor.chain().focus().setTextAlign('left').run()}
          className={`p-2 rounded hover:bg-white transition-colors ${
            editor.isActive({ textAlign: 'left' }) ? 'bg-white text-action' : 'text-gray-600'
          }`}
          title="Align left"
        >
          <AlignLeft className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().setTextAlign('center').run()}
          className={`p-2 rounded hover:bg-white transition-colors ${
            editor.isActive({ textAlign: 'center' }) ? 'bg-white text-action' : 'text-gray-600'
          }`}
          title="Align center"
        >
          <AlignCenter className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().setTextAlign('right').run()}
          className={`p-2 rounded hover:bg-white transition-colors ${
            editor.isActive({ textAlign: 'right' }) ? 'bg-white text-action' : 'text-gray-600'
          }`}
          title="Align right"
        >
          <AlignRight className="w-4 h-4" />
        </button>
        <div className="w-px h-8 bg-gray-200 mx-1" />
        <button
          type="button"
          onClick={setLink}
          className={`p-2 rounded hover:bg-white transition-colors ${
            editor.isActive('link') ? 'bg-white text-action' : 'text-gray-600'
          }`}
          title="Add/edit link"
        >
          <LinkIcon className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={addImage}
          className="p-2 rounded hover:bg-white transition-colors text-gray-600"
          title="Insert image (upload or choose from S3)"
        >
          <ImageIcon className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().deleteSelection().run()}
          disabled={!editor.isActive('image')}
          className="p-2 rounded hover:bg-white transition-colors text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed"
          title="Remove selected image"
        >
          <Trash2 className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={addYoutube}
          className={`p-2 rounded hover:bg-white transition-colors ${
            editor.isActive('youtube') ? 'bg-white text-action' : 'text-gray-600'
          }`}
          title="Insert YouTube video"
        >
          <Play className="w-4 h-4" />
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
      <EditorContent editor={editor} className="bg-white" />
    </div>
    </>
  );
}
