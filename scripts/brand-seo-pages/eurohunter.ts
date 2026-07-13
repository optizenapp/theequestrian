import type { BrandSEOContent } from '../run-brand-seo-update';

const content: BrandSEOContent = {
  handle: 'eurohunter',
  title: 'Eurohunter',
  breadcrumb_label: 'Eurohunter',
  rules: [
    { column: 'BRAND', relation: 'EQUALS', condition: 'Eurohunter' },
    { column: 'HANDLE', relation: 'STARTS_WITH', condition: 'eurohunter-' },
  ],

  meta_title: 'Eurohunter Australia | Rugs, Helmets, Boots & Riding Gear',
  meta_description:
    'Shop Eurohunter in Australia at The Equestrian. Explore Eurohunter rugs, helmets, boots, halters, bridles, saddle pads and everyday horse and rider essentials.',
  h1_title: 'Shop Eurohunter Equestrian Gear & Accessories',

  quick_answer:
    'Eurohunter is a broad equestrian brand range stocked in Australia across horse rugs, helmets, boots, tack and grooming essentials. Riders commonly shop Eurohunter for practical, everyday products including seasonal rugs, halters, bridles and rider accessories at accessible price points.',

  short_description: `<p>Shop <strong>Eurohunter</strong> for practical horse and rider essentials, including rugs, helmets, boots, bridles, halters, saddle pads and everyday stable accessories.</p>
<!--read-more-trigger-->
<p>Compare Eurohunter products across our wider <a href="/horse/rugs">horse rugs</a>, <a href="/rider/helmets">riding helmets</a>, <a href="/horse/tack/bridles">bridles</a> and <a href="/horse/pads/dressage">dressage pads</a> collections.</p>`,

  long_description: `<h2>About Eurohunter</h2>
<p>
Eurohunter is a high-volume equestrian range that covers a wide mix of horse, rider and stable products. It is commonly chosen by riders who want reliable everyday gear across multiple categories without needing to shop across many different brands.
</p>

<h3>Eurohunter Rugs & Seasonal Horse Covers</h3>
<p>
Rugs are a core search cluster for Eurohunter, including horse rugs, winter rugs and rainsheet-style options. This makes Eurohunter a common choice for riders updating seasonal coverage from paddock to stable. For full-category comparison, browse <a href="/horse/rugs">horse rugs</a>.
</p>

<h3>Helmets, Boots & Rider Essentials</h3>
<p>
Eurohunter also includes rider equipment such as helmets and jodhpur-style boots, plus accessories for regular riding use. If you are comparing fit and style across brands, see our <a href="/rider/helmets">rider helmets</a> and <a href="/clothing/footwear">equestrian footwear</a> ranges.
</p>

<h3>Tack, Pads, Halters & Stable Gear</h3>
<p>
Across tack and horse care, Eurohunter spans bridles, halters, girths, saddle pads and grooming products. This broad mix makes it useful for one-pass tack room restocks. Explore related categories in <a href="/horse/tack/bridles">bridles</a>, <a href="/horse/halters">halters</a> and <a href="/horse/grooming">horse grooming</a>.
</p>

<h2>Why Riders Choose Eurohunter</h2>
<ul>
<li>Strong depth across rugs, tack, rider gear and stable accessories.</li>
<li>Popular brand demand for Eurohunter rugs and everyday riding products.</li>
<li>Practical product mix suited to regular training, paddock and stable use.</li>
</ul>`,

  faq_items: [
    {
      question: 'What is Eurohunter known for?',
      answer:
        'Eurohunter is known for broad everyday equestrian coverage, especially rugs, helmets, tack, saddle pads, halters and practical stable accessories.',
    },
    {
      question: 'Can I buy Eurohunter in Australia?',
      answer:
        'Yes. You can shop Eurohunter in Australia at The Equestrian across horse, rider and stable categories.',
    },
    {
      question: 'Does Eurohunter make horse rugs?',
      answer:
        'Yes. Eurohunter rugs are one of the brand’s strongest product areas, including seasonal and everyday options commonly used for paddock and stable routines.',
    },
    {
      question: 'Is Eurohunter only for horse rugs?',
      answer:
        'No. Eurohunter also covers helmets, boots, bridles, halters, saddle pads, grooming items and other rider and stable essentials.',
    },
  ],
};

export default content;
