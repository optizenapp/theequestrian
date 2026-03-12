"use client";

import { Node } from '@tiptap/core';
import { ReactNodeViewRenderer, NodeViewWrapper, NodeViewProps } from '@tiptap/react';

export interface FigureImageAttributes {
  src: string;
  alt?: string;
  caption?: string;
  alignment?: 'left' | 'center' | 'right' | 'full';
  href?: string;
}

// React component for rendering the figure in the editor
function FigureImageView(props: NodeViewProps) {
  const { node, updateAttributes, selected, editor } = props;
  const attrs = node.attrs as FigureImageAttributes;
  const { src, alt, caption, alignment = 'center', href } = attrs;

  const alignmentClasses: Record<string, string> = {
    left: 'mr-auto ml-0',
    center: 'mx-auto',
    right: 'ml-auto mr-0',
    full: 'w-full',
  };

  const handleClick = () => {
    if (editor.isEditable) {
      // Dispatch custom event that RichTextEditor will listen to
      window.dispatchEvent(new CustomEvent('tiptap:edit-image', { 
        detail: { 
          src, 
          alt, 
          caption, 
          alignment,
          href,
          updateAttributes 
        } 
      }));
    }
  };

  return (
    <NodeViewWrapper className="figure-image-wrapper my-6">
      <figure 
        className={`figure-image relative ${alignmentClasses[alignment]} ${alignment !== 'full' ? 'max-w-2xl' : ''} ${selected ? 'ring-2 ring-yorkshire-pink ring-offset-2' : ''} cursor-pointer transition-all hover:ring-2 hover:ring-gray-300 hover:ring-offset-2 rounded-xl`}
        onClick={handleClick}
        data-alignment={alignment}
      >
        <img
          src={src}
          alt={alt || ''}
          className="w-full h-auto rounded-xl"
          draggable={false}
        />
        {caption && (
          <figcaption className="mt-3 text-sm text-gray-600 text-center italic">
            {caption}
          </figcaption>
        )}
        {href && (
          <div className="absolute top-2 left-2 bg-blue-600 text-white text-[10px] px-2 py-1 rounded-full font-bold flex items-center gap-1">
            🔗 Linked
          </div>
        )}
        {selected && (
          <div className="absolute -top-2 -right-2 bg-yorkshire-pink text-white text-xs px-2 py-1 rounded-full font-medium">
            Click to edit
          </div>
        )}
      </figure>
    </NodeViewWrapper>
  );
}

// TipTap Node Extension
export const FigureImage = Node.create({
  name: 'figureImage',
  
  group: 'block',
  
  atom: true, // Can't have content inside
  
  draggable: true,

  addAttributes() {
    return {
      src: {
        default: null,
        parseHTML: element => {
          const img = element.querySelector('img');
          return img?.getAttribute('src') || element.getAttribute('src');
        },
      },
      alt: {
        default: '',
        parseHTML: element => {
          const img = element.querySelector('img');
          return img?.getAttribute('alt') || '';
        },
      },
      caption: {
        default: '',
        parseHTML: element => {
          const figcaption = element.querySelector('figcaption');
          return figcaption?.textContent || '';
        },
      },
      alignment: {
        default: 'center',
        parseHTML: element => element.getAttribute('data-alignment') || 'center',
      },
      href: {
        default: null,
        parseHTML: element => {
          const a = element.querySelector('a');
          return a?.getAttribute('href') || element.getAttribute('data-href') || null;
        },
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'figure.figure-image',
      },
      {
        // Also parse standalone images and convert to figures
        tag: 'img[src]',
        getAttrs: element => {
          if (element instanceof HTMLElement) {
            return {
              src: element.getAttribute('src'),
              alt: element.getAttribute('alt') || '',
            };
          }
          return false;
        },
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    const { src, alt, caption, alignment, href } = HTMLAttributes;
    
    const alignmentClasses: Record<string, string> = {
      left: 'mr-auto ml-0',
      center: 'mx-auto',
      right: 'ml-auto mr-0',
      full: 'w-full',
    };

    const figureAttrs: Record<string, string> = {
      class: `figure-image ${alignmentClasses[alignment || 'center']} ${alignment !== 'full' ? 'max-w-2xl' : ''} my-6 rounded-xl`,
      'data-alignment': alignment || 'center',
    };

    if (href) {
      figureAttrs['data-href'] = href;
    }

    const imgAttrs = {
      src,
      alt: alt || '',
      class: 'w-full h-auto rounded-xl',
    };

    // Wrap image in a link if href is set
    const imageContent = href
      ? ['a', { href, target: '_blank', rel: 'noopener', class: 'block' }, ['img', imgAttrs]]
      : ['img', imgAttrs];

    if (caption) {
      return [
        'figure',
        figureAttrs,
        imageContent,
        ['figcaption', { class: 'mt-3 text-sm text-gray-600 text-center italic' }, caption],
      ];
    }

    return [
      'figure',
      figureAttrs,
      imageContent,
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(FigureImageView);
  },

  addCommands() {
    return {
      setFigureImage: (options: FigureImageAttributes) => ({ commands }) => {
        return commands.insertContent({
          type: this.name,
          attrs: options,
        });
      },
      updateFigureImage: (attributes: Partial<FigureImageAttributes>) => ({ commands, state }) => {
        const { selection } = state;
        const node = state.doc.nodeAt(selection.from);
        if (node?.type.name === this.name) {
          return commands.updateAttributes(this.name, attributes);
        }
        return false;
      },
    };
  },
});

// Extend TipTap's Commands interface
declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    figureImage: {
      setFigureImage: (options: FigureImageAttributes) => ReturnType;
      updateFigureImage: (attributes: Partial<FigureImageAttributes>) => ReturnType;
    };
  }
}
