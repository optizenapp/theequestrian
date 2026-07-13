import type { BrandSEOContent } from '../run-brand-seo-update';

const content: BrandSEOContent = {
  handle: 'the-equestrian',
  title: 'The Equestrian',
  breadcrumb_label: 'The Equestrian',
  logo_url: '/brands/logos/the-equestrian.png',
  rules: [
    { column: 'BRAND', relation: 'EQUALS', condition: 'The Equestrian' },
    { column: 'HANDLE', relation: 'STARTS_WITH', condition: 'the-equestrian-' },
  ],

  meta_title: 'The Equestrian: Premium Equestrian Gear',
  meta_description:
    'Discover premium equestrian gear at The Equestrian. Shop women\'s riding tights, horse pads, and stylish accessories in Australia.',
  h1_title: 'Welcome to The Equestrian',

  quick_answer:
    'The Equestrian offers a curated selection of high-quality equestrian gear in Australia. Explore our range of women\'s riding tights, horse pads, and stylish accessories designed for both performance and style. Shop now to experience the best in equestrian apparel and equipment.',

  short_description: `The Equestrian is your go-to destination for premium equestrian gear in Australia. Our collection includes stylish women's riding tights, functional horse pads, and fashionable accessories. <!--read-more-trigger--> Whether you're a seasoned rider or just starting out, our products are designed to enhance your riding experience.`,

  long_description: `<h2>About The Equestrian</h2><p>The Equestrian is dedicated to providing top-quality equestrian gear for riders across Australia. Our products are crafted with attention to detail and a focus on performance, ensuring you have the best experience in the saddle.</p><h3>Women's Riding Tights</h3><p>Our selection of women's riding tights, including The Label's Rosewood Horse Riding Tights by Saddle Co, offers comfort and style for every rider. <a href="/clothing/womens/tights">Shop women's riding tights</a> to find the perfect fit for your needs.</p><h3>Horse Pads</h3><p>Enhance your horse's comfort with our range of horse pads. The Anna Scarpati's Quiri 57 Jump Pad & Zeug 57 Fly Hood Coordinated Set - Rosa Antico is a standout choice for jumping enthusiasts. <a href="/horse/pads/jumping">Explore our jumping pads</a> for more options.</p><h3>Accessories</h3><p>Complete your equestrian look with our stylish accessories. The Equestrian Cap is a must-have for any rider. <a href="/clothing/accessories/caps">Discover our cap collection</a> and find out how to get it for free.</p><ul><li>High-quality materials</li><li>Stylish designs</li><li>Performance-oriented</li></ul>`,

  faq_items: [
    {
      question: 'What types of riding tights are available?',
      answer:
        'We offer a variety of women\'s riding tights that combine comfort and style, including The Label\'s Rosewood Horse Riding Tights by Saddle Co.',
    },
    {
      question: 'Can I find horse pads for jumping?',
      answer:
        'Yes, we have a selection of horse pads designed for jumping, such as the Anna Scarpati\'s Quiri 57 Jump Pad & Zeug 57 Fly Hood Coordinated Set.',
    },
    {
      question: 'Do you offer any accessories?',
      answer:
        'We offer a range of stylish accessories, including The Equestrian Cap, which you can learn how to get for free.',
    },
    {
      question: 'Where can I buy The Equestrian products?',
      answer:
        'You can shop for The Equestrian products directly on our website, offering a convenient shopping experience in Australia.',
    },
    {
      question: 'Are there any special offers available?',
      answer:
        'Yes, we occasionally have special offers. Check our website for the latest promotions and deals.',
    },
  ],
};

export default content;
