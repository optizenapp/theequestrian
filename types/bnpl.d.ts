import type { DetailedHTMLProps, HTMLAttributes } from 'react';

type BnplElementProps = DetailedHTMLProps<HTMLAttributes<HTMLElement>, HTMLElement>;

declare module 'react' {
  namespace JSX {
    interface IntrinsicElements {
      'square-placement': BnplElementProps & {
        'data-mpid'?: string;
        'data-placement-id'?: string;
        'data-page-type'?: string;
        'data-amount'?: string;
        'data-currency'?: string;
        'data-consumer-locale'?: string;
        'data-item-skus'?: string;
        'data-is-eligible'?: string;
      };
      'afterpay-placement': BnplElementProps & {
        'data-locale'?: string;
        'data-currency'?: string;
        'data-amount'?: string;
      };
    }
  }
}

export {};
