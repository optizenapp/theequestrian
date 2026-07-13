import type { BrandSEOContent } from '../run-brand-seo-update';

const content: BrandSEOContent = {
  handle: 'waldhausen',
  title: 'Waldhausen',
  breadcrumb_label: 'Waldhausen',
  logo_url: '/brands/logos/waldhausen.png',
  rules: [
    { column: 'BRAND', relation: 'EQUALS', condition: 'Waldhausen' },
    { column: 'HANDLE', relation: 'STARTS_WITH', condition: 'waldhausen-' },
  ],

  meta_title: 'Waldhausen Equestrian Gear in Australia',
  meta_description:
    'Explore premium Waldhausen equestrian products at The Equestrian. Discover high-quality bonnets, halters, and saddlecloths for your horse.',
  h1_title: 'Discover Waldhausen Equestrian Products',

  quick_answer:
    'Waldhausen offers a range of high-quality equestrian products available at The Equestrian in Australia. Known for their exceptional craftsmanship, Waldhausen products include bonnets, halters, boots, and saddlecloths, ensuring both style and comfort for riders and their horses.',

  short_description: `Waldhausen is synonymous with quality in the equestrian world. From stylish <a href="/horse/bonnets">bonnets</a> to durable <a href="/horse/halters">halters</a>, Waldhausen products are designed to meet the needs of both horse and rider. <!--read-more-trigger--> Discover the elegance and functionality of Waldhausen's range, including their popular <a href="/horse/pads">saddlecloths</a> and protective <a href="/horse/boots">boots</a>.`,

  long_description: `<h2>About Waldhausen</h2><p>Waldhausen is a renowned name in the equestrian industry, offering a wide array of products designed for both the horse and the rider. With a focus on quality and innovation, Waldhausen products are a favorite among equestrians worldwide.</p><h3>Bonnets</h3><p>Waldhausen bonnets, such as the <a href="/horse/bonnets/waldhausen-ear-bonnet-florence-night-blue-full">Florence Night Blue Full</a>, provide both style and functionality, protecting your horse's ears while adding a touch of elegance.</p><h3>Halters</h3><p>Explore our selection of <a href="/horse/halters">halters</a>, including the <a href="/horse/halters/waldhausen-headstall-florence-stone-grey">Florence Stone Grey</a> and <a href="/horse/halters/waldhausen-headstall-modern-rose-fir-green">Modern Rose Fir Green</a>, designed for durability and comfort.</p><h3>Saddlecloths</h3><ul><li><a href="/horse/pads/saddlecloth-all-purpose-waldhausen-paris-night-blue">All Purpose Waldhausen Paris Night Blue</a></li><li><a href="/horse/pads/saddlecloth-dressage-waldhausen-paris-night-blue">Dressage Waldhausen Paris Night Blue</a></li></ul><p>These saddlecloths offer excellent cushioning and support, ensuring a comfortable ride.</p><h3>Boots and Bandages</h3><p>Protect your horse with Waldhausen's range of <a href="/horse/boots">boots</a> and fleece bandages, available in various styles and colors to match your needs.</p>`,

  faq_items: [
    {
      question: 'What types of products does Waldhausen offer?',
      answer:
        'Waldhausen offers a variety of equestrian products including bonnets, halters, boots, saddlecloths, and bandages.',
    },
    {
      question: 'Where can I buy Waldhausen products in Australia?',
      answer:
        'You can purchase Waldhausen products at The Equestrian, a leading retailer of equestrian gear in Australia.',
    },
    {
      question: 'Are Waldhausen products suitable for dressage?',
      answer:
        'Yes, Waldhausen offers several products specifically designed for dressage, including dressage saddlecloths and boots.',
    },
    {
      question: 'Do Waldhausen products come in different colors?',
      answer:
        'Yes, Waldhausen products are available in various colors, allowing you to match your equestrian gear to your personal style.',
    },
    {
      question: 'Are Waldhausen halters adjustable?',
      answer:
        'Yes, Waldhausen halters are designed to be adjustable, ensuring a comfortable fit for your horse.',
    },
  ],
};

export default content;
