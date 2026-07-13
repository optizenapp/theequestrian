import type { BrandSEOContent } from '../run-brand-seo-update';

const content: BrandSEOContent = {
  handle: 'mattes',
  title: 'Mattes',
  breadcrumb_label: 'Mattes',
  logo_url: '/brands/logos/mattes.png',
  rules: [
    { column: 'BRAND', relation: 'EQUALS', condition: 'Mattes' },
    { column: 'HANDLE', relation: 'STARTS_WITH', condition: 'mattes-' },
  ],

  meta_title: 'Mattes Saddle Pads & Girths Australia | The Equestrian',
  meta_description:
    'Shop Mattes in Australia at The Equestrian. Explore Mattes saddle pads, half pads, correction pads and girths for comfort, fit and performance.',
  h1_title: 'Shop Mattes Saddle Pads, Half Pads & Girths',

  short_description: `<p>Shop <strong>Mattes</strong> for premium saddle pads, half pads and girths designed to improve horse comfort, saddle balance and everyday ride feel.</p>
<!--read-more-trigger-->
<p>Explore Mattes correction systems, fleece-lined half pads, dressage and jump pad options, plus anatomic girths and covers trusted by riders for fit and durability.</p>`,

  long_description: `<h2>About Mattes</h2>
<p>
Mattes is a well-known equestrian brand focused on high-quality saddle pads, half pads and girths that support comfort, pressure distribution and practical performance under saddle. The range is popular with riders who want premium materials and thoughtful design for both training and competition.
</p>

<h2>Popular Mattes Product Categories</h2>

<h3>Mattes Saddle Pads & Eurofit Styles</h3>
<p>
Mattes saddle pads are widely used for dressage, show jumping and general riding, with Eurofit and shaped options designed to sit neatly under different saddle cuts. Riders often choose Mattes for the combination of refined presentation and reliable day-to-day comfort.
</p>

<h3>Mattes Half Pads & Correction Systems</h3>
<p>
Mattes half pads and correction systems are a strong choice for riders looking to fine-tune saddle balance and support horses through changing workloads. Fleece and quilted options, plus shim-compatible designs, make this category popular for horses needing extra fit flexibility.
</p>

<h3>Mattes Girths, Covers & Comfort Details</h3>
<p>
The Mattes range also includes anatomic and asymmetric girths, leather and quilted covers, and specialised fit options for horses that benefit from a more tailored contact surface. If you are comparing broader categories, browse our <a href="/horse/pads">horse pads</a> and <a href="/horse/tack/girths">girths</a> collections.
</p>

<h2>Why Riders Choose Mattes</h2>
<ul>
<li>Premium saddle pads, half pads and girths focused on comfort and fit</li>
<li>Popular correction and shim-compatible options for saddle balance support</li>
<li>Trusted by riders for both everyday training and competition presentation</li>
</ul>`,

  faq_items: [
    {
      question: 'What is Mattes known for?',
      answer:
        'Mattes is best known for premium saddle pads, half pads, correction systems and girths designed to improve horse comfort and saddle fit.',
    },
    {
      question: 'Can I buy Mattes in Australia?',
      answer:
        'Yes. You can shop Mattes in Australia through The Equestrian, including Mattes saddle pads, half pads, correction products and girths.',
    },
    {
      question: 'Does Mattes make correction half pads?',
      answer:
        'Yes. Mattes offers correction half pads and shim-compatible options that many riders use to fine-tune saddle balance and support changing horse shape.',
    },
    {
      question: 'Are Mattes products suitable for dressage and jumping?',
      answer:
        'Yes. Mattes offers product options for both dressage and jumping, including shaped pads and fit-focused designs suited to different saddle types.',
    },
  ],
};

export default content;
