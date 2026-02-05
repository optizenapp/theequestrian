export type ReviewEmailBlock =
  | {
      id: string;
      type: 'heading';
      text: string;
      level?: 1 | 2 | 3;
      align?: 'left' | 'center' | 'right';
    }
  | {
      id: string;
      type: 'text';
      text: string;
      align?: 'left' | 'center' | 'right';
    }
  | {
      id: string;
      type: 'cta';
      label: string;
      url: string;
    }
  | {
      id: string;
      type: 'productCards';
      mode: 'single' | 'all';
    }
  | {
      id: string;
      type: 'divider';
    }
  | {
      id: string;
      type: 'footer';
      text: string;
    };

export const defaultReviewEmailBlocks: ReviewEmailBlock[] = [
  {
    id: 'heading-1',
    type: 'heading',
    level: 2,
    text: 'Hi {{customerName}},',
  },
  {
    id: 'text-1',
    type: 'text',
    text: 'Thanks for your order of {{productTitle}}.',
  },
  {
    id: 'text-2',
    type: 'text',
    text:
      "We are just touching base to see how you're getting along. Feel free to leave a review of the product. It helps us understand what our customers and product quality. Your product is below. Please click the review button and you can leave a review directly on the product page.",
  },
  {
    id: 'product-cards',
    type: 'productCards',
    mode: 'all',
  },
  {
    id: 'divider-1',
    type: 'divider',
  },
  {
    id: 'order-number',
    type: 'text',
    text: 'Order #{{orderNumber}}',
  },
  {
    id: 'footer-1',
    type: 'footer',
    text: 'The Equestrian\nQuality equestrian supplies and equipment\n{{siteUrl}}',
  },
];
