"use client";

import { Node } from '@tiptap/core';
import { ReactNodeViewRenderer, NodeViewWrapper, NodeViewProps } from '@tiptap/react';

export interface CTAButtonAttributes {
  href: string;
  text: string;
  affiliateType?: string; // e.g. "Booking.com", "Ticketmaster"
}

// React component for rendering the CTA in the editor
function CTAButtonView(props: NodeViewProps) {
  const { node, selected, editor } = props;
  const attrs = node.attrs as CTAButtonAttributes;
  const { href, text, affiliateType } = attrs;

  const handleClick = () => {
    if (editor.isEditable) {
      window.dispatchEvent(new CustomEvent('tiptap:edit-cta', {
        detail: {
          href,
          text,
          affiliateType,
          updateAttributes: props.updateAttributes
        }
      }));
    }
  };

  return (
    <NodeViewWrapper className="cta-button-wrapper my-4">
      <div className="flex items-center gap-2">
        <a
          href={href}
          onClick={(e) => { e.preventDefault(); handleClick(); }}
          className={`cta-button inline-flex items-center gap-2 px-6 py-3 bg-yorkshire-pink text-white font-bold rounded-xl hover:bg-pink-700 transition-all cursor-pointer no-underline ${selected ? 'ring-2 ring-offset-2 ring-yorkshire-pink' : ''}`}
          data-affiliate-type={affiliateType || undefined}
        >
          {text || 'Call to Action'}
          <span className="text-sm">→</span>
        </a>
        {affiliateType && (
          <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400 bg-gray-100 px-2 py-1 rounded">
            {affiliateType}
          </span>
        )}
      </div>
    </NodeViewWrapper>
  );
}

// TipTap Node Extension
export const CTAButton = Node.create({
  name: 'ctaButton',

  group: 'block',

  atom: true,

  draggable: true,

  addAttributes() {
    return {
      href: {
        default: '#',
        parseHTML: element => {
          const a = element.querySelector('a') || element;
          return a.getAttribute('href') || '#';
        },
      },
      text: {
        default: 'Call to Action',
        parseHTML: element => {
          const a = element.querySelector('a') || element;
          return a.textContent?.replace(/\s*→\s*$/, '').trim() || 'Call to Action';
        },
      },
      affiliateType: {
        default: null,
        parseHTML: element => {
          const a = element.querySelector('a') || element;
          return a.getAttribute('data-affiliate-type') || null;
        },
      },
    };
  },

  parseHTML() {
    return [
      { tag: 'div.cta-button-wrapper' },
      { tag: 'a.cta-button' },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    const { href, text, affiliateType } = HTMLAttributes;

    const aAttrs: Record<string, string> = {
      class: 'cta-button',
      href: href || '#',
      target: '_blank',
      rel: 'noopener sponsored',
    };

    if (affiliateType) {
      aAttrs['data-affiliate-type'] = affiliateType;
    }

    return [
      'div',
      { class: 'cta-button-wrapper' },
      ['a', aAttrs, `${text || 'Call to Action'} →`],
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(CTAButtonView);
  },

  addCommands() {
    return {
      setCTAButton: (options: CTAButtonAttributes) => ({ commands }) => {
        return commands.insertContent({
          type: this.name,
          attrs: options,
        });
      },
    };
  },
});

// Extend TipTap's Commands interface
declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    ctaButton: {
      setCTAButton: (options: CTAButtonAttributes) => ReturnType;
    };
  }
}
