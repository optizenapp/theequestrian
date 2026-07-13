import type { BrandSEOContent } from '../run-brand-seo-update';

const content: BrandSEOContent = {
  handle: 'leovet',
  title: 'Leovet',
  breadcrumb_label: 'Leovet',
  logo_url: '/brands/logos/leovet.png',
  rules: [
    { column: 'BRAND', relation: 'EQUALS', condition: 'Leovet' },
    { column: 'HANDLE', relation: 'STARTS_WITH', condition: 'leovet-' },
  ],

  meta_title: 'Leovet Horse Care Products in Australia',
  meta_description:
    'Discover premium Leovet horse care products at The Equestrian in Australia. Shop hoof care, grooming essentials, and veterinary solutions for your horse.',
  h1_title: 'Leovet Horse Care Products',

  quick_answer:
    'Leovet offers a range of high-quality horse care products available at The Equestrian in Australia. From hoof care creams to grooming essentials and veterinary solutions, Leovet ensures your horse receives the best care possible. Explore our selection of Leovet products to keep your horse healthy and well-groomed.',

  short_description: `<p>Leovet is renowned for its dedication to equine care, offering a wide range of products designed to keep your horse in peak condition. From hoof care to grooming and veterinary solutions, Leovet products are a staple in equine care. <!--read-more-trigger--> Discover the full range of Leovet products at The Equestrian in Australia.</p>`,

  long_description: `<h2>About Leovet</h2><p>Leovet is a trusted name in the equestrian world, known for its innovative and effective horse care products. With a focus on quality and performance, Leovet products are designed to meet the needs of horse owners and their equine companions.</p><h3>Hoof Care</h3><p>Leovet offers a variety of hoof care products, including the <a href="/horse/stable/hoof-care">Leovet Hoof Lab Elastic Hoof Care Cream</a> and <a href="/horse/stable/hoof-care">HUFLAB Natural Oil Balm</a>, to promote healthy hooves.</p><h3>Grooming Essentials</h3><ul><li><a href="/horse/grooming/coat-care">Leovet 5 Star Detangler</a> for a shiny, tangle-free coat.</li><li><a href="/horse/grooming/shampoo">Leovet 5 Star Biotin Wash</a> for nourishing and cleaning.</li><li><a href="/horse/grooming/show-prep">Leovet 5 Star Magic Style</a> for perfect show preparation.</li></ul><h3>Veterinary Solutions</h3><p>For veterinary needs, Leovet provides effective solutions such as the <a href="/horse/veterinary/leovet-cold-pack-plus-500ml">Leovet Cold Pack Plus</a> and <a href="/horse/veterinary/leovet-thermo-massage">Leovet Thermo Massage</a> to support recovery and comfort.</p>`,

  faq_items: [
    {
      question: 'What are the benefits of using Leovet hoof care products?',
      answer:
        'Leovet hoof care products are designed to promote healthy hoof growth, improve elasticity, and protect against environmental damage. They help maintain strong and resilient hooves.',
    },
    {
      question: 'How does Leovet 5 Star Detangler work?',
      answer:
        'Leovet 5 Star Detangler helps to untangle knots and leaves the horse\'s coat shiny and smooth. It is easy to apply and provides long-lasting results.',
    },
    {
      question: 'Can Leovet products be used for show preparation?',
      answer:
        'Yes, Leovet offers products like the 5 Star Magic Style that are specifically designed for show preparation, helping to achieve a polished and professional look.',
    },
    {
      question: 'Are Leovet products suitable for sensitive skin?',
      answer:
        'Leovet products are formulated with gentle ingredients, making them suitable for horses with sensitive skin. However, it\'s always best to test a small area first.',
    },
    {
      question: 'Where can I buy Leovet products in Australia?',
      answer:
        'Leovet products are available at The Equestrian, both online and in-store, offering a wide selection for all your horse care needs.',
    },
  ],
};

export default content;
